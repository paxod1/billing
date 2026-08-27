"use client";
import React, { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, User, MapPin, Phone, Building, Loader, X, Edit, RefreshCw, Check, ChevronDown } from "lucide-react";

// shadcn/ui Dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authRequest } from "@/lib/axios/axioscreate";
import { useAppDispatch } from "@/lib/redux/hooks";
import { showToast } from "@/lib/redux/slices/toastSlice";
import CustomSelect from "@/components/common/CustomSelect";

const beneficiaryTypes = ["Individual", "Business", "Government", "Non-Profit"];
const bankAccountTypes = ["Savings", "Current", "Fixed Deposit", "Recurring Deposit"];
const payeeTypes = ["DOMESTIC", "INTERNATIONAL"];

// Country codes with flags
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

// Validation regex patterns
const swiftRegex = /^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
const accountNumberRegex = /^[0-9]{9,18}$/;
const sortCodeRegex = /^[0-9]{6}$/;
const phoneRegex = /^[0-9]{7,15}$/;

// Dynamic schema based on payee type and edit mode
const createPayeeSchema = (payeeType, isEditMode = false) => {
  if (isEditMode) {
    // Edit mode schema - all fields optional but with validation when provided
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
      bank_account_type: z.enum(bankAccountTypes, {
        errorMap: () => ({ message: "Bank account type is required" }),
      }).optional(),
      categories: z.array(z.string()).optional(),
      ifsc: z.string().optional(),
      swift_code: z.string()
        .optional()
        .refine((val) => !val || swiftRegex.test(val), {
          message: "SWIFT Code must be 8 or 11 alphanumeric characters"
        })
        .optional(),
      sort_code: z.string()
        .optional()
        .refine((val) => !val || sortCodeRegex.test(val), {
          message: "Sort Code must be 6 digits"
        })
        .optional(),
    });

    // Add conditional validation based on payee type in edit mode
    if (payeeType === "DOMESTIC") {
      return baseEditSchema.extend({
        acc_no: z.string()
          .optional()
          .refine((val) => !val || accountNumberRegex.test(val), {
            message: "Account number must be 9-18 digits"
          }),
        ifsc: z.string()
          .optional()
          .refine((val) => !val || ifscRegex.test(val), {
            message: "IFSC code must be 11 characters in format: ABCD0123456"
          }),
      });
    } else {
      return baseEditSchema.extend({
        acc_no: z.string()
          .optional()
          .refine((val) => !val || ibanRegex.test(val), {
            message: "IBAN must be in valid format (e.g., GB82WEST12345698765432)"
          }),
        ifsc: z.string().optional(),
        swift_code: z.string()
          .optional()
          .refine((val) => !val || swiftRegex.test(val), {
            message: "SWIFT Code must be 8 or 11 alphanumeric characters"
          }),
        sort_code: z.string()
          .optional()
          .refine((val) => !val || sortCodeRegex.test(val), {
            message: "Sort Code must be 6 digits"
          }),
      });
    }
  }

  // For create mode - all fields required with proper validation
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
    bank_account_type: z.enum(bankAccountTypes, {
      errorMap: () => ({ message: "Bank account type is required" }),
    }),
    categories: z.array(z.string()).min(1, "At least one payee list is required"),
  });

  if (payeeType === "DOMESTIC") {
    return baseCreateSchema.extend({
      acc_no: z.string()
        .min(1, "Account number is required")
        .regex(accountNumberRegex, "Account number must be 9-18 digits"),
      ifsc: z.string()
        .min(1, "IFSC Code is required for Domestic payee")
        .regex(ifscRegex, "IFSC code must be 11 characters in format: ABCD0123456"),
    });
  } else {
    return baseCreateSchema.extend({
      acc_no: z.string()
        .min(1, "IBAN is required for International payee")
        .regex(ibanRegex, "IBAN must be in valid format (e.g., GB82WEST12345698765432)"),
      ifsc: z.string().optional(),
      swift_code: z.string()
        .min(1, "SWIFT Code is required for International payee")
        .regex(swiftRegex, "SWIFT Code must be 8 or 11 alphanumeric characters"),
      sort_code: z.string()
        .min(1, "Sort Code is required for International payee")
        .regex(sortCodeRegex, "Sort Code must be 6 digits"),
    });
  }
};

const defaultCategories = [];

export default function AddNewPayee({
  isOpen,
  onClose,
  onPayeeAdded,
  onPayeeUpdated,
  categories = [],
  categoriesLoading = false,
  editPayeeData = null,
}) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoGeneratedCode, setAutoGeneratedCode] = useState("");
  const [hasPayeeTypeChanged, setHasPayeeTypeChanged] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // State for payee type to manage dynamic schema
  const [currentPayeeType, setCurrentPayeeType] = useState("DOMESTIC");

  // Create dynamic schema based on current payee type and edit mode
  const payeeSchema = useMemo(() =>
    createPayeeSchema(currentPayeeType, isEditMode),
    [currentPayeeType, isEditMode]
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(payeeSchema),
    defaultValues: {
      ben_code: "",
      ben_name: "",
      add1: "",
      add2: "",
      city: "",
      state: "",
      zipcode: "",
      country_code: "+91", // Default to India
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
    },
  });

  const watchedPayeeType = watch("payee_type");
  const isInternational = watchedPayeeType === "INTERNATIONAL";

  // Dynamic label for Account No / IBAN
  const accountLabel = useMemo(() => (isInternational ? "IBAN" : "Account No"), [isInternational]);

  // Use categories from props with fallback to defaultCategories
  const availableCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : defaultCategories;
  }, [categories]);

  // Generate unique beneficiary code with letters and numbers (capital letters)
  const generateBeneficiaryCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    // Generate 3 random capital letters
    let letterPart = '';
    for (let i = 0; i < 3; i++) {
      letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Generate 4 random numbers
    let numberPart = '';
    for (let i = 0; i < 4; i++) {
      numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    // Generate 2 more random capital letters
    let suffixPart = '';
    for (let i = 0; i < 2; i++) {
      suffixPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    const newCode = `BEN${letterPart}${numberPart}${suffixPart}`;

    return newCode;
  };

  // Auto-generate code when dialog opens in create mode
  useEffect(() => {
    if (isOpen && !isEditMode) {
      const newCode = generateBeneficiaryCode();
      setAutoGeneratedCode(newCode);
      setValue("ben_code", newCode);
      setSelectedCategories([]);
      setValue("categories", []);
    }
  }, [isOpen, isEditMode, setValue]);

  // Improved contact number extraction function
  const extractContactAndCountryCode = (contactValue) => {
    if (!contactValue) return { countryCode: "+91", phoneNumber: "" };

    // Check if contact starts with a country code pattern
    const countryCodePattern = /^(\+\d{1,4})(\d+)$/;
    const match = contactValue.match(countryCodePattern);

    if (match) {
      return {
        countryCode: match[1],
        phoneNumber: match[2]
      };
    }

    // If no country code found, check if it's just numbers (assume default country code)
    if (/^\d+$/.test(contactValue)) {
      return {
        countryCode: "+91",
        phoneNumber: contactValue
      };
    }

    // Default fallback
    return {
      countryCode: "+91",
      phoneNumber: contactValue
    };
  };

  // Clear and validate conditional fields when switching payee types
  useEffect(() => {
    if (isInternational) {
      // Switching to INTERNATIONAL - clear IFSC and require SWIFT & Sort Code
      if (!isEditMode || hasPayeeTypeChanged) {
        setValue("ifsc", "");
        setValue("swift_code", "");
        setValue("sort_code", "");
      }
    } else {
      // Switching to DOMESTIC - clear SWIFT & Sort Code and require IFSC
      setValue("swift_code", "");
      setValue("sort_code", "");
      if (!isEditMode || hasPayeeTypeChanged) {
        // Only clear IFSC if we're switching types, otherwise keep existing IFSC
        if (hasPayeeTypeChanged) {
          setValue("ifsc", "");
        }
      }
    }

    // Trigger validation for bank fields when payee type changes
    if (isEditMode) {
      setTimeout(() => {
        trigger(["acc_no", "ifsc", "swift_code", "sort_code"]);
      }, 100);
    }
  }, [isInternational, setValue, trigger, isEditMode, hasPayeeTypeChanged]);

  // Set form data when editPayeeData changes - FIXED: Proper null/undefined check
  useEffect(() => {
    console.log("Edit Payee Data received:", editPayeeData);

    // Check if editPayeeData is valid and not null/undefined
    const isValidEditData = editPayeeData &&
      typeof editPayeeData === 'object' &&
      Object.keys(editPayeeData).length > 0 &&
      editPayeeData.id; // Ensure it has an ID

    if (isValidEditData) {
      setIsEditMode(true);
      setHasPayeeTypeChanged(false);

      console.log("Setting form for edit mode with data:", editPayeeData);

      // Set form values for editing - handle null/undefined values
      const setFormValue = (fieldName, value) => {
        setValue(fieldName, value || "");
      };

      // Convert API payee_type to display format - ensure uppercase
      const apiPayeeType = editPayeeData.payee_type;
      let displayPayeeType = "DOMESTIC"; // default

      if (apiPayeeType) {
        const normalizedType = apiPayeeType.toUpperCase();
        if (normalizedType === "INTERNATIONAL" || normalizedType === "DOMESTIC") {
          displayPayeeType = normalizedType;
        }
      }

      // Set basic information
      setFormValue("ben_code", editPayeeData.ben_code);
      setFormValue("ben_name", editPayeeData.ben_name);
      setFormValue("add1", editPayeeData.add1);
      setFormValue("add2", editPayeeData.add2);
      setFormValue("city", editPayeeData.city);
      setFormValue("state", editPayeeData.state);
      setFormValue("zipcode", editPayeeData.zipcode);

      // Handle contact with improved extraction
      const { countryCode, phoneNumber } = extractContactAndCountryCode(editPayeeData.contact);

      setFormValue("country_code", countryCode);
      setFormValue("contact", phoneNumber);

      setFormValue("email", editPayeeData.email);
      setFormValue("payee_type", displayPayeeType);

      // Handle bank details
      if (displayPayeeType === "INTERNATIONAL") {
        // For international, use IBAN if available, otherwise use acc_no
        const accountValue = editPayeeData.iban || editPayeeData.acc_no;
        setFormValue("acc_no", accountValue);
        setFormValue("sort_code", editPayeeData.sort_code || "");
      } else {
        // For domestic, use acc_no
        setFormValue("acc_no", editPayeeData.acc_no);
      }

      // FIX: Always set IFSC code for DOMESTIC payees, regardless of payee type
      setFormValue("ifsc", editPayeeData.ifsc || "");

      setFormValue("swift_code", editPayeeData.swift_code || "");
      setFormValue("bank_name", editPayeeData.bank_name || "");
      setFormValue("branch", editPayeeData.branch || "");
      setFormValue("bank_account_type", editPayeeData.bank_account_type || "");

      // Handle categories - it's an array in your data
      if (editPayeeData.categories && Array.isArray(editPayeeData.categories)) {
        const categoryIds = editPayeeData.categories.map(cat => {
          // Handle both object and string formats
          if (typeof cat === 'object' && cat.id) {
            return cat.id.toString();
          } else if (typeof cat === 'string' || typeof cat === 'number') {
            return cat.toString();
          }
          return '';
        }).filter(id => id !== ''); // Remove any empty strings

        console.log("Setting categories:", categoryIds);
        setSelectedCategories(categoryIds);
        setFormValue("categories", categoryIds);
      } else {
        console.log("No categories found in edit data");
        setSelectedCategories([]);
        setFormValue("categories", []);
      }

      // Update current payee type for schema
      setCurrentPayeeType(displayPayeeType);
    } else {
      console.log("No valid edit data, setting create mode");
      setIsEditMode(false);
      setHasPayeeTypeChanged(false);
      setSelectedCategories([]);
    }
  }, [editPayeeData, setValue]);

  // Update schema when payee type changes
  useEffect(() => {
    if (watchedPayeeType !== currentPayeeType) {
      setCurrentPayeeType(watchedPayeeType);

      // Track if payee type has changed in edit mode
      if (isEditMode && editPayeeData) {
        const originalApiPayeeType = editPayeeData.payee_type;
        const originalDisplayPayeeType = originalApiPayeeType ? originalApiPayeeType.toUpperCase() : "DOMESTIC";
        setHasPayeeTypeChanged(watchedPayeeType !== originalDisplayPayeeType);
      }
    }
  }, [watchedPayeeType, currentPayeeType, isEditMode, editPayeeData]);

  // Function to regenerate beneficiary code (only for create mode)
  const regenerateBeneficiaryCode = () => {
    const newCode = generateBeneficiaryCode();
    setAutoGeneratedCode(newCode);
    setValue("ben_code", newCode);
    clearErrors("ben_code");
  };

  // Handle category selection change
  const handleCategoryChange = (newSelectedCategories) => {
    setSelectedCategories(newSelectedCategories);
    setValue("categories", newSelectedCategories);
    clearErrors("categories");
  };

  // Helper function to check if values are different
  const hasValueChanged = (currentValue, originalValue) => {
    // Handle empty strings and null/undefined
    const current = currentValue === "" ? null : currentValue;
    const original = originalValue === "" ? null : originalValue;

    return current !== original;
  };

  // Helper function to get original values from editPayeeData
  const getOriginalValue = (field, editData) => {
    if (!editData) return "";

    switch (field) {
      case 'categories':
        if (editData.categories && Array.isArray(editData.categories)) {
          return editData.categories.map(cat => {
            if (typeof cat === 'object' && cat.id) {
              return cat.id.toString();
            } else if (typeof cat === 'string' || typeof cat === 'number') {
              return cat.toString();
            }
            return '';
          }).filter(id => id !== '');
        }
        return [];
      case 'payee_type':
        return editData.payee_type ? editData.payee_type.toUpperCase() : "";
      case 'acc_no':
        const originalPayeeType = editData.payee_type ? editData.payee_type.toUpperCase() : "DOMESTIC";
        if (originalPayeeType === "INTERNATIONAL" && editData.iban) {
          return editData.iban;
        }
        return editData.acc_no || "";
      case 'sort_code':
        return editData.sort_code || "";
      case 'ifsc':
        return editData.ifsc || "";
      case 'contact':
        // Extract just the phone number without country code using improved function
        const { phoneNumber } = extractContactAndCountryCode(editData.contact);
        return phoneNumber;
      default:
        return editData[field] || "";
    }
  };

  // Validate bank details when payee type changes in edit mode
  const validateBankDetailsForPayeeTypeChange = (data) => {
    if (!hasPayeeTypeChanged) return true;

    const bankFields = ['acc_no', 'bank_name', 'branch', 'bank_account_type'];
    const internationalFields = ['swift_code', 'sort_code'];
    const domesticFields = ['ifsc'];

    let hasBankDetails = false;

    // Check if any bank fields are filled
    for (const field of bankFields) {
      if (data[field] && data[field].trim() !== '') {
        hasBankDetails = true;
        break;
      }
    }

    if (isInternational) {
      // Check SWIFT code and Sort Code for international
      if ((data.swift_code && data.swift_code.trim() !== '') ||
        (data.sort_code && data.sort_code.trim() !== '')) {
        hasBankDetails = true;
      }
    } else {
      // Check IFSC for domestic
      if (data.ifsc && data.ifsc.trim() !== '') {
        hasBankDetails = true;
      }
    }

    if (!hasBankDetails) {
      dispatch(
        showToast({
          message: "Please provide bank details for the new payee type",
          type: "error",
        })
      );
      return false;
    }

    return true;
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    console.log("Form data submitted:", data);

    try {
      // Validate bank details if payee type changed
      if (isEditMode && hasPayeeTypeChanged) {
        const isValid = validateBankDetailsForPayeeTypeChange(data);
        if (!isValid) {
          setIsSubmitting(false);
          return;
        }
      }

      let payeeData = {};

      // Ensure payee_type is sent in correct uppercase format
      const apiPayeeType = data.payee_type.toUpperCase();

      // Combine country code and contact number
      const fullContact = data.country_code + data.contact;

      if (isEditMode && editPayeeData) {
        // UPDATE MODE: Only include fields that have values AND are different from original
        const fieldsToCheck = [
          'ben_name', 'add1', 'add2', 'city', 'state', 'zipcode',
          'contact', 'email', 'acc_no', 'ifsc', 'swift_code', 'sort_code',
          'bank_name', 'branch', 'bank_account_type', 'payee_type'
        ];

        fieldsToCheck.forEach(field => {
          const currentValue = field === 'contact' ? fullContact : data[field];
          const originalValue = getOriginalValue(field, editPayeeData);

          // Check if value has actually changed
          if (hasValueChanged(currentValue, originalValue)) {
            // For payee_type, ensure uppercase
            if (field === 'payee_type') {
              payeeData[field] = apiPayeeType;
            }
            // Skip IFSC field for international payees
            else if (field === 'ifsc' && apiPayeeType === "INTERNATIONAL") {
              // Do not include IFSC field for international payees
            }
            // For other fields, include the changed value
            else {
              payeeData[field] = currentValue || "";
            }
          }
        });

        // Handle categories separately
        const currentCategories = data.categories || [];
        const originalCategories = getOriginalValue('categories', editPayeeData);

        if (JSON.stringify(currentCategories.sort()) !== JSON.stringify(originalCategories.sort())) {
          payeeData.categories = currentCategories.map(id => parseInt(id));
        }

        // If no fields were changed, show message and return
        if (Object.keys(payeeData).length === 0) {
          dispatch(
            showToast({
              message: "No changes detected to update",
              type: "info",
            })
          );
          setIsSubmitting(false);
          return;
        }

      } else {
        // CREATE MODE: Include all required fields
        // Use auto-generated code if no code provided
        const finalBenCode = data.ben_code || autoGeneratedCode;

        payeeData = {
          ben_code: finalBenCode,
          ben_name: data.ben_name,
          add1: data.add1,
          add2: data.add2 || "",
          city: data.city,
          state: data.state,
          zipcode: data.zipcode,
          contact: fullContact, // Combined country code + phone number
          email: data.email,
          payee_type: apiPayeeType,
          acc_no: data.acc_no,
          bank_name: data.bank_name,
          branch: data.branch,
          bank_account_type: data.bank_account_type,
          categories: data.categories.map(id => parseInt(id)),
        };

        // Handle fields based on payee type
        if (apiPayeeType === "DOMESTIC") {
          // Only include IFSC for DOMESTIC payees
          payeeData.ifsc = data.ifsc || "";
        } else {
          // For INTERNATIONAL payees, include SWIFT and Sort Code
          payeeData.swift_code = data.swift_code;
          payeeData.sort_code = data.sort_code;
          // For international, also set IBAN if needed by your API
          if (data.acc_no) {
            payeeData.iban = data.acc_no;
          }
          // DO NOT include IFSC field at all for international payees
        }
      }

      console.log("Final payee data to submit:", payeeData);

      let response;
      if (isEditMode && editPayeeData) {
        response = await authRequest.patch(`/api/payor/payee-edit/${editPayeeData.id}/`, payeeData);
      } else {
        response = await authRequest.post(`/api/payor/payee-register/`, payeeData);
      }

      reset();

      if (isEditMode && onPayeeUpdated) {
        onPayeeUpdated();
      } else if (onPayeeAdded) {
        onPayeeAdded();
      }

      dispatch(
        showToast({
          message: `Payee ${isEditMode ? 'updated' : 'added'} successfully!`,
          type: "success",
        })
      );

      handleClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} payee:`, error);
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'add'} payee`;

      if (error.response?.data) {
        const apiErrors = error.response.data;

        // Handle duplicate ben_code error
        if (apiErrors.ben_code && apiErrors.ben_code.includes("already exists")) {
          // Auto-regenerate code and retry for create mode
          if (!isEditMode) {
            regenerateBeneficiaryCode();
            errorMessage = "Duplicate beneficiary code detected. A new code has been generated. Please try again.";
          } else {
            errorMessage = "Beneficiary code already exists. Please use a different code.";
          }
        }
        // Handle payee_type validation error
        else if (apiErrors.non_field_errors && apiErrors.non_field_errors.includes("Invalid payee_type")) {
          errorMessage = "Invalid payee type. Please select either DOMESTIC or INTERNATIONAL.";
        }
        // Handle IFSC validation error for international payees
        else if (apiErrors.ifsc && apiPayeeType === "INTERNATIONAL") {
          errorMessage = "IFSC code should not be provided for international payees. Please remove the IFSC code.";
        }
        else if (typeof apiErrors === 'object') {
          errorMessage = Object.entries(apiErrors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
        } else {
          errorMessage = apiErrors;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch(
        showToast({
          message: errorMessage,
          type: "error",
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setIsEditMode(false);
    setAutoGeneratedCode("");
    setCurrentPayeeType("DOMESTIC");
    setHasPayeeTypeChanged(false);
    setSelectedCategories([]);
    onClose();
  };

  // Dialog title based on mode
  const dialogTitle = isEditMode ? "Edit Payee" : "Add New Payee";
  const dialogDescription = isEditMode
    ? "Update beneficiary and bank details (only fill fields you want to change)"
    : "Add new beneficiary";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] w-full p-0 sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full flex flex-col max-h-[90vh]">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 bg-sidebar-accent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                {isEditMode ? (
                  <Edit className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Plus className="h-6 w-6 text-emerald-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {dialogTitle}
                </h3>
                <p className="text-sm text-gray-600">
                  {dialogDescription}
                </p>
                {isEditMode && editPayeeData && (
                  <p className="text-xs text-gray-500 mt-1">
                    Editing: {editPayeeData.ben_code} - {editPayeeData.ben_name}
                  </p>
                )}
                {hasPayeeTypeChanged && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    Payee type changed - please provide bank details for the new type
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* body - scrollable area */}
          <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Basic Info */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  <span>Basic Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ben_code" className="text-xs">
                      Beneficiary Code
                      {!isEditMode && <span className="text-green-600 ml-1">(Auto-generated)</span>}
                      {isEditMode && <span className="text-gray-500 ml-1">(Cannot be changed)</span>}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="ben_code"
                        {...register("ben_code")}
                        placeholder={isEditMode ? "Existing code" : "Auto-generated"}
                        className={`flex-1 font-mono uppercase ${isEditMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        readOnly={true}
                        disabled={isEditMode}
                      />
                      {!isEditMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={regenerateBeneficiaryCode}
                          className="flex-shrink-0"
                          title="Generate new code"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {errors.ben_code && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.ben_code.message}
                      </p>
                    )}
                    {!isEditMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        Click the refresh button to generate a new code
                      </p>
                    )}
                    {isEditMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        Beneficiary code cannot be modified
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="ben_name" className="text-xs">
                      Beneficiary Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ben_name"
                      {...register("ben_name")}
                      className={`mt-1 ${errors.ben_name ? "border-red-500" : ""}`}
                      placeholder="Enter beneficiary name"
                    />
                    {errors.ben_name && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.ben_name.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Address */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>Address Information</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">
                      Address 1 {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("add1")}
                      className="mt-1"
                      placeholder="Street address, P.O. box"
                    />
                    {errors.add1 && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.add1.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Address 2</Label>
                    <Input
                      {...register("add2")}
                      className="mt-1"
                      placeholder="Apartment, suite, unit, building, floor, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">
                      City {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("city")}
                      className="mt-1"
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">
                      State {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("state")}
                      className="mt-1"
                      placeholder="State/Province/Region"
                    />
                    {errors.state && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">
                      Zipcode {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("zipcode")}
                      className="mt-1"
                      placeholder="ZIP/Postal code"
                    />
                    {errors.zipcode && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.zipcode.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span>Contact Information</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">
                      Contact {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Controller
                        control={control}
                        name="country_code"
                        render={({ field }) => (
                          <CustomSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={countryCodes.map((country) => ({
                              value: country.code,
                              label: `${country.country} ${country.code}`
                            }))}
                            placeholder="Code"
                            className="w-28"
                          />
                        )}
                      />
                      <Input
                        {...register("contact", {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/\D/g, "");
                          }
                        })}
                        className="flex-1"
                        placeholder="Phone number"
                      />
                    </div>
                    {errors.contact && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.contact.message}
                      </p>
                    )}
                    {!errors.contact && (
                      <p className="text-xs text-gray-500 mt-1">
                        7-15 digits without spaces or special characters
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">
                      Email {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("email")}
                      type="email"
                      className="mt-1"
                      placeholder="Email address"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Payee Type and Payee Lists */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
                  <Building className="h-4 w-4 text-emerald-600" />
                  <span>Payee Type & Payee Lists</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">
                      Payee Type {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <Controller
                      control={control}
                      name="payee_type"
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={payeeTypes.map((t) => ({ value: t, label: t }))}
                          placeholder="Select payee type"
                          className="mt-1 w-full"
                        />
                      )}
                    />
                    {errors.payee_type && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.payee_type.message}
                      </p>
                    )}
                    {hasPayeeTypeChanged && (
                      <p className="text-xs text-orange-600 mt-1">
                        Payee type changed - bank details validation updated
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">
                      Payee Lists {!isEditMode && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="mt-1">
                      <CustomSelect
                        isMulti
                        options={availableCategories.map(cat => ({
                          value: cat.id.toString(),
                          label: `${cat.name} (${cat.count || 0} payees)`
                        }))}
                        value={selectedCategories}
                        onChange={handleCategoryChange}
                        placeholder="Select payee lists..."
                        isDisabled={categoriesLoading}
                        isLoading={categoriesLoading}
                        className="mt-1"
                      />
                      {errors.categories && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.categories.message}
                        </p>
                      )}
                      {selectedCategories.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          {selectedCategories.length} payee list{selectedCategories.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Banking Information */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
                  <Building className="h-4 w-4 text-emerald-600" />
                  <span>Banking Information</span>
                  {hasPayeeTypeChanged && (
                    <span className="text-xs text-orange-600 ml-2">
                      (Required for type change)
                    </span>
                  )}
                </div>

                {/* Account/IBAN and IFSC (conditional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">
                      {accountLabel} {!isEditMode && <span className="text-red-500">*</span>}
                      {isEditMode && hasPayeeTypeChanged && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("acc_no", {
                        onChange: (e) => {
                          e.target.value = e.target.value.replace(/\D/g, "");
                        }
                      })}
                      id="acc_no"
                      className={`mt-1 ${errors.acc_no ? "border-red-500" : ""}`}
                      placeholder={isInternational ? "Enter IBAN (e.g., GB82WEST12345698765432)" : "Enter account number (9-18 digits)"}
                    />
                    {errors.acc_no && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.acc_no.message}
                      </p>
                    )}
                    {!errors.acc_no && isInternational && (
                      <p className="text-xs text-gray-500 mt-1">
                        Format: Country code + Check digits + Basic Bank Account Number
                      </p>
                    )}
                  </div>

                  {/* Show IFSC only for DOMESTIC - FIXED: Always show for DOMESTIC payees */}
                  {!isInternational && (
                    <div>
                      <Label className="text-xs">
                        IFSC Code {!isEditMode && <span className="text-red-500">*</span>}
                        {isEditMode && hasPayeeTypeChanged && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        {...register("ifsc")}
                        className={`mt-1 uppercase ${errors.ifsc ? "border-red-500" : ""}`}
                        maxLength={11}
                        placeholder="Enter IFSC code (e.g., SBIN0123456)"
                      />
                      {errors.ifsc && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.ifsc.message}
                        </p>
                      )}
                      {!errors.ifsc && (
                        <p className="text-xs text-gray-500 mt-1">
                          11 characters: 4 letters + 0 + 6 alphanumeric
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* INTERNATIONAL-only fields - SWIFT Code and Sort Code */}
                {isInternational && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">
                        SWIFT Code {!isEditMode && <span className="text-red-500">*</span>}
                        {isEditMode && hasPayeeTypeChanged && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        {...register("swift_code")}
                        className={`mt-1 uppercase ${errors.swift_code ? "border-red-500" : ""}`}
                        maxLength={11}
                        placeholder="Enter SWIFT code (8 or 11 characters)"
                      />
                      {errors.swift_code && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.swift_code.message}
                        </p>
                      )}
                      {!errors.swift_code && (
                        <p className="text-xs text-gray-500 mt-1">
                          8 or 11 alphanumeric characters (e.g., BOFAUS3NXXX)
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">
                        Sort Code {!isEditMode && <span className="text-red-500">*</span>}
                        {isEditMode && hasPayeeTypeChanged && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        {...register("sort_code")}
                        className={`mt-1 ${errors.sort_code ? "border-red-500" : ""}`}
                        maxLength={6}
                        placeholder="Enter Sort Code (6 digits)"
                      />
                      {errors.sort_code && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.sort_code.message}
                        </p>
                      )}
                      {!errors.sort_code && (
                        <p className="text-xs text-gray-500 mt-1">
                          6 digits (e.g., 123456)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">
                      Bank Name {!isEditMode && <span className="text-red-500">*</span>}
                      {isEditMode && hasPayeeTypeChanged && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("bank_name")}
                      className={`mt-1 ${errors.bank_name ? "border-red-500" : ""}`}
                      placeholder="Bank name"
                    />
                    {errors.bank_name && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.bank_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">
                      Branch {!isEditMode && <span className="text-red-500">*</span>}
                      {isEditMode && hasPayeeTypeChanged && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register("branch")}
                      className={`mt-1 ${errors.branch ? "border-red-500" : ""}`}
                      placeholder="Branch name"
                    />
                    {errors.branch && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.branch.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">
                      Bank Account Type {!isEditMode && <span className="text-red-500">*</span>}
                      {isEditMode && hasPayeeTypeChanged && <span className="text-red-500">*</span>}
                    </Label>
                    <Controller
                      control={control}
                      name="bank_account_type"
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={bankAccountTypes.map((t) => ({ value: t, label: t }))}
                          placeholder="Select account type"
                          className="mt-1 w-full"
                        />
                      )}
                    />
                    {errors.bank_account_type && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.bank_account_type.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* actions - sticky footer */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t sticky w-full left-0 right-0 bottom-0 bg-white pb-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto border"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-800 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    isEditMode ? "Update Payee" : "Create Payee"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}