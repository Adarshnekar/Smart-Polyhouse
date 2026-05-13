import { useEffect, useMemo, useState } from "react";
import {
  Sun, Lightbulb, Sprout, Droplets, Thermometer, Brain, Zap,
  Gauge, AlertTriangle, Power, CloudFog, Leaf, TrendingUp, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Stage = "Seedling" | "Vegetative" | "Flowering";
type Mode = "Auto" | "Manual";

const CROPS = ["Tomato", "Lettuce", "Strawberry", "Basil", "Pepper"];
const STAGE_DLI: Record<Stage, number> = {
  Seedling: 8,
  Vegetative: 16,
  Flowering: 22,
};

export default function Dashboard() {
  // Sensors (simulated, realtime)
  const [lux, setLux] = useState(18000);
  const [temp, setTemp] = useState(26.4);
  const [humidity, setHumidity] = useState(58);
  const [hoursLit, setHoursLit] = useState(6.2);

  // System
  const [mode, setMode] = useState<Mode>("Auto");
  const [ledOn, setLedOn] = useState(false);
  const [ledIntensity, setLedIntensity] = useState(0);
  const [mistOn, setMistOn] = useState(false);

  // Crop
  const [crop, setCrop] = useState("Tomato");
  const [stage, setStage] = useState<Stage>("Vegetative");
  const [daysSincePlant, setDaysSincePlant] = useState(24);

  // Energy
  const [ledHoursToday, setLedHoursToday] = useState(2.3);

  // Tick simulation
  useEffect(() => {
    const id = setInterval(() => {
      setLux((l) => Math.max(200, Math.min(95000, l + (Math.random() - 0.5) * 4000)));
      setTemp((t) => +(t + (Math.random() - 0.5) * 0.4).toFixed(1));
      setHumidity((h) => Math.max(20, Math.min(95, +(h + (Math.random() - 0.5) * 1.2).toFixed(0))));
      setHoursLit((h) => +(h + 0.01).toFixed(2));
      if (ledOn) setLedHoursToday((x) => +(x + 0.01).toFixed(2));
    }, 1500);
    return () => clearInterval(id);
  }, [ledOn]);

  const targetDLI = STAGE_DLI[stage];
  const naturalDLI = +(hoursLit * Math.min(lux, 60000) / 60000 * 1.6).toFixed(1);
  const ledDLI = +(ledHoursToday * (ledIntensity / 100) * 1.2).toFixed(1);
  const achievedDLI = +(naturalDLI + ledDLI).toFixed(1);
  const dliPct = Math.min(100, Math.round((achievedDLI / targetDLI) * 100));

  const photoperiodTarget = stage === "Flowering" ? 12 : stage === "Vegetative" ? 16 : 14;
  const remainingHours = Math.max(0, +(photoperiodTarget - hoursLit).toFixed(1));

  const tempStatus = temp > 30 ? "High" : temp < 18 ? "Low" : "Normal";
  const humidityTarget: [number, number] = stage === "Seedling" ? [70, 85] : stage === "Vegetative" ? [55, 70] : [45, 60];
  const humidityLow = humidity < humidityTarget[0];
  const humidityHigh = humidity > humidityTarget[1];
  const lowLight = lux < 8000;

  // Auto decisions
  useEffect(() => {
    if (mode !== "Auto") return;
    // LED auto
    if (lowLight) {
      const intensity = temp > 30 ? 55 : 90;
      setLedOn(true);
      setLedIntensity(intensity);
    } else {
      setLedOn(false);
      setLedIntensity(0);
    }
    // Mist auto
    setMistOn(humidityLow);
  }, [mode, lowLight, humidityLow, temp]);

  const decisions = useMemo(() => {
    const d: { icon: React.ReactNode; text: string; tone: "leaf" | "sun" | "water" | "warning" }[] = [];
    if (lowLight) d.push({ icon: <Lightbulb className="h-4 w-4" />, text: "Low sunlight detected → LED activated", tone: "sun" });
    else d.push({ icon: <Sun className="h-4 w-4" />, text: "Sunlight sufficient → LED standby", tone: "leaf" });
    if (humidityLow) d.push({ icon: <CloudFog className="h-4 w-4" />, text: "Humidity below target → Mist system ON", tone: "water" });
    if (humidityHigh) d.push({ icon: <Droplets className="h-4 w-4" />, text: "Humidity above target → Ventilation suggested", tone: "warning" });
    if (temp > 30 && ledOn) d.push({ icon: <Thermometer className="h-4 w-4" />, text: "Temp high → LED dimmed to 55%", tone: "warning" });
    if (achievedDLI >= targetDLI) d.push({ icon: <Leaf className="h-4 w-4" />, text: "DLI target reached → Optimal growth", tone: "leaf" });
    return d;
  }, [lowLight, humidityLow, humidityHigh, temp, ledOn, achievedDLI, targetDLI]);

  const alerts = useMemo(() => {
    const a: { text: string; tone: "warning" | "destructive" | "water" }[] = [];
    if (lowLight) a.push({ text: "Low light warning — natural lux below 8,000", tone: "warning" });
    if (humidityLow) a.push({ text: `Low humidity (${humidity}%) — target ${humidityTarget[0]}–${humidityTarget[1]}%`, tone: "water" });
    if (temp > 30) a.push({ text: `High temperature (${temp}°C) — auto-adjusting`, tone: "destructive" });
    return a;
  }, [lowLight, humidityLow, humidity, temp, humidityTarget]);

  // Energy
  const totalLightHours = hoursLit + ledHoursToday;
  const solarShare = Math.round((hoursLit / Math.max(0.1, totalLightHours)) * 100);
  const energySavedPct = solarShare;

  const handleToggleLed = () => {
    if (mode === "Auto") {
      toast.info("Switch to Manual to override LED");
      return;
    }
    setLedOn((v) => {
      const next = !v;
      setLedIntensity(next ? 80 : 0);
      toast.success(`LED turned ${next ? "ON" : "OFF"}`);
      return next;
    });
  };

  const handleToggleMist = () => {
    if (mode === "Auto") {
      toast.info("Switch to Manual to override Mist");
      return;
    }
    setMistOn((v) => {
      toast.success(`Mist system ${!v ? "ON" : "OFF"}`);
      return !v;
    });
  };

  const cycleStage = () => {
    const order: Stage[] = ["Seedling", "Vegetative", "Flowering"];
    const next = order[(order.indexOf(stage) + 1) % order.length];
    setStage(next);
    toast.success(`Stage changed to ${next}`);
  };

  const dliStatus = dliPct >= 100 ? "Optimal" : dliPct >= 60 ? "On Track" : "Low";

  return (
    <div className="min-h-screen w-full px-4 py-6 md:px-8 md:py-10">
      {/* Header */}
      <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grad-leaf glow-leaf flex h-12 w-12 items-center justify-center rounded-2xl">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Greenhouse Control</h1>
            <p className="text-sm text-muted-foreground">Smart light & climate orchestration · Live</p>
          </div>
        </div>
        <div className="flex items-center gap-3 glass-card rounded-2xl px-4 py-2.5">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Mode</span>
          <div className="flex rounded-full bg-secondary p-1">
            {(["Auto", "Manual"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); toast.success(`${m} mode enabled`); }}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  mode === m ? "grad-leaf text-primary-foreground glow-leaf" : "text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Light */}
        <StatCard
          tone="sun"
          icon={<Sun className="h-5 w-5" />}
          label="Light Intensity"
          value={`${(lux / 1000).toFixed(1)}k`}
          unit="lux"
          sub={`${hoursLit.toFixed(1)}h today · ${remainingHours}h remaining`}
        />
        {/* Temp */}
        <StatCard
          tone="warning"
          icon={<Thermometer className="h-5 w-5" />}
          label="Temperature"
          value={`${temp}`}
          unit="°C"
          sub={
            <span className="flex items-center gap-2">
              <Badge variant="outline" className={tempStatus === "Normal" ? "border-leaf/40 text-leaf" : "border-warning/40 text-warning"}>
                {tempStatus}
              </Badge>
              {mode === "Auto" && <span className="text-xs text-muted-foreground">Auto-adjust on</span>}
            </span>
          }
        />
        {/* Humidity */}
        <StatCard
          tone="water"
          icon={<Droplets className="h-5 w-5" />}
          label="Humidity"
          value={`${humidity}`}
          unit="%"
          sub={`Target ${humidityTarget[0]}–${humidityTarget[1]}% · Mist ${mistOn ? "ON" : "OFF"}`}
        />
        {/* LED */}
        <StatCard
          tone="leaf"
          icon={<Lightbulb className="h-5 w-5" />}
          label="LED System"
          value={ledOn ? `${ledIntensity}` : "OFF"}
          unit={ledOn ? "%" : ""}
          sub={`Mode: ${mode} · ${ledHoursToday.toFixed(1)}h today`}
          glowing={ledOn}
        />

        {/* DLI Progress */}
        <div className="glass-card rounded-3xl p-6 md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-leaf" />
              <h3 className="font-semibold">Daily Light Integral (DLI)</h3>
            </div>
            <Badge className={`${dliStatus === "Optimal" ? "grad-leaf text-primary-foreground" : "bg-secondary text-foreground"}`}>
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
            <Mini label="Solar share" value={`${solarShare}%`} />
            <Mini label="LED hours" value={`${ledHoursToday.toFixed(1)}h`} />
            <Mini label="Saved energy" value={`${energySavedPct}%`} tone="leaf" />
          </div>
        </div>

        {/* System Decisions */}
        <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-leaf" />
              <h3 className="font-semibold">System Decisions</h3>
            </div>
            <Badge variant="outline" className="border-leaf/40 text-leaf">AI · Live</Badge>
          </div>
          <ul className="space-y-2.5">
            {decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3">
                <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                  d.tone === "leaf" ? "grad-leaf text-primary-foreground" :
                  d.tone === "sun" ? "grad-sun text-primary-foreground" :
                  d.tone === "water" ? "grad-water text-primary-foreground" :
                  "bg-warning/20 text-warning"
                }`}>{d.icon}</span>
                <span className="pt-1 text-sm">{d.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Crop */}
        <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Sprout className="h-5 w-5 text-leaf" />
            <h3 className="font-semibold">Crop & Growth Stage</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Crop</label>
              <Select value={crop} onValueChange={(v) => { setCrop(v); toast.success(`Crop: ${v}`); }}>
                <SelectTrigger className="mt-1 bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Stage</label>
              <Button onClick={cycleStage} variant="secondary" className="mt-1 w-full justify-between">
                <span>{stage}</span>
                <TrendingUp className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Days planted</label>
              <div className="mt-1 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDaysSincePlant((d) => Math.max(0, d - 1))}>−</Button>
                <div className="flex-1 rounded-md bg-secondary/50 py-2 text-center font-semibold">{daysSincePlant}</div>
                <Button variant="outline" size="sm" onClick={() => setDaysSincePlant((d) => d + 1)}>+</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Controls */}
        <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Power className="h-5 w-5 text-leaf" />
            <h3 className="font-semibold">Manual Controls</h3>
            {mode === "Auto" && <Badge variant="outline" className="ml-auto border-warning/40 text-warning">Auto active</Badge>}
          </div>
          <div className="space-y-4">
            <Row label="LED" value={ledOn ? `ON · ${ledIntensity}%` : "OFF"}>
              <Switch checked={ledOn} onCheckedChange={handleToggleLed} disabled={mode === "Auto"} />
            </Row>
            <div className={`px-1 ${mode === "Auto" ? "opacity-50" : ""}`}>
              <input
                type="range" min={0} max={100} value={ledIntensity}
                onChange={(e) => mode === "Manual" && setLedIntensity(+e.target.value)}
                disabled={mode === "Auto" || !ledOn}
                className="w-full accent-[oklch(0.78_0.18_145)]"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>0%</span><span>Intensity</span><span>100%</span>
              </div>
            </div>
            <Row label="Mist System" value={mistOn ? "ON" : "OFF"}>
              <Switch checked={mistOn} onCheckedChange={handleToggleMist} disabled={mode === "Auto"} />
            </Row>
            <Row label="Control Mode" value={mode}>
              <Switch checked={mode === "Auto"} onCheckedChange={(v) => { setMode(v ? "Auto" : "Manual"); toast.success(`${v ? "Auto" : "Manual"} mode`); }} />
            </Row>
          </div>
        </div>

        {/* Energy */}
        <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-sun" />
            <h3 className="font-semibold">Energy & Efficiency</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <BigStat label="LED usage" value={`${ledHoursToday.toFixed(1)}h`} tone="sun" />
            <BigStat label="Energy saved" value={`${energySavedPct}%`} tone="leaf" />
            <BigStat label="Solar share" value={`${solarShare}%`} tone="water" />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">Sunlight vs Artificial</p>
            <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
              <div className="grad-sun" style={{ width: `${solarShare}%` }} />
              <div className="grad-leaf" style={{ width: `${100 - solarShare}%` }} />
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-semibold">Alerts</h3>
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
                  a.tone === "water" ? "border-water/30 bg-water/10" :
                  "border-warning/30 bg-warning/10"
                }`}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="mx-auto mt-10 max-w-7xl text-center text-xs text-muted-foreground">
        Live sensor stream · updated every 1.5s
      </footer>
    </div>
  );
}

function StatCard({
  icon, label, value, unit, sub, tone, glowing,
}: {
  icon: React.ReactNode; label: string; value: string; unit?: string; sub?: React.ReactNode;
  tone: "sun" | "leaf" | "water" | "warning"; glowing?: boolean;
}) {
  const grad =
    tone === "sun" ? "grad-sun" : tone === "leaf" ? "grad-leaf" : tone === "water" ? "grad-water" : "bg-warning/30";
  return (
    <div className="glass-card group relative overflow-hidden rounded-3xl p-5 transition-transform hover:-translate-y-0.5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${grad} text-primary-foreground ${glowing ? "pulse-ring" : ""}`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight">
        {value}<span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
      </p>
      <div className="mt-2 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "leaf" }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${tone === "leaf" ? "text-leaf" : ""}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
      {children}
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: string; tone: "sun" | "leaf" | "water" }) {
  const t = tone === "sun" ? "text-sun" : tone === "leaf" ? "text-leaf" : "text-water";
  return (
    <div className="rounded-2xl bg-secondary/40 p-4 text-center">
      <p className={`text-2xl font-bold ${t}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
