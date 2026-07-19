import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

import { CollegeDatabase, User, Course, Enrollment, Grade, LibraryBook, LibraryBorrow } from "./server/db";
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
