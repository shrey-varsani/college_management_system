import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { LibraryBook, LibraryBorrow, LibraryReservation, LibraryFine, User } from "../types";
import { useSelector, useDispatch } from "react-redux";
import { RootState, logout, updateUser } from "../lib/store";
import { 
  Library, Search, Plus, RotateCcw, UserPlus, FileText, Check, Clock, AlertCircle, 
  Trash2, Edit, Save, X, BookOpen, Users, Coins, Bell, Settings, ArrowLeftRight, 
  TrendingUp, Download, CheckCircle2, AlertTriangle, Calendar, RefreshCw, 
  LogOut, MapPin, Tag, BookMarked, UserCheck, CheckCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Cell, PieChart, Pie
} from "recharts";

export default function LibraryManager() {
  const { user } = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // Active module tab
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Filter/Search states
  const [bookSearch, setBookSearch] = useState("");
  const [bookCategory, setBookCategory] = useState("All");
  const [bookAvailability, setBookAvailability] = useState("All");

  const [borrowSearch, setBorrowSearch] = useState("");
  const [borrowStatus, setBorrowStatus] = useState("All");

  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationStatus, setReservationStatus] = useState("All");

  const [fineSearch, setFineSearch] = useState("");
  const [fineStatus, setFineStatus] = useState("All");

  const [memberSearch, setMemberSearch] = useState("");
  const [memberRole, setMemberRole] = useState("All");

  // Form Modals / Active Items
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [showIssueBook, setShowIssueBook] = useState(false);
  const [showReserveBook, setShowReserveBook] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  // Announcement Form State
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState("college");

  // Settings Forms States
  const [profileName, setProfileName] = useState(user?.fullName || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [profileAddress, setProfileAddress] = useState(user?.address || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifyOverdue, setNotifyOverdue] = useState(true);
  const [notifyReservations, setNotifyReservations] = useState(true);

  // New Book Form State
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "Computer Science",
    publisher: "",
    publishYear: new Date().getFullYear(),
    shelfLocation: "A-1",
    totalCopies: 5
  });

  // Issue Form State
  const [issueForm, setIssueForm] = useState({
    bookId: "",
    studentEmail: "",
    durationDays: 14
  });

  // Reserve Form State
  const [reserveForm, setReserveForm] = useState({
    bookId: "",
    studentEmail: ""
  });

  // Reports state
  const [selectedReport, setSelectedReport] = useState("inventory");

  // API Queries
  const { data: books = [], isLoading: isLoadingBooks } = useQuery<LibraryBook[]>({
    queryKey: ["books"],
    queryFn: async () => {
      const res = await api.get("/library/books");
      return res.data;
    }
  });

  const { data: borrows = [], isLoading: isLoadingBorrows } = useQuery<LibraryBorrow[]>({
    queryKey: ["borrows"],
    queryFn: async () => {
      const res = await api.get("/library/borrows");
      return res.data;
    }
  });

  const { data: reservations = [], isLoading: isLoadingReservations } = useQuery<LibraryReservation[]>({
    queryKey: ["reservations"],
    queryFn: async () => {
      const res = await api.get("/library/reservations");
      return res.data;
    }
  });

  const { data: fines = [], isLoading: isLoadingFines } = useQuery<LibraryFine[]>({
    queryKey: ["fines"],
    queryFn: async () => {
      const res = await api.get("/library/fines");
      return res.data;
    }
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
    enabled: user?.role === "librarian"
  });

  const { data: notices = [], refetch: refetchNotices } = useQuery<any[]>({
    queryKey: ["notices"],
    queryFn: async () => {
      const res = await api.get("/api/notices");
      return res.data;
    }
  });

  // API Mutations
  const addBookMutation = useMutation({
    mutationFn: async (data: Partial<LibraryBook>) => {
      return api.post("/library/books", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setShowAddBook(false);
      setNewBook({
        title: "",
        author: "",
        isbn: "",
        category: "Computer Science",
        publisher: "",
        publishYear: new Date().getFullYear(),
        shelfLocation: "A-1",
        totalCopies: 5
      });
      toast.success("Book cataloged and loaded into inventory!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to add book.");
    }
  });

  const updateBookMutation = useMutation({
    mutationFn: async (data: LibraryBook) => {
      return api.put(`/library/books/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setEditingBook(null);
      toast.success("Book inventory details updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update book.");
    }
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/library/books/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast.success("Book permanently archived and removed from catalog.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete book.");
    }
  });

  const issueLoanMutation = useMutation({
    mutationFn: async (data: typeof issueForm) => {
      return api.post("/library/borrow", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      setShowIssueBook(false);
      setIssueForm({ bookId: "", studentEmail: "", durationDays: 14 });
      toast.success("Book issued successfully and transaction logged!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Borrowing limit exceeded or duplicate check-out.");
    }
  });

  const returnBookMutation = useMutation({
    mutationFn: async (borrowId: string) => {
      return api.post(`/library/return/${borrowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      queryClient.invalidateQueries({ queryKey: ["fines"] });
      toast.success("Volume successfully returned and inventory restored.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to return book.");
    }
  });

  const renewLoanMutation = useMutation({
    mutationFn: async (borrowId: string) => {
      return api.post(`/library/renew/${borrowId}`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      toast.success(res.data.message || "Loan duration extended by 14 days!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Renewal denied (max limit reached).");
    }
  });

  const approveReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/library/reservations/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Reservation approved! Notification sent for pickup.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Approval failed.");
    }
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/library/reservations/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Reservation cancelled cleanly.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Cancellation failed.");
    }
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: typeof reserveForm) => {
      return api.post("/library/reserve", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setShowReserveBook(false);
      setReserveForm({ bookId: "", studentEmail: "" });
      toast.success("Seat reservation logged. Borrower will be notified.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create reservation.");
    }
  });

  const payFineMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/library/fines/${id}/pay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fines"] });
      toast.success("Overdue fine payment cleared and ledger updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Payment clearing failed.");
    }
  });

  const createNoticeMutation = useMutation({
    mutationFn: async (noticeData: any) => {
      return api.post("/api/notices", noticeData);
    },
    onSuccess: () => {
      toast.success("Library notice published to notice board!");
      setAnnouncementTitle("");
      setAnnouncementContent("");
      refetchNotices();
    },
    onError: (err: any) => {
      toast.error("Announcement posting failed.");
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return api.put("/api/profile/details", profileData);
    },
    onSuccess: (res: any) => {
      dispatch(updateUser(res.data.user));
      toast.success("Librarian profile settings saved.");
    },
    onError: () => {
      toast.error("Failed to update profile.");
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: any) => {
      return api.post("/api/profile/change-password", passwordData);
    },
    onSuccess: () => {
      toast.success("Security credentials successfully changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Security change rejected.");
    }
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = books.length;
    const totalCopies = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
    const available = books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
    const issued = borrows.filter(b => b.status === "borrowed" || b.status === "overdue").length;
    const overdue = borrows.filter(b => b.status === "overdue").length;
    const activeReservations = reservations.filter(r => r.status === "pending" || r.status === "approved").length;
    const pendingReturns = borrows.filter(b => b.status === "borrowed" || b.status === "overdue").length;

    const totalFinesAccrued = fines.reduce((acc, f) => acc + f.amount, 0);
    const totalFinesCollected = fines.reduce((acc, f) => acc + f.paidAmount, 0);
    const totalFinesPending = fines.filter(f => f.status === "pending").reduce((acc, f) => acc + f.amount, 0);

    return {
      total,
      totalCopies,
      available,
      issued,
      overdue,
      activeReservations,
      pendingReturns,
      totalFinesAccrued,
      totalFinesCollected,
      totalFinesPending
    };
  }, [books, borrows, reservations, fines]);

  // Handle Deleting book safely
  const handleDeleteBook = (id: string) => {
    if (window.confirm("Are you absolutely sure you want to permanently delete this book? This will clear all records.")) {
      deleteBookMutation.mutate(id);
    }
  };

  // Helper to trigger real CSV download
  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data available to compile.");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const val = row[header];
          return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Export complete! Downloaded ${filename}`);
  };

  // Charts data compilation
  const chartDataFines = useMemo(() => {
    // Generate a daily trend mockup based on fines
    const paidFines = fines.filter(f => f.status === "paid" && f.paymentDate);
    const trend: Record<string, number> = {};
    
    // Default mock week if no data
    if (paidFines.length === 0) {
      return [
        { date: "Jul 13", Collected: 15.0, Pending: 24.0 },
        { date: "Jul 14", Collected: 30.0, Pending: 45.0 },
        { date: "Jul 15", Collected: 25.0, Pending: 15.0 },
        { date: "Jul 16", Collected: 45.0, Pending: 35.0 },
        { date: "Jul 17", Collected: 60.0, Pending: 20.0 },
        { date: "Jul 18", Collected: 85.0, Pending: 12.0 },
        { date: "Jul 19", Collected: stats.totalFinesCollected, Pending: stats.totalFinesPending }
      ];
    }

    paidFines.forEach(f => {
      const dateKey = f.paymentDate ? f.paymentDate.substring(5, 10) : "Other";
      trend[dateKey] = (trend[dateKey] || 0) + f.paidAmount;
    });

    return Object.entries(trend).map(([date, amt]) => ({
      date,
      Collected: amt,
      Pending: fines.filter(f => f.status === "pending").reduce((sum, fx) => sum + fx.amount, 0) / 5
    })).slice(-7);
  }, [fines, stats]);

  const chartDataCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    books.forEach(b => {
      cats[b.category] = (cats[b.category] || 0) + 1;
    });
    return Object.entries(cats).map(([name, count]) => ({ name, count }));
  }, [books]);

  // Filters logic
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const sMatch = b.title.toLowerCase().includes(bookSearch.toLowerCase()) || 
                     b.author.toLowerCase().includes(bookSearch.toLowerCase()) || 
                     b.isbn.toLowerCase().includes(bookSearch.toLowerCase());
      const cMatch = bookCategory === "All" || b.category === bookCategory;
      const aMatch = bookAvailability === "All" || 
                     (bookAvailability === "Available" && b.availableCopies > 0) ||
                     (bookAvailability === "Out" && b.availableCopies === 0);
      return sMatch && cMatch && aMatch;
    });
  }, [books, bookSearch, bookCategory, bookAvailability]);

  const filteredBorrows = useMemo(() => {
    return borrows.filter(b => {
      const book = books.find(x => x.id === b.bookId);
      const student = users.find(u => u.id === b.studentId);
      const sMatch = (book?.title || "").toLowerCase().includes(borrowSearch.toLowerCase()) || 
                     (student?.fullName || "").toLowerCase().includes(borrowSearch.toLowerCase()) || 
                     (student?.email || "").toLowerCase().includes(borrowSearch.toLowerCase());
      const stMatch = borrowStatus === "All" || b.status === borrowStatus;
      return sMatch && stMatch;
    });
  }, [borrows, books, users, borrowSearch, borrowStatus]);

  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const book = books.find(x => x.id === r.bookId);
      const sMatch = (book?.title || "").toLowerCase().includes(reservationSearch.toLowerCase()) || 
                     r.studentEmail.toLowerCase().includes(reservationSearch.toLowerCase());
      const stMatch = reservationStatus === "All" || r.status === reservationStatus;
      return sMatch && stMatch;
    });
  }, [reservations, books, reservationSearch, reservationStatus]);

  const filteredFines = useMemo(() => {
    return fines.filter(f => {
      const sMatch = f.studentEmail.toLowerCase().includes(fineSearch.toLowerCase());
      const stMatch = fineStatus === "All" || f.status === fineStatus;
      return sMatch && stMatch;
    });
  }, [fines, fineSearch, fineStatus]);

  const filteredMembers = useMemo(() => {
    return users.filter(u => {
      if (u.role === "librarian" || u.role === "principal") return false;
      const sMatch = u.fullName.toLowerCase().includes(memberSearch.toLowerCase()) || 
                     u.email.toLowerCase().includes(memberSearch.toLowerCase()) || 
                     u.department.toLowerCase().includes(memberSearch.toLowerCase());
      const rMatch = memberRole === "All" || u.role === memberRole;
      return sMatch && rMatch;
    });
  }, [users, memberSearch, memberRole]);

  // Member History Details
  const memberLoans = useMemo(() => {
    if (!selectedMember) return [];
    return borrows.filter(b => b.studentId === selectedMember.id);
  }, [borrows, selectedMember]);

  const memberFines = useMemo(() => {
    if (!selectedMember) return [];
    return fines.filter(f => f.studentId === selectedMember.id);
  }, [fines, selectedMember]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      fullName: profileName,
      phone: profilePhone,
      address: profileAddress
    });
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password matching credentials check failed.");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementContent) {
      toast.error("Please fill in notice title and body.");
      return;
    }
    createNoticeMutation.mutate({
      title: announcementTitle,
      content: announcementContent,
      category: announcementTarget,
      date: new Date().toISOString().split("T")[0]
    });
  };

  // If role is not librarian, show simple search view
  if (user?.role !== "librarian") {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-zinc-800 pb-5">
          <h2 className="flex items-center gap-2 font-sans text-2xl font-semibold text-slate-900 dark:text-white">
            <Library className="h-6 w-6 text-indigo-500" />
            University Library Center
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            View the live inventory of physical catalog volumes, resources, and check outstanding loan states.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search volumes by Title, Author, or ISBN..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <select
                value={bookCategory}
                onChange={(e) => setBookCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
              {filteredBooks.map((b) => (
                <div key={b.id} className="p-4 border border-slate-100 dark:border-zinc-900 rounded-lg bg-slate-50/50 dark:bg-zinc-900/40 flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{b.title}</h4>
                    <p className="text-xs text-slate-500">by {b.author}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded font-mono uppercase">{b.category}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ISBN: {b.isbn}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-zinc-300">
                      {b.availableCopies} / {b.totalCopies} Available
                    </span>
                    {b.availableCopies > 0 ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">In Library</span>
                    ) : (
                      <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded-full font-semibold">All Issued</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">My Outstanding Loans</h3>
            {borrows.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No active loan records found.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {borrows.map((b) => {
                  const book = books.find(bx => bx.id === b.bookId);
                  return (
                    <div key={b.id} className="p-3 border border-slate-100 dark:border-zinc-900 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate max-w-[150px]">{book?.title || "Book"}</span>
                        {b.status === "returned" ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Returned</span>
                        ) : b.status === "overdue" ? (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded animate-pulse">Overdue</span>
                        ) : (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Active</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-slate-400">
                        <div>DUE: {b.dueDate}</div>
                        <div>ISSUED: {b.borrowDate}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LIBRARIAN FULL PORTAL VIEW
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white px-6 py-8 border-b border-indigo-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-bold tracking-wider">
              Librarian Workspace
            </span>
            <span className="text-slate-400 text-xs">| Portal Console 3.0</span>
          </div>
          <h1 className="text-2xl font-grotesk font-semibold tracking-tight mt-1.5 flex items-center gap-2">
            <Library className="h-6 w-6 text-indigo-400" />
            CampusFlow Library System
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            System Supervisor: <strong className="text-white">{user?.fullName}</strong> ({user?.email}) • Active Session
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-right">
          <span className="block text-[10px] text-indigo-300 font-mono tracking-wider font-bold">UTC LOCAL TIMELINE</span>
          <span className="text-xs font-mono font-medium text-white">2026-07-19 01:42</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sub-navigation sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-1 shrink-0">
          <span className="text-[10px] font-mono font-semibold uppercase text-slate-400 dark:text-zinc-500 px-3 py-1.5 tracking-wider">
            Library Operations
          </span>
          {[
            { id: "dashboard", label: "Dashboard Hub", icon: Library },
            { id: "books", label: "Book Management", icon: BookMarked },
            { id: "issue-return", label: "Issue & Return", icon: ArrowLeftRight },
            { id: "reservations", label: "Book Reservations", icon: Clock },
            { id: "fines", label: "Fine Management", icon: Coins },
            { id: "members", label: "Member Directory", icon: Users },
            { id: "reports", label: "System Reports", icon: FileText },
            { id: "notifications", label: "Announcements", icon: Bell },
            { id: "settings", label: "Portal Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  active 
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20" 
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? "text-white" : "text-slate-400 dark:text-zinc-500"}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Workspace Display */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-6"
            >
              {/* MODULE 1: DASHBOARD */}
              {activeTab === "dashboard" && (
                <>
                  {/* Quick Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Titles", value: stats.total, sub: `${stats.totalCopies} physical copies`, color: "indigo" },
                      { label: "In Stock Copies", value: stats.available, sub: "ready to borrow", color: "emerald" },
                      { label: "Active Loans", value: stats.issued, sub: `${stats.overdue} overdue`, color: "amber" },
                      { label: "Pending Fines", value: `$${stats.totalFinesPending.toFixed(2)}`, sub: "awaiting payment", color: "rose" }
                    ].map((card, i) => (
                      <div key={i} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:scale-[1.02] transition duration-200">
                        <span className="text-[11px] text-slate-400 font-medium">{card.label}</span>
                        <div className="my-2">
                          <span className={`text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-white`}>
                            {card.value}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono tracking-wide">{card.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-100/50 dark:bg-zinc-900/40 p-4 rounded-lg flex items-center gap-3">
                      <Clock className="h-5 w-5 text-indigo-500" />
                      <div>
                        <span className="block text-[10px] text-slate-400">BOOK RESERVATIONS</span>
                        <span className="text-sm font-semibold">{stats.activeReservations} pending requests</span>
                      </div>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-zinc-900/40 p-4 rounded-lg flex items-center gap-3">
                      <RotateCcw className="h-5 w-5 text-emerald-500" />
                      <div>
                        <span className="block text-[10px] text-slate-400">PENDING RETURNS</span>
                        <span className="text-sm font-semibold">{stats.pendingReturns} current checkouts</span>
                      </div>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-zinc-900/40 p-4 rounded-lg flex items-center gap-3">
                      <Coins className="h-5 w-5 text-amber-500" />
                      <div>
                        <span className="block text-[10px] text-slate-400">FINES COLLECTED</span>
                        <span className="text-sm font-semibold">${stats.totalFinesCollected.toFixed(2)} total</span>
                      </div>
                    </div>
                  </div>

                  {/* Charts section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Distribution Chart */}
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm">
                      <h3 className="text-xs font-semibold uppercase text-slate-400 font-mono tracking-wider mb-4">Catalog distribution by Category</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartDataCategories}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={10} stroke="#888" />
                            <YAxis fontSize={10} stroke="#888" />
                            <Tooltip contentStyle={{ background: '#111', border: 'none', borderRadius: 4, color: '#fff', fontSize: 11 }} />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                              {chartDataCategories.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"][index % 6]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Fine Collections trend */}
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm">
                      <h3 className="text-xs font-semibold uppercase text-slate-400 font-mono tracking-wider mb-4">Fine payments collection trend</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartDataFines}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" fontSize={10} stroke="#888" />
                            <YAxis fontSize={10} stroke="#888" />
                            <Tooltip contentStyle={{ background: '#111', border: 'none', borderRadius: 4, color: '#fff', fontSize: 11 }} />
                            <Legend fontSize={10} wrapperStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={2.5} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Overdue Alerts Table */}
                  <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase text-slate-400 font-mono tracking-wider">Critical Outstanding Overdues</h3>
                      <span className="text-[10px] text-rose-500 font-semibold bg-rose-100/50 px-2.5 py-0.5 rounded">Action Required</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-zinc-900 text-slate-400 uppercase text-[9px] font-mono tracking-wider font-semibold">
                            <th className="py-2.5">Book Volume</th>
                            <th className="py-2.5">Borrower Email</th>
                            <th className="py-2.5">Due Date</th>
                            <th className="py-2.5">Outstanding Status</th>
                            <th className="py-2.5 text-right">Fine Accrued</th>
                          </tr>
                        </thead>
                        <tbody>
                          {borrows.filter(b => b.status === "overdue").slice(0, 5).map((b) => {
                            const bk = books.find(x => x.id === b.bookId);
                            const fine = fines.find(f => f.borrowId === b.id);
                            return (
                              <tr key={b.id} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                                <td className="py-3 font-medium text-slate-900 dark:text-zinc-100">{bk?.title || "Unknown Book"}</td>
                                <td className="py-3 font-mono text-indigo-500">{fine?.studentEmail || "student@college.edu"}</td>
                                <td className="py-3 font-mono">{b.dueDate}</td>
                                <td className="py-3">
                                  <span className="text-[9px] bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded font-semibold animate-pulse">LATE OUTSTANDING</span>
                                </td>
                                <td className="py-3 text-right font-mono text-rose-500 font-semibold">${fine?.amount.toFixed(2) || "0.00"}</td>
                              </tr>
                            );
                          })}
                          {borrows.filter(b => b.status === "overdue").length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">All books are within terms. No active overdue books.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* MODULE 2: BOOK MANAGEMENT */}
              {activeTab === "books" && (
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-6 shadow-sm flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Physical Asset Inventory</h2>
                      <p className="text-xs text-slate-400">Manage titles, subject classifications, shelf locations, and copies.</p>
                    </div>
                    <button
                      onClick={() => setShowAddBook(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Add Title
                    </button>
                  </div>

                  {/* Search and Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative md:col-span-2">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by title, author, isbn..."
                        value={bookSearch}
                        onChange={(e) => setBookSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      value={bookCategory}
                      onChange={(e) => setBookCategory(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="All">All Categories</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Business">Business</option>
                      <option value="Literature">Literature</option>
                    </select>
                    <select
                      value={bookAvailability}
                      onChange={(e) => setBookAvailability(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="All">All Stock Statuses</option>
                      <option value="Available">Available for borrow</option>
                      <option value="Out">All copies borrowed</option>
                    </select>
                  </div>

                  {/* Books Table */}
                  <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-900 text-slate-400 uppercase text-[9px] font-mono tracking-wider font-semibold">
                          <th className="py-3 px-4">ISBN</th>
                          <th className="py-3 px-4">Title & Author</th>
                          <th className="py-3 px-4">Publisher</th>
                          <th className="py-3 px-4">Classification</th>
                          <th className="py-3 px-4">Shelf location</th>
                          <th className="py-3 px-4">Copies (Avail/Total)</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBooks.map((b) => (
                          <tr key={b.id} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                            <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{b.isbn}</td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-950 dark:text-zinc-100 block">{b.title}</span>
                              <span className="text-slate-400 text-[10px]">by {b.author}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">{b.publisher || "College Press"}</td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-zinc-850 dark:text-zinc-400 px-2 py-0.5 rounded font-mono uppercase">
                                {b.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-600 dark:text-zinc-400">
                              <MapPin className="h-3 w-3 inline text-slate-400 mr-1" />
                              {b.shelfLocation || "A-1"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold font-mono text-sm ${b.availableCopies === 0 ? "text-rose-500" : "text-emerald-500"}`}>
                                  {b.availableCopies}
                                </span>
                                <span className="text-slate-400 font-mono">/</span>
                                <span className="text-slate-500 font-mono">{b.totalCopies}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setEditingBook(b)}
                                  className="text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 p-1 rounded-md transition"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBook(b.id)}
                                  className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 p-1 rounded-md transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 3: ISSUE & RETURN */}
              {activeTab === "issue-return" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Issue Form */}
                  <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-indigo-500" />
                      Issue New Book Loan
                    </h3>
                    <p className="text-xs text-slate-400">Log a physical book issue. Checks rules and limits automatically.</p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!issueForm.bookId || !issueForm.studentEmail) {
                          toast.error("Complete specifications required");
                          return;
                        }
                        issueLoanMutation.mutate(issueForm);
                      }}
                      className="flex flex-col gap-4 mt-2"
                    >
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Select Book Volume</label>
                        <select
                          value={issueForm.bookId}
                          onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          required
                        >
                          <option value="">-- Choose Book --</option>
                          {books
                            .filter((b) => b.availableCopies > 0)
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.title} ({b.availableCopies} available)
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Scholar Borrower Email</label>
                        <input
                          type="email"
                          placeholder="student@college.edu or faculty@college.edu"
                          value={issueForm.studentEmail}
                          onChange={(e) => setIssueForm({ ...issueForm, studentEmail: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Loan Duration (Days)</label>
                        <input
                          type="number"
                          min="3"
                          max="30"
                          value={issueForm.durationDays}
                          onChange={(e) => setIssueForm({ ...issueForm, durationDays: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={issueLoanMutation.isPending}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition mt-2 flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="h-4 w-4" />
                        Log Issue Transaction
                      </button>
                    </form>
                  </div>

                  {/* Active Loans Table */}
                  <div className="md:col-span-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Active Borrow Ledgers</h3>
                        <p className="text-xs text-slate-400">Total active physical loans issued across the campus.</p>
                      </div>
                      <div className="relative w-full sm:w-48">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search borrow..."
                          value={borrowSearch}
                          onChange={(e) => setBorrowSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded pl-8 pr-3 py-1 text-[11px] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-900 text-slate-400 uppercase text-[9px] font-mono tracking-wider font-semibold">
                            <th className="py-2.5 px-3">Book</th>
                            <th className="py-2.5 px-3">Borrower ID/Email</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBorrows.map((b) => {
                            const bk = books.find(x => x.id === b.bookId);
                            const activeUser = users.find(u => u.id === b.studentId);
                            return (
                              <tr key={b.id} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50">
                                <td className="py-3 px-3">
                                  <span className="font-medium text-slate-900 dark:text-white block truncate max-w-[150px]">{bk?.title || "Book"}</span>
                                  <span className="text-[10px] text-slate-400">ISBN: {bk?.isbn}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-mono text-indigo-500 block text-[10px]">{activeUser?.fullName || "Scholar User"}</span>
                                  <span className="text-slate-400 text-[9px] font-mono">{activeUser?.email}</span>
                                </td>
                                <td className="py-3 px-3 font-mono">{b.dueDate}</td>
                                <td className="py-3 px-3">
                                  {b.status === "returned" ? (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold">Returned</span>
                                  ) : b.status === "overdue" ? (
                                    <span className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded font-semibold animate-pulse">Overdue</span>
                                  ) : (
                                    <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded font-semibold">Active</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {b.status !== "returned" && (
                                    <div className="flex justify-center gap-1.5">
                                      <button
                                        onClick={() => renewLoanMutation.mutate(b.id)}
                                        className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900 px-2 py-1 rounded font-medium transition"
                                      >
                                        Renew
                                      </button>
                                      <button
                                        onClick={() => returnBookMutation.mutate(b.id)}
                                        className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:hover:bg-emerald-900 px-2 py-1 rounded font-medium transition"
                                      >
                                        Return
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 4: BOOK RESERVATION */}
              {activeTab === "reservations" && (
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Member Reserve Ledger</h2>
                      <p className="text-xs text-slate-400">Track and fulfill book reservations requested by students/faculty.</p>
                    </div>
                    <button
                      onClick={() => setShowReserveBook(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Place Reservation
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative sm:col-span-2">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search reservations by member email or title..."
                        value={reservationSearch}
                        onChange={(e) => setReservationSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <select
                      value={reservationStatus}
                      onChange={(e) => setReservationStatus(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="All">All reservation statuses</option>
                      <option value="pending">Pending approvals</option>
                      <option value="approved">Approved & Reserved</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-900 text-slate-400 uppercase text-[9px] font-mono tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Reserved Book</th>
                          <th className="py-2.5 px-3">Borrower Student Email</th>
                          <th className="py-2.5 px-3">Date Reserved</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-center">Fulfillment actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReservations.map((r) => {
                          const bk = books.find(x => x.id === r.bookId);
                          return (
                            <tr key={r.id} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50">
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-900 dark:text-white block">{bk?.title || "Book"}</span>
                                <span className="text-[10px] text-slate-400">Author: {bk?.author}</span>
                              </td>
                              <td className="py-3 px-3 font-mono text-indigo-500">{r.studentEmail}</td>
                              <td className="py-3 px-3 font-mono">{r.reserveDate}</td>
                              <td className="py-3 px-3">
                                {r.status === "pending" ? (
                                  <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">Pending Approval</span>
                                ) : r.status === "approved" ? (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">Approved (Ready)</span>
                                ) : (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-semibold">Cancelled</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {r.status === "pending" && (
                                  <div className="flex justify-center gap-1.5">
                                    <button
                                      onClick={() => approveReservationMutation.mutate(r.id)}
                                      className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => cancelReservationMutation.mutate(r.id)}
                                      className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 5: FINE MANAGEMENT */}
              {activeTab === "fines" && (
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Late Return Fine Administration</h2>
                    <p className="text-xs text-slate-400">Review outstanding liabilities, collect fine receipts, and track payment histories.</p>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 dark:border-zinc-900 pb-5">
                    <div className="p-4 border border-dashed rounded-lg bg-indigo-50/10 border-indigo-200">
                      <span className="block text-[10px] text-slate-400 font-mono uppercase">Cumulative Liabilities Accrued</span>
                      <span className="text-2xl font-bold font-sans text-slate-800 dark:text-white">${stats.totalFinesAccrued.toFixed(2)}</span>
                    </div>
                    <div className="p-4 border border-dashed rounded-lg bg-emerald-50/10 border-emerald-200">
                      <span className="block text-[10px] text-slate-400 font-mono uppercase">Fine collections received</span>
                      <span className="text-2xl font-bold font-sans text-emerald-600">${stats.totalFinesCollected.toFixed(2)}</span>
                    </div>
                    <div className="p-4 border border-dashed rounded-lg bg-rose-50/10 border-rose-200">
                      <span className="block text-[10px] text-slate-400 font-mono uppercase">Uncollected outstanding fines</span>
                      <span className="text-2xl font-bold font-sans text-rose-500">${stats.totalFinesPending.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative sm:col-span-2">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search outstanding accounts by email..."
                        value={fineSearch}
                        onChange={(e) => setFineSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <select
                      value={fineStatus}
                      onChange={(e) => setFineStatus(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="All">All fines status</option>
                      <option value="pending">Uncollected fine balances</option>
                      <option value="paid">Cleared fine records</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-900 text-slate-400 uppercase text-[9px] font-mono tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Borrower Account</th>
                          <th className="py-2.5 px-3">Late Return Date</th>
                          <th className="py-2.5 px-3">Fine Liability</th>
                          <th className="py-2.5 px-3">Receipt status</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFines.map((f) => (
                          <tr key={f.id} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50">
                            <td className="py-3 px-3">
                              <span className="font-semibold block text-slate-900 dark:text-white">{f.studentEmail}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Reference: {f.borrowId}</span>
                            </td>
                            <td className="py-3 px-3 font-mono">{f.dueDate}</td>
                            <td className="py-3 px-3 font-mono font-semibold text-rose-500">${f.amount.toFixed(2)}</td>
                            <td className="py-3 px-3">
                              {f.status === "paid" ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">Cleared Receipt</span>
                              ) : (
                                <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-semibold animate-pulse">Pending Collection</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {f.status === "pending" && (
                                <button
                                  onClick={() => payFineMutation.mutate(f.id)}
                                  className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                                >
                                  Collect Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 6: MEMBER MANAGEMENT */}
              {activeTab === "members" && (
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Scholar Member Directory</h2>
                    <p className="text-xs text-slate-400">Search students/faculty borrow activities, active loan counts, and late flags.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative sm:col-span-2">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search members by name, email, department..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="All">All Roles</option>
                      <option value="student">Student Members</option>
                      <option value="faculty">Faculty Members</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-900 text-slate-400 uppercase text-[9px] font-mono tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Member Details</th>
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3">Branch & Dept</th>
                          <th className="py-2.5 px-3">Active checkouts</th>
                          <th className="py-2.5 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => {
                          const activeCount = borrows.filter(b => b.studentId === m.id && b.status !== "returned").length;
                          return (
                            <tr key={m.id} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50">
                              <td className="py-3 px-3">
                                <span className="font-semibold block text-slate-900 dark:text-white">{m.fullName}</span>
                                <span className="text-[9px] uppercase bg-slate-100 text-slate-600 px-1.5 py-0.2 w-fit rounded font-semibold block mt-1">{m.role}</span>
                              </td>
                              <td className="py-3 px-3 font-mono text-indigo-500">{m.email}</td>
                              <td className="py-3 px-3 text-slate-500">{m.department}</td>
                              <td className="py-3 px-3">
                                <span className={`font-semibold font-mono ${activeCount > 0 ? "text-indigo-600" : "text-slate-400"}`}>
                                  {activeCount} active loans
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  onClick={() => setSelectedMember(m)}
                                  className="text-[10px] bg-slate-100 hover:bg-indigo-600 hover:text-white px-2.5 py-1.5 rounded transition font-medium"
                                >
                                  Borrow Ledger
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 7: REPORTS */}
              {activeTab === "reports" && (
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white font-grotesk">Library Audit Report center</h2>
                      <p className="text-xs text-slate-400">Generate real inventory breakdowns, transaction history, and late return audits.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (selectedReport === "inventory") {
                            handleExportCSV(books, "Library_Inventory_Audit.csv");
                          } else if (selectedReport === "transactions") {
                            handleExportCSV(borrows, "Library_Loans_Activity_Ledger.csv");
                          } else {
                            handleExportCSV(fines, "Library_Fine_Liabilities_Report.csv");
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Download className="h-4 w-4" />
                        Export to CSV
                      </button>
                    </div>
                  </div>

                  <div className="flex border-b border-slate-100 dark:border-zinc-800 gap-2">
                    {[
                      { id: "inventory", label: "Inventory Audit" },
                      { id: "transactions", label: "Borrow transactions logs" },
                      { id: "fines", label: "Fine Liabilities Audit" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedReport(tab.id)}
                        className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                          selectedReport === tab.id 
                            ? "border-indigo-600 text-indigo-600" 
                            : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Render dynamic reports */}
                  {selectedReport === "inventory" && (
                    <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-mono font-semibold">
                            <th className="py-2 px-3">ISBN</th>
                            <th className="py-2 px-3">Title & Author</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3">Stock copies</th>
                          </tr>
                        </thead>
                        <tbody>
                          {books.map((b) => (
                            <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                              <td className="py-2.5 px-3 font-mono">{b.isbn}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold block">{b.title}</span>
                                <span className="text-slate-400 text-[10px]">{b.author}</span>
                              </td>
                              <td className="py-2.5 px-3 uppercase text-[10px] font-mono">{b.category}</td>
                              <td className="py-2.5 px-3 font-mono font-semibold">{b.availableCopies} / {b.totalCopies}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedReport === "transactions" && (
                    <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-mono font-semibold">
                            <th className="py-2 px-3">Transaction ID</th>
                            <th className="py-2 px-3">Book Ref ID</th>
                            <th className="py-2 px-3">Borrower Scholar ID</th>
                            <th className="py-2 px-3">Due Date</th>
                            <th className="py-2 px-3">Outstanding status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {borrows.map((b) => (
                            <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                              <td className="py-2.5 px-3 font-mono">{b.id}</td>
                              <td className="py-2.5 px-3 font-mono">{b.bookId}</td>
                              <td className="py-2.5 px-3 font-mono">{b.studentId}</td>
                              <td className="py-2.5 px-3 font-mono">{b.dueDate}</td>
                              <td className="py-2.5 px-3 uppercase text-[10px] font-mono">{b.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedReport === "fines" && (
                    <div className="overflow-x-auto border border-slate-100 dark:border-zinc-900 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-mono font-semibold">
                            <th className="py-2 px-3">Fine Ref ID</th>
                            <th className="py-2 px-3">Borrower Account</th>
                            <th className="py-2.5 px-3">Overdue Date</th>
                            <th className="py-2.5 px-3">Accrued Amount</th>
                            <th className="py-2.5 px-3">Paid amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fines.map((f) => (
                            <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                              <td className="py-2.5 px-3 font-mono">{f.id}</td>
                              <td className="py-2.5 px-3 font-mono">{f.studentEmail}</td>
                              <td className="py-2.5 px-3 font-mono">{f.dueDate}</td>
                              <td className="py-2.5 px-3 font-mono text-rose-500 font-semibold">${f.amount.toFixed(2)}</td>
                              <td className="py-2.5 px-3 font-mono text-emerald-500 font-semibold">${f.paidAmount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 8: ANNOUNCEMENTS/NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Create Announcement */}
                  <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Bell className="h-4.5 w-4.5 text-indigo-500" />
                      Publish Library Announcement
                    </h3>
                    <p className="text-xs text-slate-400">Broadcast immediate library schedules, notices, or announcements systemwide.</p>

                    <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-4 mt-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Notice Title</label>
                        <input
                          type="text"
                          placeholder="e.g., Extended Exam Hours"
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target Audience</label>
                        <select
                          value={announcementTarget}
                          onChange={(e) => setAnnouncementTarget(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="college">Everyone (College)</option>
                          <option value="department">Computer Science Dept</option>
                          <option value="exam">Exam Candidates Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Announcement details</label>
                        <textarea
                          rows={4}
                          placeholder="Type notice body context..."
                          value={announcementContent}
                          onChange={(e) => setAnnouncementContent(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={createNoticeMutation.isPending}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition mt-1"
                      >
                        Publish Notice
                      </button>
                    </form>
                  </div>

                  {/* Active Announcements List */}
                  <div className="md:col-span-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Active Announcement Board</h3>
                    <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                      {notices.filter(n => n.category === "college" || n.category === "event").map((notice) => (
                        <div key={notice.id} className="p-4 border border-slate-100 dark:border-zinc-900 rounded-lg bg-slate-50/50 dark:bg-zinc-900/40 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">{notice.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{notice.date}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">{notice.content}</p>
                          <span className="text-[9px] uppercase bg-indigo-50 text-indigo-600 w-fit px-1.5 py-0.2 rounded font-semibold mt-1">
                            {notice.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 9: PORTAL SETTINGS */}
              {activeTab === "settings" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profile form */}
                  <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Supervisor Profile Configuration</h3>
                    <p className="text-xs text-slate-400">Update workspace details, office phone, and system locations.</p>

                    <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 mt-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Supervisor Full Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Office Telephone Phone</label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Work Address / Desk Desk</label>
                        <input
                          type="text"
                          value={profileAddress}
                          onChange={(e) => setProfileAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition"
                      >
                        Save Settings
                      </button>
                    </form>
                  </div>

                  {/* Change password and theme options */}
                  <div className="flex flex-col gap-6">
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Security Credentials</h3>
                      <p className="text-xs text-slate-400">Change your college supervisor portal password.</p>

                      <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4 mt-2" autoComplete="off">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">Current Password</label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">New Password</label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">Confirm New Password</label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition"
                        >
                          Modify Security Password
                        </button>
                      </form>
                    </div>

                    {/* Exit / Logout */}
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-5 shadow-sm flex flex-col gap-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Supervisor Session</h3>
                      <button
                        onClick={() => {
                          if (window.confirm("Do you want to log out of CampusFlow library supervisor portal?")) {
                            dispatch(logout());
                            toast.success("Successfully logged out from CampusFlow.");
                          }
                        }}
                        className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:hover:bg-rose-900 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out of Portal
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* MODAL: ADD BOOK */}
      {showAddBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-grotesk font-semibold text-slate-900 dark:text-zinc-200 text-base">Catalog New Physical Book</h3>
              <button onClick={() => setShowAddBook(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addBookMutation.mutate(newBook);
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Book Title</label>
                  <input
                    type="text"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Author Name(s)</label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">ISBN-13</label>
                  <input
                    type="text"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Subject category</label>
                  <select
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Business">Business</option>
                    <option value="Literature">Literature</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Publisher</label>
                  <input
                    type="text"
                    value={newBook.publisher}
                    onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={newBook.shelfLocation}
                    onChange={(e) => setNewBook({ ...newBook, shelfLocation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Total Stock copies</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newBook.totalCopies}
                    onChange={(e) => setNewBook({ ...newBook, totalCopies: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddBook(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBookMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Catalog book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BOOK */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-grotesk font-semibold text-slate-900 dark:text-zinc-200 text-base">Edit Catalog Volume Details</h3>
              <button onClick={() => setEditingBook(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateBookMutation.mutate(editingBook);
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Book Title</label>
                  <input
                    type="text"
                    value={editingBook.title}
                    onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Author Name(s)</label>
                  <input
                    type="text"
                    value={editingBook.author}
                    onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">ISBN-13</label>
                  <input
                    type="text"
                    value={editingBook.isbn}
                    onChange={(e) => setEditingBook({ ...editingBook, isbn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Subject category</label>
                  <select
                    value={editingBook.category}
                    onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Business">Business</option>
                    <option value="Literature">Literature</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Publisher</label>
                  <input
                    type="text"
                    value={editingBook.publisher || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, publisher: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={editingBook.shelfLocation || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, shelfLocation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Total copies</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingBook.totalCopies}
                    onChange={(e) => setEditingBook({ ...editingBook, totalCopies: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateBookMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PLACE RESERVATION */}
      {showReserveBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-grotesk font-semibold text-slate-900 dark:text-zinc-200 text-base">Place Book Reservation</h3>
              <button onClick={() => setShowReserveBook(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createReservationMutation.mutate(reserveForm);
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Select Book Volume</label>
                <select
                  value={reserveForm.bookId}
                  onChange={(e) => setReserveForm({ ...reserveForm, bookId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  required
                >
                  <option value="">-- Choose Book --</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.availableCopies} left in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Borrower Email Account</label>
                <input
                  type="email"
                  placeholder="student@college.edu"
                  value={reserveForm.studentEmail}
                  onChange={(e) => setReserveForm({ ...reserveForm, studentEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowReserveBook(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReservationMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MEMBER DETAIL OVERLAY */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white dark:border-zinc-850 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-grotesk font-semibold text-slate-900 dark:text-zinc-200 text-base">Scholar Borrowing Ledger Details</h3>
                <p className="text-xs text-slate-400">Borrower: {selectedMember.fullName} ({selectedMember.email})</p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
              <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Active Loans list</span>
                <span className="text-lg font-bold">
                  {memberLoans.filter(b => b.status !== "returned").length} books issued
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Pending late fines outstanding</span>
                <span className="text-lg font-bold text-rose-500">
                  ${memberFines.filter(f => f.status === "pending").reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Borrow History Ledger</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-mono">
                      <th className="p-2">Book Title</th>
                      <th className="p-2">Borrow Date</th>
                      <th className="p-2">Due Date</th>
                      <th className="p-2">Return date</th>
                      <th className="p-2">Outstanding status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberLoans.map((b) => {
                      const bk = books.find(x => x.id === b.bookId);
                      return (
                        <tr key={b.id} className="border-b hover:bg-slate-50/50">
                          <td className="p-2 font-semibold">{bk?.title || "Book"}</td>
                          <td className="p-2 font-mono">{b.borrowDate}</td>
                          <td className="p-2 font-mono">{b.dueDate}</td>
                          <td className="p-2 font-mono">{b.returnDate || "Not returned"}</td>
                          <td className="p-2 font-mono uppercase text-[10px]">{b.status}</td>
                        </tr>
                      );
                    })}
                    {memberLoans.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">No loan transaction records on file.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border rounded-lg"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
