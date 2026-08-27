"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import ActionMenu from "@/components/commonComp/ActionMenu";
import { authRequest } from "@/lib/axiosCreate";
import { showToast } from "@/lib/features/toast/toastSlice";

// React Icons
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiX,
  FiAlertCircle,
  FiUpload,
  FiMoreVertical,
  FiEdit3,
  FiLoader
} from "react-icons/fi";
import { IoSearchOutline } from "react-icons/io5";

// ----------------------------------------------------------------------
// UI Components (Matching Reference Model)
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

const InputField = React.forwardRef(({ label, error, required = false, ...props }, ref) => (
  <div className="w-full">
    {label && (
      <label className="text-xs font-medium text-gray-700 mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      ref={ref}
      {...props}
      className={`w-full px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors
          ${error ? "border-red-500" : "border-gray-300"}`}
    />
    {error && (
      <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>
    )}
  </div>
));
InputField.displayName = "InputField";

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

const TemplateManager = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, transformOrigin: "top right" });

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-correct pagination when data changes
  useEffect(() => {
    const totalFiltered = templates.filter((t) =>
      t?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
    const maxPages = Math.ceil(totalFiltered / pageSize) || 1;
    if (currentPage > maxPages) {
      setCurrentPage(maxPages);
    }
  }, [templates, searchQuery, currentPage, pageSize]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await authRequest.get('/api/payorstaff/templates/?type=payment');
      setTemplates(response.data.results || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      dispatch(showToast({ message: "Failed to load templates", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!templateName.trim() || !selectedFile) {
      dispatch(showToast({ message: "Fill all fields", type: "error" }));
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('template_name', templateName.trim());
      formData.append('file', selectedFile);
      formData.append('template_type', 'payment');

      await authRequest.post('/api/payorstaff/upload_template/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      dispatch(showToast({ message: "Template uploaded!", type: "success" }));
      setIsUploadModalOpen(false);
      setTemplateName("");
      setSelectedFile(null);
      fetchTemplates();
    } catch (error) {
      dispatch(showToast({ message: "Upload failed", type: "error" }));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      setDeleteLoading(true);
      await authRequest.delete(`/api/payorstaff/templates/${selectedTemplate.id}/`);
      dispatch(showToast({ message: "Template deleted", type: "success" }));
      setIsDeleteModalOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      dispatch(showToast({ message: "Delete failed", type: "error" }));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMenuClick = (e, templateId) => {
    e.stopPropagation();
    if (openMenuId === templateId) {
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
    setOpenMenuId(templateId);
  };

  const filteredTemplates = templates.filter((template) =>
    template?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTemplates.length / pageSize);
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const renderDynamicFields = (dynamicFields) => {
    if (!dynamicFields || Object.keys(dynamicFields).length === 0) {
      return "No dynamic fields";
    }

    return Object.entries(dynamicFields)
      .slice(0, 3) // Show only first 3 fields
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  const navbarData = {
    heading: "Payment Templates",
    subheading: "Manage file structures for your payment registrations",
    from: "paymagics"
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar data={navbarData} />

      <main className="flex-1 py-8 ">
        <div className="w-full">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="relative w-full md:w-80">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-white"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex-1 md:flex-none px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-w-[120px] cursor-pointer"
              >
                <FiUpload size={16} /> Upload
              </button>
              <button
                onClick={() => router.push('/paymagics/templates/create-template')}
                className="flex-1 md:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-w-[140px] cursor-pointer hover:bg-[#d9ac00]"
              >
                <FiPlus size={18} /> Add Template
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center h-64"><Loader /></div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-lg p-12 border border-gray-200 shadow-sm">
              <EmptyState
                title="No Templates Found"
                message={searchQuery ? "No results match your search." : "Build your first payment template to get started."}
                actionLabel={searchQuery ? "Clear Search" : "Add Template"}
                onActionClick={searchQuery ? () => setSearchQuery("") : () => router.push('/paymagics/templates/create-template')}
              />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                {/* Continuous Loading Overlay */}
                {loading && templates.length > 0 && (
                  <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                      <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                      <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg text-left uppercase tracking-wider">Template Name</th>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-left uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-left uppercase tracking-wider">Created Date</th>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-left uppercase tracking-wider">Dynamic Fields</th>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedTemplates.map((template) => (
                        <tr key={template.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => router.push(`/paymagics/templates/create-template?id=${template.id}`)}>
                          <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-900 font-medium group-hover:text-[#FFCA00] transition-colors">{template.name || 'Unnamed Template'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-100">
                              {template.template_type || "payment"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-500">{formatDate(template.created_at)}</td>
                          <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-600 max-w-xs truncate">
                            {renderDynamicFields(template?.dynamic_fields)}
                          </td>
                          <td className="px-6 py-4 text-center relative">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => handleMenuClick(e, template.id)}
                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === template.id ? 'bg-white border-[#FFCA00] text-[#FFCA00]' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                              >
                                <FiMoreVertical size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-6 py-4 bg-white border-t border-gray-100">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Action Menu */}
      {openMenuId && (
        <ActionMenu
          isOpen={true}
          onClose={() => setOpenMenuId(null)}
          onEdit={() => {
            router.push(`/paymagics/templates/create-template?id=${openMenuId}`);
            setOpenMenuId(null);
          }}
          onDelete={() => {
            const t = templates.find(item => item.id === openMenuId);
            setSelectedTemplate(t);
            setIsDeleteModalOpen(true);
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

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Template">
        <div className="space-y-6">
          <InputField
            label="Template Name"
            placeholder="e.g. Domestic Payment Template"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
          />
          <div className="w-full">
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">File Input (CSV/XLSX) <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-yellow-50 file:text-yellow-700"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="flex-1 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={uploadLoading}
              className="flex-1 py-2 bg-[#FFCA00] text-white rounded text-sm font-bold hover:bg-yellow-500 disabled:opacity-50 hover:bg-[#d9ac00]"
            >
              {uploadLoading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiTrash2 size={24} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Are you sure?</p>
          <p className="text-xs text-gray-500 mb-6 font-medium">You are about to delete <span className="font-bold text-gray-700 underline underline-offset-2 italic uppercase">&quot;{selectedTemplate?.name}&quot;</span>. This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-2 border border-gray-300 rounded text-sm font-bold text-gray-500 hover:bg-gray-50"
            >
              No, Keep it
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 py-2 bg-red-600 text-white rounded text-sm font-bold shadow-lg shadow-red-100 hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TemplateManager;