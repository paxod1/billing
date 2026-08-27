"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { authRequest } from "@/lib/axiosCreate";
import { showToast } from "@/lib/features/toast/toastSlice";

// React Icons
import {
  IoSearchOutline,
} from "react-icons/io5";
import {
  FiEdit2,
  FiTrash2,
  FiX,
  FiUser,
  FiArrowLeft,
  FiMoreVertical,
  FiCheck,
  FiFilter
} from "react-icons/fi";
import ActionMenu from "@/components/commonComp/ActionMenu";

// ----------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------

export default function PayeeListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const listId = params.id;

  const [payees, setPayees] = useState([]);
  const [listInfo, setListInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selection
  const [selectedRows, setSelectedRows] = useState([]);

  // Action Menu State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, transformOrigin: "top right" });
  const [selectedPayee, setSelectedPayee] = useState(null);

  // Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isBulkRemoveModalOpen, setIsBulkRemoveModalOpen] = useState(false);

  // Auto-correct pagination when data changes
  useEffect(() => {
    const totalFiltered = payees.filter(payee =>
      payee.ben_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payee.ben_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payee.contact?.includes(searchQuery)
    ).length;
    const maxPages = Math.ceil(totalFiltered / pageSize) || 1;
    if (currentPage > maxPages) {
      setCurrentPage(maxPages);
    }
  }, [payees, searchQuery, currentPage, pageSize]);

  useEffect(() => {
    if (listId) {
      fetchData();
    }
  }, [listId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, payeesRes] = await Promise.all([
        authRequest.get("/api/payor/view_lists/"),
        authRequest.get(`/api/payor/payees_in_list/${listId}/`)
      ]);

      // Process Lists info
      const rawLists = listRes.data.results || listRes.data || [];
      const currentList = rawLists.find(l => l.id.toString() === listId);
      if (currentList) {
        setListInfo({
          name: currentList.category || currentList.name || "Payee List",
          description: currentList.description || `${currentList.category} list`,
          count: currentList.count || currentList.payee_count || 0
        });
      }

      // Process Payees
      const rawPayees = payeesRes.data.results || payeesRes.data || [];
      setPayees(rawPayees);

    } catch (error) {
      console.error("Error fetching data:", error);
      dispatch(showToast({ message: "Failed to load data", type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedPayees.length && paginatedPayees.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedPayees.map(p => p.id));
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // Filter & Pagination Logic
  const filteredPayees = payees.filter(payee =>
    payee.ben_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payee.ben_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payee.contact?.includes(searchQuery)
  );

  const totalPages = Math.ceil(filteredPayees.length / pageSize);
  const paginatedPayees = filteredPayees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleMenuClick = (e, payeeId) => {
    e.stopPropagation();
    if (openMenuId === payeeId) {
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
    setOpenMenuId(payeeId);
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await authRequest.delete(`/api/payor/delete_payee/${selectedPayee.id}/`);
      dispatch(showToast({ message: "Payee deleted successfully", type: "success" }));
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Delete Error:", error);
      dispatch(showToast({ message: "Failed to delete payee", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFromList = async () => {
    try {
      setActionLoading(true);
      await authRequest.post(`/api/payor/remove_from_list/`, {
        category_id: listId,
        payee_id: selectedPayee.id
      });
      dispatch(showToast({ message: "Payee removed from list", type: "success" }));
      setIsRemoveModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Remove Error:", error);
      dispatch(showToast({ message: "Failed to remove payee from list", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkRemove = async () => {
    try {
      setActionLoading(true);
      const promises = selectedRows.map(id =>
        authRequest.post(`/api/payor/remove_from_list/`, {
          category_id: listId,
          payee_id: id
        })
      );
      await Promise.all(promises);
      dispatch(showToast({ message: `${selectedRows.length} payees removed from list`, type: "success" }));
      setSelectedRows([]);
      setIsBulkRemoveModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Bulk Remove Error:", error);
      dispatch(showToast({ message: "Failed to remove some payees", type: "error" }));
    } finally {
      setActionLoading(false);
    }
  };

  const navbarData = {
    heading: listInfo?.name || "Payee List",
    subheading: listInfo?.description || "Manage payees within this list",
    from: "paymagics"
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar data={navbarData} />

      <main className="flex-1 py-8">
        <div className="w-full">
          {/* Action Bar - Matching page.jsx model */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <div className="relative w-full md:w-80">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payees..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px]"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {selectedRows.length > 0 && (
                <button
                  onClick={() => setIsBulkRemoveModalOpen(true)}
                  className="px-4 py-2 border border-orange-200 text-orange-600 rounded-lg text-[14px] font-medium hover:bg-orange-50 flex items-center gap-2 transition-all shadow-sm"
                >
                  <FiTrash2 size={16} /> Remove Selected ({selectedRows.length})
                </button>
              )}
              <button className="px-4 py-2 border border-gray-300 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 flex items-center gap-2">
                <FiFilter size={16} /> Filter
              </button>
              <button
                onClick={() => router.push("/paymagics/payee/list")}
                className="px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center gap-2 hover:bg-[#d9ac00]"
              >
                <FiArrowLeft size={18} /> Back to Lists
              </button>
            </div>
          </div>

          {/* Table Container - Matching page.jsx model */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-500 font-medium">Loading Payees...</p>
                </div>
              </div>
            ) : (
              <>
                {filteredPayees.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 w-10">
                              <div
                                onClick={handleSelectAll}
                                className={`w-5 h-5 border rounded flex items-center justify-center cursor-pointer transition-colors ${selectedRows.length === paginatedPayees.length && paginatedPayees.length > 0 ? 'bg-[#FFCA00] border-[#FFCA00]' : 'border-gray-300 bg-white'}`}
                              >
                                {selectedRows.length === paginatedPayees.length && paginatedPayees.length > 0 && <FiCheck className="text-white" size={12} />}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Ben Code</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Ben Name</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap text-center">Contact</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Email</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 whitespace-nowrap">Type</th>
                            <th className="px-6 py-4 text-[13px] font-semibold text-gray-700 text-center whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedPayees.map((payee) => (
                            <tr key={payee.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div
                                  onClick={() => toggleSelectRow(payee.id)}
                                  className={`w-5 h-5 border rounded flex items-center justify-center cursor-pointer transition-colors ${selectedRows.includes(payee.id) ? 'bg-[#FFCA00] border-[#FFCA00]' : 'border-gray-300 bg-white'}`}
                                >
                                  {selectedRows.includes(payee.id) && <FiCheck className="text-white" size={12} />}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-[14px] text-gray-900 font-medium font-mono whitespace-nowrap">{payee.ben_code}</td>
                              <td className="px-6 py-4 text-[14px] text-gray-900 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                    {payee.ben_name.charAt(0)}
                                  </div>
                                  {payee.ben_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-[14px] text-gray-500 whitespace-nowrap text-center">{payee.contact}</td>
                              <td className="px-6 py-4 text-[14px] text-gray-500 whitespace-nowrap">{payee.email}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${payee.payee_type === 'INTERNATIONAL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {payee.payee_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={(e) => handleMenuClick(e, payee.id)}
                                  className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === payee.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                >
                                  <FiMoreVertical size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

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
                    title="No Payees Found"
                    message={searchQuery ? "No results found for your search." : "No payees found in this list."}
                    actionLabel={searchQuery ? "Clear Search" : "Back to Lists"}
                    onActionClick={searchQuery ? () => setSearchQuery("") : () => router.push("/paymagics/payee/list")}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Action Menu */}
      {openMenuId && (
        <ActionMenu
          isOpen={true}
          onClose={() => setOpenMenuId(null)}
          anchorMode="fixed"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            transformOrigin: menuPosition.transformOrigin
          }}
          onEdit={() => {
            const p = payees.find(x => x.id === openMenuId);
            if (p) router.push(`/paymagics/payee/manage?edit=${p.id}`);
            setOpenMenuId(null);
          }}
          onDelete={() => {
            const p = payees.find(x => x.id === openMenuId);
            if (p) { setSelectedPayee(p); setIsDeleteModalOpen(true); }
            setOpenMenuId(null);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const p = payees.find(x => x.id === openMenuId);
              if (p) { setSelectedPayee(p); setIsRemoveModalOpen(true); }
              setOpenMenuId(null);
            }}
            className="w-full px-4 py-3 text-left text-[14px] font-medium text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-3"
          >
            <FiX size={16} /> Remove from List
          </button>
        </ActionMenu>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FiTrash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Payee</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete <span className="font-bold">{selectedPayee?.ben_code}</span>? This will permanently delete the payee.
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-lg"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove from List Modal */}
      {isRemoveModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                <FiX className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Remove from List</h3>
              <p className="mt-2 text-sm text-gray-500">
                Remove <span className="font-bold">{selectedPayee?.ben_name}</span> from this list? The payee will not be deleted.
              </p>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => setIsRemoveModalOpen(false)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveFromList}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shadow-lg"
              >
                {actionLoading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Remove Modal */}
      {isBulkRemoveModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                <FiX className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Remove Payees</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to remove <span className="font-bold">{selectedRows.length}</span> selected payees from this list? They will still remain in the system.
              </p>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => setIsBulkRemoveModalOpen(false)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRemove}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shadow-lg"
              >
                {actionLoading ? "Removing..." : "Remove Selected"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}