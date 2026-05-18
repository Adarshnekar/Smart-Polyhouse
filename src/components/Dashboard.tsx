import { useEffect, useMemo, useState } from "react";
import {
  Sun, Lightbulb, Sprout, Droplets, Thermometer, Zap,
  Gauge, AlertTriangle, Power, Settings2,
  Wifi, WifiOff, Loader2, Menu,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import WeatherForecast from "./WeatherForecast";
import GrowthStagePanel from "./GrowthStagePanel";
import { useFirebase } from "@/hooks/useFirebase";
import { GROWTH_STAGES, Stage, stageFromDays } from "@/lib/growthStages";

type Mode = "Auto" | "Manual";

const CROPS = ["Tomato", "Lettuce", "Strawberry", "Basil", "Pepper"];

export default function Dashboard() {
  // ── Firebase real-time state ────────────────────────────────────
  const {
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
  } = useFirebase();

  // ── Local UI state (not synced to Firebase) ─────────────────────
  const [crop, setCrop] = useState("Tomato");
  const [daysSincePlant, setDaysSincePlant] = useState(24);
  const [ledHoursToday, setLedHoursToday] = useState(2.3);
  const [activeCategory, setActiveCategory] = useState("Overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const CATEGORIES = ["Overview", "Environment", "Crop Management", "Controls & Energy", "Weather & Alerts"];

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
  const tempStatus = temp > profile.tempDayMax ? "High" : temp < profile.tempDayMin ? "Low" : "Normal";

  useEffect(() => {
    if (mode !== "Auto") return;
    // LED: turn on when lux is below stage luxMax; intensity ∝ deficit
    if (lux < profile.luxMax) {
      const deficit   = 1 - lux / profile.luxMax;
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
  const targetDLI   = profile.targetDLI;
  const naturalDLI  = +(hoursLit * Math.min(lux, 60000) / 60000 * 1.6).toFixed(1);
  const ledDLI      = +(ledHoursToday * (ledIntensity / 100) * 1.2).toFixed(1);
  const achievedDLI = +(naturalDLI + ledDLI).toFixed(1);
  const dliPct      = Math.min(100, Math.round((achievedDLI / targetDLI) * 100));
  const dliStatus   = dliPct >= 100 ? "Optimal" : dliPct >= 60 ? "On Track" : "Low";

  const photoperiodTarget = profile.photoperiodMax;
  const remainingHours    = Math.max(0, +(photoperiodTarget - hoursLit).toFixed(1));
  const humidityTarget: [number, number] = [profile.humidityMin, profile.humidityMax];

  // ── Energy ──────────────────────────────────────────────────────
  const totalLightHours = hoursLit + ledHoursToday;
  const solarShare      = Math.round((hoursLit / Math.max(0.1, totalLightHours)) * 100);
  const energySavedPct  = solarShare;

  // ── Memoised UI data ────────────────────────────────────────────
  const alerts = useMemo(() => {
    const a: { text: string; tone: "warning" | "destructive" | "water" }[] = [];
    if (lux < profile.luxMin)       a.push({ text: `Low light (${(lux/1000).toFixed(1)}k lux) — target ${profile.luxMin/1000}k–${profile.luxMax/1000}k lux for ${stage}`, tone: "warning" });
    if (humidity < profile.humidityMin) a.push({ text: `Low humidity (${humidity}%) — target ${profile.humidityMin}–${profile.humidityMax}% for ${stage}`, tone: "water" });
    if (humidity > profile.humidityMax) a.push({ text: `High humidity (${humidity}%) — target ${profile.humidityMin}–${profile.humidityMax}% for ${stage}`, tone: "warning" });
    if (temp > profile.tempDayMax)  a.push({ text: `High temperature (${temp}°C) — max ${profile.tempDayMax}°C for ${stage}`, tone: "destructive" });
    if (temp < profile.tempDayMin)  a.push({ text: `Low temperature (${temp}°C) — min ${profile.tempDayMin}°C for ${stage}`, tone: "water" });
    return a;
  }, [lux, humidity, temp, stage, profile]);

  // ── Control handlers ────────────────────────────────────────────
  const handleToggleLed = async () => {
    if (mode === "Auto") { toast.info("Switch to Manual to override LED"); return; }
    const next = !ledOn;
    await setLedOn(next);
    await setLedIntensity(next ? 80 : 0);
    toast.success(`LED turned ${next ? "ON" : "OFF"}`);
  };

  const handleToggleMist = async () => {
    if (mode === "Auto") { toast.info("Switch to Manual to override Mist"); return; }
    const next = !mistOn;
    await setMistOn(next);
    toast.success(`Mist system ${next ? "ON" : "OFF"}`);
  };

  const handleIntensityChange = async (val: number) => {
    if (mode !== "Manual") return;
    await setLedIntensity(val);
  };

  const handleModeChange = async (m: Mode) => {
    await setMode(m);
    toast.success(`${m} mode enabled`);
  };

  // Stage advances automatically via stageFromDays — no manual cycleStage needed

  // ── Connection status badge ─────────────────────────────────────
  const ConnectionBadge = () => (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all
      ${loading  ? "bg-secondary text-muted-foreground" :
        connected ? "bg-leaf-soft text-leaf" : "bg-warning-soft text-warning"}`}>
      {loading  ? <Loader2 className="h-3 w-3 animate-spin" /> :
       connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {loading ? "Connecting…" : connected ? "Live · Firebase" : "Offline"}
    </div>
  );

  return (
    <div className="min-h-screen w-full px-4 py-6 md:px-8 md:py-10">
      {/* Header */}
      <header className="mx-auto mb-10 flex max-w-7xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          {/* Menu Drawer */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border shadow-sm hover:bg-secondary/80 transition-colors">
                <Menu className="h-6 w-6 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader className="mb-6">
                <SheetTitle>Categories</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setIsMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-start rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Good Morning, Grower! 👋</h1>
            <p className="mt-2 text-xl font-medium text-primary">Here is your greenhouse status today</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Firebase connection indicator */}
          <ConnectionBadge />
          {/* Mode selector */}
          <div className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-2.5 shadow-sm">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Mode</span>
            <div className="flex rounded-full bg-secondary p-1">
              {(["Auto", "Manual"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* ── Sensor Cards ─────────────────────────────────────────── */}
        {(activeCategory === "Overview" || activeCategory === "Environment") && (
          <>
            <StatCard
              tone="sun"
              icon={<Sun className="h-5 w-5" />}
              label="Light Intensity"
              value={`${(lux / 1000).toFixed(1)}k`}
              unit="lux"
              sub={`${hoursLit.toFixed(1)}h today · ${remainingHours}h remaining`}
              live={connected}
            />
            <StatCard
              tone="warning"
              icon={<Thermometer className="h-5 w-5" />}
              label="Temperature"
              value={`${temp}`}
              unit="°C"
              live={connected}
              sub={
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className={tempStatus === "Normal" ? "border-leaf/40 text-leaf" : "border-warning/40 text-warning"}>
                    {tempStatus}
                  </Badge>
                  {mode === "Auto" && <span className="text-xs text-muted-foreground">Auto-adjust on</span>}
                </span>
              }
            />
            <StatCard
              tone="water"
              icon={<Droplets className="h-5 w-5" />}
              label="Humidity"
              value={`${humidity}`}
              unit="%"
              sub={`Target ${humidityTarget[0]}–${humidityTarget[1]}% · Mist ${mistOn ? "ON" : "OFF"}`}
              live={connected}
            />
            <StatCard
              tone="leaf"
              icon={<Sprout className="h-5 w-5" />}
              label="Soil Moisture"
              value={`${soilMoisture}`}
              unit="%"
              sub="Average of Soil 1 & Soil 2"
              live={connected}
            />
            <StatCard
              tone="leaf"
              icon={<Lightbulb className="h-5 w-5" />}
              label="LED System"
              value={ledOn ? `${ledIntensity}` : "OFF"}
              unit={ledOn ? "%" : ""}
              sub={`Mode: ${mode} · ${ledHoursToday.toFixed(1)}h today`}
              glowing={ledOn}
              live={connected}
            />
          </>
        )}

        {/* ── DLI Progress ──────────────────────────────────────────── */}
        {(activeCategory === "Overview" || activeCategory === "Crop Management") && (
          <div className="glass-card rounded-3xl p-6 md:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft text-leaf">
                  <Gauge className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-foreground">Daily Light Integral (DLI)</h3>
              </div>
              <Badge className={`${dliStatus === "Optimal" ? "bg-leaf text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {dliStatus}
              </Badge>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tight">{achievedDLI}<span className="ml-1 text-base font-normal text-muted-foreground">/ {targetDLI} mol·m⁻²·d⁻¹</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Natural {naturalDLI} + LED {ledDLI}</p>
              </div>
              <p className="text-3xl font-semibold text-leaf">{dliPct}%</p>
            </div>
            <Progress value={dliPct} className="h-3" />
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <Mini label="Solar share"  value={`${solarShare}%`} />
              <Mini label="LED hours"    value={`${ledHoursToday.toFixed(1)}h`} />
              <Mini label="Saved energy" value={`${energySavedPct}%`} tone="leaf" />
            </div>
          </div>
        )}

        {/* ── Growth Stage Panel (full-width) ───────────────────────── */}
        {(activeCategory === "Overview" || activeCategory === "Crop Management") && (
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

        {/* ── Manual Controls ───────────────────────────────────────── */}
        {(activeCategory === "Overview" || activeCategory === "Controls & Energy") && (
          <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Power className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold text-foreground">Manual Controls</h3>
              {mode === "Auto" && (
                <Badge variant="outline" className="ml-auto border-warning/40 text-warning bg-warning/5">Auto active</Badge>
              )}
              {/* Firebase sync indicator */}
              {connected && (
                <span className="ml-1 flex items-center gap-1 text-[10px] font-semibold text-leaf">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf animate-pulse" />
                  Syncing to Firebase
                </span>
              )}
            </div>
            <div className="space-y-4">
              {/* LED toggle */}
              <Row label="LED" value={ledOn ? `ON · ${ledIntensity}%` : "OFF"}>
                <Switch checked={ledOn} onCheckedChange={handleToggleLed} disabled={mode === "Auto"} />
              </Row>

              {/* Intensity slider */}
              <div className={`px-1 ${mode === "Auto" ? "opacity-50" : ""}`}>
                <input
                  type="range" min={0} max={100} value={ledIntensity}
                  onChange={(e) => handleIntensityChange(+e.target.value)}
                  disabled={mode === "Auto" || !ledOn}
                  className="w-full accent-[oklch(0.78_0.18_145)]"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>0%</span><span>Intensity</span><span>100%</span>
                </div>
              </div>

              {/* Mist toggle */}
              <Row label="Mist System" value={mistOn ? "ON" : "OFF"}>
                <Switch checked={mistOn} onCheckedChange={handleToggleMist} disabled={mode === "Auto"} />
              </Row>

              {/* Mode toggle */}
              <Row label="Control Mode" value={mode}>
                <Switch
                  checked={mode === "Auto"}
                  onCheckedChange={(v) => handleModeChange(v ? "Auto" : "Manual")}
                />
              </Row>
            </div>

            {/* Firebase write hint */}
            {mode === "Manual" && (
              <p className="mt-4 rounded-xl bg-leaf-soft/30 px-4 py-2.5 text-xs text-leaf border border-leaf/20">
                ⚡ Changes are written to Firebase in real time and sent to your hardware.
              </p>
            )}
          </div>
        )}

        {/* ── Energy & Efficiency ───────────────────────────────────── */}
        {(activeCategory === "Overview" || activeCategory === "Controls & Energy") && (
          <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sun-soft text-sun">
                <Zap className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold text-foreground">Energy & Efficiency</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <BigStat label="LED usage"    value={`${ledHoursToday.toFixed(1)}h`} tone="sun" />
              <BigStat label="Energy saved" value={`${energySavedPct}%`}           tone="leaf" />
              <BigStat label="Solar share"  value={`${solarShare}%`}               tone="water" />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">Sunlight vs Artificial</p>
              <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
                <div className="grad-sun" style={{ width: `${solarShare}%` }} />
                <div className="grad-leaf" style={{ width: `${100 - solarShare}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ── 3-Day Weather Forecast ────────────────────────────────── */}
        {(activeCategory === "Overview" || activeCategory === "Weather & Alerts") && (
          <WeatherForecast stage={stage} />
        )}

        {/* ── Alerts ───────────────────────────────────────────────── */}
        {(activeCategory === "Overview" || activeCategory === "Weather & Alerts") && (
          <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold text-foreground">Alerts</h3>
              <Badge variant="outline" className="ml-auto">{alerts.length} active</Badge>
            </div>
            {alerts.length === 0 ? (
              <div className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
                All systems within optimal range. No alerts.
              </div>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {alerts.map((a, i) => (
                  <li key={i} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                    a.tone === "destructive" ? "border-destructive/40 bg-destructive/10" :
                    a.tone === "water"       ? "border-water/30 bg-water/10" :
                                              "border-warning/30 bg-warning/10"
                  }`}>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{a.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <footer className="mx-auto mt-10 max-w-7xl text-center text-xs text-muted-foreground">
        {connected
          ? "🔴 Live Firebase stream · syncing with hardware"
          : loading
          ? "Connecting to Firebase…"
          : "⚠️ Firebase offline — showing last known values"}
      </footer>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, unit, sub, tone, glowing, live,
}: {
  icon: React.ReactNode; label: string; value: string; unit?: string;
  sub?: React.ReactNode; tone: "sun" | "leaf" | "water" | "warning";
  glowing?: boolean; live?: boolean;
}) {
  const iconBg =
    tone === "sun"     ? "bg-sun-soft text-sun" :
    tone === "leaf"    ? "bg-leaf-soft text-leaf" :
    tone === "water"   ? "bg-water-soft text-water" :
                         "bg-warning-soft text-warning";
  return (
    <div className="glass-card group relative overflow-hidden rounded-3xl p-6 transition-transform hover:-translate-y-0.5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {live && (
            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-leaf animate-pulse align-middle" title="Live from Firebase" />
          )}
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg} ${glowing ? "pulse-ring" : ""}`}>
          {icon}
        </span>
      </div>
      <p className="text-4xl font-bold tracking-tight text-foreground">
        {value}<span className="ml-1 text-lg font-medium text-muted-foreground">{unit}</span>
      </p>
      <div className="mt-2 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "leaf" }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-4 py-3 border border-border/50">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</p>
      <p className={`text-base font-bold ${tone === "leaf" ? "text-leaf" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-4 border border-border/50">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{value}</p>
      </div>
      {children}
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: string; tone: "sun" | "leaf" | "water" }) {
  const t  = tone === "sun" ? "text-sun"  : tone === "leaf" ? "text-leaf"  : "text-water";
  const bg = tone === "sun" ? "bg-sun-soft/50 border-sun/10" : tone === "leaf" ? "bg-leaf-soft/50 border-leaf/10" : "bg-water-soft/50 border-water/10";
  return (
    <div className={`rounded-2xl p-5 text-center border ${bg}`}>
      <p className={`text-3xl font-bold ${t}`}>{value}</p>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
