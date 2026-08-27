/**
 * Generates a unique ID in the format: Prefix-MMDD-3RandomLetters
 * Example: Q-0316-ABC
 * 
 * @param {string} prefix - The document prefix (e.g., 'Q', 'INV', 'PFN', 'EST')
 * @returns {string} The generated unique ID
 */
export const generateUniqueId = (prefix) => {
    const now = new Date();
    
    // 4 digits: Month and Day (MMDD)
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const digits = `${month}${day}`;
    
    // 4 letters: Random uppercase letters
    const letters = Array.from({ length: 4 }, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    
    return `${prefix}-${digits}-${letters}`;
};
