import { tokenRequest } from "@/lib/axiosCreate";

const API_BASE = "api/accounting/accounts";

function flattenAccountTree(treeData) {
    if (!treeData) return [];

    const result = [];
    const traverse = (nodes) => {
        if (!Array.isArray(nodes)) return;
        for (const node of nodes) {
            const { children, ...accountWithoutChildren } = node;
            result.push(accountWithoutChildren);
            if (children && children.length > 0) {
                traverse(children);
            }
        }
    };

    if (Array.isArray(treeData)) {
        traverse(treeData);
    } else if (typeof treeData === 'object') {
        Object.values(treeData).forEach(categoryList => {
            traverse(categoryList);
        });
    }

    return result;
}

export const accountService = {
    getChartsOfAccounts: async () => {
        try {
            const response = await tokenRequest.get(API_BASE);
            return response.data?.data || {};
        } catch (error) {
            console.error("Error in accountService.getChartsOfAccounts:", error);
            throw error;
        }
    },

    createAccount: async (accountData) => {
        try {
            const response = await tokenRequest.post(API_BASE, accountData);
            return response.data;
        } catch (error) {
            console.error("Error in accountService.createAccount:", error);
            throw error;
        }
    },

    deleteAccount: async (id) => {
        try {
            const response = await tokenRequest.delete(`${API_BASE}/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error in accountService.deleteAccount:", error);
            throw error;
        }
    },

    updateAccount: async (id, accountData) => {
        try {
            const response = await tokenRequest.put(`${API_BASE}/${id}`, accountData);
            return response.data;
        } catch (error) {
            console.error("Error in accountService.updateAccount:", error);
            throw error;
        }
    },

    queryAccounts: async (query) => {
        try {
            const response = await tokenRequest.get(API_BASE);
            const rawData = response.data?.data || {};
            const allAccounts = flattenAccountTree(rawData);

            if (query && query.find) {
                return allAccounts.filter(acc => {
                    for (const [key, val] of Object.entries(query.find)) {
                        if (key === 'category' && val) {
                            if ((acc.category || '').toLowerCase() !== String(val).toLowerCase()) return false;
                        } else if (key === 'is_folder' && val !== undefined) {
                            if (Boolean(acc.is_folder) !== Boolean(val)) return false;
                        } else if (acc[key] !== val) {
                            return false;
                        }
                    }
                    return true;
                });
            }

            return allAccounts;
        } catch (error) {
            console.error("Error in accountService.queryAccounts:", error);
            throw error;
        }
    },

    fetchLeaves: async () => {
        try {
            const response = await tokenRequest.get(API_BASE);
            const rawData = response.data?.data || {};
            const allAccounts = flattenAccountTree(rawData);
            return allAccounts.filter(acc => !acc.is_folder);
        } catch (error) {
            console.error("Error in accountService.fetchLeaves:", error);
            throw error;
        }
    },

    getAccountDetails: async (accountId, limit = 10, skip = 0) => {
        try {
            const response = await tokenRequest.get(`${API_BASE}/${accountId}`);
            return response.data;
        } catch (error) {
            console.error("Error in accountService.getAccountDetails:", error);
            throw error;
        }
    },

    fetchSuggestions: async (accountId, side) => {
        try {
            const response = await tokenRequest.get(API_BASE);
            const rawData = response.data?.data || {};
            const allAccounts = flattenAccountTree(rawData);
            return allAccounts.filter(acc => !acc.is_folder);
        } catch (error) {
            console.error("Error in accountService.fetchSuggestions:", error);
            throw error;
        }
    }
};
