/**
 * Utility functions for managing cookies in the browser.
 * Configured for Single Token authentication (only 1 token cookie).
 */

export const setCookie = (name, value, days) => {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
};

export const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

export const deleteCookie = (name) => {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

// --- SINGLE TOKEN HELPER METHODS ---

/**
 * Set the single authentication token in cookie.
 */
export const setAuthToken = (token, days = 30) => {
    setCookie("amToken", token, days);
};

/**
 * Get the single authentication token from cookie.
 */
export const getAuthToken = () => {
    return getCookie("amToken") || getCookie("token");
};

/**
 * Clear the single authentication token cookie.
 */
export const clearAuthCookies = () => {
    deleteCookie("amToken");
    deleteCookie("token");
    deleteCookie("amDbToken"); // remove legacy second token if present
};
