"use client";

import React, { useState, useRef, useCallback } from "react";
import {
    FiUploadCloud, FiPaperclip, FiX, FiLoader, FiAlertCircle,
    FiCheck, FiEye, FiFileText, FiImage, FiFile
} from "react-icons/fi";
import { tokenRequest } from "@/lib/axiosCreate";

// ─────────────────────────────────────────────────────────────
// Presign API helper — uses tokenRequest so both auth headers
// (x-am-authorization + x-am-user-authorization) are injected
// automatically by the axios interceptor.
// ─────────────────────────────────────────────────────────────
const fetchPresign = async ({ context, filename, mime_type, existing_url }) => {
    const params = new URLSearchParams({ context, filename, mime_type });
    if (existing_url && existing_url.startsWith("http")) {
        params.set("existing_url", existing_url);
    }

    const res = await tokenRequest.get(
        `custom-api/admin/upload/presign?${params.toString()}`
    );

    // Support both top-level and nested response shapes
    const payload = res.data?.data ?? res.data;
    return payload; // { upload_url, final_url, expires_in, s3_key }
};

// ─────────────────────────────────────────────────────────────
// S3 PUT helper — XHR for progress tracking, never hits backend
// ─────────────────────────────────────────────────────────────
const putToS3 = (uploadUrl, file, mimeType, onProgress) =>
    new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`S3 upload failed (${xhr.status})`));
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", mimeType || "application/octet-stream");
        xhr.send(file);
    });

// ─────────────────────────────────────────────────────────────
// File-type icon helper
// ─────────────────────────────────────────────────────────────
const FileIcon = ({ mimeType, className, size = 20 }) => {
    if (!mimeType) return <FiFile className={className} size={size} />;
    if (mimeType.startsWith("image/")) return <FiImage className={className} size={size} />;
    if (mimeType === "application/pdf") return <FiFileText className={className} size={size} />;
    return <FiFile className={className} size={size} />;
};

// ─────────────────────────────────────────────────────────────
// Derive a human-readable filename from a CDN URL or File object
// ─────────────────────────────────────────────────────────────
const getDisplayName = (source) => {
    if (!source) return "Attachment";
    if (source instanceof File) return source.name;
    if (typeof source === "string") {
        try {
            return decodeURIComponent(source.split("/").pop().split("?")[0]) || "Attachment";
        } catch {
            return "Attachment";
        }
    }
    return "Attachment";
};

// ─────────────────────────────────────────────────────────────
// PRESIGN EXPIRY: 300 s but we re-request after 290 s to be safe
// ─────────────────────────────────────────────────────────────
const PRESIGN_TTL_MS = 290_000;

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
/**
 * AttachmentUploader
 *
 * @param {string}   context     - presign context ("sales-quote", "purchase-order", etc.)
 * @param {string|null} existingUrl - current attachment CDN URL stored in formData
 * @param {function} onUploaded  - called with (finalUrl: string|null) on success or remove
 * @param {boolean}  disabled    - set true for view-only modes
 */
const AttachmentUploader = ({ context, existingUrl, onUploaded, disabled = false }) => {
    // ── state ─────────────────────────────────────────────────
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState(existingUrl || null);

    // Ref holding the cached presign response + when it was fetched
    const presignCacheRef = useRef({ data: null, fetchedAt: null });
    const fileInputRef = useRef(null);

    // Keep uploadedUrl in sync when parent re-mounts / resets the form
    React.useEffect(() => {
        setUploadedUrl(existingUrl || null);
    }, [existingUrl]);

    // ── presign fetch (with expiry guard) ─────────────────────
    const getPresign = useCallback(async (file) => {
        const { data, fetchedAt } = presignCacheRef.current;
        const elapsed = fetchedAt ? Date.now() - fetchedAt : Infinity;

        if (data && elapsed < PRESIGN_TTL_MS) {
            return data;
        }

        const fresh = await fetchPresign({
            context,
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            existing_url: uploadedUrl,
        });

        presignCacheRef.current = { data: fresh, fetchedAt: Date.now() };
        return fresh;
    }, [context, uploadedUrl]);

    // ── core upload flow ──────────────────────────────────────
    const handleFile = useCallback(async (file) => {
        if (!file || disabled) return;

        setError(null);
        setIsUploading(true);
        setProgress(0);

        try {
            // 1. Presign (re-request if near expiry)
            const presign = await getPresign(file);

            // 2. PUT to S3 with progress
            await putToS3(presign.upload_url, file, file.type, (pct) => {
                setProgress(pct);
                // If the PUT is still in progress after 290 s, the presign cache
                // will have been invalidated and getPresign will re-fetch next time.
            });

            // 3. Notify parent with the permanent CDN URL
            setUploadedUrl(presign.final_url);
            onUploaded(presign.final_url);
            setProgress(100);

            // Invalidate cache after successful use so next upload starts fresh
            presignCacheRef.current = { data: null, fetchedAt: null };
        } catch (err) {
            console.error("[AttachmentUploader] upload failed:", err);
            setError(err.message || "Upload failed. Please try again.");
            // Preserve the previously saved URL on error
            setUploadedUrl(existingUrl || null);
            presignCacheRef.current = { data: null, fetchedAt: null };
        } finally {
            setIsUploading(false);
        }
    }, [disabled, getPresign, existingUrl, onUploaded]);

    // ── remove ────────────────────────────────────────────────
    const handleRemove = useCallback(() => {
        setUploadedUrl(null);
        setError(null);
        setProgress(0);
        presignCacheRef.current = { data: null, fetchedAt: null };
        if (fileInputRef.current) fileInputRef.current.value = "";
        onUploaded(null);
    }, [onUploaded]);

    // ── drag-and-drop handlers ────────────────────────────────
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    // ── derived display state ─────────────────────────────────
    const displayName = getDisplayName(uploadedUrl);
    const isImage = uploadedUrl && typeof uploadedUrl === "string" && /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(uploadedUrl);
    const isPDF = uploadedUrl && typeof uploadedUrl === "string" && /\.pdf(\?|$)/i.test(uploadedUrl);

    // ── render: currently-attached file view ──────────────────
    if (uploadedUrl && !isUploading) {
        return (
            <div className="w-full space-y-3">
                {/* Attachment card */}
                <div className="relative flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white border border-gray-200 rounded-xl shadow-sm group overflow-hidden">
                    {/* Accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFCA00] rounded-l-xl" />

                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FFCA00]/10 border border-[#FFCA00]/20 flex items-center justify-center mt-0.5">
                        {isImage ? (
                            <FiImage size={18} className="text-[#FFCA00]" />
                        ) : isPDF ? (
                            <FiFileText size={18} className="text-red-500" />
                        ) : (
                            <FiPaperclip size={18} className="text-[#FFCA00]" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 truncate leading-5">{displayName}</p>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                            {isImage ? "Image" : isPDF ? "PDF Document" : "Attachment"} · Stored
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <a
                            href={uploadedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#279C6F] hover:text-[#1e7a56] transition-colors"
                            title="Open attachment"
                        >
                            <FiEye size={14} />
                            <span className="hidden sm:inline">Preview</span>
                        </a>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                title="Remove attachment"
                                className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                                <FiX size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Inline image preview (optional) */}
                {isImage && (
                    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm max-h-48">
                        <img
                            src={uploadedUrl}
                            alt={displayName}
                            className="w-full h-full object-contain max-h-48 bg-gray-50"
                        />
                    </div>
                )}

                {/* Replace button */}
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[12px] font-semibold text-gray-400 hover:text-[#FFCA00] transition-colors flex items-center gap-1"
                    >
                        <FiUploadCloud size={13} />
                        Replace attachment
                    </button>
                )}

                {/* Hidden input for replace */}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleInputChange}
                    disabled={disabled}
                />
            </div>
        );
    }

    // ── render: upload in progress ────────────────────────────
    if (isUploading) {
        return (
            <div className="w-full">
                <div className="px-5 py-5 border border-[#FFCA00]/30 rounded-xl bg-amber-50/40 space-y-3">
                    <div className="flex items-center gap-3">
                        <FiLoader size={18} className="animate-spin text-[#FFCA00] flex-shrink-0" />
                        <p className="text-[13px] font-semibold text-gray-700">
                            Uploading… {progress}%
                        </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#FFCA00] to-[#f59e0b] rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-gray-400">
                        File is being uploaded directly to secure storage. Please wait…
                    </p>
                </div>
            </div>
        );
    }

    // ── render: drop zone (idle or error state) ───────────────
    return (
        <div className="w-full space-y-2">
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
                className={`
                    relative w-full px-6 py-8 border-2 border-dashed rounded-xl
                    flex flex-col items-center justify-center gap-2
                    transition-all duration-200 cursor-pointer select-none
                    ${disabled ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50" : ""}
                    ${isDragging && !disabled
                        ? "border-[#FFCA00] bg-[#FFCA00]/5 scale-[1.01] shadow-md"
                        : !disabled
                            ? "border-gray-200 bg-white hover:border-[#FFCA00]/50 hover:bg-amber-50/20"
                            : ""}
                `}
            >
                {/* Cloud upload icon */}
                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
                    ${isDragging ? "bg-[#FFCA00]/15 scale-110" : "bg-gray-50"}
                `}>
                    <FiUploadCloud
                        size={24}
                        className={`transition-colors duration-200 ${isDragging ? "text-[#FFCA00]" : "text-gray-300"}`}
                    />
                </div>

                <div className="text-center">
                    <p className="text-[13px] font-semibold text-gray-600">
                        {isDragging ? "Drop to upload" : "Drop a file or"}{" "}
                        {!isDragging && (
                            <span className="text-[#FFCA00] font-bold underline underline-offset-2">
                                browse
                            </span>
                        )}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                        PDF, images, Word, Excel — up to 25 MB
                    </p>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleInputChange}
                    disabled={disabled}
                />
            </div>

            {/* Inline error message — preserves existing attachment info */}
            {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                    <FiAlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-600 font-medium leading-5">{error}</p>
                </div>
            )}
        </div>
    );
};

export default AttachmentUploader;
