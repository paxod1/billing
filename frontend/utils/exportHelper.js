import { tokenRequest } from "../lib/axiosCreate";
import { showToast } from "../lib/features/toast/toastSlice";

/**
 * Handles exporting data by calling an API and downloading the resulting file.
 * 
 * @param {Object} options - Export options.
 * @param {string} options.endpoint - The API endpoint to call.
 * @param {Object} [options.payload] - Optional payload for POST requests.
 * @param {string} [options.method='GET'] - HTTP method ('GET' or 'POST').
 * @param {string} [options.defaultFileName] - Default filename if not provided by server.
 * @param {Function} options.dispatch - Redux dispatch function.
 * @param {Function} options.setIsExporting - State setter for loading status.
 */
export const handleExport = async ({
    endpoint,
    payload = null,
    method = "GET",
    defaultFileName = `export_${new Date().toISOString().split('T')[0]}.xlsx`,
    dispatch,
    setIsExporting
}) => {
    try {
        setIsExporting(true);

        // 1. Fetch response from API
        let response;
        if (method.toUpperCase() === "POST") {
            response = await tokenRequest.post(endpoint, payload);
        } else {
            // Manually construct query string to avoid encoding commas (%2C) as required by the backend
            const queryParams = new URLSearchParams();
            if (payload) {
                Object.entries(payload).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== "") {
                        queryParams.append(key, value);
                    }
                });
            }
            const queryString = queryParams.toString().replace(/%2C/g, ",");
            const url = queryString ? `${endpoint}?${queryString}` : endpoint;
            response = await tokenRequest.get(url);
        }

        let base64Data = "";
        let fileName = defaultFileName;
        let contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        // Detect if the response is a JSON object or a raw Base64 string
        if (typeof response.data === "string") {
            base64Data = response.data;
        } else if (response.data && response.data.base64) {
            base64Data = response.data.base64;
            if (response.data.fileName) fileName = response.data.fileName;
            if (response.data.contentType) contentType = response.data.contentType;
        } else if (response.data && response.data.data && typeof response.data.data === "string") {
            // Some APIs might wrap the string in a data property
            base64Data = response.data.data;
        }

        if (!base64Data || base64Data.length < 10) {
            console.error("API Response:", response.data);
            throw new Error("Export failed: Invalid or empty data received from server.");
        }

        // 2. Decode Base64 string to binary data
        const byteCharacters = atob(base64Data.trim());
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // 3. Create Blob and trigger download
        const blob = new Blob([byteArray], { type: contentType });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();

        // 4. Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);

        dispatch(showToast({ message: "Data exported successfully", type: "success" }));
    } catch (error) {
        console.error("Export error:", error);
        dispatch(showToast({ message: error.message || "Failed to export data", type: "error" }));
    } finally {
        setIsExporting(false);
    }
};
