import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/sales/invoices";

export const salesInvoiceService = {
    // Fetch all sales invoices
    getSalesInvoices: async (filters = {}) => {
        try {
            const params = {
                status: filters.status,
                customer_id: filters.customer_id,
                invoice_date: filters.invoice_date,
                search: filters.search,
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
            console.error("Error fetching sales invoices:", error);
            throw error;
        }
    },

    saveInvoice: async (invoiceData) => {
        try {
            const response = await tokenRequest.post(API_BASE, invoiceData);
            return response.data;
        } catch (error) {
            console.error("Error saving sales invoice:", error);
            throw error;
        }
    },

    updateInvoice: async (id, invoiceData) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, invoiceData);
            return response.data;
        } catch (error) {
            console.error("Error updating sales invoice:", error);
            throw error;
        }
    },

    exportSalesInvoices: async () => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/export`);
            return response.data;
        } catch (error) {
            console.error("Error exporting sales invoices:", error);
            throw error;
        }
    },

    sendInvoiceEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("api/sales/email", emailData);
            return response.data;
        } catch (error) {
            console.error("Error sending invoice email:", error);
            throw error;
        }
    },

    deleteInvoice: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting sales invoice:", error);
            throw error;
        }
    },

    getInvoiceById: async (id) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/${id}`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error("Error fetching sales invoice by ID:", error);
            throw error;
        }
    },

    getInvoiceByIdDeep: async (id) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/${id}`);
            return {
                success: true,
                data: response.data?.data || response.data
            };
        } catch (error) {
            console.error("Error fetching sales invoice by ID (deep):", error);
            throw error;
        }
    },

    getSalesInvoicesCustom: async () => {
        return salesInvoiceService.getSalesInvoices();
    }
};
