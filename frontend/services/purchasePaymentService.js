import { tokenRequest } from "@/lib/axiosCreate";

const PAYMENT_QUERY_BASE = "schema/admin/test1/billing_db/public.purchase_payment";
const PAYMENT_CUSTOM_BASE = "custom-api/admin/purchase_pay";

export const purchasePaymentService = {
    // Fetch all purchase payments with deep mapping, pagination and filters
    getPurchasePayments: async (params = {}) => {
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
                    searchConditions.push({ payment_number: { "$regex": `%${term}%` } });
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
                sort: params.sort || "-id",
                limit: params.limit || 10,
                skip: params.skip || 0,
                getTotalCount: true,
                deep: [
                    {
                        "s_key": "supplier_id",
                        "isMultiple": false
                    }
                ]
            };

            const response = await tokenRequest.post(`${PAYMENT_QUERY_BASE}/query`, body);

            return {
                success: true,
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error fetching purchase payments:", error);
            throw error;
        }
    },

    getPaymentByIdDeep: async (id) => {
        try {
            const body = {
                find: { id: parseInt(id) },
                sort: "-id",
                deep: [
                    {
                        "s_key": "supplier_id",
                        "isMultiple": false
                    },
                    {
                        "s_key": "invoice_id",
                        "isMultiple": false,
                        "deep": [
                            {
                                "s_key": "return_against",
                                "isMultiple": false
                            }
                        ]
                    },
                    {
                        "s_key": "payment_item",
                        "isMultiple": true,
                        "find": {
                            "document_type": "payment"
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
            const response = await tokenRequest.post(`${PAYMENT_QUERY_BASE}/query`, body);
            return {
                success: true,
                data: Array.isArray(response.data?.data) ? response.data.data[0] : response.data?.data
            };
        } catch (error) {
            console.error("Error fetching payment details:", error);
            throw error;
        }
    },

    // Create purchase payment
    createPayment: async (paymentData) => {
        try {
            const response = await tokenRequest.post(`${PAYMENT_CUSTOM_BASE}/purchase_payment`, paymentData);
            return response.data;
        } catch (error) {
            console.error("Error creating purchase payment:", error);
            throw error;
        }
    },

    // Update purchase payment
    updatePayment: async (id, paymentData) => {
        try {
            const response = await tokenRequest.put(`${PAYMENT_CUSTOM_BASE}/update/?id=${parseInt(id)}`, paymentData);
            return response.data;
        } catch (error) {
            console.error("Error updating purchase payment:", error);
            throw error;
        }
    },

    // Send payment email/receipt
    sendPaymentEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("api/purchase/email", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending payment email:", error);
            throw error;
        }
    },

    // Delete purchase payment
    deletePayment: async (id) => {
        try {
            const response = await tokenRequest.delete(`${PAYMENT_QUERY_BASE}/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error deleting purchase payment:", error);
            throw error;
        }
    },

    // Fetch invoices for "Return Against" dropdown
    getPurchaseInvoicesForDropdown: async () => {
        try {
            const response = await tokenRequest.get(`${PAYMENT_CUSTOM_BASE}/get_purchase_invoice`);
            const data = response.data?.data;
            // Handle both flat array and nested { success, total, data: [] } structure
            const list = Array.isArray(data) ? data : (data?.data || []);
            return Array.isArray(list) ? list : [];
        } catch (error) {
            console.error("Error fetching purchase invoices for dropdown:", error);
            return [];
        }
    }
};
