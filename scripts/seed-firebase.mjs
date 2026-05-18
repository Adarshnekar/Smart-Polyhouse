/**
 * seed-firebase.mjs
 * Run once to populate your Firebase Realtime Database with
 * initial sensor readings and control defaults.
 *
 * Usage:
 *   node scripts/seed-firebase.mjs
 */

import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

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

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

async function seed() {
  console.log("🌱  Seeding Firebase Realtime Database…\n");

  // ── Sensor readings (written by your hardware) ──────────────────
  await set(ref(db, "sensors/temperature"), 26.4);
  await set(ref(db, "sensors/humidity"),    58);
  await set(ref(db, "sensors/lux"),         18000);
  await set(ref(db, "sensors/hoursLit"),    6.2);
  console.log("✅  sensors/  seeded");

  // ── Control defaults (written by the dashboard) ─────────────────
  await set(ref(db, "controls/mode"),         "Auto");
  await set(ref(db, "controls/ledOn"),        false);
  await set(ref(db, "controls/ledIntensity"), 0);
  await set(ref(db, "controls/mistOn"),       false);
  console.log("✅  controls/ seeded");

  console.log("\n🎉  Done! Your Firebase database now has initial values.");
  console.log("    Open the dashboard — it should show 'Live · Firebase' immediately.\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
