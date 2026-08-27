import { tokenRequest } from "@/lib/axiosCreate";

const MILEAGE_ENTRY_BASE = "schema/admin/test1/billing_db/public.mileage_entry";
const CUSTOM_MILEAGE_API = "custom-api/admin/mileage";

export const salesMileageService = {
    // Fetch all mileage entries with optional filtering
    getMileageEntries: async (filters = {}) => {
        try {
            const conditions = [];

            // 1. Status Filter
            if (filters.status && filters.status.trim() !== "") {
                conditions.push({ status: filters.status });
            }

            // 3. Search Logic - Name
            if (filters.search && filters.search.trim() !== "") {
                const searchTerm = filters.search.trim();
                const probes = [
                    searchTerm.toLowerCase(),
                    searchTerm.toUpperCase(),
                    searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
                    searchTerm
                ];
                const searchProbes = [...new Set(probes)]; // unique

                const searchOrGroup = [];

                // Search by Name
                searchProbes.forEach(term => {
                    searchOrGroup.push({ name: { "$regex": `%${term}%` } });
                });

                if (searchOrGroup.length > 0) {
                    conditions.push({ $or: searchOrGroup });
                }
            }

            // 4. Date Filter 
            if (filters.date && filters.date.trim() !== "") {
                conditions.push({ date: filters.date });
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

            const response = await tokenRequest.post(`${MILEAGE_ENTRY_BASE}/query`, body);

            return {
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error fetching mileage entries:", error);
            throw error;
        }
    },

    // Save or Update mileage entry
    saveMileageEntry: async (mileageData) => {
        try {
            const response = await tokenRequest.post(`${CUSTOM_MILEAGE_API}/create/`, mileageData);
            return response.data;
        } catch (error) {
            console.error("Error saving mileage entry:", error);
            throw error;
        }
    },

    // Delete mileage entry
    deleteMileageEntry: async (id) => {
        try {
            const response = await tokenRequest.delete(`${MILEAGE_ENTRY_BASE}/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error deleting mileage entry:", error);
            throw error;
        }
    },
    
    // Send email
    sendMileageEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending mileage entry email:", error);
            throw error;
        }
    },

    // Post mileage entry by calling PUT update-by-id endpoint to update status to POSTED
    postMileageEntry: async (id) => {
        try {
            const response = await tokenRequest.put(`${MILEAGE_ENTRY_BASE}/update-by-id/${id}/`, { status: "POSTED" });
            return response.data;
        } catch (error) {
            console.error("Error posting mileage entry:", error);
            throw error;
        }
    }
};
