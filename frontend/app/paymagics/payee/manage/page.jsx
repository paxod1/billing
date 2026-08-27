"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { authRequest } from "@/lib/axiosCreate";
import { showToast } from "@/lib/features/toast/toastSlice";

// React Icons
import {
    IoSearchOutline,
} from "react-icons/io5";
import {
    FiFilter,
    FiDownload,
    FiPlus,
    FiMoreVertical,
    FiEdit2,
    FiTrash2,
    FiX,
    FiUser,
    FiMail,
    FiPhone,
    FiCheck,
    FiMapPin,
    FiBriefcase,
    FiRefreshCw,
    FiLoader
} from "react-icons/fi";

// ----------------------------------------------------------------------
// Constants & Data
// ----------------------------------------------------------------------
const beneficiaryTypes = ["Individual", "Business", "Government", "Non-Profit"];
const bankAccountTypes = ["Savings", "Current", "Fixed Deposit", "Recurring Deposit"];
const payeeTypes = ["DOMESTIC", "INTERNATIONAL"];

// Country codes with flags (kept simple for this text-based select)
const countryCodes = [
    { code: "+1", country: "US", name: "United States" },
    { code: "+44", country: "GB", name: "United Kingdom" },
    { code: "+91", country: "IN", name: "India" },
    { code: "+61", country: "AU", name: "Australia" },
    { code: "+65", country: "SG", name: "Singapore" },
    { code: "+60", country: "MY", name: "Malaysia" },
    { code: "+971", country: "AE", name: "UAE" },
    { code: "+966", country: "SA", name: "Saudi Arabia" },
    { code: "+974", country: "QA", name: "Qatar" },
    { code: "+973", country: "BH", name: "Bahrain" },
    { code: "+968", country: "OM", name: "Oman" },
    { code: "+965", country: "KW", name: "Kuwait" },
];

// Validation Patterns
const swiftRegex = /^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
const accountNumberRegex = /^[0-9]{9,18}$/;
const sortCodeRegex = /^[0-9]{6}$/;
const phoneRegex = /^[0-9]{7,15}$/;

// Dynamic Schema
const createPayeeSchema = (payeeType, isEditMode = false) => {
    if (isEditMode) {
        const baseEditSchema = z.object({
            ben_code: z.string().optional(),
            ben_name: z.string().min(1, "Beneficiary name is required").optional(),
            add1: z.string().min(1, "Address 1 is required").optional(),
            add2: z.string().optional().or(z.literal("")),
            city: z.string().min(1, "City is required").optional(),
            state: z.string().min(1, "State is required").optional(),
            zipcode: z.string().min(1, "Zipcode is required").optional(),
            country_code: z.string().min(1, "Country code is required").optional(),
            contact: z.string().min(1, "Contact is required").optional(),
            email: z.string().email("Enter a valid email").optional().or(z.literal("")),
            payee_type: z.enum(payeeTypes, { errorMap: () => ({ message: "Payee type is required" }) }).optional(),
            acc_no: z.string().optional(),
            bank_name: z.string().optional(),
            branch: z.string().optional(),
            bank_account_type: z.enum(bankAccountTypes, { errorMap: () => ({ message: "Bank account type is required" }), }).optional(),
            categories: z.array(z.string()).optional(),
            ifsc: z.string().optional(),
            swift_code: z.string().optional().refine((val) => !val || swiftRegex.test(val), { message: "SWIFT Code must be 8 or 11 alphanumeric characters" }).optional(),
            sort_code: z.string().optional().refine((val) => !val || sortCodeRegex.test(val), { message: "Sort Code must be 6 digits" }).optional(),
        });

        if (payeeType === "DOMESTIC") {
            return baseEditSchema.extend({
                acc_no: z.string().optional().refine((val) => !val || accountNumberRegex.test(val), { message: "Account number must be 9-18 digits" }),
                ifsc: z.string().optional().refine((val) => !val || ifscRegex.test(val), { message: "IFSC code must be 11 characters in format: ABCD0123456" }),
            });
        } else {
            return baseEditSchema.extend({
                acc_no: z.string().optional().refine((val) => !val || ibanRegex.test(val), { message: "IBAN must be in valid format" }),
                ifsc: z.string().optional(),
                swift_code: z.string().optional().refine((val) => !val || swiftRegex.test(val), { message: "SWIFT Code must be 8 or 11 alphanumeric characters" }),
                sort_code: z.string().optional().refine((val) => !val || sortCodeRegex.test(val), { message: "Sort Code must be 6 digits" }),
            });
        }
    }

    // Create Mode Schema
    const baseCreateSchema = z.object({
        ben_code: z.string().min(1, "Beneficiary code is required"),
        ben_name: z.string().min(1, "Beneficiary name is required"),
        add1: z.string().min(1, "Address 1 is required"),
        add2: z.string().optional().or(z.literal("")),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
        zipcode: z.string().min(1, "Zipcode is required"),
        country_code: z.string().min(1, "Country code is required"),
        contact: z.string().min(1, "Contact is required").regex(phoneRegex, "Phone number must be 7-15 digits"),
        email: z.string().email("Enter a valid email"),
        payee_type: z.enum(payeeTypes, { errorMap: () => ({ message: "Payee type is required" }) }),
        acc_no: z.string().min(1, payeeType === "INTERNATIONAL" ? "IBAN is required" : "Account number is required"),
        bank_name: z.string().min(1, "Bank name is required"),
        branch: z.string().min(1, "Branch is required"),
        bank_account_type: z.enum(bankAccountTypes, { errorMap: () => ({ message: "Bank account type is required" }), }),
        categories: z.array(z.string()).min(1, "At least one payee list is required"),
    });

    if (payeeType === "DOMESTIC") {
        return baseCreateSchema.extend({
            acc_no: z.string().min(1, "Account number is required").regex(accountNumberRegex, "Account number must be 9-18 digits"),
            ifsc: z.string().min(1, "IFSC Code is required").regex(ifscRegex, "IFSC code must be 11 characters (ABCD0123456)"),
        });
    } else {
        return baseCreateSchema.extend({
            acc_no: z.string().min(1, "IBAN is required").regex(ibanRegex, "IBAN must be in valid format"),
            ifsc: z.string().optional(),
            swift_code: z.string().min(1, "SWIFT Code is required").regex(swiftRegex, "SWIFT Code must be 8 or 11 alphanumeric"),
            sort_code: z.string().min(1, "Sort Code is required").regex(sortCodeRegex, "Sort Code must be 6 digits"),
        });
    }
};

const defaultCategories = [];

// ----------------------------------------------------------------------
// UI Components (Styled like Payor Form)
// ----------------------------------------------------------------------

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-3xl" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} max-h-[95vh] overflow-y-auto transform transition-all scale-100 animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 md:p-8 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};

const InputField = React.forwardRef(({ label, error, icon: Icon, required = false, ...props }, ref) => (
    <div className="w-full">
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input
                ref={ref}
                {...props}
                className={`w-full px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors
            ${error ? "border-red-500" : "border-gray-300"} ${Icon ? "pl-10" : ""}`}
            />
            {Icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icon size={14} />
                </div>
            )}
        </div>
        {error && (
            <p className="text-xs text-red-500 mt-1">{error.message || error}</p>
        )}
    </div>
));
InputField.displayName = "InputField";

const SelectField = React.forwardRef(({ label, error, options, placeholder = "Select...", required, ...props }, ref) => (
    <div className="w-full">
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <CustomSelect
                ref={ref}
                options={options}
                placeholder={placeholder}
                {...props}
            />
        </div>
        {error && (
            <p className="text-xs text-red-500 mt-1">{error.message || error}</p>
        )}
    </div>
));
SelectField.displayName = "SelectField";



// ----------------------------------------------------------------------
// Form Component
// ----------------------------------------------------------------------
const PayeeForm = ({
    initialData,
    onSubmit,
    isLoading,
    isEdit = false,
    onClose,
    categories = []
}) => {
    const dispatch = useDispatch();
    const [currentPayeeType, setCurrentPayeeType] = useState(isEdit && initialData?.payee_type ? initialData.payee_type.toUpperCase() : "DOMESTIC");
    const [hasPayeeTypeChanged, setHasPayeeTypeChanged] = useState(false);

    // Setup RHF with Zod
    const payeeSchema = useMemo(() => createPayeeSchema(currentPayeeType, isEdit), [currentPayeeType, isEdit]);
    const defaultValues = {
        ben_code: "",
        ben_name: "",
        add1: "",
        add2: "",
        city: "",
        state: "",
        zipcode: "",
        country_code: "+91",
        contact: "",
        email: "",
        payee_type: "DOMESTIC",
        acc_no: "",
        ifsc: "",
        swift_code: "",
        sort_code: "",
        bank_name: "",
        branch: "",
        bank_account_type: "",
        categories: [],
    };

    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        clearErrors,
        trigger,
        formState: { errors, placeholder },
    } = useForm({
        resolver: zodResolver(payeeSchema),
        defaultValues
    });

    const watchedPayeeType = watch("payee_type");
    const isInternational = currentPayeeType === "INTERNATIONAL";

    // -- Generators & Helpers --
    const generateBeneficiaryCode = () => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let code = 'BEN';
        for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
        for (let i = 0; i < 4; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
        for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
        return code;
    };

    const extractContactAndCountryCode = (contactValue) => {
        if (!contactValue) return { countryCode: "+91", phoneNumber: "" };
        const countryCodePattern = /^(\+\d{1,4})(\d+)$/;
        const match = contactValue.match(countryCodePattern);
        if (match) return { countryCode: match[1], phoneNumber: match[2] };
        if (/^\d+$/.test(contactValue)) return { countryCode: "+91", phoneNumber: contactValue };
        return { countryCode: "+91", phoneNumber: contactValue };
    };

    // -- Effects --

    // Auto-generate code on create
    useEffect(() => {
        if (!isEdit && !initialData) {
            const newCode = generateBeneficiaryCode();
            setValue("ben_code", newCode);
        }
    }, [isEdit, initialData, setValue]);

    // Handle Payee Type Changes
    useEffect(() => {
        if (watchedPayeeType && watchedPayeeType !== currentPayeeType) {
            setCurrentPayeeType(watchedPayeeType);
            if (isEdit && initialData) {
                const originalType = initialData.payee_type ? initialData.payee_type.toUpperCase() : "DOMESTIC";
                setHasPayeeTypeChanged(watchedPayeeType !== originalType);
            }
            // Clear specific fields when switching
            if (watchedPayeeType === "INTERNATIONAL") {
                setValue("ifsc", "");
            } else {
                setValue("swift_code", "");
                setValue("sort_code", "");
            }
        }
    }, [watchedPayeeType, currentPayeeType, isEdit, initialData, setValue]);

    // Pre-fill Data for Edit
    useEffect(() => {
        if (isEdit && initialData) {
            const d = initialData;
            setValue("ben_code", d.ben_code);
            setValue("ben_name", d.ben_name);
            setValue("add1", d.add1);
            setValue("add2", d.add2);
            setValue("city", d.city);
            setValue("state", d.state);
            setValue("zipcode", d.zipcode);
            setValue("email", d.email);

            // Contact
            const { countryCode, phoneNumber } = extractContactAndCountryCode(d.contact);
            setValue("country_code", countryCode);
            setValue("contact", phoneNumber);

            // Type
            const pType = d.payee_type ? d.payee_type.toUpperCase() : "DOMESTIC";
            setValue("payee_type", pType);
            setCurrentPayeeType(pType);

            // Bank
            if (pType === "INTERNATIONAL") {
                setValue("acc_no", d.iban || d.acc_no || "");
                setValue("swift_code", d.swift_code || "");
                setValue("sort_code", d.sort_code || "");
            } else {
                setValue("acc_no", d.acc_no || "");
                setValue("ifsc", d.ifsc || "");
            }
            setValue("bank_name", d.bank_name || "");
            setValue("branch", d.branch || "");
            setValue("bank_account_type", d.bank_account_type || "");

            // Categories
            if (d.categories && Array.isArray(d.categories)) {
                const catIds = d.categories.map(c => typeof c === 'object' ? c.id.toString() : c.toString());
                setValue("categories", catIds);
            }
        }
    }, [isEdit, initialData, setValue]);

    // -- Submission Handler --
    const onFormSubmit = (data) => {
        // Format payload
        const apiPayeeType = data.payee_type.toUpperCase();
        const fullContact = data.country_code + data.contact;

        // Ensure categories is always an array of integers and include it
        const formattedCategories = (data.categories && Array.isArray(data.categories))
            ? data.categories.map(id => parseInt(id)).filter(id => !isNaN(id))
            : [];

        const cleanData = {
            ...data,
            payee_type: apiPayeeType,
            contact: fullContact,
            category_id: formattedCategories, // User requested "category id"
            // Handle conditional bank fields logic
            ifsc: apiPayeeType === "DOMESTIC" ? data.ifsc : undefined,
            swift_code: apiPayeeType === "INTERNATIONAL" ? data.swift_code : undefined,
            sort_code: apiPayeeType === "INTERNATIONAL" ? data.sort_code : undefined,
            iban: (apiPayeeType === "INTERNATIONAL" && data.acc_no) ? data.acc_no : undefined,
            acc_no: data.acc_no
        };
        // Remove the form-specific 'categories' key from payload to prevent duplication/confusion
        delete cleanData.categories;

        // If international, ensure IBAN logic matches expectation
        if (apiPayeeType === "INTERNATIONAL") {
            cleanData.iban = data.acc_no;
        }

        console.log("Submitting Payee Data:", cleanData);
        onSubmit(cleanData);
    };

    const regenerateBeneficiaryCode = () => {
        if (!isEdit) {
            const code = generateBeneficiaryCode();
            setValue("ben_code", code);
            clearErrors("ben_code");
        }
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <FiUser className="text-[#FFCA00]" />
                    <h3 className="text-sm font-semibold text-gray-800">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="w-full">
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                            Beneficiary Code {!isEdit && <span className="text-green-600">(Auto)</span>}
                        </label>
                        <div className="flex gap-2">
                            <input
                                {...register("ben_code")}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 focus:outline-none text-gray-500 cursor-not-allowed font-mono uppercase"
                            />
                            {!isEdit && (
                                <button
                                    type="button"
                                    onClick={regenerateBeneficiaryCode}
                                    className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                                    title="Generate New Code"
                                >
                                    <FiRefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <InputField label="Beneficiary Name" required error={errors.ben_name} {...register("ben_name")} placeholder="Enter Name" />
                </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <FiMapPin className="text-[#FFCA00]" />
                    <h3 className="text-sm font-semibold text-gray-800">Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Address 1" required error={errors.add1} {...register("add1")} placeholder="Street Address" />
                    <InputField label="Address 2" error={errors.add2} {...register("add2")} placeholder="Apt, Suite, etc." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="City" required error={errors.city} {...register("city")} placeholder="City" />
                    <InputField label="State" required error={errors.state} {...register("state")} placeholder="State" />
                    <InputField label="Zipcode" required error={errors.zipcode} {...register("zipcode")} placeholder="Zipcode" />
                </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <FiPhone className="text-[#FFCA00]" />
                    <h3 className="text-sm font-semibold text-gray-800">Contact</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Contact {(!isEdit) && <span className="text-red-500">*</span>}</label>
                        <div className="flex gap-2">
                            <div className="w-32">
                                <Controller
                                    control={control}
                                    name="country_code"
                                    render={({ field }) => (
                                        <SelectField
                                            {...field}
                                            options={countryCodes.map(c => ({ value: c.code, label: `${c.code} (${c.country})` }))}
                                        />
                                    )}
                                />
                            </div>
                            <div className="flex-1">
                                <InputField
                                    error={errors.contact}
                                    {...register("contact")}
                                    placeholder="Phone Number"
                                />
                            </div>
                        </div>
                    </div>
                    <InputField label="Email" required error={errors.email} {...register("email")} placeholder="Email Address" icon={FiMail} />
                </div>
            </div>

            {/* Type & Bank */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <FiBriefcase className="text-[#FFCA00]" />
                    <h3 className="text-sm font-semibold text-gray-800">Bank Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                        control={control}
                        name="payee_type"
                        render={({ field }) => (
                            <SelectField
                                label="Payee Type"
                                required
                                error={errors.payee_type}
                                {...field}
                                options={payeeTypes.map(t => ({ value: t, label: t }))}
                            />
                        )}
                    />

                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Payee Lists {(!isEdit) && <span className="text-red-500">*</span>}</label>
                        <Controller
                            control={control}
                            name="categories"
                            render={({ field }) => (
                                <CustomSelect
                                    {...field}
                                    options={categories.map(c => ({ value: c.id.toString(), label: c.name }))}
                                    isMulti
                                    placeholder="Select lists..."
                                    error={errors.categories}
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label={isInternational ? "IBAN" : "Account Number"}
                        required
                        error={errors.acc_no}
                        {...register("acc_no")}
                        placeholder={isInternational ? "Enter IBAN" : "Enter Account No"}
                    />

                    {!isInternational && (
                        <InputField
                            label="IFSC Code"
                            required
                            error={errors.ifsc}
                            {...register("ifsc")}
                            placeholder="Enter IFSC"
                            className="uppercase"
                        />
                    )}

                    {isInternational && (
                        <>
                            <InputField
                                label="SWIFT Code"
                                required
                                error={errors.swift_code}
                                {...register("swift_code")}
                                placeholder="Enter SWIFT"
                                className="uppercase"
                            />
                            <InputField
                                label="Sort Code"
                                required
                                error={errors.sort_code}
                                {...register("sort_code")}
                                placeholder="Enter Sort Code"
                            />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="Bank Name" required error={errors.bank_name} {...register("bank_name")} placeholder="Bank Name" />
                    <InputField label="Branch" required error={errors.branch} {...register("branch")} placeholder="Branch" />
                    <Controller
                        control={control}
                        name="bank_account_type"
                        render={({ field }) => (
                            <SelectField
                                label="Account Type"
                                required
                                error={errors.bank_account_type}
                                {...field}
                                options={bankAccountTypes.map(t => ({ value: t, label: t }))}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-yellow-400 text-white text-sm font-medium rounded hover:bg-yellow-500 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">

                            <span>Submitting...</span>
                        </div>
                    ) : isEdit ? (
                        "Update Payee"
                    ) : (
                        "Create Payee"
                    )}
                </button>
            </div>
        </form>
    );
};


// ----------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------
export default function ManagePayeePage() {
    const dispatch = useDispatch();
    const [payees, setPayees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [pagination, setPagination] = useState({
        next: null,
        previous: null,
        count: 0,
        currentUrl: "/api/payor/payee-list/"
    });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPayee, setSelectedPayee] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    // Action Menu
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // Auto-correct pagination when current page is empty
    useEffect(() => {
        if (!loading && payees.length === 0 && currentPage > 1) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            const baseUrl = "/api/payor/payee-list/";
            const url = prevPage === 1 ? baseUrl : `${baseUrl}?page=${prevPage}`;
            fetchPayees(url);
        }
    }, [payees, loading, currentPage]);

    useEffect(() => {
        fetchPayees();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await authRequest.get("/api/payor/view_lists/");
            let catData = [];
            if (response.data && response.data.results) catData = response.data.results;
            else if (Array.isArray(response.data)) catData = response.data;

            const processed = catData.map(item => ({
                id: item.id || item.category_id,
                name: item.category || item.name || "Unnamed List"
            }));
            setCategories(processed);
        } catch (e) {
            console.error("Error fetching categories", e);
        }
    };

    const fetchPayees = async (url = pagination.currentUrl) => {
        try {
            setLoading(true);
            const response = await authRequest.get(url);
            const results = response.data.results || response.data || [];
            const count = response.data.count || results.length;
            setPayees(results);
            setPagination({
                next: response.data.next,
                previous: response.data.previous,
                count: count,
                currentUrl: url
            });
        } catch (error) {
            console.error("Fetch Payees Error:", error);
            dispatch(showToast({ message: "Failed to fetch payees", type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) {
            fetchPayees("/api/payor/payee-list/");
            return;
        }
        fetchPayees(`/api/admin/search/payees/?q=${encodeURIComponent(searchQuery)}`);
    };

    const handleCreate = async (data) => {
        try {
            setActionLoading(true);
            await authRequest.post("/api/payor/payee-register/", data);
            dispatch(showToast({ message: "Payee created successfully", type: "success" }));
            setIsAddModalOpen(false);
            fetchPayees();
        } catch (error) {
            console.error("Create Payee Error:", error);
            const msg = error.response?.data?.ben_code?.[0] || "Failed to create payee";
            dispatch(showToast({ message: msg, type: "error" }));
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async (data) => {
        try {
            setActionLoading(true);
            await authRequest.patch(`/api/payor/payee-edit/${selectedPayee.id}/`, data);
            dispatch(showToast({ message: "Payee updated successfully", type: "success" }));
            setIsEditModalOpen(false);
            fetchPayees();
        } catch (error) {
            console.error("Update Payee Error:", error);
            dispatch(showToast({ message: "Failed to update payee", type: "error" }));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setActionLoading(true);
            await authRequest.delete(`/api/payor/delete_payee/${selectedPayee.id}/`);
            dispatch(showToast({ message: "Payee deleted successfully", type: "success" }));
            setIsDeleteModalOpen(false);
            fetchPayees();
        } catch (error) {
            console.error("Delete Payee Error:", error);
            dispatch(showToast({ message: "Failed to delete payee", type: "error" }));
        } finally {
            setActionLoading(false);
        }
    };

    const handleMenuClick = (e, payeeId) => {
        e.stopPropagation();
        if (openMenuId === payeeId) {
            setOpenMenuId(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < 150;

        setMenuPosition({
            top: openUpwards ? (rect.top - 10) : (rect.bottom + 5),
            left: rect.right - 180,
            transformOrigin: openUpwards ? "bottom right" : "top right"
        });
        setOpenMenuId(payeeId);
    };

    const navbarData = {
        heading: "Manage Payees",
        subheading: "Add and manage payee details",
        from: "paymagics"
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
            <Navbar data={navbarData} />

            {loading && !payees.length ? (
                <div className="flex-1 flex items-center justify-center">
                    {/* Reuse standard loader or text */}
                    <div className="flex flex-col items-center">
                        {/* If Loader component requires message prop */}
                        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500 font-medium">Loading Payees...</p>
                    </div>
                </div>
            ) : (
                <main className="flex-1 py-8">
                    <div className="w-full">
                        {/* Search Bar */}
                        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                            <div className="relative w-full md:w-80">
                                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <form onSubmit={handleSearch}>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search payees..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px]"
                                    />
                                </form>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                                <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                                    <button className="px-4 py-2 border border-gray-300 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                                        <FiFilter size={16} /> Filter
                                    </button>
                                    <button className="px-4 py-2 border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 whitespace-nowrap">
                                        <FiDownload size={16} /> Export
                                    </button>
                                </div>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="w-full md:w-auto px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] cursor-pointer hover:bg-[#d9ac00]"
                                    >
                                        <FiPlus size={18} /> Add Payee
                                    </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {/* Continuous Loading Overlay */}
                            {loading && payees.length > 0 && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                        <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                                        <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                                    </div>
                                </div>
                            )}
                            {payees.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Ben Code</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Ben Name</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Mobile</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Email</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Type</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {payees.map((payee) => (
                                                    <tr key={payee.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => { setSelectedPayee(payee); setIsEditModalOpen(true); }}>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-900 font-medium whitespace-nowrap font-mono group-hover:text-[#FFCA00] transition-colors">{payee.ben_code}</td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-900 whitespace-nowrap">{payee.ben_name}</td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-500 whitespace-nowrap">{payee.contact}</td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-500 whitespace-nowrap">{payee.email}</td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] whitespace-nowrap">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${payee.payee_type === 'INTERNATIONAL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {payee.payee_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-center relative">
                                                            <button
                                                                onClick={(e) => handleMenuClick(e, payee.id)}
                                                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === payee.id ? "bg-white border-[#FFCA00] text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                            >
                                                                <FiMoreVertical size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Pagination */}
                                    <div className="px-6 bg-white border-t border-gray-100">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={Math.ceil(pagination.count / pageSize)}
                                            onPageChange={(page) => {
                                                setCurrentPage(page);
                                                const baseUrl = "/api/payor/payee-list/";
                                                const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
                                                fetchPayees(url);
                                            }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <EmptyState
                                    title="No Payees Found"
                                    message={searchQuery ? "No results found." : "Add a new payee to get started."}
                                    actionLabel={searchQuery ? "Clear Search" : "Add Payee"}
                                    onActionClick={searchQuery ? () => { setSearchQuery(""); fetchPayees(); } : () => setIsAddModalOpen(true)}
                                />
                            )}
                        </div>
                    </div>
                </main>
            )}

            {/* Action Menu */}
            {openMenuId && (
                <ActionMenu
                    isOpen={true}
                    onClose={() => setOpenMenuId(null)}
                    onEdit={() => {
                        const payee = payees.find(p => p.id === openMenuId);
                        if (payee) { setSelectedPayee(payee); setIsEditModalOpen(true); }
                        setOpenMenuId(null);
                    }}
                    onDelete={() => {
                        const payee = payees.find(p => p.id === openMenuId);
                        if (payee) { setSelectedPayee(payee); setIsDeleteModalOpen(true); }
                        setOpenMenuId(null);
                    }}
                    anchorMode="fixed"
                    position=""
                    style={{
                        top: menuPosition.top,
                        left: menuPosition.left,
                        transformOrigin: menuPosition.transformOrigin
                    }}
                />
            )}

            {/* Modals */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Payee">
                <PayeeForm
                    onSubmit={handleCreate}
                    isLoading={actionLoading}
                    isEdit={false}
                    categories={categories}
                    onClose={() => setIsAddModalOpen(false)}
                />
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Payee">
                {selectedPayee && (
                    <PayeeForm
                        initialData={selectedPayee}
                        onSubmit={handleUpdate}
                        isLoading={actionLoading}
                        isEdit={true}
                        categories={categories}
                        onClose={() => setIsEditModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <FiTrash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Delete Payee</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Are you sure you want to delete <span className="font-bold">{selectedPayee?.ben_code}</span>?
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3 justify-center">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-lg shadow-red-500/30"
                            >
                                {actionLoading ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}