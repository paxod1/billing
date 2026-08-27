import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/parties";

export const partyService = {
    // Get all parties with optional filtering and pagination
    getParties: async (filters = {}) => {
        try {
            const params = {
                role: filters.role,
                search: filters.search,
                name: filters.name,
                email: filters.email,
                phone: filters.phone,
                limit: filters.limit || 10,
                skip: filters.skip || 0
            };

            const response = await tokenRequest.get(API_BASE, { params });

            return {
                data: response.data?.data || [],
                totalCount: response.data?.total || response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in partyService.getParties:", error);
            throw error;
        }
    },

    queryParties: async (role) => {
        const response = await partyService.getParties({ role, limit: 1000 });
        return response.data;
    },

    // Create new party
    createParty: async (partyData) => {
        const response = await tokenRequest.post(API_BASE, partyData);
        return response.data;
    },

    // Update party by ID
    updateParty: async (id, partyData) => {
        const response = await tokenRequest.put(`${API_BASE}/${id}`, partyData);
        return response.data;
    },

    // Delete party by ID
    deleteParty: async (id) => {
        const response = await tokenRequest.delete(`${API_BASE}/${id}`);
        return response.data;
    },

    exportParties: async (role = "customer") => {
        const response = await tokenRequest.get(`${API_BASE}/export`, { params: { role } });
        return response.data;
    },

    getPartyStatement: async (params = {}) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/statement`, { params });
            return response.data;
        } catch (error) {
            console.error("Error in partyService.getPartyStatement:", error);
            throw error;
        }
    },

    getPartyById: async (id) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/${id}`);
            const data = response.data?.data || response.data || null;
            return data;
        } catch (error) {
            console.error("Error in partyService.getPartyById:", error);
            throw error;
        }
    }
};
