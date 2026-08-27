"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  FiUsers,
  FiFileText,
  FiEdit3,
  FiCheckCircle,
  FiX,
  FiDownload,
  FiSave,
  FiPlus,
  FiUserPlus,
  FiRefreshCw,
  FiArrowLeft,
  FiChevronDown,
  FiSearch,
  FiTrash2,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { authRequest } from "@/lib/axiosCreate";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";

// Custom UI Components
const CustomButton = ({ children, onClick, variant = "primary", className = "", disabled = false, size = "md", type = "button", title }) => {
  const variants = {
    primary: "bg-[#FFCA00] text-white cursor-pointer hover:bg-[#d9ac00]",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer",
    outline: "border border-[#FFCA00] text-[#FFCA00] hover:bg-[#FFCA00]/5 transition-colors cursor-pointer",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer",
    ghost: "text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-[14px]",
    lg: "px-6 py-2.5 text-[14px]",
    icon: "p-2",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

const CustomInput = ({ label, placeholder, value, onChange, type = "text", icon: Icon, error, className = "" }) => (
  <div className={`w-full ${className}`}>
    {label && <label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#FFCA00] transition-colors" size={16} />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors placeholder:text-gray-400`}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
  </div>
);

const CustomCheckbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <div className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center group-hover:border-[#FFCA00] peer-checked:bg-[#FFCA00] peer-checked:border-[#FFCA00] hover:bg-[#d9ac00]">
        {checked && <FiCheck className="text-white" size={14} strokeWidth={3} />}
      </div>
    </div>
    {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
  </label>
);

const CustomTabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex bg-gray-50 p-1 rounded gap-1">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-semibold transition-all
          ${activeTab === tab.id
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"}`}
      >
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-xl" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} transform transition-all scale-100 animate-in zoom-in-95 duration-200 my-8`} onClick={e => e.stopPropagation()}>
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

const CustomSelect = ({ label, options, value, onChange, placeholder = "Select...", error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && <label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded text-sm bg-white cursor-pointer flex items-center justify-between transition-colors
            ${error ? "border-red-500" : "border-gray-300"} ${isOpen ? "ring-1 ring-yellow-400 shadow-sm" : ""}`}
      >
        <span className={selectedOption ? "text-gray-900 font-medium" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FiChevronDown className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} size={16} />
      </div>

      {isOpen && (
        <div className="absolute z-[1100] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1">
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 rounded text-left transition-colors
                  ${value === opt.value ? "bg-yellow-50 text-[#FFCA00] font-semibold" : "text-gray-900 hover:bg-yellow-50 cursor-pointer"}`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentBeneficiaryUpdateFlow = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filename = searchParams.get('file');

  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);
  const [templateSelectOpen, setTemplateSelectOpen] = useState(false);
  const [beneficiaryTab, setBeneficiaryTab] = useState("select-payee");

  // File state
  const [fileName, setFileName] = useState(filename || "");
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [tempFileName, setTempFileName] = useState("");

  // Data state
  const [payeeLists, setPayeeLists] = useState({});
  const [allEmployees, setAllEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [templateTableData, setTemplateTableData] = useState(null);
  const [templateFields, setTemplateFields] = useState([]);
  const [batchData, setBatchData] = useState(null);

  // Loading/UI state
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [newFieldValue, setNewFieldValue] = useState("");

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [filteredPayeeLists, setFilteredPayeeLists] = useState({});

  useEffect(() => {
    if (filename) {
      fetchBatchData();
    } else {
      dispatch(showToast({ message: "No filename provided", type: "error" }));
    }
  }, [filename]);

  useEffect(() => {
    if (beneficiaryModalOpen) fetchPayeeLists();
  }, [beneficiaryModalOpen]);

  useEffect(() => {
    if (templateSelectOpen) fetchPaymentTemplates();
  }, [templateSelectOpen]);

  // Filtering logic
  useEffect(() => {
    const filterFn = (emps) => emps.filter(emp => {
      const matchesSearch = !searchTerm ||
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.beneficiary_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
      return matchesSearch && matchesDept;
    });

    setFilteredEmployees(filterFn(allEmployees));
    const filtered = {};
    Object.entries(payeeLists).forEach(([name, emps]) => {
      const fList = filterFn(emps);
      if (fList.length > 0) filtered[name] = fList;
    });
    setFilteredPayeeLists(filtered);
  }, [searchTerm, departmentFilter, allEmployees, payeeLists]);

  const uniqueDepartments = [...new Set(allEmployees.map(emp => emp.department).filter(Boolean))];

  const fetchBatchData = async () => {
    try {
      setBatchLoading(true);
      const response = await authRequest.get(`/api/payorstaff/batch/${filename}/`);

      if (response.data) {
        const data = response.data;
        setBatchData(data);
        setFileName(data.batch_name);
        setSelectedTemplate(data.template?.id?.toString() || "");

        const payees = data.payees || [];
        setTableData(payees.map((p, i) => ({ ...p, id: p.payee_id || i, record_id: p.record_id || i })));

        if (data.template) {
          setTemplateTableData(data);
          const t = data.template;
          const fields = [
            ...Object.entries(t.dynamic_fields || {}).map(([n, m]) => ({ name: n, mapping: m, type: 'dynamic' })),
            ...Object.entries(t.static_fields || {}).map(([n, v]) => ({ name: n, defaultValue: v, type: 'static' })),
            ...Object.entries(t.options || {}).map(([n, o]) => ({ name: n, options: o, type: 'option' }))
          ];
          setTemplateFields(fields);
          fetchPaymentTemplates();
        }

        setSelectedEmployees(payees.map((p, i) => ({
          ...p,
          id: p.payee_id || i,
          name: p['ben name'] || p.name || '',
          beneficiary_code: p['ben code'] || '',
        })));
      }
    } catch (error) {
      console.error("Error fetching batch data:", error);
      dispatch(showToast({ message: "Failed to load batch data", type: "error" }));
    } finally {
      setBatchLoading(false);
    }
  };

  // API: Fetch payee lists
  const fetchPayeeLists = async () => {
    try {
      setLoading(true);
      const response = await authRequest.get("/api/payor/view_lists/");

      if (response.data && response.data.results) {
        const listsData = {};
        response.data.results.forEach(list => {
          listsData[list.category] = [];
        });

        setPayeeLists(listsData);

        const mockEmployees = generateMockEmployeesFromLists(response.data.results);
        setAllEmployees(mockEmployees);

        const populatedLists = {};
        mockEmployees.forEach(employee => {
          if (!populatedLists[employee.listCategory]) {
            populatedLists[employee.listCategory] = [];
          }
          populatedLists[employee.listCategory].push(employee);
        });

        setPayeeLists(populatedLists);
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

  // Generate mock employees based on actual list data
  const generateMockEmployeesFromLists = (lists) => {
    const employees = [];
    let idCounter = 1;

    lists.forEach(list => {
      for (let i = 0; i < Math.min(list.count, 5); i++) {
        employees.push({
          id: idCounter,
          payee_id: idCounter,
          name: `Employee ${idCounter}`,
          email: `employee${idCounter}@company.com`,
          department: list.category,
          beneficiary_code: `BNF${String(idCounter).padStart(3, '0')}`,
          listCategory: list.category,
          listId: list.id,
        });
        idCounter++;
      }
    });

    return employees;
  };

  // API: Fetch payment templates
  const fetchPaymentTemplates = async () => {
    try {
      const response = await authRequest.get("/api/payorstaff/templates/?type=payment");

      if (response.data && response.data.results) {
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

        const selectedTemplate = templates.find(t => t.id === templateId);
        if (selectedTemplate) {
          const dynamicFields = Object.entries(selectedTemplate.dynamic_fields || {}).map(([field, mapping]) => ({
            name: field,
            mapping: mapping,
            type: 'dynamic'
          }));

          const staticFields = Object.entries(selectedTemplate.static_fields || {}).map(([field, defaultValue]) => ({
            name: field,
            defaultValue: defaultValue,
            type: 'static'
          }));

          const optionFields = Object.entries(selectedTemplate.options || {}).map(([field, options]) => ({
            name: field,
            options: options,
            type: 'option'
          }));

          const allFields = [...dynamicFields, ...staticFields, ...optionFields];
          setTemplateFields(allFields);
          // setTemplateOptions(selectedTemplate.options || {}); // This was removed in the original code, keeping it removed.
          // setTemplateStaticFields(selectedTemplate.static_fields || {}); // This was removed in the original code, keeping it removed.

          if (response.data.results) {
            const processedResults = response.data.results.map((result, index) => {
              const payeeId = result.payee_id || result.id || payeeIds[index];

              // Find existing record to preserve data
              const existingRecord = tableData.find(record =>
                record.payee_id === payeeId || record.id === result.record_id
              );

              // Process the result to ensure option fields are single values
              const processedResult = {
                ...result,
                id: existingRecord ? existingRecord.id : result.id,
                record_id: existingRecord ? existingRecord.record_id : result.record_id,
                payee_id: payeeId,
                ben_code: result.ben_code || existingRecord?.ben_code,
                ben_name: result.ben_name || existingRecord?.ben_name,
                email: result.email || existingRecord?.email,
                contact: result.contact || existingRecord?.contact,
              };

              // Process all template fields
              allFields.forEach(field => {
                if (field.type === 'option') {
                  // For option fields, ensure we use a single value (first element if array)
                  const currentValue = result[field.name] !== undefined ? result[field.name] :
                    (existingRecord && existingRecord[field.name] !== undefined ? existingRecord[field.name] :
                      (field.options && field.options.length > 0 ? field.options[0] : ''));

                  if (Array.isArray(currentValue) && currentValue.length > 0) {
                    processedResult[field.name] = currentValue[0];
                  } else {
                    processedResult[field.name] = currentValue || (field.options && field.options.length > 0 ? field.options[0] : '');
                  }
                } else if (field.type === 'static') {
                  processedResult[field.name] = result[field.name] !== undefined ? result[field.name] :
                    (existingRecord && existingRecord[field.name] !== undefined ? existingRecord[field.name] : field.defaultValue);
                } else {
                  processedResult[field.name] = result[field.name] !== undefined ? result[field.name] :
                    (existingRecord && existingRecord[field.name] !== undefined ? existingRecord[field.name] : '');
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
      dispatch(showToast({ message: "Failed to load template data", type: "error" }));
    } finally {
      setTableLoading(false);
    }
  };

  // Handle template change
  const handleTemplateSelect = async (templateId) => {
    setSelectedTemplate(templateId);
    setTemplateSelectOpen(false);

    const selectedT = templates.find(t => t.id.toString() === templateId.toString());
    if (selectedT) {
      const fields = [
        ...Object.entries(selectedT.dynamic_fields || {}).map(([n, m]) => ({ name: n, mapping: m, type: 'dynamic' })),
        ...Object.entries(selectedT.static_fields || {}).map(([n, v]) => ({ name: n, defaultValue: v, type: 'static' })),
        ...Object.entries(selectedT.options || {}).map(([n, o]) => ({ name: n, options: o, type: 'option' }))
      ];
      setTemplateFields(fields);

      if (selectedEmployees.length > 0) {
        const payeeIds = selectedEmployees.map(emp => emp.payee_id || emp.id);
        await fetchTemplateTableData(payeeIds, templateId);
      }
    }
  };

  // Clear template selection
  const handlePayeeListSelect = (listName) => {
    const listEmployees = payeeLists[listName] || [];
    const allInListSelected = listEmployees.every(emp =>
      selectedEmployees.some(selected => selected.id === emp.id)
    );

    if (allInListSelected) {
      setSelectedEmployees(prev => prev.filter(emp => !listEmployees.some(le => le.id === emp.id)));
    } else {
      const newEmployees = listEmployees.filter(le => !selectedEmployees.some(s => s.id === le.id));
      setSelectedEmployees(prev => [...prev, ...newEmployees]);
    }
  };

  const handleIndividualSelect = (employee) => {
    const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
    if (isSelected) {
      setSelectedEmployees(prev => prev.filter(emp => emp.id !== employee.id));
    } else {
      setSelectedEmployees(prev => [...prev, employee]);
    }
  };

  const handleBeneficiaryModalSave = async () => {
    if (selectedEmployees.length === 0) {
      dispatch(showToast({ message: "Please select at least one beneficiary", type: "warning" }));
      return;
    }

    if (selectedTemplate) {
      const payeeIds = selectedEmployees.map(emp => emp.payee_id || emp.id);
      await fetchTemplateTableData(payeeIds, selectedTemplate);
    } else {
      // Fallback if no template selected
      setTableData(selectedEmployees.map((emp, i) => ({
        id: emp.payee_id || emp.id,
        record_id: emp.record_id || emp.id || i,
        payee_id: emp.payee_id || emp.id,
        "ben name": emp.name,
        "ben code": emp.beneficiary_code,
        email: emp.email,
        contact: emp.contact,
        salary: emp.salary || 0,
      })));
    }
    setBeneficiaryModalOpen(false);
    dispatch(showToast({ message: `${selectedEmployees.length} beneficiaries selected`, type: "success" }));
  };

  const handleFieldEdit = (index, field, value) => {
    setEditingField({ employeeIndex: index, fieldName: field });
    setNewFieldValue(value || "");
  };

  const saveFieldValue = () => {
    if (!editingField) return;
    const { employeeIndex, fieldName } = editingField;
    const updatedData = [...tableData];
    updatedData[employeeIndex] = { ...updatedData[employeeIndex], [fieldName]: newFieldValue };
    setTableData(updatedData);
    setEditingField(null);
    setNewFieldValue("");
    dispatch(showToast({ message: "Field updated", type: "success" }));
  };

  const removeEmployee = (id) => {
    const updatedSelection = selectedEmployees.filter(emp => (emp.payee_id || emp.id) !== id);
    setSelectedEmployees(updatedSelection);
    setTableData(prev => prev.filter(emp => (emp.payee_id || emp.id) !== id));
    dispatch(showToast({ message: "Beneficiary removed", type: "info" }));
  };

  const prepareUpdatePayload = () => {
    const records = tableData.map(row => {
      const payloadRow = {
        payee_id: row.payee_id || row.id,
        record_id: row.record_id
      };
      // Include template fields
      templateFields.forEach(field => {
        payloadRow[field.name] = row[field.name];
      });
      return payloadRow;
    });

    return {
      batch_name: fileName,
      template_id: selectedTemplate,
      records: records
    };
  };

  const handleUpdate = async () => {
    if (!fileName) {
      dispatch(showToast({ message: "Please provide a file name", type: "error" }));
      return;
    }

    if (tableData.length === 0) {
      dispatch(showToast({ message: "Please add at least one beneficiary", type: "error" }));
      return;
    }

    if (!selectedTemplate) {
      dispatch(showToast({ message: "Please select a template", type: "error" }));
      return;
    }

    try {
      setSaveLoading(true);
      const payload = prepareUpdatePayload();
      const response = await authRequest.put(`/api/payorstaff/templates/batches/${filename}/update/`, payload);

      if (response.status === 200 || response.status === 201) {
        dispatch(showToast({ message: "Batch updated successfully", type: "success" }));
        router.push("/paymagics/payments/files");
      }
    } catch (error) {
      console.error("Error updating batch:", error);
      dispatch(showToast({ message: error.response?.data?.error || "Failed to update batch", type: "error" }));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setSaveLoading(true);
      // Ensure we hit the right endpoint for download
      const response = await authRequest.get(`/api/payorstaff/templates/${fileName}/download_excel/`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      dispatch(showToast({ message: "Download started", type: "success" }));
    } catch (error) {
      console.error("Download error:", error);
      dispatch(showToast({ message: "Failed to download file", type: "error" }));
    } finally {
      setSaveLoading(false);
    }
  };


  const handleFileNameEdit = () => {
    setTempFileName(fileName);
    setIsEditingFileName(true);
  };

  const saveFileName = () => {
    setFileName(tempFileName);
    setIsEditingFileName(false);
    dispatch(showToast({ message: "File name updated locally.", type: "success" }));
  };

  const cancelFileNameEdit = () => {
    setIsEditingFileName(false);
    setTempFileName("");
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
    setTableData([]);
    setTemplateTableData(null);
    setTemplateFields([]);
    setSelectedTemplate("");
    dispatch(showToast({ message: "All selections cleared.", type: "info" }));
  };

  const getTableHeaders = () => {
    if (tableData.length === 0) return [];
    if (templateTableData?.template?.field_order) return templateTableData.template.field_order;
    return Object.keys(tableData[0]).filter(k => !['id', 'record_id', 'payee_id'].includes(k));
  };

  const getFieldDisplayName = (n) => {
    const map = { 'ben code': 'Beneficiary Code', 'ben name': 'Name', 'salary': 'Amount', 'acc no': 'Account No' };
    return map[n] || n.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderTableCell = (emp, field, idx) => {
    const val = emp[field];
    const displayVal = (v) => (v === null || v === undefined || v === '') ? "N/A" : v.toString();
    const config = templateFields.find(f => f.name === field);
    const isEditable = config?.type === 'static' || config?.type === 'option';

    if (isEditable) {
      if (config.type === 'option') {
        const current = Array.isArray(val) ? val[0] : val;
        return (
          <CustomSelect
            options={config.options.map(o => ({ label: o, value: o }))}
            value={current}
            onChange={(v) => {
              const updated = [...tableData];
              updated[idx] = { ...updated[idx], [field]: v };
              setTableData(updated);
            }}
          />
        );
      }
      return (
        <div className="flex items-center gap-2 group/cell">
          <span className="text-sm font-bold text-gray-700">{displayVal(val)}</span>
          <button onClick={() => handleFieldEdit(idx, field, val)} className="p-1 text-gray-300 hover:text-[#FFCA00] transition-colors">
            <FiEdit3 size={14} />
          </button>
        </div>
      );
    }
    return <span className="text-sm font-medium text-gray-500">{displayVal(val)}</span>;
  };

  if (batchLoading) return <div className="min-h-screen bg-[#F8F8F8]"><Loader message="Loading batch data..." /></div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Navbar data={{ heading: "Update File", subheading: `Modifying batch: ${fileName}` }} />

      <main className="flex-1 py-8">
        <div className="w-full">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <FiArrowLeft size={16} /> Back
            </button>
          </div>

          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              {isEditingFileName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={tempFileName}
                    onChange={(e) => setTempFileName(e.target.value)}
                    className="text-2xl font-semibold text-gray-900 border-b-2 border-[#FFCA00] outline-none bg-transparent"
                    autoFocus
                  />
                  <button onClick={saveFileName} className="text-green-500"><FiCheck size={20} /></button>
                  <button onClick={cancelFileNameEdit} className="text-red-500"><FiX size={20} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={handleFileNameEdit}>
                  <h1 className="text-2xl font-semibold text-gray-900">{fileName}</h1>
                  <FiEdit3 className="text-gray-300 group-hover:text-[#FFCA00] transition-colors" size={16} />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {batchData?.template?.name || "No Template Assigned"} • {tableData.length} Records
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <CustomButton variant="outline" onClick={() => setBeneficiaryModalOpen(true)}>
              <FiUsers size={16} /> Edit Beneficiaries
            </CustomButton>
            <CustomButton variant="outline" onClick={() => setTemplateSelectOpen(true)}>
              <FiFileText size={16} /> Change Template
            </CustomButton>
            <CustomButton variant="primary" onClick={handleUpdate} disabled={saveLoading}>
              {saveLoading ? <FiRefreshCw className="animate-spin" size={16} /> : <FiSave size={16} />}
              Update Batch
            </CustomButton>
            <CustomButton variant="secondary" onClick={handleDownload}>
              <FiDownload size={16} /> Download
            </CustomButton>
          </div>

          {/* Main Content Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
            {/* Continuous Loading Overlay */}
            {tableLoading && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                  <FiRefreshCw className="animate-spin text-[#FFCA00]" size={40} />
                  <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {getTableHeaders().map((header, idx) => (
                      <th key={header} className={`px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap ${idx === 0 ? 'rounded-tl-lg' : ''} ${idx === getTableHeaders().length - 1 ? 'rounded-tr-lg' : ''}`}>
                        {getFieldDisplayName(header)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableData.map((emp, idx) => (
                    <tr key={emp.payee_id || idx} className="group hover:bg-gray-50 transition-colors">
                      {getTableHeaders().map(header => (
                        <td key={header} className="px-4 py-3">
                          {renderTableCell(emp, header, idx)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeEmployee(emp.payee_id || emp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Beneficiary Selection Modal */}
      <Modal isOpen={beneficiaryModalOpen} onClose={() => setBeneficiaryModalOpen(false)} title="Select Beneficiaries" maxWidth="max-w-3xl">
        <div className="space-y-6">
          <CustomTabs
            tabs={[
              { id: "select-payee", label: "Payee Lists", icon: <FiUsers size={16} /> },
              { id: "import-list", label: "Individual", icon: <FiUserPlus size={16} /> }
            ]}
            activeTab={beneficiaryTab}
            onChange={setBeneficiaryTab}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CustomInput icon={FiSearch} placeholder="Search names..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <CustomSelect
              options={[{ label: "All Departments", value: "all" }, ...uniqueDepartments.map(d => ({ label: d, value: d }))]}
              value={departmentFilter}
              onChange={setDepartmentFilter}
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2">
            {beneficiaryTab === "select-payee" ? (
              Object.entries(filteredPayeeLists).map(([name, emps]) => {
                const isSelected = emps.every(e => selectedEmployees.some(s => s.id === e.id));
                return (
                  <div
                    key={name}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${isSelected
                      ? 'bg-white border-[#FFCA00] shadow-sm'
                      : 'bg-gray-50 border-gray-100 hover:border-[#FFCA00] hover:bg-yellow-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <CustomCheckbox checked={isSelected} onChange={() => handlePayeeListSelect(name)} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500">{emps.length} Members</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedEmployees.some(s => s.id === emp.id);
                return (
                  <div
                    key={emp.id}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${isSelected
                      ? 'bg-white border-[#FFCA00] shadow-sm'
                      : 'bg-gray-50 border-gray-100 hover:border-[#FFCA00] hover:bg-yellow-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <CustomCheckbox checked={isSelected} onChange={() => handleIndividualSelect(emp)} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <CustomButton variant="secondary" className="flex-1" onClick={() => setBeneficiaryModalOpen(false)}>Cancel</CustomButton>
            <CustomButton variant="primary" className="flex-1" onClick={handleBeneficiaryModalSave}>Confirm Selection ({selectedEmployees.length})</CustomButton>
          </div>
        </div>
      </Modal>

      {/* Template Selection Modal */}
      <Modal isOpen={templateSelectOpen} onClose={() => setTemplateSelectOpen(false)} title="Select Template">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => handleTemplateSelect(t.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedTemplate.toString() === t.id.toString() ? 'border-[#FFCA00] bg-yellow-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedTemplate.toString() === t.id.toString() ? 'bg-[#FFCA00] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <FiFileText size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <div className="flex gap-2 mt-1">
                      {Object.keys(t.dynamic_fields || {}).length > 0 && <span className="text-[10px] font-bold uppercase text-blue-600">Dynamic</span>}
                      {Object.keys(t.static_fields || {}).length > 0 && <span className="text-[10px] font-bold uppercase text-green-600">Static</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <CustomButton variant="secondary" className="w-full" onClick={() => setTemplateSelectOpen(false)}>Close</CustomButton>
        </div>
      </Modal>

      {/* Inline Field Edit Modal */}
      <Modal isOpen={editingField !== null} onClose={() => setEditingField(null)} title={`Edit ${getFieldDisplayName(editingField?.fieldName || '')}`} maxWidth="max-w-md">
        <div className="space-y-6">
          <CustomInput
            value={newFieldValue}
            onChange={e => setNewFieldValue(e.target.value)}
            placeholder="Enter new value..."
            label="Field Value"
            autoFocus
          />
          <div className="flex gap-4">
            <CustomButton variant="secondary" className="flex-1" onClick={() => setEditingField(null)}>Cancel</CustomButton>
            <CustomButton variant="primary" className="flex-1" onClick={saveFieldValue}>Save Change</CustomButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentBeneficiaryUpdateFlow;