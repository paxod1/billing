import { tokenRequest } from "@/lib/axiosCreate";

const PROFORMA_BASE = "schema/admin/test1/billing_db/public.proforma_invoice";

export const proformaInvoiceService = {
    // Fetch all proforma invoices
    getProformaInvoices: async (filters = {}) => {
        try {
            const find = {};

            // Search filter
            if (filters.search && filters.search.trim() !== "") {
                const searchTerm = filters.search.trim();
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
                    find["$or"] = searchConditions;
                }
            }

            // 1. Status Casing Normalization
            if (filters.status && filters.status.trim() !== "") {
                find.status = filters.status.toUpperCase();
            }

            // 2. Customer ID Filter (Multi-select support via array)
            if (filters.customer_ids && Array.isArray(filters.customer_ids) && filters.customer_ids.length > 0) {
                find.customer_id = { $in: filters.customer_ids.map(id => parseInt(id, 10)) };
            } else if (filters.customer_id) {
                // Fallback for single ID filter
                find.customer_id = parseInt(filters.customer_id, 10);
            }
            
            if (filters.invoice_date) {
                find.invoice_date = filters.invoice_date;
            }

            if (filters.total_amount) {
                find.total_amount = { $like: `%${filters.total_amount}%` };
            }

            const body = {
                sort: "-id", // Sort by most recent
                limit: filters.limit || 10,
                skip: filters.skip || 0,
                getTotalCount: true,
                "deep": [
                    {
                        "s_key": "proforma_item",
                        "isMultiple": true,
                        "find": {
                            "document_type": "PROFORMA"
                        }
                    }
                ],
            };

            if (Object.keys(find).length > 0) {
                body.find = find;
            }

            const response = await tokenRequest.post(`${PROFORMA_BASE}/query`, body);

            return {
                success: response.data?.success || false,
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0,
                statusCode: response.data?.statusCode || 200
            };
        } catch (error) {
            console.error("Error fetching proforma invoices:", error);
            throw error;
        }
    },

    // Save (Create) proforma invoice
    saveProformaInvoice: async (proformaData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/proforma/proforma_invoice", proformaData);
            return response.data;
        } catch (error) {
            console.error("Error saving proforma invoice:", error);
            throw error;
        }
    },

    // Update proforma invoice
    updateProformaInvoice: async (id, formData) => {
        try {
            const response = await tokenRequest.put(`custom-api/admin/proforma/proforma_update/?id=${id}`, formData);
            return response.data;
        } catch (error) {
            console.error("Error updating proforma invoice:", error);
            throw error;
        }
    },

    // Delete proforma invoice
    deleteProformaInvoice: async (id) => {
        try {
            const response = await tokenRequest.delete(`${PROFORMA_BASE}/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error deleting proforma:", error);
            throw error;
        }
    },

    // Export proforma invoices
    exportProformaInvoices: async () => {
        try {
            const response = await tokenRequest.get("custom-api/admin/proforma/proforma_export", {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            console.error("Error exporting proforma invoices:", error);
            throw error;
        }
    },

    // Send proforma email
    sendProformaEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending proforma email:", error);
            throw error;
        }
    },

    // Fetch proforma invoice by ID with items and metadata
    getProformaInvoiceById: async (id) => {
        try {
            const body = {
                "find": {
                    "id": parseInt(id)
                },
                "getTotalCount": true,
                "deep": [
                    {
                        "s_key": "proforma_item",
                        "isMultiple": true,
                        "find": {
                            "document_type": "PROFORMA"
                        },
                        "deep": [
                            {
                                "s_key": "items",
                                "isMultiple": false
                            }
                        ]
                    }
                ]
            };
            const response = await tokenRequest.post(`${PROFORMA_BASE}/query`, body);
            // Return the first item from the data array if successful
            if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
                return {
                    success: true,
                    data: response.data.data[0]
                };
            }
            return {
                success: false,
                message: "Proforma invoice not found"
            };
        } catch (error) {
            console.error("Error fetching proforma invoice by ID:", error);
            throw error;
        }
    },

    // Convert proforma to sales invoice
    createInvoice: async (proformaId) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/proforma/create_invoice", {
                proforma_id: proformaId
            });
            return response.data;
        } catch (error) {
            console.error("Error creating invoice from proforma:", error);
            throw error;
        }
    }
};
