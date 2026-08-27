import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/reports";

export const reportService = {
    getGeneralLedger: async (params = {}) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/ledger`, { params });
            const innerData = response.data?.data || {};
            return {
                data: Array.isArray(innerData) ? innerData : (innerData.data || []),
                totalCount: response.data?.total || innerData.total || 0
            };
        } catch (error) {
            console.error("Error in reportService.getGeneralLedger:", error);
            throw error;
        }
    },

    getProfitLoss: async (params = {}) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/pl`, { params });
            return response.data?.data || null;
        } catch (error) {
            console.error("Error in reportService.getProfitLoss:", error);
            throw error;
        }
    },

    getBalanceSheet: async (params = {}) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/balance-sheet`, { params });
            return response.data?.data || null;
        } catch (error) {
            console.error("Error in reportService.getBalanceSheet:", error);
            throw error;
        }
    },

    getTrialBalance: async (params = {}) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/trial-balance`, { params });
            return response.data?.data || null;
        } catch (error) {
            console.error("Error in reportService.getTrialBalance:", error);
            throw error;
        }
    },

    getTaxFiling: async (params = {}) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/tax-filing`, { params });
            return response.data?.data || null;
        } catch (error) {
            console.error("Error in reportService.getTaxFiling:", error);
            throw error;
        }
    },

    getLedgerAccounts: async () => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/ledger-accounts`);
            return response.data?.data || [];
        } catch (error) {
            console.error("Error in reportService.getLedgerAccounts:", error);
            return [];
        }
    }
};
