import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Course, Enrollment, User } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { BookOpen, Search, Filter, Plus, Trash2, CalendarCheck, HelpCircle, Activity, Sparkles, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function CourseCatalog() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Scheduling states
  const [schedulerLogs, setSchedulerLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Modal form states for creating course
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("Computer Science");
  const [newCredits, setNewCredits] = useState(3);
  const [newDesc, setNewDesc] = useState("");

  // Edit/Schedule course states
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [assignedFacultyId, setAssignedFacultyId] = useState("");
  const [assignedTimeSlot, setAssignedTimeSlot] = useState("");
  const [assignedRoom, setAssignedRoom] = useState("");

  // Queries
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await api.get("/courses");
      return res.data;
    },
  });

  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.get("/enrollments");
      return res.data;
    },
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
    enabled: user?.role === "principal",
  });

  const facultyMembers = allUsers.filter((u) => u.role === "faculty");

  // Mutations
  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return api.post("/enrollments", { courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      toast.success("Successfully enrolled in course!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to enroll in course");
    },
  });

  const dropMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      return api.delete(`/enrollments/${enrollmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      toast.success("Dropped course from current semester.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to drop course");
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: Partial<Course>) => {
      return api.post("/courses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setShowCreateModal(false);
      setNewCode("");
      setNewName("");
      setNewDesc("");
      toast.success("Course registered into central catalog!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to register course");
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Course> }) => {
      return api.put(`/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setEditingCourseId(null);
      toast.success("Course schedule and variables saved!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update course");
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return api.delete(`/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course purged from curriculum.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to remove course");
    },
  });

  const autoScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/courses/schedule/auto");
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setSchedulerLogs(data.logs || []);
      setShowLogs(true);
      toast.success("Conflict-free course schedule solved and saved!");
    },
    onError: (err: any) => {
      setSchedulerLogs(err.response?.data?.logs || ["An error occurred while running solver."]);
      setShowLogs(true);
      toast.error(err.response?.data?.message || "Could not resolve timetables.");
    },
  });

  // Filters logic
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "All" || c.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const isStudentEnrolled = (courseId: string) => {
    return enrollments.some(
      (e) => e.studentId === user?.id && e.courseId === courseId && e.status === "active"
    );
  };

  const getStudentEnrollmentId = (courseId: string) => {
    const e = enrollments.find(
      (e) => e.studentId === user?.id && e.courseId === courseId && e.status === "active"
    );
    return e ? e.id : null;
  };

  const handleCreateCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCourseMutation.mutate({
      code: newCode,
      name: newName,
      department: newDept,
      credits: newCredits,
      description: newDesc,
    });
  };

  const handleSaveScheduleSubmit = (courseId: string) => {
    updateCourseMutation.mutate({
      id: courseId,
      data: {
        facultyId: assignedFacultyId || null,
        timeSlot: assignedTimeSlot || null,
        room: assignedRoom || null,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header and Smart Solvers panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-white">
            <BookOpen className="h-6 w-6 text-indigo-500" />
            Curriculum & Catalog
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Browse registered classes, self-register, and manage timetables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === "principal" && (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
              >
                <Plus className="h-4 w-4" />
                Add Course
              </button>

              <button
                onClick={() => autoScheduleMutation.mutate()}
                disabled={autoScheduleMutation.isPending}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-sans text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
                title="Automatically resolves timetable room & professor constraints"
              >
                <Sparkles className="h-4 w-4" />
                Run Smart Scheduler
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scheduler logs drawer */}
      {showLogs && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="font-grotesk font-semibold text-xs text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="h-4 w-4" />
              Automated Scheduling Solver Diagnostics Logs
            </span>
            <button
              onClick={() => setShowLogs(false)}
              className="text-zinc-500 hover:text-white font-mono text-[11px] underline"
            >
              Dismiss Console
            </button>
          </div>
          
          <div className="rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-[10px] text-zinc-300 max-h-48 overflow-y-auto flex flex-col gap-1 shadow-inner leading-relaxed">
            {schedulerLogs.map((log, index) => (
              <div key={index} className={log.includes("✅") ? "text-emerald-400 font-semibold" : log.includes("❌") ? "text-rose-400 font-semibold" : ""}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalog Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-zinc-500" />
          </span>
          <input
            type="text"
            placeholder="Search code, name, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Filter className="h-4 w-4 text-zinc-500" />
          </span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Library Administration">Library Administration</option>
            <option value="Executive Office">Executive Office</option>
          </select>
        </div>
      </div>

      {/* Courses grid */}
      {isLoadingCourses ? (
        <div className="h-64 flex items-center justify-center text-zinc-400 font-sans text-sm">
          Fetching central catalog records...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="h-48 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 font-sans text-xs">
          No courses found matching search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => {
            const enrolled = isStudentEnrolled(c.id);
            const enrollmentId = getStudentEnrollmentId(c.id);
            const isEditing = editingCourseId === c.id;

            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg hover:border-zinc-700 transition duration-150"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-mono text-xs font-semibold text-indigo-400 uppercase">
                      {c.code}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-zinc-500 bg-zinc-900 border border-zinc-800/80 rounded px-2 py-0.5">
                      {c.credits} Credits
                    </span>
                  </div>

                  <h3 className="font-grotesk font-semibold text-zinc-100 text-sm mt-2 truncate">
                    {c.name}
                  </h3>
                  <div className="font-mono text-[9px] text-zinc-400 mt-0.5 uppercase tracking-wide">
                    {c.department}
                  </div>

                  <p className="text-zinc-400 text-xs mt-3 leading-relaxed line-clamp-3">
                    {c.description || "No description provided for this catalog listing."}
                  </p>

                  {/* Manual Scheduler section (Principal Only) */}
                  {isEditing ? (
                    <div className="mt-4 pt-4 border-t border-zinc-800/60 flex flex-col gap-3">
                      <span className="font-grotesk text-[11px] font-bold text-amber-400">Manual Timetable Scheduler</span>
                      <div>
                        <label className="text-[9px] text-zinc-500 block mb-0.5 font-bold uppercase">Assign Faculty</label>
                        <select
                          value={assignedFacultyId}
                          onChange={(e) => setAssignedFacultyId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
                        >
                          <option value="">-- No Professor --</option>
                          {facultyMembers
                            .filter((f) => f.department === c.department)
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.fullName}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-zinc-500 block mb-0.5 font-bold uppercase">Time Slot</label>
                          <input
                            type="text"
                            placeholder="e.g. Monday 09:00 - 10:30"
                            value={assignedTimeSlot}
                            onChange={(e) => setAssignedTimeSlot(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500 block mb-0.5 font-bold uppercase">Room</label>
                          <input
                            type="text"
                            placeholder="e.g. Room 101"
                            value={assignedRoom}
                            onChange={(e) => setAssignedRoom(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end mt-1">
                        <button
                          onClick={() => setEditingCourseId(null)}
                          className="px-2 py-1 text-[10px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveScheduleSubmit(c.id)}
                          className="px-2.5 py-1 text-[10px] font-bold text-black bg-amber-500 rounded hover:bg-amber-400"
                        >
                          Apply Schedule
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-zinc-900/80 flex flex-col gap-1.5 font-mono text-[10px] text-zinc-400">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">TIMETABLE SLOT:</span>
                        <span className={c.timeSlot ? "text-zinc-300 font-medium" : "text-rose-400 font-bold"}>
                          {c.timeSlot || "Not Scheduled"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">CLASS ROOM:</span>
                        <span className={c.room ? "text-zinc-300 font-medium" : "text-rose-400 font-bold"}>
                          {c.room || "Not Assigned"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center gap-4">
                  {/* Student enroll actions */}
                  {user?.role === "student" && (
                    <>
                      {enrolled ? (
                        <button
                          onClick={() => enrollmentId && dropMutation.mutate(enrollmentId)}
                          disabled={dropMutation.isPending}
                          className="w-full py-1.5 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-black border border-rose-500/30 font-sans text-xs font-semibold transition"
                        >
                          Drop Course
                        </button>
                      ) : (
                        <button
                          onClick={() => enrollMutation.mutate(c.id)}
                          disabled={enrollMutation.isPending}
                          className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold transition"
                        >
                          Register / Enroll
                        </button>
                      )}
                    </>
                  )}

                  {/* Principal modify actions */}
                  {user?.role === "principal" && !isEditing && (
                    <div className="flex w-full gap-3">
                      <button
                        onClick={() => {
                          setEditingCourseId(c.id);
                          setAssignedFacultyId(c.facultyId || "");
                          setAssignedTimeSlot(c.timeSlot || "");
                          setAssignedRoom(c.room || "");
                        }}
                        className="flex-1 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-sans text-xs font-semibold transition flex items-center justify-center gap-1"
                      >
                        <CalendarCheck className="h-3.5 w-3.5" />
                        Schedule
                      </button>
                      
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${c.code} from catalog? This deletes enrollments.`)) {
                            deleteCourseMutation.mutate(c.id);
                          }
                        }}
                        className="p-1.5 rounded border border-rose-950 bg-rose-950/20 text-rose-400 hover:bg-rose-600 hover:text-black transition"
                        title="Delete Course Catalog"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Course Modal popup */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="font-grotesk font-semibold text-zinc-200 text-base">Register Academic Catalog Course</h3>
            
            <form onSubmit={handleCreateCourseSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="CS101"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Course Name</label>
                <input
                  type="text"
                  placeholder="Intro to Programming"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Academic Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Syllabus / Description</label>
                <textarea
                  placeholder="Describe core course components and constraints..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-sans text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCourseMutation.isPending}
                  className="px-4 py-2 font-sans text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Create Catalog Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
