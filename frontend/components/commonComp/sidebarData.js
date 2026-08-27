import {
    DashboardIcon,
    ImportWizardIcon,
    PrintTemplatesIcon,
    TeamStatusIcon,
    MessagesIcon,
    TeamsIcon,
    HelpIcon,
    SettingsIcon,
    SalesIcon,
    PurchasesIcon,
    CommonIcon,
    ReportsIcon,
    ChartsOfAccountsIcon,
    TaxTemplatesIcon,
    GoalIcon,
    CalenderIcon,
    MailInviteIcon,
    InventoryIcon
} from "@/lib/customIcons";
import { Users, UserCheck } from "lucide-react";

export const navigationSections = [
    {
        id: "main",
        title: "MAIN",
        items: [
            {
                id: "dashboard",
                name: "Dashboard",
                path: "/dashboard",
                icon: DashboardIcon,
                enabled: true,
                hasDropdown: false,
            },
            {
                id: "sales",
                name: "Sales",
                icon: SalesIcon,
                enabled: true,
                hasDropdown: true,
                dropdownItems: [
                    { name: "Sales Invoices", path: "/sales/invoice" },
                    { name: "Sales Payments", path: "/sales/payment" },
                    { name: "Sales Returns", path: "/sales/return" },
                ],
            },
            {
                id: "purchases",
                name: "Purchases",
                icon: PurchasesIcon,
                enabled: true,
                hasDropdown: true,
                dropdownItems: [
                    { name: "Purchase Invoices", path: "/purchases/invoices" },
                    { name: "Purchase Payments", path: "/purchases/payment" },
                    { name: "Purchase Returns", path: "/purchases/return" },
                ],
            },
            {
                id: "inventory",
                name: "Inventory",
                icon: InventoryIcon,
                enabled: true,
                hasDropdown: true,
                dropdownItems: [
                    { name: "Customized Products", path: "/inventory/customized-products" },
                ],
            },
            {
                id: "accounting",
                name: "Accounting",
                icon: ChartsOfAccountsIcon,
                enabled: true,
                hasDropdown: true,
                dropdownItems: [
                    { name: "Journal Entry", path: "/common/journalEntry" },
                    { name: "Charts of Accounts", path: "/setup/chartsOfAccounts" },
                ],
            },
            {
                id: "party",
                name: "Party",
                icon: Users,
                enabled: true,
                hasDropdown: true,
                dropdownItems: [
                    { name: "Customers", path: "/sales/customers" },
                    { name: "Suppliers", path: "/purchases/suppliers" },
                ],
            },
            {
                id: "reports",
                name: "Reports",
                icon: ReportsIcon,
                enabled: true,
                hasDropdown: true,
                dropdownItems: [
                    { name: "General Ledger", path: "/reports/ledger" },
                    { name: "Profit and Loss", path: "/reports/pl" },
                    { name: "Balance Sheet", path: "/reports/balance-sheet" },
                    { name: "Trial Balance", path: "/reports/trial-balance" },
                    { name: "TAX filing", path: "/reports/tax-filing" },
                ],
            },
        ],
    },
    {
        id: "setup",
        title: "SETUP",
        items: [
            {
                id: "tax_templates",
                name: "Tax Templates",
                icon: TaxTemplatesIcon,
                enabled: true,
                path: "/setup/taxTemplates",
                hasDropdown: false,
            },
            {
                id: "settings",
                name: "Settings",
                icon: SettingsIcon,
                enabled: true,
                path: "/settings",
                hasDropdown: false,
            },
        ],
    }
];
