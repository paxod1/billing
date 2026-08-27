import { tokenRequest } from "@/lib/axiosCreate";

const TIME_ENTRY_BASE = "schema/admin/test1/billing_db/public.time_entry";
const CUSTOM_TIME_API = "custom-api/admin/time";

export const salesTimeService = {
    // Fetch all time entries with optional filtering
    getTimeEntries: async (filters = {}) => {
        try {
            const conditions = [];

            // 1. Status Filter
            if (filters.status && filters.status.trim() !== "") {
                conditions.push({ status: filters.status });
            }

            // 3. Search Logic - Exclusively for Entry Name
            if (filters.search && filters.search.trim() !== "") {
                const searchTerm = filters.search.trim();
                const probes = [
                    searchTerm,
                    searchTerm.toLowerCase(),
                    searchTerm.toUpperCase(),
                    searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase()
                ];
                const searchProbes = [...new Set(probes)]; // unique
                
                const searchConditions = searchProbes.map(term => ({
                    name: { "$regex": `%${term}%` }
                }));

                if (searchConditions.length > 0) {
                    conditions.push({ $or: searchConditions });
                }
            }

            // 4. Date Filter (Normalized to ISO)
            if (filters.date && filters.date.trim() !== "") {
                conditions.push({ entry_date: `${filters.date}T00:00:00.000Z` });
            }

            // 5. Amount Filter
            if (filters.total_amount && filters.total_amount.toString().trim() !== "") {
                conditions.push({ amount: filters.total_amount.toString() });
            }

            const body = {
                sort: "-id",
                limit: filters.limit || 10,
                skip: filters.skip || 0,
                find: conditions.length > 0 ? { $and: conditions } : {},
                getTotalCount: true
            };

            const response = await tokenRequest.post(`${TIME_ENTRY_BASE}/query`, body);

            return {
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error fetching time entries:", error);
            throw error;
        }
    },

    // Save or Update time entry
    saveTimeEntry: async (timeData) => {
        try {
            // Valid payload structure explicitly passed by user
            const response = await tokenRequest.post(`${CUSTOM_TIME_API}/create/`, timeData);
            return response.data;
        } catch (error) {
            console.error("Error saving time entry:", error);
            throw error;
        }
    },

    // Delete time entry
    deleteTimeEntry: async (id) => {
        try {
            const response = await tokenRequest.delete(`${TIME_ENTRY_BASE}/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error deleting time entry:", error);
            throw error;
        }
    },
    
    // Send email (assuming similar payload structure to quotes)
    sendTimeEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending time entry email:", error);
            throw error;
        }
    },

    // Post time entry by calling PUT update-by-id endpoint to update status to POSTED
    postTimeEntry: async (id) => {
        try {
            const response = await tokenRequest.put(`${TIME_ENTRY_BASE}/update-by-id/${id}/`, { status: "POSTED" });
            return response.data;
        } catch (error) {
            console.error("Error posting time entry:", error);
            throw error;
        }
    }
};
