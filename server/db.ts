import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_FILE = path.join(process.cwd(), "data", "college_db.json");

// Define interfaces for relational-like database structure
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "student" | "faculty" | "librarian" | "principal";
  fullName: string;
  department: string;
  phone: string;
  registrationDate: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  department: string;
  facultyId: string | null; // Nullable if no instructor assigned yet
  timeSlot: string | null;   // e.g., "Monday 09:00 - 10:30"
  room: string | null;       // e.g., "Room 101"
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  semester: string;
  status: "active" | "completed" | "dropped";
}

export interface Grade {
  id: string;
  enrollmentId: string;
  component: "Exam" | "Midterm" | "Assignment" | "Project";
  score: number; // 0-100
  weight: number; // 0.0 - 1.0
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
}

export interface LibraryBorrow {
  id: string;
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: "borrowed" | "returned" | "overdue";
}

interface DatabaseSchema {
  users: User[];
  courses: Course[];
  enrollments: Enrollment[];
  grades: Grade[];
  libraryBooks: LibraryBook[];
  libraryBorrows: LibraryBorrow[];
}

// Ensure the data directory exists
function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initial seed data if the database file is not present
async function getInitialData(): Promise<DatabaseSchema> {
  const salt = await bcrypt.genSalt(10);
  
  // Hash default passwords ("password")
  const defaultHash = await bcrypt.hash("password", salt);

  const users: User[] = [
    {
      id: "usr_student",
      email: "student@college.edu",
      passwordHash: defaultHash,
      role: "student",
      fullName: "Shrey Varsani",
      department: "Computer Science",
      phone: "+1 (555) 019-2834",
      registrationDate: "2024-09-01",
    },
    {
      id: "usr_student2",
      email: "student2@college.edu",
      passwordHash: defaultHash,
      role: "student",
      fullName: "Jane Miller",
      department: "Mathematics",
      phone: "+1 (555) 014-9988",
      registrationDate: "2024-09-01",
    },
    {
      id: "usr_faculty",
      email: "faculty@college.edu",
      passwordHash: defaultHash,
      role: "faculty",
      fullName: "Dr. Elizabeth Blackwell",
      department: "Computer Science",
      phone: "+1 (555) 021-9304",
      registrationDate: "2018-08-15",
    },
    {
      id: "usr_faculty2",
      email: "faculty2@college.edu",
      passwordHash: defaultHash,
      role: "faculty",
      fullName: "Prof. Arthur Pendelton",
      department: "Mathematics",
      phone: "+1 (555) 021-9911",
      registrationDate: "2015-01-10",
    },
    {
      id: "usr_librarian",
      email: "librarian@college.edu",
      passwordHash: defaultHash,
      role: "librarian",
      fullName: "Eleanor Vance",
      department: "Library Administration",
      phone: "+1 (555) 015-4422",
      registrationDate: "2020-03-22",
    },
    {
      id: "usr_principal",
      email: "principal@college.edu",
      passwordHash: defaultHash,
      role: "principal",
      fullName: "Dr. Charles Xavier",
      department: "Executive Office",
      phone: "+1 (555) 011-0001",
      registrationDate: "2010-06-01",
    },
  ];

  const courses: Course[] = [
    {
      id: "crs_cs101",
      code: "CS101",
      name: "Introduction to Computer Science",
      description: "Learn the fundamentals of programming using TypeScript, loops, conditional structures, and clean modular code design.",
      credits: 4,
      department: "Computer Science",
      facultyId: "usr_faculty",
      timeSlot: "Monday 09:00 - 10:30",
      room: "Room 101",
    },
    {
      id: "crs_cs202",
      code: "CS202",
      name: "Data Structures & Algorithms",
      description: "Dive deep into memory stacks, queues, binary search trees, sorting runtimes, and graph algorithms.",
      credits: 4,
      department: "Computer Science",
      facultyId: "usr_faculty",
      timeSlot: "Wednesday 10:45 - 12:15",
      room: "Room 101",
    },
    {
      id: "crs_math101",
      code: "MATH101",
      name: "Calculus I",
      description: "Limits, derivatives, integrals, and the fundamental theorem of calculus with interactive numeric mapping.",
      credits: 3,
      department: "Mathematics",
      facultyId: "usr_faculty2",
      timeSlot: "Tuesday 09:00 - 10:30",
      room: "Room 202",
    },
    {
      // Course with NO schedule yet to demonstrate automated course scheduling!
      id: "crs_cs303",
      code: "CS303",
      name: "Database Systems",
      description: "Learn database constraints, normal forms, transaction safety, and relational indexing with SQL and local storage systems.",
      credits: 4,
      department: "Computer Science",
      facultyId: null,
      timeSlot: null,
      room: null,
    },
    {
      id: "crs_math202",
      code: "MATH202",
      name: "Linear Algebra",
      description: "Systems of linear equations, matrix factoring, vector transformations, eigenvectors, and application in data visualization.",
      credits: 3,
      department: "Mathematics",
      facultyId: null,
      timeSlot: null,
      room: null,
    },
  ];

  const enrollments: Enrollment[] = [
    {
      id: "enr_1",
      studentId: "usr_student",
      courseId: "crs_cs101",
      semester: "Fall 2026",
      status: "active",
    },
    {
      id: "enr_2",
      studentId: "usr_student",
      courseId: "crs_cs202",
      semester: "Fall 2026",
      status: "active",
    },
    {
      id: "enr_3",
      studentId: "usr_student2",
      courseId: "crs_math101",
      semester: "Fall 2026",
      status: "active",
    },
  ];

  const grades: Grade[] = [
    {
      id: "grd_1",
      enrollmentId: "enr_1",
      component: "Assignment",
      score: 92,
      weight: 0.2,
    },
    {
      id: "grd_2",
      enrollmentId: "enr_1",
      component: "Midterm",
      score: 88,
      weight: 0.3,
    },
    {
      id: "grd_3",
      enrollmentId: "enr_1",
      component: "Project",
      score: 95,
      weight: 0.1,
    },
    {
      id: "grd_4",
      enrollmentId: "enr_2",
      component: "Assignment",
      score: 81,
      weight: 0.2,
    },
    {
      id: "grd_5",
      enrollmentId: "enr_2",
      component: "Midterm",
      score: 79,
      weight: 0.3,
    },
  ];

  const libraryBooks: LibraryBook[] = [
    {
      id: "bk_1",
      title: "Introduction to Algorithms",
      author: "Cormen, Leiserson, Rivest, Stein",
      isbn: "978-0262033848",
      category: "Computer Science",
      totalCopies: 5,
      availableCopies: 4,
    },
    {
      id: "bk_2",
      title: "Design Patterns",
      author: "Erich Gamma, Richard Helm, Ralph Johnson",
      isbn: "978-0201633610",
      category: "Computer Science",
      totalCopies: 3,
      availableCopies: 3,
    },
    {
      id: "bk_3",
      title: "Calculus",
      author: "James Stewart",
      isbn: "978-1285740621",
      category: "Mathematics",
      totalCopies: 4,
      availableCopies: 4,
    },
  ];

  const libraryBorrows: LibraryBorrow[] = [
    {
      id: "brw_1",
      bookId: "bk_1",
      studentId: "usr_student",
      borrowDate: "2026-07-10",
      dueDate: "2026-07-24",
      returnDate: null,
      status: "borrowed",
    },
  ];

  return {
    users,
    courses,
    enrollments,
    grades,
    libraryBooks,
    libraryBorrows,
  };
}

// Database access class
export class CollegeDatabase {
  private static load(): DatabaseSchema {
    ensureDataDir();
    if (!fs.existsSync(DB_FILE)) {
      // Return a blank structure. We seed synchronously during app startup inside server.ts
      throw new Error("DB file not initialized");
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  }

  private static save(data: DatabaseSchema) {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  public static async initialize() {
    ensureDataDir();
    if (!fs.existsSync(DB_FILE)) {
      const initial = await getInitialData();
      this.save(initial);
      console.log("Database seeded successfully at:", DB_FILE);
    }
  }

  // Get queries
  public static getUsers(): User[] {
    return this.load().users;
  }

  public static getCourses(): Course[] {
    return this.load().courses;
  }

  public static getEnrollments(): Enrollment[] {
    return this.load().enrollments;
  }

  public static getGrades(): Grade[] {
    return this.load().grades;
  }

  public static getLibraryBooks(): LibraryBook[] {
    return this.load().libraryBooks;
  }

  public static getLibraryBorrows(): LibraryBorrow[] {
    return this.load().libraryBorrows;
  }

  // Set updates
  public static saveUsers(users: User[]) {
    const data = this.load();
    data.users = users;
    this.save(data);
  }

  public static saveCourses(courses: Course[]) {
    const data = this.load();
    data.courses = courses;
    this.save(data);
  }

  public static saveEnrollments(enrollments: Enrollment[]) {
    const data = this.load();
    data.enrollments = enrollments;
    this.save(data);
  }

  public static saveGrades(grades: Grade[]) {
    const data = this.load();
    data.grades = grades;
    this.save(data);
  }

  public static saveLibraryBooks(books: LibraryBook[]) {
    const data = this.load();
    data.libraryBooks = books;
    this.save(data);
  }

  public static saveLibraryBorrows(borrows: LibraryBorrow[]) {
    const data = this.load();
    data.libraryBorrows = borrows;
    this.save(data);
  }
}
