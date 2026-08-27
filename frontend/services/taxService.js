import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/accounting/tax-codes";

export const taxService = {
    getAccountCategories: async () => {
        return [
            { id: 1, name: "Asset" },
            { id: 2, name: "Liability" },
            { id: 3, name: "Equity" },
            { id: 4, name: "Income" },
            { id: 5, name: "Expense" }
        ];
    },

    getTaxCodes: async () => {
        try {
            const response = await tokenRequest.get(API_BASE);
            return response.data?.data || [];
        } catch (error) {
            console.error("Error in taxService.getTaxCodes:", error);
            throw error;
        }
    },

    createTaxCode: async (data) => {
        try {
            const response = await tokenRequest.post(API_BASE, data);
            return response.data;
        } catch (error) {
            console.error("Error in taxService.createTaxCode:", error);
            throw error;
        }
    },

    updateTaxCode: async (id, data) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("Error in taxService.updateTaxCode:", error);
            throw error;
        }
    },

    deleteTaxCode: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in taxService.deleteTaxCode:", error);
            throw error;
        }
    },

    getTaxCodeById: async (id) => {
        try {
            if (!id) return { success: true, data: null };
            const response = await tokenRequest.get(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in taxService.getTaxCodeById:", error);
            throw error;
        }
    },

    exportTaxCodes: async () => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/export`);
            return response.data;
        } catch (error) {
            console.error("Error in taxService.exportTaxCodes:", error);
            throw error;
        }
    },
};
