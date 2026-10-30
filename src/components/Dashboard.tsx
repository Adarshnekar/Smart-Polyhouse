import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ThermometerSun,
  SlidersHorizontal,
  BarChart3,
  Sprout,
  AlertTriangle,
  CloudSun,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  Menu,
  X,
  Sun,
  Lightbulb,
  Droplets,
  Thermometer,
  Zap,
  Gauge,
  Power,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Wind,
  Activity,
  Cpu,
  RefreshCw,
  Bell,
  ChevronRight,
  Flame,
  Radio,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import WeatherForecast from "./WeatherForecast";
import GrowthStagePanel from "./GrowthStagePanel";
import WeatherDetailsChart from "./WeatherDetailsChart";
import { useFirebase } from "@/hooks/useFirebase";
import { GROWTH_STAGES, Stage, stageFromDays } from "@/lib/growthStages";

type Mode = "Auto" | "Manual";

type NavSection =
  | "Dashboard"
  | "Environment"
  | "Controls"
  | "Analytics"
  | "Plant Growth"
  | "Alerts"
  | "Weather"
  | "Settings";

const CROPS = ["Tomato", "Lettuce", "Strawberry", "Basil", "Pepper"];

export default function Dashboard() {
  // ── Firebase real-time state ────────────────────────────────────
  const {
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
  } = useFirebase();

  // ── Local UI state ─────────────────────────────────────────────
  const [crop, setCrop] = useState("Tomato");
  const [daysSincePlant, setDaysSincePlant] = useState(24);
  const [ledHoursToday, setLedHoursToday] = useState(2.3);
  const [activeSection, setActiveSection] = useState<NavSection>("Dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Stage is DERIVED from days — auto-advances when days exceed stage duration
  const stage: Stage = stageFromDays(daysSincePlant);
  const profile = GROWTH_STAGES[stage];

  // Accumulate LED hours locally while LED is on
  useEffect(() => {
    if (!ledOn) return;
    const id = setInterval(() => {
      setLedHoursToday((x) => +(x + 0.01).toFixed(2));
    }, 1500);
    return () => clearInterval(id);
  }, [ledOn]);

  // ── Auto mode — driven by stage profile (lux + humidity targets) ─
  const tempStatus =
    temp > profile.tempDayMax ? "High" : temp < profile.tempDayMin ? "Low" : "Normal";

  useEffect(() => {
    if (mode !== "Auto") return;
    // LED: turn on when lux is below stage luxMax; intensity ∝ deficit
    if (lux < profile.luxMax) {
      const deficit = 1 - lux / profile.luxMax;
      const intensity = Math.round(Math.max(20, Math.min(90, deficit * 100)));
      setLedOn(true);
      setLedIntensity(intensity);
    } else {
      setLedOn(false);
      setLedIntensity(0);
    }
    // Mist: on when humidity below stage minimum
    setMistOn(humidity < profile.humidityMin);
  }, [mode, lux, humidity, stage, profile.luxMax, profile.humidityMin]);

  // ── DLI calculations (using profile targets) ─────────────────────
  const targetDLI = profile.targetDLI;
  const naturalDLI = +(
    ((hoursLit * Math.min(lux, 60000)) / 60000) *
    1.6
  ).toFixed(1);
  const ledDLI = +(ledHoursToday * (ledIntensity / 100) * 1.2).toFixed(1);
  const achievedDLI = +(naturalDLI + ledDLI).toFixed(1);
  const dliPct = Math.min(100, Math.round((achievedDLI / targetDLI) * 100));
  const dliStatus = dliPct >= 100 ? "Optimal" : dliPct >= 60 ? "On Track" : "Low";

  const photoperiodTarget = profile.photoperiodMax;
  const remainingHours = Math.max(0, +(photoperiodTarget - hoursLit).toFixed(1));
  const humidityTarget: [number, number] = [
    profile.humidityMin,
    profile.humidityMax,
  ];


  // ── Energy ──────────────────────────────────────────────────────
  const totalLightHours = hoursLit + ledHoursToday;
  const solarShare = Math.round((hoursLit / Math.max(0.1, totalLightHours)) * 100);
  const energySavedPct = solarShare;

  // ── Memoised UI Alerts ──────────────────────────────────────────
  const alerts = useMemo(() => {
    const a: {
      text: string;
      tone: "warning" | "destructive" | "water" | "leaf";
      level: "Critical" | "Warning" | "Notice";
    }[] = [];

    if (lux < profile.luxMin) {
      a.push({
        text: `Low canopy light (${(lux / 1000).toFixed(1)}k lux) — stage target ${profile.luxMin / 1000}k–${profile.luxMax / 1000}k lux for ${stage}`,
        tone: "warning",
        level: "Warning",
      });
    }
    if (humidity < profile.humidityMin) {
      a.push({
        text: `Low relative humidity (${humidity}%) — below target ${profile.humidityMin}% for ${stage}`,
        tone: "water",
        level: "Warning",
      });
    }
    if (humidity > profile.humidityMax) {
      a.push({
        text: `High relative humidity (${humidity}%) — above threshold ${profile.humidityMax}% for ${stage}`,
        tone: "warning",
        level: "Warning",
      });
    }
    if (temp > profile.tempDayMax) {
      a.push({
        text: `Thermal alert: High temperature (${temp}°C) exceeds max limit ${profile.tempDayMax}°C for ${stage}`,
        tone: "destructive",
        level: "Critical",
      });
    }
    if (temp < profile.tempDayMin) {
      a.push({
        text: `Sub-optimal temperature (${temp}°C) — minimum required ${profile.tempDayMin}°C for ${stage}`,
        tone: "water",
        level: "Notice",
      });
    }
    if (soilMoisture < 30) {
      a.push({
        text: `Substrate dry: Soil moisture is at ${soilMoisture}% (Recommended: 40–70%)`,
        tone: "warning",
        level: "Warning",
      });
    }
    return a;
  }, [lux, humidity, temp, soilMoisture, stage, profile]);

  // ── Control handlers ────────────────────────────────────────────
  const handleToggleLed = async () => {
    if (mode === "Auto") {
      toast.info("Switch to Manual mode to override Grow Light");
      return;
    }
    const next = !ledOn;
    await setLedOn(next);
    await setLedIntensity(next ? 80 : 0);
    toast.success(`Grow Lights switched ${next ? "ON (80%)" : "OFF"}`);
  };

  const handleToggleMist = async () => {
    if (mode === "Auto") {
      toast.info("Switch to Manual mode to override Misting system");
      return;
    }
    const next = !mistOn;
    await setMistOn(next);
    toast.success(`Misting system ${next ? "ACTIVATED" : "DEACTIVATED"}`);
  };

  const handleIntensityChange = async (val: number) => {
    if (mode !== "Manual") return;
    await setLedIntensity(val);
  };

  const handleModeChange = async (m: Mode) => {
    await setMode(m);
    toast.success(`${m.toUpperCase()} mode activated`);
  };

  const handleNavClick = (section: NavSection) => {
    if (section === "Settings") {
      setIsSettingsOpen(true);
    } else {
      setActiveSection(section);
    }
    setIsMobileMenuOpen(false);
  };

  // Nav menu items
  const NAV_ITEMS: { label: NavSection; icon: typeof LayoutDashboard; badge?: number }[] = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Environment", icon: ThermometerSun },
    { label: "Controls", icon: SlidersHorizontal },
    { label: "Analytics", icon: BarChart3 },
    { label: "Plant Growth", icon: Sprout },
    { label: "Alerts", icon: AlertTriangle, badge: alerts.length },
    { label: "Weather", icon: CloudSun },
    { label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden relative">
      {/* Subtle Ambient Polyhouse Tunnel Background with Less Intensity */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none bg-cover bg-center z-0 opacity-[0.06]"
        style={{ backgroundImage: "url('/images/polyhouse_tunnel.jpg')" }}
      />

      {/* ────────────────────────────────────────────────────────────
          1. LEFT SIDEBAR (Desktop - Fixed & Non-scrollable)
      ──────────────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col h-full shrink-0 border-r border-[#1B4D36]/40 sidebar-theme transition-all duration-300 z-30 select-none overflow-hidden ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F6B4F] text-white shadow-sm border border-white/20">
              <Sprout className="h-5 w-5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold tracking-wider text-white uppercase truncate">
                  QUANTUMGROW
                </h1>
                <p className="text-[10px] font-semibold text-[#A8C5A2] flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#A8C5A2] animate-pulse" />
                  Smart Polyhouse
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Node & Hardware Status Chip */}
        {!isSidebarCollapsed && (
          <div className="mx-4 mt-3 shrink-0 rounded-xl border border-white/10 bg-black/25 p-2.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#A8C5A2]">
              <span className="flex items-center gap-1.5 text-white/90">
                <Cpu className="h-3.5 w-3.5 text-[#A8C5A2]" />
                Node #01
              </span>
              <span
                className={`flex items-center gap-1 font-bold ${
                  connected ? "text-[#D4F066]" : loading ? "text-white/60" : "text-[#D97706]"
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    connected ? "bg-[#D4F066] animate-pulse" : "bg-[#D97706]"
                  }`}
                />
                {connected ? "LIVE" : loading ? "SYNCING" : "OFFLINE"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
              <span>Operating Mode</span>
              <span className="font-bold text-white bg-white/15 px-2 py-0.5 rounded-md text-[10px]">{mode}</span>
            </div>
          </div>
        )}

        {/* Navigation list (Compact, no scroll) */}
        <nav className="flex-1 space-y-1 p-3 mt-1 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.label && item.label !== "Settings";
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.label)}
                title={item.label}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#2F6B4F] text-white shadow-md border border-white/20"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                } ${isSidebarCollapsed ? "justify-center px-2" : ""}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-[#D4F066]" : "text-white/60 group-hover:text-white"
                  }`}
                />
                {!isSidebarCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span
                        className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-white text-[#123C2A]"
                            : "bg-[#D97706] text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="p-3.5 shrink-0 border-t border-white/10">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between text-xs text-white/70">
              <div>
                <p className="font-semibold text-white">Commercial Unit A</p>
                <p className="text-[10px] text-white/50">ESP32 Firmware v2.4</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Collapse sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              title="Expand sidebar"
              className="flex h-8 w-full items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA
      ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden relative z-10">
        {/* TOP HEADER */}
        <header className="shrink-0 z-20 flex h-14 md:h-16 w-full items-center justify-between border-b border-border bg-card/90 px-4 md:px-8 backdrop-blur-md">
          {/* Left Title & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {/* Mobile Sheet Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary md:hidden transition-colors"
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-5 border-b border-border sidebar-theme text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F6B4F] text-white border border-white/20">
                      <Sprout className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <SheetTitle className="text-sm font-bold text-white tracking-wide">QUANTUMGROW</SheetTitle>
                      <p className="text-xs text-[#A8C5A2]">Industrial AgTech Polyhouse</p>
                    </div>
                  </div>
                </SheetHeader>
                <div className="p-3 space-y-1.5">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.label && item.label !== "Settings";
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleNavClick(item.label)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {typeof item.badge === "number" && item.badge > 0 && (
                          <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  QuantumGrow
                </span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-xs font-semibold text-leaf">{activeSection}</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                {activeSection === "Dashboard"
                  ? "Real-Time Telemetry & Industrial Control"
                  : `${activeSection} Management`}
              </h2>
            </div>
          </div>

          {/* Right Header Status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real Connection Status Pill */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                loading
                  ? "border-border bg-secondary text-muted-foreground"
                  : connected
                  ? "border-leaf/30 bg-leaf-soft text-leaf"
                  : "border-warning/30 bg-warning-soft text-warning"
              }`}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : connected ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
                </span>
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {loading
                  ? "CONNECTING..."
                  : connected
                  ? "● SYSTEM ONLINE"
                  : "SYSTEM OFFLINE"}
              </span>
              <span className="sm:hidden font-bold">
                {connected ? "LIVE" : "OFFLINE"}
              </span>
            </div>

            {/* Crop Selector */}
            <div className="hidden lg:flex items-center">
              <Select value={crop} onValueChange={setCrop}>
                <SelectTrigger className="h-9 w-36 rounded-xl border-border bg-card text-xs font-semibold">
                  <SelectValue placeholder="Select Crop" />
                </SelectTrigger>
                <SelectContent>
                  {CROPS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs font-medium">
                      🌱 {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notifications Trigger */}
            <button
              type="button"
              onClick={() => setActiveSection("Alerts")}
              title={`${alerts.length} active alerts`}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Settings Trigger */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="System Configuration"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ────────────────────────────────────────────────────────────
            MAIN CONTENT WRAPPER
        ──────────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-3.5 md:p-6 space-y-4 max-w-7xl w-full mx-auto">
          {/* ────────────────────────────────────────────────────────
              SECTION 1 — SYSTEM OVERVIEW CARD (Always prominent)
          ──────────────────────────────────────────────────────── */}
          {(activeSection === "Dashboard" || activeSection === "Environment") && (
            <div className="glass-card rounded-3xl p-4 sm:p-5 border border-border shadow-xs relative overflow-hidden">
              {/* Subtle Agricultural Image Watermark / Atmosphere */}
              <div 
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.08] pointer-events-none bg-cover bg-center"
                style={{ backgroundImage: "url('/images/greenhouse_interior.jpg')" }}
              />
              <div className="relative z-10">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3.5 border-b border-border/60">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Greenhouse Status
                      </span>
                      {alerts.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-0.5 text-xs font-bold text-leaf border border-leaf/20">
                          <CheckCircle2 className="h-3.5 w-3.5" /> ● OPTIMAL CLIMATE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-0.5 text-xs font-bold text-warning border border-warning/20">
                          <AlertTriangle className="h-3.5 w-3.5" /> ⚠ ATTENTION REQUIRED ({alerts.length} ALERTS)
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-muted-foreground border border-border/50">
                        Mode: <span className="font-bold text-foreground">{mode}</span>
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                      Zone 1 Automated Climate & Agronomic Matrix
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 self-start lg:self-auto">
                    <div className="rounded-xl border border-border/80 bg-secondary/50 px-3.5 py-1.5 text-right">
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Last Stream Sync
                      </span>
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        {lastUpdated || "Live WebSocket"}
                      </span>
                    </div>
                  </div>
                </div>

              {/* 6-Metric Primary Telemetry Grid (2 Rows x 3 Columns) */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* 1. Ambient Temperature */}
                <div className="rounded-xl border border-border/70 bg-white shadow-xs hover:shadow-sm transition-all py-2.5 px-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground/80">
                    <Thermometer className="h-4.5 w-4.5 text-warning" /> Temperature
                  </span>
                  <p className="mt-0.5 text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                    {temp} <span className="text-xs font-semibold text-muted-foreground">°C</span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Target: <span className="font-semibold text-foreground/90">{profile.tempDayMin}–{profile.tempDayMax}°C</span>
                  </p>
                </div>

                {/* 2. Relative Humidity */}
                <div className="rounded-xl border border-border/70 bg-white shadow-xs hover:shadow-sm transition-all py-2.5 px-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground/80">
                    <Droplets className="h-4.5 w-4.5 text-water" /> Humidity
                  </span>
                  <p className="mt-0.5 text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                    {humidity} <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Target: <span className="font-semibold text-foreground/90">{profile.humidityMin}–{profile.humidityMax}%</span>
                  </p>
                </div>

                {/* 3. Soil Moisture */}
                <div className="rounded-xl border border-border/70 bg-white shadow-xs hover:shadow-sm transition-all py-2.5 px-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground/80">
                    <Sprout className="h-4.5 w-4.5 text-leaf" /> Soil Moisture
                  </span>
                  <p className="mt-0.5 text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                    {soilMoisture} <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Probes: <span className="font-semibold text-foreground/90">S1 ({soil1}) · S2 ({soil2})</span>
                  </p>
                </div>

                {/* 4. Canopy Light */}
                <div className="rounded-xl border border-border/70 bg-white shadow-xs hover:shadow-sm transition-all py-2.5 px-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground/80">
                    <Sun className="h-4.5 w-4.5 text-sun" /> Canopy Light
                  </span>
                  <p className="mt-0.5 text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                    {(lux / 1000).toFixed(1)}k <span className="text-xs font-semibold text-muted-foreground">lux</span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Target: <span className="font-semibold text-foreground/90">{profile.luxMin / 1000}k–{profile.luxMax / 1000}k</span>
                  </p>
                </div>

                {/* 5. Air Quality & Gas (MQ-2) */}
                <div className="rounded-xl border border-border/70 bg-white shadow-xs hover:shadow-sm transition-all py-2.5 px-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground/80">
                    <Flame className="h-4.5 w-4.5 text-primary" /> Air / MQ-2
                  </span>
                  <p className="mt-0.5 text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                    {mq2} <span className="text-xs font-semibold text-muted-foreground">ADC</span>
                  </p>
                  <p className="mt-0.5 text-xs text-leaf font-semibold">
                    Status: Normal (Safe)
                  </p>
                </div>

                {/* 6. Solar Panel Voltage */}
                <div className="rounded-xl border border-border/70 bg-white shadow-xs hover:shadow-sm transition-all py-2.5 px-3.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground/80">
                    <Zap className="h-4.5 w-4.5 text-sun" /> Solar Panel Voltage
                  </span>
                  <p className="mt-0.5 text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
                    {solarVoltage} <span className="text-xs font-semibold text-muted-foreground">V</span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Target: <span className="font-semibold text-foreground/90">14.0–19.5V (Active PV)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            SENSOR CARDS SECTION (ENVIRONMENT PAGE ONLY)
        ──────────────────────────────────────────────────────── */}
        {activeSection === "Environment" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-foreground">Sensory Telemetry Grid</h4>
                <p className="text-xs text-muted-foreground">Calibrated hardware inputs streamed from ESP32</p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                5 Active Hardware Nodes
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* 1. Ambient Temperature */}
              <SensorCard
                title="Ambient Temperature"
                subtitle="DHT11 Dual Averaged Array (GPIO 26 & 33)"
                value={`${temp}`}
                unit="°C"
                status={tempStatus === "Normal" ? "Normal" : tempStatus === "High" ? "Warning" : "Critical"}
                targetRange={`${profile.tempDayMin} – ${profile.tempDayMax}°C`}
                icon={<Thermometer className="h-5 w-5 text-warning" />}
                tone="warning"
                live={connected}
                lastUpdate={lastUpdated}
              />

              {/* 2. Relative Humidity */}
              <SensorCard
                title="Relative Humidity"
                subtitle="DHT11 Atmospheric Sensor"
                value={`${humidity}`}
                unit="%"
                status={
                  humidity >= profile.humidityMin && humidity <= profile.humidityMax
                    ? "Normal"
                    : "Warning"
                }
                targetRange={`${profile.humidityMin}% – ${profile.humidityMax}%`}
                icon={<Droplets className="h-5 w-5 text-water" />}
                tone="water"
                live={connected}
                lastUpdate={lastUpdated}
              />

              {/* 3. Soil Moisture */}
              <SensorCard
                title="Soil Substrate Moisture"
                subtitle="Dual Capacitive Probes (GPIO 14 & 32)"
                value={`${soilMoisture}`}
                unit="%"
                status={soilMoisture >= 35 && soilMoisture <= 75 ? "Normal" : "Warning"}
                targetRange="40% – 70%"
                icon={<Sprout className="h-5 w-5 text-leaf" />}
                tone="leaf"
                live={connected}
                lastUpdate={lastUpdated}
              />

              {/* 4. Canopy Light Intensity */}
              <SensorCard
                title="Canopy Light Intensity"
                subtitle="Dual LDR Photodiode Array (GPIO 27 & 25)"
                value={`${(lux / 1000).toFixed(1)}k`}
                unit="lux"
                status={lux >= profile.luxMin && lux <= profile.luxMax ? "Normal" : "Warning"}
                targetRange={`${profile.luxMin / 1000}k – ${profile.luxMax / 1000}k lux`}
                icon={<Sun className="h-5 w-5 text-sun" />}
                tone="sun"
                live={connected}
                lastUpdate={lastUpdated}
              />

              {/* 5. Air Quality & Gas (MQ-2) */}
              <SensorCard
                title="Atmospheric Gas & Air Quality"
                subtitle="MQ-2 Gas / Smoke Sensor (GPIO 34)"
                value={`${mq2}`}
                unit="ADC"
                status={mq2 < 700 ? "Normal" : "Critical"}
                targetRange="Clean Air (< 700 ADC)"
                icon={<Flame className="h-5 w-5 text-primary" />}
                tone="leaf"
                live={connected}
                lastUpdate={lastUpdated}
              />

              {/* 6. Grow LED Status */}
              <SensorCard
                title="Grow Light Array"
                subtitle="4-Channel PWM Output (GPIO 2, 4, 18, 19)"
                value={ledOn ? `${ledIntensity}` : "OFF"}
                unit={ledOn ? "%" : ""}
                status={ledOn ? "Normal" : "Normal"}
                targetRange={`Mode: ${mode} · ${ledHoursToday.toFixed(1)}h today`}
                icon={<Lightbulb className="h-5 w-5 text-leaf" />}
                tone="leaf"
                live={connected}
                lastUpdate={lastUpdated}
              />
            </div>
          </div>
        )}


          {/* ────────────────────────────────────────────────────────
              SECTION: INDUSTRIAL IOT CONTROLS
          ──────────────────────────────────────────────────────── */}
          {(activeSection === "Dashboard" || activeSection === "Controls") && (
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary/20 shadow-xs">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      Industrial Actuator Control Station
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Direct hardware synchronization over Firebase RTDB
                    </p>
                  </div>
                </div>

                {/* Operating Mode Selector */}
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 p-1 self-start sm:self-auto">
                  <span className="px-2.5 text-xs font-semibold text-muted-foreground">
                    Operating Mode:
                  </span>
                  {(["Auto", "Manual"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleModeChange(m)}
                      className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                        mode === m
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls Grid */}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 1. Grow Lights Panel */}
                <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                        <Lightbulb className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Grow Light System (4-Channel)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          PWM Intensity: {ledOn ? `${ledIntensity}% (${Math.round((ledIntensity / 100) * 255)} / 255 PWM)` : "Standby (0 PWM)"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        className={`text-xs font-semibold ${
                          ledOn ? "bg-leaf text-white" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {ledOn ? "● ACTIVE" : "OFF"}
                      </Badge>
                      <Switch
                        checked={ledOn}
                        onCheckedChange={handleToggleLed}
                        disabled={mode === "Auto"}
                      />
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Brightness Duty Cycle</span>
                      <span className="font-bold text-foreground">{ledIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={ledIntensity}
                      onChange={(e) => handleIntensityChange(+e.target.value)}
                      disabled={mode === "Auto" || !ledOn}
                      aria-label="Grow Light intensity slider"
                      className="w-full accent-[oklch(0.52_0.15_150)] cursor-pointer disabled:opacity-40"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0% (Off)</span>
                      <span>50%</span>
                      <span>100% (Full Spectrum)</span>
                    </div>
                  </div>
                </div>

                {/* 2. Misting & Humidity Control Panel */}
                <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-water-soft text-water">
                        <Droplets className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          High-Pressure Misting System
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Sub-canopy humidity booster & evaporative cooling
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        className={`text-xs font-semibold ${
                          mistOn ? "bg-water text-white" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {mistOn ? "● MISTING" : "IDLE"}
                      </Badge>
                      <Switch
                        checked={mistOn}
                        onCheckedChange={handleToggleMist}
                        disabled={mode === "Auto"}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleToggleMist}
                      disabled={mode === "Auto"}
                      className={`w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                        mistOn
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "bg-water text-white hover:bg-water/90"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {mistOn ? "Deactivate Misting" : "Trigger Manual Mist Pulse"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hardware write notice */}
              <div className="mt-5 flex items-center justify-between rounded-xl bg-leaf-soft/30 px-4 py-3 border border-leaf/20 text-xs">
                <span className="flex items-center gap-2 text-leaf font-medium">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {mode === "Auto" ? (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>Auto-adjust active: Brightness is dynamically calculated from stage deficit ({lux} lux vs target {profile.luxMax} lux).</span>
                      <span className="hidden sm:inline text-leaf/50 font-bold">·</span>
                      <span>Auto-trigger active: Misting cycles automatically when humidity drops below 60%.</span>
                    </span>
                  ) : (
                    <span>Manual mode enabled: You have full hardware override authority.</span>
                  )}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground hidden md:inline shrink-0 ml-4">
                  Hardware Node: Connected
                </span>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              SECTION: ANALYTICS & DLI EFFICIENCY
          ──────────────────────────────────────────────────────── */}
          {(activeSection === "Dashboard" || activeSection === "Analytics") && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Daily Light Integral (DLI) Progress */}
              <div className="glass-card rounded-2xl p-6 border border-border shadow-xs lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                      <Gauge className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-foreground">
                        Daily Light Integral (DLI) Accumulator
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Natural solar + LED quantum photon delivery
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs font-semibold ${
                      dliStatus === "Optimal"
                        ? "bg-leaf text-white"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    Status: {dliStatus}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-4 my-3">
                  <div>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                      {achievedDLI}
                    </span>
                    <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
                      / {targetDLI} mol·m⁻²·d⁻¹ Target
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Natural solar: <span className="font-semibold text-foreground">{naturalDLI}</span> · LED supplementary: <span className="font-semibold text-foreground">{ledDLI}</span>
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-leaf tabular-nums">
                    {dliPct}%
                  </span>
                </div>

                <Progress value={dliPct} className="h-2.5 bg-secondary my-3" />

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Solar Share
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">{solarShare}%</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      LED Hours Today
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">{ledHoursToday.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Saved Energy
                    </p>
                    <p className="text-base font-bold text-leaf mt-0.5">{energySavedPct}%</p>
                  </div>
                </div>
              </div>

              {/* Energy Efficiency Card */}
              <div className="glass-card rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border/60">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sun-soft text-sun">
                      <Zap className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-foreground">Energy Harvesting</h4>
                      <p className="text-xs text-muted-foreground">Grid offset via natural solar</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Solar vs Artificial Photon Mix</span>
                        <span className="text-leaf">{solarShare}% Solar</span>
                      </div>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="bg-sun transition-all duration-500"
                          style={{ width: `${solarShare}%` }}
                        />
                        <div
                          className="bg-leaf transition-all duration-500"
                          style={{ width: `${100 - solarShare}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-sun" /> Sunlight
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-leaf" /> Grow LED
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-secondary/50 p-3.5 border border-border/60 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Photoperiod Target:</span>
                        <span className="font-semibold text-foreground">{photoperiodTarget}h / day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sunlight Captured:</span>
                        <span className="font-semibold text-foreground">{hoursLit.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining Deficit:</span>
                        <span className="font-semibold text-leaf">{remainingHours}h remaining</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Carbon Reduction Index</span>
                  <span className="font-bold text-leaf">Grade A · High Efficiency</span>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              SECTION: PLANT GROWTH TIMELINE
          ──────────────────────────────────────────────────────── */}
          {(activeSection === "Dashboard" || activeSection === "Plant Growth") && (
            <GrowthStagePanel
              stage={stage}
              daysSincePlant={daysSincePlant}
              temp={temp}
              humidity={humidity}
              lux={lux}
              hoursLit={hoursLit}
              crop={crop}
              onDaysChange={setDaysSincePlant}
            />
          )}

          {/* ────────────────────────────────────────────────────────
              SECTION: WEATHER & PREDICTIVE PLANNING
          ──────────────────────────────────────────────────────── */}
          {(activeSection === "Dashboard" || activeSection === "Weather") && (
            <WeatherForecast stage={stage} />
          )}

          {/* ────────────────────────────────────────────────────────
              SECTION: ALERTS & NOTIFICATIONS
          ──────────────────────────────────────────────────────── */}
          {(activeSection === "Dashboard" || activeSection === "Alerts") && (
            <div className="glass-card rounded-2xl p-6 border border-border shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-soft text-warning">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-foreground">
                      Diagnostic Event & Threshold Warnings
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Real-time bounds validation against active crop agronomic parameters
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    alerts.length === 0
                      ? "border-leaf/30 text-leaf bg-leaf/5"
                      : "border-warning/30 text-warning bg-warning/5"
                  }
                >
                  {alerts.length} Active Notice{alerts.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-leaf/30 bg-leaf-soft/20 p-4 text-sm text-leaf">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">✓ Environment currently stable</p>
                    <p className="text-xs opacity-90">
                      All microclimate metrics (temperature, humidity, light, soil moisture, and air quality) are within designated stage thresholds.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {alerts.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
                        a.tone === "destructive"
                          ? "border-destructive/30 bg-destructive/5 text-destructive"
                          : a.tone === "water"
                          ? "border-water/30 bg-water/5 text-water"
                          : "border-warning/30 bg-warning/5 text-warning"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-[10px]">
                            {a.level}
                          </span>
                          <span className="text-[10px] opacity-75">Just now</span>
                        </div>
                        <p className="font-medium text-foreground leading-relaxed">{a.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ────────────────────────────────────────────────────────────
            FOOTER / FIXED BOTTOM SYSTEM STATUS BAR
        ──────────────────────────────────────────────────────────── */}
        <footer className="shrink-0 border-t border-border/80 bg-card/95 backdrop-blur-sm py-2.5 px-6 text-center text-xs text-muted-foreground z-20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-leaf" />
              <span>QuantumGrow Control System · Production Node #01</span>
            </div>
            <div>
              {connected ? (
                <span className="text-leaf font-medium">
                  ● Real-time Firebase RTDB Stream Active
                </span>
              ) : loading ? (
                <span>Connecting to Firebase…</span>
              ) : (
                <span className="text-warning">
                  ⚠️ Showing cached hardware readings
                </span>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SYSTEM SETTINGS / HARDWARE INFO DIALOG
      ──────────────────────────────────────────────────────────── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Cpu className="h-5 w-5 text-primary" />
              QuantumGrow Hardware & System Architecture
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configuration metadata for ESP32 microcontroller, sensors, and Firebase RTDB endpoints.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Controller Specs */}
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-2">
              <p className="font-bold text-foreground text-xs uppercase tracking-wider">
                Microcontroller Specifications
              </p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>Board: <span className="font-semibold text-foreground">ESP32 Dual-Core @ 240MHz</span></div>
                <div>WiFi Node: <span className="font-semibold text-foreground">WL_CONNECTED (DHCP)</span></div>
                <div>ADC Resolution: <span className="font-semibold text-foreground">12-bit (0–4095)</span></div>
                <div>Display: <span className="font-semibold text-foreground">0.96" I2C SSD1306 OLED</span></div>
              </div>
            </div>

            {/* GPIO Pin Map */}
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-2">
              <p className="font-bold text-foreground text-xs uppercase tracking-wider">
                Hardware Pinout Configuration
              </p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>DHT11 Sensor 1: <span className="font-semibold text-foreground">GPIO 26</span></div>
                <div>DHT11 Sensor 2: <span className="font-semibold text-foreground">GPIO 33</span></div>
                <div>Soil Probe 1 (ADC): <span className="font-semibold text-foreground">GPIO 14</span></div>
                <div>Soil Probe 2 (ADC): <span className="font-semibold text-foreground">GPIO 32</span></div>
                <div>Analog LDR 1 & 2: <span className="font-semibold text-foreground">GPIO 27, 25</span></div>
                <div>Gas / Smoke MQ-2: <span className="font-semibold text-foreground">GPIO 34</span></div>
                <div>PWM Grow LEDs: <span className="font-semibold text-foreground">GPIO 2, 4, 18, 19</span></div>
                <div>I2C Bus (SDA / SCL): <span className="font-semibold text-foreground">GPIO 21, 22</span></div>
              </div>
            </div>

            {/* Firebase Database Node */}
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-1">
              <p className="font-bold text-foreground text-xs uppercase tracking-wider">
                Firebase Realtime Database Endpoint
              </p>
              <p className="font-mono text-[11px] text-primary truncate">
                smart-polyhouse-694e6-default-rtdb.asia-southeast1.firebasedatabase.app
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

interface SensorCardProps {
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  status: "Normal" | "Warning" | "Critical";
  targetRange: string;
  icon: React.ReactNode;
  tone: "sun" | "leaf" | "water" | "warning";
  live?: boolean;
  lastUpdate?: string | null;
}

function SensorCard({
  title,
  subtitle,
  value,
  unit,
  status,
  targetRange,
  icon,
  tone,
  live,
  lastUpdate,
}: SensorCardProps) {
  const statusColor =
    status === "Normal"
      ? "bg-leaf-soft text-leaf border-leaf/30"
      : status === "Warning"
      ? "bg-warning-soft text-warning border-warning/30"
      : "bg-destructive/10 text-destructive border-destructive/30";

  return (
    <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md group bg-card">
      {/* Decorative Subtle Agricultural Watermark */}
      <svg
        className="absolute -right-4 -bottom-4 w-24 h-24 text-[#2F6B4F]/5 pointer-events-none transition-transform duration-500 group-hover:scale-110"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
      </svg>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border/80 shadow-2xs group-hover:bg-primary-soft transition-colors">
              {icon}
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h4>
              <p className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                {subtitle}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${statusColor}`}
          >
            {status === "Normal" && <span className="h-1.5 w-1.5 rounded-full bg-leaf" />}
            {status}
          </span>
        </div>

        <div className="my-2.5 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">{unit}</span>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Target: <strong className="text-foreground font-semibold">{targetRange}</strong></span>
          {live && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-leaf bg-leaf-soft px-2 py-0.5 rounded-full border border-leaf/20">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
