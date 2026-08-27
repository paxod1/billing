import {
    BossIcon, GoalsIcon, DashboardIcon, SalesIcon, PurchasesIcon,
    CommonIcon, ReportsIcon, ChartsOfAccountsIcon, TaxTemplatesIcon,
    ImportWizardIcon, PrintTemplatesIcon, CircleIcon, MessagesIcon,
    TeamsIcon, TeamStatusIcon, HelpIcon, SettingsIcon
} from "@/lib/customIcons";

// Fallback for icons not in customIcons.js
import {
    LuClock, LuUsers, LuHand, LuTrendingUp, LuRotateCcw, LuPlus
} from "react-icons/lu";

export const iconMap = {
    // Custom Icons
    BossIcon,
    GoalsIcon,
    DashboardIcon,
    SalesIcon,
    PurchasesIcon,
    CommonIcon,
    ReportsIcon,
    ChartsOfAccountsIcon,
    TaxTemplatesIcon,
    ImportWizardIcon,
    PrintTemplatesIcon,
    CircleIcon,
    MessagesIcon,
    TeamsIcon,
    TeamStatusIcon,
    HelpIcon,
    SettingsIcon,

    // Dashboard Specific Fallbacks (mapped to names in user snippet)
    ClockIcon: LuClock,
    Group: LuUsers,
    HandGlow: LuHand,
    Rate: LuTrendingUp,
    Rotation: LuRotateCcw,
    Plus: LuPlus
};

export const getIconName = (IconComponent) => {
    if (!IconComponent) return null;

    for (const [name, component] of Object.entries(iconMap)) {
        if (component === IconComponent) return name;
    }

    return IconComponent.displayName || IconComponent.name || null;
};
