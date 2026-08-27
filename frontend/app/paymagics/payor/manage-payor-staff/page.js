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
  FiTrash2,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiType
} from "react-icons/fi";

// ----------------------------------------------------------------------
// Reusable Modal Component
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
// Staff Form Component
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
        className={`w-full px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors pl-10
            ${error ? "border-red-500" : "border-gray-300"}`}
      />
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon size={14} />
        </div>
      )}
    </div>
    {error && (
      <p className="text-xs text-red-500 mt-1">{error}</p>
    )}
  </div>
);

const StaffForm = ({ initialData, onSubmit, isLoading, isEdit = false, onClose }) => {
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
    if (!formData.first_name?.trim()) newErrors.first_name = "First Name is required";
    if (!formData.last_name?.trim()) newErrors.last_name = "Last Name is required";
    if (!formData.username?.trim()) newErrors.username = "Username is required";
    if (!formData.email?.trim()) newErrors.email = "Email is required";
    if (!formData.mobile?.trim()) newErrors.mobile = "Mobile number is required";
    if (!isEdit && !formData.password?.trim()) newErrors.password = "Password is required";

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    // Simple basic mobile length check
    if (formData.mobile && formData.mobile.replace(/\D/g, "").length !== 10) {
      newErrors.mobile = "Mobile must be 10 digits";
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
          <InputField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} error={errors.first_name} placeholder="John" icon={FiType} required />
          <InputField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} error={errors.last_name} placeholder="Doe" icon={FiType} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Username" name="username" value={formData.username} onChange={handleChange} error={errors.username} placeholder="johndoe" icon={FiUser} required />
          <InputField label="Mobile" name="mobile" value={formData.mobile} onChange={handleChange} error={errors.mobile} placeholder="1234567890" icon={FiPhone} required />
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
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors pl-10"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
            "Update Staff"
          ) : (
            "Create Staff"
          )}
        </button>
      </div>
    </form>
  );
};

// ----------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------
export default function ManagePayorStaffPage() {
  const dispatch = useDispatch();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [pagination, setPagination] = useState({
    next: null,
    previous: null,
    count: 0,
    currentUrl: "/api/admin/payor-staff/view/", // Default initial URL
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // API Default

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Auto-correct pagination when current page is empty
  useEffect(() => {
    if (!loading && staffList.length === 0 && currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      const baseUrl = "/api/admin/payor-staff/view/";
      const url = prevPage === 1 ? baseUrl : `${baseUrl}?page=${prevPage}`;
      fetchStaff(url);
    }
  }, [staffList, loading, currentPage]);

  // Initial Fetch
  useEffect(() => {
    fetchStaff();
  }, []);

  // Helper to extract array from possibly varied API responses
  const getStaffArrayFromResponse = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData && Array.isArray(responseData.results)) return responseData.results;
    if (responseData && Array.isArray(responseData.data)) return responseData.data;
    if (responseData && typeof responseData === 'object' && !responseData.results) return [responseData];
    return [];
  };

  const fetchStaff = async (url = pagination.currentUrl) => {
    try {
      setLoading(true);

      const response = await authRequest.get(url);

      // Handle the different response structures mentioned in the original file analysis
      let results = [];
      let next = null;
      let previous = null;
      let count = 0;

      if (response.data?.results && Array.isArray(response.data.results)) {
        results = response.data.results;
        next = response.data.next;
        previous = response.data.previous;
        count = response.data.count || results.length;
      } else {
        results = getStaffArrayFromResponse(response.data);
        count = results.length;
      }

      setStaffList(results || []);
      setPagination({
        next,
        previous,
        count,
        currentUrl: url
      });
    } catch (error) {
      console.error("Fetch Error:", error);
      dispatch(showToast({ message: "Failed to fetch staff list", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchStaff("/api/admin/payor-staff/view/");
      return;
    }
    const searchUrl = `/api/admin/search/payor-staff/?q=${encodeURIComponent(searchQuery)}`;
    fetchStaff(searchUrl);
  };

  // Create Staff
  const handleCreate = async (data) => {
    try {
      setActionLoading(true);
      const apiData = { ...data };
      if (!apiData.password) delete apiData.password; // Should happen in form, but safe check

      await authRequest.post("/api/admin/payor-staff/create/", apiData);
      dispatch(showToast({ message: "Staff created successfully", type: "success" }));
      setIsAddModalOpen(false);
      fetchStaff(); // Refresh list
    } catch (error) {
      console.error("Create Error:", error);
      const errMsg = error.response?.data?.username?.[0] ||
        error.response?.data?.email?.[0] ||
        error.response?.data?.detail ||
        "Failed to create staff member";
      dispatch(showToast({ message: errMsg, type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  // Update Staff
  const handleUpdate = async (data) => {
    try {
      setActionLoading(true);

      // Calculate Changed Fields
      const changes = {
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        email: data.email,
        mobile: data.mobile,
      };

      if (data.password && data.password.trim() !== "") {
        changes.password = data.password;
      }

      await authRequest.put(`/api/admin/payor-staff/${selectedStaff.id}/update/`, changes);
      dispatch(showToast({ message: "Staff updated successfully", type: "success" }));
      setIsEditModalOpen(false);
      fetchStaff(); // Refresh list
    } catch (error) {
      console.error("Update Error:", error);
      const errMsg = error.response?.data?.detail || "Failed to update staff member";
      dispatch(showToast({ message: errMsg, type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Staff
  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await authRequest.delete(`/api/admin/payor-staff/${selectedStaff.id}/delete/`);
      dispatch(showToast({ message: "Staff deleted successfully", type: "success" }));
      setIsDeleteModalOpen(false);
      fetchStaff(); // Refresh list
    } catch (error) {
      console.error("Delete Error:", error);
      dispatch(showToast({ message: "Failed to delete staff member", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const openDeleteModal = (staff) => {
    setSelectedStaff(staff);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const handleMenuClick = (e, staffId) => {
    e.stopPropagation();
    if (openMenuId === staffId) {
      setOpenMenuId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const openUpwards = spaceBelow < 150;

    setMenuPosition({
      top: openUpwards ? (rect.top - 10) : (rect.bottom + 5),
      left: rect.right - 180,
      transformOrigin: openUpwards ? "bottom right" : "top right"
    });
    setOpenMenuId(staffId);
  };

  const navbarData = {
    heading: "Manage Payor Staff",
    subheading: "Create, view and manage payor staff accounts",
    from: "paymagics"
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const activeMenuStaff = staffList.find(s => s.id === openMenuId);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar data={navbarData} />

      {loading && !staffList.length ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader message="Loading Staff..." />
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
                    className="w-full md:w-auto px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 whitespace-nowrap hover:bg-[#d9ac00]"
                  >
                    <FiPlus size={18} /> Add Staff
                  </button>
                </div>
              </div>

              {/* Table Content */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {staffList.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">First Name</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Last Name</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Username</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Email</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Mobile</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Date Joined</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 text-center whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {staffList.map((staff) => (
                            <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-[14px] text-gray-900 font-medium whitespace-nowrap">
                                {staff.first_name || "-"}
                              </td>
                              <td className="px-6 py-4 text-[14px] text-gray-900 whitespace-nowrap">
                                {staff.last_name || "-"}
                              </td>
                              <td className="px-6 py-4 text-[14px] text-gray-700 whitespace-nowrap">
                                @{staff.username}
                              </td>
                              <td className="px-6 py-4 text-[14px] text-gray-500 whitespace-nowrap">
                                {staff.email}
                              </td>
                              <td className="px-6 py-4 text-[14px] text-gray-700 whitespace-nowrap font-mono">
                                {staff.mobile}
                              </td>
                              <td className="px-6 py-4 text-[14px] text-[#4d5dc0] whitespace-nowrap">
                                {formatDate(staff.created_at || staff.date_joined)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={(e) => handleMenuClick(e, staff.id)}
                                  className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === staff.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"
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
                          const baseUrl = "/api/admin/payor-staff/view/";
                          const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
                          fetchStaff(url);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="No Staff Found"
                    message={searchQuery ? `No results found for "${searchQuery}"` : "Get started by adding a new staff member."}
                    actionLabel={!searchQuery ? "Add Staff" : "Clear Search"}
                    onActionClick={!searchQuery ? () => setIsAddModalOpen(true) : () => { setSearchQuery(""); fetchStaff("/api/admin/payor-staff/view/"); }}
                  />
                )}
              </div>
            </div>
          </main>

          {/* Hoisted Action Menu */}
          {openMenuId && activeMenuStaff && (
            <ActionMenu
              isOpen={true}
              onClose={() => setOpenMenuId(null)}
              onEdit={() => openEditModal(activeMenuStaff)}
              onDelete={() => openDeleteModal(activeMenuStaff)}
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
          <Modal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            title="Add New Staff"
          >
            <StaffForm
              onSubmit={handleCreate}
              isLoading={actionLoading}
              isEdit={false}
              onClose={() => setIsAddModalOpen(false)}
            />
          </Modal>

          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Edit Staff"
          >
            {selectedStaff && (
              <StaffForm
                initialData={selectedStaff}
                onSubmit={handleUpdate}
                isLoading={actionLoading}
                isEdit={true}
                onClose={() => setIsEditModalOpen(false)}
              />
            )}
          </Modal>

          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
              <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <FiTrash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Staff</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Are you sure you want to delete <span className="font-bold">{selectedStaff?.first_name}</span>? This action cannot be undone.
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