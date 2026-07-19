import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { User } from "../types";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Plus,
  Trash2,
  ShieldCheck,
  Building,
  Phone,
  Clock,
  Sparkles,
  Database
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
import { motion } from "motion/react";
import { ERDiagram } from "./ERDiagram";

const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899"];

export default function PrincipalDashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"analytics" | "schema">("analytics");

  // Registration modal states
  const [showRegModal, setShowRegModal] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("password");
  const [regFullName, setRegFullName] = useState("");
  const [regRole, setRegRole] = useState<"student" | "faculty" | "librarian" | "principal">("student");
  const [regDept, setRegDept] = useState("Computer Science");
  const [regPhone, setRegPhone] = useState("");

  // Queries
  const { data: analytics = null, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await api.get("/analytics");
      return res.data;
    },
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setShowRegModal(false);
      setRegEmail("");
      setRegFullName("");
      setRegPhone("");
      toast.success("Academic profile registered successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create profile");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Academic profile archived.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to remove user");
    },
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      email: regEmail,
      password: regPassword,
      role: regRole,
      fullName: regFullName,
      department: regDept,
      phone: regPhone,
    });
  };

  const handleDeleteUser = (userId: string, fullName: string) => {
    if (confirm(`Are you sure you want to archive ${fullName}'s profile?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-white">
            <LayoutDashboard className="h-6 w-6 text-indigo-500" />
            Executive Office Dashboard
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Institutional statistics, enrollment trends, and academic profile administration.
          </p>
        </div>

        <button
          onClick={() => setShowRegModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Register Profile
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-900/60 pb-1.5 gap-6">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-2 text-xs font-semibold font-grotesk tracking-wider uppercase transition-all relative ${
            activeTab === "analytics" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Institutional Analytics
          {activeTab === "analytics" && (
            <motion.div layoutId="dashboard-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("schema")}
          className={`pb-2 text-xs font-semibold font-grotesk tracking-wider uppercase transition-all relative flex items-center gap-1.5 ${
            activeTab === "schema" ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          ER Database Schema
          {activeTab === "schema" && (
            <motion.div layoutId="dashboard-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
      </div>

      {activeTab === "schema" ? (
        <ERDiagram />
      ) : (
        <>
          {/* Analytics statistics tiles */}
          {isLoadingAnalytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-zinc-900 bg-zinc-950 animate-pulse" />
          ))}
        </div>
      ) : (
        analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <motion.div
              whileHover={{ scale: 1.025, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-1 cursor-pointer hover:border-zinc-700/80 hover:shadow-lg transition-colors"
            >
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Scholars</span>
              <span className="text-2xl font-bold font-mono text-white">{analytics.metrics.students}</span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.025, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-1 cursor-pointer hover:border-zinc-700/80 hover:shadow-lg transition-colors"
            >
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Instructors</span>
              <span className="text-2xl font-bold font-mono text-amber-400">{analytics.metrics.faculty}</span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.025, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-1 cursor-pointer hover:border-zinc-700/80 hover:shadow-lg transition-colors"
            >
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Librarians</span>
              <span className="text-2xl font-bold font-mono text-indigo-400">{analytics.metrics.librarians}</span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.025, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-1 cursor-pointer hover:border-zinc-700/80 hover:shadow-lg transition-colors"
            >
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Course Catalog</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">{analytics.metrics.totalCourses}</span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.025, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-1 col-span-2 lg:col-span-1 cursor-pointer hover:border-zinc-700/80 hover:shadow-lg transition-colors"
            >
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Book Loans</span>
              <span className="text-2xl font-bold font-mono text-rose-400">{analytics.metrics.activeBorrows}</span>
            </motion.div>
          </div>
        )
      )}

      {/* Visual charts panel */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Enrollment load per Course code */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col gap-3">
            <span className="font-grotesk font-semibold text-xs text-zinc-400 uppercase tracking-wider">Course Enrollment Load</span>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.enrollmentPerCourse}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#a1a1aa", fontSize: "11px" }}
                  />
                  <Bar dataKey="students" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Grade distribution */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col gap-3">
            <span className="font-grotesk font-semibold text-xs text-zinc-400 uppercase tracking-wider">Grade Metric Distribution</span>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.gradeData}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#a1a1aa", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Department proportions */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col gap-3">
            <span className="font-grotesk font-semibold text-xs text-zinc-400 uppercase tracking-wider">Curriculum Proportions</span>
            <div className="h-64 mt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.departmentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#a1a1aa", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 pl-4 text-[10px] font-mono text-zinc-400">
                {analytics.departmentData.map((d: any, i: number) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User administration list */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-4 shadow-xl">
        <h3 className="font-grotesk font-semibold text-zinc-200 text-sm">Institutional Directory Administration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search directory name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Roles</option>
            <option value="student">Student / Scholar</option>
            <option value="faculty">Instructor / Faculty</option>
            <option value="librarian">Librarian</option>
            <option value="principal">Executive Office</option>
          </select>
        </div>

        {isLoadingUsers ? (
          <div className="text-zinc-500 text-xs py-8 text-center">Reading directory logs...</div>
        ) : (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-lg bg-zinc-900 border border-zinc-800/80 p-3.5 flex justify-between items-center group hover:border-zinc-700 transition"
              >
                <div className="flex gap-4 items-center">
                  <div className="p-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-zinc-400">
                    {u.role === "student" ? (
                      <GraduationCap className="h-5 w-5 text-indigo-400" />
                    ) : u.role === "faculty" ? (
                      <Users className="h-5 w-5 text-amber-400" />
                    ) : u.role === "librarian" ? (
                      <ShieldCheck className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-rose-500" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">{u.fullName}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] font-mono text-zinc-400 mt-0.5">
                      <span>{u.email}</span>
                      <span className="hidden sm:inline text-zinc-700">|</span>
                      <span className="flex items-center gap-0.5">
                        <Building className="h-3 w-3 text-zinc-500" /> {u.department}
                      </span>
                      {u.phone && (
                        <>
                          <span className="hidden sm:inline text-zinc-700">|</span>
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-3 w-3 text-zinc-500" /> {u.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deletion action */}
                {u.id !== "usr_principal" && (
                  <button
                    onClick={() => handleDeleteUser(u.id, u.fullName)}
                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition"
                    title="Archive profile"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {/* Profile Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="font-grotesk font-semibold text-zinc-200 text-base">Register Institutional Profile</h3>

            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Prof. Arthur Pendelton"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="professor@college.edu"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Phone Contact</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 012-3456"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Institutional Role</label>
                  <select
                    value={regRole}
                    onChange={(e: any) => setRegRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="student">Student / Scholar</option>
                    <option value="faculty">Instructor / Faculty</option>
                    <option value="librarian">Librarian</option>
                    <option value="principal">Executive Office</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Department</label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Library Administration">Library Administration</option>
                    <option value="Executive Office">Executive Office</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 font-sans text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="px-4 py-2 font-sans text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
