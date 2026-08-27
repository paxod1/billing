"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiDownload,
  FiEdit3,
  FiFile,
  FiX,
  FiUpload,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiFilter,
  FiPlus,
  FiMoreVertical,
  FiEdit2,
} from "react-icons/fi";
import { IoSearchOutline } from "react-icons/io5";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { authRequest } from "@/lib/axiosCreate";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import Pagination from "@/components/commonComp/Pagination";
import ActionMenu from "@/components/commonComp/ActionMenu";

// Custom UI Components
const CustomButton = ({ children, onClick, variant = "primary", className = "", disabled = false, size = "md", title }) => {
  const variants = {
    primary: "bg-[#FFCA00] text-white hover:bg-[#d9ac00]",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors",
    outline: "border border-[#FFCA00] text-[#FFCA00] hover:bg-yellow-50 transition-all",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 transition-colors",
    ghost: "text-gray-500 hover:bg-gray-100 transition-colors",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2 text-sm",
    icon: "p-2",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${variants[variant]} ${sizes[size]} rounded font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

const CustomInput = ({ label, placeholder, value, onChange, type = "text", icon: Icon }) => (
  <div className="w-full">
    {label && <label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors placeholder:text-gray-400`}
      />
    </div>
  </div>
);

const FileIcon = ({ extension }) => {
  const iconClass = "h-5 w-5";

  switch (extension) {
    case "xlsx":
      return <FiFile className={`${iconClass} text-[#FFCA00]`} />;
    default:
      return <FiFile className={`${iconClass} text-gray-400`} />;
  }
};

const ModernFileListing = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const itemsPerPage = 5; // Match reference page size

  // Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Fetch files from API
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await authRequest.get("/api/payorstaff/templates/batches/");
      if (response.data && response.data.results) {
        // Transform API response to match our file structure
        const transformedFiles = response.data.results.map((file, index) => ({
          id: index + 1,
          name: file.batch_name,
          type: "Excel Batch",
          size: "N/A",
          uploadedDate: new Date().toISOString(),
          extension: "xlsx",
          template_id: file.template_id,
          template_name: file.template_name,
          download_url: file.download_url,
          batch_name: file.batch_name
        }));
        setFiles(transformedFiles);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      dispatch(showToast({ message: "Failed to load files", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;

    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, files]);

  // Pagination logic
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFiles, currentPage]);

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  const handleDownload = async (file) => {
    try {
      setDownloadingFile(file.id);

      // Use the download API endpoint with the batch_name
      const downloadUrl = `/api/payorstaff/templates/${file.batch_name}/download_excel/`;

      // Make API call to get the file blob
      const response = await authRequest.get(downloadUrl, {
        responseType: 'blob', // Important for file downloads
      });

      // Create a blob from the response data
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${file.batch_name}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      dispatch(showToast({ message: "Download started successfully", type: "success" }));
    } catch (error) {
      console.error("Download error:", error);
      dispatch(showToast({ message: "Failed to download file", type: "error" }));
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleEdit = (file) => {
    router.push(`/paymagics/payments/updateFile?file=${encodeURIComponent(file.batch_name)}`);
  };

  const handleDeleteClick = (file) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedFile) {
      try {
        await authRequest.delete(`/api/payor/delete_file/${selectedFile.batch_name}/`);
        setFiles(prevFiles => prevFiles.filter(file => file.id !== selectedFile.id));
        dispatch(showToast({ message: `"${selectedFile.name}" deleted successfully`, type: "success" }));
      } catch (error) {
        console.error("Delete error:", error);
        dispatch(showToast({ message: "Failed to delete file", type: "error" }));
      } finally {
        setDeleteDialogOpen(false);
        setSelectedFile(null);
      }
    }
  };

  const handleMenuClick = (e, fileId) => {
    e.stopPropagation();
    if (openMenuId === fileId) {
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
    setOpenMenuId(fileId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><FiX size={24} /></button>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Navbar
        data={{
          heading: "Payment Files",
          subheading: "Manage and organize your payment documents and transaction records"
        }}
      />

      <main className="w-ful py-8">
        {loading ? (
          <Loader message="Fetching your files..." />
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Search Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
              <div className="relative w-full md:w-80">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px]"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                <button className="px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-bold hover:bg-gray-50 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer h-[48px] shadow-sm">
                  <FiFilter size={18} /> Filter
                </button>
                <button className="px-4 py-2.5 bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-bold hover:bg-[#d9ac00]/5 flex items-center gap-2 whitespace-nowrap cursor-pointer h-[48px]">
                  <FiDownload size={18} /> Export
                </button>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-400 ml-2">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <FiFile className="text-[#FFCA00]" />
                    {filteredFiles.length} Total Files
                  </span>
                </div>
              </div>
            </div>

            {/* Files Grid/Table */}
            {filteredFiles.length === 0 ? (
              <div className="bg-white rounded-3xl py-20 text-center border-2 border-dashed border-gray-100">
                <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiFile className="text-[#FFCA00] w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-500 max-w-xs mx-auto mb-8 font-medium">
                  {searchTerm ? "No files match your search criteria. Try a different keyword." : "You haven't uploaded any payment files yet."}
                </p>
                {searchTerm && (
                  <CustomButton variant="outline" onClick={() => setSearchTerm("")} className="mx-auto">
                    Clear Search
                  </CustomButton>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                {/* Continuous Loading Overlay */}
                {loading && files.length > 0 && (
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
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">File Info</th>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Template</th>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                        <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => handleEdit(file)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center">
                                <FileIcon extension={file.extension} />
                              </div>
                              <div>
                                <p className="text-[14px] lg:text-[15px] text-gray-900 font-semibold group-hover:text-[#FFCA00] transition-colors">{file.name}</p>
                                <p className="text-[13px] text-gray-500 capitalize">{file.type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-100">
                              {file.template_name || "Custom"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[13px] text-gray-500">{formatDate(file.uploadedDate)}</p>
                          </td>
                          <td className="px-6 py-4 text-center relative">
                            <button
                              onClick={(e) => handleMenuClick(e, file.id)}
                              className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === file.id ? "bg-white border-[#FFCA00] text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                            >
                              <FiMoreVertical size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Section */}
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
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FiTrash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete File</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">
                Are you sure you want to delete <span className="text-gray-900 font-bold">&quot;{selectedFile?.name}&quot;</span>? This action cannot be undone and the file will be permanently removed.
              </p>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Menu */}
      {openMenuId && (
        <ActionMenu
          isOpen={true}
          onClose={() => setOpenMenuId(null)}
          onEdit={() => {
            const file = files.find(f => f.id === openMenuId);
            if (file) { handleEdit(file); }
            setOpenMenuId(null);
          }}
          onDelete={() => {
            const file = files.find(f => f.id === openMenuId);
            if (file) { handleDeleteClick(file); }
            setOpenMenuId(null);
          }}
          onDownload={() => {
            const file = files.find(f => f.id === openMenuId);
            if (file) { handleDownload(file); }
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
    </div>
  );
};

export default ModernFileListing;