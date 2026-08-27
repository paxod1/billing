import { tokenRequest } from "@/lib/axiosCreate";

const QUOTE_BASE = "schema/admin/test1/billing_db/public.sales_quote";
const ITEM_BASE = "schema/admin/test1/billing_db/public.sales_item";

export const salesQuoteService = {
    // Fetch all sales quotes with optional filtering
    getSalesQuotes: async (filters = {}) => {
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
                    searchConditions.push({ quote_number: { "$regex": `%${term}%` } });
                    searchConditions.push({ quote_name: { "$regex": `%${term}%` } });
                });
                if (searchConditions.length > 0) {
                    find["$or"] = searchConditions;
                }
            }

            // 1. Status Casing Normalization: Backend expects UPPERCASE
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

            // Direct field filters (non-search)
            if (filters.quote_number && filters.quote_number.trim() !== "") {
                find.quote_number = filters.quote_number;
            }
            if (filters.quote_name && filters.quote_name.trim() !== "") {
                find.quote_name = filters.quote_name;
            }
            // 3. Data Type Integrity: total_amount as decimal string
            if (filters.total_amount && filters.total_amount.toString().trim() !== "") {
                find.total_amount = filters.total_amount.toString();
            }

            if (filters.customer_id) {
                find.customer_id = parseInt(filters.customer_id, 10);
            }

            // 4. Date Filters: Only include if non-empty
            if (filters.quote_date && filters.quote_date.trim() !== "") {
                find.quote_date = filters.quote_date;
            }
            if (filters.expiry_date && filters.expiry_date.trim() !== "") {
                find.expiry_date = filters.expiry_date;
            }


            const body = {
                sort: { "id": -1 }, // Changed from "-id" to object notation for json-sql-builder2 compatibility
                getTotalCount: true,
                "deep": [
                    {
                        "s_key": "items",
                        "isMultiple": true,
                        "find": {
                            "document_type": "QUOTE"
                        },
                        "deep": [
                            {
                                "s_key": "source_id",
                                "t_key": "id",
                                "t_col": "item",
                                "isMultiple": false
                            }
                        ]
                    }
                ]
            };

            if (filters.limit !== undefined) body.limit = filters.limit;
            if (filters.skip !== undefined) body.skip = filters.skip;

            

            // Only attach 'find' if there are active filters
            if (Object.keys(find).length > 0) {
                body.find = find;
            }

            const response = await tokenRequest.post(`${QUOTE_BASE}/query`, body);

            // Debugging: Log the body to see exactly what you are sending
            console.log("Sales Quotes Query Body:", JSON.stringify(body, null, 2));

            return {
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error fetching sales quotes:", error);
            throw error;
        }
    },

    // Save sales quote with all data (quote details, email, items, files)
    // This is a single API call that replaces the previous 2-step flow
    saveQuote: async (quoteData) => {
        // Log the content (debug)
        console.log("Service: Saving Quote Data:", quoteData);

        try {
            const response = await tokenRequest.post("custom-api/admin/sales_quot/sales_quotes", quoteData);
            return response.data; // Expected to contain the new quote ID
        } catch (error) {
            console.error("Error saving quote:", error);
            throw error;
        }
    },

    // Update sales quote (PUT with JSON)
    updateQuote: async (id, quoteData) => {
        try {
            const response = await tokenRequest.put(`custom-api/admin/sales_quot/update?id=${id}`, quoteData);
            return response.data;
        } catch (error) {
            console.error("Error updating quote:", error);
            throw error;
        }
    },

    // Delete sales quote
    deleteQuote: async (id) => {
        try {
            const response = await tokenRequest.delete(`${QUOTE_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting quote:", error);
            throw error;
        }
    },

    // Note: deleteQuoteItems with /delete-query is not supported (returns 404).
    // Avoiding bulk delete for now.

    // Note: saveQuoteItems is no longer needed for CREATE flow
    // Items are now included in the saveQuote call
    // This function is kept for backward compatibility with UPDATE flow if needed
    saveQuoteItems: async (itemsData) => {
        try {
            const response = await tokenRequest.post(`${ITEM_BASE}/save-single-or-multiple`, itemsData);
            return response.data;
        } catch (error) {
            console.error("Error saving quote items:", error);
            throw error;
        }
    },

    // Fetch a single quote by its quote number
    getQuoteByNumber: async (quoteNumber) => {
        try {
            const body = {
                find: { quote_number: quoteNumber }
            };
            const response = await tokenRequest.post(`${QUOTE_BASE}/query`, body);
            // Returns the first match if it exists
            return response.data?.data?.[0] || null;
        } catch (error) {
            console.error("Error fetching quote by number:", error);
            throw error;
        }
    },

    // Fetch tax template details by ID
    getTaxTemplate: async (id) => {
        try {
            const response = await tokenRequest.get(`schema/admin/test1/billing_db/public.tax_code/get-by-id/${id}/`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error("Error fetching tax template:", error);
            throw error;
        }
    },

    // Send quote email
    sendQuoteEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending quote email:", error);
            throw error;
        }
    }
};
