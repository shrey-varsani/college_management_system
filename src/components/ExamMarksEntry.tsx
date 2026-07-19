import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Course, Enrollment, User, ExamMarkEntry, ExamAuditLog } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import {
  Award,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Sparkles,
  FileSpreadsheet,
  Download,
  Upload,
  Lock,
  Unlock,
  Eye,
  Check,
  RotateCcw,
  BookOpen,
  UserCheck,
  Activity,
  Filter,
  ArrowRight,
  ShieldAlert,
  HelpCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function ExamMarksEntry() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();

  // Selected filters for exam entry
  const [academicYear, setAcademicYear] = useState<string>("2026-2027");
  const [examType, setExamType] = useState<string>("End-Semester Examination");
  const [department, setDepartment] = useState<string>("Computer Science");
  const [branch, setBranch] = useState<string>("CS Engineering");
  const [semester, setSemester] = useState<string>("Semester 1");
  const [section, setSection] = useState<string>("Section A");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Maximum Marks Config
  const [maxTheory, setMaxTheory] = useState<number>(100);
  const [maxPractical, setMaxPractical] = useState<number>(50);
  const [maxInternal, setMaxInternal] = useState<number>(30);
  const [maxAssignment, setMaxAssignment] = useState<number>(20);
  const [maxViva, setMaxViva] = useState<number>(10);

  // Tab management: "entry" | "audit"
  const [activeSubTab, setActiveSubTab] = useState<"entry" | "audit">("entry");

  // Search, Grade, and Status filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // CSV file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for inline edited rows (tracks changes before saving)
  const [editedMarks, setEditedMarks] = useState<
    Record<
      string,
      {
        theoryMarks: number;
        practicalMarks: number;
        internalMarks: number;
        assignmentMarks: number;
        vivaMarks: number;
      }
    >
  >({});

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // -------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------
  const { data: courses = [] } = useQuery<Course[]>({
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
  });

  const { data: examMarks = [], isLoading: isLoadingMarks } = useQuery<ExamMarkEntry[]>({
    queryKey: ["examMarks"],
    queryFn: async () => {
      const res = await api.get("/exam-marks");
      return res.data;
    },
  });

  const { data: auditLogs = [] } = useQuery<ExamAuditLog[]>({
    queryKey: ["examAuditLogs"],
    queryFn: async () => {
      const res = await api.get("/exam-marks/audit-logs");
      return res.data;
    },
    enabled: user?.role === "faculty" || user?.role === "principal",
  });

  // -------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------
  const saveMarksMutation = useMutation({
    mutationFn: async (data: any[]) => {
      return api.post("/exam-marks", data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["examMarks"] });
      queryClient.invalidateQueries({ queryKey: ["examAuditLogs"] });
      toast.success(res.data?.message || "Marks saved successfully!");
      setEditedMarks({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save marks");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (payload: { recordIds: string[]; publish: boolean }) => {
      return api.post("/exam-marks/publish-toggle", payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["examMarks"] });
      queryClient.invalidateQueries({ queryKey: ["examAuditLogs"] });
      toast.success(res.data?.message || "Publish status updated");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update publish settings");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/exam-marks/unlock/${id}`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["examMarks"] });
      queryClient.invalidateQueries({ queryKey: ["examAuditLogs"] });
      toast.success(res.data?.message || "Record unlocked for editing");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to unlock record");
    },
  });

  // -------------------------------------------------------------
  // Filtering & Course Options
  // -------------------------------------------------------------
  // Faculty can only see courses assigned to them, Principal sees all
  const filteredCourses = courses.filter((c) => {
    if (user?.role === "principal") return true;
    return c.facultyId === user?.id;
  });

  // Get enrolled students for the active class selection
  const activeEnrollments = enrollments.filter(
    (e) => e.courseId === selectedCourseId && e.status === "active"
  );

  const studentsInClass = activeEnrollments.map((enr) => {
    const studentInfo = allUsers.find((u) => u.id === enr.studentId);
    return {
      studentId: enr.studentId,
      fullName: studentInfo ? studentInfo.fullName : "Scholar",
      department: studentInfo ? studentInfo.department : "N/A",
      enrollmentNo: enr.studentId,
    };
  });

  // Find existing recorded marks for current selection
  const getSavedRecord = (studentId: string) => {
    return examMarks.find(
      (m) =>
        m.studentId === studentId &&
        m.courseId === selectedCourseId &&
        m.academicYear === academicYear &&
        m.examType === examType &&
        m.semester === semester &&
        m.section === section
    );
  };

  // -------------------------------------------------------------
  // Calculations Helper
  // -------------------------------------------------------------
  const calculateResult = (
    theory: number,
    practical: number,
    internal: number,
    assignment: number,
    viva: number
  ) => {
    const total = theory + practical + internal + assignment + viva;
    const maxTotal = maxTheory + maxPractical + maxInternal + maxAssignment + maxViva;
    const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

    let grade = "F";
    if (percentage >= 90) grade = "O";
    else if (percentage >= 80) grade = "A+";
    else if (percentage >= 70) grade = "A";
    else if (percentage >= 60) grade = "B";
    else if (percentage >= 50) grade = "C";
    else if (percentage >= 40) grade = "D";

    const status: "Pass" | "Fail" = percentage >= 40 ? "Pass" : "Fail";

    return { total, percentage, grade, status };
  };

  // -------------------------------------------------------------
  // Roster rendering / Pagination data preparation
  // -------------------------------------------------------------
  const rosterData = studentsInClass.map((student) => {
    const saved = getSavedRecord(student.studentId);
    const editState = editedMarks[student.studentId];

    const theory = editState ? editState.theoryMarks : saved ? saved.theoryMarks : 0;
    const practical = editState ? editState.practicalMarks : saved ? saved.practicalMarks : 0;
    const internal = editState ? editState.internalMarks : saved ? saved.internalMarks : 0;
    const assignment = editState ? editState.assignmentMarks : saved ? saved.assignmentMarks : 0;
    const viva = editState ? editState.vivaMarks : saved ? saved.vivaMarks : 0;

    const { total, percentage, grade, status } = calculateResult(
      theory,
      practical,
      internal,
      assignment,
      viva
    );

    return {
      studentId: student.studentId,
      fullName: student.fullName,
      enrollmentNo: student.enrollmentNo,
      theory,
      practical,
      internal,
      assignment,
      viva,
      total,
      percentage,
      grade,
      status,
      isDraft: saved ? saved.isDraft : true,
      isPublished: saved ? saved.isPublished : false,
      savedRecordId: saved?.id || null,
      isEdited: !!editState,
    };
  });

  // Filter roster by search terms, grades, and statuses
  const filteredRoster = rosterData.filter((row) => {
    const matchesSearch =
      row.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = !gradeFilter || row.grade === gradeFilter;
    const matchesStatus = !statusFilter || row.status === statusFilter;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  // Pagination slice
  const totalRosterPages = Math.ceil(filteredRoster.length / itemsPerPage);
  const paginatedRoster = filteredRoster.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalStudents = filteredRoster.length;
  const passCount = filteredRoster.filter((r) => r.status === "Pass").length;
  const failCount = filteredRoster.filter((r) => r.status === "Fail").length;
  const finalizedCount = filteredRoster.filter((r) => !r.isDraft).length;
  const publishedCount = filteredRoster.filter((r) => r.isPublished).length;
  const passRate = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0;

  // -------------------------------------------------------------
  // Input editing handlers
  // -------------------------------------------------------------
  const handleMarkChange = (
    studentId: string,
    field: "theoryMarks" | "practicalMarks" | "internalMarks" | "assignmentMarks" | "vivaMarks",
    value: string
  ) => {
    const numericValue = value === "" ? 0 : Math.max(0, Number(value));
    
    // Check upper boundary depending on field
    let maxLimit = 100;
    if (field === "theoryMarks") maxLimit = maxTheory;
    if (field === "practicalMarks") maxLimit = maxPractical;
    if (field === "internalMarks") maxLimit = maxInternal;
    if (field === "assignmentMarks") maxLimit = maxAssignment;
    if (field === "vivaMarks") maxLimit = maxViva;

    if (numericValue > maxLimit) {
      toast.error(`Marks cannot exceed the maximum configured limit of ${maxLimit}`);
      return;
    }

    const currentEdit = editedMarks[studentId] || {
      theoryMarks: 0,
      practicalMarks: 0,
      internalMarks: 0,
      assignmentMarks: 0,
      vivaMarks: 0,
    };

    const saved = getSavedRecord(studentId);
    if (saved) {
      // populate remaining fields from saved if not in edit state yet
      if (!editedMarks[studentId]) {
        currentEdit.theoryMarks = saved.theoryMarks;
        currentEdit.practicalMarks = saved.practicalMarks;
        currentEdit.internalMarks = saved.internalMarks;
        currentEdit.assignmentMarks = saved.assignmentMarks;
        currentEdit.vivaMarks = saved.vivaMarks;
      }
    }

    currentEdit[field] = numericValue;

    setEditedMarks({
      ...editedMarks,
      [studentId]: currentEdit,
    });
  };

  const resetLocalEdits = () => {
    setEditedMarks({});
    toast.success("Discarded unsaved inline inputs");
  };

  // -------------------------------------------------------------
  // Action Handlers
  // -------------------------------------------------------------
  const handleSaveAll = (isDraft: boolean) => {
    if (!selectedCourseId) {
      toast.error("Please choose a course first");
      return;
    }

    // Prepare list of entries to save
    // If we have local edits, use them; otherwise, compile the whole filtered roster to commit.
    const recordsToCommit = filteredRoster.map((row) => {
      return {
        studentId: row.studentId,
        studentName: row.fullName,
        courseId: selectedCourseId,
        academicYear,
        examType,
        department,
        branch,
        semester,
        section,
        theoryMarks: row.theory,
        practicalMarks: row.practical,
        internalMarks: row.internal,
        assignmentMarks: row.assignment,
        vivaMarks: row.viva,
        maxTheory,
        maxPractical,
        maxInternal,
        maxAssignment,
        maxViva,
        isDraft,
      };
    });

    if (recordsToCommit.length === 0) {
      toast.error("No students to record marks for");
      return;
    }

    const modeText = isDraft ? "Save Draft" : "Final Submission";
    const confirmMessage = isDraft
      ? "Save draft marks for all students? These will remain editable."
      : "Submit final marks? Final submissions lock editing for faculty. Only Principal/Admin can unlock.";

    if (confirm(confirmMessage)) {
      saveMarksMutation.mutate(recordsToCommit);
    }
  };

  // CSV Template download
  const handleDownloadTemplate = () => {
    if (studentsInClass.length === 0) {
      toast.error("Roster is empty. Choose a course first.");
      return;
    }
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += "Student Name,Enrollment/Scholar ID,Theory Marks,Practical Marks,Internal Marks,Assignment Marks,Viva Marks\n";
    studentsInClass.forEach((st) => {
      const saved = getSavedRecord(st.studentId);
      csv += `"${st.fullName}","${st.studentId}",${saved ? saved.theoryMarks : 0},${saved ? saved.practicalMarks : 0},${saved ? saved.internalMarks : 0},${saved ? saved.assignmentMarks : 0},${saved ? saved.vivaMarks : 0}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Marks_Entry_Template_${academicYear}_${examType.replace(/\s+/g, "_")}.csv`;
    link.click();
    toast.success("Roster template CSV downloaded!");
  };

  // CSV Import parser
  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length <= 1) {
          toast.error("Empty or invalid CSV file");
          return;
        }

        // Parse rows
        const header = lines[0].split(",");
        const parsedEdits: typeof editedMarks = {};

        for (let i = 1; i < lines.length; i++) {
          const rowValues = lines[i].split(",").map((v) => v.replace(/^"|"$/g, "").trim());
          if (rowValues.length < 2) continue;

          const studentId = rowValues[1]; // Enrollment ID column
          // Verify if student is in our active course list
          const isInClass = studentsInClass.some((s) => s.studentId === studentId);
          if (!isInClass) continue;

          const theory = Math.min(maxTheory, Math.max(0, Number(rowValues[2] || 0)));
          const practical = Math.min(maxPractical, Math.max(0, Number(rowValues[3] || 0)));
          const internal = Math.min(maxInternal, Math.max(0, Number(rowValues[4] || 0)));
          const assignment = Math.min(maxAssignment, Math.max(0, Number(rowValues[5] || 0)));
          const viva = Math.min(maxViva, Math.max(0, Number(rowValues[6] || 0)));

          parsedEdits[studentId] = {
            theoryMarks: theory,
            practicalMarks: practical,
            internalMarks: internal,
            assignmentMarks: assignment,
            vivaMarks: viva,
          };
        }

        if (Object.keys(parsedEdits).length === 0) {
          toast.error("No matching student IDs found in the uploaded file");
        } else {
          setEditedMarks({ ...editedMarks, ...parsedEdits });
          toast.success(`Successfully loaded marks for ${Object.keys(parsedEdits).length} students from CSV! Please review calculations and click Save.`);
        }
      } catch (err) {
        toast.error("Error reading CSV file. Ensure columns strictly match template format.");
      }
    };
    reader.readAsText(file);
    // clear value to allow subsequent loads
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Principal bulk publish
  const handleBulkPublishToggle = (publish: boolean) => {
    const recordIds = filteredRoster.map((r) => r.savedRecordId).filter(Boolean) as string[];
    if (recordIds.length === 0) {
      toast.error("No saved records to publish");
      return;
    }
    if (confirm(`Are you sure you want to ${publish ? "publish" : "hide"} results for all ${recordIds.length} saved records?`)) {
      publishMutation.mutate({ recordIds, publish });
    }
  };

  // Helper status color badges
  const getGradeBadge = (g: string) => {
    switch (g) {
      case "O":
        return "text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20";
      case "A+":
      case "A":
        return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
      case "B":
      case "C":
        return "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
      case "D":
        return "text-slate-700 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20";
      default:
        return "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20";
    }
  };

  // -------------------------------------------------------------
  // STUDENT PORTAL GRADE CARD VIEW
  // -------------------------------------------------------------
  if (user?.role === "student") {
    // Student can only see their published scores
    const myPublishedMarks = examMarks;
    const studentTotal = myPublishedMarks.length;
    const studentPass = myPublishedMarks.filter((a) => a.status === "Pass").length;
    const averagePercent =
      studentTotal > 0
        ? myPublishedMarks.reduce((acc, curr) => acc + curr.percentage, 0) / studentTotal
        : 0;

    const filteredPublishedMarks = myPublishedMarks.filter((record) => {
      const course = courses.find((c) => c.id === record.courseId);
      const courseName = course ? `${course.code} ${course.name}` : "";
      const matchesSearch =
        !searchTerm.trim() ||
        courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.examType.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <Award className="h-6 w-6 text-indigo-500" />
            My Semester Examinations Results
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Official terminal transcripts published by the Office of the Controller of Examinations.
          </p>
        </div>

        {/* Dashboard Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
              Cumulative Percentage
            </span>
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-2 block">
              {averagePercent.toFixed(1)}%
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Calculated across {studentTotal} published modules</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Passed Subjects</span>
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-2 block">
              {studentPass}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Cleared modules with score &gt;= 40%</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm">
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Failing Grades</span>
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-2 block">
              {studentTotal - studentPass}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Modules needing remedial or supplementary evaluation</p>
          </div>
        </div>

        {/* Grade transcript ledger */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-base flex items-center gap-1.5">
              <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
              Academic Grade Ledger Card
            </h3>

            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search subject code or exam..."
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
                  <th className="p-3">Subject</th>
                  <th className="p-3">Exam Type</th>
                  <th className="p-3">Session</th>
                  <th className="p-3 text-center">Theory</th>
                  <th className="p-3 text-center">Practical</th>
                  <th className="p-3 text-center">Internal</th>
                  <th className="p-3 text-center">Assign.</th>
                  <th className="p-3 text-center">Viva</th>
                  <th className="p-3 text-center">Total Score</th>
                  <th className="p-3 text-center">Percentage</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingMarks ? (
                  <tr>
                    <td colSpan={12} className="text-center p-8 text-slate-400 font-mono">
                      Loading grade transcript card...
                    </td>
                  </tr>
                ) : filteredPublishedMarks.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center p-12 text-slate-400">
                      No examination marks published yet for your academic profile.
                    </td>
                  </tr>
                ) : (
                  filteredPublishedMarks.map((record) => {
                    const course = courses.find((c) => c.id === record.courseId);
                    const totalMax = record.maxTheory + record.maxPractical + record.maxInternal + record.maxAssignment + record.maxViva;
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition text-xs"
                      >
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                            {course ? `${course.code} - ${course.name}` : "Unknown Course"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-zinc-300">{record.examType}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                          {record.academicYear} | {record.semester}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-zinc-300">
                          {record.theoryMarks}/{record.maxTheory}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-zinc-300">
                          {record.practicalMarks}/{record.maxPractical}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-zinc-300">
                          {record.internalMarks}/{record.maxInternal}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-zinc-300">
                          {record.assignmentMarks}/{record.maxAssignment}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-zinc-300">
                          {record.vivaMarks}/{record.maxViva}
                        </td>
                        <td className="p-3 text-center font-semibold font-mono text-slate-900 dark:text-white">
                          {record.totalMarks}/{totalMax}
                        </td>
                        <td className="p-3 text-center font-semibold font-mono text-indigo-600 dark:text-indigo-400">
                          {record.percentage.toFixed(1)}%
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold border rounded-full ${getGradeBadge(record.grade)}`}>
                            {record.grade}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                              record.status === "Pass" ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {record.status === "Pass" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {record.status}
                          </span>
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

  // -------------------------------------------------------------
  // FACULTY & PRINCIPAL CONSOLE VIEW
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <Award className="h-6 w-6 text-indigo-500" />
            Examination Marks Entry Console
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            {user?.role === "principal"
              ? "Principal office administrative panel to audit, toggle publication, and unlock student term grades."
              : "Faculty portal to record and submit session, practical, assignment, and terminal grades."}
          </p>
        </div>

        {/* Sub-Tabs: Marks Entry vs Audit Log */}
        <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <button
            onClick={() => setActiveSubTab("entry")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeSubTab === "entry"
                ? "bg-white dark:bg-zinc-850 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Marks Entry
          </button>
          <button
            onClick={() => setActiveSubTab("audit")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeSubTab === "audit"
                ? "bg-white dark:bg-zinc-850 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Audit History
          </button>
        </div>
      </div>

      {activeSubTab === "audit" ? (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-sm">
          <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-base mb-4 flex items-center gap-1.5">
            <Activity className="h-5 w-5 text-indigo-500" />
            Examination Database Log Audit Trail
          </h3>
          <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-mono font-semibold border-b border-slate-200 dark:border-zinc-800 text-[10px]">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Authorized Operator</th>
                  <th className="p-3">Event Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-400 font-sans">
                      No logs currently recorded inside exam transaction history.
                    </td>
                  </tr>
                ) : (
                  auditLogs
                    .slice()
                    .reverse()
                    .map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-[11px] text-slate-400 dark:text-zinc-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-zinc-300 font-semibold">
                          {log.userEmail} <span className="font-normal text-[10px] text-slate-400">({log.userId})</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                              log.action.includes("Saved")
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : log.action.includes("Subm")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-zinc-400 font-sans">{log.details}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left panel: Filters & Max limits configs */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm">
              <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 mb-4 text-sm flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-indigo-500" />
                Select Term & Class
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                    Academic Year
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                    Examination Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Internal Test 1">Internal Test 1</option>
                    <option value="Internal Test 2">Internal Test 2</option>
                    <option value="Mid-Semester Examination">Mid-Semester Exam</option>
                    <option value="End-Semester Examination">End-Semester Exam</option>
                    <option value="Practical Laboratory Exam">Practical Lab Exam</option>
                    <option value="Viva Voce">Viva Voce</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                    Branch
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CS Engineering">CS Engineering</option>
                    <option value="Applied Math">Applied Math</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                      Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <option key={idx} value={`Semester ${idx + 1}`}>
                          Sem {idx + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
                      Section
                    </label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Section A">Sec A</option>
                      <option value="Section B">Sec B</option>
                      <option value="Section C">Sec C</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                    Subject Assigned
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      setEditedMarks({});
                      setCurrentPage(1);
                    }}
                    className="w-full bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900 rounded px-2.5 py-1.5 text-xs text-indigo-900 dark:text-indigo-200 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Select Subject --</option>
                    {filteredCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {selectedCourseId && (
              <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm">
                <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 mb-3 text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Config Maximum Limits
                </h3>
                <p className="text-[10px] text-slate-400 mb-3">
                  Tweak the upper boundaries for marks calculations below.
                </p>

                <div className="flex flex-col gap-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-600 dark:text-zinc-400 font-sans">Max Theory:</span>
                    <input
                      type="number"
                      value={maxTheory}
                      onChange={(e) => setMaxTheory(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center border rounded bg-slate-50 dark:bg-zinc-900 px-1 py-0.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-600 dark:text-zinc-400 font-sans">Max Practical:</span>
                    <input
                      type="number"
                      value={maxPractical}
                      onChange={(e) => setMaxPractical(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center border rounded bg-slate-50 dark:bg-zinc-900 px-1 py-0.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-600 dark:text-zinc-400 font-sans">Max Internal:</span>
                    <input
                      type="number"
                      value={maxInternal}
                      onChange={(e) => setMaxInternal(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center border rounded bg-slate-50 dark:bg-zinc-900 px-1 py-0.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-600 dark:text-zinc-400 font-sans">Max Assignment:</span>
                    <input
                      type="number"
                      value={maxAssignment}
                      onChange={(e) => setMaxAssignment(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center border rounded bg-slate-50 dark:bg-zinc-900 px-1 py-0.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-600 dark:text-zinc-400 font-sans">Max Viva:</span>
                    <input
                      type="number"
                      value={maxViva}
                      onChange={(e) => setMaxViva(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center border rounded bg-slate-50 dark:bg-zinc-900 px-1 py-0.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-dashed my-1 pt-2 flex justify-between font-bold text-slate-800 dark:text-white">
                    <span className="font-sans">Max Total Scope:</span>
                    <span>{maxTheory + maxPractical + maxInternal + maxAssignment + maxViva}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Active entry list & spreadsheet console */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {!selectedCourseId ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 p-16 text-center flex flex-col items-center justify-center gap-3">
                <Award className="h-14 w-14 text-slate-300 dark:text-zinc-700 animate-pulse" />
                <div className="font-grotesk font-semibold text-base text-slate-700 dark:text-zinc-300">
                  Marks Console Standby
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-md">
                  Choose an assigned subject from the sidebar filter list to generate student spreadsheets, configure marking boundaries, and input grades.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-sm flex flex-col gap-5">
                {/* Stats row for current active class */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 dark:bg-zinc-900/50 p-4 border border-slate-200 dark:border-zinc-800/80 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Students Roster</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-zinc-200 font-mono mt-0.5">
                      {totalStudents}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Pass Rate GPA</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {passRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Failing Count</span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                      {failCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">Finalized Subm.</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 animate-pulse">
                      {finalizedCount}/{totalStudents}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Published Portal</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                      {publishedCount}/{totalStudents}
                    </span>
                  </div>
                </div>

                {/* Spreadsheet Controls: Template download, bulk Excel CSV imports, search and filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-900 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 transition shadow-sm"
                      title="Download clean CSV spreadsheet with roster names prefilled"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Get Roster CSV Template
                    </button>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-300 dark:border-zinc-850 cursor-pointer transition shadow-sm">
                      <Upload className="h-3.5 w-3.5 text-amber-500" />
                      Upload Grades CSV
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        className="hidden"
                        onChange={handleUploadCSV}
                      />
                    </label>

                    {user?.role === "principal" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleBulkPublishToggle(true)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 transition shadow-sm"
                          title="Make student results immediately viewable"
                        >
                          Publish Results
                        </button>
                        <button
                          onClick={() => handleBulkPublishToggle(false)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition shadow-sm"
                          title="Hide student results from portal"
                        >
                          Hide Results
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 max-w-md w-full">
                    <div className="relative flex-1 w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                        <Search className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search student or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1 w-full sm:w-auto">
                      <select
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 text-[11px] rounded-lg px-2 py-1.5 text-slate-700 dark:text-zinc-300 focus:outline-none"
                      >
                        <option value="">All Grades</option>
                        {["O", "A+", "A", "B", "C", "D", "F"].map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 text-[11px] rounded-lg px-2 py-1.5 text-slate-700 dark:text-zinc-300 focus:outline-none"
                      >
                        <option value="">All Statuses</option>
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Interactive Grid Table */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-mono font-semibold border-b border-slate-200 dark:border-zinc-800 text-[10px]">
                        <th className="p-3 w-[20%]">Student Name & ID</th>
                        <th className="p-3 text-center">Theory ({maxTheory})</th>
                        <th className="p-3 text-center">Practical ({maxPractical})</th>
                        <th className="p-3 text-center">Internal ({maxInternal})</th>
                        <th className="p-3 text-center">Assignment ({maxAssignment})</th>
                        <th className="p-3 text-center">Viva ({maxViva})</th>
                        <th className="p-3 text-center">Total Score</th>
                        <th className="p-3 text-center">Pass %</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRoster.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center p-12 text-slate-400">
                            No students enrolled in this section or matching your filtering query.
                          </td>
                        </tr>
                      ) : (
                        paginatedRoster.map((row) => {
                          const saved = getSavedRecord(row.studentId);
                          const isFinalized = saved ? !saved.isDraft : false;
                          const isPublished = saved ? saved.isPublished : false;

                          return (
                            <tr
                              key={row.studentId}
                              className={`border-b border-slate-100 dark:border-zinc-900 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition text-xs ${
                                isFinalized ? "bg-slate-50/40 dark:bg-zinc-950/20" : ""
                              }`}
                            >
                              <td className="p-3 font-semibold text-slate-800 dark:text-zinc-200">
                                <span className="block">{row.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  ID: {row.studentId}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  value={row.theory}
                                  disabled={isFinalized && user?.role !== "principal"}
                                  onChange={(e) => handleMarkChange(row.studentId, "theoryMarks", e.target.value)}
                                  className={`w-14 text-center text-xs p-1 border rounded bg-white dark:bg-zinc-900 focus:outline-none focus:border-indigo-500 font-mono ${
                                    isFinalized ? "text-slate-400 bg-slate-50/50 dark:bg-zinc-900/40 border-slate-100" : ""
                                  }`}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  value={row.practical}
                                  disabled={isFinalized && user?.role !== "principal"}
                                  onChange={(e) => handleMarkChange(row.studentId, "practicalMarks", e.target.value)}
                                  className={`w-14 text-center text-xs p-1 border rounded bg-white dark:bg-zinc-900 focus:outline-none focus:border-indigo-500 font-mono ${
                                    isFinalized ? "text-slate-400 bg-slate-50/50 dark:bg-zinc-900/40 border-slate-100" : ""
                                  }`}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  value={row.internal}
                                  disabled={isFinalized && user?.role !== "principal"}
                                  onChange={(e) => handleMarkChange(row.studentId, "internalMarks", e.target.value)}
                                  className={`w-14 text-center text-xs p-1 border rounded bg-white dark:bg-zinc-900 focus:outline-none focus:border-indigo-500 font-mono ${
                                    isFinalized ? "text-slate-400 bg-slate-50/50 dark:bg-zinc-900/40 border-slate-100" : ""
                                  }`}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  value={row.assignment}
                                  disabled={isFinalized && user?.role !== "principal"}
                                  onChange={(e) => handleMarkChange(row.studentId, "assignmentMarks", e.target.value)}
                                  className={`w-14 text-center text-xs p-1 border rounded bg-white dark:bg-zinc-900 focus:outline-none focus:border-indigo-500 font-mono ${
                                    isFinalized ? "text-slate-400 bg-slate-50/50 dark:bg-zinc-900/40 border-slate-100" : ""
                                  }`}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  value={row.viva}
                                  disabled={isFinalized && user?.role !== "principal"}
                                  onChange={(e) => handleMarkChange(row.studentId, "vivaMarks", e.target.value)}
                                  className={`w-14 text-center text-xs p-1 border rounded bg-white dark:bg-zinc-900 focus:outline-none focus:border-indigo-500 font-mono ${
                                    isFinalized ? "text-slate-400 bg-slate-50/50 dark:bg-zinc-900/40 border-slate-100" : ""
                                  }`}
                                />
                              </td>
                              <td className="p-3 text-center font-bold font-mono text-slate-900 dark:text-white">
                                {row.total}
                              </td>
                              <td className="p-3 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                {row.percentage.toFixed(0)}%
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-full ${getGradeBadge(row.grade)}`}>
                                  {row.grade}
                                </span>
                              </td>
                              <td className="p-3 text-center font-semibold">
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    row.status === "Pass" ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {row.status === "Pass" ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  {row.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {row.isEdited && (
                                    <span className="text-[10px] text-amber-500 font-semibold uppercase font-mono animate-pulse bg-amber-50 dark:bg-amber-950/20 px-1 rounded">
                                      Unsaved
                                    </span>
                                  )}

                                  {isFinalized ? (
                                    <div className="flex items-center gap-1">
                                      <span title="Locked: Final marks submitted">
                                        <Lock className="h-3.5 w-3.5 text-rose-500" />
                                      </span>
                                      {user?.role === "principal" && (
                                        <button
                                          onClick={() => {
                                            if (confirm(`Unlock marks record of ${row.fullName} for editing?`)) {
                                              unlockMutation.mutate(saved!.id);
                                            }
                                          }}
                                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-300"
                                          title="Unlock grade card"
                                        >
                                          <Unlock className="h-3 w-3 text-indigo-500" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span title="Draft state: Editable">
                                      <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                                    </span>
                                  )}

                                  {isPublished && (
                                    <span title="Published: Visible on student portal">
                                      <Eye className="h-3.5 w-3.5 text-indigo-500" />
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalRosterPages > 1 && (
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <span className="text-[11px] text-slate-500">
                      Showing Page <b>{currentPage}</b> of <b>{totalRosterPages}</b> (Total {filteredRoster.length} students)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 text-[11px] border rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-50 dark:bg-zinc-900"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalRosterPages, currentPage + 1))}
                        disabled={currentPage === totalRosterPages}
                        className="px-2.5 py-1 text-[11px] border rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-50 dark:bg-zinc-900"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Form submit/draft actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-zinc-900 pt-4">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
                    <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span>
                      <b>Rule:</b> Once submitted as final, faculty cannot edit marks unless unlocked by the Principal/Administrator.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {Object.keys(editedMarks).length > 0 && (
                      <button
                        onClick={resetLocalEdits}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset Input Changes
                      </button>
                    )}

                    <button
                      onClick={() => handleSaveAll(true)}
                      disabled={saveMarksMutation.isPending}
                      className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-sans text-xs font-semibold text-slate-700 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:text-zinc-300 transition flex items-center gap-1.5 shadow-sm"
                    >
                      Save Draft Spreadsheet
                    </button>

                    <button
                      onClick={() => handleSaveAll(false)}
                      disabled={saveMarksMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      Final Submit & Lock Marks
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
