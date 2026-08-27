import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/inventory/customized-products";

export const itemService = {
    getFilteredItems: async (filters = {}) => {
        try {
            const response = await tokenRequest.get(API_BASE, { params: filters });
            return {
                data: response.data?.data || [],
                totalCount: response.data?.total || response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in itemService.getFilteredItems:", error);
            throw error;
        }
    },

    queryItems: async (category) => {
        try {
            const response = await tokenRequest.get(API_BASE, { params: { category } });
            return response.data?.data || [];
        } catch (error) {
            console.error("Error in itemService.queryItems:", error);
            throw error;
        }
    },

    getItems: async () => {
        try {
            const response = await tokenRequest.get(API_BASE);
            return response.data?.data || [];
        } catch (error) {
            console.error("Error in itemService.getItems:", error);
            throw error;
        }
    },

    createItem: async (itemData) => {
        try {
            const response = await tokenRequest.post(API_BASE, itemData);
            return response.data;
        } catch (error) {
            console.error("Error in itemService.createItem:", error);
            throw error;
        }
    },

    updateItem: async (id, itemData) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, itemData);
            return response.data;
        } catch (error) {
            console.error("Error in itemService.updateItem:", error);
            throw error;
        }
    },

    deleteItem: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in itemService.deleteItem:", error);
            throw error;
        }
    }
};
