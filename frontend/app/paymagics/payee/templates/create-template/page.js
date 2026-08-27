"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import { authRequest } from "@/lib/axiosCreate";
import { showToast } from "@/lib/features/toast/toastSlice";

// React Icons
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiChevronUp,
  FiChevronDown,
  FiX,
  FiAlertCircle,
  FiArrowLeft
} from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";

// ----------------------------------------------------------------------
// UI Components (Matching Manage Page Model)
// ----------------------------------------------------------------------

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-xl" }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} transform transition-all scale-100 animate-in zoom-in-95 duration-200 my-8`}
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

const CustomSelect = ({ label, options, value, onChange, placeholder = "Select Mapping...", error, required, isFieldUsed }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-gray-700 mb-1.5 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
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
            {options.map((opt) => {
              const used = isFieldUsed && isFieldUsed(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (!used) {
                      onChange(opt.value);
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full px-3 py-2 rounded text-left transition-colors flex flex-col group
                      ${used ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-yellow-50"}`}
                >
                  <span className={`text-sm font-semibold ${used ? "text-gray-400" : "text-gray-900 group-hover:text-[#FFCA00]"}`}>
                    {opt.label}
                  </span>
                  {used && (
                    <span className="text-[10px] text-orange-500 mt-0.5 font-bold">
                      Already used in template
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
};

const InputField = ({ label, error, required = false, ...props }) => (
  <div className="w-full">
    {label && (
      <label className="text-xs font-medium text-gray-700 mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      {...props}
      className={`w-full px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors
          ${error ? "border-red-500" : "border-gray-300"}`}
    />
    {error && (
      <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>
    )}
  </div>
);

const RadioButton = ({ label, value, checked, onChange, description }) => (
  <div
    onClick={() => onChange(value)}
    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${checked ? "border-[#FFCA00] bg-yellow-50 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}
  >
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? "border-[#FFCA00]" : "border-gray-300"}`}>
      {checked && <div className="w-2 h-2 rounded-full bg-[#FFCA00] hover:bg-[#d9ac00]" />}
    </div>
    <div className="flex-1">
      <p className="text-sm font-bold text-gray-900 leading-tight mb-0.5">{label}</p>
      {description && <p className="text-[10px] text-gray-500 font-medium leading-tight">{description}</p>}
    </div>
  </div>
);

// ----------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------

const TemplateBuilder = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');

  const [templateName, setTemplateName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Modal form state
  const [headerText, setHeaderText] = useState("");
  const [headerType, setHeaderType] = useState("dynamic");
  const [dynamicValue, setDynamicValue] = useState("");
  const [staticValue, setStaticValue] = useState("");
  const [errors, setErrors] = useState({});

  // Field options
  const fieldOptions = [
    { value: "ben_code", label: "Beneficiary Code" },
    { value: "ben_name", label: "Beneficiary Name" },
    { value: "add1", label: "Address Line 1" },
    { value: "add2", label: "Address Line 2" },
    { value: "city", label: "City" },
    { value: "state", label: "State" },
    { value: "zipcode", label: "ZIP Code" },
    { value: "contact", label: "Contact Number" },
    { value: "email", label: "Email Address" },
    { value: "payee_type", label: "Payee Type" },
    { value: "acc_no", label: "Account Number" },
    { value: "ifsc", label: "IFSC Code" },
    { value: "iban", label: "IBAN Number" },
    { value: "swift_code", label: "SWIFT Code" },
    { value: "sort_code", label: "Sort Code" },
    { value: "bank_name", label: "Bank Name" },
    { value: "branch", label: "Branch Name" },
    { value: "bank_account_type", label: "Bank Account Type" },
  ];

  const usedFieldValues = headers.map(header => header.dataField);

  const loadTemplateData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authRequest.get(`/api/payorstaff/templates/${templateId}/`);
      const templateData = response.data;
      setTemplateName(templateData.name);
      setIsEditing(true);
      setHeaders(convertApiDataToHeaders(templateData));
    } catch (error) {
      console.error('Error loading template:', error);
      dispatch(showToast({ message: "Failed to load template", type: "error" }));
      router.push('/paymagics/payee/templates/list-template');
    } finally {
      setLoading(false);
    }
  }, [templateId, router, dispatch]);

  useEffect(() => {
    if (templateId) loadTemplateData();
  }, [templateId, loadTemplateData]);

  const convertApiDataToHeaders = (templateData) => {
    const headersList = [];
    const fieldOrder = templateData.field_order || [];

    if (fieldOrder.length > 0) {
      fieldOrder.forEach(fieldName => {
        if (templateData.dynamic_fields && templateData.dynamic_fields[fieldName]) {
          const val = templateData.dynamic_fields[fieldName];
          const opt = fieldOptions.find(f => f.value === val);
          headersList.push({ text: fieldName, type: "dynamic", dataField: val, value: val, displayLabel: opt ? opt.label : val });
        } else if (templateData.static_fields && templateData.static_fields[fieldName]) {
          const val = templateData.static_fields[fieldName];
          headersList.push({ text: fieldName, type: "static", dataField: fieldName, value: val, displayLabel: fieldName });
        } else if (templateData.options && templateData.options[fieldName]) {
          const val = templateData.options[fieldName];
          const opts = Array.isArray(val) ? val : [val];
          headersList.push({ text: fieldName, type: "options", dataField: fieldName, value: opts, displayLabel: fieldName, options: opts });
        }
      });
    }
    return headersList;
  };

  const validateHeaderForm = () => {
    const newErrors = {};
    if (!headerText.trim()) newErrors.headerText = "Header name is required";
    if (headerType === "dynamic" && !dynamicValue) newErrors.dynamicValue = "Select a field mapping";
    if (headerType === "static" && !staticValue.trim()) newErrors.staticValue = "Value is required";

    if (headers.some((h, idx) => h.text.toLowerCase() === headerText.trim().toLowerCase() && idx !== editingIndex)) {
      newErrors.headerText = "Header name must be unique";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddOrUpdateHeader = () => {
    if (!validateHeaderForm()) return;

    const newHeader = {
      text: headerText.trim(),
      type: headerType,
      dataField: headerType === "dynamic" ? dynamicValue : headerText.trim(),
      displayLabel: headerType === "dynamic"
        ? fieldOptions.find(f => f.value === dynamicValue)?.label || dynamicValue
        : headerText.trim(),
      value: headerType === "dynamic" ? dynamicValue : staticValue.trim()
    };

    if (editingIndex !== null) {
      const updated = [...headers];
      updated[editingIndex] = newHeader;
      setHeaders(updated);
    } else {
      setHeaders([...headers, newHeader]);
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setHeaderText("");
    setHeaderType("dynamic");
    setDynamicValue("");
    setStaticValue("");
    setErrors({});
  };

  const openEditModal = (idx) => {
    const h = headers[idx];
    setEditingIndex(idx);
    setHeaderText(h.text);
    setHeaderType(h.type);
    if (h.type === 'dynamic') { setDynamicValue(h.value); setStaticValue(""); }
    else { setStaticValue(h.value); setDynamicValue(""); }
    setIsModalOpen(true);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const newHeaders = [...headers];
    [newHeaders[idx], newHeaders[idx - 1]] = [newHeaders[idx - 1], newHeaders[idx]];
    setHeaders(newHeaders);
  };

  const moveDown = (idx) => {
    if (idx === headers.length - 1) return;
    const newHeaders = [...headers];
    [newHeaders[idx], newHeaders[idx + 1]] = [newHeaders[idx + 1], newHeaders[idx]];
    setHeaders(newHeaders);
  };

  const handleDragStart = (e, idx) => { setDraggedIndex(idx); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIdx) return;
    const newH = [...headers];
    const [moved] = newH.splice(draggedIndex, 1);
    newH.splice(targetIdx, 0, moved);
    setHeaders(newH);
    setDraggedIndex(null);
  };

  const updateDataField = (idx, val) => {
    const newH = [...headers];
    newH[idx].dataField = val;
    newH[idx].value = val;
    newH[idx].displayLabel = fieldOptions.find(f => f.value === val)?.label || val;
    setHeaders(newH);
  };

  const updateStaticVal = (idx, val) => {
    const newH = [...headers];
    newH[idx].value = val;
    setHeaders(newH);
  };

  const handleBack = () => {
    if (headers.length > 0) {
      setIsBackModalOpen(true);
    } else {
      router.push('/paymagics/payee/templates/list-template');
    }
  };

  const saveTemplate = async (shouldRedirect = true) => {
    if (!templateName.trim()) { dispatch(showToast({ message: "Enter a template name", type: "error" })); return false; }
    if (headers.length === 0) { dispatch(showToast({ message: "Add at least one header", type: "error" })); return false; }

    try {
      setSaveLoading(true);
      const payload = {
        name: templateName.trim(),
        template_type: "payee",
        field_order: headers.map(h => h.text),
        dynamic_fields: headers.reduce((acc, h) => h.type === 'dynamic' ? { ...acc, [h.text]: h.dataField } : acc, {}),
        static_fields: headers.reduce((acc, h) => h.type === 'static' ? { ...acc, [h.text]: h.value } : acc, {}),
      };

      if (isEditing) await authRequest.put(`/api/payorstaff/templates/${templateId}/`, payload);
      else await authRequest.post('/api/payorstaff/templates/?type=payee', payload);

      dispatch(showToast({ message: "Success!", type: "success" }));
      if (shouldRedirect) router.push('/paymagics/payee/templates/list-template');
      return true;
    } catch (error) {
      dispatch(showToast({ message: "Error saving template", type: "error" }));
      return false;
    } finally { setSaveLoading(false); }
  };

  const navbarData = {
    heading: isEditing ? "Edit Template" : "New Payee Template",
    subheading: "Configure custom columns for your payee file registration",
    from: "paymagics"
  };

  if (loading) return <div className="min-h-screen bg-[#F8F8F8]"><Navbar data={navbarData} /><div className="flex justify-center items-center h-[60vh]"><Loader /></div></div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar data={navbarData} />

      <main className="flex-1 py-8 ">
        <div className="w-full">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <FiArrowLeft size={16} /> Back to Templates
            </button>
          </div>

          {/* Top Bar (Matching Manage Style) */}
          <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-8  ">
            <div className="w-full flex-1">
              <InputField
                label="Template Name"
                placeholder="e.g. Domestic Batch Template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex-1 md:flex-none px-6 py-2 border border-[#FFCA00] text-[#FFCA00] rounded text-sm font-bold hover:bg-yellow-50 transition-colors flex items-center justify-center gap-2"
              >
                <FiPlus size={18} /> Add Header
              </button>
              <button
                onClick={() => saveTemplate(true)}
                disabled={saveLoading}
                className="flex-1 md:flex-none px-10 py-2 bg-[#FFCA00] text-white rounded text-sm font-bold flex items-center justify-center min-w-[160px] hover:bg-[#d9ac00]"
              >
                {saveLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Template"}
              </button>
            </div>
          </div>

          {/* headers Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-base font-bold text-gray-900">Configured Headers ({headers.length})</h3>
              <p className="text-xs text-gray-400 font-medium">Drag cards or use arrows to reorder</p>
            </div>

            {/* Empty State (Matching provided model) */}
            {headers.length === 0 && (
              <div className="text-center py-20 px-4 bg-white rounded-lg border border-gray-200 shadow-sm animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiPlus size={28} className="text-[#FFCA00]" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-1">No headers added yet</h3>
                <p className="text-sm text-gray-400 font-medium mb-8">Click &quot;Add Header&quot; to start building your template</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-8 py-2 bg-[#FFCA00] text-white rounded text-sm font-bold flex items-center gap-2 mx-auto hover:bg-yellow-500 hover:bg-[#d9ac00]"
                >
                  <FiPlus size={16} /> Add First Header
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {headers.map((h, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="bg-white rounded-lg p-3.5 border border-gray-200 shadow-sm relative group/card cursor-move hover:border-yellow-300 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <h4 className="text-sm font-bold text-gray-900 truncate" title={h.text}>{h.text}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${h.type === 'dynamic' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                          {h.type}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openEditModal(index); }} className="p-1 text-[#FFCA00] hover:bg-yellow-50 rounded transition-colors" title="Edit"><FiEdit size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); const newH = [...headers]; newH.splice(index, 1); setHeaders(newH); }} className="p-1 text-[#F04438] hover:bg-red-50 rounded transition-colors" title="Delete"><FiTrash2 size={14} /></button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-wider">Position</p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); moveUp(index); }} disabled={index === 0} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:text-gray-900 hover:border-gray-900 disabled:opacity-20 disabled:hover:border-gray-200 transition-colors"><FiChevronUp size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveDown(index); }} disabled={index === headers.length - 1} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:text-gray-900 hover:border-gray-900 disabled:opacity-20 disabled:hover:border-gray-200 transition-colors"><FiChevronDown size={14} /></button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-50">
                    {h.type === 'dynamic' ? (
                      <CustomSelect
                        options={fieldOptions}
                        value={h.dataField}
                        onChange={(val) => updateDataField(index, val)}
                        isFieldUsed={(val) => usedFieldValues.includes(val) && h.dataField !== val}
                      />
                    ) : (
                      <input
                        type="text"
                        value={h.value || ""}
                        onChange={(e) => updateStaticVal(index, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-gray-50/30"
                        placeholder="Static Text..."
                      />
                    )}
                  </div>

                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/card:opacity-40 transition-opacity text-gray-300 pointer-events-none">
                    <MdDragIndicator size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          {headers.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">File Preview</h3>
                <span className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded">Read-only View</span>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {headers.map((h, i) => (
                          <th key={i} className="px-5 py-4 border-r border-gray-200 last:border-0 text-left min-w-[180px]">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900 truncate">{h.text}</span>
                              <span className="text-[10px] text-gray-400 font-bold mt-0.5 line-clamp-1">{h.displayLabel}</span>
                              <span className="text-[9px] text-yellow-600 font-extrabold uppercase mt-1 tracking-tighter">Col: {i + 1}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="divide-x divide-gray-100">
                        {headers.map((h, i) => (
                          <td key={i} className="px-5 py-4 text-sm text-gray-500 font-medium">
                            {h.type === 'dynamic' ? `${h.displayLabel}` : h.value}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Configuration Modal (Matching Manage) */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingIndex !== null ? "Edit Header" : "Add Header"}>
        <div className="space-y-5">
          <InputField label="Header Name (Column Title)" value={headerText} onChange={(e) => setHeaderText(e.target.value)} error={errors.headerText} placeholder="e.g. Beneficiary Name" required />

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Header Type</label>
            <div className="grid grid-cols-2 gap-3">
              <RadioButton label="Dynamic" value="dynamic" checked={headerType === 'dynamic'} onChange={setHeaderType} description="Maps to system data" />
              <RadioButton label="Static" value="static" checked={headerType === 'static'} onChange={setHeaderType} description="Fixed text for every row" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            {headerType === 'dynamic' ? (
              <CustomSelect label="System Data Mapping" options={fieldOptions} value={dynamicValue} onChange={setDynamicValue} error={errors.dynamicValue} isFieldUsed={(val) => usedFieldValues.includes(val) && (editingIndex === null || headers[editingIndex].dataField !== val)} required />
            ) : (
              <InputField label="Static Value" value={staticValue} onChange={(e) => setStaticValue(e.target.value)} error={errors.staticValue} placeholder="Enter fixed text..." required />
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <button onClick={closeModal} className="flex-1 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleAddOrUpdateHeader} className="flex-1 py-2 bg-[#FFCA00] text-white rounded text-sm font-bold hover:bg-[#d9ac00]">{editingIndex !== null ? "Update Header" : "Add Header"}</button>
          </div>
        </div>
      </Modal>

      {/* Back Confirmation (Matching Manage Style) */}
      <Modal isOpen={isBackModalOpen} onClose={() => setIsBackModalOpen(false)} title="Unsaved Changes">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={28} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600 font-semibold mb-6">
            You have unsaved work on this template. Would you like to save before leaving?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => { if (await saveTemplate(true)) setIsBackModalOpen(false); }}
              className="w-full py-2 bg-[#FFCA00] text-white rounded text-sm font-bold hover:bg-[#d9ac00]"
            >
              Save and Exit
            </button>
            <button
              onClick={() => { setIsBackModalOpen(false); router.push('/paymagics/payee/templates/list-template'); }}
              className="w-full py-2 border border-gray-300 rounded text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors"
            >
              Discard and Exit
            </button>
            <button onClick={() => setIsBackModalOpen(false)} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-500">
              Continue Editing
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TemplateBuilder;