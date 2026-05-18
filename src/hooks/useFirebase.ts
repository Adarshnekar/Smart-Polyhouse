/**
 * useFirebase — Real-time Firebase hook for Grow Guardian
 *
 * READS  (Firebase → UI):
 *   sensors/temperature   number  °C
 *   sensors/humidity      number  %
 *   sensors/lux           number  raw lux
 *   sensors/hoursLit      number  hours today
 *
 * WRITES (UI → Firebase → Hardware):
 *   controls/mode         "Auto" | "Manual"
 *   controls/ledOn        boolean
 *   controls/ledIntensity number (0–100)
 *   controls/mistOn       boolean
 */

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set, off, DatabaseReference } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

type Mode = "Auto" | "Manual";

export interface FirebaseState {
  // ── Sensor readings ──────────────────────────────────────────
  temp: number;
  humidity: number;
  lux: number;
  hoursLit: number;
  soilMoisture: number;

  // ── Control state ─────────────────────────────────────────────
  mode: Mode;
  ledOn: boolean;
  ledIntensity: number;
  mistOn: boolean;

  // ── Status ────────────────────────────────────────────────────
  connected: boolean;   // true once at least one Firebase value arrived
  loading: boolean;     // true during initial fetch

  // ── Write helpers ─────────────────────────────────────────────
  setMode: (mode: Mode) => Promise<void>;
  setLedOn: (on: boolean) => Promise<void>;
  setLedIntensity: (pct: number) => Promise<void>;
  setMistOn: (on: boolean) => Promise<void>;
}

/** Fallback values shown while Firebase is connecting */
const DEFAULTS = {
  temp: 26.4,
  humidity: 58,
  lux: 18000,
  hoursLit: 6.2,
  soilMoisture: 42,
  mode: "Auto" as Mode,
  ledOn: false,
  ledIntensity: 0,
  mistOn: false,
};

export function useFirebase(): FirebaseState {
  const [temp, setTemp] = useState(DEFAULTS.temp);
  const [humidity, setHumidity] = useState(DEFAULTS.humidity);
  const [lux, setLux] = useState(DEFAULTS.lux);
  const [hoursLit, setHoursLit] = useState(DEFAULTS.hoursLit);
  const [soilMoisture, setSoilMoisture] = useState(DEFAULTS.soilMoisture);
  const [mode, setModeState] = useState<Mode>(DEFAULTS.mode);
  const [ledOn, setLedOnState] = useState(DEFAULTS.ledOn);
  const [ledIntensity, setLedIntensityState] = useState(DEFAULTS.ledIntensity);
  const [mistOn, setMistOnState] = useState(DEFAULTS.mistOn);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track how many sensor paths have returned at least once
  const arrivedCount = useRef(0);
  const TOTAL_PATHS = 9; // 5 sensors + 4 controls

  function markArrived() {
    arrivedCount.current += 1;
    if (arrivedCount.current >= TOTAL_PATHS) {
      setLoading(false);
      setConnected(true);
    }
  }

  useEffect(() => {
    // ── Sensor listeners ──────────────────────────────────────────
    const tempRef = ref(db, "sensors/temperature");
    const humRef  = ref(db, "sensors/humidity");
    const luxRef  = ref(db, "sensors/lux");
    const litRef  = ref(db, "sensors/hoursLit");
    const soilRef = ref(db, "sensors/soilMoisture");

    const unsubTemp = onValue(tempRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setTemp(v);
      markArrived();
    });

    const unsubHum = onValue(humRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setHumidity(v);
      markArrived();
    });

    const unsubLux = onValue(luxRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setLux(v);
      markArrived();
    });

    const unsubLit = onValue(litRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setHoursLit(v);
      markArrived();
    });

    const unsubSoil = onValue(soilRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setSoilMoisture(v);
      markArrived();
    });

    // ── Control listeners (sync UI ↔ Firebase) ────────────────────
    const modeRef      = ref(db, "controls/mode");
    const ledOnRef     = ref(db, "controls/ledOn");
    const ledIntRef    = ref(db, "controls/ledIntensity");
    const mistOnRef    = ref(db, "controls/mistOn");

    const unsubMode = onValue(modeRef, (snap) => {
      const v = snap.val();
      if (v === "Auto" || v === "Manual") setModeState(v);
      markArrived();
    });

    const unsubLedOn = onValue(ledOnRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "boolean") setLedOnState(v);
      markArrived();
    });

    const unsubLedInt = onValue(ledIntRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setLedIntensityState(v);
      markArrived();
    });

    const unsubMist = onValue(mistOnRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "boolean") setMistOnState(v);
      markArrived();
    });

    // Cleanup all listeners on unmount
    return () => {
      unsubTemp();
      unsubHum();
      unsubLux();
      unsubLit();
      unsubSoil();
      unsubMode();
      unsubLedOn();
      unsubLedInt();
      unsubMist();
    };
  }, []);

  // ── Write helpers ──────────────────────────────────────────────
  async function writeControl<T>(path: string, value: T) {
    try {
      await set(ref(db, path), value);
    } catch (err) {
      console.error(`Firebase write failed [${path}]:`, err);
      toast.error("Could not sync with Firebase. Check your connection.");
    }
  }

  const setMode = async (m: Mode) => {
    setModeState(m); // optimistic local update
    await writeControl("controls/mode", m);
  };

  const setLedOn = async (on: boolean) => {
    setLedOnState(on); // optimistic
    await writeControl("controls/ledOn", on);
  };

  const setLedIntensity = async (pct: number) => {
    setLedIntensityState(pct); // optimistic
    await writeControl("controls/ledIntensity", pct);
  };

  const setMistOn = async (on: boolean) => {
    setMistOnState(on); // optimistic
    await writeControl("controls/mistOn", on);
  };

  return {
    temp,
    humidity,
    lux,
    hoursLit,
    soilMoisture,
    mode,
    ledOn,
    ledIntensity,
    mistOn,
    connected,
    loading,
    setMode,
    setLedOn,
    setLedIntensity,
    setMistOn,
  };
}
