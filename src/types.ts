export interface User {
  id: string;
  email: string;
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

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
