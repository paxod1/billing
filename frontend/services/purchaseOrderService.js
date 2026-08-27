import { tokenRequest } from "@/lib/axiosCreate";

const PO_BASE = "schema/admin/test1/billing_db/public.purchase_order";
const PO_CUSTOM = "custom-api/admin/pur_orders";

export const purchaseOrderService = {
    // Query purchase orders with pagination and filtering
    queryOrders: async (params = {}) => {
        try {
            let find = params.find ? { ...params.find } : {};
            
            // Search filter
            if (params.search && params.search.trim() !== "") {
                const searchTerm = params.search.trim();
                const probes = [
                    searchTerm,
                    searchTerm.toLowerCase(),
                    searchTerm.toUpperCase(),
                    searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase()
                ];
                const searchProbes = [...new Set(probes)];
                const searchConditions = [];
                searchProbes.forEach(term => {
                    searchConditions.push({ order_no: { "$regex": `%${term}%` } });
                    searchConditions.push({ order_name: { "$regex": `%${term}%` } });
                });
                if (searchConditions.length > 0) {
                    const searchCondition = { $or: searchConditions };
                    if (find.$and) {
                        find.$and.push(searchCondition);
                    } else if (Object.keys(find).length > 0) {
                        find = {
                            $and: [
                                { ...find },
                                searchCondition
                            ]
                        };
                    } else {
                        find = searchCondition;
                    }
                }
            }

            const body = {
                find: find,
                limit: params.limit || 10,
                skip: params.skip || 0,
                sort: params.sort || "-id",
                deep: [
                    {
                        "s_key": "order_item",
                        "isMultiple": true,
                        "find": {
                            "document_type": "order"
                        },
                        "deep": [
                            {
                                "s_key": "items",
                                "isMultiple": false
                            }
                        ]
                    },
                    {
                        "s_key": "supplier_id",
                        "isMultiple": false
                    }
                ],
                getTotalCount: true
            };

            const response = await tokenRequest.post(`${PO_BASE}/query`, body);
            return {
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in purchaseOrderService.queryOrders:", error);
            throw error;
        }
    },

    getAllOrdersForDropdown: async (currentOrderId = null) => {
        try {
            const body = {
                find: currentOrderId 
                    ? { $or: [ { status: "SENT" }, { id: Number(currentOrderId) } ] }
                    : { status: "SENT" },
                sort: "-id",
                deep: [
                    {
                        "s_key": "order_item",
                        "isMultiple": true,
                        "find": { "document_type": "order" },
                        "deep": [
                            {
                                "s_key": "items",
                                "t_col": "item",
                                "t_key": "id",
                                "s_key_col": "source_id",
                                "isMultiple": false
                            },
                            {
                                "s_key": "raw_material",
                                "isMultiple": false
                            }
                        ]
                    },
                    {
                        "s_key": "supplier_id",
                        "isMultiple": false
                    }
                ]
            };

            const response = await tokenRequest.post(`${PO_BASE}/query`, body);
            // Handle various response structures (direct array, nested in .data, or double-nested)
            if (Array.isArray(response.data)) return response.data;
            if (Array.isArray(response.data?.data)) return response.data.data;
            if (Array.isArray(response.data?.data?.data)) return response.data.data.data;
            return [];
        } catch (error) {
            console.error("Error in purchaseOrderService.getAllOrdersForDropdown:", error);
            throw error;
        }
    },

    // Create a new purchase order
    saveOrder: async (orderData) => {
        try {
            const response = await tokenRequest.post(`${PO_CUSTOM}/create/`, orderData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseOrderService.saveOrder:", error);
            throw error;
        }
    },

    // Update an existing purchase order
    updateOrder: async (id, orderData) => {
        try {
            const response = await tokenRequest.put(`${PO_CUSTOM}/update/?id=${id}`, orderData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseOrderService.updateOrder:", error);
            throw error;
        }
    },

    // Delete a purchase order
    deleteOrder: async (id) => {
        try {
            const response = await tokenRequest.delete(`${PO_BASE}/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseOrderService.deleteOrder:", error);
            throw error;
        }
    },

    // Send order via email
    sendOrderEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseOrderService.sendOrderEmail:", error);
            throw error;
        }
    }
};
