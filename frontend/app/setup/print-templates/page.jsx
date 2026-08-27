"use client";

import React, { useState, useRef, useEffect } from "react";
import Navbar from "@/components/commonComp/Navbar";
import Pagination from "@/components/commonComp/Pagination";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { FiLoader, FiPrinter, FiDownload } from "react-icons/fi";
import TemplatePreview from "@/components/setup/TemplatePreview";

const demoPrintTemplates = [
    { id: 1, name: "Sales Invoice", type: "SALES_INVOICE" },
    { id: 2, name: "Sales Quote", type: "QUOTE" },
    { id: 3, name: "Proforma Invoice", type: "PROFORMA_INVOICE" },
    { id: 4, name: "Purchase Order", type: "PURCHASE_ORDER" },
    { id: 5, name: "Purchase Invoice", type: "PURCHASE_INVOICE" },
    { id: 6, name: "Sales Payment", type: "SALES_PAYMENT" },
    { id: 7, name: "Purchase Payment", type: "PURCHASE_PAYMENT" },
    { id: 8, name: "Time Tracker", type: "TIME" },
    { id: 9, name: "Mileage Tracker", type: "MILEAGE" },
    { id: 10, name: "Project Estimate", type: "ESTIMATION" },
];

export default function PrintTemplatesPage() {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [templates, setTemplates] = useState(demoPrintTemplates);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeAction, setActiveAction] = useState(null); // { template: obj, type: 'print' | 'pdf' }
    const previewRef = useRef(null);

    const pageSize = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
            setIsFirstLoad(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Handle background processing for print/pdf
    useEffect(() => {
        if (activeAction && previewRef.current) {
            // Delay ensures the hidden TemplatePreview has fully rendered
            const timer = setTimeout(() => {
                if (activeAction.type === 'print') {
                    previewRef.current.print();
                } else if (activeAction.type === 'pdf') {
                    previewRef.current.downloadPdf();
                }
                setActiveAction(null);
            }, 800); // Slightly longer delay for reliability
            return () => clearTimeout(timer);
        }
    }, [activeAction]);

    const totalPages = Math.ceil(templates.length / pageSize);
    const paginatedTemplates = templates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const navbarData = {
        heading: "Print Templates",
        subheading: "Personalize Your Business Print Formats",
        from: "setup",
    };

    const handlePrint = (template) => {
        dispatch(showToast({ type: "info", message: "Preparing print format..." }));
        setActiveAction({ template, type: 'print' });
    };

    const handleDownloadPdf = (template) => {
        dispatch(showToast({ type: "info", message: "Preparing PDF download..." }));
        setActiveAction({ template, type: 'pdf' });
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isLoading && isFirstLoad ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading print templates..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-8 ">
                    <div className="w-full flex-1 flex flex-col">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {paginatedTemplates.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 w-16 whitespace-nowrap">#</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Template Name</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Type</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right w-32 whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedTemplates.map((template, index) => (
                                                <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-5 text-[14px] lg:text-[15px] text-gray-900 whitespace-nowrap">
                                                        {(currentPage - 1) * pageSize + index + 1}
                                                    </td>
                                                    <td className="px-6 py-5 text-[14px] lg:text-[15px] text-gray-900 font-semibold whitespace-nowrap">
                                                        {template.name}
                                                    </td>
                                                    <td className="px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap capitalize">
                                                        {template.type.toLowerCase().replace(/_/g, " ")}
                                                    </td>
                                                    <td className="px-6 py-5 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handlePrint(template)}
                                                                className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-[#FFCA00] hover:border-[#FFCA00] hover:bg-gray-50 transition-all cursor-pointer"
                                                                title="Print"
                                                            >
                                                                <FiPrinter size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadPdf(template)}
                                                                className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-500 hover:bg-gray-50 transition-all cursor-pointer"
                                                                title="Download PDF"
                                                            >
                                                                <FiDownload size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Print Templates Found"
                                    message="No print templates available to display."
                                    actionLabel=""
                                    onActionClick={() => { }}
                                />
                            )}
                        </div>

                        {templates.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={templates.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                </main>
            )}

            {/* Off-screen container for background print/PDF generation */}
            <div style={{
                position: 'fixed',
                left: '-1000px', // Closer to viewport but still hidden
                top: '0',
                pointerEvents: 'none',
                zIndex: -1,
                opacity: 1,
                display: 'block',
                width: '800px',
                height: 'auto',
                overflow: 'visible'
            }}>
                {activeAction && (
                    <TemplatePreview
                        ref={previewRef}
                        type={activeAction.template.type}
                        filename={activeAction.template.name}
                    />
                )}
            </div>
        </div>
    );
}
