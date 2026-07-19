import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { RootState, toggleTheme, logout } from "../lib/store";
import api from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, User, Calendar, ClipboardCheck, GraduationCap,
  FileText, Award, BookOpen, Bell, Settings, Search, Filter, Plus,
  Trash2, CheckCircle2, Download, Upload, ExternalLink, FileSpreadsheet,
  FileUp, Mail, Phone, MapPin, Lock, X, Sun, Moon, Info, ShieldAlert,
  CalendarDays, FileCheck, Check
} from "lucide-react";
import toast from "react-hot-toast";

// ==========================================
// UTILS & SHARED LOGIC
// ==========================================
const fileTypeColors: Record<string, string> = {
  Notes: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60",
  Syllabus: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60",
  "Question Paper": "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60",
  Resource: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
};

function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row => 
    Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
  );
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Spreadsheet export completed successfully!");
}

// Shared section header component
function ModuleHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: any }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5 mb-6">
      <div>
        <h2 className="flex items-center gap-2.5 font-sans text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          <Icon className="h-5.5 w-5.5 text-indigo-600 dark:text-indigo-400" />
          <span>{title}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// ==========================================
// 1. FACULTY DASHBOARD
// ==========================================
export function FacultyDashboard({ onTabChange }: { onTabChange: (tabId: string) => void }) {
  const { user } = useSelector((state: RootState) => state.app);
  
  // Queries
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["students-roster"],
    queryFn: async () => (await api.get("/users")).data
  });
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: ["all-submissions"],
    queryFn: async () => (await api.get("/assignments/submissions")).data
  });
  const { data: examMarks = [] } = useQuery<any[]>({
    queryKey: ["exam-marks"],
    queryFn: async () => (await api.get("/exam-marks")).data
  });
  const { data: notices = [] } = useQuery<any[]>({
    queryKey: ["notices"],
    queryFn: async () => (await api.get("/notices")).data
  });

  const facultyCourses = courses.filter(c => c.facultyId === user?.id);
  const pendingEvals = submissions.filter(s => s.status === "Submitted").length;
  const draftMarksCount = examMarks.filter(m => m.isDraft).length;

  // Derive today's classes
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = weekdays[new Date().getDay()];
  const todayClasses = facultyCourses.filter(c => c.timeSlot && c.timeSlot.includes(todayName));

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-zinc-950 dark:via-indigo-950 dark:to-zinc-950 text-white rounded-2xl p-6 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none">
          <Award className="h-48 w-48 text-indigo-400" />
        </div>
        <div className="z-10 relative">
          <span className="font-mono text-[10px] tracking-wider text-indigo-300 uppercase font-semibold bg-indigo-500/10 border border-indigo-400/20 px-2 py-0.5 rounded">
            Academic Suite Panel
          </span>
          <h1 className="text-2xl font-bold font-sans tracking-tight mt-2">
            Welcome back, {user?.fullName || "Professor"}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Manage your assigned courses, audit lecture timetables, grade submitted assignments, and report examination scores.
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-indigo-400" /> {user?.department || "General Academics"}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-indigo-400" /> {user?.phone || "No contact info"}</span>
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-indigo-400" /> {user?.email}</span>
          </div>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", val: students.length, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/5", icon: GraduationCap },
          { label: "Subjects Assigned", val: facultyCourses.length, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5", icon: BookOpen },
          { label: "Lectures Today", val: todayClasses.length, color: "text-amber-600 dark:text-amber-400 bg-amber-500/5", icon: CalendarDays },
          { label: "Pending Evaluations", val: pendingEvals + draftMarksCount, color: "text-rose-600 dark:text-rose-400 bg-rose-500/5", icon: FileCheck }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-sans font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">{stat.label}</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 font-mono block">{stat.val}</span>
            </div>
            <div className={`p-3 rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lectures Schedule Today */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm">
            <h3 className="font-sans font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              Assigned Timetable ({todayName})
            </h3>
            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-zinc-500 text-xs border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
                No active lectures scheduled for today.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {todayClasses.map((cls, idx) => (
                  <div key={idx} className="flex justify-between items-center border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 p-3.5 rounded-lg">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{cls.code}</span>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1">{cls.name}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Classroom: {cls.room || "Lab TBD"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 font-mono">{cls.timeSlot?.split(" ").slice(1).join(" ")}</span>
                      <button 
                        onClick={() => onTabChange("faculty-attendance")}
                        className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 ml-auto"
                      >
                        Launch Attendance &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Tasks List */}
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm">
            <h3 className="font-sans font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-indigo-500" />
              Direct Task Allocations
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-zinc-900 rounded-lg bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded mt-0.5"><ClipboardCheck className="h-4 w-4" /></div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Daily Student Attendance logs</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Record attendance checklist for today's assignments.</p>
                  </div>
                </div>
                <button onClick={() => onTabChange("faculty-attendance")} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition">Record</button>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-zinc-900 rounded-lg bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded mt-0.5"><FileText className="h-4 w-4" /></div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Assignment Evaluations</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">{pendingEvals} student submissions are waiting for reviews and grades.</p>
                  </div>
                </div>
                <button onClick={() => onTabChange("faculty-assignments")} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition">Evaluate</button>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-zinc-900 rounded-lg bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded mt-0.5"><Award className="h-4 w-4" /></div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Final Exams Mark Sheet entries</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">{draftMarksCount} marks sheets are saved as draft. Ready to submit?</p>
                  </div>
                </div>
                <button onClick={() => onTabChange("faculty-exams")} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition">Access</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notices & Announcements Board */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm">
            <h3 className="font-sans font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-500" />
              Notices & Board
            </h3>
            <div className="flex flex-col gap-4">
              {notices.slice(0, 4).map((notice, i) => (
                <div key={i} className="border-b border-slate-100 dark:border-zinc-900 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-zinc-500 font-mono mb-1">
                    <span className="font-bold uppercase tracking-wider text-indigo-500">{notice.category}</span>
                    <span>{notice.date}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 leading-tight">{notice.title}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">{notice.content}</p>
                </div>
              ))}
              <button 
                onClick={() => onTabChange("faculty-notices")}
                className="w-full bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-zinc-900 hover:dark:text-white text-slate-500 dark:text-zinc-400 text-center text-[10px] font-sans font-semibold py-2 rounded border border-slate-200 dark:border-zinc-800/80 transition"
              >
                Access Notice Desk
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. FACULTY PROFILE
// ==========================================
export function FacultyProfile() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [profilePic, setProfilePic] = useState(user?.profilePic || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const facultyCourses = courses.filter(c => c.facultyId === user?.id);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.put("/profile/details", { phone, address, profilePic });
      localStorage.setItem("college_user", JSON.stringify(res.data.user));
      toast.success("Profile details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to edit details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Academic Professional Profile" subtitle="Verify personal data, view assignments, and edit contact properties." icon={User} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card Left */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 flex flex-col items-center text-center shadow-sm">
          <div className="relative">
            <img 
              src={profilePic || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"} 
              alt="Faculty Avatar" 
              className="h-28 w-28 rounded-full object-cover border-4 border-indigo-600/10 p-1"
            />
          </div>
          <h3 className="font-sans font-bold text-slate-800 dark:text-white mt-4 text-base">{user?.fullName}</h3>
          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded mt-1 font-bold uppercase">{user?.role}</span>
          
          <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-zinc-900 flex flex-col gap-3 text-left text-xs">
            <div className="flex justify-between"><span className="text-slate-400">Department</span><span className="font-semibold text-slate-700 dark:text-zinc-300">{user?.department}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Registration Date</span><span className="font-semibold text-slate-700 dark:text-zinc-300 font-mono">{user?.registrationDate}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Unique Code</span><span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">{user?.id}</span></div>
          </div>
        </div>

        {/* Profile Edit / Assigned Classes Right */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Edit Profile details</h3>
            <form onSubmit={handleUpdateDetails} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500" required />
                </div>
                <div>
                  <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Profile Photo Link</label>
                  <input type="text" value={profilePic} onChange={e => setProfilePic(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Residential Address</label>
                <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500" required />
              </div>
              <button type="submit" disabled={isSubmitting} className="self-start bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded transition shadow-md">
                {isSubmitting ? "Updating..." : "Save Profile details"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Assigned subjects & Classes</h3>
            {facultyCourses.length === 0 ? (
              <p className="text-xs text-slate-400">No subjects currently assigned to you.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {facultyCourses.map((c, i) => (
                  <div key={i} className="border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg p-3.5">
                    <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{c.code}</span>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1">{c.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Credits: {c.credits} Credits • {c.timeSlot || "Schedule pending"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. TIMETABLE
// ==========================================
export function FacultyTimetable() {
  const { user } = useSelector((state: RootState) => state.app);
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const facultyCourses = courses.filter(c => c.facultyId === user?.id);

  return (
    <div className="p-6">
      <ModuleHeader title="Faculty Timetable Schedule" subtitle="Weekly lecture timetables, classroom mappings, and slot planning." icon={Calendar} />
      
      <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-zinc-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Day</th>
              <th className="py-3 px-4">Subject & Class Code</th>
              <th className="py-3 px-4">Allocated Time Slot</th>
              <th className="py-3 px-4">Room No</th>
              <th className="py-3 px-4">Credits</th>
            </tr>
          </thead>
          <tbody>
            {weekdays.map((day, dIdx) => {
              const dayLectures = facultyCourses.filter(c => c.timeSlot && c.timeSlot.includes(day));
              if (dayLectures.length === 0) {
                return (
                  <tr key={dIdx} className="border-b border-slate-100 dark:border-zinc-900/50 last:border-0 hover:bg-slate-50/40 dark:hover:bg-zinc-900/10">
                    <td className="py-4 px-4 font-semibold text-slate-700 dark:text-zinc-300">{day}</td>
                    <td colSpan={4} className="py-4 px-4 text-slate-400 dark:text-zinc-500 italic">No classes scheduled on this day.</td>
                  </tr>
                );
              }
              return dayLectures.map((lec, lIdx) => (
                <tr key={`${dIdx}-${lIdx}`} className="border-b border-slate-100 dark:border-zinc-900/50 last:border-0 hover:bg-slate-50/40 dark:hover:bg-zinc-900/10">
                  {lIdx === 0 ? (
                    <td rowSpan={dayLectures.length} className="py-4 px-4 font-bold text-slate-800 dark:text-zinc-200 border-r border-slate-100 dark:border-zinc-900/50 align-top">{day}</td>
                  ) : null}
                  <td className="py-4 px-4">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{lec.code}</span>
                    <span className="ml-2 font-medium text-slate-800 dark:text-zinc-200">{lec.name}</span>
                  </td>
                  <td className="py-4 px-4 font-mono font-semibold text-slate-700 dark:text-zinc-300">{lec.timeSlot?.split(" ").slice(1).join(" ")}</td>
                  <td className="py-4 px-4 font-mono text-slate-600 dark:text-zinc-400">{lec.room || "Room TBD"}</td>
                  <td className="py-4 px-4 text-slate-500 font-bold">{lec.credits} CR</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 4. ATTENDANCE CONTROL
// ==========================================
export function FacultyAttendance() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, "Present" | "Absent" | "Late">>({});

  // Fetch queries
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["enrollments"],
    queryFn: async () => (await api.get("/enrollments")).data
  });
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["all-users-faculty"],
    queryFn: async () => (await api.get("/users")).data,
    enabled: !!selectedCourseId
  });
  const { data: attendanceLogs = [] } = useQuery<any[]>({
    queryKey: ["attendance-logs"],
    queryFn: async () => (await api.get("/attendance")).data
  });

  const facultyCourses = courses.filter(c => c.facultyId === user?.id);
  const activeCourseEnrollments = enrollments.filter(e => e.courseId === selectedCourseId && e.status === "active");

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => await api.post("/attendance", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-logs"] });
      toast.success("Attendance ledger updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit attendance logs.");
    }
  });

  const handleStatusChange = (studentId: string, status: "Present" | "Absent" | "Late") => {
    setAttendanceStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const handleBulkMark = (status: "Present" | "Absent" | "Late") => {
    const updated: Record<string, "Present" | "Absent" | "Late"> = {};
    activeCourseEnrollments.forEach(en => {
      updated[en.studentId] = status;
    });
    setAttendanceStatuses(updated);
  };

  const handleSubmitAttendance = () => {
    if (!selectedCourseId) {
      toast.error("Please select a subject first.");
      return;
    }
    const missing = activeCourseEnrollments.filter(en => !attendanceStatuses[en.studentId]);
    if (missing.length > 0) {
      toast.error(`Please mark attendance for all ${missing.length} remaining students.`);
      return;
    }

    // Submit each student
    activeCourseEnrollments.forEach(en => {
      const studentObj = allUsers.find(u => u.id === en.studentId);
      const studentName = studentObj ? studentObj.fullName : "Scholar ID " + en.studentId;
      const status = attendanceStatuses[en.studentId];

      saveMutation.mutate({
        studentName,
        enrollmentNo: en.studentId,
        courseId: selectedCourseId,
        date: selectedDate,
        status,
        remarks
      });
    });
  };

  // Generate Reports CSV Export
  const handleExportAttendanceReport = () => {
    const report = attendanceLogs.filter(log => log.courseId === selectedCourseId).map(log => ({
      Date: log.date,
      "Enrollment ID": log.enrollmentNo,
      "Student Name": log.studentName,
      Status: log.status,
      Remarks: log.remarks || ""
    }));
    exportToCSV(report, `attendance_report_${selectedCourseId}`);
  };

  // Calculate Shortage List (< 75% attendance)
  const calculateShortage = () => {
    if (!selectedCourseId) return [];
    const courseLogs = attendanceLogs.filter(log => log.courseId === selectedCourseId);
    const summary: Record<string, { present: number, total: number, name: string }> = {};

    courseLogs.forEach(log => {
      if (!summary[log.enrollmentNo]) {
        summary[log.enrollmentNo] = { present: 0, total: 0, name: log.studentName };
      }
      summary[log.enrollmentNo].total++;
      if (log.status === "Present" || log.status === "Late") summary[log.enrollmentNo].present++;
    });

    return Object.entries(summary).map(([enrollNo, val]) => {
      const rate = val.total > 0 ? (val.present / val.total) * 100 : 0;
      return { enrollNo, name: val.name, present: val.present, total: val.total, rate };
    }).filter(s => s.rate < 75);
  };

  const shortageList = calculateShortage();

  return (
    <div className="p-6">
      <ModuleHeader title="Daily Student Attendance Register" subtitle="Audit subject registers, generate spreadsheets, and track shortage lists." icon={ClipboardCheck} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Sidebar Left */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-5 shadow-sm">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Class Configuration</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Select Subject</label>
                <select value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setAttendanceStatuses({}); }} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none">
                  <option value="">-- Choose Assigned Subject --</option>
                  {facultyCourses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Register Date</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Operational Remarks</label>
                <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Regular Lecture" className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" />
              </div>

              {selectedCourseId && activeCourseEnrollments.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-900/80 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulk Actions</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleBulkMark("Present")} className="bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-600 text-[10px] py-1.5 rounded transition font-semibold">All Present</button>
                    <button onClick={() => handleBulkMark("Absent")} className="bg-rose-500/15 hover:bg-rose-500/20 text-rose-600 text-[10px] py-1.5 rounded transition font-semibold">All Absent</button>
                    <button onClick={() => handleBulkMark("Late")} className="bg-amber-500/15 hover:bg-amber-500/20 text-amber-600 text-[10px] py-1.5 rounded transition font-semibold">All Late</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedCourseId && (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-5 shadow-sm">
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                Attendance Shortage Desk
              </h3>
              {shortageList.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No scholars found with attendance shortage (&lt;75%).</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="text-[9px] font-mono text-rose-600 bg-rose-500/5 border border-rose-500/10 rounded p-1.5 block leading-relaxed">The following scholars fall below the 75% minimum threshold constraint.</span>
                  {shortageList.map((short, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 border border-slate-100 dark:border-zinc-900 rounded bg-slate-50/50 dark:bg-zinc-900/20">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200 block">{short.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono block">{short.enrollNo}</span>
                      </div>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{short.rate.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attendance Listing Right */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
          {!selectedCourseId ? (
            <div className="text-center py-24 text-slate-400 italic border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg flex flex-col items-center gap-2">
              <Info className="h-8 w-8 text-slate-300 dark:text-zinc-700" />
              Configure subject parameters in the left control panel to launch attendance register.
            </div>
          ) : activeCourseEnrollments.length === 0 ? (
            <div className="text-center py-24 text-slate-400 italic">No student enrollments found in this course.</div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-zinc-900">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Class Scholar Checklist</h4>
                <button 
                  onClick={handleExportAttendanceReport}
                  className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold text-[10px] px-2.5 py-1.5 rounded transition"
                >
                  <Download className="h-3.5 w-3.5" /> Export History Excel
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {activeCourseEnrollments.map((en, i) => {
                  const s = allUsers.find(u => u.id === en.studentId);
                  const currentStatus = attendanceStatuses[en.studentId];

                  return (
                    <div key={i} className="flex justify-between items-center p-3.5 border border-slate-100 dark:border-zinc-900 rounded-lg bg-slate-50/40 dark:bg-zinc-900/10">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{s ? s.fullName : "Unknown Scholar"}</h4>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{en.studentId} • {s?.email || "No email"}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        {(["Present", "Absent", "Late"] as const).map(status => {
                          const active = currentStatus === status;
                          const colorClasses = {
                            Present: active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                            Absent: active ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                            Late: active ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          };

                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(en.studentId, status)}
                              className={`text-[10px] px-3 py-1.5 rounded transition font-semibold ${colorClasses[status]}`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={handleSubmitAttendance} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2.5 rounded shadow-lg transition mt-4"
              >
                Submit Attendance Logs
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. STUDENT ROSTER
// ==========================================
export function FacultyStudents() {
  const { user } = useSelector((state: RootState) => state.app);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Queries
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["students-roster"],
    queryFn: async () => (await api.get("/users")).data
  });

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <ModuleHeader title="Assigned Student Roster" subtitle="Audit list of registered scholars enrolled inside your assigned courses." icon={GraduationCap} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scholar list block */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search scholar by name, registry ID, or email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent w-full focus:outline-none text-xs text-slate-800 dark:text-zinc-200"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 shadow-sm overflow-hidden">
            {filteredStudents.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No matching students found.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-zinc-900/20">
                    <th className="py-3 px-4">Scholar Name</th>
                    <th className="py-3 px-4">ID & Registration</th>
                    <th className="py-3 px-4">Branch & Semester</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((stud, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/40 dark:hover:bg-zinc-900/10">
                      <td className="py-4 px-4 font-semibold text-slate-800 dark:text-zinc-200">{stud.fullName}</td>
                      <td className="py-4 px-4 font-mono">{stud.id}</td>
                      <td className="py-4 px-4">{stud.branch} • {stud.semester}</td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => setSelectedStudent(stud)}
                          className="bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-[10px] font-semibold px-3 py-1 rounded transition text-indigo-600 dark:text-indigo-400"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Academic detail block read-only */}
        <div className="lg:col-span-1">
          {selectedStudent ? (
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col items-center">
              <img src={selectedStudent.profilePic || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"} alt="Student Avatar" className="h-20 w-20 rounded-full border border-slate-200 p-0.5 object-cover" />
              <h3 className="font-bold text-slate-800 dark:text-white mt-3 text-sm">{selectedStudent.fullName}</h3>
              <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase mt-0.5">{selectedStudent.id}</span>
              
              <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-zinc-900/80 flex flex-col gap-3.5 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex justify-between"><span>Academic Email</span><span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">{selectedStudent.email}</span></div>
                <div className="flex justify-between"><span>Branch / Dept</span><span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedStudent.branch}</span></div>
                <div className="flex justify-between"><span>Active Semester</span><span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">{selectedStudent.semester}</span></div>
                <div className="flex justify-between"><span>Assigned Section</span><span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">{selectedStudent.section}</span></div>
                <div className="flex justify-between"><span>Campus Address</span><span className="font-semibold text-slate-800 dark:text-zinc-200 truncate max-w-[150px]">{selectedStudent.address || "Hostel Block B"}</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-6 shadow-sm text-center py-20 text-slate-400 italic">
              Select a scholar profile to review full academic credentials.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. ASSIGNMENTS & GRADING
// ==========================================
export function FacultyAssignments() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"create" | "grade">("create");

  // Create Assignment state
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [fileUrl, setFileUrl] = useState("");

  // Grade state
  const [evaluatingSub, setEvaluatingSub] = useState<any | null>(null);
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState("");

  // Queries
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ["assignments"],
    queryFn: async () => (await api.get("/assignments")).data
  });
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: ["all-submissions"],
    queryFn: async () => (await api.get("/assignments/submissions")).data
  });

  const facultyCourses = courses.filter(c => c.facultyId === user?.id);
  const filteredAssignments = assignments.filter(a => facultyCourses.some(c => c.id === a.courseId));

  const createMutation = useMutation({
    mutationFn: async (payload: any) => await api.post("/assignments", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment created & notified successfully!");
      setTitle("");
      setDescription("");
      setDueDate("");
    }
  });

  const gradeMutation = useMutation({
    mutationFn: async (payload: any) => await api.post("/assignments/grade", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-submissions"] });
      toast.success("Submission evaluations completed successfully!");
      setEvaluatingSub(null);
      setFeedback("");
    }
  });

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error("Please select a subject first.");
      return;
    }
    createMutation.mutate({ courseId: selectedCourseId, title, description, dueDate, maxMarks, fileUrl });
  };

  const handleGradeSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSub) return;
    gradeMutation.mutate({ submissionId: evaluatingSub.id, score, feedback });
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Assignments & Submission Grading" subtitle="Create class assignments, view submissions, and record scholar feedback." icon={FileText} />
      
      <div className="flex gap-2.5 mb-6">
        <button 
          onClick={() => setActiveSubTab("create")}
          className={`px-4 py-2 font-semibold rounded text-xs transition duration-150 ${activeSubTab === "create" ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50"}`}
        >
          Create Assignment Task
        </button>
        <button 
          onClick={() => setActiveSubTab("grade")}
          className={`px-4 py-2 font-semibold rounded text-xs transition duration-150 ${activeSubTab === "grade" ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50"}`}
        >
          Grade Student Submissions
        </button>
      </div>

      {activeSubTab === "create" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Assignment Form */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-5 shadow-sm">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Create New Task</h3>
            <form onSubmit={handleCreateAssignment} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Target Course</label>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required>
                  <option value="">-- Choose Subject --</option>
                  {facultyCourses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Assignment Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lab Session 1" className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Task Description</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide assignment description..." className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Max Score</label>
                  <input type="number" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Submission Deadline</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Attachment Link (Optional)</label>
                <input type="text" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 rounded transition shadow-md">
                Publish Assignment Task
              </button>
            </form>
          </div>

          {/* Active Assignments Listing Right */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Published Assignments</h3>
            {filteredAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No published assignments found.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredAssignments.map((asm, idx) => (
                  <div key={idx} className="p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded">{asm.courseCode || "Subject"}</span>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1">{asm.title}</h4>
                      </div>
                      <span className="text-[10px] font-semibold font-mono text-slate-400">Due: {asm.dueDate?.split("T")[0]}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{asm.description}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-zinc-900/80 text-[10px] text-slate-400">
                      <span>Max marks: {asm.maxMarks} PTS</span>
                      {asm.fileUrl && <a href={asm.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">Reference material &rarr;</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions checklist left */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Pending evaluations roster</h3>
            {submissions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No student assignment submissions logged yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {submissions.map((sub, idx) => (
                  <div key={idx} className="p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded">{sub.courseCode} • {sub.assignmentTitle}</span>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1">{sub.studentName}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 font-mono">Submitted: {sub.submittedAt?.split("T")[0]} • Attachment: {sub.fileName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="bg-slate-100 dark:bg-zinc-900 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-850 transition" title="Download submission attachment"><Upload className="h-4 w-4 text-slate-500" /></a>
                      
                      {sub.status === "Graded" ? (
                        <div className="text-right pr-2">
                          <span className="text-xs font-mono font-bold text-emerald-600">{sub.score} / {sub.maxMarks}</span>
                          <span className="text-[9px] block text-slate-400 font-sans">Graded</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEvaluatingSub(sub); setScore(sub.maxMarks || 100); }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] px-3 py-1.5 rounded transition shadow-sm"
                        >
                          Grade Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submissions evaluate right */}
          <div className="lg:col-span-1">
            {evaluatingSub ? (
              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Grade submission</h3>
                <div className="mb-4 bg-slate-50 dark:bg-zinc-900/50 p-3 rounded">
                  <span className="text-[9px] text-slate-400 block font-mono">TASK / ASSIGNMENT</span>
                  <span className="text-xs font-semibold block text-slate-700 dark:text-zinc-300">{evaluatingSub.assignmentTitle}</span>
                  <span className="text-[9px] text-slate-400 block font-mono mt-1">SCHOLAR</span>
                  <span className="text-xs font-semibold block text-slate-700 dark:text-zinc-300">{evaluatingSub.studentName}</span>
                </div>

                <form onSubmit={handleGradeSubmission} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Score (out of {evaluatingSub.maxMarks || 100})</label>
                    <input type="number" max={evaluatingSub.maxMarks || 100} value={score} onChange={e => setScore(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Evaluation feedback</label>
                    <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Provide assignment evaluation reviews..." className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold py-2 rounded transition shadow-md">
                    Submit Evaluation Score
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-6 shadow-sm text-center py-24 text-slate-400 italic">
                Select a student submission to evaluate score.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. EXAMINATION MANAGEMENT
// ==========================================
export function FacultyExams() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();

  // Selected filters
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [examType, setExamType] = useState("Mid Term");
  const [academicYear, setAcademicYear] = useState("2026");
  const [semester, setSemester] = useState("5th Semester");
  const [section, setSection] = useState("A");

  // Dynamic scores input list
  const [marksEntries, setMarksEntries] = useState<Record<string, { theory: number, practical: number, internal: number, assignment: number, viva: number }>>({});

  // Queries
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["enrollments"],
    queryFn: async () => (await api.get("/enrollments")).data
  });
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["all-users-faculty"],
    queryFn: async () => (await api.get("/users")).data,
    enabled: !!selectedCourseId
  });
  const { data: examMarks = [] } = useQuery<any[]>({
    queryKey: ["exam-marks"],
    queryFn: async () => (await api.get("/exam-marks")).data
  });

  const facultyCourses = courses.filter(c => c.facultyId === user?.id);
  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const activeCourseEnrollments = enrollments.filter(e => e.courseId === selectedCourseId && e.status === "active");

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => await api.post("/exam-marks", payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["exam-marks"] });
      toast.success(data.data.message || "Examination marks checklist updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit exam marks.");
    }
  });

  // Handle local cell updates
  const handleScoreCellChange = (studentId: string, field: "theory" | "practical" | "internal" | "assignment" | "viva", val: number) => {
    setMarksEntries(prev => {
      const current = prev[studentId] || { theory: 0, practical: 0, internal: 0, assignment: 0, viva: 0 };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: val
        }
      };
    });
  };

  // Populate form with existing draft marks if available
  const handleLoadExistingScores = () => {
    const prefilled: typeof marksEntries = {};
    activeCourseEnrollments.forEach(en => {
      const match = examMarks.find(m => m.studentId === en.studentId && m.courseId === selectedCourseId && m.examType === examType);
      if (match) {
        prefilled[en.studentId] = {
          theory: match.theoryMarks,
          practical: match.practicalMarks,
          internal: match.internalMarks,
          assignment: match.assignmentMarks,
          viva: match.vivaMarks
        };
      } else {
        prefilled[en.studentId] = { theory: 0, practical: 0, internal: 0, assignment: 0, viva: 0 };
      }
    });
    setMarksEntries(prefilled);
    toast.success("Loaded current marks templates from databases!");
  };

  // Save drafts vs Final submission
  const handleSaveMarks = (isDraft: boolean) => {
    if (!selectedCourseId) {
      toast.error("Please configure the subject parameter first.");
      return;
    }
    const entriesPayload = activeCourseEnrollments.map(en => {
      const userObj = allUsers.find(u => u.id === en.studentId);
      const studentName = userObj ? userObj.fullName : "Scholar " + en.studentId;
      const scores = marksEntries[en.studentId] || { theory: 0, practical: 0, internal: 0, assignment: 0, viva: 0 };

      return {
        studentId: en.studentId,
        studentName,
        academicYear,
        examType,
        department: currentCourse?.department || "Computer Science",
        branch: currentCourse?.department || "Computer Science",
        semester,
        section,
        courseId: selectedCourseId,
        theoryMarks: scores.theory,
        practicalMarks: scores.practical,
        internalMarks: scores.internal,
        assignmentMarks: scores.assignment,
        vivaMarks: scores.viva,
        isDraft
      };
    });

    submitMutation.mutate(entriesPayload);
  };

  // Export spreadsheet checklist
  const handleExportSpreadsheet = () => {
    if (!selectedCourseId) return;
    const records = activeCourseEnrollments.map(en => {
      const userObj = allUsers.find(u => u.id === en.studentId);
      const scores = marksEntries[en.studentId] || { theory: 0, practical: 0, internal: 0, assignment: 0, viva: 0 };
      return {
        "Enrollment ID": en.studentId,
        "Scholar Name": userObj?.fullName || "Scholar",
        "Theory Marks": scores.theory,
        "Practical Marks": scores.practical,
        "Internal Marks": scores.internal,
        "Assignment Marks": scores.assignment,
        "Viva Marks": scores.viva
      };
    });
    exportToCSV(records, `markssheet_${selectedCourseId}_${examType}`);
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Examination Marks Registry Desk" subtitle="Enter internal, practical, viva, or theory marks, and save draft or finalized records." icon={Award} />
      
      <div className="grid grid-cols-1 gap-6">
        {/* Controls Header Card */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-5 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Assigned Subject</label>
            <select value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setMarksEntries({}); }} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none">
              <option value="">-- Choose Subject --</option>
              {facultyCourses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none">
              <option value="Internal">Internal (CA)</option>
              <option value="Mid Term">Mid Term Exam</option>
              <option value="Practical">Practical Examination</option>
              <option value="Viva">Viva / Oral Desk</option>
              <option value="End Semester">End Semester Theory</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Academic Year</label>
            <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none font-mono" />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Target Semester</label>
            <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none">
              <option value="1st Semester">1st Sem</option>
              <option value="3rd Semester">3rd Sem</option>
              <option value="5th Semester">5th Sem</option>
              <option value="7th Semester">7th Sem</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">Class Section</label>
            <select value={section} onChange={e => setSection(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-2.5 py-1.5 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none font-mono">
              <option value="A">Sec A</option>
              <option value="B">Sec B</option>
              <option value="C">Sec C</option>
            </select>
          </div>
        </div>

        {/* Dynamic Sheet Editor */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm flex flex-col gap-4">
          {!selectedCourseId ? (
            <div className="text-center py-20 text-slate-400 italic">Configure subject parameters above to launch active marks template cells.</div>
          ) : activeCourseEnrollments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No active student enrollments found in this course.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-zinc-900/80 pb-4">
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider block">Registry Marks Entry Spreadsheet Cells</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleLoadExistingScores} className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-[10px] px-3 py-1.5 rounded transition">Load Current / Prefill Drafts</button>
                  <button onClick={handleExportSpreadsheet} className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-[10px] px-3 py-1.5 rounded transition flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Download Sheet Excel</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-zinc-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Scholar Name</th>
                      <th className="py-3 px-3">Registry ID</th>
                      <th className="py-3 px-3 text-center">Theory (0-100)</th>
                      <th className="py-3 px-3 text-center">Practical (0-50)</th>
                      <th className="py-3 px-3 text-center">Internal (0-30)</th>
                      <th className="py-3 px-3 text-center">Assignment (0-20)</th>
                      <th className="py-3 px-3 text-center">Viva / Oral (0-10)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCourseEnrollments.map((en, i) => {
                      const studentObj = allUsers.find(u => u.id === en.studentId);
                      const scores = marksEntries[en.studentId] || { theory: 0, practical: 0, internal: 0, assignment: 0, viva: 0 };
                      const match = examMarks.find(m => m.studentId === en.studentId && m.courseId === selectedCourseId && m.examType === examType);
                      const finalized = match && !match.isDraft;

                      return (
                        <tr key={i} className="border-b border-slate-100 dark:border-zinc-900/60 last:border-0 hover:bg-slate-50/40 dark:hover:bg-zinc-900/10">
                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-zinc-200">{studentObj ? studentObj.fullName : "Unknown"}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{en.studentId}</td>
                          <td className="py-3 px-3">
                            <input type="number" min={0} max={100} value={scores.theory} disabled={finalized} onChange={e => handleScoreCellChange(en.studentId, "theory", Number(e.target.value))} className="w-16 mx-auto block bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-center py-1 rounded focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50" />
                          </td>
                          <td className="py-3 px-3">
                            <input type="number" min={0} max={50} value={scores.practical} disabled={finalized} onChange={e => handleScoreCellChange(en.studentId, "practical", Number(e.target.value))} className="w-16 mx-auto block bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-center py-1 rounded focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50" />
                          </td>
                          <td className="py-3 px-3">
                            <input type="number" min={0} max={30} value={scores.internal} disabled={finalized} onChange={e => handleScoreCellChange(en.studentId, "internal", Number(e.target.value))} className="w-16 mx-auto block bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-center py-1 rounded focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50" />
                          </td>
                          <td className="py-3 px-3">
                            <input type="number" min={0} max={20} value={scores.assignment} disabled={finalized} onChange={e => handleScoreCellChange(en.studentId, "assignment", Number(e.target.value))} className="w-16 mx-auto block bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-center py-1 rounded focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50" />
                          </td>
                          <td className="py-3 px-3">
                            <input type="number" min={0} max={10} value={scores.viva} disabled={finalized} onChange={e => handleScoreCellChange(en.studentId, "viva", Number(e.target.value))} className="w-16 mx-auto block bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-center py-1 rounded focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50" />
                          </td>
                          <td className="py-3 px-3 text-center font-semibold font-mono">
                            {finalized ? (
                              <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/10 px-2 py-0.5 rounded font-bold uppercase">Locked</span>
                            ) : match ? (
                              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/10 px-2 py-0.5 rounded font-bold uppercase">Draft</span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-500 dark:bg-zinc-900 px-2 py-0.5 rounded italic">Blank</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100 dark:border-zinc-900/80">
                <button onClick={() => handleSaveMarks(true)} className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs px-4 py-2 rounded transition">Save Draft Ledger</button>
                <button onClick={() => handleSaveMarks(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded transition shadow-md">Finalize & Submit Marks</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. SUBJECT MATERIALS
// ==========================================
export function FacultySubjects() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  
  // Upload states
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"Notes" | "Syllabus" | "Question Paper" | "Resource">("Notes");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const { data: materials = [], refetch } = useQuery<any[]>({
    queryKey: ["materials-resources", selectedCourseId],
    queryFn: async () => (await api.get(`/materials?courseId=${selectedCourseId}`)).data,
    enabled: !!selectedCourseId
  });

  const facultyCourses = courses.filter(c => c.facultyId === user?.id);

  const uploadMutation = useMutation({
    mutationFn: async (payload: any) => await api.post("/materials", payload),
    onSuccess: () => {
      refetch();
      toast.success("Study resource shared successfully!");
      setTitle("");
      setFileUrl("");
      setFileName("");
    }
  });

  const handleShareMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error("Please configure the course parameter first.");
      return;
    }
    uploadMutation.mutate({ courseId: selectedCourseId, title, type, fileUrl, fileName });
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Assigned Subject Materials Hub" subtitle="Upload lecture notes, study syllabi, sample question papers, and share web resources." icon={BookOpen} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Share resources form left */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-5 shadow-sm">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Share study material</h3>
          <form onSubmit={handleShareMaterial} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Select Course</label>
              <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required>
                <option value="">-- Choose Subject --</option>
                {facultyCourses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Resource Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unit 2 Vector Spaces Notes" className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Material Type</label>
              <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none">
                <option value="Notes">Lecture Notes</option>
                <option value="Syllabus">Subject Syllabus</option>
                <option value="Question Paper">Question Paper / Practice</option>
                <option value="Resource">Web reference Resource</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Attachment File Name</label>
              <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="e.g. lecture_notes.pdf" className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Reference URL / File Link</label>
              <input type="text" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 rounded transition shadow-md">
              Share Study Material
            </button>
          </form>
        </div>

        {/* List of study materials right */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
          {!selectedCourseId ? (
            <div className="text-center py-20 text-slate-400 italic">Configure subject parameters in the left panel to launch shared resources.</div>
          ) : (
            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">Shared Academic resources</h4>
              {materials.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No resources uploaded yet for this subject.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {materials.map((mat, i) => (
                    <div key={i} className="p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg flex flex-col justify-between">
                      <div>
                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border ${fileTypeColors[mat.type] || "bg-slate-50 text-slate-700"}`}>{mat.type}</span>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-2 leading-snug">{mat.title}</h4>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1 font-mono">{mat.fileName}</span>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-zinc-900/80 text-[10px] text-slate-400">
                        <span>Shared: {mat.uploadedOn}</span>
                        <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">Access &rarr;</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. NOTICES Desk
// ==========================================
export function FacultyNotices() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("department");

  // Queries
  const { data: notices = [] } = useQuery<any[]>({
    queryKey: ["notices"],
    queryFn: async () => (await api.get("/notices")).data
  });

  const publishMutation = useMutation({
    mutationFn: async (payload: any) => await api.post("/notices", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast.success("Academic notice published successfully!");
      setTitle("");
      setContent("");
    }
  });

  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    publishMutation.mutate({ title, content, category, department: user?.department });
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Academic Notice Desk" subtitle="Publish department notices or review administrative bulletin board announcements." icon={Bell} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Publish Notice left */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-5 shadow-sm">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Publish class notice</h3>
          <form onSubmit={handlePublishNotice} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Category Scope</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none">
                <option value="department">Assigned Department</option>
                <option value="branch">Branch Announcements</option>
                <option value="event">Campus Event / Calendar</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Notice Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Schedule Alterations" className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Bulletin Content</label>
              <textarea rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Type announcement parameters..." className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 rounded transition shadow-md">
              Publish Notice Announcement
            </button>
          </form>
        </div>

        {/* Notices Board right */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Active Bulletin boards</h3>
          <div className="flex flex-col gap-4">
            {notices.map((notice, i) => (
              <div key={i} className="p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg">
                <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-zinc-500 font-mono mb-1.5">
                  <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{notice.category}</span>
                  <span>{notice.date}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-tight">{notice.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{notice.content}</p>
                {notice.department && (
                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono font-bold block mt-3">Scope: {notice.department}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 10. LEAVE REQUESTS
// ==========================================
export function FacultyLeave() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: leaves = [], refetch } = useQuery<any[]>({
    queryKey: ["leave-requests"],
    queryFn: async () => (await api.get("/leave-requests")).data
  });

  const leaveMutation = useMutation({
    mutationFn: async (payload: any) => await api.post("/leave-requests", payload),
    onSuccess: () => {
      refetch();
      toast.success("Leave request filed successfully!");
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  });

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    leaveMutation.mutate({ startDate, endDate, reason });
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Assigned Leave Requests Desk" subtitle="Apply for official leaves, track approval status, and view historical leave records." icon={ClipboardCheck} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form apply left */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-5 shadow-sm">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Apply for Leave</h3>
          <form onSubmit={handleApplyLeave} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Reason Justification</label>
              <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} placeholder="State the reason for leave requests..." className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 rounded transition shadow-md">
              Submit Leave Application
            </button>
          </form>
        </div>

        {/* Leave list right */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Historical requests status</h3>
          {leaves.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No leave requests submitted yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {leaves.map((lv, idx) => {
                const statusColors = {
                  Pending: "text-amber-500 bg-amber-500/10 border-amber-500/20",
                  Approved: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                  Rejected: "text-rose-500 bg-rose-500/10 border-rose-500/20"
                };
                return (
                  <div key={idx} className="p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg flex justify-between items-start">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-mono">APPLIED ON {lv.appliedOn}</span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-1">{lv.startDate} &rarr; {lv.endDate}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{lv.reason}</p>
                    </div>
                    <span className={`text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded border ${statusColors[lv.status as "Pending" | "Approved" | "Rejected"] || "text-slate-500 bg-slate-50"}`}>
                      {lv.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 11. ALERTS / ALERTS HUB
// ==========================================
export function FacultyNotifications() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();

  const { data: notifications = [], refetch } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data
  });

  const markReadMutation = useMutation({
    mutationFn: async (id?: string) => await api.post("/notifications/mark-read", { notificationId: id }),
    onSuccess: () => {
      refetch();
      toast.success("Notifications marked read cleanly!");
    }
  });

  return (
    <div className="p-6">
      <ModuleHeader title="Professional Alerts Desk" subtitle="Track real-time student assignment submissions, exam deadlines, and admin announcements." icon={Bell} />
      
      <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-zinc-900 mb-4">
          <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Unread Alerts</span>
          <button 
            onClick={() => markReadMutation.mutate(undefined)}
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Mark All Read
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-12">No alerts logged currently.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((not, idx) => (
              <div key={idx} className={`p-4 border rounded-lg flex justify-between items-center transition ${not.isRead ? "border-slate-100 dark:border-zinc-900 bg-slate-50/20 dark:bg-zinc-950/20 opacity-70" : "border-indigo-100 dark:border-indigo-950/60 bg-indigo-500/5"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{not.type}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">{not.timestamp?.split("T")[0]}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-1.5 leading-tight">{not.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">{not.message}</p>
                </div>
                {!not.isRead && (
                  <button 
                    onClick={() => markReadMutation.mutate(not.id)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded transition"
                    title="Mark single alert read"
                  >
                    <Check className="h-4 w-4 text-indigo-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 12. PERFORMANCE REPORTS
// ==========================================
export function FacultyReports() {
  const { user } = useSelector((state: RootState) => state.app);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => (await api.get("/courses")).data
  });
  const { data: attendanceLogs = [] } = useQuery<any[]>({
    queryKey: ["attendance-logs"],
    queryFn: async () => (await api.get("/attendance")).data
  });
  const { data: examMarks = [] } = useQuery<any[]>({
    queryKey: ["exam-marks"],
    queryFn: async () => (await api.get("/exam-marks")).data
  });
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: ["all-submissions"],
    queryFn: async () => (await api.get("/assignments/submissions")).data
  });

  const facultyCourses = courses.filter(c => c.facultyId === user?.id);

  // Generate Reports arrays
  const handleExportMarksReport = () => {
    const report = examMarks.filter(m => m.courseId === selectedCourseId).map(m => ({
      "Enrollment ID": m.studentId,
      "Scholar Name": m.studentName,
      "Exam Type": m.examType,
      "Theory Marks": m.theoryMarks,
      "Practical Marks": m.practicalMarks,
      "Total Marks": m.totalMarks,
      Percentage: m.percentage.toFixed(1) + "%",
      Grade: m.grade,
      Status: m.status
    }));
    exportToCSV(report, `exam_marks_report_${selectedCourseId}`);
  };

  const handleExportAssignmentReport = () => {
    const report = submissions.filter(s => s.courseId === selectedCourseId || s.courseCode === selectedCourseId).map(s => ({
      "Enrollment ID": s.studentId,
      "Scholar Name": s.studentName,
      "Assignment Title": s.assignmentTitle,
      Status: s.status,
      "Score Grade": s.score || 0,
      Feedback: s.feedback || ""
    }));
    exportToCSV(report, `assignments_report_${selectedCourseId}`);
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Faculty Reporting & Analytics Center" subtitle="Export high-fidelity spreadsheet logs for student rosters, exam sheets, and attendance registers." icon={FileSpreadsheet} />
      
      <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm max-w-2xl">
        <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Export Performance Sheet reports</h3>
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Select Subject</label>
            <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none">
              <option value="">-- Choose Subject --</option>
              {facultyCourses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Examination Sheet Report</h4>
                <p className="text-[10px] text-slate-400 mt-1">Export full lists of internal, viva, and final theory marks sheets.</p>
              </div>
              <button 
                onClick={handleExportMarksReport}
                disabled={!selectedCourseId}
                className="mt-4 w-full bg-indigo-600 disabled:opacity-50 hover:bg-indigo-500 text-white font-semibold text-[10px] py-1.5 rounded transition shadow-sm"
              >
                Export Excel Sheet
              </button>
            </div>

            <div className="p-4 border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30 rounded-lg flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Assignment Evaluation Report</h4>
                <p className="text-[10px] text-slate-400 mt-1">Export scores, reviewer comments, and evaluations dates logs.</p>
              </div>
              <button 
                onClick={handleExportAssignmentReport}
                disabled={!selectedCourseId}
                className="mt-4 w-full bg-indigo-600 disabled:opacity-50 hover:bg-indigo-500 text-white font-semibold text-[10px] py-1.5 rounded transition shadow-sm"
              >
                Export Excel Sheet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 13. SETTINGS
// ==========================================
export function FacultySettings() {
  const { theme } = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChanging(true);
    try {
      await api.post("/profile/change-password", { currentPassword, newPassword });
      toast.success("Security password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="p-6">
      <ModuleHeader title="Portal Settings & Security" subtitle="Adjust security passwords, dark theme toggles, and notification preferences." icon={Settings} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change password left */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-4">Change Security Password</h3>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4" autoComplete="off">
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">Current Password</label>
              <input type="password" autoComplete="new-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider text-slate-400 block mb-1">New Password</label>
              <input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs rounded text-slate-800 dark:text-zinc-200 focus:outline-none" required />
            </div>
            <button type="submit" disabled={isChanging} className="self-start bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded transition shadow-md">
              {isChanging ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Configurations right */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-900 dark:bg-zinc-950 p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-3">Workspace Visual Theme</h3>
            <p className="text-[11px] text-slate-400 mb-4">Toggle between Slate Light Mode or the Deep cosmic dark navy visual workspace interface.</p>
            <button 
              onClick={() => dispatch(toggleTheme())}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300 font-semibold text-xs px-4 py-2 rounded border border-slate-200 dark:border-zinc-800 transition"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500 animate-pulse" /> : <Moon className="h-4 w-4" />}
              <span>Toggle theme Layout ({theme === "dark" ? "Cosmic Dark" : "Slate Light"})</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-zinc-900/80">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-white mb-3">Portal Session Manager</h3>
            <p className="text-[11px] text-slate-400 mb-4">Log out securely from this academic administrative terminal session.</p>
            <button 
              onClick={() => { dispatch(logout()); toast.success("Logged out successfully."); }}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-4 py-2 rounded transition shadow-md"
            >
              Secure Portal Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
