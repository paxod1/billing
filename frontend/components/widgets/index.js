"use client";

import React from "react";
import {
    LuTrendingUp,
    LuTrendingDown,
    LuDollarSign,
    LuFileSpreadsheet,
    LuPackage,
    LuClock,
    LuCar,
    LuPercent,
    LuCheck,
    LuTriangleAlert,
    LuLayers,
    LuCircleDollarSign
} from "react-icons/lu";

// Utility for formatting currency beautifully in Indian Rupees
const formatCurrency = (val) => {
    if (val === undefined || val === null) return "₹0.00";
    const numericValue = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(numericValue)) return "₹0.00";
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(numericValue);
};

// Fallbacks representing the actual backend response structures
const fallbackFinancial = {
    net_profit_margin: {
        current_month_income: 8872,
        current_month_expenses: 2940,
        net_profit: 5932,
        margin_pct: 66.86,
        label: "66.86%"
    },
    revenue_vs_expenses: {
        current_month: {
            revenue: 8872,
            expenses: 2940,
            profit: 5932
        }
    },
    liquidity: {
        cash_balance: -65194,
        accounts_receivable: 2158.6,
        liquid_assets: -63035.4,
        accounts_payable: 55456,
        ratio: -1.14,
        label: "-1.14:1",
        status: "critical"
    },
    cash_balance: {
        amount: -65194,
        label: "-₹65,194.00"
    },
    estimated_tax: {
        taxable_income_this_month: 8872,
        estimated_tax_at_18_pct: 1596.96,
        note: "Blended 18% on current-month income account net. Use /reports/tax filing for exact GST breakdown."
    },
    top_expense_categories: [
        { name: "Cost of Goods Sold", amount: 3140 },
        { name: "Operating Expenses", amount: 100 }
    ],
    trial_balance_status: {
        consistent: true,
        total_debit: 324302.6,
        total_credit: 324302.6,
        difference: 0,
        status_label: "Balanced ✓"
    },
    break_even: {
        income: 8872,
        expenses: 2940,
        progress_pct: 200,
        reached: true,
        surplus_deficit: 5932
    }
};

const fallbackOperations = {
    receivables: {
        total: 8052.6,
        aging: {
            current: { label: "Current (0–30 days)", count: 4, amount: 8052.6 },
            days_31_60: { label: "31–60 days", count: 0, amount: 0 },
            days_61_90: { label: "61–90 days", count: 0, amount: 0 },
            over_90: { label: "Over 90 days", count: 0, amount: 0 }
        }
    },
    payables: {
        total: 109128,
        upcoming_obligations: [
            { invoice_number: "PIN-0429-DHTH", invoice_name: "wholesale purchase 2", amount: 54600, age_days: 19 },
            { invoice_number: "PON-0506-HCHU-I1", invoice_name: "Return for Purchase", amount: 8850, age_days: 12 },
            { invoice_number: "PIN-0508-LHYP", invoice_name: "for order test", amount: 1200, age_days: 10 }
        ]
    },
    collection_period: {
        avg_days: 2,
        paid_invoices: 4,
        label: "2 days avg",
        health: "excellent"
    },
    inventory: {
        total_valuation: 43570,
        total_items: 22,
        low_stock_count: 13,
        top_by_value: [
            { name: "Glass Stool", qty: 24, valuation: 12000 },
            { name: "Branded Hoodie", qty: 10, valuation: 8000 },
            { name: "Glass Table", qty: 5, valuation: 5000 }
        ]
    },
    unbilled_services: {
        total_unbilled: 15141.94,
        time_entries: { count: 2, amount: 225 },
        mileage_entries: { count: 2, amount: 1400.34 },
        pending_estimations: { count: 2, amount: 13516.6 }
    }
};

const fallbackSales = {
    sales_conversion: {
        rates: {
            estimation_to_quote_pct: 62.5,
            quote_to_invoice_pct: 40,
            overall_conversion_pct: 12.5
        },
        funnel: {
            estimations: { count: 8 },
            quotes: { count: 5 },
            proformas: { count: 10 },
            invoices: { count: 13 }
        }
    },
    revenue_breakdown: {
        total_revenue: 40718.8,
        chart_data: [
            { label: "Products", value: 8046.8, pct: 19.76 },
            { label: "Customised Products", value: 22740, pct: 55.85 },
            { label: "Services", value: 9932, pct: 24.39 }
        ]
    }
};

// -------------------------------------------------------------
// WIDGET 1: NET PROFIT MARGIN (%)
// -------------------------------------------------------------
export const NetProfitMarginWidget = ({ apiData, isPreview }) => {
    const data = apiData?.financial?.net_profit_margin || fallbackFinancial.net_profit_margin;

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Net Profit Margin</h3>
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    {data.label || `${data.margin_pct}%`}
                </h3>
                <span className="text-[11px] font-semibold text-gray-400 block">
                    Rev {formatCurrency(data.current_month_income)} | Exp {formatCurrency(data.current_month_expenses)}
                </span>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 2: TOTAL REVENUE VS TOTAL EXPENSES
// -------------------------------------------------------------
export const RevenueVsExpensesWidget = ({ apiData, isPreview }) => {
    const data = apiData?.financial?.revenue_vs_expenses?.current_month || fallbackFinancial.revenue_vs_expenses.current_month;
    const total = (data.revenue || 0) + (data.expenses || 0);
    const revPct = total > 0 ? ((data.revenue || 0) / total) * 100 : 0;
    const expPct = total > 0 ? ((data.expenses || 0) / total) * 100 : 0;

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Revenue vs Expenses</h3>
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">
                        {formatCurrency(data.revenue)}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                        Profit: {formatCurrency(data.profit)}
                    </span>
                </div>
            </div>

            <div className="space-y-2 mt-2">
                <div className="w-full h-2 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${revPct}%` }} title="Revenue" />
                    <div className="bg-rose-500 h-full" style={{ width: `${expPct}%` }} title="Expenses" />
                </div>
                <div className="flex justify-between items-center text-[13px] font-bold">
                    <span className="text-emerald-600">Rev: {revPct.toFixed(0)}%</span>
                    <span className="text-rose-500 font-bold">Exp: {expPct.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 3: CURRENT LIQUIDITY RATIO
// -------------------------------------------------------------
export const LiquidityRatioWidget = ({ apiData, isPreview }) => {
    const data = apiData?.financial?.liquidity || fallbackFinancial.liquidity;
    const isCritical = data.status === "critical";

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Liquidity Ratio</h3>
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
                    {data.label || `${data.ratio || 0}:1`}
                </h3>
                <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isCritical ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {data.status || "Healthy"}
                    </span>
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 4: TOTAL RECEIVABLES & OVERDUE AGING
// -------------------------------------------------------------
export const ReceivablesAgingWidget = ({ apiData, isPreview }) => {
    const data = apiData?.operations?.receivables || fallbackOperations.receivables;
    const aging = data.aging || {};

    return (
        <div className={`p-4 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[14px] font-bold text-gray-800 mb-1.5">Total Receivables</h3>
                <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-extrabold text-gray-900">
                        {formatCurrency(data.total)}
                    </span>
                </div>
            </div>

            <div className="bg-[#FFF9F2] rounded-xl p-2.5 flex justify-between gap-4 text-[12px] mt-auto">
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center text-[#7C6E65]">
                        <span className="font-medium">0-30 days</span>
                        <span className="font-bold text-gray-800">{formatCurrency(aging.current?.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#7C6E65]">
                        <span className="font-medium">31-60 days</span>
                        <span className="font-bold text-gray-800">{formatCurrency(aging.days_31_60?.amount || 0)}</span>
                    </div>
                </div>
                <div className="w-[1px] bg-[#E6DEC9] self-stretch" />
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center text-[#7C6E65]">
                        <span className="font-medium">61-90 days</span>
                        <span className="font-bold text-gray-800">{formatCurrency(aging.days_61_90?.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#7C6E65]">
                        <span className="font-medium">Over 90 days</span>
                        <span className="font-bold text-gray-800">{formatCurrency(aging.over_90?.amount || 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 5: TOTAL PAYABLES & UPCOMING OBLIGATIONS
// -------------------------------------------------------------
export const PayablesObligationsWidget = ({ apiData, isPreview }) => {
    const data = apiData?.operations?.payables || fallbackOperations.payables;
    const obligations = data.upcoming_obligations || [];

    return (
        <div className={`p-4 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[14px] font-bold text-gray-800 mb-1.5">Total Payables</h3>
                <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-extrabold text-gray-900">
                        {formatCurrency(data.total)}
                    </span>
                </div>
            </div>

            <div className="bg-[#FFF5F5] rounded-xl p-2.5 flex justify-between gap-4 text-[12px] mt-auto">
                {obligations.slice(0, 2).map((ob, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <div className="w-[1px] bg-[#E9D9D9] self-stretch" />}
                        <div className="flex-1 flex justify-between items-center min-w-0">
                            <div className="flex flex-col truncate pr-1">
                                <span className="font-semibold text-gray-805 truncate max-w-[85px]">{ob.invoice_name || "Supplier bill"}</span>
                                <span className="text-[10px] text-[#A08E8E] font-medium truncate">{ob.invoice_number}</span>
                            </div>
                            <span className="font-bold text-rose-600 shrink-0">{formatCurrency(ob.amount)}</span>
                        </div>
                    </React.Fragment>
                ))}
                {obligations.length === 0 && (
                    <span className="text-xs text-gray-400 italic block text-center w-full py-1">No upcoming payables</span>
                )}
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 6: AVAILABLE CASH BALANCE
// -------------------------------------------------------------
export const CashBalanceWidget = ({ apiData, isPreview }) => {
    const data = apiData?.financial?.cash_balance || fallbackFinancial.cash_balance;
    const amount = data.amount || 0;
    const isNegative = amount < 0;

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Cash Balance</h3>
                <h3 className={`text-3xl font-extrabold tracking-tight ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                    {data.label || formatCurrency(amount)}
                </h3>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 7: ESTIMATED TAX LIABILITY
// -------------------------------------------------------------
export const EstimatedTaxWidget = ({ apiData, isPreview }) => {
    const data = apiData?.financial?.estimated_tax || fallbackFinancial.estimated_tax;

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Estimated Tax</h3>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2">
                    {formatCurrency(data.estimated_tax_at_18_pct)}
                </h3>
                <span className="text-xs font-bold text-blue-600 hover:underline cursor-pointer block">
                    View Full Report
                </span>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 8: SALES CONVERSION RATE
// -------------------------------------------------------------
export const SalesConversionWidget = ({ apiData, isPreview }) => {
    const data = apiData?.sales?.sales_conversion || fallbackSales.sales_conversion;
    const rates = data.rates || {};
    const funnel = data.funnel || {};

    return (
        <div className={`p-4 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[14px] font-bold text-gray-800 mb-1.5">Sales Conversion</h3>
                <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-extrabold text-gray-900">
                        {rates.overall_conversion_pct || 0}%
                    </span>
                    <span className="text-xs font-medium text-gray-405 ml-2">in last 7 days</span>
                </div>
            </div>

            <div className="bg-gray-100/70 rounded-xl p-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] w-full mt-auto">
                <div className="flex justify-between items-center min-w-0">
                    <span className="text-gray-500 truncate mr-1">Est. to Quote</span>
                    <span className="font-bold text-gray-900 shrink-0">{rates.estimation_to_quote_pct || 0}%</span>
                </div>
                <div className="flex justify-between items-center min-w-0">
                    <span className="text-gray-505 truncate mr-1">Quote to Inv</span>
                    <span className="font-bold text-green-600 shrink-0">{rates.quote_to_invoice_pct || 0}%</span>
                </div>
                <div className="flex justify-between items-center min-w-0">
                    <span className="text-gray-505 truncate mr-1">Draft Est.</span>
                    <span className="font-bold text-gray-900 shrink-0">{funnel.estimations?.count || 0}</span>
                </div>
                <div className="flex justify-between items-center min-w-0">
                    <span className="text-gray-505 truncate mr-1">Draft Quotes</span>
                    <span className="font-bold text-gray-900 shrink-0">{funnel.quotes?.count || 0}</span>
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 9: REVENUE BREAKDOWN
// -------------------------------------------------------------
export const RevenueBreakdownWidget = ({ apiData, isPreview }) => {
    const data = apiData?.sales?.revenue_breakdown || fallbackSales.revenue_breakdown;
    const chartData = data.chart_data || [];

    return (
        <div className={`p-4 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[14px] font-bold text-gray-800 mb-1.5">Revenue</h3>
                <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-extrabold text-gray-900">
                        {formatCurrency(data.total_revenue)}
                    </span>
                    <span className="text-xs font-medium text-gray-400 ml-2">in last 7 days</span>
                </div>
            </div>

            <div className="bg-gray-100/70 rounded-xl p-2.5 flex justify-between items-center gap-2 text-[12px] w-full mt-auto">
                {chartData.map((item, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <div className="w-[1px] bg-gray-300 self-stretch" />}
                        <div className="flex-1 flex flex-col items-center text-center min-w-0">
                            <span className="font-bold text-gray-900 truncate w-full">{formatCurrency(item.value)}</span>
                            <span className="text-gray-500 text-[11px] truncate w-full">{item.label}</span>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 10: AVERAGE COLLECTION PERIOD
// -------------------------------------------------------------
export const CollectionPeriodWidget = ({ apiData, isPreview }) => {
    const data = apiData?.operations?.collection_period || fallbackOperations.collection_period;
    const label = data.label || `${data.avg_days} Days`;
    const isLong = label.length > 15;

    return (
        <div className={`p-4 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[14px] font-bold text-gray-800 mb-1.5">Collection Period</h3>
                <h3 className={`font-extrabold text-gray-900 tracking-tight mb-2 ${isLong ? 'text-base sm:text-lg' : 'text-3xl'}`}>
                    {label}
                </h3>
                <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600">
                        {data.health || "Good"}
                    </span>
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 11: INVENTORY VALUATION & TURNOVER RATE
// -------------------------------------------------------------
export const InventoryStatusWidget = ({ apiData, isPreview }) => {
    const data = apiData?.operations?.inventory || fallbackOperations.inventory;

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Inventory</h3>
                <h3 className="text-3xl font-extrabold text-gray-900">
                    {formatCurrency(data.total_valuation)}
                </h3>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 12: TOP 5 EXPENSE CATEGORIES
// -------------------------------------------------------------
export const TopExpensesWidget = ({ apiData, isPreview }) => {
    const categories = apiData?.financial?.top_expense_categories || fallbackFinancial.top_expense_categories;
    const totalExp = categories.reduce((sum, item) => sum + (item.amount || 0), 0);

    return (
        <div className={`p-4 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[14px] font-bold text-gray-800 mb-1.5">Top Expenses</h3>
                <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-extrabold text-gray-900">
                        {formatCurrency(totalExp)}
                    </span>
                    <span className="text-xs font-medium text-gray-400 ml-2">in last 7 days</span>
                </div>
            </div>

            <div className="bg-gray-100/70 rounded-xl p-2.5 flex justify-between items-center gap-2 text-[12px] w-full mt-auto">
                {categories.slice(0, 3).map((item, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <div className="w-[1px] bg-gray-300 self-stretch" />}
                        <div className="flex-1 flex flex-col items-center text-center min-w-0">
                            <span className="font-bold text-gray-900 truncate w-full">{formatCurrency(item.amount)}</span>
                            <span className="text-gray-500 text-[11px] truncate w-full">{item.name}</span>
                        </div>
                    </React.Fragment>
                ))}
                {categories.length === 0 && (
                    <span className="text-xs text-gray-400 italic block text-center w-full py-1">No expenses recorded</span>
                )}
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 13: UNBILLED SERVICE VALUE
// -------------------------------------------------------------
export const UnbilledServicesWidget = ({ apiData, isPreview }) => {
    const data = apiData?.operations?.unbilled_services || fallbackOperations.unbilled_services;

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Unbilled Services</h3>
                <h3 className="text-3xl font-extrabold text-gray-900">
                    {formatCurrency(data.total_unbilled)}
                </h3>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 14: BREAK-EVEN PROGRESS
// -------------------------------------------------------------
export const BreakEvenWidget = ({ apiData, isPreview }) => {
    const data = apiData?.financial?.break_even || fallbackFinancial.break_even;
    const progress = data.progress_pct || 0;

    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-2">Break Even</h3>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-2">
                    {progress}%
                </h3>
                <span className="text-[13px] font-semibold text-gray-400 block mb-2">
                    Surplus: {formatCurrency(data.surplus_deficit)}
                </span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// WIDGET 15: TRIAL BALANCE STATUS
// -------------------------------------------------------------
export const TrialBalanceWidget = ({ apiData, isPreview }) => {
    const data = apiData?.financial?.trial_balance_status || fallbackFinancial.trial_balance_status;

    return (
        <div className={`p-4 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <h3 className="text-[14px] font-bold text-gray-800 mb-1.5">Trial Balance</h3>
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xl font-bold text-emerald-600">
                        {data.status_label || "Balanced ✓"}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="bg-[#EBF7EE] rounded-xl p-2.5 text-center min-w-0">
                    <span className="block text-sm font-bold text-slate-800 mb-0.5 truncate">
                        {formatCurrency(data.total_debit)}
                    </span>
                    <span className="text-[11px] font-semibold text-[#5A9266] uppercase tracking-wider block truncate">
                        Total Debits
                    </span>
                </div>
                <div className="bg-[#FFF0F0] rounded-xl p-2.5 text-center min-w-0">
                    <span className="block text-sm font-bold text-slate-800 mb-0.5 truncate">
                        {formatCurrency(data.total_credit)}
                    </span>
                    <span className="text-[11px] font-semibold text-[#C26B6B] uppercase tracking-wider block truncate">
                        Total Credits
                    </span>
                </div>
            </div>
        </div>
    );
};

// -------------------------------------------------------------
// LEGACY STAT WIDGET FOR SIMPLE PREVIEWS
// -------------------------------------------------------------
const StatWidget = ({ title, value, change, isPreview }) => {
    return (
        <div className={`p-5 bg-white rounded-2xl flex flex-col h-full justify-between shadow-sm hover:shadow-md transition-shadow ${isPreview ? 'pointer-events-none' : ''}`}>
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-[15px] font-bold text-gray-800 mb-2">{title}</h3>
                </div>
                <span className="text-3xl font-extrabold text-[#353333] tracking-tight">{value || "₹0"}</span>
            </div>
            <span className="text-xs font-semibold text-gray-400 mt-3 pt-3 border-t border-gray-100">{change || "+0 from last month"}</span>
        </div>
    );
};

// Map widget keys to components
export const widgetComponents = {
    "net-profit-margin": NetProfitMarginWidget,
    "revenue-vs-expenses": RevenueVsExpensesWidget,
    "liquidity-ratio": LiquidityRatioWidget,
    "receivables-aging": ReceivablesAgingWidget,
    "payables-obligations": PayablesObligationsWidget,
    "cash-balance": CashBalanceWidget,
    "estimated-tax": EstimatedTaxWidget,
    "sales-conversion": SalesConversionWidget,
    "revenue-breakdown": RevenueBreakdownWidget,
    "collection-period": CollectionPeriodWidget,
    "inventory-status": InventoryStatusWidget,
    "top-expenses": TopExpensesWidget,
    "unbilled-services": UnbilledServicesWidget,
    "break-even": BreakEvenWidget,
    "trial-balance": TrialBalanceWidget,

    // Legacy fallback mappings to prevent breaks
    "profit-loss": NetProfitMarginWidget,
    "cashflow": CashBalanceWidget,
    "break-even-tax": EstimatedTaxWidget,
    "receivables-payables": ReceivablesAgingWidget,
    "monthly-revenue": NetProfitMarginWidget,
    "invoice-status": ReceivablesAgingWidget,
    "sales-invoice": (props) => (
        <StatWidget
            title="Sales Invoice"
            value={props.value}
            change="+0 from last week"
            {...props}
        />
    ),
    "purchase-invoice": (props) => (
        <StatWidget
            title="Purchase Invoice"
            value={props.value}
            change="+0 from last week"
            {...props}
        />
    ),
    "cards": (props) => (
        <div className="p-6 bg-white border border-[#CCC5C5] rounded-xl flex flex-col h-full min-h-[180px] shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Actions Cards</h3>
            <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-400">No card integrations available</p>
            </div>
        </div>
    )
};

// Layout column and row span grid configurations
export const widgetConfigs = {
    "net-profit-margin": { colSpan: 1, rowSpan: 1 },
    "revenue-vs-expenses": { colSpan: 2, rowSpan: 1 },
    "liquidity-ratio": { colSpan: 1, rowSpan: 1 },
    "receivables-aging": { colSpan: 2, rowSpan: 1 },
    "payables-obligations": { colSpan: 2, rowSpan: 1 },
    "cash-balance": { colSpan: 1, rowSpan: 1 },
    "estimated-tax": { colSpan: 1, rowSpan: 1 },
    "sales-conversion": { colSpan: 2, rowSpan: 1 },
    "revenue-breakdown": { colSpan: 2, rowSpan: 1 },
    "collection-period": { colSpan: 1, rowSpan: 1 },
    "inventory-status": { colSpan: 1, rowSpan: 1 },
    "top-expenses": { colSpan: 2, rowSpan: 1 },
    "unbilled-services": { colSpan: 1, rowSpan: 1 },
    "break-even": { colSpan: 2, rowSpan: 1 },
    "trial-balance": { colSpan: 2, rowSpan: 1 },

    // Legacy keys configurations to prevent issues
    "profit-loss": { colSpan: 1, rowSpan: 1 },
    "cashflow": { colSpan: 1, rowSpan: 1 },
    "break-even-tax": { colSpan: 1, rowSpan: 1 },
    "receivables-payables": { colSpan: 2, rowSpan: 1 },
    "monthly-revenue": { colSpan: 1, rowSpan: 1 },
    "invoice-status": { colSpan: 2, rowSpan: 1 },
    "sales-invoice": { colSpan: 1, rowSpan: 1 },
    "purchase-invoice": { colSpan: 1, rowSpan: 1 },
    "cards": { colSpan: 2, rowSpan: 1 }
};
