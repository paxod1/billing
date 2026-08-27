import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/sales/payments";

export const salesPaymentService = {
    getSalesPayments: async (filters = {}) => {
        try {
            const params = {
                customer_id: filters.customer_id,
                search: filters.search,
                status: filters.status,
                limit: filters.limit || 10,
                skip: filters.skip || 0
            };

            const response = await tokenRequest.get(API_BASE, { params });
            
            return {
                success: true,
                data: response.data?.data || [],
                totalCount: response.data?.total || response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error fetching sales payments:", error);
            throw error;
        }
    },

    createPayment: async (paymentData) => {
        try {
            const response = await tokenRequest.post(API_BASE, paymentData);
            return response.data;
        } catch (error) {
            console.error("Error creating sales payment:", error);
            throw error;
        }
    },

    updatePayment: async (id, paymentData) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, paymentData);
            return response.data;
        } catch (error) {
            console.error("Error updating sales payment:", error);
            throw error;
        }
    },

    exportSalesPayments: async () => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/export`);
            return response.data;
        } catch (error) {
            console.error("Error exporting sales payments:", error);
            throw error;
        }
    },

    sendPaymentEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("api/sales/email", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending payment email:", error);
            throw error;
        }
    },

    deletePayment: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting sales payment:", error);
            throw error;
        }
    },

    getPaymentByIdDeep: async (id) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/${id}`);
            return {
                success: true,
                data: response.data?.data || response.data
            };
        } catch (error) {
            console.error("Error fetching sales payment by ID (deep):", error);
            throw error;
        }
    }
};
