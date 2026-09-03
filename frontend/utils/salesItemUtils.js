export const calculateTotals = (items) => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
        const itemSubtotal = (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 0);
        const itemTax = itemSubtotal * ((parseFloat(item.tax_percent) || 0) / 100);
        subtotal += itemSubtotal;
        totalTax += itemTax;
    });

    return {
        subtotal,
        totalTax,
        total: subtotal + totalTax
    };
};

export const parseItemsFromDb = (dbItems, customizedProductsList = []) => {
    const itemsArray = Array.isArray(dbItems) ? dbItems : (dbItems ? [dbItems] : []);
    return itemsArray.flatMap(item => {
        const sourceType = item.source_type || "item";
        if (sourceType === "estimation") {
            // source_id for estimation is a plain number (the estimation's id)
            const rawEstSourceId = item.source_id;
            const parentId = (rawEstSourceId && typeof rawEstSourceId === "object")
                ? rawEstSourceId.id
                : (rawEstSourceId || item.item_id || "");
            const parentNumber = item.metadata?.estimation_number || "";
            const parentName = item.metadata?.estimation_name || item.metadata?.name || "";
            const parentSubtotal = item.metadata?.subtotal || "0";
            const parentTax = item.metadata?.tax || "0";
            const parentTotal = item.metadata?.total_amount || "0";

            return [{
                id: item.id,
                item_id: Number(parentId) || parentId,
                type: "Estimation",
                source_type: "estimation",
                description: item.description || "",
                tax_id: (typeof item.tax_id === "object" ? item.tax_id?.id : item.tax_id) || "",
                tax_percent: parseFloat(item.tax_percent) || parseFloat(item.metadata?.tax) || 0,
                quantity: 1,
                rate: parseFloat(item.rate) || parseFloat(item.amount) || parseFloat(parentTotal) || 0,
                amount: parseFloat(item.amount) || parseFloat(parentTotal) || 0,
                tax_details: {},
                metadata: {
                    estimation_id: String(parentId),
                    estimation_number: parentNumber,
                    estimation_name: parentName,
                    name: parentName,
                    parent_subtotal: parentSubtotal,
                    parent_tax: parentTax,
                    parent_total_amount: parentTotal,
                    lines: item.metadata?.lines || []
                }
            }];
        }

        const rawSourceId = item.source_id || item.item_id;
        const mappedItemId = (typeof rawSourceId === "object" && rawSourceId !== null) ? rawSourceId.id : rawSourceId;

        let itemType = "Product";
        if (sourceType === "time") itemType = "Time";
        else if (sourceType === "mileage") itemType = "Mileage";
        else if (sourceType === "service") itemType = "Service";
        else if (sourceType === "customized" || sourceType === "stocks") itemType = "stocks";
        else if (rawSourceId && typeof rawSourceId === "object" && rawSourceId.item_type === "CUSTOMISED PRODUCTS") itemType = "stocks";
        else if (customizedProductsList && customizedProductsList.some(cp => cp.id == mappedItemId)) itemType = "stocks";

        const metadata = { ...(item.metadata || {}) };

        // Service: no dropdown — description lives in metadata and item.description
        if (sourceType === "service") {
            if (!metadata.description) metadata.description = item.description || "";
            if (!metadata.service_name) metadata.service_name = item.description || "";
        }
        if (sourceType === "time") {
            let hoursVal = parseInt(metadata.hours);
            let minsVal = parseInt(metadata.minutes);
            if (isNaN(hoursVal) || isNaN(minsVal)) {
                const totalMins = parseInt(metadata.duration_minutes) || Math.round((parseFloat(item.quantity) || 0) * 60);
                metadata.hours = Math.floor(totalMins / 60);
                metadata.minutes = totalMins % 60;
                metadata.duration_minutes = totalMins;
            } else {
                metadata.hours = hoursVal;
                metadata.minutes = minsVal;
                metadata.duration_minutes = parseInt(metadata.duration_minutes) || (hoursVal * 60 + minsVal);
            }
            if (metadata.start_time && metadata.start_time.includes('T')) {
                metadata.start_date = metadata.start_time.split('T')[0];
                metadata.start_time = metadata.start_time.split('T')[1]?.substring(0, 5) || "";
            }
            if (metadata.end_time && metadata.end_time.includes('T')) {
                metadata.end_date = metadata.end_time.split('T')[0];
                metadata.end_time = metadata.end_time.split('T')[1]?.substring(0, 5) || "";
            }
            metadata.use_start_end = !!(metadata.start_date && metadata.start_time);
        }

        if (sourceType === "mileage") {
            if (!metadata.distance_km) {
                metadata.distance_km = String(item.quantity || 0);
            }
            if (!metadata.rate_per_km) {
                metadata.rate_per_km = String(item.rate || 0);
            }
        }

        return [{
            id: item.id,
            item_id: mappedItemId,
            type: itemType,
            source_type: sourceType,
            description: item.description || "",
            tax_id: (typeof item.tax_id === "object" ? item.tax_id?.id : item.tax_id) || "",
            tax_percent: parseFloat(item.tax_percent) || parseFloat(metadata?.tax) || 0,
            quantity: parseFloat(item.quantity) || 1,
            rate: parseFloat(item.rate) || 0,
            // Use the actual backend amount (includes tax) rather than recalculating
            amount: parseFloat(item.amount) || (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
            tax_details: {},
            metadata: metadata,
            production_cost: parseFloat(item.production_cost) || 0
        }];
    });
};

export const mapItemsForSave = (items) => {
    const nonEstimationItems = [];
    const estimationGroups = {};

    items.forEach(item => {
        const sourceType = item.source_type || "item";
        if (sourceType === "estimation") {
            const estId = item.metadata?.estimation_id || item.item_id || "unknown";
            if (!estimationGroups[estId]) {
                estimationGroups[estId] = [];
            }
            estimationGroups[estId].push(item);
        } else {
            nonEstimationItems.push(item);
        }
    });

    const mappedEstimations = Object.entries(estimationGroups).map(([estId, groupItems]) => {
        const firstItem = groupItems[0];
        const parentId = Number(estId) || Number(firstItem.item_id) || null;
        const estimationNumber = firstItem.metadata?.estimation_number || firstItem.description || "";
        const estimationName = firstItem.metadata?.estimation_name || firstItem.metadata?.name || "";

        const qty = Number(firstItem.quantity) || 1;
        const totalAmount = parseFloat(firstItem.rate) || 0;
        const originalTotal = parseFloat(firstItem.metadata?.parent_total_amount) || totalAmount || 1;
        const originalTax = parseFloat(firstItem.metadata?.parent_tax) || 0;

        const taxAmount = originalTotal > 0 ? (totalAmount * originalTax) / originalTotal : 0;
        const subtotal = totalAmount - taxAmount;
        const rate = subtotal;
        const taxPercent = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

        const lines = firstItem.metadata?.lines || [];

        const baseItem = {
            source_type: "estimation",
            quantity: qty,
            rate: rate,
            tax_percent: taxPercent,
            tax_id: null,
            amount: totalAmount,
            source_id: parentId,
            item_id: null,
            description: estimationNumber,
            metadata: {
                estimation_number: estimationNumber,
                estimation_name: estimationName,
                subtotal: String(subtotal.toFixed(2)),
                tax: String(taxAmount.toFixed(2)),
                total_amount: String(totalAmount.toFixed(2)),
                lines: lines
            }
        };
        if (firstItem.parent_proforma_item_id || firstItem.id) {
            baseItem.id = firstItem.parent_proforma_item_id || firstItem.id;
        }
        return baseItem;
    });

    const mappedNonEstimations = nonEstimationItems.map(item => {
        const qty = Number(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const taxPercent = parseFloat(item.tax_percent) || 0;
        const subtotal_calc = qty * rate;
        const rowTax = subtotal_calc * (taxPercent / 100);
        const totalWithTax = subtotal_calc + rowTax;
        const taxId = item.tax_id ? Number(item.tax_id) : null;
        let sourceType = item.source_type || "item";

        if (item.type === "Product" || item.type === "stocks") {
            sourceType = "item";
        }

        const baseItem = {
            source_type: sourceType,
            quantity: qty,
            rate: rate,
            tax_percent: taxPercent,
            amount: (item.type === "Product" || item.type === "stocks") ? Number(subtotal_calc.toFixed(2)) : Number(totalWithTax.toFixed(2))
        };

        if (taxId) {
            baseItem.tax_id = taxId;
        }
        if (item.id) {
            baseItem.id = item.id;
        }

        if (sourceType === "time" || sourceType === "mileage") {
            // time & mileage: item_id is null, source_id points to the entry
            baseItem.source_id = Number(item.item_id) || null;
            baseItem.item_id = null;

            if (sourceType === "time") {
                baseItem.description = item.description || item.metadata?.name || "Time Entry";
                baseItem.metadata = {
                    entry_date: item.metadata?.entry_date || new Date().toISOString(),
                    duration_minutes: Number(item.metadata?.duration_minutes) || (Number(item.metadata?.hours || 0) * 60 + Number(item.metadata?.minutes || 0)),
                    rate_per_hour: String(item.rate || 0)
                };
            } else if (sourceType === "mileage") {
                baseItem.description = item.description || item.metadata?.name || "Mileage Entry";
                baseItem.metadata = {
                    trip_type: item.metadata?.trip_type || "one_way",
                    start_address: item.metadata?.start_address || "",
                    end_address: item.metadata?.end_address || "",
                    distance_km: String(item.metadata?.distance_km || "0"),
                    rate_per_km: String(item.rate || 0)
                };
            }
        } else if (sourceType === "service") {
            // service: both item_id and source_id are the service's id
            const serviceId = Number(item.item_id) || null;
            baseItem.item_id = serviceId;
            baseItem.source_id = serviceId;
            baseItem.description = item.description || item.metadata?.description || "Service";
            baseItem.metadata = {
                service_name: item.metadata?.service_name || item.description || "Consultation",
                hours: Number(qty) || 0
            };
        } else {
            // product / stocks: both item_id and source_id are the product's id
            baseItem.item_id = Number(item.item_id);
            baseItem.source_id = Number(item.item_id);
            baseItem.description = item.description || "N/A";
            baseItem.production_cost = parseFloat(item.production_cost) || 0;
        }

        return baseItem;
    });

    return [...mappedNonEstimations, ...mappedEstimations];
};
