import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyAOjmrikzARBTsEoIqHUXMLByrCc2hwKzQ",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "campusflow-cedb0.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "campusflow-cedb0",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "campusflow-cedb0.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "676257639316",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:676257639316:web:7c745f394c8815b35afd81",
};

export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured yet. Please configure the VITE_FIREBASE_* environment variables."
    );
  }

  if (!firebaseApp) {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
  }
  return firebaseApp;
}

export function getDb(): Firestore {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Firestore db cannot be accessed."
    );
  }

  if (!firestoreDb) {
    const app = getFirebaseApp();
    firestoreDb = getFirestore(app);
  }
  return firestoreDb;
}

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Firebase Auth cannot be accessed."
    );
  }

  if (!firebaseAuth) {
    const app = getFirebaseApp();
    firebaseAuth = getAuth(app);
  }
  return firebaseAuth;
}
