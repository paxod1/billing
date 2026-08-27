"use client";

import React, { useState } from "react";
import { CgCloseO } from "react-icons/cg";
import CustomSelect from "@/components/common/CustomSelect";

export default function CreateChannelModal({
  isOpen,
  onClose,
  onSubmit,
  members,
}) {
  const [teamName, setTeamName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ teamName, members: selectedMembers });
    setTeamName("");
    setSelectedMembers([]);
    onClose();
  };

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.name}`,
  }));

  return (
    <div className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-md flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create Channel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <CgCloseO className="text-2xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FFCA00] outline-none"
              placeholder="Enter team name"
              required
            />
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Members
            </label>
            <CustomSelect
              isMulti
              isSearchable
              options={memberOptions}
              value={selectedMembers.map(m => m.value)}
              onChange={(vals) => {
                const selected = memberOptions.filter(opt => vals.includes(opt.value));
                setSelectedMembers(selected);
              }}
              placeholder="Choose members..."
              className="react-select-container"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#FFCA00] text-white font-bold rounded-lg hover:bg-[#d9ac00]"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
