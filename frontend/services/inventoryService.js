import { tokenRequest } from "@/lib/axiosCreate";

const API_CUSTOMIZED = "api/inventory/customized-products";
const API_RAW = "api/inventory/raw-materials";

export const inventoryService = {
    // --- RAW MATERIALS ---
    getRawMaterials: async (params = {}) => {
        try {
            const response = await tokenRequest.get(API_RAW, { params });
            return {
                data: response.data?.data || [],
                totalCount: response.data?.total || response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in inventoryService.getRawMaterials:", error);
            throw error;
        }
    },

    saveRawMaterial: async (data) => {
        try {
            const response = await tokenRequest.post(API_RAW, data);
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.saveRawMaterial:", error);
            throw error;
        }
    },

    updateRawMaterial: async (id, data) => {
        try {
            const response = await tokenRequest.put(`${API_RAW}/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.updateRawMaterial:", error);
            throw error;
        }
    },

    deleteRawMaterial: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_RAW}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.deleteRawMaterial:", error);
            throw error;
        }
    },

    // --- PRODUCTS ---
    getProducts: async (params = {}) => {
        return inventoryService.getCustomizedProducts(params);
    },

    saveProduct: async (data) => {
        return inventoryService.saveCustomizedProduct(data);
    },

    updateProduct: async (data) => {
        return inventoryService.updateCustomizedProduct(data.id, data);
    },

    deleteProduct: async (id) => {
        return inventoryService.deleteCustomizedProduct(id);
    },

    // --- Stocks ---
    getCustomizedProducts: async (params = {}) => {
        try {
            const response = await tokenRequest.get(API_CUSTOMIZED, { params });
            return {
                data: response.data?.data || [],
                totalCount: response.data?.total || response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in inventoryService.getCustomizedProducts:", error);
            throw error;
        }
    },

    saveCustomizedProduct: async (data) => {
        try {
            const response = await tokenRequest.post(API_CUSTOMIZED, data);
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.saveCustomizedProduct:", error);
            throw error;
        }
    },

    updateCustomizedProduct: async (id, data) => {
        try {
            const response = await tokenRequest.put(`${API_CUSTOMIZED}/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.updateCustomizedProduct:", error);
            throw error;
        }
    },

    deleteCustomizedProduct: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_CUSTOMIZED}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.deleteCustomizedProduct:", error);
            throw error;
        }
    },

    // --- COMPOSITION & RESTOCK ---
    saveComposition: async (data) => {
        return { success: true };
    },

    updateComposition: async (id, data) => {
        return { success: true };
    },

    deleteComposition: async (id) => {
        return { success: true };
    },

    restockRawMaterial: async (material, data) => {
        try {
            const response = await tokenRequest.put(`${API_RAW}/${material.id}`, { restock: data.amount });
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.restockRawMaterial:", error);
            throw error;
        }
    },

    restockProduct: async (product, data) => {
        try {
            const response = await tokenRequest.put(`${API_CUSTOMIZED}/${product.id}`, { restock: data.amount });
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.restockProduct:", error);
            throw error;
        }
    },

    restockCustomizedProduct: async (item, data) => {
        try {
            const response = await tokenRequest.put(`${API_CUSTOMIZED}/${item.id}`, { restock: data.amount });
            return response.data;
        } catch (error) {
            console.error("Error in inventoryService.restockCustomizedProduct:", error);
            throw error;
        }
    }
};

