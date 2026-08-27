"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Send,
  CheckCircle,
  Loader2,
  Users,
  Mail,
} from "lucide-react";
import { CgCloseO } from "react-icons/cg";
import { toast } from "react-hot-toast";

// Imported from project libs
import { authRequest } from "@/lib/axiosCreate";
import CustomSelect from "@/components/common/CustomSelect";

export default function InviteShare({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch categories when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await authRequest.get('/api/payor/view_lists');

      // Handle the response format: {results: Array(4), count: 4, ...}
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        setCategories(response.data.results);
      } else if (Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        console.error('Unexpected categories response format:', response.data);
        toast.error("Failed to load categories");
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error("Failed to load categories");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleSendInvite = async () => {
    // Validate inputs
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: email,
        category: selectedCategory
      };

      await authRequest.post('/api/payor/referral/', payload);

      toast.success(`Invitation link sent to ${email}`);

      // Reset form
      setEmail("");
      setSelectedCategory("");

      // Close dialog after successful send
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error sending invite:', error);

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to send invitation";

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
        w-full px-4 py-3 text-sm border border-gray-300 rounded-lg 
        focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-[#FFCA00] 
        transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed
    `;

  const labelClass = "block text-sm font-medium text-gray-700 mb-2";

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="flex-none relative px-6 py-6 border-b border-gray-100 flex flex-col items-center justify-center rounded-t-xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <CgCloseO className="text-2xl" />
          </button>

          <div className="bg-[#FFCA00]/10 p-3 rounded-full mb-3 hover:bg-[#d9ac00]">
            <Users className="h-6 w-6 text-[#FFCA00]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center">
            Invite Your Staff
          </h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Send invitation link to staff members via email
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-5">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className={labelClass}>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-[#FFCA00]" />
                <span>Email Address</span>
              </div>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter staff email address"
              className={inputClass}
              disabled={loading}
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label htmlFor="category" className={labelClass}>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-[#FFCA00]" />
                <span>Select Category</span>
              </div>
            </label>
            <div className="relative">
              <CustomSelect
                id="category"
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                options={categories.map((category) => ({
                  value: category.id,
                  label: `${category.category} ${category.description ? `- ${category.description}` : ''} (${category.count} staff)`
                }))}
                placeholder="Choose a category..."
                isDisabled={loading || categoriesLoading}
              />
            </div>
            {categoriesLoading && (
              <p className="text-xs text-gray-500 flex items-center mt-2">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Loading categories...
              </p>
            )}
            {!categoriesLoading && categories.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 mt-2">
                No categories found. Please create categories first.
              </p>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendInvite}
            disabled={loading || !email || !selectedCategory || categories.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#FFCA00] hover:bg-[#d9ac00] text-black font-medium py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00]/50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending Invite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Invitation
              </>
            )}
          </button>

          {/* Help Text */}
          <div className="bg-[#FFCA00]/10 border border-[#FFCA00]/20 rounded-lg p-3 hover:bg-[#d9ac00]">
            <p className="text-xs text-gray-800 text-center flex items-center justify-center">
              <CheckCircle className="h-3 w-3 inline mr-2 text-[#FFCA00]" />
              An invitation link will be sent to the provided email address for the selected category.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}