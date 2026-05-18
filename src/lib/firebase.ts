// Firebase configuration for Smart Polyhouse
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDzx8zIWzrieXpotXrD9SFAYboPYuhjJFU",
  authDomain: "smart-polyhouse-694e6.firebaseapp.com",
  databaseURL:
    "https://smart-polyhouse-694e6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-polyhouse-694e6",
  storageBucket: "smart-polyhouse-694e6.firebasestorage.app",
  messagingSenderId: "24335364926",
  appId: "1:24335364926:web:e92d85f52faa9c465e326f",
};

// Prevent re-initialisation during hot-module reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getDatabase(app);
