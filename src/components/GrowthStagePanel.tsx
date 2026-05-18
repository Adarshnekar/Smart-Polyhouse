import { CheckCircle2, AlertTriangle, XCircle, CalendarDays, Sun, Thermometer, Droplets, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GROWTH_STAGES, STAGE_ORDER, Stage,
  daysInStage, stageEndDay, TOTAL_GROW_DAYS,
} from "@/lib/growthStages";

type ParamStatus = "optimal" | "low" | "high";

function status(val: number, min: number, max: number): ParamStatus {
  if (val < min) return "low";
  if (val > max) return "high";
  return "optimal";
}

function StatusChip({ s }: { s: ParamStatus }) {
  if (s === "optimal")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-leaf"><CheckCircle2 className="h-3 w-3" />OK</span>;
  if (s === "low")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-water"><AlertTriangle className="h-3 w-3" />Low</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning"><XCircle className="h-3 w-3" />High</span>;
}

interface Props {
  stage: Stage;
  daysSincePlant: number;
  temp: number;
  humidity: number;
  lux: number;
  hoursLit: number;
  crop: string;
  onDaysChange: (d: number) => void;
}

export default function GrowthStagePanel({ stage, daysSincePlant, temp, humidity, lux, hoursLit, crop, onDaysChange }: Props) {
  const profile = GROWTH_STAGES[stage];
  const inStage  = daysInStage(daysSincePlant);
  const stageEnd = stageEndDay(stage);
  const stageDuration = profile.durationMax;
  const stagePct  = Math.min(100, Math.round((inStage / stageDuration) * 100));
  const overallPct = Math.min(100, Math.round((daysSincePlant / TOTAL_GROW_DAYS) * 100));
  const daysLeft   = Math.max(0, stageEnd - daysSincePlant);

  // Accent helpers
  const accentText  = `text-${profile.accentColor}`;
  const accentBg    = `bg-${profile.accentColor}-soft`;
  const accentBorder= `border-${profile.accentColor}/30`;

  const rows = [
    {
      icon: <Sun className="h-4 w-4" />,
      label: "Light (lux)",
      target: `${(profile.luxMin / 1000).toFixed(0)}k – ${(profile.luxMax / 1000).toFixed(0)}k`,
      current: `${(lux / 1000).toFixed(1)}k`,
      st: status(lux, profile.luxMin, profile.luxMax),
    },
    {
      icon: <Thermometer className="h-4 w-4" />,
      label: "Temp Day",
      target: `${profile.tempDayMin}–${profile.tempDayMax}°C`,
      current: `${temp}°C`,
      st: status(temp, profile.tempDayMin, profile.tempDayMax),
    },
    {
      icon: <Droplets className="h-4 w-4" />,
      label: "Humidity",
      target: `${profile.humidityMin}–${profile.humidityMax}%`,
      current: `${humidity}%`,
      st: status(humidity, profile.humidityMin, profile.humidityMax),
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Photoperiod",
      target: `${profile.photoperiodMin}–${profile.photoperiodMax}h`,
      current: `${hoursLit.toFixed(1)}h`,
      st: status(hoursLit, profile.photoperiodMin, profile.photoperiodMax),
    },
  ];

  return (
    <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentBg} text-2xl`}>
            {profile.emoji}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crop · Growth Stage</p>
            <h3 className={`text-xl font-bold ${accentText}`}>{crop} — {profile.label}</h3>
          </div>
        </div>

        {/* Days counter */}
        <div className={`flex items-center gap-3 rounded-2xl border ${accentBorder} ${accentBg}/30 px-4 py-2.5`}>
          <CalendarDays className={`h-4 w-4 ${accentText}`} />
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium">Days Since Planting</p>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => onDaysChange(Math.max(0, daysSincePlant - 1))}
                className="h-6 w-6 rounded-full bg-secondary text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
              >−</button>
              <span className="text-xl font-bold text-foreground w-8 text-center">{daysSincePlant}</span>
              <button
                onClick={() => onDaysChange(daysSincePlant + 1)}
                className="h-6 w-6 rounded-full bg-secondary text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
              >+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stage timeline */}
      <div className="mb-6 flex w-full gap-2">
        {STAGE_ORDER.map((s) => {
          const p    = GROWTH_STAGES[s];
          const past = STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(stage);
          const active = s === stage;
          return (
            <div key={s} className="flex-1 text-center">
              <div className={`h-2 w-full rounded-full mb-2 transition-all ${
                active ? `bg-${p.accentColor}` : past ? "bg-leaf/40" : "bg-secondary"
              }`} />
              <span className={`text-[11px] font-semibold ${active ? accentText : "text-muted-foreground"}`}>
                {p.emoji} {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stage progress */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-secondary/60 border border-border/50 p-4 col-span-2">
          <p className="text-xs text-muted-foreground font-semibold mb-2">Stage Progress — Day {inStage} of {stageDuration}</p>
          <Progress value={stagePct} className="h-2.5 mb-1" />
          <p className="text-xs text-muted-foreground mt-1">{daysLeft} days remaining in {profile.label}</p>
        </div>
        <div className="rounded-2xl bg-secondary/60 border border-border/50 p-4 col-span-2">
          <p className="text-xs text-muted-foreground font-semibold mb-2">Overall Grow Progress — Day {daysSincePlant} of {TOTAL_GROW_DAYS}</p>
          <Progress value={overallPct} className="h-2.5 mb-1" />
          <p className="text-xs text-muted-foreground mt-1">{Math.max(0, TOTAL_GROW_DAYS - daysSincePlant)} days to full harvest</p>
        </div>
      </div>

      {/* Parameters table */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Stage Targets vs Current Readings</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <div key={r.label} className={`rounded-2xl border p-4 ${
              r.st === "optimal" ? "border-leaf/20 bg-leaf-soft/10" :
              r.st === "low"     ? "border-water/20 bg-water-soft/10" :
                                   "border-warning/20 bg-warning-soft/10"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center gap-1.5 text-muted-foreground`}>{r.icon}<span className="text-xs font-semibold">{r.label}</span></div>
                <StatusChip s={r.st} />
              </div>
              <p className="text-xl font-bold text-foreground">{r.current}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Target: {r.target}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stage params reference */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 border-t border-border pt-4">
        <div className="text-xs"><span className="text-muted-foreground">Night Temp:</span> <span className="font-semibold">{profile.tempNightMin}–{profile.tempNightMax}°C</span></div>
        <div className="text-xs"><span className="text-muted-foreground">Duration:</span> <span className="font-semibold">{profile.durationMin}–{profile.durationMax} days</span></div>
        <div className="text-xs"><span className="text-muted-foreground">Target DLI:</span> <span className="font-semibold">{profile.targetDLI} mol·m⁻²·d⁻¹</span></div>
        <div className="text-xs"><span className="text-muted-foreground">Auto advance at:</span> <span className="font-semibold">Day {stageEndDay(stage)}</span></div>
      </div>
    </div>
  );
}
