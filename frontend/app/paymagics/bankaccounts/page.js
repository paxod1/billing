"use client";

import React, { useState, useEffect } from "react";
import {
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiEdit3,
  FiX,
  FiPhone,
  FiMail,
  FiUser,
  FiCreditCard,
  FiMapPin,
  FiBriefcase,
  FiChevronDown,
  FiDownload,
  FiRefreshCw
} from "react-icons/fi";
import { IoSearchOutline } from "react-icons/io5";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { authRequest } from "@/lib/axiosCreate";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import Pagination from "@/components/commonComp/Pagination";
import CustomSelect from "@/components/common/CustomSelect";

const accountTypes = [
  "Savings",
  "Current",
  "Salary",
  "Fixed Deposit",
  "Recurring Deposit",
  "Personal"
];

const bankOptions = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank (PNB)",
  "Bank of Baroda",
  "Axis Bank",
  "Canara Bank",
  "Union Bank of India",
  "Bank of India",
  "Central Bank of India",
  "Indian Bank",
  "Indian Overseas Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Yes Bank",
  "Federal Bank",
  "South Indian Bank",
  "Karnataka Bank",
  "Karur Vysya Bank",
  "City Union Bank",
  "Bank of Maharashtra",
  "UCO Bank",
  "Punjab & Sind Bank",
  "Dhanlaxmi Bank",
  "Tamilnad Mercantile Bank"
];

// ----------------------------------------------------------------------
// UI Components
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
            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
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
            ${error ? "border-red-500" : "border-gray-200"} ${Icon ? "pl-10" : ""}`}
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

const SelectField = ({ label, error, options, placeholder = "Select...", required, value, onChange, icon: Icon }) => {
  return (
    <div className="w-full relative">
      {label && (
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <CustomSelect
          value={value}
          onChange={(val) => onChange({ target: { value: val } })}
          options={options}
          placeholder={placeholder}
          isSearchable={true}
          className={Icon ? "pl-0" : ""}
          // We can't easily pass styles to control via props without making CustomSelect more complex,
          // but we can add a className or just let the icon overlay if we adjust its position.
          // Actually CustomSelect supports ...props, and react-select supports styles.
          styles={Icon ? {
            control: (base) => ({
              ...base,
              paddingLeft: '32px'
            })
          } : undefined}
        />
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            <Icon size={16} />
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error.message || error}</p>
      )}
    </div>
  );
};

const MobileBankCard = ({ template, onEdit, onDelete }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-12 w-12 rounded-lg bg-yellow-50 text-[#FFCA00] flex items-center justify-center font-bold text-sm shrink-0 border border-yellow-100">
          {template.bank_name?.slice(0, 2).toUpperCase() || 'BN'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {template.bank_name || 'Bank Name'}
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <FiMapPin className="h-3 w-3" />
            <span className="truncate">{template.branch || 'Branch'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(template)}
          className="p-2 text-gray-400 hover:text-[#FFCA00] hover:bg-yellow-50 rounded-lg transition-colors"
          title="Edit"
        >
          <FiEdit3 size={18} />
        </button>
        <button
          onClick={() => onDelete(template.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <FiTrash2 size={18} />
        </button>
      </div>
    </div>

    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-700">
          <FiCreditCard className="h-4 w-4" />
          <span className="text-sm font-medium">Account</span>
        </div>
        <span className="font-mono text-sm font-semibold text-gray-900">
          {template.acc_no ? `${template.acc_no.slice(0, 4)}****${template.acc_no.slice(-4)}` : 'N/A'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg border border-gray-100 bg-white">
          <div className="flex items-center gap-1 mb-1">
            <FiBriefcase className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] uppercase font-bold text-gray-400">IFSC</span>
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">{template.ifsc || 'N/A'}</div>
        </div>
        <div className="p-2 rounded-lg border border-gray-100 bg-white">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Type</div>
          <div className="text-sm font-medium text-gray-900 truncate">{template.acc_type || 'N/A'}</div>
        </div>
      </div>

      <div className="p-2 rounded-lg border border-gray-100 bg-white">
        <div className="flex items-center gap-1 mb-1">
          <FiUser className="h-3 w-3 text-gray-400" />
          <span className="text-[10px] uppercase font-bold text-gray-400">Holder</span>
        </div>
        <div className="text-sm font-medium text-gray-900 truncate">{template.acc_holder || 'N/A'}</div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">Status</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${template.is_active
          ? 'bg-blue-50 text-blue-700 border border-blue-100'
          : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
          {template.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  </div>
);

const DesktopBankCard = ({ template, onEdit, onDelete }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group">
    <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-yellow-50 text-[#FFCA00] flex items-center justify-center font-bold border border-yellow-100">
          {template.bank_name?.slice(0, 2).toUpperCase() || 'BN'}
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">
            {template.bank_name || 'Bank Name'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-gray-500 flex items-center gap-1">
              <FiMapPin className="h-3 w-3" />
              {template.branch || 'Branch'}
            </span>
            <span className="text-gray-300">|</span>
            <span className={`text-[10px] font-bold uppercase ${template.is_active ? 'text-blue-600' : 'text-gray-400'}`}>
              {template.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(template)}
          className="p-1.5 text-gray-400 hover:text-[#FFCA00] hover:bg-yellow-50 rounded transition-colors"
          title="Edit"
        >
          <FiEdit3 size={16} />
        </button>
        <button
          onClick={() => onDelete(template.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>

    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50/60 px-3 py-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase">Account No</span>
        <span className="font-mono text-sm font-semibold text-gray-900">
          {template.acc_no ? `${template.acc_no.slice(0, 4)}****${template.acc_no.slice(-4)}` : 'N/A'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-gray-100 bg-white px-3 py-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">IFSC</span>
          <span className="text-sm font-medium text-gray-900">{template.ifsc || 'N/A'}</span>
        </div>
        <div className="rounded-md border border-gray-100 bg-white px-3 py-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Type</span>
          <span className="text-sm font-medium text-gray-900">{template.acc_type || 'N/A'}</span>
        </div>
      </div>

      <div className="rounded-md border border-gray-100 bg-white px-3 py-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Holder</span>
          <span className="text-[10px] text-gray-400 truncate ml-2">{template.mobile}</span>
        </div>
        <div className="text-sm font-medium text-gray-900 truncate">
          {template.acc_holder || 'N/A'}
        </div>
      </div>
    </div>
  </div>
);

const BankTemplatesManager = () => {
  const dispatch = useDispatch();
  const [templates, setTemplates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    acc_type: "",
    acc_no: "",
    confirm_acc_no: "",
    ifsc: "",
    branch: "",
    acc_holder: "",
    mobile: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Fetch bank accounts from API
  const fetchBankAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await authRequest.get("/api/bank/");

      if (response.data && response.data.results) {
        setTemplates(response.data.results);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      dispatch(
        showToast({
          message: "Failed to load bank accounts",
          type: "error",
        })
      );
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  // Validation functions
  const validateForm = () => {
    const errors = {};

    if (!formData.bank_name.trim()) errors.bank_name = "Bank name is required";

    if (!formData.acc_no.trim()) {
      errors.acc_no = "Account number is required";
    } else if (!/^\d{9,18}$/.test(formData.acc_no)) {
      errors.acc_no = "Account number must be 9-18 digits";
    }

    if (formData.acc_no !== formData.confirm_acc_no) {
      errors.confirm_acc_no = "Account numbers do not match";
    }

    if (!formData.ifsc.trim()) {
      errors.ifsc = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc)) {
      errors.ifsc = "Invalid IFSC code format";
    }

    if (!formData.branch.trim()) errors.branch = "Branch name is required";
    if (!formData.acc_type) errors.acc_type = "Account type is required";
    if (!formData.acc_holder.trim()) errors.acc_holder = "Holder name is required";

    if (!formData.mobile.trim()) {
      errors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      errors.mobile = "Mobile number must be 10 digits";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      bank_name: "",
      acc_type: "",
      acc_no: "",
      confirm_acc_no: "",
      ifsc: "",
      branch: "",
      acc_holder: "",
      mobile: "",
      email: "",
    });
    setFormErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setActionLoading(true);

    try {
      // Prepare data for API (remove confirm_acc_no as it's not needed in backend)
      const { confirm_acc_no, ...apiData } = formData;

      if (editingTemplate) {
        // Update existing bank account - use PATCH method
        await authRequest.patch(`/api/bank/${editingTemplate.id}/update/`, apiData);

        dispatch(
          showToast({
            message: "Bank account updated successfully!",
            type: "success",
          })
        );
      } else {
        // Create new bank account
        await authRequest.post("/api/bank/add/", apiData);

        dispatch(
          showToast({
            message: "Bank account added successfully!",
            type: "success",
          })
        );
      }

      // Refresh the list
      await fetchBankAccounts();
      setIsDialogOpen(false);
      resetForm();
      setEditingTemplate(null);

    } catch (error) {
      console.error("Error saving bank account:", error);

      if (error.response?.status === 400) {
        const errorData = error.response.data;

        // Handle specific field errors from API
        if (errorData.bank_name) {
          dispatch(
            showToast({
              message: `Bank name error: ${Array.isArray(errorData.bank_name) ? errorData.bank_name[0] : errorData.bank_name}`,
              type: "error",
            })
          );
        } else if (errorData.acc_no) {
          dispatch(
            showToast({
              message: `Account number error: ${Array.isArray(errorData.acc_no) ? errorData.acc_no[0] : errorData.acc_no}`,
              type: "error",
            })
          );
        } else if (errorData.ifsc) {
          dispatch(
            showToast({
              message: `IFSC code error: ${Array.isArray(errorData.ifsc) ? errorData.ifsc[0] : errorData.ifsc}`,
              type: "error",
            })
          );
        } else if (errorData.email) {
          dispatch(
            showToast({
              message: `Email error: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}`,
              type: "error",
            })
          );
        } else if (errorData.detail) {
          dispatch(
            showToast({
              message: errorData.detail,
              type: "error",
            })
          );
        } else {
          dispatch(
            showToast({
              message: "Please check the form for errors",
              type: "error",
            })
          );
        }
      } else {
        dispatch(
          showToast({
            message: `Failed to ${editingTemplate ? 'update' : 'add'} bank account`,
            type: "error",
          })
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      bank_name: template.bank_name,
      acc_type: template.acc_type,
      acc_no: template.acc_no,
      confirm_acc_no: template.acc_no,
      ifsc: template.ifsc,
      branch: template.branch,
      acc_holder: template.acc_holder,
      mobile: template.mobile,
      email: template.email,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    setActionLoading(true);

    try {
      await authRequest.delete(`/api/bank/${id}/delete/`);

      // Refresh the list
      await fetchBankAccounts();

      dispatch(
        showToast({
          message: "Bank account deleted successfully!",
          type: "success",
        })
      );

      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting bank account:", error);
      dispatch(
        showToast({
          message: "Failed to delete bank account",
          type: "error",
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.branch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.acc_holder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.ifsc?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      template.acc_type?.toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar
        data={{
          heading: "Bank Accounts",
          subheading: "Manage and organize your bank account templates"
        }}
      />

      <main className="flex-1 py-8">
        <div className="w-full space-y-8">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search bank accounts..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px]"
              />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto min-w-0">
              <div className="w-full md:w-[160px] shrink-0">
                <SelectField
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Types" },
                    ...accountTypes.map((type) => ({ value: type, label: type }))
                  ]}
                  placeholder="All Types"
                  icon={FiFilter}
                />
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setEditingTemplate(null);
                  setIsDialogOpen(true);
                }}
                className="w-full md:w-auto px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 whitespace-nowrap hover:bg-[#d9ac00]"
              >
                <FiPlus size={18} /> Add Bank Account
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 font-medium">Loading bank accounts...</p>
            </div>
          ) : (
            <>
              {/* Bank Templates Grid */}
              {paginatedTemplates.length > 0 ? (
                <>
                  <div className={
                    isMobile
                      ? "space-y-4"
                      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  }>
                    {paginatedTemplates.map((template) =>
                      isMobile ? (
                        <MobileBankCard
                          key={template.id}
                          template={template}
                          onEdit={handleEdit}
                          onDelete={setShowDeleteConfirm}
                        />
                      ) : (
                        <DesktopBankCard
                          key={template.id}
                          template={template}
                          onEdit={handleEdit}
                          onDelete={setShowDeleteConfirm}
                        />
                      )
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="mt-8">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl py-20 text-center border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-100">
                    <FiBriefcase className="text-[#FFCA00] w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No bank accounts found</h3>
                  <p className="text-gray-500 max-w-xs mx-auto mb-8 font-medium">
                    {searchTerm || filterType !== "all"
                      ? "No records match your search criteria. Try adjusting your filters."
                      : "You haven't added any bank account templates yet."}
                  </p>
                  <button
                    onClick={() => setIsDialogOpen(true)}
                    className="px-6 py-2 bg-[#FFCA00] text-white rounded-lg text-sm font-bold mx-auto hover:bg-[#d9ac00]"
                  >
                    Add Your First Account
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingTemplate ? "Edit Bank Account" : "Add New Bank Account"}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Bank Name"
              required
              error={formErrors.bank_name}
              value={formData.bank_name}
              onChange={(e) => handleInputChange("bank_name", e.target.value)}
              options={bankOptions.map(bank => ({ value: bank, label: bank }))}
              placeholder="Select Bank Name"
            />

            <SelectField
              label="Account Type"
              required
              error={formErrors.acc_type}
              value={formData.acc_type}
              onChange={(e) => handleInputChange("acc_type", e.target.value)}
              options={accountTypes.map(type => ({ value: type, label: type }))}
              placeholder="Select Account Type"
            />

            <InputField
              label="Account Number"
              required
              error={formErrors.acc_no}
              value={formData.acc_no}
              onChange={(e) => handleInputChange("acc_no", e.target.value.replace(/\D/g, ""))}
              placeholder="Enter Account Number"
              maxLength={18}
              icon={FiCreditCard}
            />

            <InputField
              label="Confirm Account Number"
              required
              error={formErrors.confirm_acc_no}
              value={formData.confirm_acc_no}
              onChange={(e) => handleInputChange("confirm_acc_no", e.target.value.replace(/\D/g, ""))}
              placeholder="Re-enter Account Number"
              maxLength={18}
              icon={FiRefreshCw}
            />

            <InputField
              label="IFSC Code"
              required
              error={formErrors.ifsc}
              value={formData.ifsc}
              onChange={(e) => handleInputChange("ifsc", e.target.value.toUpperCase())}
              placeholder="Enter IFSC Code"
              maxLength={11}
              icon={FiBriefcase}
            />

            <InputField
              label="Branch Name"
              required
              error={formErrors.branch}
              value={formData.branch}
              onChange={(e) => handleInputChange("branch", e.target.value)}
              placeholder="Enter Branch Name"
              icon={FiMapPin}
            />

            <InputField
              label="Account Holder Name"
              required
              error={formErrors.acc_holder}
              value={formData.acc_holder}
              onChange={(e) => handleInputChange("acc_holder", e.target.value)}
              placeholder="Enter Holder Name"
              icon={FiUser}
            />

            <InputField
              label="Mobile Number"
              required
              error={formErrors.mobile}
              value={formData.mobile}
              onChange={(e) => handleInputChange("mobile", e.target.value.replace(/\D/g, ""))}
              placeholder="Enter Mobile Number"
              maxLength={10}
              icon={FiPhone}
            />

            <div className="md:col-span-2">
              <InputField
                label="Email ID"
                required
                error={formErrors.email}
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter Email Address"
                type="email"
                icon={FiMail}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="px-6 py-2 bg-[#FFCA00] text-white text-sm font-bold rounded hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] hover:bg-[#d9ac00]"
            >
              {actionLoading ? (
                <div className="flex items-center gap-2">
                  <FiRefreshCw className="animate-spin" />
                  <span>{editingTemplate ? "Updating..." : "Adding..."}</span>
                </div>
              ) : (
                editingTemplate ? "Update Account" : "Add Account"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FiTrash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Bank Account</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">
                Are you sure you want to delete this bank account template? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
              >
                {actionLoading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankTemplatesManager;