import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/purchase/invoices";

export const purchaseInvoiceService = {
    // Query purchase invoices with pagination and filtering
    queryInvoices: async (params = {}) => {
        try {
            const queryParams = {
                search: params.search,
                status: params.status,
                supplier_id: params.supplier_id,
                limit: params.limit || 10,
                skip: params.skip || 0
            };

            const response = await tokenRequest.get(API_BASE, { params: queryParams });
            const rawData = response.data?.data;
            const invoiceList = Array.isArray(rawData)
                ? rawData
                : (Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(response.data) ? response.data : []));

            const total = response.data?.totalCount ?? response.data?.total ?? rawData?.total ?? invoiceList.length;

            return {
                data: invoiceList,
                totalCount: total
            };
        } catch (error) {
            console.error("Error in purchaseInvoiceService.queryInvoices:", error);
            throw error;
        }
    },

    saveInvoice: async (invoiceData) => {
        try {
            const response = await tokenRequest.post(API_BASE, invoiceData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseInvoiceService.saveInvoice:", error);
            throw error;
        }
    },

    updateInvoice: async (id, invoiceData) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, invoiceData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseInvoiceService.updateInvoice:", error);
            throw error;
        }
    },

    deleteInvoice: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseInvoiceService.deleteInvoice:", error);
            throw error;
        }
    },

    sendInvoiceEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("api/purchase/email", emailData);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseInvoiceService.sendInvoiceEmail:", error);
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
            console.error("Error in purchaseInvoiceService.getInvoiceByIdDeep:", error);
            throw error;
        }
    },

    getAllInvoicesForDropdown: async (returnAgainstId = null) => {
        try {
            const response = await tokenRequest.get(API_BASE);
            if (Array.isArray(response.data?.data)) return response.data.data;
            if (Array.isArray(response.data)) return response.data;
            return [];
        } catch (error) {
            console.error("Error in purchaseInvoiceService.getAllInvoicesForDropdown:", error);
            throw error;
        }
    },
    
    exportPurchaseInvoices: async () => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/export`);
            return response.data;
        } catch (error) {
            console.error("Error in purchaseInvoiceService.exportPurchaseInvoices:", error);
            throw error;
        }
    }
};
