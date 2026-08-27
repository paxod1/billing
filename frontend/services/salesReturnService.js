import { tokenRequest } from "@/lib/axiosCreate";

export const salesReturnService = {
    // Query sales returns with filters & pagination
    queryReturns: async (params = {}) => {
        try {
            const response = await tokenRequest.post("sales/returns/query", params);
            return {
                data: response.data?.data || [],
                totalCount: response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in salesReturnService.queryReturns:", error);
            throw error;
        }
    },

    // Save a new sales return
    saveReturn: async (returnData) => {
        try {
            const response = await tokenRequest.post("sales/returns", returnData);
            return response.data;
        } catch (error) {
            console.error("Error in salesReturnService.saveReturn:", error);
            throw error;
        }
    },

    // Update an existing sales return
    updateReturn: async (id, returnData) => {
        try {
            const response = await tokenRequest.put(`sales/returns/${id}`, returnData);
            return response.data;
        } catch (error) {
            console.error("Error in salesReturnService.updateReturn:", error);
            throw error;
        }
    },

    // Delete a sales return
    deleteReturn: async (id) => {
        try {
            const response = await tokenRequest.delete(`sales/returns/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in salesReturnService.deleteReturn:", error);
            throw error;
        }
    },

    // Send return email
    sendReturnEmail: async (emailData) => {
        try {
            const response = await tokenRequest.post("custom-api/admin/email_sender", emailData);
            return response.data;
        } catch (error) {
            console.error("Error in salesReturnService.sendReturnEmail:", error);
            throw error;
        }
    },

    // Fetch deep return detail
    getReturnByIdDeep: async (id) => {
        try {
            const response = await tokenRequest.post("sales/returns/query", { find: { id: parseInt(id) } });
            if (response.data?.success && response.data?.data?.length > 0) {
                return {
                    success: true,
                    data: response.data.data[0]
                };
            }
            return { success: false, message: "Sales Return not found" };
        } catch (error) {
            console.error("Error in salesReturnService.getReturnByIdDeep:", error);
            throw error;
        }
    },

    // Fetch all sales invoices for dropdown select
    getAllInvoicesForDropdown: async () => {
        try {
            const response = await tokenRequest.get("sales/invoices");
            return response.data?.data || [];
        } catch (error) {
            console.error("Error fetching invoices for dropdown:", error);
            return [];
        }
    }
};
