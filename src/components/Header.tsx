import { useSelector, useDispatch } from "react-redux";
import { logout, toggleSidebar, toggleTheme } from "../lib/store";
import { RootState } from "../lib/store";
import { LogOut, Menu, User, Award, School, Sun, Moon } from "lucide-react";

interface HeaderProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
}

export default function Header({ onTabChange, activeTab }: HeaderProps) {
  const { user, theme } = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  // Human-readable labels for academic roles
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "principal":
        return "bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30";
      case "faculty":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30";
      case "librarian":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30";
      default:
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 px-6 transition-colors">
      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white md:hidden"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          id="campusflow-header-logo-btn"
          onClick={() => dispatch(toggleSidebar())}
          className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer text-left focus:outline-none"
          title="Toggle Sidebar"
        >
          <School className="h-6 w-6 text-indigo-500" />
          <span className="font-neon text-lg tracking-wide text-slate-900 dark:text-white">
            CampusFlow
          </span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Deep Navy Theme"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500 animate-pulse" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            <div className="text-right hidden sm:block">
              <div className="font-sans font-medium text-sm text-slate-800 dark:text-zinc-200">
                {user.fullName}
              </div>
              <div className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                {user.department}
              </div>
            </div>
            
            <span className={`rounded-full px-2.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
              {user.role}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 px-3 py-1.5 font-sans font-medium text-xs text-slate-600 dark:text-zinc-400 dark:hover:bg-zinc-800 hover:text-rose-600 dark:hover:text-rose-400 transition"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
