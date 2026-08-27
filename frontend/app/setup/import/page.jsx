"use client";

import React, { useState, useRef, useCallback } from "react";
import Navbar from "@/components/commonComp/Navbar";
import { FiUpload, FiCheck } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import Loader from "@/components/commonComp/Loader";
import CustomSelect from "@/components/common/CustomSelect";
import { tokenRequest } from "@/lib/axiosCreate";

// All entity options from the API (matching the image)
const dataTypeOptions = [
    { value: "customer", label: "Customer" },
    { value: "supplier", label: "Supplier" },
    { value: "customised_products", label: "Customised Products" },
    { value: "raw_materials", label: "Raw Materials" },
    { value: "sales_invoice", label: "Sales Invoice" },
    { value: "sales_quote", label: "Sales Quote" },
    { value: "time", label: "Time" },
    { value: "mileage", label: "Mileage" },
    { value: "purchase_invoice", label: "Purchase Invoice" },
    { value: "purchase_order", label: "Purchase Order" },
    { value: "sales_payment", label: "Sales Payment" },
    { value: "purchase_payment", label: "Purchase Payment" },
];

// Parse CSV file and return headers + first few rows
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
                if (lines.length === 0) return resolve({ headers: [], rows: [] });

                // Detect delimiter: comma vs semicolon vs tab
                const firstLine = lines[0];
                const delimiter = firstLine.includes(",") ? "," : firstLine.includes(";") ? ";" : "\t";

                const parseRow = (line) => {
                    const result = [];
                    let current = "";
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (ch === '"') {
                            inQuotes = !inQuotes;
                        } else if (ch === delimiter && !inQuotes) {
                            result.push(current.trim());
                            current = "";
                        } else {
                            current += ch;
                        }
                    }
                    result.push(current.trim());
                    return result;
                };

                const headers = parseRow(lines[0]);
                const rows = lines.slice(1, 4).map(parseRow); // up to 3 data rows
                resolve({ headers, rows });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

export default function ImportWizardPage() {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef(null);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    // Step state
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1 state
    const [selectedDataType, setSelectedDataType] = useState("");
    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [fieldsData, setFieldsData] = useState(null); // API response .data
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Step 2 state
    const [csvHeaders, setCsvHeaders] = useState([]); // column headers from CSV
    const [csvRows, setCsvRows] = useState([]); // first few data rows from CSV
    const [mappings, setMappings] = useState([]); // [{ field, required, csvColumn }]
    const [isSaving, setIsSaving] = useState(false);

    const navbarData = {
        heading: "Import Wizard",
        subheading: "Bulk upload data to quickly set up your books",
        from: "setup",
    };

    // ─── Fetch fields when data type changes ─────────────────────────────────
    const fetchFields = useCallback(async (entity) => {
        if (!entity) return;
        setFieldsLoading(true);
        setFieldsData(null);
        try {
            const res = await tokenRequest.get(
                `custom-api/admin/import/fields?entity=${entity}`
            );
            const data = res.data?.data;
            if (data) {
                setFieldsData(data);
            } else {
                dispatch(showToast({ type: "error", message: "Failed to load fields for selected type." }));
            }
        } catch (err) {
            console.error("Fields API error:", err);
        } finally {
            setFieldsLoading(false);
        }
    }, [dispatch]);

    const handleDataTypeChange = (val) => {
        setSelectedDataType(val);
        fetchFields(val);
    };

    // ─── File Upload Helpers ──────────────────────────────────────────────────
    const processFile = async (file) => {
        if (!file) return;
        // Validate type
        const validTypes = [".csv", ".xlsx", ".xls"];
        const ext = "." + file.name.split(".").pop().toLowerCase();
        if (!validTypes.includes(ext)) {
            dispatch(showToast({ type: "error", message: "Only CSV, XLSX, or XLS files are supported." }));
            return;
        }
        setUploadedFile(file);
        dispatch(showToast({ type: "success", message: `File "${file.name}" uploaded successfully!` }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        processFile(file);
    };

    // ─── Continue to Step 2 ───────────────────────────────────────────────────
    const handleContinue = async () => {
        if (!selectedDataType) {
            dispatch(showToast({ type: "error", message: "Please select a data type first!" }));
            return;
        }
        if (!uploadedFile) {
            dispatch(showToast({ type: "error", message: "Please upload a CSV file first!" }));
            return;
        }
        if (!fieldsData) {
            dispatch(showToast({ type: "error", message: "Fields are still loading. Please wait." }));
            return;
        }

        // Parse CSV to get headers + rows
        try {
            const { headers, rows } = await parseCSV(uploadedFile);
            setCsvHeaders(headers);
            setCsvRows(rows);

            // Build initial mapping from sampleMapping (auto-map where possible)
            const sample = fieldsData.sampleMapping || {};
            const initialMappings = fieldsData.fields.map((field) => {
                // Try to auto-match: find CSV header whose label matches values in sampleMapping
                const sampleLabel = sample[field]; // e.g. "Customer Name"
                const autoMatch = headers.find(
                    (h) => h.toLowerCase() === (sampleLabel || "").toLowerCase() || h.toLowerCase() === field.toLowerCase()
                );
                return {
                    field,
                    required: fieldsData.requiredFields?.includes(field) ?? false,
                    csvColumn: autoMatch || "",
                };
            });
            setMappings(initialMappings);
            setCurrentStep(2);
        } catch (err) {
            console.error("CSV parse error:", err);
            dispatch(showToast({ type: "error", message: "Failed to parse CSV file." }));
        }
    };

    // ─── Mapping change handler ───────────────────────────────────────────────
    const handleMappingChange = (index, value) => {
        setMappings((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], csvColumn: value };
            return next;
        });
    };

    // Get example data for a mapping row (look up the csvColumn header in csvRows)
    const getExampleData = (csvColumn) => {
        if (!csvColumn || csvRows.length === 0) return "";
        const colIdx = csvHeaders.indexOf(csvColumn);
        if (colIdx === -1) return "";
        return csvRows
            .slice(0, 2)
            .map((row) => row[colIdx] ?? "")
            .filter(Boolean)
            .join(", ");
    };

    // ─── Save / Import ────────────────────────────────────────────────────────
    const handleSave = async () => {
        // Validate required fields are mapped
        const missingRequired = mappings.filter((m) => m.required && !m.csvColumn);
        if (missingRequired.length > 0) {
            dispatch(
                showToast({
                    type: "error",
                    message: `Required fields not mapped: ${missingRequired.map((m) => m.field.replace(/_/g, " ")).join(", ")}`,
                })
            );
            return;
        }

        // Build mapping object: { fieldName: csvColumnHeader }
        const mappingObj = {};
        mappings.forEach((m) => {
            if (m.csvColumn) {
                mappingObj[m.field] = m.csvColumn;
            }
        });

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append("entity", selectedDataType);
            formData.append("mapping", JSON.stringify(mappingObj));
            formData.append("files", uploadedFile);

            const res = await tokenRequest.post(
                "custom-api/admin/import/import",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            const innerData = res.data?.data;
            if (res.data?.success && innerData?.success) {
                const inserted = innerData.inserted ?? innerData.dbResult?.inserted ?? 0;
                const entity = innerData.entity || selectedDataType;
                const collection = innerData.collection || entity;
                const message = `✓ Successfully imported ${inserted} record${inserted !== 1 ? "s" : ""} into ${collection} (${entity}).`;
                dispatch(showToast({ type: "success", message }));
                // Reset
                setCurrentStep(1);
                setSelectedDataType("");
                setFieldsData(null);
                setUploadedFile(null);
                setCsvHeaders([]);
                setCsvRows([]);
                setMappings([]);
            } else {
                const errMsg =
                    innerData?.message ||
                    innerData?.error?.[0]?.message ||
                    res.data?.message ||
                    "Import failed. Please check your file and mappings.";
                dispatch(showToast({ type: "error", message: errMsg }));
            }
        } catch (err) {
            console.error("Import API error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    // ─── CSV column options for dropdowns ─────────────────────────────────────
    const csvColumnOptions = [
        { value: "", label: "— Skip —" },
        ...csvHeaders.map((h) => ({ value: h, label: h })),
    ];

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Import Wizard..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-8">
                    <div className="w-full flex-1 flex flex-col">
                        {/* ── Step Indicators ── */}
                        <div className="flex flex-col sm:flex-row items-start bg-white px-4 sm:px-6 py-4 rounded-lg gap-6 sm:gap-8 mb-8">
                            {/* Step 1 */}
                            <div className="flex items-start gap-4 flex-1 w-full">
                                <div
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-[16px] sm:text-[18px] flex-shrink-0 ${
                                        currentStep === 1 ? "bg-[#FFCA00]" : "bg-green-500"
                                    }`}
                                >
                                    {currentStep > 1 ? <FiCheck size={24} /> : "1"}
                                </div>
                                <div>
                                    <h3 className="text-[14px] sm:text-[16px] font-bold text-gray-900 mb-1">
                                        Choose Data Type &amp; Upload
                                    </h3>
                                    <p className="text-[12px] sm:text-[14px] text-gray-500">
                                        Module &amp; CSV/XLSX file upload
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex items-start gap-4 flex-1 w-full border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-8">
                                <div
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-[16px] sm:text-[18px] flex-shrink-0 ${
                                        currentStep === 2
                                            ? "bg-[#FFCA00] text-white"
                                            : "bg-gray-200 text-gray-500"
                                    }`}
                                >
                                    2
                                </div>
                                <div>
                                    <h3
                                        className={`text-[14px] sm:text-[16px] font-bold mb-1 ${
                                            currentStep === 2 ? "text-gray-900" : "text-gray-400"
                                        }`}
                                    >
                                        Map Your Fields
                                    </h3>
                                    <p
                                        className={`text-[12px] sm:text-[14px] ${
                                            currentStep === 2 ? "text-gray-500" : "text-gray-400"
                                        }`}
                                    >
                                        Map columns from your file
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Step 1: Choose Data Type & Upload File ── */}
                        {currentStep === 1 && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
                                {/* Choose Data Type */}
                                <div className="mb-8">
                                    <label className="block text-[14px] font-medium text-gray-700 mb-3">
                                        Choose Data type
                                    </label>
                                    <div className="w-full sm:max-w-xs">
                                        <CustomSelect
                                            value={selectedDataType}
                                            onChange={handleDataTypeChange}
                                            options={dataTypeOptions}
                                            placeholder="Select data type..."
                                        />
                                    </div>
                                    {/* Fields loading indicator */}
                                    {fieldsLoading && (
                                        <p className="mt-2 text-[12px] text-gray-400">
                                            Loading fields...
                                        </p>
                                    )}
                                    {fieldsData && !fieldsLoading && (
                                        <p className="mt-2 text-[12px] text-gray-600 font-medium">
                                             {fieldsData.description} — {fieldsData.count} fields loaded
                                        </p>
                                    )}
                                </div>

                                {/* Upload Area */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-lg p-10 sm:p-20 text-center transition-colors cursor-pointer bg-white ${
                                        isDragging
                                            ? "border-[#FFCA00] bg-yellow-50"
                                            : "border-gray-300 hover:border-[#FFCA00]"
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        id="file-upload"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-3">
                                            <FiUpload
                                                size={40}
                                                className={`sm:size-[48px] ${isDragging ? "text-[#FFCA00]" : "text-[#FFCA00]"}`}
                                            />
                                            <h3 className="text-[15px] sm:text-[16px] font-semibold text-gray-900">
                                                Upload CSV
                                            </h3>
                                            <p className="text-[13px] sm:text-[14px] text-gray-600">
                                                Drop your CSV file here
                                            </p>
                                            <p className="text-[12px] sm:text-[13px] text-[#FFCA00]">
                                                or click to browse
                                            </p>
                                            {uploadedFile && (
                                                <div className="mt-4 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-[13px] sm:text-[14px] font-medium">
                                                    ✓ {uploadedFile.name}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                {/* Continue Button */}
                                <div className="flex flex-col sm:flex-row justify-end mt-8">
                                    <button
                                        onClick={handleContinue}
                                        disabled={fieldsLoading}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold hover:bg-[#d9ac00] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {fieldsLoading ? "Loading Fields..." : "Continue to Map Fields"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Map Your Fields ── */}
                        {currentStep === 2 && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {/* Info banner */}
                             

                                <div className="overflow-x-auto">
                                    <div className="min-w-[700px] lg:min-w-0">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-700 whitespace-nowrap">
                                                        Billing Field
                                                    </th>
                                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-700 whitespace-nowrap">
                                                        CSV Column
                                                    </th>
                                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-700 whitespace-nowrap">
                                                        CSV Example Data
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {mappings.map((mapping, index) => (
                                                    <tr
                                                        key={mapping.field}
                                                        className="hover:bg-gray-50 transition-colors"
                                                    >
                                                        {/* Billing Field */}
                                                        <td className="px-6 py-4 text-[14px] text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                              
                                                                <span>
                                                                    {mapping.field.replace(/_/g, " ")}
                                                                    {mapping.required && (
                                                                        <span className="ml-1 text-red-500 text-[11px]">
                                                                            (required)
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* CSV Column Dropdown */}
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="min-w-[180px]">
                                                                <CustomSelect
                                                                    value={mapping.csvColumn}
                                                                    onChange={(val) =>
                                                                        handleMappingChange(index, val)
                                                                    }
                                                                    options={csvColumnOptions}
                                                                    placeholder="Select CSV column..."
                                                                    menuPlacement="top"
                                                                />
                                                            </div>
                                                        </td>

                                                        {/* CSV Example Data */}
                                                        <td className="px-6 py-4 text-[14px] text-gray-600 whitespace-nowrap">
                                                            {getExampleData(mapping.csvColumn) || (
                                                                <span className="text-gray-300 italic">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium hover:bg-[#d9ac00] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? "Importing..." : "Save & Import"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            )}
        </div>
    );
}   