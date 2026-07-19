import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Course, Enrollment, User, Attendance } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  UserCheck, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Sparkles,
  UserCheck2,
  AlertCircle,
  FileSpreadsheet,
  Download
} from "lucide-react";
import toast from "react-hot-toast";

export default function AttendanceRegister() {
  const { user, theme } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();

  // Selected state
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  });

  // Form states for manual or autofill entry
  const [studentName, setStudentName] = useState<string>("");
  const [enrollmentNo, setEnrollmentNo] = useState<string>("");
  const [status, setStatus] = useState<"Present" | "Absent" | "Late">("Present");
  const [remarks, setRemarks] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await api.get("/courses");
      return res.data;
    },
  });

  // Fetch enrollments
  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.get("/enrollments");
      return res.data;
    },
  });

  // Fetch users (to match student details)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
    enabled: user?.role === "faculty" || user?.role === "principal",
  });

  // Fetch attendance records
  const { data: attendanceList = [], isLoading: isLoadingAttendance } = useQuery<Attendance[]>({
    queryKey: ["attendance"],
    queryFn: async () => {
      const res = await api.get("/attendance");
      return res.data;
    },
  });

  // Mutation to save/update an attendance record
  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: {
      studentName: string;
      enrollmentNo: string;
      courseId: string;
      date: string;
      status: "Present" | "Absent" | "Late";
      remarks?: string;
    }) => {
      return api.post("/attendance", data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(res.data?.message || "Attendance recorded successfully!");
      // Reset form fields
      setStudentName("");
      setEnrollmentNo("");
      setRemarks("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save attendance record");
    },
  });

  // Mutation to delete an attendance record
  const deleteAttendanceMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      return api.delete(`/attendance/${attendanceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance record retracted.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to retract attendance record");
    },
  });

  // Handlers
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error("Please choose a course section first");
      return;
    }
    if (!studentName.trim() || !enrollmentNo.trim()) {
      toast.error("Student Name and Enrollment Number are required");
      return;
    }

    saveAttendanceMutation.mutate({
      studentName: studentName.trim(),
      enrollmentNo: enrollmentNo.trim(),
      courseId: selectedCourseId,
      date: selectedDate,
      status,
      remarks: remarks.trim(),
    });
  };

  const handleDeleteAttendance = (id: string) => {
    if (confirm("Are you sure you want to retract/delete this attendance log?")) {
      deleteAttendanceMutation.mutate(id);
    }
  };

  // Filter courses: Faculty can only see courses assigned to them, Principal can see all
  const filteredCourses = courses.filter((c) => {
    if (user?.role === "principal") return true;
    return c.facultyId === user?.id;
  });

  // Get active students enrolled in selected course
  const activeEnrollments = enrollments.filter(
    (e) => e.courseId === selectedCourseId && e.status === "active"
  );

  const courseStudents = activeEnrollments.map((enr) => {
    const studentInfo = allUsers.find((u) => u.id === enr.studentId);
    return {
      enrollmentId: enr.id,
      studentId: enr.studentId,
      fullName: studentInfo ? studentInfo.fullName : "Unknown Scholar",
      email: studentInfo ? studentInfo.email : "",
      enrollmentNo: enr.studentId, // We use studentId as the unique enrollment identifier
    };
  });

  // Filter attendance list for the selected course and selected date (or search keyword)
  const currentAttendance = attendanceList.filter((att) => {
    const matchesCourse = att.courseId === selectedCourseId;
    const matchesDate = !selectedDate || att.date === selectedDate;
    const matchesSearch =
      !searchTerm.trim() ||
      att.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (att.remarks && att.remarks.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCourse && matchesDate && matchesSearch;
  });

  // Quick stats for the selected course + date
  const totalLogs = currentAttendance.length;
  const presentCount = currentAttendance.filter((a) => a.status === "Present").length;
  const absentCount = currentAttendance.filter((a) => a.status === "Absent").length;
  const lateCount = currentAttendance.filter((a) => a.status === "Late").length;
  const attendanceRate = totalLogs > 0 ? ((presentCount + lateCount) / totalLogs) * 100 : 0;

  // Auto-fill form fields from student list click
  const handleSelectStudent = (student: typeof courseStudents[number]) => {
    setStudentName(student.fullName);
    setEnrollmentNo(student.enrollmentNo);
    toast.success(`Selected ${student.fullName}! Details pre-filled.`);
  };

  // Helper to get status color badges
  const getStatusBadge = (s: "Present" | "Absent" | "Late") => {
    switch (s) {
      case "Present":
        return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
      case "Absent":
        return "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20";
      case "Late":
        return "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
    }
  };

  // Helper to export attendance records as a downloadable CSV report
  const handleExportAttendance = (records: Attendance[], isStudent: boolean) => {
    if (records.length === 0) {
      toast.error("No attendance records to export");
      return;
    }

    let csvContent = "\uFEFF"; // Add BOM for proper UTF-8 Excel support
    if (isStudent) {
      csvContent += "Course Code,Course Name,Date,Status,Remarks\n";
      records.forEach((record) => {
        const course = courses.find((c) => c.id === record.courseId);
        const courseCode = course ? course.code : "N/A";
        const courseName = course ? course.name : "N/A";
        const remarksSafe = record.remarks ? `"${record.remarks.replace(/"/g, '""')}"` : "";
        csvContent += `"${courseCode}","${courseName}","${record.date}","${record.status}",${remarksSafe}\n`;
      });
    } else {
      csvContent += "Student Name,Enrollment/Scholar ID,Course Code,Course Name,Date,Status,Remarks\n";
      records.forEach((record) => {
        const course = courses.find((c) => c.id === record.courseId);
        const courseCode = course ? course.code : "N/A";
        const courseName = course ? course.name : "N/A";
        const nameSafe = `"${record.studentName.replace(/"/g, '""')}"`;
        const enrollSafe = `"${record.enrollmentNo.replace(/"/g, '""')}"`;
        const remarksSafe = record.remarks ? `"${record.remarks.replace(/"/g, '""')}"` : "";
        csvContent += `${nameSafe},${enrollSafe},"${courseCode}","${courseName}","${record.date}","${record.status}",${remarksSafe}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = isStudent
      ? `My_Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`
      : `Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance report downloaded successfully!");
  };

  // Render student-specific dashboard if logged-in user is a student
  if (user?.role === "student") {
    const studentLogs = attendanceList;
    const studentTotal = studentLogs.length;
    const studentPresent = studentLogs.filter((a) => a.status === "Present").length;
    const studentAbsent = studentLogs.filter((a) => a.status === "Absent").length;
    const studentLate = studentLogs.filter((a) => a.status === "Late").length;
    const studentRate = studentTotal > 0 ? ((studentPresent + studentLate) / studentTotal) * 100 : 0;

    const filteredStudentLogs = studentLogs.filter((att) => {
      const course = courses.find((c) => c.id === att.courseId);
      const courseName = course ? `${course.code} ${course.name}` : "";
      const matchesSearch =
        !searchTerm.trim() ||
        courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        att.date.includes(searchTerm) ||
        (att.remarks && att.remarks.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });

    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <ClipboardCheck className="h-6 w-6 text-indigo-500" />
            My Attendance Record
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Track your lecture presence, late arrivals, and view remarks left by your instructors.
          </p>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Overall Rate</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {studentRate.toFixed(1)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Recommended: &gt;= 75%</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Present Classes</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {studentPresent}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Classes attended on time</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Late Arrivals</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {studentLate}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Counted towards presence rate</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Absences</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                {studentAbsent}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Missed lecture sessions</span>
          </div>
        </div>

        {/* Ledger and search */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-base flex items-center gap-1.5">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                My Attendance Logs
              </h3>
              <button
                onClick={() => handleExportAttendance(filteredStudentLogs, true)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 transition shadow-sm"
                title="Download CSV report"
              >
                <Download className="h-3.5 w-3.5" />
                Export Attendance
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search course or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-mono font-semibold border-b border-slate-200 dark:border-zinc-800 text-[10px]">
                  <th className="p-3">Course Code & Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Remarks / Professor Notes</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingAttendance ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-400 font-mono">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : filteredStudentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-400">
                      No attendance marks recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredStudentLogs.map((record) => {
                    const course = courses.find((c) => c.id === record.courseId);
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition text-xs"
                      >
                        <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">
                          {course ? `${course.code} - ${course.name}` : "Unknown Course"}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-zinc-400 font-mono">
                          {record.date}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold border rounded-full ${getStatusBadge(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-zinc-400 italic">
                          {record.remarks || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <ClipboardCheck className="h-6 w-6 text-indigo-500" />
            Class Attendance Register
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Log student attendance, record late arrivals, and monitor terminal participation stats.
          </p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Controls & Student Quick-Fill */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Section Selection */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm">
            <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 mb-4 text-sm flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-amber-500" />
              Select Course & Date
            </h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                  Active Class Section
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    setStudentName("");
                    setEnrollmentNo("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Course --</option>
                  {filteredCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                  Attendance Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick-Fill Student Roster list */}
          {selectedCourseId && (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm flex-1 flex flex-col min-h-[250px]">
              <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 mb-3 text-sm flex items-center gap-1.5">
                <UserCheck2 className="h-4 w-4 text-indigo-500" />
                Course Roster Roster Checklist
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mb-3">
                Click a student below to auto-fill their name and enrollment details.
              </p>

              {courseStudents.length === 0 ? (
                <div className="text-slate-400 text-xs py-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg flex-1 flex flex-col justify-center">
                  No scholars enrolled in this section.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto flex-1 pr-1">
                  {courseStudents.map((st) => (
                    <button
                      key={st.studentId}
                      onClick={() => handleSelectStudent(st)}
                      className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 hover:border-indigo-200 dark:hover:border-zinc-700 transition flex justify-between items-center group text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-800 dark:text-zinc-200 block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {st.fullName}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
                          Enrollment: {st.enrollmentNo}
                        </span>
                      </div>
                      <span className="text-[9px] bg-slate-200 dark:bg-zinc-850 px-1.5 py-0.5 rounded text-slate-600 dark:text-zinc-400 font-mono group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Form entry + Attendance ledger */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Attendance Entry Form */}
          {selectedCourseId ? (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm">
              <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 mb-4 text-sm flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Add Attendance Mark
              </h3>
              
              <form onSubmit={handleSaveAttendance} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter student name manually or click roster"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                      Enrollment Number / Scholar ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. usr_student or custom code"
                      value={enrollmentNo}
                      onChange={(e) => setEnrollmentNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                      Attendance Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Present", "Absent", "Late"] as const).map((s) => {
                        const active = status === s;
                        let activeStyles = "";
                        if (active) {
                          if (s === "Present") activeStyles = "bg-emerald-600 text-white border-emerald-600";
                          if (s === "Absent") activeStyles = "bg-rose-600 text-white border-rose-600";
                          if (s === "Late") activeStyles = "bg-amber-600 text-white border-amber-600";
                        } else {
                          activeStyles = "bg-slate-50 border-slate-200 text-slate-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-850";
                        }
                        
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(s)}
                            className={`border rounded py-2 text-xs font-semibold font-grotesk tracking-wide flex items-center justify-center gap-1.5 transition ${activeStyles}`}
                          >
                            {s === "Present" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {s === "Absent" && <XCircle className="h-3.5 w-3.5" />}
                            {s === "Late" && <Clock className="h-3.5 w-3.5" />}
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                      Remarks / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Doctor note, Excused"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={saveAttendanceMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 px-4 rounded transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Save & Submit Mark
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 p-12 text-center flex flex-col items-center justify-center gap-3">
              <ClipboardCheck className="h-12 w-12 text-slate-300 dark:text-zinc-700 animate-pulse" />
              <div className="font-grotesk font-semibold text-sm text-slate-700 dark:text-zinc-300">
                Attendance Console Standby
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm">
                Choose an active course section on the left sidebar to access roster checklists, submit logs, and audit records.
              </p>
            </div>
          )}

          {/* Active Attendance Ledger */}
          {selectedCourseId && (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm flex flex-col gap-4">
              
              {/* Daily Audit Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-900/50 p-3.5 border border-slate-200 dark:border-zinc-800/80 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    Total Logged
                  </span>
                  <span className="text-lg font-bold text-slate-800 dark:text-zinc-200 font-mono">
                    {totalLogs}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                    Present
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {presentCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">
                    Absent
                  </span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {absentCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">
                    Active Rate
                  </span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {attendanceRate.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Table search and filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                    Attendance Ledger Logs
                  </h3>
                  <button
                    onClick={() => handleExportAttendance(currentAttendance, false)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 transition shadow-sm"
                    title="Download CSV report of current filtered list"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Attendance
                  </button>
                </div>

                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, ID, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Ledger Table */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-mono font-semibold border-b border-slate-200 dark:border-zinc-800 text-[10px]">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Enrollment No</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Notes / Remarks</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingAttendance ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-400 font-mono">
                          Loading terminal logs...
                        </td>
                      </tr>
                    ) : currentAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-400">
                          No matching attendance records found.
                        </td>
                      </tr>
                    ) : (
                      currentAttendance.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition group"
                        >
                          <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">
                            {record.studentName}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                            {record.enrollmentNo}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-zinc-400">
                            {record.date}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold border rounded-full ${getStatusBadge(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-zinc-400 italic font-sans max-w-[150px] truncate" title={record.remarks}>
                            {record.remarks || "-"}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteAttendance(record.id)}
                              disabled={deleteAttendanceMutation.isPending}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition"
                              title="Retract attendance mark"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

        </div>
      </div>
    </div>
  );
}
