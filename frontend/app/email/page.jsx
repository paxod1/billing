"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Star,
  Clock,
  Send,
  CalendarClock,
  FileText,
  Archive,
  ShieldAlert,
  Trash2,
  Tag,
  Plus,
  Search,
  RefreshCcw,
  MoreHorizontal,
  PenLine,
  ChevronDown,
  Inbox,
  X,
  Menu,
  ArrowLeft,
  Check,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  Download,
  Bold,
  Italic,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  Edit3,
} from "lucide-react";
import { IoMdArrowDropdown } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import { MdShortText } from "react-icons/md";
import MobileHeaderViewOnly from "@/components/commonComp/MobileHeaderViewOnly";

const Email = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuItem, setActiveMenuItem] = useState("Inbox");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showComposerScheduleMenu, setShowComposerScheduleMenu] =
    useState(false);
  const [replyType, setReplyType] = useState("reply");
  const fileInputRef = useRef(null);
  const composerFileInputRef = useRef(null);
  const imageInputRef = useRef(null); // reply image
  const composerImageInputRef = useRef(null); // composer image
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [composerAttachedFiles, setComposerAttachedFiles] = useState([]);
  const [composerData, setComposerData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });

  const [replyIsBold, setReplyIsBold] = useState(false);
  const [replyIsItalic, setReplyIsItalic] = useState(false);
  const [composerIsBold, setComposerIsBold] = useState(false);
  const [composerIsItalic, setComposerIsItalic] = useState(false);
  const [activeEditor, setActiveEditor] = useState(null); // 'reply' or 'composer' or null

  // Link popover & link action bar
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState(null);
  const [activeLinkBar, setActiveLinkBar] = useState(null);

  // Image preview state
  const [replyImages, setReplyImages] = useState([]);
  const [composerImages, setComposerImages] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // config for popover clamping
  const POP_WIDTH = 300;
  const POP_HEIGHT = 140;
  const POP_MARGIN = 8;

  const [emails, setEmails] = useState([
    {
      id: 1,
      sender: "Evelyn from Northwind",
      senderEmail: "evelyn@northwind.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Evelyn",
      subject: "Q3 Roadmap Review - Highlights and next steps",
      preview: "I've attached the current roadmap and a spreadsheet...",
      body: "Hey team, thanks again for the call today. Here's a summary of what we agreed on for the Q3 roadmap and a few next steps to keep us moving.\n\n• Finalize scope for onboarding improvements by next Friday.\n• Ship performance optimizations in two milestones.\n• Prepare a public changelog and launch plan.\n\nI've attached the current roadmap and a spreadsheet for tracking action items. Let me know if anything looks off.",
      time: "10:42 AM",
      date: "Today",
      label: "Updates",
      labelColor: "bg-blue-100/60 text-blue-700",
      labelBorderColor: "border-blue-400/60",
      starred: false,
      unread: true,
      hasAttachment: true,
      attachments: [
        { name: "Q3-roadmap.xlsx", size: "128 KB" },
        { name: "Action-items.docx", size: "64 KB" },
      ],
      folder: "Inbox",
      recipients: "product@workspace.com",
    },
    {
      id: 2,
      sender: "Billing",
      senderEmail: "billing@company.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Billing",
      subject: "Invoice #4127 processed successfully",
      preview: "Your payment has been received...",
      body: "Dear Customer,\n\nYour payment has been received and processed successfully. Invoice #4127 for $299.00 has been paid in full.\n\nThank you for your business!\n\nBilling Team",
      time: "10:42 AM",
      date: "Today",
      label: "Finance",
      labelColor: "bg-yellow-100/60 text-yellow-700",
      labelBorderColor: "border-yellow-400/60",
      starred: true,
      unread: false,
      hasAttachment: false,
      attachments: [],
      folder: "Inbox",
      recipients: "",
    },
    {
      id: 3,
      sender: "Marketing Team",
      senderEmail: "marketing@company.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marketing",
      subject: "New campaign performance metrics",
      preview: "Check out the latest metrics from our Q3 campaign...",
      body: "Hi there,\n\nOur Q3 campaign has performed exceptionally well! Here are the key metrics:\n- 45% increase in engagement\n- 30% boost in conversions\n- 25% growth in reach\n\nLet's discuss strategies for Q4.\n\nBest,\nMarketing Team",
      time: "9:15 AM",
      date: "Today",
      label: "Projects",
      labelColor: "bg-emerald-100/60 text-emerald-700",
      labelBorderColor: "border-emerald-400/60",
      starred: false,
      unread: true,
      hasAttachment: true,
      attachments: [{ name: "Campaign-metrics.pdf", size: "1.2 MB" }],
      folder: "Inbox",
      recipients: "team@company.com",
    },
    {
      id: 4,
      sender: "HR Department",
      senderEmail: "hr@company.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=HR",
      subject: "Annual review reminder",
      preview: "Your annual review is scheduled for next week...",
      body: "Hello,\n\nThis is a friendly reminder that your annual review is scheduled for next week on October 5th at 2:00 PM.\n\nPlease prepare your self-assessment and come ready to discuss your achievements and goals.\n\nBest regards,\nHR Team",
      time: "Yesterday",
      date: "Oct 27",
      label: "Finance",
      labelColor: "bg-yellow-100/60 text-yellow-700",
      labelBorderColor: "border-yellow-400/60",
      starred: false,
      unread: false,
      hasAttachment: false,
      attachments: [],
      folder: "Inbox",
      recipients: "",
    },
  ]);

  const updateFormattingState = (isReply) => {
    if (!activeEditor) return;

    try {
      const bold = document.queryCommandState("bold");
      const italic = document.queryCommandState("italic");

      if (isReply) {
        setReplyIsBold(!!bold);
        setReplyIsItalic(!!italic);
      } else {
        setComposerIsBold(!!bold);
        setComposerIsItalic(!!italic);
      }
    } catch (e) {
      // no-op
    }
  };

  useEffect(() => {
    const handler = () => {
      if (activeEditor) {
        const isReply = activeEditor === "reply";
        updateFormattingState(isReply);
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [activeEditor]);

  const handlePaste = (e, isReply) => {
    const text = e.clipboardData.getData("text/plain");
    const urlPattern = /^https?:\/\/.+/i;

    if (urlPattern.test(text.trim())) {
      e.preventDefault();
      const selection = window.getSelection();

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const link = document.createElement("a");
        link.href = text.trim();
        link.textContent = text.trim();
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.color = "#1a73e8";
        link.style.textDecoration = "underline";
        link.style.cursor = "pointer";
        link.contentEditable = "false";

        range.insertNode(link);
        const space = document.createTextNode("\u00A0");
        link.after(space);

        range.setStartAfter(space);
        range.setEndAfter(space);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const applyLink = (isReply) => {
    const editorId = isReply ? "reply-editor" : "composer-editor";
    const editorElement = document.getElementById(editorId);

    if (!editorElement) return;

    // Set active editor if not already set
    if (!activeEditor) {
      setActiveEditor(isReply ? "reply" : "composer");
    }

    const selection = window.getSelection();
    let range;

    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim() === ""
    ) {
      // If no selection, create one at the end of editor content
      range = document.createRange();
      range.selectNodeContents(editorElement);
      range.collapse(false); // collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      range = selection.getRangeAt(0);
    }

    if (!editorElement.contains(range.commonAncestorContainer)) {
      // Selection is outside editor, place at end
      range = document.createRange();
      range.selectNodeContents(editorElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Save selection
    setSavedSelection({
      range: range.cloneRange(),
      editorType: isReply ? "reply" : "composer",
    });

    // Get position from range or editor if range is collapsed
    const rangeRect = range.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();

    // Calculate position - use editor top if range has no height (empty/collapsed)
    let left = rangeRect.left + window.scrollX;
    let top =
      (rangeRect.height > 0 ? rangeRect.bottom : editorRect.top) +
      window.scrollY +
      8;

    // Clamp horizontally within editor bounds
    const editorLeft = editorRect.left + window.scrollX;
    const editorRight = editorRect.right + window.scrollX;

    if (left + POP_WIDTH + POP_MARGIN > editorRight) {
      left = editorRight - POP_WIDTH - POP_MARGIN;
    }
    if (left < editorLeft + POP_MARGIN) {
      left = editorLeft + POP_MARGIN;
    }

    // Check if enough space below - clamp vertically within editor
    if (top + POP_HEIGHT + POP_MARGIN > editorRect.bottom + window.scrollY) {
      top =
        (rangeRect.height > 0 ? rangeRect.top : editorRect.top) +
        window.scrollY -
        POP_HEIGHT -
        8;
      if (top < editorRect.top + window.scrollY + POP_MARGIN) {
        top = editorRect.top + window.scrollY + POP_MARGIN;
      }
    }

    setPopoverPos({ x: left, y: top });
    setLinkText(selection.toString().trim() || "");
    setLinkUrl("");
    setShowLinkPopover(true);
  };

  const handleCreateLink = () => {
    if (!savedSelection) {
      setShowLinkPopover(false);
      return;
    }

    const urlRaw = linkUrl.trim();

    // Add this validation
    if (!urlRaw && !linkText.trim()) {
      alert("Please enter a URL or text for the link");
      return;
    }

    const url = urlRaw
      ? urlRaw.startsWith("http")
        ? urlRaw
        : `https://${urlRaw}`
      : "";
    const text = linkText.trim() || url || "link";

    const a = document.createElement("a");
    a.href = url || text;
    a.textContent = text;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    a.style.color = "#1a73e8";
    a.style.textDecoration = "underline";
    a.style.cursor = "pointer";
    a.contentEditable = "false";

    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveLinkBar({
        node: a,
        href: a.href,
        editorType: savedSelection.editorType,
      });
    });

    try {
      const range = savedSelection.range;
      const editorId =
        savedSelection.editorType === "reply"
          ? "reply-editor"
          : "composer-editor";
      const editorElement = document.getElementById(editorId);

      if (!editorElement) {
        console.error("Editor element not found");
        return;
      }

      // Check if editor is empty or has only whitespace
      const editorContent = editorElement.textContent || "";
      const isEmpty = editorContent.trim() === "";

      // Delete any selected content
      range.deleteContents();

      // If editor was empty, ensure we're at the start
      if (isEmpty) {
        // Clear the editor completely first
        editorElement.innerHTML = "";

        // Create a new range at the start
        const newRange = document.createRange();
        newRange.selectNodeContents(editorElement);
        newRange.collapse(true);

        // Insert the link at the start
        newRange.insertNode(a);
      } else {
        // Normal insertion for non-empty editor
        range.insertNode(a);
      }

      // Add space after link for continued typing
      const space = document.createTextNode("\u00A0");
      a.after(space);

      // Set cursor after the space
      const sel = window.getSelection();
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      // Focus the editor
      editorElement.focus();
    } catch (err) {
      console.error("Error inserting link:", err);
    }

    setShowLinkPopover(false);
    setLinkText("");
    setLinkUrl("");
    setSavedSelection(null);
  };

  const handleRemoveLink = (linkNode) => {
    if (!linkNode) return;
    const text = document.createTextNode(
      linkNode.textContent || linkNode.href || ""
    );
    linkNode.replaceWith(text);
    setActiveLinkBar(null);
  };

  const handleChangeLinkFromBar = (node) => {
    const range = document.createRange();
    range.selectNode(node);

    setSavedSelection({
      range: range,
      editorType: activeLinkBar.editorType,
    });

    setLinkText(node.textContent);
    setLinkUrl(node.href);
    setShowLinkPopover(true);
    setActiveLinkBar(null);
  };

  // ---------- IMAGES ----------
  const handleImageUpload = (e, isReply) => {
    if (!activeEditor) {
      alert("Please click in the text area first before adding images");
      e.target.value = "";
      return;
    }

    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    setIsUploadingImage(true);

    let processed = 0; // Declare the counter variable

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgData = {
          id: Date.now() + Math.random(),
          src: event.target.result,
          name: file.name,
        };

        if (isReply) {
          setReplyImages((prev) => [...prev, imgData]);
        } else {
          setComposerImages((prev) => [...prev, imgData]);
        }

        processed++; // Increment after processing each file

        // Turn off loading state when all files are processed
        if (processed === files.length) {
          setIsUploadingImage(false);
        }
      };

      reader.onerror = () => {
        console.error("Error reading file:", file.name);
        processed++;

        // Still turn off loading even if there's an error
        if (processed === files.length) {
          setIsUploadingImage(false);
        }
      };

      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (imageId, isReply) => {
    if (isReply) {
      setReplyImages((prev) => prev.filter((img) => img.id !== imageId));
    } else {
      setComposerImages((prev) => prev.filter((img) => img.id !== imageId));
    }
  };

  // ---------- FILE ATTACH ----------
  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
      })),
    ]);
  };

  const handleComposerFileAttach = (e) => {
    const files = Array.from(e.target.files);
    setComposerAttachedFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
      })),
    ]);
  };

  const toggleEmailSelection = (emailId) => {
    setSelectedEmailIds((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId]
    );
  };
  const toggleSelectAll = () => {
    if (selectedEmailIds.length === filteredEmails.length) {
      setSelectedEmailIds([]);
    } else {
      setSelectedEmailIds(filteredEmails.map((email) => email.id));
    }
  };

  const toggleStar = (emailId, e) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((email) =>
        email.id === emailId ? { ...email, starred: !email.starred } : email
      )
    );
  };

  const markAsRead = (emailIds) => {
    setEmails((prev) =>
      prev.map((email) =>
        emailIds.includes(email.id) ? { ...email, unread: false } : email
      )
    );
  };

  const deleteEmails = (emailIds) => {
    setEmails((prev) =>
      prev.map((email) =>
        emailIds.includes(email.id) ? { ...email, folder: "Trash" } : email
      )
    );
    setSelectedEmailIds([]);
    setIsSelectionMode(false);
    if (selectedEmail && emailIds.includes(selectedEmail.id)) {
      setSelectedEmail(null);
    }
  };

  const archiveEmails = (emailIds) => {
    setEmails((prev) =>
      prev.map((email) =>
        emailIds.includes(email.id) ? { ...email, folder: "Archive" } : email
      )
    );
    setSelectedEmailIds([]);
    setIsSelectionMode(false);
    if (selectedEmail && emailIds.includes(selectedEmail.id)) {
      setSelectedEmail(null);
    }
  };

  const changeEmailLabel = (emailId, newLabel) => {
    const labelColors = {
      Updates: {
        labelColor: "bg-blue-100/60 text-blue-700",
        labelBorderColor: "border-blue-400/60",
      },
      Projects: {
        labelColor: "bg-emerald-100/60 text-emerald-700",
        labelBorderColor: "border-emerald-400/60",
      },
      Finance: {
        labelColor: "bg-yellow-100/60 text-yellow-700",
        labelBorderColor: "border-yellow-400/60",
      },
    };

    setEmails((prev) =>
      prev.map((email) =>
        email.id === emailId
          ? { ...email, label: newLabel, ...labelColors[newLabel] }
          : email
      )
    );
    setShowLabelMenu(false);
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setShowReplyBox(false);
    setAttachedFiles([]);
    setReplyImages([]);
    setActiveEditor(null);
    if (email.unread) {
      markAsRead([email.id]);
    }
  };

  const handleMenuItemClick = (label) => {
    setActiveMenuItem(label);
    setSelectedEmail(null);
    setIsMobileSidebarOpen(false);
  };

  const handleReplyClick = (type = "reply") => {
    setReplyType(type);
    setShowReplyBox(true);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (showLinkPopover) {
          setShowLinkPopover(false);
        }
        if (activeLinkBar) {
          setActiveLinkBar(null);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLinkPopover, activeLinkBar]);

  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobileSidebarOpen]);

  const handleSendReply = () => {
    console.log("Sending reply:", {
      type: replyType,
      images: replyImages,
      attachments: attachedFiles,
    });
    setShowReplyBox(false);
    setAttachedFiles([]);
    setReplyImages([]);
    setActiveEditor(null);
  };

  const handleComposeClick = () => {
    setShowComposer(true);
  };

  const handleCloseComposer = () => {
    setShowComposer(false);
    setComposerData({ to: "", cc: "", bcc: "", subject: "", body: "" });
    setComposerAttachedFiles([]);
    setComposerImages([]);
    setActiveEditor(null);
  };

  const handleSendComposer = () => {
    console.log("Sending email:", {
      ...composerData,
      images: composerImages,
      attachments: composerAttachedFiles,
    });
    handleCloseComposer();
  };

  // ---------- FILTERS ----------
  const menuItems = [
    { icon: Inbox, label: "Inbox", count: 23 },
    { icon: Star, label: "Starred", count: 6 },
    { icon: Clock, label: "Snoozed" },
    { icon: Send, label: "Sent" },
    { icon: CalendarClock, label: "Scheduled", count: 2 },
    { icon: FileText, label: "Drafts", count: 6 },
    { icon: Archive, label: "Archive" },
    { icon: ShieldAlert, label: "Spam" },
    { icon: Trash2, label: "Trash" },
  ];

  const labels = [
    { name: "Updates", color: "bg-blue-500" },
    { name: "Projects", color: "bg-emerald-500" },
    { name: "Finance", color: "bg-orange-500" },
  ];

  const filteredEmails = useMemo(() => {
    let result = emails;

    if (activeMenuItem === "Starred") {
      result = emails.filter((email) => email.starred);
    } else if (["Updates", "Projects", "Finance"].includes(activeMenuItem)) {
      result = emails.filter((email) => email.label === activeMenuItem);
    } else if (activeMenuItem !== "Inbox") {
      result = emails.filter((email) => email.folder === activeMenuItem);
    } else {
      result = emails.filter((email) => email.folder === "Inbox");
    }

    if (searchQuery) {
      result = result.filter(
        (email) =>
          email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.preview.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedFilter === "Unread") {
      result = result.filter((email) => email.unread);
    }

    return result;
  }, [emails, searchQuery, selectedFilter, activeMenuItem]);

  const renderActiveLinkBar = (editorType) => {
    if (!activeLinkBar || activeLinkBar.editorType !== editorType) return null;

    // Get link position for inline display
    try {
      const linkNode = activeLinkBar.node;
      if (!linkNode || !linkNode.getBoundingClientRect) return null;

      const linkRect = linkNode.getBoundingClientRect();
      const editorId =
        editorType === "reply" ? "reply-editor" : "composer-editor";
      const editorElement = document.getElementById(editorId);

      if (!editorElement) return null;

      const editorRect = editorElement.getBoundingClientRect();

      // Calculate position relative to the editor
      const linkBarWidth = 320; // approximate width of the link bar
      const linkBarHeight = 50; // approximate height

      // Position relative to editor with scroll offset
      let topPosition =
        linkRect.bottom - editorRect.top + editorElement.scrollTop + 9;
      let leftPosition = linkRect.left - editorRect.left;

      // Clamp horizontally - ensure it doesn't overflow right edge
      const maxLeft = editorElement.offsetWidth - linkBarWidth - 16;
      if (leftPosition > maxLeft) {
        leftPosition = maxLeft;
      }
      if (leftPosition < 8) {
        leftPosition = 8;
      }

      // Check if there's space below, otherwise show above
      const spaceBelow = editorRect.bottom - linkRect.bottom;
      const spaceAbove = linkRect.top - editorRect.top;

      if (spaceBelow < linkBarHeight && spaceAbove > linkBarHeight) {
        // Show above the link
        topPosition =
          linkRect.top -
          editorRect.top +
          editorElement.scrollTop -
          linkBarHeight -
          6;
      }

      // Ensure it doesn't go above the editor top
      if (topPosition < editorElement.scrollTop + 8) {
        topPosition = editorElement.scrollTop + 8;
      }

      return (
        <div
          className="absolute z-50 flex items-center gap- bg-white border border-blue-500 shadow-lg rounded-md px-3 py-1 text-sm"
          style={{
            top: `${topPosition}px`,
            left: `${leftPosition}px`,
          }}
        >
          <span className="text-nowrap text-xs mr-2">Go to Link:</span>
          <a
            href={activeLinkBar.href}
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-600 hover:text-blue-800 truncate shrink-0 min-w-0"
            title={activeLinkBar.href}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "150px" }}
          >
            {activeLinkBar.href}
          </a>

          <div className="flex items-center shrink-0">
            <button
              className="text-blue-600 hover:underline  text-xs px-2 py-1"
              onClick={() => handleChangeLinkFromBar(activeLinkBar.node)}
            >
              Change
            </button>

            <button
              className="text-red-600 hover:underline text-xs px-2 py-1"
              onClick={() => handleRemoveLink(activeLinkBar.node)}
            >
              Remove
            </button>

            <button
              className="text-gray-500 hover:text-gray-700 p-1"
              onClick={() => setActiveLinkBar(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    } catch (err) {
      console.error("Error rendering link bar:", err);
      return null;
    }
  };

  return (
    <>


      <div className="flex h-[94dvh] bg-gray-50 relative md:py-4 md:pr-4 md:gap-3">
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md:translate-x-0 fixed md:relative w-64 md:w-20 flex-shrink-0 z-40 transition-transform duration-300`}
        >
          <div
            className={`${isSidebarExpanded || isMobileSidebarOpen ? "w-64" : "w-20"
              } bg-white border border-gray-200 md:rounded-tr-2xl md:rounded-br-2xl transition-all duration-300 ease-in-out flex flex-col md:h-full h-[86dvh] md:absolute md:left-0 md:top-0 md:bottom-0 md:z-10 shadow-lg md:shadow-sm`}
            onMouseEnter={() =>
              !isMobileSidebarOpen && setIsSidebarExpanded(true)
            }
            onMouseLeave={() =>
              !isMobileSidebarOpen && setIsSidebarExpanded(false)
            }
          >
            <div className="md:hidden pt-3 px-3 flex justify-end">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <button
                onClick={handleComposeClick}
                className={`w-full bg-[#FFCA00] hover:bg-[#E6B800] text-white ${isSidebarExpanded || isMobileSidebarOpen
                  ? "rounded-md"
                  : "rounded-full"
                  } py-3 px-4 flex items-center justify-center gap-2 transition-colors`}
              >
                <PenLine className="w-5 h-5 flex-shrink-0" />
                {(isSidebarExpanded || isMobileSidebarOpen) && (
                  <span className="font-light whitespace-nowrap">Compose</span>
                )}
              </button>
            </div>

            <nav className="flex-1 px-2 overflow-y-auto hide-scrollbar">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleMenuItemClick(item.label)}
                  className={`w-full flex items-center ${isSidebarExpanded || isMobileSidebarOpen
                    ? "justify-start"
                    : "justify-center"
                    } gap-3 px-3 py-2.5 rounded-lg mb-2 transition-all duration-300 ${activeMenuItem === item.label
                      ? "text-[#FFCA00] bg-[#FFCA00]/10"
                      : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  {(isSidebarExpanded || isMobileSidebarOpen) && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap">
                        {item.label}
                      </span>
                      {item.count && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap transition-all duration-300 ${item.label === "Inbox"
                            ? "bg-[#FFCA00] text-white"
                            : item.label === "Starred"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-200 text-gray-700"
                            }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}

              <div
                className={`${isSidebarExpanded || isMobileSidebarOpen
                  ? "mt-4 pt-4 border-t border-gray-200"
                  : "mt-3"
                  } transition-all duration-300`}
              >
                {isSidebarExpanded || isMobileSidebarOpen ? (
                  <>
                    <div className="flex items-center justify-between px-3 mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-6 h-6 flex-shrink-0 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">
                          LABELS
                        </span>
                      </div>
                      <button className="text-[#FFCA00] hover:text-[#E6B800] transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {labels.map((label, index) => (
                      <button
                        key={index}
                        onClick={() => handleMenuItemClick(label.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${activeMenuItem === label.name
                          ? "bg-gray-100"
                          : "text-gray-600 hover:bg-gray-50"
                          }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${label.color}`}
                        />
                        <span className="flex-1 text-left text-sm whitespace-nowrap">
                          {label.name}
                        </span>
                      </button>
                    ))}
                  </>
                ) : (
                  <button className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg mb-3 text-gray-600 hover:bg-gray-50 transition-all duration-300">
                    <Tag className="w-6 h-6 flex-shrink-0" />
                  </button>
                )}
              </div>
            </nav>

            <div className="p-4">
              {isSidebarExpanded || isMobileSidebarOpen ? (
                <button className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-all duration-300">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
                    alt="Alex Morgan"
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      Alex Morgan
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      alex123@gmail.com
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ) : (
                <button className="w-full flex items-center justify-center hover:bg-gray-50 rounded-lg p-2 transition-all duration-300">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
                    alt="Alex Morgan"
                    className="w-10 h-10 rounded-full"
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-w-0 md:rounded-2xl overflow-hidden md:shadow-sm">
          {/* Email List */}
          <div
            className={`${selectedEmail ? "hidden lg:flex" : "flex"
              } w-full lg:max-w-xs xl:max-w-sm 2xl:max-w-md bg-white lg:border-r border-gray-200 flex-col flex-shrink-0`}
          >
            <div className="px-4 pt-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <button
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                  />
                </div>
                <button className="py-2.5 px-3 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300">
                  <RefreshCcw className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {!isSelectionMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFilter("All")}
                    className={`px-3 sm:px-5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedFilter === "All"
                      ? "bg-[#FFCA00]/20 text-[#E6B800] border-[#E6B800]"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedFilter("Unread")}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedFilter === "Unread"
                      ? "bg-[#FFCA00]/20 text-[#E6B800] border-[#E6B800]"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
                      }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    className="ml-auto px-3 sm:px-5 py-1.5 bg-[#FFCA00] text-white rounded-lg text-sm font-light hover:bg-[#d9ac00]"
                  >
                    Select
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Check className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedEmailIds.length} selected
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => markAsRead(selectedEmailIds)}
                      disabled={selectedEmailIds.length === 0}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Mark as read"
                    >
                      <Inbox className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => archiveEmails(selectedEmailIds)}
                      disabled={selectedEmailIds.length === 0}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Archive"
                    >
                      <Archive className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => deleteEmails(selectedEmailIds)}
                      disabled={selectedEmailIds.length === 0}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedEmailIds([]);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Inbox className="w-16 h-16 mb-4" />
                  <p className="text-lg">No emails found</p>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => !isSelectionMode && handleEmailClick(email)}
                    className={`px-4 py-3.5 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${email.unread ? "bg-[#FFCA00]/10" : ""
                      } ${selectedEmail?.id === email.id ? "bg-gray-100" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {isSelectionMode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmailSelection(email.id);
                          }}
                          className="mt-1"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedEmailIds.includes(email.id)
                              ? "bg-[#FFCA00] border-[#FFCA00]"
                              : "border-gray-400"
                              }`}
                          >
                            {selectedEmailIds.includes(email.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => toggleStar(email.id, e)}
                          className="mt-1"
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${email.starred
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-400 hover:text-gray-600"
                              }`}
                          />
                        </button>
                      )}
                      <img
                        src={email.avatar}
                        alt={email.sender}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3
                            className={`text-sm sm:text-base font-medium truncate ${email.unread ? "text-gray-900" : "text-gray-700"
                              }`}
                          >
                            {email.sender}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${email.labelColor} ${email.labelBorderColor}`}
                          >
                            {email.label}
                          </span>
                        </div>
                        <p
                          className={`text-sm mb-1 truncate ${email.unread
                            ? "font-medium text-gray-900"
                            : "text-gray-700"
                            }`}
                        >
                          {email.subject}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {email.preview}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          {email.hasAttachment && (
                            <Paperclip className="w-4 h-4 text-gray-400" />
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="w-2 h-2 bg-[#FFCA00] rounded-full hover:bg-[#d9ac00]" />
                            <span className="text-xs text-gray-500">
                              {email.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Email Detail View */}
          <div
            className={`${selectedEmail ? "flex" : "hidden lg:flex"
              } flex-1 min-w-0 flex-col`}
          >
            {selectedEmail ? (
              <>
                <div className="p-4 border-b bg-gray-200/30">
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-2"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h1
                        className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 truncate"
                        title={selectedEmail.subject}
                      >
                        {selectedEmail.subject}
                      </h1>

                      <span
                        className={`inline-block px-3 py-0.5 text-xs font-medium ${selectedEmail.labelColor} ${selectedEmail.labelBorderColor} border rounded-full`}
                      >
                        {selectedEmail.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 sm:ml-4 flex-shrink-0">
                      <div className="relative">
                        <button
                          onClick={() => setShowLabelMenu(!showLabelMenu)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Tag className="w-5 h-5 text-gray-600" />
                        </button>
                        {showLabelMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowLabelMenu(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                                Label as
                              </div>
                              {labels.map((label, index) => (
                                <button
                                  key={index}
                                  onClick={() =>
                                    changeEmailLabel(
                                      selectedEmail.id,
                                      label.name
                                    )
                                  }
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full ${label.color}`}
                                  />
                                  {label.name}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setShowMoreMenu(!showMoreMenu)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5 text-gray-600" />
                        </button>
                        {showMoreMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowMoreMenu(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={(e) => {
                                  toggleStar(selectedEmail.id, e);
                                  setShowMoreMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Star className="w-4 h-4" />
                                {selectedEmail.starred ? "Unstar" : "Star"}
                              </button>
                              <button
                                onClick={() => {
                                  archiveEmails([selectedEmail.id]);
                                  setShowMoreMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Archive className="w-4 h-4" />
                                Archive
                              </button>
                              <button
                                onClick={() => {
                                  deleteEmails([selectedEmail.id]);
                                  setShowMoreMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Snooze
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                Mark as Spam
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Print
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b bg-white">
                  <div className="flex items-start gap-3 flex-1">
                    <img
                      src={selectedEmail.avatar}
                      alt={selectedEmail.sender}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-0.5">
                        <div className="font-semibold text-gray-900 text-sm">
                          {selectedEmail.sender}
                        </div>
                        <p className="text-xs text-gray-500 font-light break-all">
                          {selectedEmail.senderEmail}
                        </p>
                      </div>

                      <p className="text-xs mb-1">
                        <span className="text-xs text-gray-500 font-light">
                          to{" "}
                        </span>{" "}
                        me, {selectedEmail.recipients}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-light">
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {selectedEmail.date} at {selectedEmail.time}
                        </div>

                        {selectedEmail.attachments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            {selectedEmail.attachments.length}{" "}
                            {selectedEmail.attachments.length === 1
                              ? "attachment"
                              : "attachments"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-start">
                    <button
                      onClick={() => handleReplyClick("reply")}
                      className="p-2 hover:bg-gray-200 rounded-md transition-colors border border-gray-300"
                      title="Reply"
                    >
                      <Reply className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleReplyClick("replyAll")}
                      className="p-2 hover:bg-gray-200 rounded-md transition-colors border border-gray-300"
                      title="Reply All"
                    >
                      <ReplyAll className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleReplyClick("forward")}
                      className="p-2 hover:bg-gray-200 rounded-md transition-colors border border-gray-300"
                      title="Forward"
                    >
                      <Forward className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-white hide-scrollbar">
                  <div className="w-full h-auto">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-[0.96rem] leading-relaxed">
                      {selectedEmail.body}
                    </p>
                    {selectedEmail.attachments.length > 0 && (
                      <div className="mt-6">
                        <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                          Attachments
                          {selectedEmail.attachments.length > 1 && (
                            <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2">
                              <Download className="w-4 h-4" />
                              Download All
                            </button>
                          )}
                        </div>
                        <div className="mb-2 grid xl:grid-cols-2 grid-cols-1 gap-4">
                          {selectedEmail.attachments.map((attachment, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded border border-gray-300">
                                  <FileText className="w-5 h-5 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {attachment.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {attachment.size}
                                  </div>
                                </div>
                                <button className="px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                                  <Download className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!showReplyBox && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleReplyClick("reply")}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-[#FFCA00] text-white rounded-full hover:bg-[#d9ac00] text-sm flex items-center justify-center gap-2"
                      >
                        <Reply className="w-5 h-5" />
                        Reply
                      </button>
                      <button
                        onClick={() => handleReplyClick("forward")}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <Forward className="w-5 h-5" />
                        Forward
                      </button>
                      <button
                        onClick={() => archiveEmails([selectedEmail.id])}
                        className="p-2 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
                      >
                        <Archive className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {showReplyBox && (
                  <div className="border-t border-gray-200 bg-white flex flex-col max-h-[60dvh]">
                    <div className="px-4 py-3 flex-shrink-0">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">
                          {replyType === "reply"
                            ? "Replying to:"
                            : replyType === "replyAll"
                              ? "Replying to all:"
                              : "Forwarding to:"}
                        </span>
                        <span className="font-light">
                          {selectedEmail.senderEmail}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 relative pb-4">
                      <div className="border border-gray-300 rounded-lg mx-4 overflow-hidden">
                        <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              document.execCommand("bold");
                              updateFormattingState(true);
                            }}
                            className={`p-1.5 hover:bg-gray-200 rounded transition-colors ${replyIsBold ? "bg-gray-300" : ""
                              }`}
                            title="Bold"
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              document.execCommand("italic");
                              updateFormattingState(true);
                            }}
                            className={`p-1.5 hover:bg-gray-200 rounded transition-colors ${replyIsItalic ? "bg-gray-300" : ""
                              }`}
                            title="Italic"
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyLink(true);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Link"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => imageInputRef.current?.click()}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Insert Image"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>

                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Attach"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileAttach}
                            className="hidden"
                          />
                          <input
                            ref={imageInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, true)}
                            className="hidden"
                          />
                        </div>

                        {attachedFiles.length > 0 && (
                          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                            <div className="text-xs font-semibold text-gray-600 mb-2">
                              Attachments:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {attachedFiles.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>{file.name}</span>
                                  <button
                                    onClick={() =>
                                      setAttachedFiles((p) =>
                                        p.filter((_, i) => i !== idx)
                                      )
                                    }
                                    className="hover:text-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          <div
                            id="reply-editor"
                            contentEditable
                            data-placeholder="Type your reply…"
                            className="w-full outline-none text-sm min-h-[200px] max-h-[350px] overflow-y-auto editor p-3"
                            onClick={() => setActiveLinkBar(null)}
                            onFocus={() => setActiveEditor("reply")}
                            onBlur={() => {
                              setTimeout(() => {
                                if (
                                  document.activeElement?.id !== "reply-editor"
                                ) {
                                  setActiveEditor(null);
                                }
                              }, 100);
                            }}
                            onInput={() => updateFormattingState(true)}
                            onKeyUp={() => updateFormattingState(true)}
                            onMouseUp={() => updateFormattingState(true)}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                const selection = window.getSelection();
                                if (selection.rangeCount > 0) {
                                  const range = selection.getRangeAt(0);
                                  const container = range.startContainer;

                                  // Check if we're right after a link
                                  if (
                                    range.collapsed &&
                                    range.startOffset === 0 &&
                                    container.previousSibling?.tagName === "A"
                                  ) {
                                    e.preventDefault();
                                    const link = container.previousSibling;
                                    const text = document.createTextNode(
                                      link.textContent
                                    );
                                    link.replaceWith(text);

                                    // Place cursor after the text
                                    const newRange = document.createRange();
                                    newRange.setStart(text, text.length);
                                    newRange.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(newRange);
                                  }
                                  // Check if cursor is inside or right before a link element
                                  else if (
                                    container.parentElement?.tagName === "A" ||
                                    container.tagName === "A"
                                  ) {
                                    e.preventDefault();
                                    const link =
                                      container.tagName === "A"
                                        ? container
                                        : container.parentElement;
                                    const text = document.createTextNode(
                                      link.textContent
                                    );
                                    link.replaceWith(text);

                                    const newRange = document.createRange();
                                    newRange.setStart(text, 0);
                                    newRange.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(newRange);
                                  }
                                }
                              }
                            }}
                            onPaste={(e) => handlePaste(e, true)}
                            style={{ whiteSpace: "pre-wrap" }}
                          />

                          {/* active link bar for reply */}
                          {renderActiveLinkBar("reply")}
                        </div>

                        {/* Image thumbnails */}
                        {replyImages.length > 0 && (
                          <div className="px-3 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-2 flex-shrink-0">
                            {replyImages.map((img) => (
                              <div key={img.id} className="relative group">
                                <img
                                  src={img.src}
                                  alt={img.name}
                                  className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                  onClick={() => setViewingImage(img)}
                                />
                                <button
                                  onClick={() => removeImage(img.id, true)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* send / schedule / discard - inside border */}
                        <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                          <div className="flex items-center gap-0.5 relative">
                            <button
                              onClick={handleSendReply}
                              className="px-5 py-2 bg-[#FFCA00] text-white rounded-tl-3xl rounded-bl-3xl hover:bg-[#d9ac00] text-sm font-medium"
                            >
                              Send
                            </button>
                            <button
                              onClick={() =>
                                setShowScheduleMenu(!showScheduleMenu)
                              }
                              className="pr-2 pl-1 py-2 bg-[#FFCA00] text-white rounded-tr-3xl rounded-br-3xl hover:bg-[#d9ac00] text-sm flex items-center justify-center"
                            >
                              <IoMdArrowDropdown className="w-5 h-5" />
                            </button>
                            {showScheduleMenu && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setShowScheduleMenu(false)}
                                />
                                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                  <button
                                    onClick={() => {
                                      console.log("Schedule for later");
                                      setShowScheduleMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Clock className="w-4 h-4" />
                                    Schedule send
                                  </button>
                                  <button
                                    onClick={() => {
                                      console.log("Schedule for tomorrow 9 AM");
                                      setShowScheduleMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    Tomorrow at 9:00 AM
                                  </button>
                                  <button
                                    onClick={() => {
                                      console.log("Schedule for Monday 9 AM");
                                      setShowScheduleMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    Monday at 9:00 AM
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setShowReplyBox(false);
                              setAttachedFiles([]);
                              setReplyImages([]);
                              setActiveEditor(null);
                            }}
                            className="p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                <Inbox className="w-20 h-20 mb-4" />
                <p className="text-lg sm:text-xl font-medium mb-2">
                  No email selected
                </p>
                <p className="text-sm text-center">
                  Select an email from the list to view its contents
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Composer Sidebar */}
        <AnimatePresence>
          {showComposer && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={handleCloseComposer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{
                  duration: 0.38,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="fixed right-0 top-12.5 bottom-0 w-full sm:max-w-[560px] bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl max-h-screen"
              >
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    New message
                  </h2>
                  <button
                    onClick={handleCloseComposer}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="p-4 space-y-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-16">To</label>
                    <input
                      type="text"
                      value={composerData.to}
                      onChange={(e) =>
                        setComposerData({ ...composerData, to: e.target.value })
                      }
                      placeholder="name@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-16">Cc</label>
                    <input
                      type="text"
                      value={composerData.cc}
                      onChange={(e) =>
                        setComposerData({ ...composerData, cc: e.target.value })
                      }
                      placeholder="Optional"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-16">Bcc</label>
                    <input
                      type="text"
                      value={composerData.bcc}
                      onChange={(e) =>
                        setComposerData({
                          ...composerData,
                          bcc: e.target.value,
                        })
                      }
                      placeholder="Optional"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 w-16">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={composerData.subject}
                      onChange={(e) =>
                        setComposerData({
                          ...composerData,
                          subject: e.target.value,
                        })
                      }
                      placeholder="Subject"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("bold");
                          updateFormattingState(false);
                        }}
                        className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${composerIsBold ? "bg-gray-300" : ""
                          }`}
                        title="Bold"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("italic");
                          updateFormattingState(false);
                        }}
                        className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${composerIsItalic ? "bg-gray-300" : ""
                          }`}
                        title="Italic"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyLink(false);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Link"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => composerImageInputRef.current?.click()}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title="Insert Image"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <input
                        ref={composerImageInputRef}
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="hidden"
                      />

                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => composerFileInputRef.current?.click()}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Attach"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input
                        ref={composerFileInputRef}
                        type="file"
                        multiple
                        onChange={handleComposerFileAttach}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {composerAttachedFiles.length > 0 && (
                    <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 bg-gray-50">
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        Attachments:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {composerAttachedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">
                              {file.name}
                            </span>
                            <button
                              onClick={() =>
                                setComposerAttachedFiles((p) =>
                                  p.filter((_, i) => i !== idx)
                                )
                              }
                              className="hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="relative px-4 py-2">
                      <div
                        id="composer-editor"
                        contentEditable
                        data-placeholder="Type your message…"
                        className="outline-none text-sm min-h-[300px] editor"
                        onClick={() => setActiveLinkBar(null)}
                        onFocus={() => setActiveEditor("composer")}
                        onBlur={() => {
                          setTimeout(() => {
                            if (
                              document.activeElement?.id !== "composer-editor"
                            ) {
                              setActiveEditor(null);
                            }
                          }, 100);
                        }}
                        onInput={() => updateFormattingState(false)}
                        onKeyUp={() => updateFormattingState(false)}
                        onMouseUp={() => updateFormattingState(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            const selection = window.getSelection();
                            if (selection.rangeCount > 0) {
                              const range = selection.getRangeAt(0);
                              const container = range.startContainer;

                              // Check if we're right after a link
                              if (
                                range.collapsed &&
                                range.startOffset === 0 &&
                                container.previousSibling?.tagName === "A"
                              ) {
                                e.preventDefault();
                                const link = container.previousSibling;
                                const text = document.createTextNode(
                                  link.textContent
                                );
                                link.replaceWith(text);

                                // Place cursor after the text
                                const newRange = document.createRange();
                                newRange.setStart(text, text.length);
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                              }
                              // Check if cursor is inside or right before a link element
                              else if (
                                container.parentElement?.tagName === "A" ||
                                container.tagName === "A"
                              ) {
                                e.preventDefault();
                                const link =
                                  container.tagName === "A"
                                    ? container
                                    : container.parentElement;
                                const text = document.createTextNode(
                                  link.textContent
                                );
                                link.replaceWith(text);

                                const newRange = document.createRange();
                                newRange.setStart(text, 0);
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                              }
                            }
                          }
                        }}
                        onPaste={(e) => handlePaste(e, false)}
                        style={{ whiteSpace: "pre-wrap" }}
                      />

                      {/* active link bar for composer */}
                      {renderActiveLinkBar("composer")}
                    </div>

                    {/* Image thumbnails - moved to bottom */}
                    {composerImages.length > 0 && (
                      <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3 mt-2">
                        {composerImages.map((img) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={img.src}
                              alt={img.name}
                              className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => setViewingImage(img)}
                            />
                            <button
                              onClick={() => removeImage(img.id, false)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <motion.div className="p-4 border-t border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
                  <div className="flex items-center gap-0.5 relative">
                    <button
                      onClick={handleSendComposer}
                      className="px-5 py-2 bg-[#FFCA00] text-white rounded-tl-3xl rounded-bl-3xl hover:bg-[#d9ac00] font-medium text-sm"
                    >
                      Send
                    </button>
                    <button
                      onClick={() =>
                        setShowComposerScheduleMenu(!showComposerScheduleMenu)
                      }
                      className="pr-2 pl-1 py-2 bg-[#FFCA00] text-white rounded-tr-3xl rounded-br-3xl hover:bg-[#d9ac00] text-sm flex items-center justify-center"
                    >
                      <IoMdArrowDropdown className="w-5 h-5" />
                    </button>
                    {showComposerScheduleMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowComposerScheduleMenu(false)}
                        />
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => {
                              console.log("Schedule composer for later");
                              setShowComposerScheduleMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Clock className="w-4 h-4" />
                            Schedule send
                          </button>
                          <button
                            onClick={() => {
                              console.log("Schedule for tomorrow 9 AM");
                              setShowComposerScheduleMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Tomorrow at 9:00 AM
                          </button>
                          <button
                            onClick={() => {
                              console.log("Schedule for Monday 9 AM");
                              setShowComposerScheduleMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Monday at 9:00 AM
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleCloseComposer}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Discard"
                  >
                    <Trash2 className="w-5 h-5 text-gray-600 hover:text-red-500" />
                  </button>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {showLinkPopover && (
          <>
            <div
              className="fixed inset-0 z-[59]"
              onClick={() => setShowLinkPopover(false)}
            />
            <div
              className="fixed z-[9999] bg-white shadow-xl border border-gray-300 rounded-lg p-3 flex flex-col gap-2"
              style={{
                top: `${popoverPos.y + 12}px`,
                left: `${popoverPos.x}px`,
                width: POP_WIDTH + "px",
                maxWidth: "90vw",
              }}
            >
              <div className="relative">
                <MdShortText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="border border-gray-300 rounded pl-9 pr-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                  placeholder="Text"
                  autoFocus={!linkText}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // Focus the URL input
                      e.target.parentElement.nextElementSibling
                        ?.querySelector("input")
                        ?.focus();
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="border border-gray-300 rounded pl-9 pr-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                    placeholder="Type or paste a link"
                    autoFocus={linkText.length > 0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && linkUrl.trim()) {
                        e.preventDefault();
                        handleCreateLink();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleCreateLink}
                  disabled={!linkUrl.trim()}
                  className="px-4 py-1.5 bg-[#FFCA00] text-white rounded hover:bg-[#d9ac00] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#d9ac00]"
                >
                  Apply
                </button>
              </div>
            </div>
          </>
        )}
        {/* Image Viewer Modal */}
        {viewingImage && (
          <>
            <div
              className="fixed inset-0 bg-black/80 z-[100]"
              onClick={() => setViewingImage(null)}
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div className="relative max-w-4xl max-h-[90dvh]">
                <button
                  onClick={() => setViewingImage(null)}
                  className="absolute -top-10 right-0 text-white hover:text-gray-300"
                >
                  <X className="w-8 h-8" />
                </button>
                <img
                  src={viewingImage.src}
                  alt={viewingImage.name}
                  className="max-w-full max-h-[85vh] object-contain rounded"
                />
                <p className="text-white text-center mt-2 text-sm">
                  {viewingImage.name}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Email;
