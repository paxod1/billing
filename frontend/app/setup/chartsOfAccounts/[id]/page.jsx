"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { accountService } from "@/services/accountService";
import { showToast } from "@/lib/features/toast/toastSlice";
import {
    FiArrowLeft,
    FiTrendingUp,
    FiTrendingDown,
    FiActivity,
} from "react-icons/fi";

export default function AccountDetailPage() {
    const router = useRouter();
    const params = useParams();
    const dispatch = useDispatch();
    const accountId = params.id;

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [accountInfo, setAccountInfo] = useState(null);
    const [summary, setSummary] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const isMounted = useRef(false);

    useEffect(() => {
        if (!accountId) return;
        if (!isMounted.current) {
            // First load — show full-page loader
            isMounted.current = true;
            fetchDetails(true);
        } else {
            // Pagination / search — silent update
            fetchDetails(false);
        }
    }, [accountId, currentPage]);

    const fetchDetails = async (initial = false) => {
        try {
            if (initial) setIsInitialLoading(true);
            else setIsFetching(true);

            const skip = (currentPage - 1) * pageSize;
            const res = await accountService.getAccountDetails(accountId, pageSize, skip);

            const d = res?.data || {};
            setAccountInfo(d.account || null);
            setSummary(d.summary || null);
            setTransactions(d.transactions || []);
            setTotalCount(d.pagination?.total || 0);
        } catch (error) {
            console.error("Error fetching account details:", error);
            dispatch(showToast({ message: "Failed to load account transaction history", type: "error" }));
        } finally {
            setIsInitialLoading(false);
            setIsFetching(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    const fmt = (num) =>
        Math.abs(parseFloat(num) || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const navbarData = {
        heading: accountInfo?.name || "Account Detail",
        subheading: accountInfo
            ? `Category: ${accountInfo.category?.charAt(0).toUpperCase() + accountInfo.category?.slice(1) || "—"}  •  Account ID: ${accountInfo.id}`
            : "View all transactions for this account",
        from: "setup",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isInitialLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading account details..." />
                </div>
            ) : (
                <main className="flex-1 mt-6 flex flex-col">
                    <div className="w-full flex-1 flex flex-col">

                        {/* ── Top action bar ── */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => router.push("/setup/chartsOfAccounts")}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <FiArrowLeft size={16} /> Back to Charts of Accounts
                            </button>
                        </div>

                        {/* ── KPI Summary Cards ── */}
                        {summary && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                {/* Total Debits */}
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[13px] text-gray-500 font-medium mb-1">Total Debits</p>
                                        <p className="text-[22px] font-bold text-gray-900">
                                            ₹ {fmt(summary.total_debits)}
                                        </p>
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                                        <FiTrendingDown size={20} />
                                    </div>
                                </div>

                                {/* Total Credits */}
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[13px] text-gray-500 font-medium mb-1">Total Credits</p>
                                        <p className="text-[22px] font-bold text-gray-900">
                                            ₹ {fmt(summary.total_credits)}
                                        </p>
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0">
                                        <FiTrendingUp size={20} />
                                    </div>
                                </div>

                                {/* Current Balance */}
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[13px] text-gray-500 font-medium mb-1">Current Balance</p>
                                        <p className={`text-[22px] font-bold ${(summary.current_balance ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            ₹ {fmt(summary.current_balance)}
                                            <span className="text-[13px] font-semibold ml-1">
                                                {(summary.current_balance ?? 0) >= 0 ? "Dr" : "Cr"}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                                        <FiActivity size={20} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Transactions Table ── */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {/* Silent fetch overlay */}
                            {isFetching && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                                    <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-xl shadow border border-gray-100 text-sm font-medium text-gray-500">
                                        <svg className="animate-spin w-4 h-4 text-[#FFCA00]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                        Updating...
                                    </div>
                                </div>
                            )}
                            {transactions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[900px] lg:min-w-0">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">#</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Reference</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Description</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Entry Type</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Debit</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Credit</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {transactions.map((txn, index) => (
                                                    <tr key={txn.journal_id ?? index} className="hover:bg-gray-50 transition-colors">
                                                        {/* # */}
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-500 whitespace-nowrap">
                                                            {(currentPage - 1) * pageSize + index + 1}
                                                        </td>

                                                        {/* Date */}
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-500 whitespace-nowrap">
                                                            {txn.date
                                                                ? new Date(txn.date).toLocaleDateString("en-IN", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })
                                                                : "—"}
                                                        </td>

                                                        {/* Reference */}
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-900 font-medium whitespace-nowrap">
                                                            {txn.reference || "—"}
                                                        </td>

                                                        {/* Description */}
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 max-w-[280px] truncate" title={txn.description}>
                                                            {txn.description || "—"}
                                                        </td>

                                                        {/* Entry Type badge */}
                                                        <td className="px-4 lg:px-6 py-5 whitespace-nowrap">
                                                            <span className="inline-block px-2.5 py-1 rounded-full text-[12px] font-semibold bg-gray-100 text-gray-700 capitalize">
                                                                {txn.entry_type?.toLowerCase().replace(/_/g, " ") || "—"}
                                                            </span>
                                                        </td>

                                                        {/* Debit */}
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-right whitespace-nowrap">
                                                            {parseFloat(txn.debit) > 0 ? (
                                                                <span className="text-red-600 font-medium">
                                                                    ₹ {fmt(txn.debit)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>

                                                        {/* Credit */}
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-right whitespace-nowrap">
                                                            {parseFloat(txn.credit) > 0 ? (
                                                                <span className="text-green-600 font-medium">
                                                                    ₹ {fmt(txn.credit)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>

                                                        {/* Running Balance */}
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-right whitespace-nowrap font-semibold text-gray-900">
                                                            ₹ {fmt(txn.balance)}
                                                            <span className={`ml-1 text-[11px] font-bold ${(txn.balance ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                                {(txn.balance ?? 0) >= 0 ? "Dr" : "Cr"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Transactions Found"
                                    message="There are no transaction records for this account."
                                    actionLabel=""
                                    onActionClick={() => {}}
                                />
                            )}
                        </div>

                        {/* ── Pagination ── */}
                        <div className="mt-6">
                            {transactions.length > 0 && totalCount > pageSize && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalCount}
                                    pageSize={pageSize}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </div>

                    </div>
                </main>
            )}
        </div>
    );
}
