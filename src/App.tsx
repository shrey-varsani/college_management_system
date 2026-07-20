import { useState, useEffect, useRef } from "react";
import { Provider, useSelector, useDispatch } from "react-redux";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import api from "./lib/api";
import { store, RootState, setAuth, logout, toggleSidebar, toggleTheme } from "./lib/store";

import {
  School,
  Lock,
  Mail,
  LayoutDashboard,
  Calendar,
  Award,
  Library,
  BookOpen,
  ArrowRight,
  Menu,
  Brain,
  KeyRound,
  Sun,
  Moon,
  ClipboardCheck,
  GraduationCap,
  User,
  FileText,
  Bell,
  Settings,
  FileSpreadsheet,
  Database
} from "lucide-react";

import Header from "./components/Header";
import CalendarView from "./components/CalendarView";
import GradeBook from "./components/GradeBook";
import CourseCatalog from "./components/CourseCatalog";
import LibraryManager from "./components/LibraryManager";
import PrincipalDashboard from "./components/PrincipalDashboard";
import AttendanceRegister from "./components/AttendanceRegister";
import ExamMarksEntry from "./components/ExamMarksEntry";
import FirebaseIntegration from "./components/FirebaseIntegration";
import {
  StudentDashboard,
  StudentProfile,
  StudentAttendance,
  StudentTimetable,
  StudentSubjects,
  StudentAssignments,
  StudentExamination,
  StudentLibrary,
  StudentNotices,
  StudentLeave,
  StudentNotifications,
  StudentCalendar,
  StudentSettings
} from "./components/StudentPortal";

import {
  FacultyDashboard,
  FacultyProfile,
  FacultyTimetable,
  FacultyAttendance,
  FacultyStudents,
  FacultyAssignments,
  FacultyExams,
  FacultySubjects,
  FacultyNotices,
  FacultyLeave,
  FacultyNotifications,
  FacultyReports,
  FacultySettings
} from "./components/FacultyPortal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainPortal() {
  const { user, sidebarOpen, theme } = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();

  // Real-time app notifications polling
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["app-notifications"],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get("/notifications");
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 3000, // Refresh every 3 seconds for instant real-time feel!
  });

  const seenNotificationIds = useRef<Set<string>>(new Set());
  const initialLoaded = useRef(false);

  useEffect(() => {
    if (!user) {
      seenNotificationIds.current.clear();
      initialLoaded.current = false;
      return;
    }

    if (notifications.length > 0) {
      if (!initialLoaded.current) {
        // Mark all pre-existing notifications as seen to avoid spamming them on login/mount
        notifications.forEach((n: any) => {
          seenNotificationIds.current.add(n.id);
        });
        initialLoaded.current = true;
      } else {
        // Check for new, incoming unread notifications of type 'exam'
        notifications.forEach((not: any) => {
          if (!seenNotificationIds.current.has(not.id)) {
            seenNotificationIds.current.add(not.id);

            if (not.type === "exam" && !not.isRead) {
              toast.custom((t) => (
                <div
                  className={`${
                    t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                  } max-w-md w-full bg-white dark:bg-zinc-900 shadow-xl rounded-xl pointer-events-auto flex border border-indigo-200 dark:border-indigo-950 p-4 gap-3 relative overflow-hidden transition-all duration-300`}
                >
                  <div className="absolute top-0 left-0 h-full w-1 bg-indigo-600"></div>
                  <div className="flex-1">
                    <p className="text-xs font-sans font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                      New Exam Results Update
                    </p>
                    <p className="mt-1.5 text-[11px] font-sans font-medium text-slate-700 dark:text-zinc-300 leading-relaxed">
                      {not.message}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setActiveTab("student-exams");
                          toast.dismiss(t.id);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold text-[10px] px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                      >
                        View Results Desk →
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-sans font-semibold text-[10px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ), {
                duration: Infinity,
                id: `exam-update-${not.id}`
              });
            }
          }
        });
      }
    }
  }, [notifications, user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (!user) return "login";
    if (user.role === "principal") return "dashboard";
    if (user.role === "librarian") return "library";
    if (user.role === "faculty") return "faculty-dashboard";
    return "student-dashboard";
  });

  useEffect(() => {
    if (user) {
      if (user.role === "principal") setActiveTab("dashboard");
      else if (user.role === "librarian") setActiveTab("library");
      else if (user.role === "faculty") setActiveTab("faculty-dashboard");
      else setActiveTab("student-dashboard");
    }
  }, [user]);

  // Determine tabs available to this role
  const getTabsForRole = () => {
    if (!user) return [];
    switch (user.role) {
      case "principal":
        return [
          { id: "dashboard", label: "Executive Office", icon: LayoutDashboard },
          { id: "exams", label: "Examination Marks", icon: GraduationCap },
          { id: "attendance", label: "Attendance Register", icon: ClipboardCheck },
          { id: "catalog", label: "Course Catalog", icon: BookOpen },
          { id: "calendar", label: "Institution Calendar", icon: Calendar },
          { id: "library", label: "Library Catalog", icon: Library },
          { id: "firebase", label: "Firebase Cloud Sync", icon: Database },
        ];
      case "faculty":
        return [
          { id: "faculty-dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "faculty-profile", label: "My Profile", icon: User },
          { id: "faculty-timetable", label: "My Timetable", icon: Calendar },
          { id: "faculty-attendance", label: "Attendance Control", icon: ClipboardCheck },
          { id: "faculty-students", label: "Student Roster", icon: GraduationCap },
          { id: "faculty-assignments", label: "Assignments & Grading", icon: FileText },
          { id: "faculty-exams", label: "Examination Desk", icon: Award },
          { id: "faculty-subjects", label: "Subject Materials", icon: BookOpen },
          { id: "faculty-notices", label: "Notices & Bulletins", icon: Bell },
          { id: "faculty-leave", label: "Leave Requests", icon: ClipboardCheck },
          { id: "faculty-notifications", label: "My Alerts", icon: Bell },
          { id: "faculty-reports", label: "Performance Reports", icon: FileSpreadsheet },
          { id: "faculty-settings", label: "Settings", icon: Settings },
        ];
      case "librarian":
        return [
          { id: "library", label: "Library Manager", icon: Library },
        ];
      default: // student
        return [
          { id: "student-dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "student-profile", label: "My Profile", icon: User },
          { id: "student-attendance", label: "My Attendance", icon: ClipboardCheck },
          { id: "student-timetable", label: "My Timetable", icon: Calendar },
          { id: "student-subjects", label: "Enrolled Subjects", icon: BookOpen },
          { id: "student-assignments", label: "My Assignments", icon: FileText },
          { id: "student-exams", label: "Examination Desk", icon: GraduationCap },
          { id: "student-library", label: "Library Catalog", icon: Library },
          { id: "student-notices", label: "Notices & Board", icon: Bell },
          { id: "student-leave", label: "Leave Requests", icon: ClipboardCheck },
          { id: "student-notifications", label: "My Alerts", icon: Bell },
          { id: "student-calendar", label: "Academic Calendar", icon: Calendar },
          { id: "student-settings", label: "Settings", icon: Settings },
        ];
    }
  };

  const tabs = getTabsForRole();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 768) {
      dispatch(toggleSidebar());
    }
  };

  // Rendering Active Component Tab
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <PrincipalDashboard />;
      case "catalog":
        return <CourseCatalog />;
      case "calendar":
        return <CalendarView />;
      case "library":
        return <LibraryManager />;
      case "grades":
        return <GradeBook />;
      case "exams":
        return <ExamMarksEntry />;
      case "attendance":
        return <AttendanceRegister />;
      case "firebase":
        return <FirebaseIntegration />;
      // Faculty Portal Modules
      case "faculty-dashboard":
        return <FacultyDashboard onTabChange={setActiveTab} />;
      case "faculty-profile":
        return <FacultyProfile />;
      case "faculty-timetable":
        return <FacultyTimetable />;
      case "faculty-attendance":
        return <FacultyAttendance />;
      case "faculty-students":
        return <FacultyStudents />;
      case "faculty-assignments":
        return <FacultyAssignments />;
      case "faculty-exams":
        return <FacultyExams />;
      case "faculty-subjects":
        return <FacultySubjects />;
      case "faculty-notices":
        return <FacultyNotices />;
      case "faculty-leave":
        return <FacultyLeave />;
      case "faculty-notifications":
        return <FacultyNotifications />;
      case "faculty-reports":
        return <FacultyReports />;
      case "faculty-settings":
        return <FacultySettings />;
      // Student Portal Modules
      case "student-dashboard":
        return <StudentDashboard onTabChange={setActiveTab} />;
      case "student-profile":
        return <StudentProfile />;
      case "student-attendance":
        return <StudentAttendance />;
      case "student-timetable":
        return <StudentTimetable />;
      case "student-subjects":
        return <StudentSubjects />;
      case "student-assignments":
        return <StudentAssignments />;
      case "student-exams":
        return <StudentExamination />;
      case "student-library":
        return <StudentLibrary />;
      case "student-notices":
        return <StudentNotices />;
      case "student-leave":
        return <StudentLeave />;
      case "student-notifications":
        return <StudentNotifications />;
      case "student-calendar":
        return <StudentCalendar />;
      case "student-settings":
        return <StudentSettings />;
      default:
        return (
          <div className="p-8 text-zinc-400 font-mono text-xs">
            Section loading... Choose a tab from the sidebar directory.
          </div>
        );
    }
  };

  // If NOT authenticated, show premium Slate Login Panel
  if (!user) {
    return <LoginPanel />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col transition-colors duration-200 ${theme === "dark" ? "dark" : ""}`}>
      {/* Dynamic Header */}
      <Header onTabChange={setActiveTab} activeTab={activeTab} />

      <div className="flex-1 flex relative">
        {/* Navigation side rail */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -240, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -240, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed md:static inset-y-16 left-0 z-30 w-60 border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 flex flex-col justify-between transition-colors duration-200"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-sans font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase px-3 py-2">
                  Academic Workspace
                </span>

                <nav className="flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full text-left rounded-lg px-3 py-2 flex items-center gap-2.5 font-sans text-xs font-semibold tracking-tight transition duration-100 ${
                          active
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{tab.label}</span>
                        {(tab.id === "student-notifications" || tab.id === "faculty-notifications") && unreadCount > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Institution Sign */}
              <div className="bg-slate-50 border border-slate-200 dark:bg-zinc-900/50 dark:border-zinc-900 rounded-lg p-3 text-[10px] text-slate-500 dark:text-zinc-500 font-mono leading-relaxed">
                <span className="font-semibold block text-slate-700 dark:text-zinc-400">Institutional Registry</span>
                <span>Active Term: Fall 2026</span>
                <span className="block">Status: Connected Relational DB</span>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Workspace panel */}
        <main className="flex-1 overflow-x-hidden min-h-full">
          {renderActiveTabContent()}
        </main>
      </div>
    </div>
  );
}

// Slate Login Panel component
function LoginPanel() {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.app.theme);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please supply your institutional email address");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      dispatch(setAuth({ user: res.data.user, token: res.data.token }));
      toast.success(`Welcome back, ${res.data.user.fullName}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid credentials. Try our selector below.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickCreds = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword("password");
    toast(`Copied ${quickEmail.split("@")[0]} credentials!`, { icon: "🔑" });
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center px-4 relative overflow-hidden transition-colors duration-200 ${theme === "dark" ? "dark" : ""}`}>
      {/* Floating Theme Toggle in Login Panel */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2.5 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-sm"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Deep Navy Theme"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500 animate-pulse" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>
      </div>

      {/* Decorative gradient blur background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col gap-6 z-10">
        {/* Branding header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-indigo-500">
            <School className="h-8 w-8" />
          </div>
          <h1 className="font-neon text-2xl tracking-wide text-slate-900 dark:text-white mt-1">
            College Management Portal
          </h1>
          <p className="text-slate-500 dark:text-zinc-500 text-xs">
            Provide your academic credentials to access your administrative suite.
          </p>
        </div>

        {/* Input box */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-xl dark:shadow-2xl">
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-sans tracking-wider font-bold text-slate-500 dark:text-zinc-500 block mb-1 uppercase">
                Academic Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <input
                  type="email"
                  placeholder="principal@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900/50 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-sans tracking-wider font-bold text-slate-500 dark:text-zinc-500 block mb-1 uppercase">
                Security Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900/50 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition mt-2 shadow-lg disabled:opacity-50"
            >
              <span>{loading ? "Verifying Credentials..." : "Access Suite Portal"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* DX/User-friendly auto-credential select drawer */}
        <div className="rounded-xl border border-slate-200 bg-slate-100/40 dark:border-zinc-900 dark:bg-zinc-900/10 p-4 flex flex-col gap-2">
          <span className="font-sans font-bold text-[10px] text-slate-600 dark:text-zinc-400 flex items-center gap-1 uppercase tracking-wide">
            <KeyRound className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            Quick Access Demo Accounts (Password: "password")
          </span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => handleSelectQuickCreds("principal@college.edu")}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/20 text-[10px] font-sans font-bold px-2 py-1.5 rounded hover:scale-102 transition"
            >
              Principal
            </button>
            <button
              onClick={() => handleSelectQuickCreds("student@college.edu")}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/20 text-[10px] font-sans font-bold px-2 py-1.5 rounded hover:scale-102 transition"
            >
              Student
            </button>
            <button
              onClick={() => handleSelectQuickCreds("faculty@college.edu")}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/20 text-[10px] font-sans font-bold px-2 py-1.5 rounded hover:scale-102 transition"
            >
              Faculty (Prof)
            </button>
            <button
              onClick={() => handleSelectQuickCreds("librarian@college.edu")}
              className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/20 text-[10px] font-sans font-bold px-2 py-1.5 rounded hover:scale-102 transition"
            >
              Librarian
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MainPortal />
        <Toaster position="top-right" toastOptions={{ style: { background: "#09090b", color: "#f4f4f5", border: "1px solid #27272a" } }} />
      </QueryClientProvider>
    </Provider>
  );
}
