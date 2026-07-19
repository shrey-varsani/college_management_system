import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../types";

interface AppState {
  user: User | null;
  token: string | null;
  sidebarOpen: boolean;
  theme: "light" | "dark";
}

const initialToken = localStorage.getItem("college_token");
const initialUserRaw = localStorage.getItem("college_user");
let initialUser: User | null = null;
if (initialUserRaw) {
  try {
    initialUser = JSON.parse(initialUserRaw);
  } catch {
    // Ignore invalid parse
  }
}

const initialTheme = (localStorage.getItem("college_theme") as "light" | "dark") || "dark";

// Apply the initial theme class to HTML element on load
if (initialTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

const initialState: AppState = {
  user: initialUser,
  token: initialToken,
  sidebarOpen: true,
  theme: initialTheme,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem("college_token", action.payload.token);
      localStorage.setItem("college_user", JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("college_token");
      localStorage.removeItem("college_user");
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleTheme: (state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      state.theme = nextTheme;
      localStorage.setItem("college_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  },
});

export const { setAuth, logout, toggleSidebar, toggleTheme } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
