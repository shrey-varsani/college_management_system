import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

import { CollegeDatabase, User, Course, Enrollment, Grade, LibraryBook, LibraryBorrow, Attendance, ExamMarkEntry } from "./server/db";
import { runAutomatedScheduler } from "./server/scheduler";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "college-management-secret-key-2026";

// Parse incoming JSON requests
app.use(express.json());

// Initialize Local Database
CollegeDatabase.initialize().catch(err => {
  console.error("Failed to initialize seed database:", err);
});

// Initialize Gemini Client server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Authorization token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

// Role authorization guard
function authorizeRoles(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access forbidden: insufficient academic privilege" });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const users = CollegeDatabase.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Sign the JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        department: user.department,
        phone: user.phone,
        registrationDate: user.registrationDate,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Internal server authentication error", error: error.message });
  }
});

// Create/Register student/faculty (Principal only)
app.post("/api/auth/register", authenticateToken, authorizeRoles("principal"), async (req, res) => {
  try {
    const { email, password, role, fullName, department, phone } = req.body;
    
    if (!email || !password || !role || !fullName || !department) {
      return res.status(400).json({ message: "Missing required profile details" });
    }

    const users = CollegeDatabase.getUsers();
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: "Account with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: "usr_" + Math.random().toString(36).substr(2, 9),
      email,
      passwordHash,
      role,
      fullName,
      department,
      phone: phone || "",
      registrationDate: new Date().toISOString().split("T")[0],
    };

    users.push(newUser);
    CollegeDatabase.saveUsers(users);

    res.status(201).json({
      message: "Academic profile created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.fullName,
        department: newUser.department,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// Update profile
app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, department } = req.body;
    const users = CollegeDatabase.getUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(444).json({ message: "Profile not found" });
    }

    if (fullName) users[userIndex].fullName = fullName;
    if (phone) users[userIndex].phone = phone;
    if (department && req.user.role === "principal") users[userIndex].department = department; // Only Principal can change dept

    CollegeDatabase.saveUsers(users);
    res.json({ message: "Academic profile updated successfully", user: users[userIndex] });
  } catch (error: any) {
    res.status(500).json({ message: "Profile update failed", error: error.message });
  }
});

// Get user list (Principal/Librarian can view)
app.get("/api/users", authenticateToken, authorizeRoles("principal", "librarian"), (req, res) => {
  const users = CollegeDatabase.getUsers().map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.fullName,
    department: u.department,
    phone: u.phone,
    registrationDate: u.registrationDate
  }));
  res.json(users);
});

// Delete user profile (Principal only)
app.delete("/api/users/:id", authenticateToken, authorizeRoles("principal"), (req, res) => {
  const users = CollegeDatabase.getUsers();
  const filtered = users.filter(u => u.id !== req.params.id);
  
  if (users.length === filtered.length) {
    return res.status(404).json({ message: "User profile not found" });
  }

  CollegeDatabase.saveUsers(filtered);
  res.json({ message: "User profile archived successfully" });
});

// ==========================================
// COURSE ENDPOINTS
// ==========================================

app.get("/api/courses", authenticateToken, (req, res) => {
  const courses = CollegeDatabase.getCourses();
  res.json(courses);
});

app.post("/api/courses", authenticateToken, authorizeRoles("principal"), (req, res) => {
  const { code, name, description, credits, department } = req.body;
  if (!code || !name || !credits || !department) {
    return res.status(400).json({ message: "Incomplete course definitions" });
  }

  const courses = CollegeDatabase.getCourses();
  if (courses.some(c => c.code.toLowerCase() === code.toLowerCase())) {
    return res.status(400).json({ message: "Course code already registered" });
  }

  const newCourse: Course = {
    id: "crs_" + Math.random().toString(36).substr(2, 9),
    code,
    name,
    description: description || "",
    credits: Number(credits),
    department,
    facultyId: null,
    timeSlot: null,
    room: null
  };

  courses.push(newCourse);
  CollegeDatabase.saveCourses(courses);
  res.status(201).json(newCourse);
});

// Update specific course schedule or properties
app.put("/api/courses/:id", authenticateToken, authorizeRoles("principal", "faculty"), (req, res) => {
  const courses = CollegeDatabase.getCourses();
  const index = courses.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Instructors can only edit their own courses
  if (req.user.role === "faculty" && courses[index].facultyId !== req.user.id) {
    return res.status(403).json({ message: "Forbidden: You are not teaching this class" });
  }

  const { name, description, credits, facultyId, timeSlot, room } = req.body;
  
  if (name !== undefined) courses[index].name = name;
  if (description !== undefined) courses[index].description = description;
  if (credits !== undefined) courses[index].credits = Number(credits);
  if (facultyId !== undefined) courses[index].facultyId = facultyId;
  if (timeSlot !== undefined) courses[index].timeSlot = timeSlot;
  if (room !== undefined) courses[index].room = room;

  CollegeDatabase.saveCourses(courses);
  res.json(courses[index]);
});

// Delete Course
app.delete("/api/courses/:id", authenticateToken, authorizeRoles("principal"), (req, res) => {
  const courses = CollegeDatabase.getCourses();
  const filtered = courses.filter(c => c.id !== req.params.id);
  
  if (courses.length === filtered.length) {
    return res.status(404).json({ message: "Course not found" });
  }

  CollegeDatabase.saveCourses(filtered);
  res.json({ message: "Course removed from academic catalog" });
});

// ==========================================
// AUTOMATED COURSE SCHEDULER (Principal only)
// ==========================================
app.post("/api/courses/schedule/auto", authenticateToken, authorizeRoles("principal"), (req, res) => {
  const result = runAutomatedScheduler();
  if (result.success) {
    res.json({
      message: "Automated timetables aligned and saved successfully!",
      courses: result.courses,
      logs: result.logs
    });
  } else {
    res.status(422).json({
      message: "Scheduling constraints could not be resolved fully.",
      logs: result.logs
    });
  }
});

// ==========================================
// STUDENT ENROLLMENTS
// ==========================================

// Get enrollments (Student gets their own, Faculty gets for their courses, Principal gets all)
app.get("/api/enrollments", authenticateToken, (req, res) => {
  const enrollments = CollegeDatabase.getEnrollments();
  if (req.user.role === "student") {
    res.json(enrollments.filter(e => e.studentId === req.user.id));
  } else if (req.user.role === "faculty") {
    const courses = CollegeDatabase.getCourses().filter(c => c.facultyId === req.user.id);
    const courseIds = courses.map(c => c.id);
    res.json(enrollments.filter(e => courseIds.includes(e.courseId)));
  } else {
    res.json(enrollments);
  }
});

// Self-enroll or Principal assigns enrollments
app.post("/api/enrollments", authenticateToken, authorizeRoles("student", "principal"), (req, res) => {
  const { studentId, courseId } = req.body;
  const targetStudentId = req.user.role === "student" ? req.user.id : studentId;

  if (!courseId || !targetStudentId) {
    return res.status(400).json({ message: "Course ID and Student ID are required" });
  }

  const courses = CollegeDatabase.getCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ message: "Academic course not found" });
  }

  const enrollments = CollegeDatabase.getEnrollments();
  const alreadyEnrolled = enrollments.some(e => e.studentId === targetStudentId && e.courseId === courseId && e.status === "active");
  if (alreadyEnrolled) {
    return res.status(400).json({ message: "Already enrolled in this course" });
  }

  const newEnrollment: Enrollment = {
    id: "enr_" + Math.random().toString(36).substr(2, 9),
    studentId: targetStudentId,
    courseId,
    semester: "Fall 2026",
    status: "active"
  };

  enrollments.push(newEnrollment);
  CollegeDatabase.saveEnrollments(enrollments);
  res.status(201).json(newEnrollment);
});

// Drop Enrollment / Unenroll
app.delete("/api/enrollments/:id", authenticateToken, authorizeRoles("student", "principal"), (req, res) => {
  const enrollments = CollegeDatabase.getEnrollments();
  const target = enrollments.find(e => e.id === req.params.id);

  if (!target) {
    return res.status(404).json({ message: "Enrollment record not found" });
  }

  // Students can only drop their own courses
  if (req.user.role === "student" && target.studentId !== req.user.id) {
    return res.status(403).json({ message: "Forbidden: Cannot drop courses for other scholars" });
  }

  const filtered = enrollments.filter(e => e.id !== req.params.id);
  CollegeDatabase.saveEnrollments(filtered);

  // Clean up any grade records associated
  const grades = CollegeDatabase.getGrades();
  const remainingGrades = grades.filter(g => g.enrollmentId !== req.params.id);
  CollegeDatabase.saveGrades(remainingGrades);

  res.json({ message: "Dropped course successfully" });
});

// ==========================================
// GRADE TRACKING (Faculty portal & Student portal)
// ==========================================

// Get grades
app.get("/api/grades", authenticateToken, (req, res) => {
  const enrollments = CollegeDatabase.getEnrollments();
  const grades = CollegeDatabase.getGrades();
  
  if (req.user.role === "student") {
    const studentEnrollments = enrollments.filter(e => e.studentId === req.user.id);
    const semIds = studentEnrollments.map(e => e.id);
    res.json(grades.filter(g => semIds.includes(g.enrollmentId)));
  } else if (req.user.role === "faculty") {
    // Faculty can view grade entries for their assigned courses
    const facultyCourses = CollegeDatabase.getCourses().filter(c => c.facultyId === req.user.id);
    const fcIds = facultyCourses.map(c => c.id);
    const facultyEnrollments = enrollments.filter(e => fcIds.includes(e.courseId));
    const feIds = facultyEnrollments.map(e => e.id);
    res.json(grades.filter(g => feIds.includes(g.enrollmentId)));
  } else {
    // Librarians and Principals can view all grades
    res.json(grades);
  }
});

// Record or Edit grades (Faculty only)
app.post("/api/grades", authenticateToken, authorizeRoles("faculty"), (req, res) => {
  const { enrollmentId, component, score, weight } = req.body;
  if (!enrollmentId || !component || score === undefined || !weight) {
    return res.status(400).json({ message: "Missing score evaluation fields" });
  }

  // Ensure this faculty member teaches this student's course
  const enrollments = CollegeDatabase.getEnrollments();
  const enrollment = enrollments.find(e => e.id === enrollmentId);
  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment record not found" });
  }

  const courses = CollegeDatabase.getCourses();
  const course = courses.find(c => c.id === enrollment.courseId);
  if (!course || course.facultyId !== req.user.id) {
    return res.status(403).json({ message: "Forbidden: You are not authorized to grade this section" });
  }

  const grades = CollegeDatabase.getGrades();
  
  // Find if grade for this component already exists on this enrollment, update it!
  const existingGradeIndex = grades.findIndex(g => g.enrollmentId === enrollmentId && g.component === component);
  
  if (existingGradeIndex !== -1) {
    grades[existingGradeIndex].score = Number(score);
    grades[existingGradeIndex].weight = Number(weight);
    CollegeDatabase.saveGrades(grades);
    return res.json(grades[existingGradeIndex]);
  }

  const newGrade: Grade = {
    id: "grd_" + Math.random().toString(36).substr(2, 9),
    enrollmentId,
    component,
    score: Number(score),
    weight: Number(weight)
  };

  grades.push(newGrade);
  CollegeDatabase.saveGrades(grades);
  res.status(201).json(newGrade);
});

// Delete specific grade item
app.delete("/api/grades/:id", authenticateToken, authorizeRoles("faculty"), (req, res) => {
  const grades = CollegeDatabase.getGrades();
  const target = grades.find(g => g.id === req.params.id);
  if (!target) {
    return res.status(404).json({ message: "Grade ledger entry not found" });
  }

  const filtered = grades.filter(g => g.id !== req.params.id);
  CollegeDatabase.saveGrades(filtered);
  res.json({ message: "Academic grade ledger entry retracted" });
});

// ==========================================
// STUDENT ATTENDANCE PORTAL (Faculty & Student)
// ==========================================

// Get attendance logs
app.get("/api/attendance", authenticateToken, (req, res) => {
  try {
    const attendance = CollegeDatabase.getAttendance();
    
    if (req.user.role === "student") {
      // Students can only see their own attendance
      const filtered = attendance.filter(a => 
        a.studentId === req.user.id || 
        a.enrollmentNo.toLowerCase() === req.user.id.toLowerCase() ||
        a.enrollmentNo.toLowerCase() === req.user.fullName.toLowerCase()
      );
      return res.json(filtered);
    } else if (req.user.role === "faculty") {
      // Faculty see attendance for courses they teach
      const facultyCourses = CollegeDatabase.getCourses().filter(c => c.facultyId === req.user.id);
      const fcIds = facultyCourses.map(c => c.id);
      const filtered = attendance.filter(a => fcIds.includes(a.courseId));
      return res.json(filtered);
    } else {
      // Principal/Librarians can view all attendance
      return res.json(attendance);
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch attendance logs", error: error.message });
  }
});

// Post student attendance (Faculty only)
app.post("/api/attendance", authenticateToken, authorizeRoles("faculty", "principal"), (req, res) => {
  try {
    const { studentName, enrollmentNo, courseId, date, status, remarks } = req.body;
    
    if (!studentName || !enrollmentNo || !courseId || !date || !status) {
      return res.status(400).json({ message: "Incomplete attendance details provided" });
    }

    const courses = CollegeDatabase.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Faculty can only record attendance for their own classes (Principal can do any)
    if (req.user.role === "faculty" && course.facultyId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: You do not teach this class section" });
    }

    // Try to find matching registered student in DB to populate studentId
    const users = CollegeDatabase.getUsers();
    const student = users.find(u => 
      u.role === "student" && 
      (u.id.toLowerCase() === enrollmentNo.trim().toLowerCase() || 
       u.fullName.toLowerCase() === studentName.trim().toLowerCase())
    );

    const attendance = CollegeDatabase.getAttendance();

    // Check if an attendance record already exists for this student, course and date
    const existingIndex = attendance.findIndex(a => 
      a.courseId === courseId && 
      a.date === date && 
      a.enrollmentNo.toLowerCase() === enrollmentNo.trim().toLowerCase()
    );

    if (existingIndex !== -1) {
      // Update existing record
      attendance[existingIndex].status = status;
      attendance[existingIndex].studentName = studentName;
      attendance[existingIndex].remarks = remarks || "";
      if (student) {
        attendance[existingIndex].studentId = student.id;
      }
      CollegeDatabase.saveAttendance(attendance);
      return res.json({ message: "Attendance record updated successfully", record: attendance[existingIndex] });
    }

    // Create new attendance record
    const newRecord: Attendance = {
      id: "att_" + Math.random().toString(36).substr(2, 9),
      studentId: student ? student.id : undefined,
      studentName: studentName.trim(),
      enrollmentNo: enrollmentNo.trim(),
      courseId,
      date,
      status,
      remarks: remarks || ""
    };

    attendance.push(newRecord);
    CollegeDatabase.saveAttendance(attendance);

    res.status(201).json({ message: "Attendance registered successfully", record: newRecord });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to post attendance", error: error.message });
  }
});

// Delete attendance record (Faculty and Principal only)
app.delete("/api/attendance/:id", authenticateToken, authorizeRoles("faculty", "principal"), (req, res) => {
  try {
    const attendance = CollegeDatabase.getAttendance();
    const recordIndex = attendance.findIndex(a => a.id === req.params.id);

    if (recordIndex === -1) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const record = attendance[recordIndex];
    const courses = CollegeDatabase.getCourses();
    const course = courses.find(c => c.id === record.courseId);

    // Faculty can only delete attendance for their own classes
    if (req.user.role === "faculty" && course && course.facultyId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: You do not teach this class section" });
    }

    const filtered = attendance.filter(a => a.id !== req.params.id);
    CollegeDatabase.saveAttendance(filtered);
    res.json({ message: "Attendance record deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete attendance record", error: error.message });
  }
});

// ==========================================
// EXAMINATION MARKS ENTRY ENDPOINTS
// ==========================================

// Get exam marks with strict role-based isolation
app.get("/api/exam-marks", authenticateToken, (req, res) => {
  try {
    const marks = CollegeDatabase.getExamMarks();
    const courses = CollegeDatabase.getCourses();

    if (req.user.role === "student") {
      // Students can only view their own marks once published
      const studentMarks = marks.filter(m => m.studentId === req.user.id && m.isPublished);
      return res.json(studentMarks);
    }

    if (req.user.role === "faculty") {
      // Faculty can only view marks for subjects they are assigned to
      const facultyCourses = courses.filter(c => c.facultyId === req.user.id).map(c => c.id);
      const facultyMarks = marks.filter(m => facultyCourses.includes(m.courseId));
      return res.json(facultyMarks);
    }

    if (req.user.role === "principal") {
      // Principal can view all marks
      return res.json(marks);
    }

    res.json([]);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve examination marks", error: error.message });
  }
});

// Create/Update/Submit Exam Marks (Faculty and Principal only)
app.post("/api/exam-marks", authenticateToken, authorizeRoles("faculty", "principal"), (req, res) => {
  try {
    const payload = req.body;
    const entries = Array.isArray(payload) ? payload : [payload];

    if (entries.length === 0) {
      return res.status(400).json({ message: "No marks entries provided" });
    }

    const currentMarks = CollegeDatabase.getExamMarks();
    const courses = CollegeDatabase.getCourses();
    const users = CollegeDatabase.getUsers();
    const updatedEntries: typeof currentMarks = [...currentMarks];
    const savedRecords: any[] = [];
    const auditLogs = CollegeDatabase.getExamAuditLogs();

    // Group-level checks for faculty permissions
    for (const entry of entries) {
      const course = courses.find(c => c.id === entry.courseId);
      if (!course) {
        return res.status(404).json({ message: `Course ID ${entry.courseId} not found` });
      }

      // Check faculty permission
      if (req.user.role === "faculty" && course.facultyId !== req.user.id) {
        return res.status(403).json({ message: `Forbidden: You are not assigned to instruct course ${course.code}` });
      }

      // Extract marks and max limits
      const theory = Number(entry.theoryMarks || 0);
      const practical = Number(entry.practicalMarks || 0);
      const internal = Number(entry.internalMarks || 0);
      const assignment = Number(entry.assignmentMarks || 0);
      const viva = Number(entry.vivaMarks || 0);

      const maxTheory = Number(entry.maxTheory ?? 100);
      const maxPractical = Number(entry.maxPractical ?? 50);
      const maxInternal = Number(entry.maxInternal ?? 30);
      const maxAssignment = Number(entry.maxAssignment ?? 20);
      const maxViva = Number(entry.maxViva ?? 10);

      // Validation
      if (theory < 0 || theory > maxTheory) {
        return res.status(400).json({ message: `Invalid theory marks (${theory}) for student ${entry.studentName}. Limit: [0, ${maxTheory}]` });
      }
      if (practical < 0 || practical > maxPractical) {
        return res.status(400).json({ message: `Invalid practical marks (${practical}) for student ${entry.studentName}. Limit: [0, ${maxPractical}]` });
      }
      if (internal < 0 || internal > maxInternal) {
        return res.status(400).json({ message: `Invalid internal marks (${internal}) for student ${entry.studentName}. Limit: [0, ${maxInternal}]` });
      }
      if (assignment < 0 || assignment > maxAssignment) {
        return res.status(400).json({ message: `Invalid assignment marks (${assignment}) for student ${entry.studentName}. Limit: [0, ${maxAssignment}]` });
      }
      if (viva < 0 || viva > maxViva) {
        return res.status(400).json({ message: `Invalid viva marks (${viva}) for student ${entry.studentName}. Limit: [0, ${maxViva}]` });
      }

      // Find if student actually exists to ensure data consistency
      const student = users.find(u => u.id === entry.studentId);
      const studentName = student ? student.fullName : entry.studentName;

      // Check existing records in DB to prevent duplicates or finalized overwrites
      const existingIndex = updatedEntries.findIndex(
        m =>
          m.studentId === entry.studentId &&
          m.courseId === entry.courseId &&
          m.academicYear === entry.academicYear &&
          m.examType === entry.examType &&
          m.semester === entry.semester &&
          m.section === entry.section
      );

      if (existingIndex !== -1) {
        const existingRecord = updatedEntries[existingIndex];
        // If final submission (isDraft is false), only principal can unlock or overwrite
        if (!existingRecord.isDraft && req.user.role === "faculty") {
          return res.status(400).json({
            message: `Locked: Marks for student ${studentName} have already been finalized and submitted. Overwrites forbidden without Principal authorization.`
          });
        }
      }

      // Calculations
      const totalMarks = theory + practical + internal + assignment + viva;
      const maxTotal = maxTheory + maxPractical + maxInternal + maxAssignment + maxViva;
      const percentage = maxTotal > 0 ? (totalMarks / maxTotal) * 100 : 0;
      
      let grade = "F";
      if (percentage >= 90) grade = "O";
      else if (percentage >= 80) grade = "A+";
      else if (percentage >= 70) grade = "A";
      else if (percentage >= 60) grade = "B";
      else if (percentage >= 50) grade = "C";
      else if (percentage >= 40) grade = "D";

      const status: "Pass" | "Fail" = percentage >= 40 ? "Pass" : "Fail";

      const recordToSave: ExamMarkEntry = {
        id: existingIndex !== -1 ? updatedEntries[existingIndex].id : "exm_" + Math.random().toString(36).substr(2, 9),
        studentId: entry.studentId,
        studentName,
        enrollmentNo: entry.studentId, // standard student identifier
        academicYear: entry.academicYear,
        examType: entry.examType,
        department: entry.department,
        branch: entry.branch,
        semester: entry.semester,
        section: entry.section,
        courseId: entry.courseId,
        theoryMarks: theory,
        practicalMarks: practical,
        internalMarks: internal,
        assignmentMarks: assignment,
        vivaMarks: viva,
        maxTheory,
        maxPractical,
        maxInternal,
        maxAssignment,
        maxViva,
        totalMarks,
        percentage,
        grade,
        status,
        isDraft: entry.isDraft !== undefined ? entry.isDraft : true,
        isPublished: existingIndex !== -1 ? updatedEntries[existingIndex].isPublished : false
      };

      if (existingIndex !== -1) {
        updatedEntries[existingIndex] = recordToSave;
      } else {
        updatedEntries.push(recordToSave);
      }
      savedRecords.push(recordToSave);
    }

    // Save back to DB
    CollegeDatabase.saveExamMarks(updatedEntries);

    // Write audit log
    const auditAction = entries[0].isDraft ? "Draft Saved" : "Final Submission";
    const courseNames = entries.map(e => courses.find(c => c.id === e.courseId)?.code).filter(Boolean);
    const auditLogEntry = {
      id: "aud_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      userEmail: req.user.email,
      action: auditAction,
      details: `${auditAction} for course(s) [${[...new Set(courseNames)].join(", ")}] of ${entries.length} student entries.`
    };
    auditLogs.push(auditLogEntry);
    CollegeDatabase.saveExamAuditLogs(auditLogs);

    res.json({
      message: entries[0].isDraft ? "Draft marks saved successfully" : "Marks finalized and submitted successfully!",
      records: savedRecords
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to record examination marks", error: error.message });
  }
});

// Toggle Publish results (Principal only)
app.post("/api/exam-marks/publish-toggle", authenticateToken, authorizeRoles("principal"), (req, res) => {
  try {
    const { recordIds, publish } = req.body;
    if (!recordIds || !Array.isArray(recordIds)) {
      return res.status(400).json({ message: "Invalid or missing recordIds array" });
    }

    const marks = CollegeDatabase.getExamMarks();
    let count = 0;

    const updated = marks.map(m => {
      if (recordIds.includes(m.id)) {
        count++;
        return { ...m, isPublished: !!publish };
      }
      return m;
    });

    CollegeDatabase.saveExamMarks(updated);

    // Audit log
    const auditLogs = CollegeDatabase.getExamAuditLogs();
    const auditLogEntry = {
      id: "aud_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      userEmail: req.user.email,
      action: publish ? "Results Published" : "Results Hidden",
      details: `${publish ? "Published" : "Hidden"} results for ${count} exam mark records.`
    };
    auditLogs.push(auditLogEntry);
    CollegeDatabase.saveExamAuditLogs(auditLogs);

    res.json({ message: `Successfully ${publish ? "published" : "hidden"} results for ${count} records!` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to publication-toggle exam marks", error: error.message });
  }
});

// Unlock finalized exam marks to draft state (Principal only)
app.post("/api/exam-marks/unlock/:id", authenticateToken, authorizeRoles("principal"), (req, res) => {
  try {
    const marks = CollegeDatabase.getExamMarks();
    const index = marks.findIndex(m => m.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Exam record not found" });
    }

    marks[index].isDraft = true;
    CollegeDatabase.saveExamMarks(marks);

    // Audit log
    const auditLogs = CollegeDatabase.getExamAuditLogs();
    const auditLogEntry = {
      id: "aud_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      userEmail: req.user.email,
      action: "Marks Unlocked",
      details: `Unlocked student ${marks[index].studentName}'s marks for editing in course ${marks[index].courseId}.`
    };
    auditLogs.push(auditLogEntry);
    CollegeDatabase.saveExamAuditLogs(auditLogs);

    res.json({ message: `Successfully unlocked ${marks[index].studentName}'s records for editing.`, record: marks[index] });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to unlock record", error: error.message });
  }
});

// Retrieve examination audit logs
app.get("/api/exam-marks/audit-logs", authenticateToken, authorizeRoles("faculty", "principal"), (req, res) => {
  try {
    const logs = CollegeDatabase.getExamAuditLogs();
    if (req.user.role === "principal") {
      res.json(logs);
    } else {
      res.json(logs.filter(l => l.userId === req.user.id));
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve audit log", error: error.message });
  }
});

// ==========================================
// LIBRARY PORTAL ENDPOINTS
// ==========================================

// Get catalog
app.get("/api/library/books", authenticateToken, (req, res) => {
  res.json(CollegeDatabase.getLibraryBooks());
});

// Add books (Librarian only)
app.post("/api/library/books", authenticateToken, authorizeRoles("librarian"), (req, res) => {
  const { title, author, isbn, category, totalCopies } = req.body;
  if (!title || !author || !isbn || !category || !totalCopies) {
    return res.status(400).json({ message: "Complete catalog specifications required" });
  }

  const books = CollegeDatabase.getLibraryBooks();
  const newBook: LibraryBook = {
    id: "bk_" + Math.random().toString(36).substr(2, 9),
    title,
    author,
    isbn,
    category,
    totalCopies: Number(totalCopies),
    availableCopies: Number(totalCopies)
  };

  books.push(newBook);
  CollegeDatabase.saveLibraryBooks(books);
  res.status(201).json(newBook);
});

// Update books details (Librarian only)
app.put("/api/library/books/:id", authenticateToken, authorizeRoles("librarian"), (req, res) => {
  const books = CollegeDatabase.getLibraryBooks();
  const index = books.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Book catalog item not found" });
  }

  const { title, author, isbn, category, totalCopies } = req.body;
  const diff = Number(totalCopies) - books[index].totalCopies;

  if (title) books[index].title = title;
  if (author) books[index].author = author;
  if (isbn) books[index].isbn = isbn;
  if (category) books[index].category = category;
  if (totalCopies !== undefined) {
    books[index].totalCopies = Number(totalCopies);
    books[index].availableCopies = Math.max(0, books[index].availableCopies + diff);
  }

  CollegeDatabase.saveLibraryBooks(books);
  res.json(books[index]);
});

// Get book borrows
app.get("/api/library/borrows", authenticateToken, (req, res) => {
  const borrows = CollegeDatabase.getLibraryBorrows();
  if (req.user.role === "student") {
    res.json(borrows.filter(b => b.studentId === req.user.id));
  } else {
    res.json(borrows);
  }
});

// Borrow / Issue a book (Librarian issues to student)
app.post("/api/library/borrow", authenticateToken, authorizeRoles("librarian"), (req, res) => {
  const { bookId, studentEmail, durationDays } = req.body;
  if (!bookId || !studentEmail) {
    return res.status(400).json({ message: "Book and Student details required" });
  }

  const users = CollegeDatabase.getUsers();
  const student = users.find(u => u.email.toLowerCase() === studentEmail.toLowerCase() && u.role === "student");
  if (!student) {
    return res.status(404).json({ message: "Registered student not found with that email" });
  }

  const books = CollegeDatabase.getLibraryBooks();
  const bookIndex = books.findIndex(b => b.id === bookId);
  if (bookIndex === -1) {
    return res.status(404).json({ message: "Book not found" });
  }

  if (books[bookIndex].availableCopies <= 0) {
    return res.status(400).json({ message: "All copies of this volume are currently checked out" });
  }

  // Mark book checked out
  books[bookIndex].availableCopies -= 1;
  CollegeDatabase.saveLibraryBooks(books);

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(borrowDate.getDate() + (Number(durationDays) || 14));

  const borrows = CollegeDatabase.getLibraryBorrows();
  const newBorrow: LibraryBorrow = {
    id: "brw_" + Math.random().toString(36).substr(2, 9),
    bookId,
    studentId: student.id,
    borrowDate: borrowDate.toISOString().split("T")[0],
    dueDate: dueDate.toISOString().split("T")[0],
    returnDate: null,
    status: "borrowed"
  };

  borrows.push(newBorrow);
  CollegeDatabase.saveLibraryBorrows(borrows);

  res.status(201).json(newBorrow);
});

// Return borrowed book (Librarian marks returned)
app.post("/api/library/return/:id", authenticateToken, authorizeRoles("librarian"), (req, res) => {
  const borrows = CollegeDatabase.getLibraryBorrows();
  const borrowIndex = borrows.findIndex(b => b.id === req.params.id);

  if (borrowIndex === -1) {
    return res.status(404).json({ message: "Check-out ledger record not found" });
  }

  if (borrows[borrowIndex].status === "returned") {
    return res.status(400).json({ message: "Book has already been returned" });
  }

  // Update borrow ledger
  borrows[borrowIndex].returnDate = new Date().toISOString().split("T")[0];
  borrows[borrowIndex].status = "returned";
  CollegeDatabase.saveLibraryBorrows(borrows);

  // Return copy back to available count
  const books = CollegeDatabase.getLibraryBooks();
  const bookIndex = books.findIndex(b => b.id === borrows[borrowIndex].bookId);
  if (bookIndex !== -1) {
    books[bookIndex].availableCopies = Math.min(books[bookIndex].totalCopies, books[bookIndex].availableCopies + 1);
    CollegeDatabase.saveLibraryBooks(books);
  }

  res.json({ message: "Volume returned cleanly and library records synced" });
});

// ==========================================
// STUDENT HUB - PORTAL EXTENSION ENDPOINTS
// ==========================================

// Change Password
app.post("/api/profile/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required." });
    }

    const users = CollegeDatabase.getUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: "User not found." });
    }

    const matched = await bcrypt.compare(currentPassword, users[userIndex].passwordHash);
    if (!matched) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    const salt = await bcrypt.genSalt(10);
    users[userIndex].passwordHash = await bcrypt.hash(newPassword, salt);
    CollegeDatabase.saveUsers(users);

    res.json({ message: "Password updated successfully!" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to change password", error: error.message });
  }
});

// Update Profile Picture, Phone, Address (Student/Faculty/All)
app.put("/api/profile/details", authenticateToken, async (req, res) => {
  try {
    const { phone, address, profilePic, fullName } = req.body;
    const users = CollegeDatabase.getUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) {
      return res.status(404).json({ message: "User profile not found" });
    }

    if (phone !== undefined) users[idx].phone = phone;
    if (address !== undefined) users[idx].address = address;
    if (profilePic !== undefined) users[idx].profilePic = profilePic;
    if (fullName !== undefined) users[idx].fullName = fullName;

    CollegeDatabase.saveUsers(users);
    res.json({ message: "Profile details updated successfully", user: users[idx] });
  } catch (error: any) {
    res.status(500).json({ message: "Profile update failed", error: error.message });
  }
});

// ASSIGNMENTS: Get assignments (student receives only their subjects; faculty receives all; principal receives all)
app.get("/api/assignments", authenticateToken, (req, res) => {
  try {
    let assignments = CollegeDatabase.getAssignments();
    const submissions = CollegeDatabase.getAssignmentSubmissions();
    const courses = CollegeDatabase.getCourses();

    // Default system seed if empty
    if (assignments.length === 0) {
      const initialAssignments = [
        {
          id: "asm_cs101_1",
          courseId: "crs_cs101",
          title: "Programming Essentials Lab 1",
          description: "Complete exercises on TypeScript basic types, functions, and standard array methods. Submit a PDF or ZIP containing code files.",
          dueDate: new Date(Date.now() + 3600000 * 24 * 5).toISOString(),
          maxMarks: 100
        },
        {
          id: "asm_cs202_1",
          courseId: "crs_cs202",
          title: "Binary Tree Visualizer Implementation",
          description: "Build a binary search tree data structure, implement depth-first and breadth-first search traversal, and construct performance plots.",
          dueDate: new Date(Date.now() + 3600000 * 24 * 3).toISOString(),
          maxMarks: 50
        },
        {
          id: "asm_math101_1",
          courseId: "crs_math101",
          title: "Derivatives Practice Set 2",
          description: "Solve problems 1-15 regarding derivative calculations, product rule, chain rule, and optimization applications.",
          dueDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // Past deadline
          maxMarks: 30
        }
      ];
      CollegeDatabase.saveAssignments(initialAssignments);
      assignments = initialAssignments;
    }

    if (req.user.role === "student") {
      // Find what courses student is enrolled in
      const enrollments = CollegeDatabase.getEnrollments().filter(e => e.studentId === req.user.id && e.status === "active");
      const courseIds = enrollments.map(e => e.courseId);

      // Filter assignments by student courses
      const studentAssignments = assignments.filter(a => courseIds.includes(a.courseId));
      
      // Map submissions with assignment details
      const response = studentAssignments.map(asm => {
        const sub = submissions.find(s => s.assignmentId === asm.id && s.studentId === req.user.id);
        const course = courses.find(c => c.id === asm.courseId);
        return {
          ...asm,
          courseCode: course?.code || "",
          courseName: course?.name || "",
          submission: sub || null
        };
      });
      return res.json(response);
    }

    // Faculty or Principal receives all with details
    const response = assignments.map(asm => {
      const course = courses.find(c => c.id === asm.courseId);
      const subs = submissions.filter(s => s.assignmentId === asm.id);
      return {
        ...asm,
        courseCode: course?.code || "",
        courseName: course?.name || "",
        submissionsCount: subs.length
      };
    });
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve assignments", error: error.message });
  }
});

// Submit Assignment
app.post("/api/assignments/submit", authenticateToken, (req, res) => {
  try {
    const { assignmentId, fileUrl, fileName } = req.body;
    if (!assignmentId || !fileUrl || !fileName) {
      return res.status(400).json({ message: "Missing submission materials." });
    }

    const assignments = CollegeDatabase.getAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check if deadline has passed
    const deadline = new Date(assignment.dueDate);
    const now = new Date();
    if (now > deadline) {
      return res.status(400).json({ message: "Assignment submission closed. The deadline has already passed." });
    }

    const submissions = CollegeDatabase.getAssignmentSubmissions();
    const existingIndex = submissions.findIndex(s => s.assignmentId === assignmentId && s.studentId === req.user.id);

    const newSub = {
      id: existingIndex !== -1 ? submissions[existingIndex].id : "sub_" + Math.random().toString(36).substr(2, 9),
      assignmentId,
      studentId: req.user.id,
      submittedAt: new Date().toISOString(),
      fileUrl,
      fileName,
      status: "Submitted" as const,
    };

    if (existingIndex !== -1) {
      submissions[existingIndex] = { ...submissions[existingIndex], ...newSub };
    } else {
      submissions.push(newSub);
    }

    CollegeDatabase.saveAssignmentSubmissions(submissions);

    // Create student notification
    const notifications = CollegeDatabase.getNotifications();
    notifications.push({
      id: "not_" + Math.random().toString(36).substr(2, 9),
      studentId: req.user.id,
      title: "Assignment Submitted",
      message: `Your submission for "${assignment.title}" has been filed successfully.`,
      type: "assignment",
      timestamp: new Date().toISOString(),
      isRead: false
    });
    CollegeDatabase.saveNotifications(notifications);

    res.status(201).json({ message: "Assignment submitted successfully!", submission: newSub });
  } catch (error: any) {
    res.status(500).json({ message: "Submission failed", error: error.message });
  }
});

// NOTICES: Get Notices
app.get("/api/notices", authenticateToken, (req, res) => {
  try {
    const notices = CollegeDatabase.getNotices();
    // Default system seed if empty
    if (notices.length === 0) {
      const initialNotices = [
        {
          id: "ntc_1",
          title: "Annual Sports Day Registration",
          content: "Registrations for the Annual Sports Day 2026 are now open. Interested students can sign up in the physical education building.",
          date: "2026-07-15",
          category: "event" as const
        },
        {
          id: "ntc_2",
          title: "End Semester Exams Schedule Published",
          content: "The final theory examination schedule for all semesters of Fall 2026 has been published on the exams board and student portals.",
          date: "2026-07-12",
          category: "exam" as const
        },
        {
          id: "ntc_3",
          title: "Computer Science Lab Maintenance",
          content: "The main server rooms and programming lab 3 will be down for security upgrades on Saturday, July 25th, from 09:00 to 18:00.",
          date: "2026-07-10",
          category: "department" as const,
          department: "Computer Science"
        }
      ];
      CollegeDatabase.saveNotices(initialNotices);
      return res.json(initialNotices);
    }
    res.json(notices);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve notices", error: error.message });
  }
});

// LEAVE REQUESTS: Apply and get status
app.get("/api/leave-requests", authenticateToken, (req, res) => {
  try {
    const requests = CollegeDatabase.getLeaveRequests();
    if (req.user.role === "student") {
      return res.json(requests.filter(r => r.studentId === req.user.id));
    }
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load leave requests", error: error.message });
  }
});

app.post("/api/leave-requests", authenticateToken, (req, res) => {
  try {
    const { startDate, endDate, reason, documentUrl, documentName } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: "Start date, end date, and leave justification are required." });
    }

    const requests = CollegeDatabase.getLeaveRequests();
    const newRequest = {
      id: "lv_" + Math.random().toString(36).substr(2, 9),
      studentId: req.user.id,
      studentName: req.user.fullName,
      startDate,
      endDate,
      reason,
      status: "Pending" as const,
      appliedOn: new Date().toISOString().split("T")[0],
      documentUrl,
      documentName
    };

    requests.push(newRequest);
    CollegeDatabase.saveLeaveRequests(requests);
    res.status(201).json({ message: "Leave application registered successfully!", request: newRequest });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to file leave", error: error.message });
  }
});

// NOTIFICATIONS: Get and Mark read
app.get("/api/notifications", authenticateToken, (req, res) => {
  try {
    const notifications = CollegeDatabase.getNotifications();
    const userNotifications = notifications.filter(n => n.studentId === req.user.id || n.studentId === "all");
    
    // Seed some initial system notifications if empty
    if (userNotifications.length === 0) {
      const seedNotifications = [
        {
          id: "not_seed_1",
          studentId: req.user.id,
          title: "Welcome to Student Hub",
          message: "Explore your academic portal. Access subject evaluations, exam schedules, and library loans here.",
          type: "general" as const,
          timestamp: new Date().toISOString(),
          isRead: false
        },
        {
          id: "not_seed_2",
          studentId: req.user.id,
          title: "Attendance Warning",
          message: "Keep an eye on your subject-wise attendance logs to prevent falling below the 75% credit threshold.",
          type: "attendance" as const,
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          isRead: false
        }
      ];
      const allNotifications = [...notifications, ...seedNotifications];
      CollegeDatabase.saveNotifications(allNotifications);
      return res.json(seedNotifications);
    }
    res.json(userNotifications);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load notifications", error: error.message });
  }
});

app.post("/api/notifications/mark-read", authenticateToken, (req, res) => {
  try {
    const { notificationId } = req.body;
    const notifications = CollegeDatabase.getNotifications();
    const updated = notifications.map(n => {
      if (n.studentId === req.user.id || n.studentId === "all") {
        if (!notificationId || n.id === notificationId) {
          return { ...n, isRead: true };
        }
      }
      return n;
    });
    CollegeDatabase.saveNotifications(updated);
    res.json({ message: "Notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update notification state", error: error.message });
  }
});

// ==========================================
// METADATA & ANALYTICS DASHBOARD (Principal)
// ==========================================
app.get("/api/analytics", authenticateToken, authorizeRoles("principal"), (req, res) => {
  const users = CollegeDatabase.getUsers();
  const courses = CollegeDatabase.getCourses();
  const enrollments = CollegeDatabase.getEnrollments();
  const grades = CollegeDatabase.getGrades();
  const books = CollegeDatabase.getLibraryBooks();
  const borrows = CollegeDatabase.getLibraryBorrows();

  // 1. Role counts
  const studentCount = users.filter(u => u.role === "student").length;
  const facultyCount = users.filter(u => u.role === "faculty").length;
  const librarianCount = users.filter(u => u.role === "librarian").length;

  // 2. Department counts
  const coursesPerDept: Record<string, number> = {};
  courses.forEach(c => {
    coursesPerDept[c.department] = (coursesPerDept[c.department] || 0) + 1;
  });

  const departmentData = Object.entries(coursesPerDept).map(([name, value]) => ({
    name,
    value
  }));

  // 3. Course Enrollment Loads
  const enrollmentPerCourse = courses.map(c => {
    const count = enrollments.filter(e => e.courseId === c.id && e.status === "active").length;
    return {
      name: c.code,
      fullName: c.name,
      students: count
    };
  });

  // 4. Grades distribution
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  
  // Group grades by enrollmentId to compute average per course enrollment
  const enrollmentScores: Record<string, number[]> = {};
  grades.forEach(g => {
    if (!enrollmentScores[g.enrollmentId]) {
      enrollmentScores[g.enrollmentId] = [];
    }
    enrollmentScores[g.enrollmentId].push(g.score);
  });

  Object.values(enrollmentScores).forEach(scores => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 90) gradeDistribution.A++;
    else if (avg >= 80) gradeDistribution.B++;
    else if (avg >= 70) gradeDistribution.C++;
    else if (avg >= 60) gradeDistribution.D++;
    else gradeDistribution.F++;
  });

  const gradeData = Object.entries(gradeDistribution).map(([name, value]) => ({
    name: `Grade ${name}`,
    count: value
  }));

  // 5. Library Metrics
  const totalBookVolumes = books.reduce((acc, b) => acc + b.totalCopies, 0);
  const activeBorrows = borrows.filter(b => b.status === "borrowed" || b.status === "overdue").length;

  res.json({
    metrics: {
      students: studentCount,
      faculty: facultyCount,
      librarians: librarianCount,
      totalCourses: courses.length,
      libraryBooks: totalBookVolumes,
      activeBorrows
    },
    departmentData,
    enrollmentPerCourse,
    gradeData
  });
});

// ==========================================
// INTELLIGENT SCHEDULER ADVISOR API (AI-Powered)
// ==========================================
app.post("/api/assistant", authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Assistant request prompt cannot be empty." });
    }

    if (!ai) {
      return res.status(503).json({
        message: "Academic AI service is not configured. Please supply a GEMINI_API_KEY inside Settings > Secrets."
      });
    }

    // Supply database stats as high-fidelity context for the AI Advisor
    const courses = CollegeDatabase.getCourses();
    const faculty = CollegeDatabase.getUsers().filter(u => u.role === "faculty").map(f => ({ id: f.id, name: f.fullName, dept: f.department }));
    
    const dbContext = `
You are the AI Academic Advisor for our College Management Portal.
Here is the current listing of courses and their scheduled slot/room assignments:
${JSON.stringify(courses, null, 2)}

And our available faculty members:
${JSON.stringify(faculty, null, 2)}

Use this background data to assist the academic administrators, students, or faculty who are asking you questions. Give helpful, brief, and structured responses.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: dbContext,
        temperature: 0.7,
      }
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    res.status(500).json({ message: "AI Assistant was unable to process request", error: error.message });
  }
});


// ==========================================
// VITE AND STATIC ASSETS CLIENT-SIDE ROUTING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite dev server integration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static dist folder for production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start full-stack server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Academic server booting up on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot full-stack academic server:", err);
});
