import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { RootState, toggleTheme, logout } from "../lib/store";
import api from "../lib/api";
import { User, Course } from "../types";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building,
  ClipboardCheck,
  Award,
  Calendar,
  FileText,
  Bell,
  FileSpreadsheet,
  Clock,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Download,
  Plus,
  Phone,
  MapPin,
  Mail,
  UserCheck,
  AlertTriangle,
  Eye,
  LogOut,
  Moon,
  Sun,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  Unlock,
  ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";

const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function PrincipalDashboard() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { user: currentUser, theme } = useSelector((state: RootState) => state.app);
  const [activeModule, setActiveModule] = useState<string>("dashboard");

  // Core filters and modal states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [newNotice, setNewNotice] = useState({ title: "", content: "", category: "college" as const });
  const [selectedReport, setSelectedReport] = useState("student-performance");
  const [gradeCourseId, setGradeCourseId] = useState("All");

  // Settings State
  const [settingsPhone, setSettingsPhone] = useState(currentUser?.phone || "");
  const [settingsAddress, setSettingsAddress] = useState(currentUser?.address || "");
  const [settingsPic, setSettingsPic] = useState(currentUser?.profilePic || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Queries
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["enrollments"],
    queryFn: async () => (await api.get("/enrollments")).data
  });

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["attendance"],
    queryFn: async () => (await api.get("/attendance")).data
  });

  const { data: examMarks = [] } = useQuery<any[]>({
    queryKey: ["exam-marks"],
    queryFn: async () => (await api.get("/exam-marks")).data
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["exam-audit-logs"],
    queryFn: async () => (await api.get("/exam-marks/audit-logs")).data
  });

  const { data: notices = [] } = useQuery<any[]>({
    queryKey: ["notices"],
    queryFn: async () => (await api.get("/notices")).data
  });

  const { data: leaveRequests = [] } = useQuery<any[]>({
    queryKey: ["leave-requests"],
    queryFn: async () => (await api.get("/leave-requests")).data
  });

  // Mutations
  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "Approved" | "Rejected" }) => {
      return await api.post(`/leave-requests/status/${id}`, { status });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["exam-audit-logs"] });
      toast.success(res.data.message || `Leave request ${status === "Approved" ? "approved" : "rejected"} successfully!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update leave request status");
    }
  });

  const unlockExamMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/exam-marks/unlock/${id}`);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["exam-marks"] });
      queryClient.invalidateQueries({ queryKey: ["exam-audit-logs"] });
      toast.success(res.data.message || "Examination grade sheet unlocked!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to unlock grade entries");
    }
  });

  const publishExamToggleMutation = useMutation({
    mutationFn: async ({ recordIds, publish }: { recordIds: string[]; publish: boolean }) => {
      return await api.post("/exam-marks/publish-toggle", { recordIds, publish });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["exam-marks"] });
      queryClient.invalidateQueries({ queryKey: ["exam-audit-logs"] });
      toast.success(res.data.message || "Examination grades publication toggled!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to publish examination results");
    }
  });

  const publishNoticeMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/notices", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      setNewNotice({ title: "", content: "", category: "college" });
      toast.success("College-wide official notice published successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to publish notice");
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.put("/profile/details", payload);
    },
    onSuccess: (res: any) => {
      localStorage.setItem("college_user", JSON.stringify(res.data.user));
      toast.success("Profile contact details updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update details");
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/profile/change-password", payload);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Security credentials updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update credentials");
    }
  });

  // Computed variables
  const students = users.filter((u) => u.role === "student");
  const faculty = users.filter((u) => u.role === "faculty");
  const departments = [...new Set(users.map((u) => u.department).filter(Boolean))];

  const pendingLeaves = leaveRequests.filter((r) => r.status === "Pending");
  const activeExamsCount = examMarks.length;
  const publishedExamsCount = examMarks.filter((e) => e.isPublished).length;

  // Attendance shortage computation (< 75%)
  const calculateStudentAttendancePct = (studId: string) => {
    const studentLogs = attendance.filter((a) => a.studentId === studId);
    if (!studentLogs.length) return 100;
    const presentCount = studentLogs.filter((l) => l.status === "Present" || l.status === "Late").length;
    return Math.round((presentCount / studentLogs.length) * 100);
  };

  const attendanceShortages = students.map((s) => ({
    ...s,
    attendancePct: calculateStudentAttendancePct(s.id),
  })).filter((s) => s.attendancePct < 75);

  // Department comparative metrics
  const getDeptMetrics = () => {
    return departments.map((dept) => {
      const deptStudents = students.filter((s) => s.department === dept);
      const deptFaculty = faculty.filter((f) => f.department === dept);
      const deptCourses = courses.filter((c) => c.department === dept);
      const deptLogs = attendance.filter((a) => {
        const student = students.find((s) => s.id === a.studentId);
        return student?.department === dept;
      });
      const presentLogs = deptLogs.filter((l) => l.status === "Present" || l.status === "Late").length;
      const deptAttendanceAvg = deptLogs.length ? Math.round((presentLogs / deptLogs.length) * 100) : 85;

      return {
        name: dept,
        studentsCount: deptStudents.length,
        facultyCount: deptFaculty.length,
        coursesCount: deptCourses.length,
        attendanceAvg: deptAttendanceAvg,
      };
    });
  };

  const deptMetrics = getDeptMetrics();

  // Export mock report logic (CSV generator)
  const handleExportCSV = (title: string, headers: string[], rows: any[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(",")].concat(rows.map(e => e.join(","))).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/ /g, "_")}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${title} report successfully!`);
  };

  // Modules menu items
  const menuItems = [
    { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Scholars & Registry", icon: GraduationCap },
    { id: "faculty", label: "Faculty & Workloads", icon: Users },
    { id: "departments", label: "Departments & Stats", icon: Building },
    { id: "attendance", label: "Attendance Audit", icon: ClipboardCheck },
    { id: "exams", label: "Examination Board", icon: Award },
    { id: "timetable", label: "Unified Timetable", icon: Calendar },
    { id: "leave", label: `Leave Approvals (${pendingLeaves.length})`, icon: FileText, badge: pendingLeaves.length > 0 },
    { id: "notices", label: "Bulletins & Broadcasts", icon: Bell },
    { id: "reports", label: "ERP Reports Desk", icon: FileSpreadsheet },
    { id: "audit", label: "System Audit Logs", icon: Clock },
    { id: "settings", label: "Security & Preferences", icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-zinc-950 font-sans">
      {/* Principal Sub-navigation drawer */}
      <aside className="w-full md:w-64 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col gap-1 md:shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-zinc-900 mb-4 pb-4">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            {currentUser?.profilePic ? (
              <img src={currentUser.profilePic} alt="pic" className="h-full w-full object-cover" />
            ) : (
              <UserCheck className="h-5 w-5 text-indigo-600" />
            )}
          </div>
          <div className="truncate">
            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">{currentUser?.fullName}</h4>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
              {currentUser?.role}
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 max-h-[50vh] md:max-h-none overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id);
                  setSearchTerm("");
                }}
                className={`w-full text-left rounded-lg px-3 py-2 flex items-center justify-between font-sans text-xs font-semibold tracking-tight transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${active ? "bg-white text-indigo-600" : "bg-red-500 text-white"}`}>
                    {pendingLeaves.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main workspace container */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-6"
          >
            {/* 1. OVERVIEW / DASHBOARD MODULE */}
            {activeModule === "dashboard" && (
              <>
                {/* Welcome Card */}
                <div className="relative rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 text-white shadow-xl overflow-hidden border border-slate-900">
                  <div className="absolute right-0 bottom-0 top-0 opacity-10 w-96 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-500 to-transparent pointer-events-none" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-300 uppercase">
                    Institutional Management suite
                  </span>
                  <h1 className="text-2xl font-grotesk font-semibold tracking-tight mt-1 text-slate-100">
                    Welcome back, Principal Charles Xavier
                  </h1>
                  <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
                    Access high-level administrative insights, review real-time student performance index, authorize leave approvals, and inspect the institution audit trails.
                  </p>
                </div>

                {/* Statistics KPIs Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Total Scholars</span>
                      <GraduationCap className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{students.length}</span>
                      <p className="text-[10px] text-slate-400 mt-1">Registered academic profiles</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Total Faculty</span>
                      <Users className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{faculty.length}</span>
                      <p className="text-[10px] text-slate-400 mt-1">Active course coordinators</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Departments</span>
                      <Building className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{departments.length}</span>
                      <p className="text-[10px] text-slate-400 mt-1">Functional study branches</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Pending Leaves</span>
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">{pendingLeaves.length}</span>
                      <p className="text-[10px] text-slate-400 mt-1">Requires official approval</p>
                    </div>
                  </div>
                </div>

                {/* Quick Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attendance Analytics */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col shadow-sm">
                    <span className="font-semibold text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-4">Departmental Attendance Pct</span>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptMetrics}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: "8px" }} />
                          <Bar dataKey="attendanceAvg" fill="#4f46e5" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#94a3b8', fontSize: 10 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Course Enrollment Load */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col shadow-sm">
                    <span className="font-semibold text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-4">Scholars & Faculty Comparative distribution</span>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptMetrics}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: "8px" }} />
                          <Bar dataKey="studentsCount" name="Students" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="facultyCount" name="Faculty" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Notices & Approvals Dashboard panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Announcements */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col shadow-sm gap-4">
                    <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-zinc-900">
                      <span className="font-semibold text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Latest Bulletins</span>
                      <button onClick={() => setActiveModule("notices")} className="text-[10px] text-indigo-600 hover:underline">View All</button>
                    </div>
                    <div className="flex flex-col gap-3.5 max-h-60 overflow-y-auto">
                      {notices.slice(0, 3).map((notice: any) => (
                        <div key={notice.id} className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-100 dark:border-zinc-800/80">
                          <div className="flex justify-between items-center">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200">{notice.title}</h5>
                            <span className="text-[8px] font-mono bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase">
                              {notice.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">{notice.content}</p>
                          <span className="text-[9px] font-mono text-slate-400 mt-2 block">{notice.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Leave Requests Overview */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col shadow-sm gap-4">
                    <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-zinc-900">
                      <span className="font-semibold text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Awaiting Leave Authorization</span>
                      <button onClick={() => setActiveModule("leave")} className="text-[10px] text-indigo-600 hover:underline">Go to approvals</button>
                    </div>
                    <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
                      {pendingLeaves.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">No pending leave applications.</div>
                      ) : (
                        pendingLeaves.slice(0, 3).map((req: any) => (
                          <div key={req.id} className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-100 dark:border-zinc-800/80 flex justify-between items-center">
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200">{req.studentName}</h5>
                              <p className="text-[9px] text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
                                {req.startDate} to {req.endDate}
                              </p>
                              <p className="text-[10px] text-slate-600 dark:text-zinc-300 mt-1 truncate max-w-xs">"{req.reason}"</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateLeaveStatusMutation.mutate({ id: req.id, status: "Approved" })}
                                className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
                                title="Approve"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => updateLeaveStatusMutation.mutate({ id: req.id, status: "Rejected" })}
                                className="p-1.5 bg-rose-500 text-white rounded hover:bg-rose-600 transition"
                                title="Reject"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 2. STUDENT MANAGEMENT MODULE */}
            {activeModule === "students" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Scholars Directory Registry</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">View and inspect comprehensive academic profile folders of registered students.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Search name, email, roll no..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="All">All Departments</option>
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl border-slate-100 dark:border-zinc-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-900 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="p-3">Scholar Name</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Contact Email</th>
                        <th className="p-3">Attendance Average</th>
                        <th className="p-3">Course Enrollments</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs">
                      {students
                        .filter((s) => {
                          const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchDept = filterDept === "All" || s.department === filterDept;
                          return matchSearch && matchDept;
                        })
                        .map((stud) => {
                          const studEnrollments = enrollments.filter((e) => e.studentId === stud.id && e.status === "active");
                          const attAverage = calculateStudentAttendancePct(stud.id);
                          return (
                            <tr key={stud.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-900/40">
                              <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{stud.fullName}</td>
                              <td className="p-3 text-slate-500 dark:text-zinc-400">{stud.department}</td>
                              <td className="p-3 text-slate-400 dark:text-zinc-500 font-mono text-[10px]">{stud.email}</td>
                              <td className="p-3">
                                <span className={`font-mono font-bold ${attAverage < 75 ? "text-red-500" : "text-emerald-500"}`}>
                                  {attAverage}%
                                </span>
                              </td>
                              <td className="p-3 font-mono">{studEnrollments.length} active</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    const examEntries = examMarks.filter((e) => e.studentId === stud.id);
                                    setSelectedStudent({ ...stud, enrollmentsCount: studEnrollments.length, attAverage, examEntries });
                                  }}
                                  className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md font-semibold text-[10px] hover:underline"
                                >
                                  View Folder
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Individual Student Detail Overlay Folder */}
                {selectedStudent && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-full max-w-lg bg-white dark:bg-zinc-950 p-6 h-full shadow-2xl flex flex-col gap-5 overflow-y-auto">
                      <div className="flex justify-between items-start border-b pb-4 border-slate-100 dark:border-zinc-900">
                        <div>
                          <span className="text-[9px] font-mono text-indigo-600 uppercase tracking-wider font-bold">Academic Portfolio Directory</span>
                          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{selectedStudent.fullName}</h3>
                        </div>
                        <button onClick={() => setSelectedStudent(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-400">
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-4">
                        {/* Demographic Grid */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Department</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{selectedStudent.department}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Registered On</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 font-mono">{selectedStudent.registrationDate}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Contact Phone</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 font-mono">{selectedStudent.phone || "Not Listed"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Attendance Rate</span>
                            <span className={`text-xs font-bold ${selectedStudent.attAverage < 75 ? "text-red-500" : "text-emerald-500"}`}>
                              {selectedStudent.attAverage}%
                            </span>
                          </div>
                        </div>

                        {/* Registered Subjects */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300 mb-2">Enrolled Course Materials</h4>
                          <div className="flex flex-col gap-1.5">
                            {courses
                              .filter((c) => enrollments.some((e) => e.studentId === selectedStudent.id && e.courseId === c.id && e.status === "active"))
                              .map((course) => (
                                <div key={course.id} className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                                  <div>
                                    <span className="font-mono text-[10px] font-bold text-indigo-600">{course.code}</span>
                                    <p className="font-semibold text-slate-700 dark:text-zinc-200">{course.name}</p>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400">{course.credits} Credits</span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Examination Outcomes */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300 mb-2">Examination Marks Checklist</h4>
                          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                            {selectedStudent.examEntries.length === 0 ? (
                              <p className="text-[10px] text-slate-400">No examination scores uploaded yet.</p>
                            ) : (
                              selectedStudent.examEntries.map((mark: any) => (
                                <div key={mark.id} className="p-2 bg-slate-50 dark:bg-zinc-900 border rounded flex justify-between items-center text-[11px]">
                                  <div>
                                    <span className="font-mono font-bold text-slate-600 dark:text-zinc-400">{mark.courseId}</span>
                                    <p className="text-slate-500">Exam Type: {mark.examType}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-bold text-slate-800 dark:text-white">{mark.totalMarks} Marks</span>
                                    <p className={`text-[9px] font-bold uppercase ${mark.status === "Pass" ? "text-emerald-500" : "text-rose-500"}`}>
                                      {mark.status} ({mark.grade})
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. FACULTY MANAGEMENT MODULE */}
            {activeModule === "faculty" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Faculty & Course Coordinators</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Inspect assigned courses, timetable workload quotas, and contact directories.</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search faculty..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {faculty
                    .filter((f) => f.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((fac) => {
                      const facCourses = courses.filter((c) => c.facultyId === fac.id);
                      return (
                        <div key={fac.id} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition">
                          <div>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">{fac.fullName}</h4>
                                <span className="text-[9px] font-mono uppercase bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                                  {fac.department}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">Since {fac.registrationDate}</span>
                            </div>

                            <div className="mt-4 flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Assigned Workload Courses:</span>
                              {facCourses.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic">No course modules currently mapped.</p>
                              ) : (
                                facCourses.map((c) => (
                                  <div key={c.id} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-950 p-2 border border-slate-100 dark:border-zinc-900 rounded">
                                    <span className="font-semibold text-slate-700 dark:text-zinc-300">{c.name}</span>
                                    <span className="font-mono text-[10px] text-indigo-500 font-bold uppercase">{c.code}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="border-t border-slate-200/60 dark:border-zinc-800/80 mt-4 pt-3 flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {fac.email}</span>
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {fac.phone || "No phone"}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 4. DEPARTMENT MANAGEMENT MODULE */}
            {activeModule === "departments" && (
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Comparative Departmental Performance</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Institutional structural analysis: student distribution and faculty workloads.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {deptMetrics.map((dept, i) => (
                    <div key={dept.name} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b pb-2 border-slate-100 dark:border-zinc-900">
                        <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{dept.name}</span>
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-2 bg-slate-50 dark:bg-zinc-900/60 rounded">
                          <span className="text-lg font-bold font-mono text-slate-800 dark:text-white">{dept.studentsCount}</span>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Scholars</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-zinc-900/60 rounded">
                          <span className="text-lg font-bold font-mono text-slate-800 dark:text-white">{dept.facultyCount}</span>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Faculty</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-zinc-900/60 rounded col-span-2">
                          <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {dept.facultyCount ? (dept.studentsCount / dept.facultyCount).toFixed(1) : dept.studentsCount}:1
                          </span>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Student-to-Faculty Ratio</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                        <span>Attendance rate</span>
                        <span className="font-mono text-slate-800 dark:text-white">{dept.attendanceAvg}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${dept.attendanceAvg}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. ATTENDANCE MANAGEMENT MODULE */}
            {activeModule === "attendance" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-6 shadow-sm">
                <div>
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Attendance Defaulters & Shortage Alerts</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Trigger warnings for scholars failing to comply with the 75% credit attendance threshold.</p>
                </div>

                <div className="overflow-x-auto border rounded-xl border-slate-100 dark:border-zinc-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-900 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="p-3">Scholar Student</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Attendance Index</th>
                        <th className="p-3">Status Severity</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs">
                      {attendanceShortages.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">All students currently exceed the 75% credit threshold.</td>
                        </tr>
                      ) : (
                        attendanceShortages.map((stud) => (
                          <tr key={stud.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-900/40">
                            <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{stud.fullName}</td>
                            <td className="p-3 text-slate-500 dark:text-zinc-400">{stud.department}</td>
                            <td className="p-3 text-red-500 font-mono font-bold">{stud.attendancePct}%</td>
                            <td className="p-3">
                              <span className="flex items-center gap-1 text-[10px] text-rose-500 font-semibold font-mono bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full w-max">
                                <AlertTriangle className="h-3 w-3" /> Critical Shortage
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => toast.success(`Official administrative attendance warning dispatched to ${stud.fullName}!`)}
                                className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-bold text-[10px] transition"
                              >
                                Issue Warning
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. EXAMINATION MANAGEMENT MODULE */}
            {activeModule === "exams" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Examination Grade-sheet Board</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Review final term marks, publish results, and unlock grades for adjustment when necessary.</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={gradeCourseId}
                      onChange={(e) => setGradeCourseId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300"
                    >
                      <option value="All">All Courses</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                    </select>
                    <button
                      onClick={() => {
                        const targetIds = examMarks.map(e => e.id);
                        publishExamToggleMutation.mutate({ recordIds: targetIds, publish: true });
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      Publish All Results
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl border-slate-100 dark:border-zinc-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-900 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="p-3">Scholar Student</th>
                        <th className="p-3">Course Code</th>
                        <th className="p-3">Exam Category</th>
                        <th className="p-3 font-mono">Scores Summary</th>
                        <th className="p-3 font-mono">Submission State</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs">
                      {examMarks
                        .filter((item) => gradeCourseId === "All" || item.courseId === gradeCourseId)
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/55 dark:hover:bg-zinc-900/40">
                            <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{item.studentName}</td>
                            <td className="p-3 font-mono text-indigo-600 font-bold">{item.courseId}</td>
                            <td className="p-3 text-slate-500">{item.examType}</td>
                            <td className="p-3">
                              <span className="font-mono text-slate-700 dark:text-zinc-300 font-bold">{item.totalMarks} Marks</span>
                              <span className={`ml-2 text-[10px] font-bold ${item.status === "Pass" ? "text-emerald-500" : "text-rose-500"}`}>
                                ({item.grade})
                              </span>
                            </td>
                            <td className="p-3">
                              {item.isDraft ? (
                                <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] font-mono border border-amber-100 dark:border-amber-800/40">
                                  Draft Mode
                                </span>
                              ) : item.isPublished ? (
                                <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] font-mono border border-emerald-100 dark:border-emerald-800/40">
                                  Published Official
                                </span>
                              ) : (
                                <span className="bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] font-mono border border-slate-200 dark:border-zinc-800">
                                  Finalized (Hidden)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right flex justify-end gap-2">
                              {!item.isDraft && (
                                <button
                                  onClick={() => unlockExamMutation.mutate(item.id)}
                                  className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded font-semibold text-[10px] flex items-center gap-1 transition"
                                >
                                  <Unlock className="h-3 w-3" /> Unlock Marks
                                </button>
                              )}
                              <button
                                onClick={() => publishExamToggleMutation.mutate({ recordIds: [item.id], publish: !item.isPublished })}
                                className={`px-2 py-1 rounded font-semibold text-[10px] transition ${
                                  item.isPublished
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-900 dark:text-zinc-300"
                                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                                }`}
                              >
                                {item.isPublished ? "Hide Results" : "Publish"}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. TIMETABLE MODULE */}
            {activeModule === "timetable" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-6 shadow-sm">
                <div>
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Unified Course Timetable & Room Allocations</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">View current schedules, time-slots, and assigned seminar halls for classes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((course) => {
                    const instructor = faculty.find((f) => f.id === course.facultyId);
                    return (
                      <div key={course.id} className="rounded-xl border border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/50 p-4 flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{course.code}</span>
                            <span className="text-[10px] bg-white dark:bg-zinc-950 border border-slate-150 px-2 py-0.5 rounded-full font-bold">
                              {course.room || "Lab 102"}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 line-clamp-1">{course.name}</h4>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{course.description}</p>
                        </div>

                        <div className="border-t border-slate-200/50 dark:border-zinc-800/80 mt-4 pt-3 flex flex-col gap-1 text-[10px] text-slate-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-zinc-300">
                            <Clock className="h-3.5 w-3.5 text-indigo-500" /> {course.timeSlot || "MWF 11:00 - 12:30"}
                          </span>
                          <span className="flex items-center gap-1 font-mono mt-0.5">
                            <Users className="h-3.5 w-3.5 text-slate-400" /> {instructor ? instructor.fullName : "No Coordinator Map"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. LEAVE AUTHORIZATION MODULE */}
            {activeModule === "leave" && (
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Leave Approvals Inbox</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Review pending leave applications from students and faculty coordinators.</p>
                </div>

                {/* Pending Actions Feed */}
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm flex flex-col gap-4">
                  <span className="font-semibold text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">Awaiting Action</span>
                  <div className="flex flex-col gap-3">
                    {pendingLeaves.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">No pending leave applications. All caught up!</div>
                    ) : (
                      pendingLeaves.map((req: any) => (
                        <div key={req.id} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800/60 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-300 dark:hover:border-zinc-700 transition">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200">{req.studentName}</h5>
                              <span className="text-[9px] uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                                Scholar
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                              Requested Duration: {req.startDate} to {req.endDate}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1.5 italic">
                              "{req.reason}"
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateLeaveStatusMutation.mutate({ id: req.id, status: "Approved" })}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition"
                            >
                              <CheckCircle2 className="h-4 w-4" /> Approve
                            </button>
                            <button
                              onClick={() => updateLeaveStatusMutation.mutate({ id: req.id, status: "Rejected" })}
                              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition"
                            >
                              <XCircle className="h-4 w-4" /> Reject
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* History list */}
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm flex flex-col gap-4">
                  <span className="font-semibold text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-wider block">Historical Leaves Docket</span>
                  <div className="overflow-x-auto border rounded-xl border-slate-100 dark:border-zinc-900">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="p-3">Scholar Student</th>
                          <th className="p-3">Leave Timeline</th>
                          <th className="p-3">Justification</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                        {leaveRequests.filter(r => r.status !== "Pending").map((req: any) => (
                          <tr key={req.id}>
                            <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">{req.studentName}</td>
                            <td className="p-3 font-mono text-[10px] text-slate-500">{req.startDate} to {req.endDate}</td>
                            <td className="p-3 text-slate-500 truncate max-w-xs">{req.reason}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[9px] uppercase ${
                                req.status === "Approved" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" : "bg-red-50 text-red-600 dark:bg-red-950"
                              }`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 9. BULLETINS & ANNOUNCEMENTS MODULE */}
            {activeModule === "notices" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm">
                <div>
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Bulletins & Official Broadcasts Log</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans mt-0.5">View and inspect official institutional notices, exam schedules, and academic event calendars published across the campus.</p>
                </div>

                <div className="flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto pr-1">
                  {notices.map((notice: any) => (
                    <div key={notice.id} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                      <div className="flex justify-between items-center">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200">{notice.title}</h5>
                        <span className="text-[9px] font-mono bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase">
                          {notice.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{notice.content}</p>
                      <span className="text-[9px] font-mono text-slate-400 mt-3 block">{notice.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. ERP REPORTS DESK */}
            {activeModule === "reports" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Official ERP Reports Desk</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans mt-0.5">Configure report parameters and download official compliance logs as formatted spreadsheet files.</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedReport}
                      onChange={(e) => setSelectedReport(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300"
                    >
                      <option value="student-performance">Scholar Academic Performance</option>
                      <option value="faculty-workload">Faculty Workloads & Modules</option>
                      <option value="attendance-defaulters">Attendance Defaulter Registry</option>
                      <option value="department-analytics">Department Comparative Metrics</option>
                    </select>
                    <button
                      onClick={() => {
                        if (selectedReport === "student-performance") {
                          const headers = ["Student Name", "Course", "Exam Type", "Total Marks", "Grade", "Status"];
                          const rows = examMarks.map(e => [e.studentName, e.courseId, e.examType, e.totalMarks, e.grade, e.status]);
                          handleExportCSV("Student_Performance", headers, rows);
                        } else if (selectedReport === "faculty-workload") {
                          const headers = ["Faculty Member", "Department", "Assigned Subject", "Room Allocations"];
                          const rows = courses.map(c => {
                            const fac = faculty.find(f => f.id === c.facultyId);
                            return [fac ? fac.fullName : "Unassigned", c.department, c.name, c.room || "N/A"];
                          });
                          handleExportCSV("Faculty_Workloads", headers, rows);
                        } else if (selectedReport === "attendance-defaulters") {
                          const headers = ["Student Name", "Department", "Attendance Percentage"];
                          const rows = attendanceShortages.map(s => [s.fullName, s.department, s.attendancePct]);
                          handleExportCSV("Attendance_Defaulters", headers, rows);
                        } else {
                          const headers = ["Department", "Student Count", "Faculty Count", "Attendance Avg"];
                          const rows = deptMetrics.map(d => [d.name, d.studentsCount, d.facultyCount, d.attendanceAvg]);
                          handleExportCSV("Department_Analysis", headers, rows);
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Download className="h-4 w-4" /> Export Spreadsheet
                    </button>
                  </div>
                </div>

                {/* Formatted Preview Spreadsheet */}
                <div className="bg-slate-50 dark:bg-zinc-900 rounded-xl p-4 border border-slate-150">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block mb-2">Live Spreadsheet Preview</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs bg-white dark:bg-zinc-950 rounded border border-slate-100">
                      {selectedReport === "student-performance" && (
                        <>
                          <thead>
                            <tr className="bg-slate-100 dark:bg-zinc-900 text-slate-600 border-b font-mono">
                              <th className="p-2 border">Student Name</th>
                              <th className="p-2 border">Course Code</th>
                              <th className="p-2 border">Exam Category</th>
                              <th className="p-2 border font-mono">Total Marks</th>
                              <th className="p-2 border font-mono">GPA Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {examMarks.map((item: any) => (
                              <tr key={item.id} className="border-b font-mono text-[11px]">
                                <td className="p-2 border text-slate-800 dark:text-zinc-300 font-sans font-semibold">{item.studentName}</td>
                                <td className="p-2 border font-bold text-indigo-600">{item.courseId}</td>
                                <td className="p-2 border">{item.examType}</td>
                                <td className="p-2 border">{item.totalMarks}</td>
                                <td className="p-2 border font-bold">{item.grade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      )}

                      {selectedReport === "faculty-workload" && (
                        <>
                          <thead>
                            <tr className="bg-slate-100 dark:bg-zinc-900 text-slate-600 border-b font-mono">
                              <th className="p-2 border">Faculty Member</th>
                              <th className="p-2 border">Department</th>
                              <th className="p-2 border">Assigned Subject</th>
                              <th className="p-2 border">Timetable Room</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courses.map((course) => {
                              const instructor = faculty.find((f) => f.id === course.facultyId);
                              return (
                                <tr key={course.id} className="border-b font-mono text-[11px]">
                                  <td className="p-2 border text-slate-800 dark:text-zinc-300 font-sans font-semibold">{instructor ? instructor.fullName : "Unassigned"}</td>
                                  <td className="p-2 border">{course.department}</td>
                                  <td className="p-2 border text-indigo-500 font-sans">{course.name}</td>
                                  <td className="p-2 border">{course.room || "Room 101"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {selectedReport === "attendance-defaulters" && (
                        <>
                          <thead>
                            <tr className="bg-slate-100 dark:bg-zinc-900 text-slate-600 border-b font-mono">
                              <th className="p-2 border">Student Name</th>
                              <th className="p-2 border">Department</th>
                              <th className="p-2 border">Attendance Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceShortages.map((item) => (
                              <tr key={item.id} className="border-b font-mono text-[11px]">
                                <td className="p-2 border text-slate-800 dark:text-zinc-300 font-sans font-semibold">{item.fullName}</td>
                                <td className="p-2 border">{item.department}</td>
                                <td className="p-2 border text-red-500 font-bold">{item.attendancePct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      )}

                      {selectedReport === "department-analytics" && (
                        <>
                          <thead>
                            <tr className="bg-slate-100 dark:bg-zinc-900 text-slate-600 border-b font-mono">
                              <th className="p-2 border">Department name</th>
                              <th className="p-2 border">Students Register</th>
                              <th className="p-2 border">Faculty Registry</th>
                              <th className="p-2 border">Attendance average</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deptMetrics.map((item) => (
                              <tr key={item.name} className="border-b font-mono text-[11px]">
                                <td className="p-2 border text-slate-800 dark:text-zinc-300 font-sans font-semibold">{item.name}</td>
                                <td className="p-2 border">{item.studentsCount} scholars</td>
                                <td className="p-2 border">{item.facultyCount} instructors</td>
                                <td className="p-2 border font-bold text-emerald-500">{item.attendanceAvg}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 11. ADMINISTRATIVE SYSTEM AUDIT LOGS */}
            {activeModule === "audit" && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-5 shadow-sm">
                <div>
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Institutional Security Audit Trails</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Chronological history tracking security actions, grade adjustments, and authorization events.</p>
                </div>

                <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">No audit logs registered yet.</div>
                  ) : (
                    auditLogs.map((log: any) => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-lg flex items-start gap-4">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded mt-0.5">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[10px] text-slate-400">{log.timestamp}</span>
                            <span className="text-[9px] uppercase font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
                              {log.action}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 mt-1 leading-relaxed">
                            {log.details}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 mt-1 block">Executed by: {log.userEmail} ({log.userId})</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 12. SECURITY & PREFERENCES MODULE */}
            {activeModule === "settings" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile Edit Contact */}
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm">
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">ERP Profile Details</h3>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateProfileMutation.mutate({
                        phone: settingsPhone,
                        address: settingsAddress,
                        profilePic: settingsPic,
                      });
                    }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Phone Contact</label>
                      <input
                        type="text"
                        value={settingsPhone}
                        onChange={(e) => setSettingsPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={settingsAddress}
                        onChange={(e) => setSettingsAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Profile Picture URL</label>
                      <input
                        type="text"
                        value={settingsPic}
                        onChange={(e) => setSettingsPic(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      Save Profile
                    </button>
                  </form>
                </div>

                {/* Change Credentials & Theme Preferences */}
                <div className="flex flex-col gap-6">
                  {/* Security change credentials */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm">
                    <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Security credentials</h3>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        changePasswordMutation.mutate({
                          currentPassword,
                          newPassword,
                        });
                      }}
                      className="flex flex-col gap-4"
                      autoComplete="off"
                    >
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Current Password</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">New Security Password</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                      >
                        Update Credentials
                      </button>
                    </form>
                  </div>

                  {/* Themes and Logout */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm">
                    <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">System Workspace Preferences</h3>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200 block">Workspace dark theme</span>
                        <span className="text-[10px] text-slate-400">Toggle dark mode visual layout styles</span>
                      </div>
                      <button
                        onClick={() => dispatch(toggleTheme())}
                        className="p-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 transition"
                      >
                        {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        dispatch(logout());
                        toast.success("Successfully logged out from Principal Portal.");
                      }}
                      className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-sans text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow transition"
                    >
                      <LogOut className="h-4 w-4" /> End Portal Session
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
