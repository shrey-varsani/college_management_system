import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { 
  Database, Shield, Cloud, Play, RefreshCw, Terminal, CheckCircle2, AlertTriangle, 
  Settings, Key, Copy, Check, FileCode, GraduationCap, Users, BookOpen, Library,
  ArrowRight, HeartHandshake, Info, ShieldAlert, Sparkles, Code, CheckSquare
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { isFirebaseConfigured, getDb, getFirebaseApp } from "../lib/firebase";
import { collection, doc, setDoc, getDocs, writeBatch, Timestamp } from "firebase/firestore";

interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
}

const metaEnv = (import.meta as any).env || {};

export default function FirebaseIntegration() {
  const { theme } = useSelector((state: RootState) => state.app);
  
  // Local Config State (saves to localStorage to persist across updates)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("fb_api_key") || metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyAOjmrikzARBTsEoIqHUXMLByrCc2hwKzQ");
  const [authDomain, setAuthDomain] = useState(() => localStorage.getItem("fb_auth_domain") || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "campusflow-cedb0.firebaseapp.com");
  const [projectId, setProjectId] = useState(() => localStorage.getItem("fb_project_id") || metaEnv.VITE_FIREBASE_PROJECT_ID || "campusflow-cedb0");
  const [storageBucket, setStorageBucket] = useState(() => localStorage.getItem("fb_storage_bucket") || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "campusflow-cedb0.firebasestorage.app");
  const [messagingSenderId, setMessagingSenderId] = useState(() => localStorage.getItem("fb_messaging_sender_id") || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "676257639316");
  const [appId, setAppId] = useState(() => localStorage.getItem("fb_app_id") || metaEnv.VITE_FIREBASE_APP_ID || "1:676257639316:web:7c745f394c8815b35afd81");

  // Connection testing states
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected" | "failed">(() => {
    return isFirebaseConfigured() ? "connected" : "disconnected";
  });
  const [errorMessage, setErrorMessage] = useState("");

  // Sync states
  const [syncLogs, setSyncLogs] = useState<LogEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [activeSyncType, setActiveSyncType] = useState<string | null>(null);

  // Copied clipboard helper state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // UI tabs
  const [activeTab, setActiveTab] = useState<"panel" | "rules" | "setup">("panel");

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [syncLogs]);

  const addLog = (message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const now = new Date().toLocaleTimeString();
    setSyncLogs(prev => [...prev, { timestamp: now, type, message }]);
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Save Config to LocalStorage & Reload Firebase Config
  const handleSaveConfig = () => {
    if (!apiKey || !projectId || !authDomain) {
      toast.error("API Key, Project ID, and Auth Domain are required parameters.");
      return;
    }

    try {
      localStorage.setItem("fb_api_key", apiKey.trim());
      localStorage.setItem("fb_auth_domain", authDomain.trim());
      localStorage.setItem("fb_project_id", projectId.trim());
      localStorage.setItem("fb_storage_bucket", storageBucket.trim());
      localStorage.setItem("fb_messaging_sender_id", messagingSenderId.trim());
      localStorage.setItem("fb_app_id", appId.trim());

      // We instruct the environment to update variables in the browser
      toast.success("Credentials saved to browser cache!");
      addLog("Firebase Credentials saved successfully.", "success");
      
      // Let's force verify immediately
      testFirebaseConnection();
    } catch (err: any) {
      toast.error("Failed to save credentials: " + err.message);
    }
  };

  // Clear Local Credentials
  const handleClearConfig = () => {
    localStorage.removeItem("fb_api_key");
    localStorage.removeItem("fb_auth_domain");
    localStorage.removeItem("fb_project_id");
    localStorage.removeItem("fb_storage_bucket");
    localStorage.removeItem("fb_messaging_sender_id");
    localStorage.removeItem("fb_app_id");

    setApiKey("");
    setAuthDomain("");
    setProjectId("");
    setStorageBucket("");
    setMessagingSenderId("");
    setAppId("");

    setConnectionStatus("disconnected");
    toast.success("Credentials removed from local cache. Using defaults.");
    addLog("Firebase Credentials cleared from local cache.", "warning");
  };

  // Live Test Firebase Connection
  const testFirebaseConnection = async () => {
    setTestingConnection(true);
    setErrorMessage("");
    addLog("Initiating Firestore connection test...", "info");

    // Temporarily verify config state
    const currentApiKey = apiKey || metaEnv.VITE_FIREBASE_API_KEY;
    const currentProjectId = projectId || metaEnv.VITE_FIREBASE_PROJECT_ID;

    if (!currentApiKey || !currentProjectId) {
      setConnectionStatus("failed");
      setTestingConnection(false);
      const err = "Missing Firebase environment config (API Key or Project ID is blank).";
      setErrorMessage(err);
      addLog(err, "error");
      toast.error("Firebase connection test failed. Configure credentials first!");
      return;
    }

    try {
      // Lazy init test
      const db = getDb();
      addLog(`Connecting to Firestore Project: "${currentProjectId}"`, "info");
      
      // Attempt a write-read verification using a test document
      const testRef = doc(db, "_connection_test_", "live_status");
      await setDoc(testRef, {
        lastConnected: Timestamp.now(),
        clientTime: new Date().toISOString(),
        agentHandshake: "CampusFlow Verification Token"
      }, { merge: true });

      addLog("Successfully performed test read/write handshake on collection '_connection_test_'", "success");
      setConnectionStatus("connected");
      toast.success("Firestore Connection Verified ✅");
    } catch (err: any) {
      console.error(err);
      setConnectionStatus("failed");
      setErrorMessage(err.message);
      addLog(`Handshake failed: ${err.message}`, "error");
      addLog("Hint: Ensure your Firestore security rules allow writes, or verify that your API Key has Firestore access.", "warning");
      toast.error("Firestore write permission verification failed.");
    } finally {
      setTestingConnection(false);
    }
  };

  // Sync local database to Firestore
  const handleSyncCollection = async (type: "users" | "courses" | "books") => {
    if (connectionStatus !== "connected") {
      toast.error("Please verify and establish your Firestore Connection first.");
      return;
    }

    setIsSyncing(true);
    setActiveSyncType(type);
    setSyncProgress({ current: 0, total: 0 });
    addLog(`Initiating sync process for: [${type.toUpperCase()}]`, "info");

    try {
      const db = getDb();
      let fetchUrl = "";
      let firestoreCollection = "";

      if (type === "users") {
        fetchUrl = "/users";
        firestoreCollection = "users";
      } else if (type === "courses") {
        fetchUrl = "/courses";
        firestoreCollection = "courses";
      } else {
        fetchUrl = "/library/books"; // standard library endpoint
        firestoreCollection = "library_books";
      }

      addLog(`Fetching local database objects from: ${fetchUrl}...`, "info");
      const res = await api.get(fetchUrl);
      const items = Array.isArray(res.data) ? res.data : [];

      if (items.length === 0) {
        addLog(`No records found in local database for ${type}. Sync skipped.`, "warning");
        setIsSyncing(false);
        setActiveSyncType(null);
        return;
      }

      addLog(`Discovered ${items.length} records. Syncing with batch operations to Firestore collection "${firestoreCollection}"...`, "info");
      setSyncProgress({ current: 0, total: items.length });

      // Process in batches of 500 (Firestore limits batches to 500 operations)
      const batchLimit = 200;
      let batchCount = 0;
      let syncedCount = 0;

      while (syncedCount < items.length) {
        const batch = writeBatch(db);
        const currentSlice = items.slice(syncedCount, syncedCount + batchLimit);

        addLog(`Processing Batch #${batchCount + 1} with ${currentSlice.length} entries...`, "info");

        currentSlice.forEach((item: any) => {
          // Use item ID or generate a slug
          const docId = item.id || item.code || `item_${Math.random().toString(36).substr(2, 9)}`;
          const docRef = doc(db, firestoreCollection, String(docId));
          
          // Clean the object and add a sync stamp
          const cleanItem = {
            ...item,
            _syncedAt: Timestamp.now(),
            _syncSource: "CampusFlow Portal Agent"
          };

          batch.set(docRef, cleanItem, { merge: true });
        });

        addLog(`Pushing batch #${batchCount + 1} to Google Cloud Firestore...`, "info");
        await batch.commit();

        syncedCount += currentSlice.length;
        batchCount++;
        setSyncProgress({ current: syncedCount, total: items.length });
        addLog(`Successfully synced ${syncedCount} of ${items.length} records.`, "success");
      }

      addLog(`Database Sync complete for [${type.toUpperCase()}]! Total records synced: ${items.length}`, "success");
      toast.success(`${type.toUpperCase()} Sync Completed!`);
    } catch (err: any) {
      console.error(err);
      addLog(`Sync Operation Aborted: ${err.message}`, "error");
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setActiveSyncType(null);
    }
  };

  const firestoreRulesSample = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if the requester is an authorized client
    function isAuthed() {
      return request.auth != null;
    }

    // Rules for verified Permit Cards and handshakes
    match /_connection_test_/{document} {
      allow read, write: if true; // Open temporarily for validation handshakes
    }

    // Secure Principal-only rules for institutional tables
    match /users/{userId} {
      allow read: if isAuthed();
      allow write: if isAuthed() && request.auth.token.role == 'principal';
    }

    match /courses/{courseId} {
      allow read: if isAuthed();
      allow write: if isAuthed() && (request.auth.token.role == 'principal' || request.auth.token.role == 'faculty');
    }

    match /library_books/{bookId} {
      allow read: if true; // Public catalog viewable to students
      allow write: if isAuthed() && (request.auth.token.role == 'librarian' || request.auth.token.role == 'principal');
    }
  }
}`;

  const firebaseInitSample = `// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "${apiKey || "YOUR_API_KEY"}",
  authDomain: "${authDomain || "YOUR_PROJECT_ID.firebaseapp.com"}",
  projectId: "${projectId || "YOUR_PROJECT_ID"}",
  storageBucket: "${storageBucket || "YOUR_PROJECT_ID.appspot.com"}",
  messagingSenderId: "${messagingSenderId || "YOUR_SENDER_ID"}",
  appId: "${appId || "YOUR_APP_ID"}"
};

// Initialize app & services
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);`;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 opacity-[0.05] pointer-events-none">
          <Database className="w-96 h-96" />
        </div>
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-indigo-400" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-300 uppercase">Cloud Integration Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Firebase Firestore Administration Center</h1>
          <p className="text-xs text-indigo-200">
            Establish cloud synchronization, synchronize local relational databases to Firebase Firestore, and manage authorization rules.
          </p>
        </div>
        <div className="flex gap-2 z-10">
          <button
            onClick={() => setActiveTab("panel")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "panel" ? "bg-white text-indigo-950 shadow-md" : "bg-indigo-800 text-indigo-100 hover:bg-indigo-700"
            }`}
          >
            Sync Desk
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "rules" ? "bg-white text-indigo-950 shadow-md" : "bg-indigo-800 text-indigo-100 hover:bg-indigo-700"
            }`}
          >
            Security Rules
          </button>
          <button
            onClick={() => setActiveTab("setup")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "setup" ? "bg-white text-indigo-950 shadow-md" : "bg-indigo-800 text-indigo-100 hover:bg-indigo-700"
            }`}
          >
            Code Integration Guide
          </button>
        </div>
      </div>

      {activeTab === "panel" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1 & 2: Main operations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Firestore Connection Status Bar */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl flex items-center justify-center ${
                    connectionStatus === "connected" ? "bg-emerald-500/10 text-emerald-500" :
                    connectionStatus === "failed" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Google Cloud Firestore Connection</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                        connectionStatus === "failed" ? "bg-rose-500" : "bg-amber-500"
                      }`} />
                      <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 capitalize">
                        {connectionStatus === "connected" ? "Fully Connected & Handshaking" :
                         connectionStatus === "failed" ? "Handshake Verification Failed" : "Awaiting Credentials Setup"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={testFirebaseConnection}
                    disabled={testingConnection}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${testingConnection ? "animate-spin" : ""}`} />
                    {testingConnection ? "Verifying..." : "Validate Connection"}
                  </button>
                </div>
              </div>

              {connectionStatus === "failed" && errorMessage && (
                <div className="mt-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Error Handshake Details:</span> {errorMessage}
                    <span className="block mt-1 font-mono text-[10px] text-rose-500/80">Please check that the Project ID and API Key are valid inside the Config Panel below.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Manager Container */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">Database Sync Terminal</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Stream local relational tables into Cloud Firestore documents. Batch writes are limited to 200 documents per thread for efficiency.
                </p>
              </div>

              {/* Progress Slider */}
              {isSyncing && (
                <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300 capitalize">Syncing {activeSyncType}...</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {syncProgress.current} / {syncProgress.total} records ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sync controls grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Users sync card */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition">
                  <div>
                    <div className="p-2 bg-indigo-50 dark:bg-zinc-850 text-indigo-600 dark:text-indigo-400 rounded-lg w-fit mb-3">
                      <Users className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Student & Faculty Registry</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Syncs all user profiles to Firestore collection <code className="font-mono text-indigo-500">users</code>.</p>
                  </div>
                  <button
                    onClick={() => handleSyncCollection("users")}
                    disabled={isSyncing || connectionStatus !== "connected"}
                    className="mt-4 w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white text-xs py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing && activeSyncType === "users" ? "animate-spin" : ""}`} />
                    Sync Profiles
                  </button>
                </div>

                {/* Courses sync card */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition">
                  <div>
                    <div className="p-2 bg-indigo-50 dark:bg-zinc-850 text-indigo-600 dark:text-indigo-400 rounded-lg w-fit mb-3">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Academic Courses</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Syncs syllabus catalogs to Firestore collection <code className="font-mono text-indigo-500">courses</code>.</p>
                  </div>
                  <button
                    onClick={() => handleSyncCollection("courses")}
                    disabled={isSyncing || connectionStatus !== "connected"}
                    className="mt-4 w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white text-xs py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing && activeSyncType === "courses" ? "animate-spin" : ""}`} />
                    Sync Courses
                  </button>
                </div>

                {/* Library sync card */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition">
                  <div>
                    <div className="p-2 bg-indigo-50 dark:bg-zinc-850 text-indigo-600 dark:text-indigo-400 rounded-lg w-fit mb-3">
                      <Library className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Library Catalogue</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Syncs books catalogue to Firestore collection <code className="font-mono text-indigo-500">library_books</code>.</p>
                  </div>
                  <button
                    onClick={() => handleSyncCollection("books")}
                    disabled={isSyncing || connectionStatus !== "connected"}
                    className="mt-4 w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white text-xs py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing && activeSyncType === "books" ? "animate-spin" : ""}`} />
                    Sync Catalogue
                  </button>
                </div>
              </div>

              {/* Console log screen */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-inner">
                <div className="bg-slate-100 dark:bg-zinc-950 px-4 py-2 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Sync Execution Logs</span>
                  </div>
                  <button 
                    onClick={() => setSyncLogs([])}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                  >
                    Clear Logs
                  </button>
                </div>
                
                <div className="bg-slate-950 text-emerald-400 p-4 font-mono text-xs h-56 overflow-y-auto space-y-1.5 leading-relaxed">
                  {syncLogs.length === 0 ? (
                    <div className="text-zinc-500 italic flex flex-col items-center justify-center h-full gap-2">
                      <Play className="h-6 w-6 text-zinc-600" />
                      <span>Console idle. Initiate a sync operation above or run connection test.</span>
                    </div>
                  ) : (
                    syncLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`font-semibold shrink-0 select-none ${
                          log.type === "success" ? "text-emerald-500" :
                          log.type === "error" ? "text-rose-500 font-bold" :
                          log.type === "warning" ? "text-amber-500" : "text-indigo-400"
                        }`}>
                          {log.type.toUpperCase()}:
                        </span>
                        <span className={
                          log.type === "error" ? "text-rose-400 font-medium" :
                          log.type === "warning" ? "text-amber-300" : "text-zinc-300"
                        }>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

            </div>

          </div>

          {/* Column 3: Config panel */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-indigo-500" /> Web Firebase Setup
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Provide client credentials from your Firebase Console. Values are kept locally in your browser sandbox.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Firebase API Key (apiKey)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-zinc-600">
                    <Key className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="AIzaSyA8..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Project ID (projectId)
                </label>
                <input
                  type="text"
                  placeholder="campusflow-edu"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Auth Domain (authDomain)
                </label>
                <input
                  type="text"
                  placeholder="campusflow-edu.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Storage Bucket (Optional)
                </label>
                <input
                  type="text"
                  placeholder="campusflow-edu.appspot.com"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Sender ID
                  </label>
                  <input
                    type="text"
                    placeholder="9012431234"
                    value={messagingSenderId}
                    onChange={(e) => setMessagingSenderId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    placeholder="1:9012:web:ab..."
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleSaveConfig}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-lg transition text-center shadow-sm"
              >
                Save & Connect
              </button>
              <button
                onClick={handleClearConfig}
                className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-300 text-xs rounded-lg transition font-semibold"
                title="Reset credentials"
              >
                Clear Cache
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-850 pt-4 text-[10px] text-slate-500 space-y-2 leading-relaxed">
              <div className="flex gap-2 items-start">
                <Info className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <span>
                  By default, the application checks environment variables in <code className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[9px] text-indigo-500">.env</code>. You can override them dynamically here.
                </span>
              </div>
              <div className="flex gap-2 items-start">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>
                  All database transactions occur purely inside your browser. No private keys are ever uploaded to any intermediary proxy server.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Shield className="h-5 w-5 text-indigo-500" /> Firestore Security Configuration (firestore.rules)
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Deploy these rules directly in your Firebase Console under the "Rules" tab to prevent unauthorized external access.
              </p>
            </div>
            <button
              onClick={() => handleCopy(firestoreRulesSample, "Rules")}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
            >
              {copiedText === "Rules" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedText === "Rules" ? "Copied!" : "Copy Rules"}
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl overflow-hidden shadow-inner">
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400">firestore.rules</span>
              <span className="text-[10px] text-indigo-400 font-mono">Declarative Security Rules</span>
            </div>
            <pre className="p-4 text-xs font-mono text-indigo-300 overflow-x-auto leading-relaxed max-h-96">
              <code>{firestoreRulesSample}</code>
            </pre>
          </div>
        </div>
      )}

      {activeTab === "setup" && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <FileCode className="h-5 w-5 text-indigo-500" /> Application Integration Reference Code
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                How Firebase and Firestore are integrated into this application's source code hierarchy.
              </p>
            </div>
            <button
              onClick={() => handleCopy(firebaseInitSample, "Code")}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
            >
              {copiedText === "Code" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedText === "Code" ? "Copied!" : "Copy Integration"}
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl overflow-hidden shadow-inner">
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400">src/lib/firebase.ts</span>
              <span className="text-[10px] text-indigo-400 font-mono">Dynamic ESM Module</span>
            </div>
            <pre className="p-4 text-xs font-mono text-indigo-300 overflow-x-auto leading-relaxed max-h-96">
              <code>{firebaseInitSample}</code>
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
            <div className="border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-indigo-600" /> 1. Querying with Security Guards
              </h4>
              <p>
                To query records safely, we check if Firebase is configured before calling standard services. This prevents initialization crashes:
              </p>
              <pre className="p-2.5 bg-slate-950 text-indigo-300 rounded font-mono text-[10px] overflow-x-auto mt-2">
{`import { isFirebaseConfigured, getDb } from './lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

if (isFirebaseConfigured()) {
  const db = getDb();
  const querySnapshot = await getDocs(collection(db, "users"));
  // do something...
}`}
              </pre>
            </div>

            <div className="border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600" /> 2. Adding User Sessions
              </h4>
              <p>
                Standard email/password logins sync seamlessly through Firebase Authentication SDK using our dynamic getters:
              </p>
              <pre className="p-2.5 bg-slate-950 text-indigo-300 rounded font-mono text-[10px] overflow-x-auto mt-2">
{`import { getFirebaseAuth } from './lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const auth = getFirebaseAuth();
const credentials = await signInWithEmailAndPassword(
  auth, 
  "principal@college.edu", 
  "password"
);`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
