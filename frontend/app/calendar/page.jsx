"use client";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  Check,
  AlertCircle,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import {
  format,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  addDays,
  subDays,
  isBefore,
  isAfter,
  startOfDay,
  set,
} from "date-fns";
import { useEffect, useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { MdAddCircleOutline } from "react-icons/md";
import Navbar from "../../components/commonComp/Navbar";

// import tokenRequest from "@/axios/axiosInstance";

const EventCalendar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const today = startOfDay(new Date());

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([
    { id: 1, name: "Meeting", color: "#22c55e" },
    { id: 2, name: "Urgent", color: "#ef4444" },
    { id: 3, name: "Conference", color: "#3b82f6" },
    { id: 4, name: "Task", color: "#f97316" },
    { id: 5, name: "Design", color: "#8b5cf6" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    date: null,
    startTime: "",
    endTime: "",
    category: null,
  });

  const [errors, setErrors] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Review Q4 Marketing Budget",
      project: "Finance",
      priority: "high",
      dueDate: subDays(today, 2),
      completed: false,
      assigned: ["FD"],
      time: "11:00 AM",
    },
    {
      id: 2,
      title: "Morning standup meeting",
      project: "Operations",
      priority: "meeting",
      dueDate: today,
      time: "09:00 AM",
      assigned: ["TM"],
      completed: false,
    },
    {
      id: 3,
      title: "Update landing page visuals",
      project: "Website Redesign",
      priority: "design",
      dueDate: today,
      time: "10:00 AM",
      assigned: ["JP", "ML"],
      completed: false,
    },
    {
      id: 4,
      title: "Weekly team sync",
      project: "Operations",
      priority: "meeting",
      dueDate: today,
      time: "14:00 PM",
      assigned: ["TM"],
      completed: false,
    },
    {
      id: 5,
      title: "Prepare client presentation",
      project: "Sales",
      priority: "urgent",
      dueDate: today,
      time: "16:30 PM",
      assigned: ["SR"],
      completed: false,
    },
    {
      id: 6,
      title: "Code review session",
      project: "Development",
      priority: "normal",
      dueDate: today,
      time: "18:00 PM",
      assigned: ["JP"],
      completed: false,
    },
    {
      id: 7,
      title: "Send invoices to accounting",
      project: "Finance",
      priority: "normal",
      dueDate: addDays(today, 1),
      time: "10:00 AM",
      assigned: ["AC"],
      completed: false,
    },
    {
      id: 8,
      title: "Project kickoff meeting",
      project: "New Initiative",
      priority: "meeting",
      dueDate: addDays(today, 2),
      time: "11:00 AM",
      assigned: ["AL", "JP", "SR"],
      completed: false,
    },
    {
      id: 9,
      title: "Complete wireframes",
      project: "Mobile App",
      priority: "design",
      dueDate: addDays(today, 3),
      time: "14:00 PM",
      assigned: ["ML"],
      completed: false,
    },
    {
      id: 10,
      title: "Review performance metrics",
      project: "Analytics",
      priority: "normal",
      dueDate: addDays(today, 4),
      time: "15:00 PM",
      assigned: ["FD"],
      completed: true,
    },
    {
      id: 11,
      title: "Submit monthly report",
      project: "Management",
      priority: "urgent",
      dueDate: subDays(today, 1),
      time: "09:30 AM",
      assigned: ["TM"],
      completed: false,
    },
    {
      id: 12,
      title: "Fix login bug",
      project: "Website",
      priority: "high",
      dueDate: today,
      time: "11:30 AM",
      assigned: ["JP"],
      completed: false,
    },
    {
      id: 13,
      title: "Team building activity",
      project: "HR",
      priority: "normal",
      dueDate: subDays(today, 1),
      time: "16:00 PM",
      assigned: ["HR"],
      completed: true,
    },
    {
      id: 14,
      title: "Update documentation",
      project: "Development",
      priority: "normal",
      dueDate: subDays(today, 3),
      time: "10:00 AM",
      assigned: ["AL"],
      completed: true,
    },
  ]);

  const [calendarDays, setCalendarDays] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");

  // ==================== FETCH API CALLS (GET) ====================

  // 1. Fetch all tasks on component mount
  // useEffect(() => {
  //   const fetchTasks = async () => {
  //     try {
  //       const response = await tokenRequest.get('/tasks/');
  //       setTasks(response.data);
  //     } catch (error) {
  //       console.error('Error fetching tasks:', error);
  //     }
  //   };
  //   fetchTasks();
  // }, []);

  // 2. Fetch all categories on component mount
  // useEffect(() => {
  //   const fetchCategories = async () => {
  //     try {
  //       const response = await tokenRequest.get('/categories/');
  //       setCategories(response.data);
  //     } catch (error) {
  //       console.error('Error fetching categories:', error);
  //     }
  //   };
  //   fetchCategories();
  // }, []);

  // 3. Fetch all events on component mount
  // useEffect(() => {
  //   const fetchEvents = async () => {
  //     try {
  //       const response = await tokenRequest.get('/events/');
  //       setEvents(response.data);
  //     } catch (error) {
  //       console.error('Error fetching events:', error);
  //     }
  //   };
  //   fetchEvents();
  // }, []);

  // 4. Fetch tasks for a specific date
  // const fetchTasksByDate = async (date) => {
  //   try {
  //     const formattedDate = format(date, 'yyyy-MM-dd');
  //     const response = await tokenRequest.get(`/tasks/by-date/${formattedDate}/`);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error fetching tasks by date:', error);
  //     return [];
  //   }
  // };

  // 5. Fetch events for a specific date
  // const fetchEventsByDate = async (date) => {
  //   try {
  //     const formattedDate = format(date, 'yyyy-MM-dd');
  //     const response = await tokenRequest.get(`/events/by-date/${formattedDate}/`);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error fetching events by date:', error);
  //     return [];
  //   }
  // };

  // 6. Fetch single task by ID
  // const fetchTaskById = async (taskId) => {
  //   try {
  //     const response = await tokenRequest.get(`/tasks/${taskId}/`);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error fetching task by ID:', error);
  //     return null;
  //   }
  // };

  // 7. Fetch single event by ID
  // const fetchEventById = async (eventId) => {
  //   try {
  //     const response = await tokenRequest.get(`/events/${eventId}/`);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error fetching event by ID:', error);
  //     return null;
  //   }
  // };

  // ==================== END FETCH API CALLS ====================
  // ==================== CREATE API CALLS (POST) ====================

  // 1. Create a new task
  // const createTask = async (taskData) => {
  //   try {
  //     const response = await tokenRequest.post('/tasks/', taskData);
  //     setTasks([...tasks, response.data]);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error creating task:', error);
  //     throw error;
  //   }
  // };

  // 2. Create a new category
  // const createCategory = async (categoryData) => {
  //   try {
  //     const response = await tokenRequest.post('/categories/', categoryData);
  //     setCategories([...categories, response.data]);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error creating category:', error);
  //     throw error;
  //   }
  // };

  // 3. Create a new event (used in handleSaveEvent)
  // const createEvent = async (eventData) => {
  //   try {
  //     const response = await tokenRequest.post('/events/', eventData);
  //     setEvents([...events, response.data]);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error creating event:', error);
  //     throw error;
  //   }
  // };

  // ==================== END CREATE API CALLS ====================
  // ==================== UPDATE API CALLS (PUT/PATCH) ====================

  // 1. Update task (toggle completion or edit)
  // const updateTask = async (taskId, taskData) => {
  //   try {
  //     const response = await tokenRequest.put(`/tasks/${taskId}/`, taskData);
  //     setTasks(tasks.map(task =>
  //       task.id === taskId ? response.data : task
  //     ));
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error updating task:', error);
  //     throw error;
  //   }
  // };

  // 2. Toggle task completion status
  // const toggleTaskCompletion = async (taskId) => {
  //   try {
  //     const task = tasks.find(t => t.id === taskId);
  //     const response = await tokenRequest.patch(`/tasks/${taskId}/`, {
  //       completed: !task.completed
  //     });
  //     setTasks(tasks.map(t =>
  //       t.id === taskId ? response.data : t
  //     ));
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error toggling task completion:', error);
  //     throw error;
  //   }
  // };

  // 3. Update event
  // const updateEvent = async (eventId, eventData) => {
  //   try {
  //     const response = await tokenRequest.put(`/events/${eventId}/`, eventData);
  //     setEvents(events.map(event =>
  //       event.id === eventId ? response.data : event
  //     ));
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error updating event:', error);
  //     throw error;
  //   }
  // };

  // 4. Update category
  // const updateCategory = async (categoryId, categoryData) => {
  //   try {
  //     const response = await tokenRequest.put(`/categories/${categoryId}/`, categoryData);
  //     setCategories(categories.map(cat =>
  //       cat.id === categoryId ? response.data : cat
  //     ));
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error updating category:', error);
  //     throw error;
  //   }
  // };

  // ==================== END UPDATE API CALLS ====================
  // ==================== DELETE API CALLS ====================

  // 1. Delete task
  // const deleteTask = async (taskId) => {
  //   try {
  //     await tokenRequest.delete(`/tasks/${taskId}/`);
  //     setTasks(tasks.filter(task => task.id !== taskId));
  //   } catch (error) {
  //     console.error('Error deleting task:', error);
  //     throw error;
  //   }
  // };

  // 2. Delete event
  // const deleteEvent = async (eventId) => {
  //   try {
  //     await tokenRequest.delete(`/events/${eventId}/`);
  //     setEvents(events.filter(event => event.id !== eventId));
  //   } catch (error) {
  //     console.error('Error deleting event:', error);
  //     throw error;
  //   }
  // };

  // 3. Delete category
  // const deleteCategory = async (categoryId) => {
  //   try {
  //     await tokenRequest.delete(`/categories/${categoryId}/`);
  //     setCategories(categories.filter(cat => cat.id !== categoryId));
  //   } catch (error) {
  //     console.error('Error deleting category:', error);
  //     throw error;
  //   }
  // };

  // ==================== END DELETE API CALLS ====================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const parseTaskTime = (timeString) => {
    if (!timeString) return null;

    try {
      const cleanTime = timeString.trim().toUpperCase();
      const timeParts = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);

      if (!timeParts) return null;

      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const meridiem = timeParts[3];

      if (meridiem) {
        if (meridiem === "PM" && hours !== 12) {
          hours += 12;
        } else if (meridiem === "AM" && hours === 12) {
          hours = 0;
        }
      }

      return set(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 });
    } catch (error) {
      console.error("Error parsing time:", timeString, error);
      return null;
    }
  };

  const isTaskOverdue = (task) => {
    if (task.completed) return false;

    const taskDate = startOfDay(task.dueDate);
    const todayDate = startOfDay(currentTime);

    if (isBefore(taskDate, todayDate)) {
      return true;
    }

    if (isSameDay(taskDate, todayDate)) {
      const taskTime = parseTaskTime(task.time);
      if (taskTime && isBefore(taskTime, currentTime)) {
        return true;
      }
    }

    return false;
  };

  const isTaskDueToday = (task) => {
    if (task.completed) return false;

    const taskDate = startOfDay(task.dueDate);
    const todayDate = startOfDay(currentTime);

    if (!isSameDay(taskDate, todayDate)) {
      return false;
    }

    const taskTime = parseTaskTime(task.time);
    if (!taskTime) {
      return true;
    }

    return isAfter(taskTime, currentTime) || isSameDay(taskTime, currentTime);
  };

  const isTaskUpcoming = (task) => {
    if (task.completed) return false;

    const taskDate = startOfDay(task.dueDate);
    const todayDate = startOfDay(currentTime);

    return isAfter(taskDate, todayDate);
  };

  const getTodayOverdueTasks = () => {
    return tasks
      .filter((task) => {
        if (task.completed) return false;
        const taskDate = startOfDay(task.dueDate);
        const todayDate = startOfDay(currentTime);

        if (!isSameDay(taskDate, todayDate)) return false;

        const taskTime = parseTaskTime(task.time);
        if (!taskTime) return false;

        return isBefore(taskTime, currentTime);
      })
      .sort((a, b) => {
        const timeA = parseTaskTime(a.time);
        const timeB = parseTaskTime(b.time);
        if (!timeA || !timeB) return 0;
        return timeA - timeB;
      });
  };

  const getTodayTasks = () => {
    return tasks
      .filter((task) => isTaskDueToday(task))
      .sort((a, b) => {
        const timeA = parseTaskTime(a.time);
        const timeB = parseTaskTime(b.time);
        if (!timeA || !timeB) return 0;
        return timeA - timeB;
      });
  };

  const getAllOverdueTasks = () => {
    return tasks
      .filter((task) => isTaskOverdue(task))
      .sort((a, b) => {
        const dateCompare = new Date(a.dueDate) - new Date(b.dueDate);
        if (dateCompare !== 0) return dateCompare;

        const timeA = parseTaskTime(a.time);
        const timeB = parseTaskTime(b.time);
        if (!timeA || !timeB) return 0;

        return timeA - timeB;
      });
  };

  const getUpcomingTasks = () => {
    return tasks
      .filter((task) => isTaskUpcoming(task))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  };

  const taskCounts = {
    today: getTodayTasks().length + getTodayOverdueTasks().length,
    upcoming: getUpcomingTasks().length,
    due: getAllOverdueTasks().length,
    completed: tasks.filter((t) => t.completed).length,
  };

  const getFilteredTasks = () => {
    let filtered = [];

    switch (activeTab) {
      case "today":
        filtered = [...getTodayOverdueTasks(), ...getTodayTasks()];
        break;
      case "upcoming":
        filtered = getUpcomingTasks();
        break;
      case "due":
        filtered = getAllOverdueTasks();
        break;
      case "completed":
        filtered = tasks.filter((task) => task.completed);
        break;
      default:
        filtered = [...tasks];
        break;
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((task) => {
        switch (filterStatus) {
          case "completed":
            return task.completed;
          case "pending":
            return !task.completed;
          case "high":
            return task.priority === "high";
          case "urgent":
            return task.priority === "urgent";
          default:
            return true;
        }
      });
    }

    // Apply sorting (avoid NaN issues)
    if (!["today", "due", "upcoming"].includes(activeTab)) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "dueDate": {
            const dateA = new Date(a.dueDate);
            const dateB = new Date(b.dueDate);

            if (!isNaN(dateA) && !isNaN(dateB)) {
              const cmp = dateA - dateB;
              if (cmp !== 0) return cmp;
            }

            const timeA = parseTaskTime(a.time);
            const timeB = parseTaskTime(b.time);

            if (timeA && timeB) return timeA - timeB;

            return 0;
          }

          case "priority": {
            const priorityOrder = {
              urgent: 1,
              high: 2,
              meeting: 3,
              design: 4,
              normal: 5,
            };
            return (
              (priorityOrder[a.priority] || 99) -
              (priorityOrder[b.priority] || 99)
            );
          }

          case "title":
            return a.title?.localeCompare(b.title || "") || 0;

          default:
            return 0;
        }
      });
    }

    return filtered;
  };

  const renderPriorityBadge = (priority) => {
    const styles = {
      high: {
        backgroundColor: "#fee2e2",
        color: "#dc2626",
        border: "1px solid #fecaca",
      },
      design: {
        backgroundColor: "#faf5ff",
        color: "#7c3aed",
        border: "1px solid #e9d5ff",
      },
      meeting: {
        backgroundColor: "#f9fafb",
        color: "#4b5563",
        border: "1px solid #e5e7eb",
      },
      urgent: {
        backgroundColor: "#ffedd5",
        color: "#ea580c",
        border: "1px solid #fed7aa",
      },
      normal: {
        backgroundColor: "#f8fafc",
        color: "#64748b",
        border: "1px solid #e2e8f0",
      },
    };

    const labels = {
      high: "High",
      design: "Design",
      meeting: "Meeting",
      urgent: "Urgent",
      normal: "Normal",
    };

    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] font-medium"
        style={styles[priority]}
      >
        {labels[priority]}
      </span>
    );
  };

  const toggleTask = (taskId) => {
    // API call version (uncomment when ready):
    // toggleTaskCompletion(taskId);

    // Local state version (current):
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);

    // Optionally fetch tasks/events for this date:
    // fetchTasksByDate(date);
    // fetchEventsByDate(date);
  };

  const handleSaveEvent = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Event name is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.startTime) newErrors.startTime = "Start time is required";
    if (!formData.endTime) newErrors.endTime = "End time is required";
    if (!formData.category) newErrors.category = "Category is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newEvent = {
      id: Date.now(),
      name: formData.name,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      category: formData.category,
    };

    // API call version (uncomment when ready):
    // createEvent(newEvent);

    // Local state version (current):
    setEvents([...events, newEvent]);

    setFormData({
      name: "",
      date: null,
      startTime: "",
      endTime: "",
      category: null,
    });
    setErrors({});
    setIsDialogOpen(false);
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;

    const colors = [
      "#f97316",
      "#ea580c",
      "#c2410c",
      "#dc2626",
      "#16a34a",
      "#2563eb",
      "#7c3aed",
      "#db2777",
      "#0891b2",
    ];

    const newCategory = {
      id: Date.now(),
      name: newCategoryName,
      color: colors[Math.floor(Math.random() * colors.length)],
    };

    // API call version (uncomment when ready):
    // createCategory(newCategory);

    // Local state version (current):
    setCategories([...categories, newCategory]);

    setNewCategoryName("");
    setShowAddCategory(false);
    setIsAddCategoryModalOpen(false);
  };

  const getEventsForDate = (date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date));
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const prevMonthDays = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      prevMonthDays.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        hasEvent: false,
      });
    }

    const currentMonthDays = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      currentMonthDays.push({
        date,
        isCurrentMonth: true,
        hasEvent: false,
      });
    }

    const nextMonthDays = [];
    const daysNeeded = 42 - (prevMonthDays.length + currentMonthDays.length);

    for (let i = 1; i <= daysNeeded; i++) {
      nextMonthDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        hasEvent: false,
      });
    }

    setCalendarDays([...prevMonthDays, ...currentMonthDays, ...nextMonthDays]);
  };

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterOpen && !event.target.closest(".filter-dropdown")) {
        setFilterOpen(false);
      }
      if (sortOpen && !event.target.closest(".sort-dropdown")) {
        setSortOpen(false);
      }
      if (categoryDialogOpen && !event.target.closest(".category-dropdown")) {
        setCategoryDialogOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterOpen, sortOpen, categoryDialogOpen]);

  const handleCategorySelect = (categoryId) => {
    setFormData({ ...formData, category: categoryId });
    setCategoryDialogOpen(false);
  };

  return (
    <>
      <div className="bg-gray-50 text-gray-900 h-full flex flex-col overflow-hidden">
        <div className="hidden lg:block">
          <Navbar
            data={{
              heading: "Calendar",
              subheading: "Manage your schedule",
            }}
          />
        </div>



        <div className="flex flex-col lg:flex-row h-full w-full">
          <main className="flex-1 flex flex-col relative">
            {/* RESPONSIVE HEADER */}
            <header className="h-11 mt-3 border-b border-gray-200 flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 sm:px-6 pb-0 backdrop-blur-sm z-10 shrink-0 gap-3 lg:gap-0">
              {/* Tabs Navigation - Horizontal scroll on mobile */}
              <nav className="flex h-full gap-3 sm:gap-6 w-full lg:w-auto overflow-x-auto scrollbar-hide">
                {["today", "upcoming", "due", "completed"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`tab-btn h-full cursor-pointer flex items-center text-xs sm:text-sm font-medium px-1 relative transition-colors whitespace-nowrap ${activeTab === tab
                      ? "text-[#FFCA00] border-b-[2px] border-[#FFCA00]"
                      : "text-gray-500 hover:text-gray-900 border-b-[2px] border-transparent"
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {taskCounts[tab] > 0 && (
                      <span
                        className="ml-1.5 sm:ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor:
                            tab === "due"
                              ? "#fee2e2"
                              : tab === "today"
                                ? "#dbeafe"
                                : tab === "upcoming"
                                  ? "#f3e8ff"
                                  : "#dcfce7",
                          color:
                            tab === "due"
                              ? "#dc2626"
                              : tab === "today"
                                ? "#2563eb"
                                : tab === "upcoming"
                                  ? "#7c3aed"
                                  : "#16a34a",
                        }}
                      >
                        {taskCounts[tab]}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </header>
            {/* Filter, Sort, and New Task Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-end mt-5 px-8">
              <div className="relative filter-dropdown">
                <button
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-300 cursor-pointer transition-all active:scale-95"
                  onClick={() => {
                    setFilterOpen(!filterOpen);
                    setSortOpen(false);
                  }}
                >
                  <Filter
                    className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400"
                    strokeWidth="1.5"
                  />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                {filterOpen && (
                  <div className="absolute top-full sm:right-0 -right-16 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="space-y-1 p-2">
                      {["all", "completed", "pending", "high", "urgent"].map(
                        (filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setFilterStatus(filter);
                              setFilterOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${filterStatus === filter
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-gray-700 hover:bg-gray-100"
                              }`}
                          >
                            {filter === "all"
                              ? "All Tasks"
                              : filter.charAt(0).toUpperCase() +
                              filter.slice(1)}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="sort-dropdown relative">
                <button
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-300 cursor-pointer transition-all active:scale-95"
                  onClick={() => {
                    setSortOpen(!sortOpen);
                    setFilterOpen(false);
                  }}
                >
                  <ArrowUpDown
                    className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400"
                    strokeWidth="1.5"
                  />
                  <span className="hidden sm:inline">Sort</span>
                </button>
                {sortOpen && (
                  <div className="absolute top-full sm:right-0 -right-16 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="space-y-1 p-2">
                      {["dueDate", "priority", "title"].map((sort) => (
                        <button
                          key={sort}
                          onClick={() => {
                            setSortBy(sort);
                            setSortOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${sortBy === sort
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          {sort === "dueDate"
                            ? "Due Date"
                            : sort.charAt(0).toUpperCase() + sort.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Toggle Button (Mobile/Tablet) */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-300 cursor-pointer transition-all active:scale-95"
              >
                <CalendarDays
                  className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400"
                  strokeWidth="1.5"
                />
                <span className="hidden sm:inline">Calendar</span>
              </button>

              <button
                onClick={() => setIsDialogOpen(true)}
                className="px-3 sm:px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-xs sm:text-[15px] font-semibold cursor-pointer hover:bg-[#d9ac00] flex gap-1.5 sm:gap-2 items-center"
              >
                <MdAddCircleOutline className="text-lg sm:text-xl text-white" />
                <span className="">New Task</span>
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div
              className="flex-1 overflow-y-auto scroll-smooth"
              style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
            >
              <div className="w-full mx-auto p-4 sm:p-6 pt-4 sm:pt-6">
                <div className="mb-4 sm:mb-6">
                  <h1 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900">
                    {format(currentTime, "EEEE, MMMM do")}
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    You have {tasks.filter((t) => !t.completed).length} tasks
                    remaining.
                  </p>
                </div>

                {/* TODAY TAB */}
                {activeTab === "today" && (
                  <>
                    {getTodayOverdueTasks().length > 0 && (
                      <div className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle
                            className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-red-500"
                            strokeWidth="1.5"
                          />
                          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Overdue ({getTodayOverdueTasks().length})
                          </h2>
                        </div>
                        {getTodayOverdueTasks().map((task) => (
                          <div
                            key={task.id}
                            className="group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-xl shadow-sm hover:border-red-300 transition-all mb-2 cursor-pointer active:scale-[0.99] hover:transform hover:-translate-y-[1px] hover:shadow-md"
                            onClick={() => toggleTask(task.id)}
                          >
                            <label
                              className="relative flex items-center justify-center cursor-pointer p-1 -m-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleTask(task.id)}
                                className="hidden"
                              />
                              <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-red-400 rounded-md hover:border-red-600 transition-colors flex items-center justify-center bg-white">
                                {task.completed && (
                                  <Check
                                    className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white"
                                    strokeWidth="3"
                                  />
                                )}
                              </div>
                            </label>
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-xs sm:text-sm font-medium block truncate ${task.completed
                                  ? "line-through text-gray-400"
                                  : "text-gray-900"
                                  }`}
                              >
                                {task.title}
                              </span>
                              {task.project && (
                                <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 block truncate">
                                  {task.project}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                              {renderPriorityBadge(task.priority)}
                              <span className="text-[10px] sm:text-xs text-red-600 font-semibold hidden sm:inline">
                                {task.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {getTodayTasks().length > 0 && (
                      <div className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FFCA00] hover:bg-[#d9ac00]"></div>
                          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Today ({getTodayTasks().length})
                          </h2>
                        </div>
                        {getTodayTasks().map((task) => (
                          <div
                            key={task.id}
                            className="group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all mb-2 cursor-pointer relative overflow-hidden active:scale-[0.99] hover:transform hover:-translate-y-[1px]"
                            onClick={() => toggleTask(task.id)}
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFCA00] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#d9ac00]"></div>
                            <label
                              className="relative flex items-center justify-center cursor-pointer ml-0 sm:ml-1 p-1 -m-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleTask(task.id)}
                                className="hidden"
                              />
                              <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-gray-300 rounded-md hover:border-[#FFCA00] transition-colors flex items-center justify-center bg-white">
                                {task.completed && (
                                  <Check
                                    className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white"
                                    strokeWidth="3"
                                  />
                                )}
                              </div>
                            </label>
                            <div className="flex-1 flex flex-col min-w-0">
                              <span
                                className={`text-xs sm:text-sm font-medium block truncate ${task.completed
                                  ? "line-through text-gray-400"
                                  : "text-gray-900"
                                  }`}
                              >
                                {task.title}
                              </span>
                              {task.project && (
                                <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
                                  {task.project}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                              {task.assigned && task.assigned.length > 0 && (
                                <div className="hidden sm:flex -space-x-2">
                                  {task.assigned.map((initials, idx) => (
                                    <div
                                      key={idx}
                                      className="w-5 sm:w-6 h-5 sm:h-6 rounded-full border border-white bg-gray-200 text-[9px] sm:text-[10px] flex items-center justify-center text-gray-500"
                                    >
                                      {initials}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {renderPriorityBadge(task.priority)}
                              {task.time && (
                                <span className="text-[10px] sm:text-xs text-gray-600 font-medium tabular-nums hidden sm:inline">
                                  {task.time}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {getTodayOverdueTasks().length === 0 &&
                      getTodayTasks().length === 0 && (
                        <div className="text-center py-8 sm:py-12">
                          <CheckCircle2
                            className="w-10 sm:w-12 h-10 sm:h-12 text-[#FFCA00] mx-auto mb-3"
                            strokeWidth="1.5"
                          />
                          <p className="text-gray-500 text-xs sm:text-sm">
                            All caught up! No tasks for today.
                          </p>
                        </div>
                      )}
                  </>
                )}
                {/* UPCOMING TAB */}
                {activeTab === "upcoming" && (
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays
                        className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-500"
                        strokeWidth="1.5"
                      />
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Upcoming Tasks ({getUpcomingTasks().length})
                      </h2>
                    </div>

                    {getFilteredTasks().length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <CalendarDays
                          className="w-10 sm:w-12 h-10 sm:h-12 text-gray-300 mx-auto mb-3"
                          strokeWidth="1.5"
                        />
                        <p className="text-gray-500 text-xs sm:text-sm">
                          No upcoming tasks scheduled
                        </p>
                      </div>
                    ) : (
                      getFilteredTasks().map((task) => (
                        <div
                          key={task.id}
                          className="group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-purple-50 border border-purple-200 rounded-xl shadow-sm hover:border-purple-200 transition-all mb-2 cursor-pointer active:scale-[0.99] hover:transform hover:-translate-y-[1px] hover:shadow-md"
                          onClick={() => toggleTask(task.id)}
                        >
                          <label
                            className="relative flex items-center justify-center cursor-pointer p-1 -m-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id)}
                              className="hidden"
                            />
                            <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-gray-300 rounded-md hover:border-purple-500 transition-colors flex items-center justify-center bg-white">
                              {task.completed && (
                                <Check
                                  className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white"
                                  strokeWidth="3"
                                />
                              )}
                            </div>
                          </label>
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-medium block truncate ${task.completed
                                ? "line-through text-gray-400"
                                : "text-gray-900"
                                }`}
                            >
                              {task.title}
                            </span>
                            {task.project && (
                              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 block truncate">
                                {task.project}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                            {renderPriorityBadge(task.priority)}
                            <span className="text-[10px] sm:text-xs text-purple-600 font-medium">
                              {format(task.dueDate, "MMM d")}
                              {task.time && (
                                <span className="hidden sm:inline">
                                  {" "}
                                  • {task.time}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {/* DUE TAB */}
                {activeTab === "due" && (
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle
                        className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-red-500"
                        strokeWidth="1.5"
                      />
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        All Overdue Tasks ({getAllOverdueTasks().length})
                      </h2>
                    </div>

                    {getFilteredTasks().length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <CheckCircle2
                          className="w-10 sm:w-12 h-10 sm:h-12 text-[#FFCA00] mx-auto mb-3"
                          strokeWidth="1.5"
                        />
                        <p className="text-gray-500 text-xs sm:text-sm">
                          Great! No overdue tasks
                        </p>
                      </div>
                    ) : (
                      getFilteredTasks().map((task) => (
                        <div
                          key={task.id}
                          className="group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-xl shadow-sm hover:border-red-300 transition-all mb-2 cursor-pointer active:scale-[0.99] hover:transform hover:-translate-y-[1px] hover:shadow-md"
                          onClick={() => toggleTask(task.id)}
                        >
                          <label
                            className="relative flex items-center justify-center cursor-pointer p-1 -m-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id)}
                              className="hidden"
                            />
                            <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-red-400 rounded-md hover:border-red-600 transition-colors flex items-center justify-center bg-white">
                              {task.completed && (
                                <Check
                                  className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white"
                                  strokeWidth="3"
                                />
                              )}
                            </div>
                          </label>
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-medium block truncate ${task.completed
                                ? "line-through text-gray-400"
                                : "text-gray-900"
                                }`}
                            >
                              {task.title}
                            </span>
                            {task.project && (
                              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 block truncate">
                                {task.project}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                            {renderPriorityBadge(task.priority)}
                            <span className="text-[10px] sm:text-xs text-red-600 font-semibold">
                              {isSameDay(
                                startOfDay(task.dueDate),
                                startOfDay(currentTime)
                              )
                                ? task.time
                                : format(task.dueDate, "MMM d")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {/* COMPLETED TAB */}
                {activeTab === "completed" && (
                  <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2
                        className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#FFCA00]"
                        strokeWidth="1.5"
                      />
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Completed Tasks (
                        {tasks.filter((t) => t.completed).length})
                      </h2>
                    </div>

                    {getFilteredTasks().length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <AlertCircle
                          className="w-10 sm:w-12 h-10 sm:h-12 text-gray-300 mx-auto mb-3"
                          strokeWidth="1.5"
                        />
                        <p className="text-gray-500 text-xs sm:text-sm">
                          No completed tasks yet
                        </p>
                      </div>
                    ) : (
                      getFilteredTasks().map((task) => (
                        <div
                          key={task.id}
                          className="group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-[#FFF9E6] border border-[#FFE580] rounded-xl shadow-sm hover:border-gray-300 transition-all mb-2 cursor-pointer active:scale-[0.99] hover:transform hover:-translate-y-[1px] hover:shadow-sm"
                          onClick={() => toggleTask(task.id)}
                        >
                          <label
                            className="relative flex items-center justify-center cursor-pointer p-1 -m-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id)}
                              className="hidden"
                            />
                            <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-[#FFCA00] rounded-md hover:border-[#A68200] flex items-center justify-center bg-[#FFCA00] hover:bg-[#d9ac00]">
                              {task.completed && (
                                <Check
                                  className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white"
                                  strokeWidth="3"
                                />
                              )}
                            </div>
                          </label>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs sm:text-sm font-medium line-through text-gray-400 block truncate">
                              {task.title}
                            </span>
                            {task.project && (
                              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 block truncate">
                                {task.project}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                            {renderPriorityBadge(task.priority)}
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                              {format(task.dueDate, "MMM d")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* BACKDROP FOR MOBILE SIDEBAR */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* RESPONSIVE SIDEBAR */}
          <aside
            className={`
            fixed lg:static inset-y-0 right-0 z-50 
            w-[85%] sm:w-[360px] lg:w-[360px] flex-none 
            bg-gray-50 lg:border-l border-gray-200 
            flex flex-col h-full shadow-2xl lg:shadow-[-2px_0_24px_-12px_rgba(0,0,0,0.05)]
            transition-transform duration-300 ease-in-out transform
            ${isSidebarOpen
                ? "translate-x-0"
                : "translate-x-full lg:translate-x-0"
              }
          `}
          >
            <div className="p-6 h-full overflow-y-auto">
              {/* Mobile Close Button */}
              <div className="flex lg:hidden justify-between items-center mb-6">
                <span className="text-lg font-semibold text-gray-900">
                  Calendar
                </span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-500 transition-all active:scale-90"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth="1.5" />
                </button>
                <span className="text-sm font-semibold text-gray-900 tracking-tight">
                  {format(currentDate, "MMMM yyyy")}
                </span>
                <button
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-500 transition-all active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth="1.5" />
                </button>
              </div>

              <div className="mb-8">
                <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-xs">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <span key={i} className="text-gray-400 font-medium">
                      {day}
                    </span>
                  ))}

                  {calendarDays.map((day, idx) => {
                    const isTodayDate = isSameDay(
                      day.date,
                      startOfDay(currentTime)
                    );
                    const isSelectedDate = isSameDay(day.date, selectedDate);

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayClick(day.date)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all active:scale-90 relative ${!day.isCurrentMonth
                          ? "text-gray-300 pointer-events-none"
                          : isSelectedDate
                            ? "bg-[#FFCA00] text-white shadow-md font-semibold text-sm"
                            : isTodayDate
                              ? "bg-[#FFF9E6] text-[#A68200] shadow-sm font-medium"
                              : "text-gray-600 hover:bg-white hover:shadow-sm"
                          }`}
                      >
                        {day.date.getDate()}
                        {day.hasEvent && day.isCurrentMonth && (
                          <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#FFCA00] rounded-full hover:bg-[#d9ac00]"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-gray-200 w-full mb-6"></div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A68200] font-medium">
                    Current Time
                  </span>
                  <span className="text-sm text-[#594600] font-semibold tabular-nums">
                    {format(currentTime, "h:mm a")}
                  </span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-[#FFF9E6] rounded-lg border border-[#FFE580]">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-[#A68200]" />
                  <h4 className="text-sm font-semibold text-[#A68200]">
                    Selected Date
                  </h4>
                </div>
                <p className="text-[#A68200] text-sm font-medium">
                  {format(selectedDate, "EEEE, MMMM do, yyyy")}
                </p>
                <div className="mt-2 text-xs text-[#A68200]">
                  {getEventsForDate(selectedDate).length} events scheduled
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="text-white text-xs font-medium px-3 py-1 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.name}
                  </span>
                ))}
                <button
                  onClick={() => setIsAddCategoryModalOpen(true)}
                  className="h-7 px-2 border border-[#FFCA00] text-[#FFCA00] cursor-pointer rounded-md text-xs font-medium flex items-center gap-1 hover:bg-blue-50"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* RESPONSIVE DIALOG/MODAL */}
        {isDialogOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[1000] animate-in fade-in-0"
              onClick={() => setIsDialogOpen(false)}
            />
            <div className="fixed  z-[1001] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl w-[95vw] sm:w-[90vw] max-w-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold">
                  Add new event
                </h2>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs sm:text-sm font-medium">
                    Event name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter event name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full h-9 border border-gray-300 rounded-md px-3 py-1 text-xs sm:text-sm focus:outline-none focus:border-[#FFCA00] focus:ring-2 focus:ring-[#FFF9E6]"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs sm:text-sm font-medium">
                    Select date
                  </label>
                  <input
                    type="date"
                    className="w-full h-9 border border-gray-300 rounded-md px-3 text-xs sm:text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:border-[#FFCA00] focus:ring-2 focus:ring-[#FFF9E6]"
                    value={
                      formData.date ? format(formData.date, "yyyy-MM-dd") : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date: new Date(e.target.value),
                      })
                    }
                  />
                  {errors.date && (
                    <p className="text-xs text-red-500">{errors.date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full h-9 border border-gray-300 rounded-md px-3 py-1 text-xs sm:text-sm focus:outline-none focus:border-[#FFCA00] focus:ring-2 focus:ring-[#FFF9E6]"
                  />
                  {errors.startTime && (
                    <p className="text-xs text-red-500">{errors.startTime}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">
                    End time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full h-9 border border-gray-300 rounded-md px-3 py-1 text-xs sm:text-sm focus:outline-none focus:border-[#FFCA00] focus:ring-2 focus:ring-[#FFF9E6]"
                  />
                  {errors.endTime && (
                    <p className="text-xs text-red-500">{errors.endTime}</p>
                  )}
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-medium">
                      Category
                    </label>
                    <button
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-[#FFCA00] cursor-pointer text-xs sm:text-sm hover:text-[#E6B800] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Category
                    </button>
                  </div>

                  <div className="relative category-dropdown">
                    <button
                      className="w-full h-9 border cursor-pointer border-gray-300 rounded-md px-3 text-sm text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:border-[#FFCA00] focus:ring-2 focus:ring-[#FFF9E6]"
                      onClick={() => setCategoryDialogOpen(!categoryDialogOpen)}
                    >
                      <span
                        className={
                          formData.category ? "text-gray-900" : "text-gray-400"
                        }
                      >
                        {formData.category
                          ? categories.find(
                            (cat) => cat.id === formData.category
                          )?.name
                          : "Select category"}
                      </span>
                      <IoIosArrowDown />
                    </button>
                    {categoryDialogOpen && (
                      <div className="absolute max-h-60 overflow-y-auto top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-2">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => handleCategorySelect(category.id)}
                              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 last:mb-0 flex items-center gap-2 ${formData.category === category.id
                                ? "bg-blue-50 text-[#A68200]"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.category && (
                    <p className="text-xs text-red-500">{errors.category}</p>
                  )}

                  {showAddCategory && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="New category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCategory()}
                        className="flex-1 h-9 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#FFCA00] focus:ring-2 focus:ring-[#FFF9E6]"
                      />
                      <button
                        onClick={addCategory}
                        className="px-3 py-1 bg-[#FFCA00] cursor-pointer text-white rounded-md text-sm hover:bg-[#d9ac00] flex items-center"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCategory(false);
                          setNewCategoryName("");
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-md cursor-pointer text-sm hover:bg-gray-50 flex items-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDialogOpen(false);
                    setFormData({
                      name: "",
                      date: null,
                      startTime: "",
                      endTime: "",
                      category: null,
                    });
                    setErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  className="px-4 py-2 bg-[#FFCA00] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#d9ac00]"
                >
                  Save Event
                </button>
              </div>
            </div>
          </>
        )}

        {/* ADD CATEGORY MODAL */}
        {isAddCategoryModalOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[1000] animate-in fade-in-0"
              onClick={() => setIsAddCategoryModalOpen(false)}
            />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl
             w-[95vw] sm:w-[400px] p-6 z-[1001] animate-in fade-in-0 zoom-in-95  ">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Add New Category</h2>
                <button
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    className="w-full h-9 border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:border-[#FFCA00] focus:ring-2 focus:ring-[#FFF9E6]"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsAddCategoryModalOpen(false);
                      setNewCategoryName("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCategory}
                    className="px-4 py-2 bg-[#FFCA00] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#d9ac00] flex items-center gap-2"
                  >
                    <MdAddCircleOutline className="text-lg sm:text-xl text-white" />
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
export default EventCalendar;
