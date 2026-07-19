import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, toggleTheme } from "../lib/store";
import { 
  Database, 
  Key, 
  Link2, 
  HelpCircle, 
  Layers, 
  Users, 
  BookOpen, 
  Award, 
  Library as LibraryIcon, 
  Bell, 
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Sun,
  Moon
} from "lucide-react";

interface TableField {
  name: string;
  type: string;
  key?: "PK" | "FK" | "PK/FK";
  references?: string;
  description: string;
}

interface DBTable {
  name: string;
  category: "Academic Core" | "People & Security" | "Evaluation" | "Library" | "Communication";
  description: string;
  fields: TableField[];
}

const tablesData: DBTable[] = [
  {
    name: "Users",
    category: "People & Security",
    description: "Central registry for all system actors. Controls role-based authentication and links profiles.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique identifier for the user" },
      { name: "email", type: "varchar(255)", description: "Academic or institutional email address (unique)" },
      { name: "password_hash", type: "varchar(512)", description: "Securely salted hash for credentials verification" },
      { name: "role", type: "enum", description: "Role enum: Admin, Principal, Faculty, Student, Librarian" },
      { name: "fullName", type: "varchar(100)", description: "User's complete official name" },
      { name: "departmentId", type: "uuid", key: "FK", references: "Departments.id", description: "Foreign key linking user's department affiliation (nullable)" },
      { name: "phone", type: "varchar(20)", description: "Primary contact phone number" },
      { name: "createdAt", type: "timestamp", description: "Timestamp of record initiation" }
    ]
  },
  {
    name: "Departments",
    category: "Academic Core",
    description: "Main institutional branches representing academic departments (e.g., Computer Science, Mechanical).",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique identifier for the department" },
      { name: "name", type: "varchar(100)", description: "Full descriptive name of department" },
      { name: "code", type: "varchar(10)", description: "Unique academic code (e.g., CSE, MECH)" },
      { name: "createdAt", type: "timestamp", description: "Timestamp of department creation" }
    ]
  },
  {
    name: "Branches",
    category: "Academic Core",
    description: "Specialized subdivisions or programs within a department (e.g., Software Engineering specialization).",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique identifier for the branch" },
      { name: "name", type: "varchar(100)", description: "Full descriptive name of the program branch" },
      { name: "code", type: "varchar(10)", description: "Unique branch subcode" },
      { name: "departmentId", type: "uuid", key: "FK", references: "Departments.id", description: "Links branch to its parent academic department" }
    ]
  },
  {
    name: "Courses",
    category: "Academic Core",
    description: "Curriculum specifications or active class models offered by departments.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique course identifier" },
      { name: "code", type: "varchar(20)", description: "Catalog code (e.g., CS-301)" },
      { name: "name", type: "varchar(150)", description: "Full course name" },
      { name: "departmentId", type: "uuid", key: "FK", references: "Departments.id", description: "Department offering this course" },
      { name: "credits", type: "integer", description: "Number of academic credits allocated (usually 1-5)" },
      { name: "description", type: "text", description: "Detailed summary of syllabus/scope" },
      { name: "facultyId", type: "uuid", key: "FK", references: "Users.id", description: "Faculty assigned to coordinate/teach this course" },
      { name: "timeSlot", type: "varchar(50)", description: "Assigned active instruction window (e.g. Mon/Wed 09:00-10:30)" },
      { name: "room", type: "varchar(20)", description: "Lecture hall or laboratory identifier" }
    ]
  },
  {
    name: "Semesters",
    category: "Academic Core",
    description: "Active academic blocks structuring courses, schedules, and grading boundaries.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique semester identifier" },
      { name: "academicYear", type: "varchar(20)", description: "Calendar span (e.g. 2026-2027)" },
      { name: "termName", type: "varchar(30)", description: "Academic term designation (e.g. Fall, Spring, Summer)" },
      { name: "status", type: "enum", description: "Active or archival state tracking (Active, Past, Future)" }
    ]
  },
  {
    name: "Subjects",
    category: "Academic Core",
    description: "Modular courses units map under courses syllabus or semester plans.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique subject identifier" },
      { name: "code", type: "varchar(20)", description: "Catalog identification number" },
      { name: "name", type: "varchar(100)", description: "Syllabus item name" },
      { name: "courseId", type: "uuid", key: "FK", references: "Courses.id", description: "Link to parent academic course" },
      { name: "credits", type: "integer", description: "Credit volume representation" }
    ]
  },
  {
    name: "FacultyAssignments",
    category: "Academic Core",
    description: "Junction table mapping Many-to-Many relationships between Faculty, Subjects, and active semesters.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique junction row identifier" },
      { name: "facultyId", type: "uuid", key: "FK", references: "Users.id", description: "Link to user (must hold Faculty role)" },
      { name: "subjectId", type: "uuid", key: "FK", references: "Subjects.id", description: "Link to specific subject under instruction" },
      { name: "semesterId", type: "uuid", key: "FK", references: "Semesters.id", description: "Active academic term reference" }
    ]
  },
  {
    name: "Timetable",
    category: "Academic Core",
    description: "Scheduled slots mapping structural timetable matrices.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique slot key" },
      { name: "courseId", type: "uuid", key: "FK", references: "Courses.id", description: "Affiliated course framework" },
      { name: "subjectId", type: "uuid", key: "FK", references: "Subjects.id", description: "Active syllabus subject being taught" },
      { name: "dayOfWeek", type: "integer", description: "Numeric weekday index (1=Monday to 6=Saturday)" },
      { name: "startTime", type: "time", description: "Instruction start time offset" },
      { name: "endTime", type: "time", description: "Instruction completion threshold" },
      { name: "room", type: "varchar(50)", description: "Physical classroom or virtual link URL reference" }
    ]
  },
  {
    name: "Attendance",
    category: "Evaluation",
    description: "Daily or session-by-session presence tracking ledger of enrolled students in courses.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique ledger key" },
      { name: "studentId", type: "uuid", key: "FK", references: "Users.id", description: "Enrolled scholar whose presence is logged" },
      { name: "courseId", type: "uuid", key: "FK", references: "Courses.id", description: "Target academic instruction course" },
      { name: "date", type: "date", description: "Target attendance session calendar date" },
      { name: "status", type: "enum", description: "Participation state marker (Present, Absent, Excused)" }
    ]
  },
  {
    name: "Examinations",
    category: "Evaluation",
    description: "Formative and summative assessment schedules (e.g. midterms, quizzes, semester projects).",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique examination identifier" },
      { name: "name", type: "varchar(100)", description: "Title of exam (e.g. End-Term Theory)" },
      { name: "type", type: "enum", description: "Examination classification: Midterm, Final, Quiz, Assignment" },
      { name: "subjectId", type: "uuid", key: "FK", references: "Subjects.id", description: "Subject module under assessment" },
      { name: "date", type: "timestamp", description: "Assessment execution scheduling threshold" },
      { name: "maxMarks", type: "decimal", description: "Maximum potential grade baseline score" }
    ]
  },
  {
    name: "Marks",
    category: "Evaluation",
    description: "The official academic ledger storing specific grades received by students for individual examinations.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique marks grade reference" },
      { name: "examinationId", type: "uuid", key: "FK", references: "Examinations.id", description: "Linked evaluation threshold rubric" },
      { name: "studentId", type: "uuid", key: "FK", references: "Users.id", description: "Student evaluated" },
      { name: "scoreObtained", type: "decimal", description: "Exact numeric grade points scored" },
      { name: "evaluatedBy", type: "uuid", key: "FK", references: "Users.id", description: "Faculty examiner or grader ID reference" }
    ]
  },
  {
    name: "LibraryBooks",
    category: "Library",
    description: "Physical and digital assets cataloged under the college library repository.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique book reference catalog key" },
      { name: "title", type: "varchar(255)", description: "Asset full title" },
      { name: "author", type: "varchar(150)", description: "Author name cataloging details" },
      { name: "isbn", type: "varchar(50)", description: "Unique International Standard Book Number" },
      { name: "categoryId", type: "uuid", key: "FK", references: "LibraryCategories.id", description: "Links book asset to structural classification" },
      { name: "totalCopies", type: "integer", description: "Gross physical book volume inventory" },
      { name: "availableCopies", type: "integer", description: "Current count of assets available for checkouts" }
    ]
  },
  {
    name: "LibraryCategories",
    category: "Library",
    description: "Academic or genre disciplines structuring the library inventory hierarchy.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique classification key" },
      { name: "name", type: "varchar(100)", description: "Discipline name (e.g. Science, Computing)" },
      { name: "description", type: "text", description: "Scope and category parameters" }
    ]
  },
  {
    name: "LibraryIssues",
    category: "Library",
    description: "Loan transaction ledger storing checkouts, due dates, and structural borrow states.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique loan transaction identifier" },
      { name: "bookId", type: "uuid", key: "FK", references: "LibraryBooks.id", description: "Borrowed physical catalog asset key" },
      { name: "studentId", type: "uuid", key: "FK", references: "Users.id", description: "Linked borrower student ID" },
      { name: "issuedBy", type: "uuid", key: "FK", references: "Users.id", description: "Librarian official executing the check-out transaction" },
      { name: "borrowDate", type: "date", description: "Loan execution date" },
      { name: "dueDate", type: "date", description: "Required physical return date limit" },
      { name: "returnDate", type: "date", description: "Actual date of check-in receipt (nullable)" },
      { name: "status", type: "enum", description: "Current borrow cycle (Borrowed, Returned, Overdue)" }
    ]
  },
  {
    name: "Notifications",
    category: "Communication",
    description: "Broadcast logs and personalized notifications for users across various system modules.",
    fields: [
      { name: "id", type: "uuid", key: "PK", description: "Unique broadcast log identifier" },
      { name: "userId", type: "uuid", key: "FK", references: "Users.id", description: "Target user recipient (nullable for general public announcements)" },
      { name: "title", type: "varchar(150)", description: "Abridged alert heading" },
      { name: "content", type: "text", description: "Full detailed notification announcement content body" },
      { name: "isRead", type: "boolean", description: "Read status receipt verification flag" },
      { name: "createdAt", type: "timestamp", description: "Notification generation timestamp threshold" }
    ]
  }
];

const categoryColors: Record<string, { bg: string, text: string, border: string, accentBg: string, accentText: string }> = {
  "Academic Core": { bg: "bg-indigo-50/70", text: "text-indigo-900", border: "border-indigo-200", accentBg: "bg-indigo-600", accentText: "text-white" },
  "People & Security": { bg: "bg-teal-50/70", text: "text-teal-900", border: "border-teal-200", accentBg: "bg-teal-600", accentText: "text-white" },
  "Evaluation": { bg: "bg-amber-50/70", text: "text-amber-900", border: "border-amber-200", accentBg: "bg-amber-600", accentText: "text-white" },
  "Library": { bg: "bg-rose-50/70", text: "text-rose-900", border: "border-rose-200", accentBg: "bg-rose-600", accentText: "text-white" },
  "Communication": { bg: "bg-sky-50/70", text: "text-sky-900", border: "border-sky-200", accentBg: "bg-sky-600", accentText: "text-white" },
};

const categoryColorsDark: Record<string, { bg: string, text: string, border: string, accentBg: string, accentText: string }> = {
  "Academic Core": { bg: "bg-indigo-950/40", text: "text-indigo-300", border: "border-indigo-900/60", accentBg: "bg-indigo-500", accentText: "text-white" },
  "People & Security": { bg: "bg-teal-950/40", text: "text-teal-300", border: "border-teal-900/60", accentBg: "bg-teal-500", accentText: "text-white" },
  "Evaluation": { bg: "bg-amber-950/40", text: "text-amber-300", border: "border-amber-900/60", accentBg: "bg-amber-500", accentText: "text-white" },
  "Library": { bg: "bg-rose-950/40", text: "text-rose-300", border: "border-rose-900/60", accentBg: "bg-rose-500", accentText: "text-white" },
  "Communication": { bg: "bg-sky-950/40", text: "text-sky-300", border: "border-sky-900/60", accentBg: "bg-sky-500", accentText: "text-white" },
};

export const ERDiagram: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.app.theme);
  const lightMode = theme === "light";
  const [selectedTable, setSelectedTable] = useState<string | null>("Users");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedTableFields, setExpandedTableFields] = useState<Record<string, boolean>>({
    Users: true,
    Courses: true
  });

  const categories = ["All", "Academic Core", "People & Security", "Evaluation", "Library", "Communication"];

  const toggleExpand = (tableName: string) => {
    setExpandedTableFields(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const filteredTables = tablesData.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          table.fields.some(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          table.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || table.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate connections for the selected table
  const selectedTableObj = tablesData.find(t => t.name === selectedTable);
  const connections = selectedTableObj ? tablesData.filter(t => {
    if (t.name === selectedTable) return false;
    // Selected references t
    const referencesTarget = selectedTableObj.fields.some(f => f.references?.startsWith(t.name + "."));
    // t references selected
    const referencedByTarget = t.fields.some(f => f.references?.startsWith(selectedTable + "."));
    return referencesTarget || referencedByTarget;
  }).map(t => {
    const referencesTarget = selectedTableObj.fields.filter(f => f.references?.startsWith(t.name + "."));
    const referencedByTarget = t.fields.filter(f => f.references?.startsWith(selectedTable + "."));
    return {
      tableName: t.name,
      category: t.category,
      relationship: referencesTarget.length > 0 
        ? `Foreign Key: ${selectedTable}.${referencesTarget[0].name} ➔ ${t.name}.id` 
        : `Foreign Key: ${t.name}.${referencedByTarget[0].name} ➔ ${selectedTable}.id`
    };
  }) : [];

  const themeColors = lightMode ? categoryColors : categoryColorsDark;

  return (
    <div id="er-diagram-container" className={`rounded-xl border ${lightMode ? "bg-slate-50 border-slate-200" : "bg-zinc-950 border-zinc-800"} p-6 flex flex-col gap-6 shadow-xl transition-all duration-300`}>
      {/* Visual Design Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-500">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className={`font-grotesk font-bold text-lg ${lightMode ? "text-slate-900" : "text-zinc-100"}`}>
              System Schema & ER Diagram
            </h3>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              Production-ready normalized schema structure & primary key/foreign key relation maps.
            </p>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Light/Dark Toggle */}
          <button
            onClick={() => dispatch(toggleTheme())}
            className={`p-2 rounded-lg border ${lightMode ? "bg-white text-indigo-600 border-slate-200 hover:bg-slate-50" : "bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-zinc-800"} flex items-center gap-1.5 text-xs font-medium transition`}
            title="Toggle Diagram Theme Mode"
          >
            {lightMode ? (
              <>
                <Moon className="h-4 w-4 text-slate-600" />
                <span className="hidden md:inline text-slate-700">Dark Schema</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span className="hidden md:inline text-zinc-300">Light Schema</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Database Context Alert */}
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${lightMode ? "bg-indigo-50/40 border-indigo-100 text-slate-700" : "bg-indigo-950/10 border-indigo-900/30 text-zinc-300"}`}>
        <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 font-sans text-xs">
          <span className="font-bold">Enterprise ER Schema Constraints</span>
          <p className="text-zinc-500 leading-relaxed">
            This diagram showcases the relational blueprint behind the college ERP. Relational integrity is enforced using standard <span className="font-semibold text-indigo-500">PK (Primary Key)</span> and <span className="font-semibold text-indigo-500">FK (Foreign Key)</span> constraints.
            Click on any database table card to isolate its entity relation graph and view the cascading schema relationships below.
          </p>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tables, fields, or PK/FKs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${lightMode ? "bg-white border-slate-200 text-slate-850" : "bg-zinc-900 border-zinc-800 text-zinc-100"}`}
          />
        </div>

        {/* Category Filters */}
        <div className="md:col-span-2 flex flex-wrap gap-2 items-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all duration-150 ${
                activeCategory === cat
                  ? lightMode 
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-indigo-500 text-white shadow-md"
                  : lightMode
                    ? "bg-slate-200/60 text-slate-700 hover:bg-slate-200 border border-slate-200/50"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 border border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Grid: Left Interactive Diagram & Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive ER Diagram Board (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${lightMode ? "text-slate-500" : "text-zinc-500"}`}>
              Interactive Entity Catalog ({filteredTables.length} Tables found)
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Hover items to explore structural fields
            </span>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[680px] overflow-y-auto pr-2 custom-scrollbar p-1 rounded-xl`}>
            {filteredTables.map((table) => {
              const isSelected = selectedTable === table.name;
              const isExpanded = !!expandedTableFields[table.name];
              const colors = themeColors[table.category] || themeColors["Academic Core"];

              return (
                <motion.div
                  key={table.name}
                  whileHover={{ scale: 1.015 }}
                  onClick={() => setSelectedTable(table.name)}
                  className={`rounded-xl border p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 shadow-sm ${
                    isSelected
                      ? lightMode 
                        ? "bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-md" 
                        : "bg-zinc-900 border-indigo-400 ring-2 ring-indigo-400/20 shadow-lg"
                      : lightMode
                        ? "bg-white hover:border-slate-300 border-slate-200 hover:shadow-md"
                        : "bg-zinc-900/60 hover:border-zinc-700 border-zinc-800/80 hover:shadow-lg"
                  }`}
                >
                  {/* Table Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className={`font-grotesk font-bold text-sm ${lightMode ? "text-slate-900" : "text-zinc-100"}`}>
                          {table.name}
                        </h4>
                        <span className={`text-[9px] font-semibold font-sans uppercase tracking-wider ${colors.text}`}>
                          {table.category}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(table.name);
                      }}
                      className={`p-1 rounded-md transition ${lightMode ? "hover:bg-slate-100 text-slate-500" : "hover:bg-zinc-800 text-zinc-400"}`}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Description */}
                  <p className={`text-xs ${lightMode ? "text-slate-600" : "text-zinc-400"} font-sans leading-relaxed line-clamp-2`}>
                    {table.description}
                  </p>

                  {/* Fields Block (Collapsible) */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t pt-3 border-zinc-150 dark:border-zinc-800/80 flex flex-col gap-1.5"
                      >
                        {table.fields.map((field) => (
                          <div 
                            key={field.name} 
                            className={`flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded ${
                              field.key === "PK" 
                                ? lightMode ? "bg-amber-500/5 text-amber-900" : "bg-amber-500/5 text-amber-300"
                                : field.key?.includes("FK") 
                                  ? lightMode ? "bg-indigo-500/5 text-indigo-950" : "bg-indigo-500/5 text-indigo-300"
                                  : "text-zinc-500"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-mono">
                              {field.key && (
                                <Key className={`h-3 w-3 ${field.key === "PK" ? "text-amber-500" : "text-indigo-500"}`} />
                              )}
                              <span className={`font-semibold ${lightMode ? "text-slate-850" : "text-zinc-200"}`}>{field.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              <span className="text-zinc-400">{field.type}</span>
                              {field.key && (
                                <span className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${
                                  field.key === "PK" 
                                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/10" 
                                    : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/10"
                                }`}>
                                  {field.key}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer Indicator of keys */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 border-t pt-2 border-zinc-150 dark:border-zinc-800/40">
                    <span>{table.fields.length} Columns</span>
                    <span className="flex items-center gap-1">
                      <Key className="h-2.5 w-2.5 text-amber-500" /> PK
                      <Key className="h-2.5 w-2.5 text-indigo-500 ml-1.5" /> FK
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Schema Inspector Panel (1 Col) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${lightMode ? "text-slate-500" : "text-zinc-500"}`}>
            Active Table Schema Inspector
          </span>

          {selectedTableObj ? (
            <div className={`rounded-xl border p-5 flex flex-col gap-4 ${lightMode ? "bg-white border-slate-200 shadow-sm" : "bg-zinc-900 border-zinc-800 shadow-lg"}`}>
              {/* Active Inspector Title */}
              <div className="flex items-center gap-2.5 border-b pb-3 border-zinc-200 dark:border-zinc-800">
                <div className={`p-1.5 rounded-lg ${themeColors[selectedTableObj.category].bg} ${themeColors[selectedTableObj.category].text}`}>
                  <Database className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className={`font-grotesk font-bold text-base ${lightMode ? "text-slate-900" : "text-zinc-100"}`}>
                    dbo.{selectedTableObj.name}
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">Normalized Table Metadata</span>
                </div>
              </div>

              {/* Table description */}
              <div className="flex flex-col gap-1 font-sans text-xs">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[9px]">Scope Description</span>
                <p className={`${lightMode ? "text-slate-700" : "text-zinc-300"} leading-relaxed`}>
                  {selectedTableObj.description}
                </p>
              </div>

              {/* Column Detail Inventory */}
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[9px] mb-1">Column Schematics & Constraints</span>
                
                <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {selectedTableObj.fields.map((field) => (
                    <div 
                      key={field.name} 
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 transition ${
                        field.key === "PK"
                          ? lightMode ? "bg-amber-500/5 border-amber-500/10" : "bg-amber-500/5 border-amber-500/10"
                          : field.key?.includes("FK")
                            ? lightMode ? "bg-indigo-500/5 border-indigo-500/10" : "bg-indigo-500/5 border-indigo-500/10"
                            : lightMode ? "bg-slate-50 border-slate-100" : "bg-zinc-950/60 border-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                          {field.key && <Key className={`h-3 w-3 ${field.key === "PK" ? "text-amber-500" : "text-indigo-500"}`} />}
                          <span className={lightMode ? "text-slate-900" : "text-zinc-100"}>{field.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[9px]">
                          <span className="text-zinc-400">{field.type}</span>
                          {field.key && (
                            <span className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${
                              field.key === "PK" 
                                ? "bg-amber-500/20 text-amber-500" 
                                : "bg-indigo-500/20 text-indigo-400"
                            }`}>
                              {field.key}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attribute description */}
                      <p className="text-[11px] font-sans text-zinc-500 leading-relaxed">
                        {field.description}
                      </p>

                      {/* FK Target reference */}
                      {field.references && (
                        <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-indigo-400">
                          <Link2 className="h-3 w-3 shrink-0" />
                          <span>References <strong className="underline decoration-indigo-500/30 cursor-pointer" onClick={() => setSelectedTable(field.references?.split(".")[0] || null)}>{field.references}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected relations */}
              {connections.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[9px]">Relational Integrity References</span>
                  <div className="flex flex-col gap-2">
                    {connections.map((conn) => (
                      <div 
                        key={conn.tableName}
                        onClick={() => setSelectedTable(conn.tableName)}
                        className={`p-2 rounded-lg border text-xs font-sans flex flex-col gap-0.5 cursor-pointer transition ${
                          lightMode ? "hover:bg-slate-50 border-slate-100 hover:border-slate-300" : "hover:bg-zinc-800 border-zinc-800/40 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${lightMode ? "text-slate-800" : "text-zinc-200"}`}>{conn.tableName}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">{conn.category}</span>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1 mt-0.5">
                          <Link2 className="h-2.5 w-2.5 shrink-0" />
                          {conn.relationship}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`rounded-xl border p-8 text-center flex flex-col items-center justify-center gap-2 ${lightMode ? "bg-slate-50 border-slate-200" : "bg-zinc-950 border-zinc-800"}`}>
              <HelpCircle className="h-8 w-8 text-zinc-500" />
              <p className="text-xs text-zinc-400 font-sans">
                Select a table from the catalog to inspect detailed normalized schema columns, metadata, and active relationships.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
