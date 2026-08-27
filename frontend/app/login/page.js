"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { basicRequest } from "../../lib/axiosCreate";
import { setCookie } from "../../utils/cookieHelper";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";

const LoginPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const loginData = {
            username: formData.username,
            password: formData.password,
        };

        try {
            const response = await basicRequest.post("custom-api/admin/login", loginData);

            if (response.data && response.data.success && response.data.data) {
                const { amToken, amDbToken } = response.data.data;

                // Save tokens in cookies (valid for 3 days as per expires_in/86400)
                setCookie("amToken", amToken.token, 3);
                setCookie("amDbToken", amDbToken.token, 3);

                // Save user info for UI use
                if (response.data.data.user) {
                    localStorage.setItem("user", JSON.stringify(response.data.data.user));
                }

                dispatch(showToast({ message: "Login Successful!", type: "success" }));
                router.push("/dashboard");
            } else {
                const msg = response.data?.data?.message || 
                            response.data?.data?.error || 
                            response.data?.message || 
                            "Invalid response from server.";
                dispatch(showToast({ message: msg, type: "error" }));
            }
        } catch (error) {
            console.error("Login error:", error);
            const errorMessage = error.response?.data?.data?.message ||
                               error.response?.data?.data?.error ||
                               error.response?.data?.message || 
                               error.response?.data?.errors?.[0]?.message || 
                               "Login failed. Please check your credentials.";
            dispatch(showToast({ message: errorMessage, type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo / Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFCA00] mb-4 -200/50 hover:bg-[#d9ac00]">
                        <span className="text-white text-3xl font-bold">B</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
                    <p className="text-gray-500 mt-2">Manage your billing effortlessly</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-gray-200 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Welcome Back</h2>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 ml-1">Username or Email</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#FFCA00] transition-colors">
                                    <MdEmail size={20} />
                                </span>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    placeholder="Username or Email"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#FFCA00] focus:ring-4 focus:ring-yellow-50/50 transition-all text-gray-800 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 ml-1">Password</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#FFCA00] transition-colors">
                                    <MdLock size={20} />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#FFCA00] focus:ring-4 focus:ring-yellow-50/50 transition-all text-gray-800 placeholder:text-gray-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm pt-1">
                            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#FFCA00] focus:ring-[#FFCA00]" />
                                Remember me
                            </label>
                            <a href="#" className="text-[#FFCA00] font-semibold hover:underline">Forgot password?</a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 bg-[#FFCA00] hover:bg-[#d9ac00] text-black font-bold rounded-xl group flex items-center justify-center gap-2 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black"></div>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <div className="w-5 h-5 rounded-full bg-black/5 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </div>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-gray-500 text-sm">
                    Don't have an account? <a href="#" className="text-[#FFCA00] font-bold hover:underline">Request Access</a>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
