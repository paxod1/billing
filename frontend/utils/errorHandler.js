/**
 * Centralized Error Handler Utility
 * Converts backend error messages into user-friendly messages
 */

/**
 * Extract user-friendly error message from API error response
 * @param {Error} error - The error object from API call
 * @param {string} defaultMessage - Default message if no specific error found
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, defaultMessage = "An error occurred") => {
    // Check if error response exists
    if (!error.response?.data) {
        return error.message || defaultMessage;
    }

    const { data } = error.response;

    // Handle array of errors
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const firstError = data.errors[0];

        // Handle duplicate key constraint
        if (firstError.constraint?.includes("_key") || firstError.code === "23505") {
            const field = extractFieldFromConstraint(firstError.constraint) || "This value";
            return `${field} already exists. Please use a different value.`;
        }

        // Handle foreign key constraint (delete)
        if (firstError.constraint?.includes("fk_") || firstError.code === "23503") {
            if (firstError.message?.includes("still referenced")) {
                return "Cannot delete: This item is being used in other records.";
            }
            return "Cannot perform this action: Related records exist.";
        }

        // Handle check constraint violations
        if (firstError.code === "23514") {
            const field = firstError.constraint?.replace(/_check$/, "").replace(/_/g, " ");
            return `Invalid value for ${field}. Please check your input.`;
        }

        // Handle validation errors
        if (firstError.type === "required") {
            return `${firstError.field} is required.`;
        }

        if (firstError.type === "enumValidation") {
            return firstError.message || `Invalid value for ${firstError.field}.`;
        }

        if (firstError.type === "schemaKeyNotFound") {
            return `Invalid field: ${firstError.field}`;
        }

        // Return the error message if it exists and is user-friendly
        if (firstError.message && !firstError.message.includes("violates") && !firstError.message.includes("constraint")) {
            if (firstError.message.toLowerCase().includes("insufficient stock")) {
                return `${firstError.message}. Solution: Please restock the required materials in the Inventory section or adjust your composition quantities.`;
            }
            return firstError.message;
        }
    }

    // Handle single error message
    if (data.message) {
        if (data.message.toLowerCase().includes("insufficient stock")) {
            return `${data.message}. Solution: Please restock the required materials in the Inventory section or adjust your composition quantities.`;
        }
        return data.message;
    }

    // Fallback to default message
    return defaultMessage;
};

/**
 * Extract field name from constraint name
 * @param {string} constraint - Constraint name from database
 * @returns {string} Human-readable field name
 */
const extractFieldFromConstraint = (constraint) => {
    if (!constraint) return null;

    // Extract field name from constraint like "item_item_code_key"
    const parts = constraint.split("_");
    if (parts.length >= 2) {
        // Remove table name and "_key" suffix
        const fieldParts = parts.slice(1, -1);
        const fieldName = fieldParts.join(" ");
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    }

    return null;
};

/**
 * Handle API error and return user-friendly message
 * Specifically for CRUD operations
 * @param {Error} error - The error object
 * @param {string} operation - The operation type (create, update, delete)
 * @param {string} entity - The entity name (item, product, material, etc.)
 * @returns {string} User-friendly error message
 */
export const handleCrudError = (error, operation, entity) => {
    const errorData = error.response?.data?.errors?.[0];

    if (!errorData) {
        return `Failed to ${operation} ${entity}`;
    }

    // Return the error message if it exists and is user-friendly (not Postgres raw constraints)
    if (errorData.message && !errorData.message.includes("violates") && !errorData.message.includes("constraint")) {
        if (errorData.message.toLowerCase().includes("insufficient stock")) {
            return `${errorData.message}. Solution: Please restock or adjust composition.`;
        }
        return errorData.message;
    }

    // Duplicate key
    if (errorData.code === "23505") {
        const field = extractFieldFromConstraint(errorData.constraint) || "value";
        return `This ${field} already exists. Please use a different one.`;
    }

    // Foreign key constraint
    if (errorData.code === "23503") {
        if (operation === "delete") {
            return `Cannot delete ${entity}: It is being used in other records.`;
        }
        return `Cannot ${operation} ${entity}: Related record not found.`;
    }

    // Check constraint
    if (errorData.code === "23514") {
        return `Invalid data for ${entity}. Please check your input.`;
    }

    // Validation errors
    if (errorData.type === "required") {
        return `${errorData.field} is required.`;
    }

    if (errorData.type === "enumValidation") {
        return errorData.message || `Invalid value for ${errorData.field}.`;
    }

    if (errorData.message?.toLowerCase().includes("insufficient stock")) {
        return `${errorData.message}. Solution: Please restock or adjust composition.`;
    }

    // Return generic message with specific operation
    return `Failed to ${operation} ${entity}`;
};

/**
 * Get HTTP status code from error
 * @param {Error} error - The error object
 * @returns {number} HTTP status code
 */
export const getErrorStatus = (error) => {
    return error.response?.status || 500;
};

/**
 * Check if error is a network error
 * @param {Error} error - The error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
    return !error.response && error.message === "Network Error";
};

/**
 * Format validation errors into a single message
 * @param {Array} errors - Array of validation errors
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
    if (!Array.isArray(errors) || errors.length === 0) {
        return "Validation failed";
    }

    if (errors.length === 1) {
        return errors[0].message || `Invalid ${errors[0].field}`;
    }

    return `Please fix the following: ${errors.map(e => e.field).join(", ")}`;
};
