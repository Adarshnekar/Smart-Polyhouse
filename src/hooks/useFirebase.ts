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
  mq2: number;
  soil1: number;
  soil2: number;
  lightRaw: number;
  ledBrightness: number;
  solarVoltage: number;
  lastUpdated: string | null;

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
  mq2: 340,
  soil1: 2150,
  soil2: 2280,
  lightRaw: 1650,
  ledBrightness: 0,
  solarVoltage: 18.2,
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
  const [mq2, setMq2] = useState(DEFAULTS.mq2);
  const [soil1, setSoil1] = useState(DEFAULTS.soil1);
  const [soil2, setSoil2] = useState(DEFAULTS.soil2);
  const [lightRaw, setLightRaw] = useState(DEFAULTS.lightRaw);
  const [ledBrightness, setLedBrightness] = useState(DEFAULTS.ledBrightness);
  const [solarVoltage, setSolarVoltage] = useState(DEFAULTS.solarVoltage);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [mode, setModeState] = useState<Mode>(DEFAULTS.mode);
  const [ledOn, setLedOnState] = useState(DEFAULTS.ledOn);
  const [ledIntensity, setLedIntensityState] = useState(DEFAULTS.ledIntensity);
  const [mistOn, setMistOnState] = useState(DEFAULTS.mistOn);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track how many sensor paths have returned at least once
  const arrivedCount = useRef(0);

  function markArrived() {
    arrivedCount.current += 1;
    // Mark connected as soon as at least one real value is received from Firebase
    setLoading(false);
    setConnected(true);
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  useEffect(() => {
    // ── Sensor listeners ──────────────────────────────────────────
    const tempRef     = ref(db, "sensors/temperature");
    const humRef      = ref(db, "sensors/humidity");
    const luxRef      = ref(db, "sensors/lux");
    const litRef      = ref(db, "sensors/hoursLit");
    const soilRef     = ref(db, "sensors/soilMoisture");
    const mq2Ref      = ref(db, "sensors/mq2");
    const soil1Ref    = ref(db, "sensors/soil1");
    const soil2Ref    = ref(db, "sensors/soil2");
    const lightRawRef = ref(db, "sensors/lightRaw");
    const ledBriRef   = ref(db, "sensors/ledBrightness");
    const solarRef    = ref(db, "sensors/solarVoltage");

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

    const unsubMq2 = onValue(mq2Ref, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setMq2(v);
      markArrived();
    });

    const unsubSoil1 = onValue(soil1Ref, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setSoil1(v);
      markArrived();
    });

    const unsubSoil2 = onValue(soil2Ref, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setSoil2(v);
      markArrived();
    });

    const unsubLightRaw = onValue(lightRawRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setLightRaw(v);
      markArrived();
    });

    const unsubSolar = onValue(solarRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setSolarVoltage(v);
      markArrived();
    });

    const unsubLedBri = onValue(ledBriRef, (snap) => {
      const v = snap.val();
      if (v !== null && typeof v === "number") setLedBrightness(v);
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
      unsubMq2();
      unsubSoil1();
      unsubSoil2();
      unsubLightRaw();
      unsubLedBri();
      unsubSolar();
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
    mq2,
    soil1,
    soil2,
    lightRaw,
    ledBrightness,
    solarVoltage,
    lastUpdated,
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
