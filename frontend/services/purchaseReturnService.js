import { tokenRequest } from "@/lib/axiosCreate";

const INV_BASE = "schema/admin/test1/billing_db/public.purchase_invoice";
const INV_CUSTOM = "custom-api/admin/purchase_inv";

export const purchaseReturnService = {
    // Query purchase returns with pagination, filtering, and return_against filter
    queryReturns: async (params = {}) => {
        try {
            // Force return_against condition to filter only returns
            const defaultCondition = { return_against: { "$gt": 0 } };
            let mergedFind = defaultCondition;

            if (params.find) {
                if (params.find.$and) {
                    mergedFind = {
                        $and: [defaultCondition, ...params.find.$and]
                    };
                } else if (Object.keys(params.find).length > 0) {
                    mergedFind = {
                        $and: [defaultCondition, params.find]
                    };
                }
            }

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
                    searchConditions.push({ invoice_number: { "$regex": `%${term}%` } });
                });
                if (searchConditions.length > 0) {
                    const searchCondition = { $or: searchConditions };
                    if (mergedFind.$and) {
                        mergedFind.$and.push(searchCondition);
                    } else {
                        mergedFind = {
                            $and: [mergedFind, searchCondition]
                        };
                    }
                }
            }

            const body = {
                find: mergedFind,
                limit: params.limit || 10,
                skip: params.skip || 0,
                sort: params.sort || "-id",
                deep: [
                    {
                        "s_key": "supplier_id",
                        "isMultiple": true
                    }
                ],
                getTotalCount: true
            };

            const response = await tokenRequest.post(`${INV_BASE}/query`, body);
            return {
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in purchaseReturnService.queryReturns:", error);
            throw error;
        }
    },

    // Create a new purchase return
    saveReturn: async (returnData) => {
        try {
            const response = await tokenRequest.post(`${INV_CUSTOM}/purchase_invoice`, returnData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseReturnService.saveReturn:", error);
            throw error;
        }
    },

    // Update an existing purchase return
    updateReturn: async (id, returnData) => {
        try {
            const response = await tokenRequest.put(`${INV_CUSTOM}/update/?id=${id}`, returnData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseReturnService.updateReturn:", error);
            throw error;
        }
    },

    // Delete a purchase return
    deleteReturn: async (id) => {
        try {
            const response = await tokenRequest.delete(`${INV_BASE}/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseReturnService.deleteReturn:", error);
            throw error;
        }
    },

    // Send return via email
    sendReturnEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseReturnService.sendReturnEmail:", error);
            throw error;
        }
    },

    // Fetch a single return by ID with items and supplier details
    getReturnByIdDeep: async (id) => {
        try {
            const body = {
                find: { id: parseInt(id) },
                deep: [
                    {
                        "s_key": "supplier_id",
                        "isMultiple": true
                    },
                    {
                        "s_key": "purchase_item",
                        "isMultiple": true,
                        "find": {
                            "document_type": "invoice"
                        },
                        "deep": [
                            {
                                "s_key": "items",
                                "isMultiple": false
                            },
                            {
                                "s_key": "raw_material",
                                "isMultiple": false
                            }
                        ]
                    }
                ]
            };
            const response = await tokenRequest.post(`${INV_BASE}/query`, body);
            if (response.data?.success && response.data?.data?.length > 0) {
                return {
                    success: true,
                    data: response.data.data[0]
                };
            }
            return { success: false, message: "Purchase Return not found" };
        } catch (error) {
            console.error("Error in purchaseReturnService.getReturnByIdDeep:", error);
            throw error;
        }
    }
};
