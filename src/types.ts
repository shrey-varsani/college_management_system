export interface User {
  id: string;
  email: string;
  role: "student" | "faculty" | "librarian" | "principal";
  fullName: string;
  department: string;
  phone: string;
  registrationDate: string;
  rollNumber?: string;
  enrollmentNo?: string;
  branch?: string;
  semester?: string;
  section?: string;
  address?: string;
  profilePic?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  department: string;
  facultyId: string | null;
  timeSlot: string | null;
  room: string | null;
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
  score: number;
  weight: number;
}

export interface Attendance {
  id: string;
  studentId?: string;
  studentName: string;
  enrollmentNo: string;
  courseId: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  remarks?: string;
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

export interface ExamMarkEntry {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNo: string;
  academicYear: string;
  examType: string;
  department: string;
  branch: string;
  semester: string;
  section: string;
  courseId: string;
  theoryMarks: number;
  practicalMarks: number;
  internalMarks: number;
  assignmentMarks: number;
  vivaMarks: number;
  maxTheory: number;
  maxPractical: number;
  maxInternal: number;
  maxAssignment: number;
  maxViva: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  status: "Pass" | "Fail";
  isDraft: boolean;
  isPublished: boolean;
}

export interface ExamAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
