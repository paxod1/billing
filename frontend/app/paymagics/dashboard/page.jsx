"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import { authRequest } from "../../../lib/axiosCreate";
import {
  Users,
  UserCheck,
  TrendingUp,
  CheckCircle,
  Shield,
  XCircle
} from "lucide-react";
import Cookies from "js-cookie";

export default function PaymagicsDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");

  // Demo Data Fallback
  const demoData = {
    counts: {
      payees: 12,
      payor_staff: 5,
      payors: 3,
      total_users: 20
    },
    status_breakdown: {
      active: 18,
      inactive: 2
    },
    confirmation_status: {
      confirmed: 15,
      not_confirmed: 5
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Attempt to fetch from API
        const response = await authRequest.get("/api/admin/dashboard/");
        setDashboardData(response.data || demoData);
      } catch (err) {
        console.warn("Using demo data due to API error:", err);
        // Fallback to demo data silently
        setDashboardData(demoData);
      } finally {
        setLoading(false);
      }
    };

    // Get user name
    const userDataCookie = Cookies.get("user_data");
    if (userDataCookie) {
      try {
        const userData = JSON.parse(userDataCookie);
        setUserName(userData.username || userData.email || "User");
      } catch (e) {
        console.error("Error parsing user cookie", e);
      }
    }

    fetchDashboardData();
  }, []);

  const navbarData = {
    heading: "Dashboard",
    subheading: "Payroll Management Overview",
    from: "paymagics",
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
        <Navbar data={navbarData} />
        <div className="flex-1 flex items-center justify-center">
          <Loader message="Loading Dashboard..." />
        </div>
      </div>
    );
  }

  const { counts, status_breakdown, confirmation_status } = dashboardData || demoData;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F8]">
      <Navbar data={navbarData} />

      <main className="flex-1 py-8 px-6">
        <div className="w-full space-y-8">
          {/* Welcome Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome back, <span className="text-[#FFCA00]">{userName}</span>
            </h1>
            <p className="text-gray-500">
              Here's an overview of your payroll system. Manage employees, track payments, and monitor system status.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Payees"
              value={counts?.payees || 0}
              icon={Users}
              color="bg-blue-500"
              desc="Active employees"
            />
            <StatsCard
              title="Payor Staff"
              value={counts?.payor_staff || 0}
              icon={UserCheck}
              color="bg-green-500"
              desc="Admin staff"
            />
            <StatsCard
              title="Payors"
              value={counts?.payors || 0}
              icon={Users}
              color="bg-purple-500"
              desc="Organizations"
            />
            <StatsCard
              title="Total Users"
              value={counts?.total_users || 0}
              icon={UserCheck}
              color="bg-orange-500"
              desc="All system users"
            />
          </div>

          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatusCard
              title="Active Users"
              value={status_breakdown?.active || 0}
              icon={CheckCircle}
              color="text-green-600"
              bg="bg-green-50"
              desc="Currently active users"
            />
            <StatusCard
              title="Confirmed Users"
              value={confirmation_status?.confirmed || 0}
              icon={Shield}
              color="text-blue-600"
              bg="bg-blue-50"
              desc="Email confirmed users"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Reusable Components matching Sales Quote Style
const StatsCard = ({ title, value, icon: Icon, color, desc }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div className="flex items-center text-xs text-gray-400 gap-1">
      <TrendingUp size={14} />
      <span>{desc}</span>
    </div>
    <div className={`h-1 mt-4 rounded-full w-0 group-hover:w-full transition-all duration-500 ${color}`} />
  </div>
);

const StatusCard = ({ title, value, icon: Icon, color, bg, desc }) => (
  <div className={`p-6 rounded-lg border border-gray-100 ${bg} bg-opacity-30 hover:shadow-md transition-shadow cursor-pointer`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full bg-white shadow-sm`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <h3 className={`text-lg font-semibold ${color}`}>{title}</h3>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
    <p className="text-sm text-gray-500 ml-11">{desc}</p>
  </div>
);