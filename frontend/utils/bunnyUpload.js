/**
* Upload file to Bunny CDN Storage with progress callback
* @param {File} file - The file to upload
* @param {string} folder - The folder path in Bunny storage (e.g., 'parent-categories')
* @param {Function} onProgress - Callback function for upload progress (0-100)
* @returns {Promise<string>} - The public URL of the uploaded file
*/
export const uploadToBunny = async (file, folder = '', onProgress = null) => {
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}-${randomString}.${fileExtension}`;
 
        // Construct the path, always inside the 'billing' root folder
        const baseFolder = 'billing';
        const fullFolder = folder ? `${baseFolder}/${folder}` : baseFolder;
        const path = `${fullFolder}/${fileName}`;
 
        // Bunny Storage API endpoint
        const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE_NAME 
        const storageApiKey = process.env.NEXT_PUBLIC_BUNNY_STORAGE_API_KEY 
        const storageRegion = process.env.NEXT_PUBLIC_BUNNY_STORAGE_REGION 
 
        // Construct the API URL
        const baseUrl = storageRegion
            ? `https://${storageRegion}.storage.bunnycdn.com`
            : 'https://storage.bunnycdn.com';
 
        const uploadUrl = `${baseUrl}/${storageZoneName}/${path}`;
 
        // Create XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
 
            // Track upload progress
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            });
 
            // Handle completion
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    // Construct the public CDN URL
                    const pullZoneUrl = `https://${storageZoneName}.b-cdn.net`;
                    const publicUrl = `${pullZoneUrl}/${path}`;
 
                    resolve(publicUrl);
                } else {
                    reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
            });
 
            // Handle errors
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed due to network error'));
            });
 
            xhr.addEventListener('abort', () => {
                reject(new Error('Upload cancelled'));
            });
 
            // Open and send request
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('AccessKey', storageApiKey);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
        });
 
    } catch (error) {
        console.error('❌ Error uploading to Bunny CDN:', error);
        throw new Error('Failed to upload attachment. Please try again.');
    }
};
 
/**
* Delete file from Bunny CDN Storage
* @param {string} fileUrl - The public URL of the file to delete
* @returns {Promise<boolean>} - Success status
*/
export const deleteFromBunny = async (fileUrl) => {
    try {
        if (!fileUrl) {
            console.warn('⚠️ No file URL provided for deletion');
            return false;
        }
 
        // Extract the file path from the public URL
        const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE_NAME || 'grow-magics-community';
        const pullZoneUrl = `https://${storageZoneName}.b-cdn.net`;
        const filePath = fileUrl.replace(pullZoneUrl + '/', '');
 
        if (!filePath || filePath === fileUrl) {
            console.warn('⚠️ Could not extract file path from URL:', fileUrl);
            return false;
        }
 
        // Bunny Storage API endpoint
        const storageApiKey = process.env.NEXT_PUBLIC_BUNNY_STORAGE_API_KEY || '835b9034-5b78-43b2-9f46999505b0-0642-4de4';
        const storageRegion = process.env.NEXT_PUBLIC_BUNNY_STORAGE_REGION || 'uk';
 
        // Construct the API URL
        const baseUrl = storageRegion
            ? `https://${storageRegion}.storage.bunnycdn.com`
            : 'https://storage.bunnycdn.com';
 
        const deleteUrl = `${baseUrl}/${storageZoneName}/${filePath}`;
 
        // Delete the file
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'AccessKey': storageApiKey,
            },
        });
 
        if (!response.ok && response.status !== 404) {
            throw new Error(`Delete failed: ${response.statusText}`);
        }
 
        return true;
 
    } catch (error) {
        console.error('❌ Error deleting from Bunny CDN:', error);
        // Don't throw error for delete failures, just log it
        return false;
    }
};
 
/**
* Convert file to base64 (optional utility)
*/
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
 
/**
* Validate file size and type
*/
export const validateFile = (file, options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    } = options;
 
    const errors = [];
 
    if (file.size > maxSize) {
        errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }
 
    if (!allowedTypes.includes(file.type) && allowedTypes.length > 0) {
        errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
 
    return {
        isValid: errors.length === 0,
        errors
    };
};
