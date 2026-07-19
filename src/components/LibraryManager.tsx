import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { LibraryBook, LibraryBorrow, User } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { Library, Search, Plus, RotateCcw, UserPlus, FileText, Check, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function LibraryManager() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);

  // New Book State
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newIsbn, setNewIsbn] = useState("");
  const [newCategory, setNewCategory] = useState("Computer Science");
  const [newCopies, setNewCopies] = useState(3);

  // Issue Loan State
  const [selectedBookId, setSelectedBookId] = useState("");
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [loanDays, setLoanDays] = useState(14);

  // Queries
  const { data: books = [], isLoading: isLoadingBooks } = useQuery<LibraryBook[]>({
    queryKey: ["books"],
    queryFn: async () => {
      const res = await api.get("/library/books");
      return res.data;
    },
  });

  const { data: borrows = [] } = useQuery<LibraryBorrow[]>({
    queryKey: ["borrows"],
    queryFn: async () => {
      const res = await api.get("/library/borrows");
      return res.data;
    },
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
    enabled: user?.role === "librarian",
  });

  // Mutations
  const addBookMutation = useMutation({
    mutationFn: async (data: Partial<LibraryBook>) => {
      return api.post("/library/books", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setShowAddModal(false);
      setNewTitle("");
      setNewAuthor("");
      setNewIsbn("");
      setNewCopies(3);
      toast.success("New volume added to library catalog!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to add volume");
    },
  });

  const issueLoanMutation = useMutation({
    mutationFn: async (data: { bookId: string; studentEmail: string; durationDays: number }) => {
      return api.post("/library/borrow", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      setShowBorrowModal(false);
      setSelectedBookId("");
      setBorrowerEmail("");
      toast.success("Book issued and ledger entry logged!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to issue loan");
    },
  });

  const returnBookMutation = useMutation({
    mutationFn: async (borrowId: string) => {
      return api.post(`/library/return/${borrowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      toast.success("Volume returned and inventory catalog replenished.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to return volume");
    },
  });

  // Filter books
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.isbn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "All" || b.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleAddBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBookMutation.mutate({
      title: newTitle,
      author: newAuthor,
      isbn: newIsbn,
      category: newCategory,
      totalCopies: newCopies,
    });
  };

  const handleIssueLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    issueLoanMutation.mutate({
      bookId: selectedBookId,
      studentEmail: borrowerEmail,
      durationDays: loanDays,
    });
  };

  // Check if borrow item is overdue
  const isOverdue = (borrow: LibraryBorrow) => {
    if (borrow.status === "returned" || borrow.returnDate) return false;
    const due = new Date(borrow.dueDate);
    const today = new Date();
    return today > due;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <Library className="h-6 w-6 text-indigo-500" />
            Library Administration & Catalog
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Search physical assets, manage checkout lists, and monitor overdue deadlines.
          </p>
        </div>

        {user?.role === "librarian" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowBorrowModal(true);
              }}
              className="bg-amber-600 hover:bg-amber-500 text-black font-sans text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
            >
              <UserPlus className="h-4 w-4" />
              Issue Book Loan
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
            >
              <Plus className="h-4 w-4" />
              Catalog Book
            </button>
          </div>
        )}
      </div>

      {/* Grid of lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Books List Panel */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm dark:shadow-xl">
          <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">Asset Catalog Inventory</h3>

          {/* Catalog search/filter bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
              </span>
              <input
                type="text"
                placeholder="Search title, author, ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-8 py-1.5 text-xs text-slate-800 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-300 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>

          {isLoadingBooks ? (
            <div className="h-48 flex items-center justify-center text-slate-500 dark:text-zinc-400 text-xs font-sans">
              Syncing library catalog copies...
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-8">
              No volumes match the search criteria.
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredBooks.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800/60 p-3.5 flex justify-between items-center hover:border-slate-300 dark:hover:border-zinc-700 transition"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono tracking-wider">{b.isbn}</span>
                    <h4 className="text-sm font-medium font-grotesk text-slate-800 dark:text-zinc-200">{b.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">by {b.author}</p>
                    <span className="text-[9px] bg-slate-100 text-indigo-600 dark:bg-zinc-850 dark:text-indigo-400 border border-indigo-500/10 rounded px-1.5 py-0.5 w-fit mt-1.5 font-mono uppercase">
                      {b.category}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-mono text-xs text-slate-700 dark:text-zinc-300 font-semibold">
                      {b.availableCopies} / {b.totalCopies} Available
                    </div>
                    {b.availableCopies === 0 ? (
                      <span className="text-[9px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-1.5 py-0.5">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                        In Library
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loan Transactions Panel */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-sm dark:shadow-xl">
          <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 text-sm">
            {user?.role === "student" ? "My Book Checkouts" : "Active Borrow Ledgers"}
          </h3>

          {borrows.length === 0 ? (
            <div className="text-slate-500 text-xs py-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
              No checked-out volume records.
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
              {borrows.map((b) => {
                const book = books.find((x) => x.id === b.bookId);
                const isLate = isOverdue(b);
                const sUser = allUsers.find((u) => u.id === b.studentId);

                return (
                  <div key={b.id} className="rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-3.5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="truncate pr-2">
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">{book ? book.title : "Unknown Vol"}</h4>
                        {user?.role !== "student" && sUser && (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono block mt-0.5 truncate">{sUser.fullName}</span>
                        )}
                      </div>

                      {b.status === "returned" ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Returned
                        </span>
                      ) : isLate ? (
                        <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-1.5 py-0.5 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="h-3 w-3" /> Overdue
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Checked Out
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-zinc-500 font-mono mt-1 pt-2 border-t border-slate-100 dark:border-zinc-850">
                      <div>
                        <span className="block text-slate-400 dark:text-zinc-600 font-bold">ISSUED DATE:</span>
                        <span>{b.borrowDate}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 dark:text-zinc-600 font-bold">DEADLINE DUE:</span>
                        <span className={isLate ? "text-rose-500 dark:text-rose-400 font-semibold" : ""}>{b.dueDate}</span>
                      </div>
                    </div>

                    {user?.role === "librarian" && b.status === "borrowed" && (
                      <button
                        onClick={() => returnBookMutation.mutate(b.id)}
                        disabled={returnBookMutation.isPending}
                        className="w-full bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white border border-slate-200 hover:border-transparent dark:bg-zinc-850 dark:hover:bg-emerald-600 dark:text-zinc-400 dark:hover:text-white dark:border-zinc-800 hover:border-transparent font-sans text-xs font-semibold py-1.5 rounded transition mt-1.5 flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Log Return Receipt
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Catalog Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="font-grotesk font-semibold text-slate-900 dark:text-zinc-200 text-base">Catalog New Physical Book</h3>

            <form onSubmit={handleAddBookSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">Book Title</label>
                <input
                  type="text"
                  placeholder="Design Patterns"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">Author Name(s)</label>
                <input
                  type="text"
                  placeholder="Erich Gamma, Ralph Johnson"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">ISBN-13</label>
                  <input
                    type="text"
                    placeholder="978-0201633610"
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCopies}
                    onChange={(e) => setNewCopies(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">Subject Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-sans text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 dark:text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBookMutation.isPending}
                  className="px-4 py-2 font-sans text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  Confirm Cataloging
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Book Loan Modal */}
      {showBorrowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="font-grotesk font-semibold text-slate-900 dark:text-zinc-200 text-base">Issue Book Loan Transaction</h3>

            <form onSubmit={handleIssueLoanSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">Select Book Volume</label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Book --</option>
                  {books
                    .filter((b) => b.availableCopies > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.availableCopies} left)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">Scholar Borrower Email</label>
                <input
                  type="email"
                  placeholder="student@college.edu"
                  value={borrowerEmail}
                  onChange={(e) => setBorrowerEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">Loan Duration Days</label>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={loanDays}
                  onChange={(e) => setLoanDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowBorrowModal(false)}
                  className="px-4 py-2 font-sans text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 dark:text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueLoanMutation.isPending}
                  className="px-4 py-2 font-sans text-xs font-semibold text-black bg-amber-500 rounded-lg hover:bg-amber-400"
                >
                  Issue Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
