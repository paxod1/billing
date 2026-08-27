"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import ActionMenu from "@/components/commonComp/ActionMenu";
import { authRequest } from "@/lib/axiosCreate";
import { showToast } from "@/lib/features/toast/toastSlice";
import {
  IoSearchOutline
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
  FiLock,
  FiLoader
} from "react-icons/fi";

// ----------------------------------------------------------------------
// Reusable Modal Component (Matches ProformaInvoiceForm style)
// ----------------------------------------------------------------------
const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-xl" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} max-h-[95vh] overflow-y-auto transform transition-all scale-100 animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 relative">
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

// ----------------------------------------------------------------------
// Payor Form Component (Refactored to match ProformaInvoiceForm inputs)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Payor Form Component (Refactored to match ProformaInvoiceForm inputs)
// ----------------------------------------------------------------------

const InputField = ({ label, name, value, onChange, error, type = "text", placeholder, icon: Icon, required = false }) => (
  <div>
    <label className="text-xs font-medium text-gray-700 mb-1.5 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors
            ${error ? "border-red-500" : "border-gray-300"}`}
      />
      {Icon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon size={14} />
        </div>
      )}
    </div>
    {error && (
      <p className="text-xs text-red-500 mt-1">{error}</p>
    )}
  </div>
);

const PayorForm = ({ initialData, onSubmit, isLoading, isEdit = false, onClose }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    ...initialData,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = "First Name is required";
    if (!formData.last_name) newErrors.last_name = "Last Name is required";
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.mobile) newErrors.mobile = "Mobile number is required";
    if (!isEdit && !formData.password) newErrors.password = "Password is required";

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} error={errors.first_name} placeholder="John" required />
          <InputField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} error={errors.last_name} placeholder="Doe" required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Username" name="username" value={formData.username} onChange={handleChange} error={errors.username} placeholder="johndoe" icon={FiUser} required />
          <InputField label="Mobile" name="mobile" value={formData.mobile} onChange={handleChange} error={errors.mobile} placeholder="+1234567890" icon={FiPhone} required />
        </div>

        <InputField label="Email Address" name="email" value={formData.email} onChange={handleChange} error={errors.email} type="email" placeholder="john@example.com" icon={FiMail} required />

        {!isEdit ? (
          <InputField label="Password" name="password" value={formData.password} onChange={handleChange} error={errors.password} type="password" placeholder="••••••••" icon={FiLock} required />
        ) : (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">New Password (Optional)</label>
            <div className="relative">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiLock size={14} />
              </div>
            </div>
          </div>
        )}
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
            "Update Payor"
          ) : (
            "Create Payor"
          )}
        </button>
      </div>
    </form>
  );
};

// ----------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------
export default function ManagePayorPage() {
  const dispatch = useDispatch();
  const [payors, setPayors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [pagination, setPagination] = useState({
    next: null,
    previous: null,
    count: 0,
    currentUrl: "/api/admin/payors/view/", // Default initial URL
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Assuming API returns 10 by default or configurable? API determines mostly.

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPayor, setSelectedPayor] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Auto-correct pagination when current page is empty
  useEffect(() => {
    if (!loading && payors.length === 0 && currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      const baseUrl = "/api/admin/payors/view/";
      const url = prevPage === 1 ? baseUrl : `${baseUrl}?page=${prevPage}`;
      fetchPayors(url);
    }
  }, [payors, loading, currentPage]);

  // Initial Fetch
  useEffect(() => {
    fetchPayors();
  }, []);

  const fetchPayors = async (url = pagination.currentUrl) => {
    try {
      setLoading(true);
      // Ensure we preserve query if switching pages on search results

      const response = await authRequest.get(url);
      const { results, next, previous, count } = response.data;

      setPayors(results || []);
      setPagination({
        next,
        previous,
        count,
        currentUrl: url
      });
    } catch (error) {
      console.error("Fetch Error:", error);
      dispatch(showToast({ message: "Failed to fetch payors", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault(); // If form submit
    if (!searchQuery.trim()) {
      fetchPayors("/api/admin/payors/view/");
      return;
    }
    const searchUrl = `/api/admin/search/payors/?q=${encodeURIComponent(searchQuery)}`;
    fetchPayors(searchUrl);
  };

  // Debounce search effect (optional, or stick to manual filtering/search button)
  // For now sticking to the provided pattern but integrating with the UI

  // Create Payor
  const handleCreate = async (data) => {
    try {
      setActionLoading(true);
      await authRequest.post("/api/admin/payors/create/", data);
      dispatch(showToast({ message: "Payor created successfully", type: "success" }));
      setIsAddModalOpen(false);
      fetchPayors(); // Refresh list
    } catch (error) {
      console.error("Create Error:", error);
      const errMsg = error.response?.data?.username?.[0] ||
        error.response?.data?.email?.[0] ||
        "Failed to create payor";
      dispatch(showToast({ message: errMsg, type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  // Update Payor
  const handleUpdate = async (data) => {
    try {
      setActionLoading(true);

      // Calculate Changed Fields
      const changes = {};
      const original = selectedPayor;

      Object.keys(data).forEach(key => {
        // Handle password specifically
        if (key === 'password') {
          if (data.password && data.password.trim() !== "") {
            changes.password = data.password;
          }
          return; // Skip default comparison for password
        }

        if (data[key] !== original[key]) {
          changes[key] = data[key];
        }
      });

      if (Object.keys(changes).length === 0) {
        dispatch(showToast({ message: "No changes detected", type: "info" }));
        setIsEditModalOpen(false);
        return;
      }

      await authRequest.patch(`/api/admin/payors/${selectedPayor.id}/update/`, changes);
      dispatch(showToast({ message: "Payor updated successfully", type: "success" }));
      setIsEditModalOpen(false);
      fetchPayors(); // Refresh list
    } catch (error) {
      console.error("Update Error:", error);
      dispatch(showToast({ message: "Failed to update payor", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Payor
  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await authRequest.delete(`/api/admin/payors/${selectedPayor.id}/delete/`);
      dispatch(showToast({ message: "Payor deleted successfully", type: "success" }));
      setIsDeleteModalOpen(false);
      fetchPayors(); // Refresh list
    } catch (error) {
      console.error("Delete Error:", error);
      dispatch(showToast({ message: "Failed to delete payor", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (payor) => {
    setSelectedPayor(payor);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const openDeleteModal = (payor) => {
    setSelectedPayor(payor);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const handleMenuClick = (e, payorId) => {
    e.stopPropagation();
    if (openMenuId === payorId) {
      setOpenMenuId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;

    // Decide if menu should open upwards
    // Menu height approx 100px. If space below < 150, open up.
    const openUpwards = spaceBelow < 150;

    setMenuPosition({
      top: openUpwards ? (rect.top - 10) : (rect.bottom + 5),
      left: rect.right - 180, // Align right edge of menu (approx 170px width) with button right
      transformOrigin: openUpwards ? "bottom right" : "top right"
    });
    setOpenMenuId(payorId);
  };

  const navbarData = {
    heading: "Manage Payors",
    subheading: "Create, view and manage payor accounts",
    from: "paymagics"
  };

  // Handling Page Change from Pagination Component
  // Note: Pagination component usually gives a page number. 
  // Since we use cursor/url based pagination from backend (next/previous urls), 
  // mapping page numbers perfectly might be tricky without page_size calculation.
  // Ideally, if the backend supports `page=X`, we use that. 
  // If it only gives `next`/`previous` links, strict numbered pagination is hard.
  // ProformaInvoice used `paginatedProformas` (client-side slice).
  // Here we have server side. 
  // I will assume for now we just use the next/previous buttons via custom handler, or adapt 
  // Pagination component if it supports simple next/prev callbacks.
  // If `Pagination.js` expects strict 1,2,3... I might need to mock it or just use simple next/prev buttons 
  // styled like the pagination footer.
  // Let's look at ProformaInvoice: It strictly calculated `currentPage` and `paginatedProformas` CLIENT SIDE.
  // But here we have Server Side pagination.
  // I'll stick to Proforma style footer but functional for Next/Prev URLs.

  // Format Date Helper
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  // Find current active payor for menu callbacks
  const activeMenuPayor = payors.find(p => p.id === openMenuId);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar data={navbarData} />

      {loading && !payors.length ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader message="Loading Payors..." />
        </div>
      ) : (
        <>
          <main className="flex-1 py-8  ">
            <div className="w-full">
              {/* Search and Action Buttons */}
              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div className="relative w-full md:w-80">
                  <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <form onSubmit={handleSearch}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email..."
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
                    <FiPlus size={18} /> Add Payor
                  </button>
                </div>
              </div>

              {/* Table Content */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                {/* Continuous Loading Overlay */}
                {loading && payors.length > 0 && (
                  <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                      <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                      <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                    </div>
                  </div>
                )}
                {payors.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">First Name</th>
                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Last Name</th>
                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Username</th>
                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Email</th>
                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Mobile</th>
                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Created At</th>
                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {payors.map((payor) => (
                            <tr key={payor.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => openEditModal(payor)}>
                              <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-900 font-medium whitespace-nowrap group-hover:text-[#FFCA00] transition-colors">
                                {payor.first_name || "-"}
                              </td>
                              <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-900 whitespace-nowrap">
                                {payor.last_name || "-"}
                              </td>
                              <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                @{payor.username}
                              </td>
                              <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-500 whitespace-nowrap">
                                {payor.email}
                              </td>
                              <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap font-mono">
                                {payor.mobile}
                              </td>
                              <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-500 whitespace-nowrap">
                                {formatDate(payor.created_at || payor.date_joined)}
                              </td>
                              <td className="px-4 lg:px-6 py-4 text-center relative">
                                <button
                                  onClick={(e) => handleMenuClick(e, payor.id)}
                                  className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === payor.id ? "bg-white border-[#FFCA00] text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                    }`}
                                >
                                  <FiMoreVertical size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Component */}
                    <div className="px-6 bg-white border-t border-gray-100">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(pagination.count / pageSize)}
                        onPageChange={(page) => {
                          setCurrentPage(page);
                          // Construct URL for specific page
                          const baseUrl = "/api/admin/payors/view/";
                          const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
                          fetchPayors(url);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="No Payors Found"
                    message={searchQuery ? `No results found for "${searchQuery}"` : "Get started by adding a new payor."}
                    actionLabel={!searchQuery ? "Add Payor" : "Clear Search"}
                    onActionClick={!searchQuery ? () => setIsAddModalOpen(true) : () => { setSearchQuery(""); fetchPayors("/api/admin/payors/view/"); }}
                  />
                )}
              </div>
            </div>
          </main>

          {/* Hoisted Action Menu */}
          {openMenuId && activeMenuPayor && (
            <ActionMenu
              isOpen={true}
              onClose={() => setOpenMenuId(null)}
              onEdit={() => openEditModal(activeMenuPayor)}
              onDelete={() => openDeleteModal(activeMenuPayor)}
              anchorMode="fixed"
              position="" // Clear default
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                transformOrigin: menuPosition.transformOrigin
              }}
            />
          )}


          {/* Modals */}
          <Modal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            title="Add New Payor"
          >
            <PayorForm
              onSubmit={handleCreate}
              isLoading={actionLoading}
              isEdit={false}
              onClose={() => setIsAddModalOpen(false)}
            />
          </Modal>

          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Edit Payor"
          >
            {selectedPayor && (
              <PayorForm
                initialData={selectedPayor}
                onSubmit={handleUpdate}
                isLoading={actionLoading}
                isEdit={true}
                onClose={() => setIsEditModalOpen(false)}
              />
            )}
          </Modal>

          {/* Custom Delete Modal to match style or reuse Global if preferred. Sticking to custom for now to match strict style request? 
            Actually, Proforma used dispatch(showToast) for delete. 
            I'll implement a simple delete modal consistent with the new style.
        */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
              <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <FiTrash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Payor</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Are you sure you want to delete <span className="font-bold">{selectedPayor?.first_name}</span>? This action cannot be undone.
                  </p>
                </div>
                <div className="mt-6 flex gap-3 justify-center">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg shadow-red-500/30"
                  >
                    {actionLoading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}