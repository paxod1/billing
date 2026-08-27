"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import ActionMenu from "@/components/commonComp/ActionMenu";
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
  FiEdit2,
  FiTrash2,
  FiX,
  FiUser,
  FiCheck,
  FiChevronDown,
  FiLayers,
  FiAlignLeft,
  FiMoreVertical
} from "react-icons/fi";

// ----------------------------------------------------------------------
// Constants & Data
// ----------------------------------------------------------------------
// Schema for List Creation/Update
const listSchema = z.object({
  category: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  payees: z.array(z.string()).optional() // Array of Payee IDs (using string for select inputs)
});

// ----------------------------------------------------------------------
// UI Components (Reused from Payee Manage)
// ----------------------------------------------------------------------

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-xl" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} transform transition-all scale-100 animate-in zoom-in-95 duration-200 my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 relative overflow-visible">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-50"
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

const TextAreaField = React.forwardRef(({ label, error, required = false, rows = 3, ...props }, ref) => (
  <div className="w-full">
    <label className="text-xs font-medium text-gray-700 mb-1.5 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      ref={ref}
      rows={rows}
      {...props}
      className={`w-full px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors
          ${error ? "border-red-500" : "border-gray-300"}`}
    />
    {error && (
      <p className="text-xs text-red-500 mt-1">{error.message || error}</p>
    )}
  </div>
));
TextAreaField.displayName = "TextAreaField";

const MultiSelectPayee = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Select payees...",
  disabled = false,
  loading = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openUp, setOpenUp] = useState(false);
  const buttonRef = React.useRef(null);

  const filteredOptions = options.filter(opt =>
    opt.ben_name.toLowerCase().includes(search.toLowerCase()) ||
    (opt.ben_code && opt.ben_code.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleDropdown = () => {
    if (!disabled && !loading) {
      if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUp(spaceBelow < 250);
      }
      setIsOpen(!isOpen);
    }
  };

  const toggleOption = (value) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(opt => opt.id.toString()));
    }
  };

  const selectedCount = selectedValues.length;
  const displayText = selectedCount > 0
    ? `${selectedCount} payee${selectedCount !== 1 ? 's' : ''} selected`
    : placeholder;

  return (
    <div className="relative w-full">
      <label className="text-xs font-medium text-gray-700 mb-1.5 block">Select Payees</label>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 text-sm text-left border rounded bg-white focus:outline-none flex justify-between items-center ${error ? "border-red-500" : "border-gray-300"} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}`}
      >
        <span className={selectedCount === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {loading ? "Loading..." : displayText}
        </span>
        <FiChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} size={14} />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-[1010]" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute z-[1011] w-full bg-white border border-gray-200 rounded shadow-lg flex flex-col max-h-52 overflow-hidden ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          >
            <div className="p-2 border-b border-gray-100 flex-shrink-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payees..."
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-yellow-400"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {filteredOptions.length > 0 && (
                <div
                  onClick={toggleSelectAll}
                  className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                >
                  <div className={`flex items-center justify-center w-4 h-4 border rounded mr-3 bg-white flex-shrink-0 ${selectedValues.length === options.length && options.length > 0 ? 'bg-[#FFCA00] border-[#FFCA00]' : 'border-gray-300'}`}>
                    {selectedValues.length === options.length && options.length > 0 && <FiCheck className="h-3 w-3 text-black" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Select All</span>
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">No payees found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.id.toString());
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleOption(opt.id.toString())}
                      className={`flex items-center px-3 py-2 cursor-pointer hover:bg-yellow-50 transition-colors ${isSelected ? 'bg-yellow-50' : ''}`}
                    >
                      <div className={`flex items-center justify-center w-4 h-4 border rounded mr-3 bg-white flex-shrink-0 transition-colors ${isSelected ? 'bg-[#FFCA00] border-[#FFCA00]' : 'border-gray-300'}`}>
                        {isSelected && <FiCheck className="h-3 w-3 text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{opt.ben_name}</div>
                        <div className="text-xs text-gray-500 truncate">{opt.ben_code}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error.message || error}</p>}
    </div>
  );
};


// ----------------------------------------------------------------------
// Form Component
// ----------------------------------------------------------------------

const ListForm = ({
  initialData,
  onSubmit,
  isLoading,
  isEdit = false,
  onClose,
  allPayees = []
}) => {
  const defaultValues = {
    category: isEdit ? (initialData.name || initialData.category) : "",
    description: isEdit ? (initialData.description || "") : "",
    payees: isEdit && initialData.employeeIds
      ? initialData.employeeIds
      : []
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(listSchema),
    defaultValues
  });

  const onFormSubmit = (data) => {
    // Ensure payees are array of integers
    const formattedPayees = (data.payees && Array.isArray(data.payees))
      ? data.payees.map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];

    const payload = {
      ...data,
      payees: formattedPayees
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <InputField
          label="List Name"
          required
          error={errors.category}
          {...register("category")}
          placeholder="e.g. Detailed Marketing Team"
          icon={FiLayers}
        />

        <TextAreaField
          label="Description"
          error={errors.description}
          {...register("description")}
          placeholder="Describe the purpose of this list..."
          rows={3}
        />

        <Controller
          control={control}
          name="payees"
          render={({ field }) => (
            <MultiSelectPayee
              options={allPayees}
              selectedValues={field.value}
              onChange={field.onChange}
              error={errors.payees}
            />
          )}
        />
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
            "Update List"
          ) : (
            "Create List"
          )}
        </button>
      </div>
    </form>
  );
};

// ----------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------
export default function PayeeListPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [lists, setLists] = useState([]);
  const [allPayees, setAllPayees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, transformOrigin: "top right" });

  // Pagination (Standard) - Client side filtering for lists usually, as API might not paginate nicely?
  // Previous code showed client-side pagination. I'll stick to client side simpler or mock server.
  // Assuming API returns all lists for now based on previous code pattern.
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Auto-correct pagination when data changes
  useEffect(() => {
    const totalFiltered = lists.filter(list =>
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.description.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
    const maxPages = Math.ceil(totalFiltered / pageSize) || 1;
    if (currentPage > maxPages) {
      setCurrentPage(maxPages);
    }
  }, [lists, searchQuery, currentPage, pageSize]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, payeesRes] = await Promise.all([
        authRequest.get("/api/payor/view_lists/"),
        authRequest.get("/api/payor/payee-list/") // Get all payees for selection
      ]);

      // Process Lists
      const rawLists = listRes.data.results || listRes.data || [];
      const processedLists = rawLists.map(list => ({
        id: list.id,
        name: list.category || list.name || `Payee List ${list.id}`,
        count: list.count || list.payee_count || 0,
        description: list.description || "",
        employeeIds: list.payees ? list.payees.map(p => p.id.toString()) : [],
        originalData: list
      }));
      setLists(processedLists);

      // Process Payees
      const rawPayees = payeesRes.data.results || payeesRes.data || [];
      setAllPayees(rawPayees);

    } catch (error) {
      console.error("Error fetching data:", error);
      dispatch(showToast({ message: "Failed to load lists", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  // Filter & Pagination Logic
  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLists.length / pageSize);
  const paginatedLists = filteredLists.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreate = async (data) => {
    try {
      setActionLoading(true);
      const response = await authRequest.post("/api/payor/create_edit_list/", data);
      dispatch(showToast({ message: "List created successfully", type: "success" }));
      setIsAddModalOpen(false);
      fetchData(); // Refresh
    } catch (error) {
      console.error("Create List Error:", error);
      dispatch(showToast({ message: "Failed to create list", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    try {
      setActionLoading(true);
      const payload = { ...data, id: parseInt(selectedList.id) };
      await authRequest.put('/api/payor/create_edit_list/', payload);
      dispatch(showToast({ message: "List updated successfully", type: "success" }));
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Update List Error:", error);
      dispatch(showToast({ message: "Failed to update list", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await authRequest.delete(`/api/payor/delete_list/${selectedList.id}/`);
      dispatch(showToast({ message: "List deleted successfully", type: "success" }));
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Delete List Error:", error);
      dispatch(showToast({ message: "Failed to delete list", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = async (list) => {
    // If we need fresh details or payee list for this specific list
    // Previously we fetched details. Let's try to pass current known data first.
    // If 'payees' in list object inside 'view_lists' is incomplete, might need detail fetch.
    // Assuming 'view_lists' gives payees or we fetch detail.
    // Based on previous code: fetch `/api/payor/payees_in_list/${list.id}/`
    setSelectedList(list);

    // Optimistic open, but we might want to fetch latest payee selection
    try {
      const response = await authRequest.get(`/api/payor/payees_in_list/${list.id}/`);
      const payeesInList = response.data.results || response.data || [];
      const updatedList = { ...list, employeeIds: payeesInList.map(p => p.id.toString()) };
      setSelectedList(updatedList);
      setIsEditModalOpen(true);
    } catch (e) {
      console.error("Failed to fetch list details", e);
      // Fallback to what we have
      setIsEditModalOpen(true);
    }
  };

  const handleMenuClick = (e, listId) => {
    e.stopPropagation();
    if (openMenuId === listId) {
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
    setOpenMenuId(listId);
  };

  const navbarData = {
    heading: "Payee Lists",
    subheading: "Manage groups of payees for bulk payments",
    from: "paymagics"
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar data={navbarData} />

      <main className="flex-1 py-8">
        <div className="w-full">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <div className="relative w-full md:w-80">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lists..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px]"
              />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <button className="w-full md:w-auto px-4 py-2 border border-gray-300 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
                <FiFilter size={16} /> Filter
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full md:w-auto px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#d9ac00]"
              >
                <FiPlus size={18} /> Create List
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Loading Lists...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {filteredLists.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">List Name</th>
                          <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Description</th>
                          <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Payee Count</th>
                          <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 text-center whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedLists.map((list) => (
                          <tr key={list.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-[14px] text-gray-900 font-medium">{list.name}</td>
                            <td className="px-6 py-4 text-[14px] text-gray-500 max-w-xs truncate">{list.description || "-"}</td>
                            <td className="px-6 py-4 text-[14px] text-gray-500">
                              <span className="flex items-center gap-2">
                                <FiUser size={14} /> {list.count} Payees
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => handleMenuClick(e, list.id)}
                                  className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === list.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                  {/* Pagination */}
                  <div className="px-6 bg-white border-t border-gray-100">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={(page) => setCurrentPage(page)}
                    />
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No Lists Found"
                  message={searchQuery ? "No results found for your search." : "Create a new payee list to get started."}
                  actionLabel={searchQuery ? "Clear Search" : "Create List"}
                  onActionClick={searchQuery ? () => setSearchQuery("") : () => setIsAddModalOpen(true)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Action Menu */}
      {openMenuId && (
        <ActionMenu
          isOpen={true}
          onClose={() => setOpenMenuId(null)}
          onView={() => {
            router.push(`/paymagics/payee/list/${openMenuId}`);
            setOpenMenuId(null);
          }}
          onEdit={() => {
            const list = lists.find(l => l.id === openMenuId);
            if (list) { openEdit(list); }
            setOpenMenuId(null);
          }}
          onDelete={() => {
            const list = lists.find(l => l.id === openMenuId);
            if (list) { setSelectedList(list); setIsDeleteModalOpen(true); }
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
        title={isEditModalOpen ? "Edit Payee List" : "Create Payee List"}
      >
        <ListForm
          initialData={selectedList}
          isEdit={isEditModalOpen}
          allPayees={allPayees}
          isLoading={actionLoading}
          onSubmit={isEditModalOpen ? handleUpdate : handleCreate}
          onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
        />
      </Modal>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FiTrash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete List</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete <span className="font-bold">{selectedList?.name}</span>?
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