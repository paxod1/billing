import { tokenRequest } from "@/lib/axiosCreate";

const ESTIMATION_BASE = "schema/admin/test1/billing_db/public.estimation";

export const estimationService = {
    // Fetch all estimations with optional filtering
    getEstimations: async (filters = {}) => {
        try {
            const find = {};

            // 1. Unified Search logic (Name, Number)
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
                    searchConditions.push({ name: { "$regex": `%${term}%` } });
                    searchConditions.push({ estimation_number: { "$regex": `%${term}%` } });
                });
                find["$or"] = searchConditions;
            }

            // 2. Status filter (Handle case inconsistency in DB via $in)
            if (filters.status && filters.status.trim() !== "") {
                const statusVal = filters.status.trim();
                find.status = { $in: [statusVal.toUpperCase(), statusVal.toLowerCase()] };
            }

            // 4. Date Filters
            if (filters.date) {
                find.date = filters.date;
            }
            if (filters.expiry_date) {
                find.expiry_date = filters.expiry_date;
            }

            const body = {
                sort: { id: -1 },
                limit: filters.limit || 10,
                skip: filters.skip || 0,
                getTotalCount: true,
                deep: [
                    {
                        s_key: "lines",
                        isMultiple: true
                    }
                ]
            };

            if (Object.keys(find).length > 0) {
                body.find = find;
            }

            const response = await tokenRequest.post(`${ESTIMATION_BASE}/query`, body);

            return {
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error fetching estimations:", error);
            throw error;
        }
    },

    // Create/Update estimation
    saveEstimation: async (estimationData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/estimation/create", estimationData);
            return response.data;
        } catch (error) {
            console.error("Error saving estimation:", error);
            throw error;
        }
    },

    // Delete estimation
    deleteEstimation: async (id) => {
        try {
            const response = await tokenRequest.delete(`${ESTIMATION_BASE}/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error deleting estimation:", error);
            throw error;
        }
    },

    // Send estimation email
    sendEstimationEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending estimation email:", error);
            throw error;
        }
    },

    // Post estimation by calling PUT update-by-id endpoint to update status to POSTED
    postEstimation: async (id) => {
        try {
            const response = await tokenRequest.put(`${ESTIMATION_BASE}/update-by-id/${id}/`, { status: "POSTED" });
            return response.data;
        } catch (error) {
            console.error("Error posting estimation:", error);
            throw error;
        }
    }
};
