import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/accounting/journal-entries";

export const journalEntryService = {
    getJournalEntries: async (filters = {}) => {
        try {
            const params = {
                search: filters.search,
                date: filters.date,
                entry_type: filters.entry_type,
                limit: filters.limit || 10,
                skip: filters.skip || 0
            };

            const response = await tokenRequest.get(API_BASE, { params });

            return {
                data: response.data?.data || [],
                totalCount: response.data?.total || response.data?.totalCount || 0
            };
        } catch (error) {
            console.error("Error in journalEntryService.getJournalEntries:", error);
            throw error;
        }
    },

    saveJournalEntry: async (entryData) => {
        try {
            const response = await tokenRequest.post(API_BASE, entryData);
            return response.data;
        } catch (error) {
            console.error("Error in journalEntryService.saveJournalEntry:", error);
            throw error;
        }
    },

    saveJournalLines: async (linesData) => {
        return { success: true };
    },

    updateJournalEntry: async (id, journalData) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, journalData);
            return response.data;
        } catch (error) {
            console.error("Error in journalEntryService.updateJournalEntry:", error);
            throw error;
        }
    },

    updateJournalLine: async (id, lineData) => {
        return { success: true };
    },

    deleteJournalEntry: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in journalEntryService.deleteJournalEntry:", error);
            throw error;
        }
    },

    createJournalEntryCustom: async (payload) => {
        try {
            const response = await tokenRequest.post(API_BASE, payload);
            return response.data;
        } catch (error) {
            console.error("Error in journalEntryService.createJournalEntryCustom:", error);
            throw error;
        }
    },

    updateJournalEntryCustom: async (payload) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${payload.id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error in journalEntryService.updateJournalEntryCustom:", error);
            throw error;
        }
    },

    postJournalEntry: async (id) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, { status: "POSTED" });
            return response.data;
        } catch (error) {
            console.error("Error in journalEntryService.postJournalEntry:", error);
            throw error;
        }
    },

    getUniqueEntryNumber: async () => {
        return { entry_no: "JV-" + Date.now() };
    }
};
