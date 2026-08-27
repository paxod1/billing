"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import Pagination from "@/components/commonComp/Pagination";
import { authRequest } from "@/lib/axiosCreate";
import { showToast } from "@/lib/features/toast/toastSlice";

// Lucide and React Icons
import {
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiCheckCircle,
  FiX,
  FiDownload,
  FiSave,
  FiUserPlus,
  FiRefreshCw,
  FiUsers,
  FiFileText,
  FiChevronDown,
  FiCheck,
  FiSearch
} from "react-icons/fi";

// ----------------------------------------------------------------------
// UI Components
// ----------------------------------------------------------------------

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-4xl" }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} transform transition-all scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <FiX size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

const CustomButton = ({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
  size = "md"
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#FFCA00] text-white hover:bg-[#d9ac00]",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border-2 border-[#FFCA00] text-[#FFCA00] hover:bg-[#FFCA00]/5",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-500 hover:bg-gray-100"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const CustomInput = ({ label, error, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
    <input
      {...props}
      className={`w-full px-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-sm
        ${error ? "border-red-500" : "border-gray-200"} ${props.className || ""}`}
    />
  </div>
);

const CustomCheckbox = ({ id, checked, onChange, label }) => (
  <div className="flex items-center gap-2">
    <div
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all
        ${checked ? "bg-[#FFCA00] border-[#FFCA00]" : "border-gray-300 bg-white"}`}
    >
      {checked && <FiCheck className="text-white text-xs" />}
    </div>
    {label && <label htmlFor={id} className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => onChange(!checked)}>{label}</label>}
  </div>
);

const CustomSelect = ({ label, options, value, onChange, placeholder = "Select...", error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value || opt === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={containerRef}>
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 cursor-pointer flex items-center justify-between transition-all text-sm
          ${error ? "border-red-500" : "border-gray-200"} ${isOpen ? "ring-2 ring-[#FFCA00] bg-white" : ""}`}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
          {selectedOption ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) : placeholder}
        </span>
        <FiChevronDown className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} size={18} />
      </div>

      {isOpen && (
        <div className="absolute z-[1100] mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((opt, idx) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <div
                key={idx}
                onClick={() => {
                  onChange(val);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-gray-50
                  ${val === value ? "bg-yellow-50 text-[#FFCA00] font-bold" : "text-gray-700"}`}
              >
                {lbl}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CustomTabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer
          ${activeTab === tab.id
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
      >
        {tab.icon && tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);

const PaymentBeneficiaryFlow = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [openPayeeSelect, setOpenPayeeSelect] = useState(false);
  const [openImportSelect, setOpenImportSelect] = useState(false);
  const [selectedPayeeLists, setSelectedPayeeLists] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [templateSelectOpen, setTemplateSelectOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [individualSelectValue, setIndividualSelectValue] = useState("");
  const [editingField, setEditingField] = useState(null);
  const [newFieldValue, setNewFieldValue] = useState("");

  // New state for the main beneficiary selection modal
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);
  const [beneficiaryTab, setBeneficiaryTab] = useState("select-payee");

  // API state
  const [payeeLists, setPayeeLists] = useState({});
  const [allEmployees, setAllEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [templateTableData, setTemplateTableData] = useState(null);
  const [templateFields, setTemplateFields] = useState([]);
  const [templateOptions, setTemplateOptions] = useState({});
  const [templateStaticFields, setTemplateStaticFields] = useState({});

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [filteredPayeeLists, setFilteredPayeeLists] = useState({});

  // Fetch payee lists when beneficiary modal opens
  useEffect(() => {
    if (beneficiaryModalOpen) {
      fetchPayeeLists();
    }
  }, [beneficiaryModalOpen]);

  // Fetch payment templates when template select dialog opens
  useEffect(() => {
    if (templateSelectOpen) {
      fetchPaymentTemplates();
    }
  }, [templateSelectOpen]);

  // Enhanced filtering logic
  useEffect(() => {
    if (allEmployees.length === 0) return;

    const filterEmployees = (employees) => {
      return employees.filter(employee => {
        const matchesSearch = !searchTerm ||
          employee.ben_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.ben_code?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment = departmentFilter === "all" ||
          employee.category === departmentFilter;

        return matchesSearch && matchesDepartment;
      });
    };

    // Filter all employees for individual selection
    setFilteredEmployees(filterEmployees(allEmployees));

    // Filter payee lists
    const filtered = {};
    Object.entries(payeeLists).forEach(([listName, employees]) => {
      const filteredList = filterEmployees(employees);
      if (filteredList.length > 0) {
        filtered[listName] = filteredList;
      }
    });
    setFilteredPayeeLists(filtered);
  }, [searchTerm, departmentFilter, allEmployees, payeeLists]);

  // Get unique departments for filter dropdown
  const uniqueDepartments = [...new Set(allEmployees.map(emp => emp.category).filter(Boolean))];

  // API: Fetch payee lists and organize by categories
  const fetchPayeeLists = async () => {
    try {
      setLoading(true);
      const response = await authRequest.get("/api/payor/payee-list/");

      if (response.data && response.data.results) {
        const listsData = {};
        const allEmployeesList = [];
        const categoryMap = new Map();

        // Process all payees and organize by categories
        response.data.results.forEach(payee => {
          // Create employee object
          const employee = {
            id: payee.id,
            payee_id: payee.id,
            ben_name: payee.ben_name,
            ben_code: payee.ben_code,
            email: payee.email,
            contact: payee.contact,
            payee_type: payee.payee_type,
            acc_no: payee.acc_no,
            bank_name: payee.bank_name,
            branch: payee.branch,
            ifsc: payee.ifsc,
            iban: payee.iban,
            swift_code: payee.swift_code,
            sort_code: payee.sort_code,
            bank_account_type: payee.bank_account_type,
            add1: payee.add1,
            add2: payee.add2,
            city: payee.city,
            state: payee.state,
            zipcode: payee.zipcode,
            referralcode: payee.referralcode,
            is_active: payee.is_active,
            is_confirmed: payee.is_confirmed,
            // Store all categories for this payee
            all_categories: payee.categories || []
          };

          allEmployeesList.push(employee);

          // Organize payees by their categories
          if (payee.categories && payee.categories.length > 0) {
            payee.categories.forEach(category => {
              const categoryName = category.category;
              if (!listsData[categoryName]) {
                listsData[categoryName] = [];
              }
              // Add employee to this category list
              listsData[categoryName].push({
                ...employee,
                category: categoryName // Set the specific category for this list
              });
            });
          } else {
            // If no categories, add to "Uncategorized" list
            const uncategorized = "Uncategorized";
            if (!listsData[uncategorized]) {
              listsData[uncategorized] = [];
            }
            listsData[uncategorized].push({
              ...employee,
              category: uncategorized
            });
          }
        });

        setPayeeLists(listsData);
        setAllEmployees(allEmployeesList);
      }
    } catch (error) {
      console.error("Error fetching payee lists:", error);
      dispatch(
        showToast({
          message: "Failed to load payee lists",
          type: "error"
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // API: Fetch payment templates
  const fetchPaymentTemplates = async () => {
    try {
      const response = await authRequest.get("/api/payorstaff/templates/?type=payment");

      if (response.data && response.data.results) {
        // Transform API response to match our expected format
        const transformedTemplates = response.data.results.map(template => ({
          id: template.id.toString(),
          name: template.name,
          description: `Template with dynamic fields: ${Object.keys(template.dynamic_fields || {}).join(', ')}`,
          fields: Object.keys(template.dynamic_fields || {}),
          templateData: template,
          dynamic_fields: template.dynamic_fields || {},
          static_fields: template.static_fields || {},
          options: template.options || {}
        }));

        setTemplates(transformedTemplates);
      }
    } catch (error) {
      console.error("Error fetching payment templates:", error);
      dispatch(
        showToast({
          message: "Failed to load payment templates",
          type: "error"
        })
      );
    }
  };

  // API: Fetch table data for selected payees
  const fetchTableData = async (payeeIds) => {
    try {
      setTableLoading(true);
      const response = await authRequest.post("/api/payorstaff/payees_lists/", {
        payees: payeeIds
      });

      if (response.data && response.data.results) {
        // Use the API response data directly - no frontend modifications
        setTableData(response.data.results);
        setTemplateTableData(null); // Reset template data when showing basic payee data
        setTemplateFields([]); // Reset template fields
        setTemplateOptions({}); // Reset template options
        setTemplateStaticFields({}); // Reset template static fields
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
      dispatch(
        showToast({
          message: "Failed to load payee details",
          type: "error"
        })
      );
    } finally {
      setTableLoading(false);
    }
  };

  // API: Fetch template-based table data
  const fetchTemplateTableData = async (payeeIds, templateId) => {
    try {
      setTableLoading(true);
      const response = await authRequest.post("/api/payorstaff/template_payees/", {
        payees: payeeIds,
        template_id: templateId
      });

      if (response.data) {
        setTemplateTableData(response.data);

        // Process the new template data structure
        const selectedTemplate = templates.find(t => t.id === templateId);
        if (selectedTemplate) {
          // Use the field_order from template if available
          const fieldOrder = response.data.template?.field_order || [];

          // Extract dynamic fields
          const dynamicFields = Object.entries(selectedTemplate.dynamic_fields || {}).map(([field, mapping]) => ({
            name: field,
            mapping: mapping,
            type: 'dynamic'
          }));

          // Extract static fields
          const staticFields = Object.entries(selectedTemplate.static_fields || {}).map(([field, defaultValue]) => ({
            name: field,
            defaultValue: defaultValue,
            type: 'static'
          }));

          // Extract option fields
          const optionFields = Object.entries(selectedTemplate.options || {}).map(([field, options]) => ({
            name: field,
            options: options,
            type: 'option'
          }));

          // Combine all fields but respect the field_order
          const allFields = [...dynamicFields, ...staticFields, ...optionFields];
          setTemplateFields(allFields);

          // Store options separately for easy access
          setTemplateOptions(selectedTemplate.options || {});

          // Store static fields separately for easy access
          setTemplateStaticFields(selectedTemplate.static_fields || {});

          // Process results data - ensure all fields are present
          if (response.data.results) {
            const processedResults = response.data.results.map((result, index) => {
              const processedResult = {
                ...result,
                // Add payee_id from the original payeeIds array
                payee_id: result.payee_id || result.id || payeeIds[index]
              };

              // Ensure all dynamic fields are present
              dynamicFields.forEach(field => {
                if (!(field.name in processedResult)) {
                  processedResult[field.name] = null;
                }
              });

              // Ensure all static fields are present with their default values
              staticFields.forEach(field => {
                if (!(field.name in processedResult)) {
                  processedResult[field.name] = field.defaultValue;
                }
              });

              // Ensure all option fields are present with first option as default
              optionFields.forEach(field => {
                if (!(field.name in processedResult)) {
                  processedResult[field.name] = field.options && field.options.length > 0 ? field.options[0] : null;
                } else {
                  const currentValue = processedResult[field.name];
                  if (Array.isArray(currentValue) && currentValue.length > 0) {
                    processedResult[field.name] = currentValue[0];
                  } else if (!currentValue || currentValue === '') {
                    processedResult[field.name] = field.options && field.options.length > 0 ? field.options[0] : null;
                  }
                }
              });

              return processedResult;
            });

            setTableData(processedResults);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching template table data:", error);
      dispatch(
        showToast({
          message: "Failed to load template data",
          type: "error"
        })
      );
    } finally {
      setTableLoading(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId) => {
    if (!templateId) return;

    setSelectedBank(templateId);
    setSelectedTemplate(templateId);

    // Extract payee IDs from selected employees
    const payeeIds = selectedEmployees.map(emp => emp.payee_id || emp.id);

    if (payeeIds.length > 0) {
      await fetchTemplateTableData(payeeIds, templateId);

      dispatch(
        showToast({
          message: `Template data loaded successfully!`,
          type: "success"
        })
      );
    }

    setTemplateSelectOpen(false);
  };

  // Handle template change
  const handleTemplateChange = async (templateId) => {
    if (!templateId || templateId === selectedTemplate) return;

    setSelectedBank(templateId);
    setSelectedTemplate(templateId);

    // Extract payee IDs from selected employees
    const payeeIds = selectedEmployees.map(emp => emp.payee_id || emp.id);

    if (payeeIds.length > 0) {
      await fetchTemplateTableData(payeeIds, templateId);

      dispatch(
        showToast({
          message: `Template changed to ${templates.find(t => t.id === templateId)?.name}!`,
          type: "success"
        })
      );
    }

    setTemplateSelectOpen(false);
  };

  // Clear template selection
  const handleClearTemplate = () => {
    setSelectedTemplate("");
    setSelectedBank("");
    setTemplateTableData(null);
    setTemplateFields([]);
    setTemplateOptions({});
    setTemplateStaticFields({});

    // Reload basic payee data
    const payeeIds = selectedEmployees.map(emp => emp.payee_id || emp.id);
    if (payeeIds.length > 0) {
      fetchTableData(payeeIds);
    }

    dispatch(
      showToast({
        message: "Template cleared successfully!",
        type: "success"
      })
    );
  };

  // Handle multiple payee list selection
  const handlePayeeListSelect = (listName) => {
    const isCurrentlySelected = selectedPayeeLists.includes(listName);

    if (isCurrentlySelected) {
      setSelectedPayeeLists(selectedPayeeLists.filter(list => list !== listName));
      const employeesToRemove = payeeLists[listName];
      setSelectedEmployees(prev =>
        prev.filter(emp => !employeesToRemove.some(remove => remove.id === emp.id))
      );
    } else {
      setSelectedPayeeLists([...selectedPayeeLists, listName]);
      const newEmployees = payeeLists[listName];

      setSelectedEmployees(prev => {
        const existingIds = prev.map(emp => emp.id);
        const uniqueNewEmployees = newEmployees.filter(emp => !existingIds.includes(emp.id));
        return [...prev, ...uniqueNewEmployees];
      });
    }
  };

  // Handle individual employee selection from dropdown
  const handleIndividualSelect = (employeeId) => {
    if (!employeeId) return;

    const employee = allEmployees.find(emp => emp.id === parseInt(employeeId));
    if (!employee) return;

    const isSelected = selectedEmployees.some(emp => emp.id === employee.id);

    if (isSelected) {
      setSelectedEmployees(prev => prev.filter(emp => emp.id !== employee.id));
      dispatch(
        showToast({
          message: `${employee.ben_name} removed from selection!`,
          type: "info"
        })
      );
    }

    setIndividualSelectValue("");
  };

  // Handle employee selection from import
  const handleEmployeeSelect = (employee, source = "import") => {
    const isSelected = selectedEmployees.some((emp) => emp.id === employee.id);
    if (isSelected) {
      setSelectedEmployees(prev => prev.filter(emp => emp.id !== employee.id));
    } else {
      setSelectedEmployees(prev => [...prev, employee]);
    }
  };

  // Handle field editing for template data
  const handleFieldEdit = (employeeIndex, fieldName, currentValue) => {
    setEditingField({ employeeIndex, fieldName });
    setNewFieldValue(currentValue?.toString() || "");
  };

  // Save edited field value
  const saveFieldValue = () => {
    if (!editingField) return;

    const { employeeIndex, fieldName } = editingField;

    if (templateTableData) {
      // Update template table data
      const updatedResults = [...tableData];
      updatedResults[employeeIndex] = {
        ...updatedResults[employeeIndex],
        [fieldName]: newFieldValue
      };
      setTableData(updatedResults);
      setTemplateTableData({
        ...templateTableData,
        results: updatedResults
      });
    } else {
      // Update regular table data
      setTableData(
        tableData.map((emp, index) =>
          index === employeeIndex
            ? { ...emp, [fieldName]: newFieldValue }
            : emp
        )
      );
    }

    dispatch(
      showToast({ message: "Field updated successfully!", type: "success" })
    );
    setEditingField(null);
    setNewFieldValue("");
  };

  // Handle option field change
  const handleOptionChange = (employeeIndex, fieldName, newValue) => {
    if (templateTableData) {
      // Update template table data
      const updatedResults = [...tableData];
      updatedResults[employeeIndex] = {
        ...updatedResults[employeeIndex],
        [fieldName]: newValue // This should now be a single value, not an array
      };
      setTableData(updatedResults);
      setTemplateTableData({
        ...templateTableData,
        results: updatedResults
      });
    }
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedEmployees([]);
    setSelectedPayeeLists([]);
    setShowPreview(false);
    setSelectedBank("");
    setSelectedTemplate("");
    setTableData([]);
    setTemplateTableData(null);
    setTemplateFields([]);
    setTemplateOptions({});
    setTemplateStaticFields({});
  };

  // Remove individual employee
  const removeEmployee = (employeeId) => {
    setSelectedEmployees(prev => prev.filter(emp => emp.id !== employeeId));

    if (templateTableData) {
      // Remove from template table data
      const updatedResults = tableData.filter((emp, index) => index !== employeeId);
      setTableData(updatedResults);
      setTemplateTableData({
        ...templateTableData,
        results: updatedResults
      });
    } else {
      // Remove from regular table data
      setTableData(prev => prev.filter(emp => emp.id !== employeeId));
    }

    const employeeToRemove = selectedEmployees.find(emp => emp.id === employeeId);
    if (employeeToRemove) {
      Object.entries(payeeLists).forEach(([listName, employees]) => {
        if (employees.some(emp => emp.id === employeeId)) {
          const remainingFromThisList = selectedEmployees.filter(emp =>
            employees.some(listEmp => listEmp.id === emp.id) && emp.id !== employeeId
          );

          if (remainingFromThisList.length === 0) {
            setSelectedPayeeLists(prev => prev.filter(list => list !== listName));
          }
        }
      });
    }

    if (selectedEmployees.length <= 1) {
      setShowPreview(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    setDownloadDialogOpen(true);
  };

  // Prepare API payload for save and download
  const prepareApiPayload = () => {
    if (!selectedTemplate || !fileName) return null;

    const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
    if (!selectedTemplateData) return null;

    // Get static fields and their default values
    const staticFieldsData = selectedTemplateData.static_fields || {};

    // Get option fields and their default values (first option)
    const optionFieldsData = selectedTemplateData.options || {};
    const defaultOptionValues = {};
    Object.entries(optionFieldsData).forEach(([field, options]) => {
      if (options && options.length > 0) {
        defaultOptionValues[field] = options[0]; // First option as default
      }
    });

    // Prepare payees data with static_fields and options_data
    const payeesData = tableData.map((employee, index) => {
      const payeeId = employee.payee_id || employee.id;

      if (!payeeId) {
        console.error(`No payee_id found for employee at index ${index}:`, employee);
        return null;
      }

      const payeeData = {
        payee_id: payeeId
      };

      // Add static_fields if any static field has been modified or has default value
      const staticFields = {};
      templateFields
        .filter(field => field.type === 'static')
        .forEach(field => {
          const currentValue = employee[field.name];
          const defaultValue = staticFieldsData[field.name];

          // Include static field if it's different from default OR if it has a value
          if (currentValue !== defaultValue || (currentValue && currentValue !== '')) {
            staticFields[field.name] = currentValue;
          }
        });

      if (Object.keys(staticFields).length > 0) {
        payeeData.static_fields = staticFields;
      }

      // Add options_data if any option field has been modified or has default value
      const optionsData = {};
      templateFields
        .filter(field => field.type === 'option')
        .forEach(field => {
          const currentValue = employee[field.name];
          const defaultValue = defaultOptionValues[field.name];

          // FIX: Always include option field if it has a value (even if it's the default)
          // This ensures the default first option is sent when user doesn't change it
          if (currentValue && currentValue !== '') {
            optionsData[field.name] = currentValue;
          }
          // Also include if it's different from default (user changed it)
          else if (currentValue !== defaultValue) {
            optionsData[field.name] = currentValue;
          }
        });

      if (Object.keys(optionsData).length > 0) {
        payeeData.options_data = optionsData;
      }

      return payeeData;
    }).filter(Boolean); // Remove any null entries

    const payload = {
      batch_name: fileName,
      payees: payeesData
    };

    return payload;
  };

  // Handle save and download
  const handleSaveAndDownload = async () => {
    if (!fileName) {
      dispatch(
        showToast({
          message: "Please enter a file name",
          type: "error"
        })
      );
      return;
    }

    if (!selectedTemplate) {
      dispatch(
        showToast({
          message: "Please select a template first",
          type: "error"
        })
      );
      return;
    }

    try {
      setSaveLoading(true);

      // Prepare API payload
      const payload = prepareApiPayload();
      if (!payload) {
        throw new Error("Failed to prepare API payload");
      }

      // Check if payees array is empty
      if (!payload.payees || payload.payees.length === 0) {
        throw new Error("No valid payee data found");
      }

      // Get selected template
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

      if (!selectedTemplateData) {
        throw new Error("Selected template not found");
      }

      // API: Save payees to template with new payload structure
      const saveResponse = await authRequest.post(
        `/api/payorstaff/templates/${selectedTemplateData.templateData.id}/add_payees/`,
        payload
      );

      if (saveResponse.status === 200 || saveResponse.status === 201) {
        dispatch(
          showToast({
            message: "Payees saved successfully! Starting download...",
            type: "success"
          })
        );

        // API: Download the file
        const downloadResponse = await authRequest.get(
          `/api/payorstaff/templates/${fileName}/download_excel/`,
          {
            responseType: 'blob'
          }
        );

        // Create download link
        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        dispatch(
          showToast({
            message: "File downloaded successfully!",
            type: "success"
          })
        );
        clearSelection();

        setDownloadDialogOpen(false);
        setFileName("");
      }

    } catch (error) {
      console.error("Error saving and downloading:", error);

      if (error.response?.status === 400) {
        const errorData = error.response.data;
        console.error("Validation errors:", errorData);

        dispatch(
          showToast({
            message: errorData.detail || "Batch name already exists. Please choose a different name.",
            type: "error"
          })
        );
      } else {
        dispatch(
          showToast({
            message: error.message || "Failed to save and download file",
            type: "error"
          })
        );
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle beneficiary modal save
  const handleBeneficiaryModalSave = async () => {
    if (selectedEmployees.length > 0) {
      // Extract payee IDs from selected employees
      const payeeIds = selectedEmployees.map(emp => emp.payee_id || emp.id);

      // Fetch table data from API
      await fetchTableData(payeeIds);

      setShowPreview(true);
      setBeneficiaryModalOpen(false);
      dispatch(
        showToast({
          message: `${selectedEmployees.length} beneficiaries selected successfully!`,
          type: "success"
        })
      );
    } else {
      dispatch(
        showToast({
          message: "Please select at least one beneficiary!",
          type: "error"
        })
      );
    }
  };

  // Employee List Component (Replacement for CommandList)
  const EmployeeCommandList = ({ employees, onSelect, placeholder }) => (
    <div className="flex flex-col gap-2">
      <div className="relative mb-2">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto pr-1">
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No employees found.</div>
        ) : (
          <div className="flex flex-col gap-1">
            {employees.map((employee) => (
              <div
                key={employee.id}
                onClick={() => {
                  onSelect(employee);
                }}
                className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-sm group-hover:text-[#FFCA00] transition-colors">
                    {employee.ben_name}
                  </span>
                  <span className="text-xs text-gray-500">{employee.email}</span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {employee.category} • {employee.ben_code}
                  </span>
                </div>
                {selectedEmployees.some((emp) => emp.id === employee.id) && (
                  <FiCheckCircle className="h-5 w-5 text-[#FFCA00]" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Function to get table headers based on template field_order
  const getTableHeaders = () => {
    if (tableData.length === 0) return [];

    if (templateTableData) {
      // For template data, use the field_order from template
      if (templateTableData.template?.field_order) {
        return templateTableData.template.field_order;
      }

      // Fallback to templateFields if field_order not available
      return templateFields.map(field => field.name);
    } else {
      // For regular payee data - use the original logic
      const allFields = Object.keys(tableData[0]);

      const fieldsToExclude = ['id', 'payor', 'categories', 'is_active', 'is_confirmed'];

      const availableFields = allFields.filter(field => {
        if (fieldsToExclude.includes(field)) return false;

        return tableData.some(row => {
          const value = row[field];
          return value !== null && value !== undefined && value !== '' && value !== 'null';
        });
      });

      const fieldDisplayNames = {
        ben_code: "Beneficiary Code",
        ben_name: "Name",
        email: "Email",
        contact: "Contact",
        payee_type: "Payee Type",
        acc_no: "Account Number",
        bank_name: "Bank Name",
        branch: "Branch",
        ifsc: "IFSC Code",
        iban: "IBAN",
        swift_code: "SWIFT Code",
        sort_code: "Sort Code",
        bank_account_type: "Account Type",
        add1: "Address 1",
        add2: "Address 2",
        city: "City",
        state: "State",
        zipcode: "Zip Code",
        referralcode: "Referral Code"
      };

      return availableFields.map(field => fieldDisplayNames[field] || field);
    }
  };

  // Function to get the actual field names from display names
  const getFieldNameFromDisplay = (displayName) => {
    const fieldMapping = {
      "Beneficiary Code": "ben_code",
      "Name": "ben_name",
      "Email": "email",
      "Contact": "contact",
      "Payee Type": "payee_type",
      "Account Number": "acc_no",
      "Bank Name": "bank_name",
      "Branch": "branch",
      "IFSC Code": "ifsc",
      "IBAN": "iban",
      "SWIFT Code": "swift_code",
      "Sort Code": "sort_code",
      "Account Type": "bank_account_type",
      "Address 1": "add1",
      "Address 2": "add2",
      "City": "city",
      "State": "state",
      "Zip Code": "zipcode",
      "Referral Code": "referralcode"
    };

    return fieldMapping[displayName] || displayName;
  };

  const getFieldDisplayName = (fieldName) => {
    if (!templateTableData) return fieldName;

    // Use the field_order names as they are, or create a mapping if needed
    const fieldMapping = {
      "ben code": "Beneficiary Code",
      "ben name": "Name",
      "add 1": "Address 1",
      "add 2": "Address 2",
      "ben_code": "Beneficiary Code",
      "ben_name": "Name",
      "add1": "Address 1",
      "add2": "Address 2"
    };

    return fieldMapping[fieldName] || fieldName;
  };

  // Function to check if field is editable
  const isFieldEditable = (fieldName) => {
    if (!templateTableData) return false;

    const fieldConfig = templateFields.find(field => field.name === fieldName);
    if (!fieldConfig) return false;

    // Static fields are always editable
    if (fieldConfig.type === 'static') return true;

    // Option fields are editable via dropdown
    if (fieldConfig.type === 'option') return true;

    return false;
  };

  // Function to get field options
  const getFieldOptions = (fieldName) => {
    const fieldConfig = templateFields.find(field => field.name === fieldName);
    return fieldConfig?.options || [];
  };

  // Function to check if field is an option field
  const isOptionField = (fieldName) => {
    const fieldConfig = templateFields.find(field => field.name === fieldName);
    return fieldConfig?.type === 'option';
  };

  // Function to check if field is a static field
  const isStaticField = (fieldName) => {
    const fieldConfig = templateFields.find(field => field.name === fieldName);
    return fieldConfig?.type === 'static';
  };

  // Function to get default value for option field
  const getDefaultOptionValue = (fieldName) => {
    const options = getFieldOptions(fieldName);
    return options && options.length > 0 ? options[0] : "";
  };

  // Function to get current value for a field with proper fallback
  const getCurrentFieldValue = (employee, fieldName) => {
    let value = employee[fieldName];

    // If value is an array, use the first element (for option fields)
    if (Array.isArray(value) && value.length > 0) {
      value = value[0];
    }

    // If value doesn't exist or is empty, use default for option fields
    if ((!value || value === '' || value === 'null') && isOptionField(fieldName)) {
      return getDefaultOptionValue(fieldName);
    }

    // If value exists and is not empty, return it
    if (value !== null && value !== undefined && value !== '' && value !== 'null') {
      return value;
    }

    // For static fields, return the static field default value
    if (isStaticField(fieldName)) {
      const fieldConfig = templateFields.find(field => field.name === fieldName);
      return fieldConfig?.defaultValue || "";
    }

    return value || "";
  };

  // Function to render table cell content with enhanced template functionality
  const renderTableCell = (employee, fieldName, employeeIndex) => {
    const currentValue = getCurrentFieldValue(employee, fieldName);

    const getDisplayValue = (val) => {
      if (val === null || val === undefined || val === '' || val === 'null') return "N/A";
      if (typeof val === "boolean") return val ? "Yes" : "No";
      if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "None";
      return val.toString();
    };

    const displayValue = getDisplayValue(currentValue);

    // Check if this field is editable in template mode
    const isEditable = templateTableData && isFieldEditable(fieldName);
    const isOption = isOptionField(fieldName);
    const isStatic = isStaticField(fieldName);
    const fieldOptions = getFieldOptions(fieldName);

    // Special formatting for editable template fields
    if (isEditable) {
      if (isOption && fieldOptions.length > 0) {
        // Get the current value or use first option as default
        const selectedValue = currentValue || (fieldOptions.length > 0 ? fieldOptions[0] : "");

        return (
          <div className="flex items-center gap-1 sm:gap-2">
            <CustomSelect
              value={selectedValue}
              onChange={(newValue) => handleOptionChange(employeeIndex, fieldName, newValue)}
              options={fieldOptions.map(opt => ({ label: opt, value: opt }))}
            />
          </div>
        );
      } else if (isStatic) {
        // Editable input for static fields
        return (
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="font-medium flex-1 text-xs sm:text-sm">
              {displayValue}
            </span>
            <button
              onClick={() => handleFieldEdit(employeeIndex, fieldName, currentValue)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#FFCA00] hover:bg-yellow-50 transition-all cursor-pointer"
            >
              <FiEdit3 size={14} />
            </button>
          </div>
        );
      }
    }

    // Special formatting for certain fields in non-template mode
    switch (fieldName) {
      case "ben_code":
        return <span className="text-xs sm:text-sm font-mono font-medium text-gray-600">{displayValue}</span>;
      case "ben_name":
        return (
          <div>
            <div className="font-bold text-gray-900 text-xs sm:text-sm">{displayValue}</div>
            {employee.referralcode && employee.referralcode !== 'null' && (
              <div className="text-[10px] text-[#FFCA00] font-bold">Ref: {employee.referralcode}</div>
            )}
          </div>
        );
      case "payee_type":
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentValue === 'INTERNATIONAL'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-blue-100 text-blue-700'
            }`}>
            {displayValue}
          </span>
        );
      case "acc_no":
      case "ifsc":
      case "iban":
      case "swift_code":
      case "sort_code":
        return <span className="text-xs sm:text-sm font-mono text-gray-600">{displayValue}</span>;
      default:
        return <span className="text-xs sm:text-sm text-gray-700">{displayValue}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col">
      <Navbar data={{
        heading: "Payment Processing",
        subheading: "Select beneficiaries and configure payment templates",
        from: "paymagics"
      }} />

      <main className="flex-1 py-10 flex flex-col items-center">
        <div className="w-full ">
          {/* Main Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Payment
              </h1>
              <p className="text-gray-500 font-medium">
                Choose beneficiaries and apply processing templates
              </p>
            </div>
            <div className="flex items-center gap-4">
              {selectedEmployees.length > 0 && (
                <div className="bg-yellow-50 text-[#FFCA00] px-4 py-2 rounded-xl text-sm font-bold border border-yellow-200 animate-in fade-in zoom-in duration-300">
                  {selectedEmployees.length} Beneficiaries Selected
                </div>
              )}
              <CustomButton
                onClick={() => setBeneficiaryModalOpen(true)}
                className="flex items-center gap-2"
              >
                <FiPlus size={20} />
                Select Beneficiaries
              </CustomButton>
            </div>
          </div>

          {/* Enhanced Empty State Design */}
          {!showPreview && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 sm:p-20 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mb-8">
                <FiUserPlus className="h-10 w-10 text-[#FFCA00]" />
              </div>

              <div className="max-w-md space-y-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  No Beneficiaries Selected
                </h3>
                <p className="text-gray-500 font-medium">
                  Start by choosing beneficiaries from your categorized payee lists or select them individually.
                </p>

                <div className="pt-6">
                  <CustomButton
                    onClick={() => setBeneficiaryModalOpen(true)}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <FiPlus className="mr-2" size={20} />
                    Select Beneficiaries
                  </CustomButton>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 text-sm text-gray-400 font-medium">
                  <div className="flex items-center gap-2">
                    <FiUsers size={16} />
                    <span>Choose from Payee list</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiFileText size={16} />
                    <span>Select individually</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {showPreview && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Preview</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-medium">
                      <span>{tableData.length} Beneficiaries</span>
                      {selectedTemplate && (
                        <div className="flex items-center gap-2 text-[#FFCA00]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FFCA00] hover:bg-[#d9ac00]" />
                          <span>Template: {templates.find(t => t.id === selectedTemplate)?.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <CustomButton
                      variant="outline"
                      size="sm"
                      onClick={() => setBeneficiaryModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <FiEdit3 size={16} />
                      Edit Selection
                    </CustomButton>

                    <CustomButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setTemplateSelectOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <FiFileText size={16} />
                      {selectedTemplate ? "Change Template" : "Select Template"}
                    </CustomButton>

                    {selectedTemplate && (
                      <>
                        <CustomButton
                          variant="danger"
                          size="sm"
                          onClick={handleClearTemplate}
                          className="flex items-center gap-2 !bg-red-50 !text-red-500 !border-red-100 hover:!bg-red-100"
                        >
                          <FiRefreshCw size={16} />
                          Clear Template
                        </CustomButton>
                        <CustomButton
                          variant="primary"
                          size="sm"
                          onClick={handleDownload}
                          className="flex items-center gap-2"
                        >
                          <FiDownload size={16} />
                          Download
                        </CustomButton>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="flex items-center gap-2 !text-red-400 hover:!bg-red-50"
                    >
                      <FiTrash2 size={16} />
                      Clear Selection
                    </CustomButton>
                  </div>

                  {selectedTemplate && (
                    <div className="px-4 py-2 bg-yellow-50 rounded-xl border border-yellow-100 text-xs font-bold text-[#FFCA00]">
                      Active Template: {templates.find(t => t.id === selectedTemplate)?.name}
                    </div>
                  )}
                </div>

                {/* Dynamic Table */}
                {tableLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Loader message="Loading details..." />
                  </div>
                ) : tableData.length > 0 ? (
                  <div className="relative border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            {getTableHeaders().map((header) => (
                              <th
                                key={header}
                                className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[150px]"
                              >
                                {templateTableData ? getFieldDisplayName(header) : header}
                              </th>
                            ))}
                            <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider w-20 text-center">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {tableData.map((employee, index) => (
                            <tr
                              key={templateTableData ? index : employee.id}
                              className="group hover:bg-gray-50/50 transition-colors"
                            >
                              {getTableHeaders().map((header) => {
                                const fieldName = templateTableData ? header : getFieldNameFromDisplay(header);
                                return (
                                  <td
                                    key={`${templateTableData ? index : employee.id}-${fieldName}`}
                                    className="px-6 py-5 align-top"
                                  >
                                    {renderTableCell(employee, fieldName, index)}
                                  </td>
                                );
                              })}
                              <td className="px-6 py-5 text-center align-top">
                                <button
                                  onClick={() => removeEmployee(templateTableData ? index : employee.id)}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <FiX size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center text-gray-400 font-medium">
                    No data available to display
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Beneficiary Selection Modal */}
      <Modal
        isOpen={beneficiaryModalOpen}
        onClose={() => setBeneficiaryModalOpen(false)}
        title="Select Beneficiaries"
      >
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader message="Fetching beneficiaries..." />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Search and Filter Section */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <CustomInput
                    label="Search Payees"
                    placeholder="Search by name, email, or beneficiary code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <CustomButton
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setDepartmentFilter('all');
                  }}
                  className="whitespace-nowrap h-[46px]"
                >
                  <FiX className="mr-2" />
                  Clear Filters
                </CustomButton>
              </div>

              <div className="flex items-center gap-6 mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <FiUsers size={14} className="text-[#FFCA00]" />
                  {filteredEmployees.length} Results Found
                </span>
                <span className="flex items-center gap-1.5">
                  <FiFileText size={14} className="text-[#FFCA00]" />
                  {Object.keys(filteredPayeeLists).length} Categories
                </span>
              </div>
            </div>

            <CustomTabs
              tabs={[
                { id: "select-payee", label: "Select by Category", icon: <FiUsers /> },
                { id: "import-list", label: "Select Individually", icon: <FiUserPlus /> }
              ]}
              activeTab={beneficiaryTab}
              onChange={setBeneficiaryTab}
            />

            {/* Content for Tabs */}
            {beneficiaryTab === "select-payee" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(filteredPayeeLists).length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                    <FiUsers className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">No categories match your search</p>
                  </div>
                ) : (
                  Object.entries(filteredPayeeLists).map(([categoryName, employees]) => (
                    <div
                      key={categoryName}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group
                        ${selectedPayeeLists.includes(categoryName)
                          ? "border-[#FFCA00] bg-yellow-50/30"
                          : "border-gray-100 hover:border-yellow-200 bg-white shadow-sm"}`}
                      onClick={() => handlePayeeListSelect(categoryName)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <CustomCheckbox
                            checked={selectedPayeeLists.includes(categoryName)}
                            onChange={() => { }} // Controlled by parent div click
                          />
                          <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-[#FFCA00] transition-colors">
                              {categoryName}
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">
                              {employees.length} members
                            </p>
                          </div>
                        </div>
                        {selectedPayeeLists.includes(categoryName) && (
                          <div className="bg-[#FFCA00] text-white p-1 rounded-full animate-in zoom-in duration-300 hover:bg-[#d9ac00]">
                            <FiCheck size={12} />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-top border-gray-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPayeeSelect(openPayeeSelect === categoryName ? false : categoryName);
                          }}
                          className="text-xs font-bold text-[#FFCA00] hover:underline flex items-center gap-1"
                        >
                          <FiSearch size={12} />
                          Preview Members
                        </button>
                      </div>

                      {/* Members Preview Popover (Simplified as a list inside the card if open) */}
                      {openPayeeSelect === categoryName && (
                        <div
                          className="mt-4 bg-white rounded-xl border border-gray-100 shadow-inner max-h-40 overflow-y-auto p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {employees.map(emp => (
                            <div key={emp.id} className="p-2 border-b border-gray-50 last:border-0 flex items-center justify-between text-xs transition-colors hover:bg-gray-50">
                              <span className="font-medium text-gray-700">{emp.ben_name}</span>
                              {selectedEmployees.some(selected => selected.id === emp.id) && (
                                <FiCheckCircle className="text-[#FFCA00]" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <EmployeeCommandList
                  employees={filteredEmployees}
                  onSelect={(emp) => handleEmployeeSelect(emp, 'import')}
                  placeholder="Search individual payees..."
                />
              </div>
            )}

            {/* Current Selection Footnote */}
            {selectedEmployees.length > 0 && (
              <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-[#FFCA00] flex items-center gap-2">
                    <FiCheckCircle />
                    Selected ({selectedEmployees.length})
                  </h4>
                  <button
                    onClick={clearSelection}
                    className="text-xs font-bold text-gray-400 hover:text-red-500"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEmployees.slice(0, 10).map(emp => (
                    <div key={emp.id} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 border border-gray-100 shadow-sm flex items-center gap-2">
                      {emp.ben_name}
                      <button
                        onClick={() => handleEmployeeSelect(emp, 'import')}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                  {selectedEmployees.length > 10 && (
                    <div className="bg-white/50 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 italic">
                      +{selectedEmployees.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <CustomButton variant="secondary" onClick={() => setBeneficiaryModalOpen(false)}>
                Cancel
              </CustomButton>
              <CustomButton
                onClick={handleBeneficiaryModalSave}
                disabled={selectedEmployees.length === 0}
                className="min-w-[150px]"
              >
                <FiSave className="mr-2" />
                Done
              </CustomButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Selection Modal */}
      <Modal
        isOpen={templateSelectOpen}
        onClose={() => setTemplateSelectOpen(false)}
        title={selectedTemplate ? "Change Template" : "Select Template"}
      >
        <div className="space-y-6">
          <p className="text-gray-500 font-medium">
            Choose a processing template to format your data for download.
          </p>

          <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {templates.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-gray-400">
                <FiRefreshCw className="animate-spin mb-4" size={24} />
                <p>Loading templates...</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 group
                    ${selectedTemplate === template.id
                      ? "border-[#FFCA00] bg-yellow-50/30"
                      : "border-gray-100 hover:border-yellow-200 bg-white"}`}
                  onClick={() => handleTemplateChange(template.id)}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1
                    ${selectedTemplate === template.id ? "bg-[#FFCA00] border-[#FFCA00]" : "border-gray-200"}`}>
                    {selectedTemplate === template.id && <FiCheck className="text-white" size={14} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 group-hover:text-[#FFCA00] transition-colors text-lg">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1 font-medium">{template.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <CustomButton variant="secondary" onClick={() => setTemplateSelectOpen(false)}>
              Cancel
            </CustomButton>
            <CustomButton
              onClick={() => {
                if (selectedTemplate) {
                  setTemplateSelectOpen(false);
                } else {
                  dispatch(showToast({ message: "Please select a template", type: "warning" }));
                }
              }}
              className="min-w-[150px]"
            >
              Apply Template
            </CustomButton>
          </div>
        </div>
      </Modal>

      {/* Field Edit Modal */}
      <Modal
        isOpen={editingField !== null}
        onClose={() => setEditingField(null)}
        title="Edit Field Value"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <CustomInput
            label={editingField?.fieldName}
            value={newFieldValue}
            onChange={(e) => setNewFieldValue(e.target.value)}
            placeholder={`Enter ${editingField?.fieldName}`}
          />
          <div className="flex justify-end gap-3 pt-4">
            <CustomButton variant="secondary" onClick={() => setEditingField(null)}>
              Cancel
            </CustomButton>
            <CustomButton onClick={saveFieldValue}>
              Save Changes
            </CustomButton>
          </div>
        </div>
      </Modal>

      {/* Download Modal */}
      <Modal
        isOpen={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        title="Download Confirmation"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <CustomInput
            label="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="e.g., Payment_Batch_Jan_20"
            required
          />

          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 italic text-sm text-blue-700">
            <p className="font-bold mb-1">Batch Summary:</p>
            <p>Template: {templates.find(t => t.id === selectedTemplate)?.name}</p>
            <p>Payees: {selectedEmployees.length}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <CustomButton variant="secondary" onClick={() => setDownloadDialogOpen(false)}>
              Back
            </CustomButton>
            <CustomButton
              onClick={handleSaveAndDownload}
              disabled={!fileName || saveLoading}
              className="min-w-[150px]"
            >
              {saveLoading ? (
                <>
                  <FiRefreshCw className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FiDownload className="mr-2" />
                  Download Excel
                </>
              )}
            </CustomButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentBeneficiaryFlow;