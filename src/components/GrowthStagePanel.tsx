import { CheckCircle2, AlertTriangle, XCircle, CalendarDays, Sun, Thermometer, Droplets, Clock, ChevronRight, Sprout, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GROWTH_STAGES, STAGE_ORDER, Stage,
  daysInStage, stageEndDay, TOTAL_GROW_DAYS,
} from "@/lib/growthStages";

const STAGE_IMAGES: Record<Stage, string> = {
  Seedling: "/images/seedling_stage.jpg",
  Vegetative: "/images/vegetative_stage.jpg",
  Flowering: "/images/flowering_stage.jpg",
  Harvest: "/images/harvest_stage.jpg",
};

type ParamStatus = "optimal" | "low" | "high";

function status(val: number, min: number, max: number): ParamStatus {
  if (val < min) return "low";
  if (val > max) return "high";
  return "optimal";
}

function StatusChip({ s }: { s: ParamStatus }) {
  if (s === "optimal")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-2.5 py-0.5 text-[11px] font-semibold text-leaf border border-leaf/20">
        <CheckCircle2 className="h-3 w-3" /> Optimal
      </span>
    );
  if (s === "low")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-water-soft px-2.5 py-0.5 text-[11px] font-semibold text-water border border-water/20">
        <AlertTriangle className="h-3 w-3" /> Below Target
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning border border-warning/20">
      <XCircle className="h-3 w-3" /> Above Target
    </span>
  );
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

export default function GrowthStagePanel({
  stage,
  daysSincePlant,
  temp,
  humidity,
  lux,
  hoursLit,
  crop,
  onDaysChange,
}: Props) {
  const profile = GROWTH_STAGES[stage];
  const inStage = daysInStage(daysSincePlant);
  const stageEnd = stageEndDay(stage);
  const stageDuration = profile.durationMax;
  const stagePct = Math.min(100, Math.round((inStage / stageDuration) * 100));
  const overallPct = Math.min(100, Math.round((daysSincePlant / TOTAL_GROW_DAYS) * 100));
  const daysLeft = Math.max(0, stageEnd - daysSincePlant);

  const rows = [
    {
      icon: <Sun className="h-4 w-4 text-sun" />,
      label: "Canopy Light",
      target: `${(profile.luxMin / 1000).toFixed(0)}k – ${(profile.luxMax / 1000).toFixed(0)}k lux`,
      current: `${(lux / 1000).toFixed(1)}k lux`,
      st: status(lux, profile.luxMin, profile.luxMax),
      unit: "lux",
    },
    {
      icon: <Thermometer className="h-4 w-4 text-warning" />,
      label: "Day Temperature",
      target: `${profile.tempDayMin} – ${profile.tempDayMax}°C`,
      current: `${temp}°C`,
      st: status(temp, profile.tempDayMin, profile.tempDayMax),
      unit: "°C",
    },
    {
      icon: <Droplets className="h-4 w-4 text-water" />,
      label: "Relative Humidity",
      target: `${profile.humidityMin} – ${profile.humidityMax}%`,
      current: `${humidity}%`,
      st: status(humidity, profile.humidityMin, profile.humidityMax),
      unit: "%",
    },
    {
      icon: <Clock className="h-4 w-4 text-leaf" />,
      label: "Photoperiod Today",
      target: `${profile.photoperiodMin} – ${profile.photoperiodMax}h`,
      current: `${hoursLit.toFixed(1)}h`,
      st: status(hoursLit, profile.photoperiodMin, profile.photoperiodMax),
      unit: "hours",
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 md:col-span-2 lg:col-span-4 border border-border">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 pb-5 border-b border-border/60">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-soft text-leaf border border-leaf/20 shadow-xs">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crop Cycle Manager</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf" />
              <span className="text-xs font-medium text-leaf">{crop} Active</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              {crop} Lifecycle — Stage: <span className="text-leaf">{profile.label} {profile.emoji}</span>
            </h3>
          </div>
        </div>

        {/* Days since planting counter */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-2 self-start sm:self-auto">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <div className="text-left">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Days Since Plant</p>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                type="button"
                onClick={() => onDaysChange(Math.max(0, daysSincePlant - 1))}
                aria-label="Decrease days"
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary transition-colors"
              >
                −
              </button>
              <span className="text-base font-bold text-foreground w-8 text-center tabular-nums">
                {daysSincePlant}
              </span>
              <button
                type="button"
                onClick={() => onDaysChange(daysSincePlant + 1)}
                aria-label="Increase days"
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Timeline Pipeline */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crop Progression Pipeline</span>
          <span className="text-xs text-muted-foreground">
            Stage {STAGE_ORDER.indexOf(stage) + 1} of {STAGE_ORDER.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAGE_ORDER.map((s, index) => {
            const p = GROWTH_STAGES[s];
            const isPast = STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(stage);
            const isActive = s === stage;

            return (
              <div
                key={s}
                className={`group relative overflow-hidden rounded-2xl border transition-all ${
                  isActive
                    ? "border-leaf/60 bg-card shadow-md ring-2 ring-leaf/25"
                    : isPast
                    ? "border-border/80 bg-card hover:border-leaf/40 hover:shadow-xs"
                    : "border-border/60 bg-card/60 opacity-75"
                }`}
              >
                {/* Stage photo header */}
                <div className="relative h-28 w-full overflow-hidden bg-muted">
                  <img
                    src={STAGE_IMAGES[s]}
                    alt={`${p.label} stage`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow-xs ${
                        isActive
                          ? "bg-leaf text-white"
                          : isPast
                          ? "bg-white/95 text-leaf font-extrabold"
                          : "bg-black/50 text-white backdrop-blur-xs"
                      }`}
                    >
                      {isPast ? "✓" : index + 1}
                    </span>
                  </div>

                  <span className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs text-sm">
                    {p.emoji}
                  </span>

                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
                    <span className="text-xs font-bold tracking-tight drop-shadow-xs">{p.label}</span>
                    <span className="text-[10px] font-semibold text-white/90 bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                      DLI {p.targetDLI}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 space-y-1 bg-card">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Duration:</span>
                    <span className="font-semibold text-foreground">{p.durationMin}–{p.durationMax} days</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Target Temp:</span>
                    <span className="font-semibold text-foreground">{p.tempDayMin}–{p.tempDayMax}°C</span>
                  </div>

                  {isActive ? (
                    <div className="mt-2.5 pt-2 border-t border-leaf/20 flex items-center justify-between text-[11px] font-semibold text-leaf">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-leaf animate-pulse" />
                        <span>Day {inStage} active</span>
                      </span>
                      <span className="text-[9px] bg-leaf-soft text-leaf px-2 py-0.5 rounded-full font-bold border border-leaf/20">
                        LIVE
                      </span>
                    </div>
                  ) : isPast ? (
                    <div className="mt-2.5 pt-2 border-t border-border/50 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-leaf" /> Completed
                    </div>
                  ) : (
                    <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                      Upcoming Phase
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground">Current Stage Progress ({profile.label})</span>
            <span className="text-xs font-bold text-leaf">{stagePct}%</span>
          </div>
          <Progress value={stagePct} className="h-2 mb-2 bg-secondary" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Day {inStage} of {stageDuration}</span>
            <span>{daysLeft} days to next phase</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-foreground">Complete Lifecycle to Harvest</span>
            <span className="text-xs font-bold text-foreground">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-2 mb-2 bg-secondary" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Day {daysSincePlant} of {TOTAL_GROW_DAYS}</span>
            <span>{Math.max(0, TOTAL_GROW_DAYS - daysSincePlant)} days remaining</span>
          </div>
        </div>
      </div>

      {/* Target vs Live Sensor Readings */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Stage Targets vs Live Telemetry
          </span>
          <span className="text-xs text-muted-foreground">Based on agronomic profile</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <div
              key={r.label}
              className={`rounded-xl border p-4 transition-all ${
                r.st === "optimal"
                  ? "border-border/70 bg-card hover:border-leaf/30"
                  : r.st === "low"
                  ? "border-water/30 bg-water-soft/10"
                  : "border-warning/30 bg-warning-soft/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {r.icon}
                  {r.label}
                </span>
                <StatusChip s={r.st} />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{r.current}</p>
              <p className="text-xs text-muted-foreground mt-1">Target Range: <span className="font-semibold text-foreground">{r.target}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Agronomic Profile Specs */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-border/60 pt-4 text-xs">
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Night Temp Threshold</span>
          <span className="font-semibold text-foreground mt-0.5 block">{profile.tempNightMin}–{profile.tempNightMax}°C</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Stage Duration</span>
          <span className="font-semibold text-foreground mt-0.5 block">{profile.durationMin}–{profile.durationMax} days</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Target Daily Light</span>
          <span className="font-semibold text-foreground mt-0.5 block">{profile.targetDLI} mol·m⁻²·d⁻¹</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Next Auto-Transition</span>
          <span className="font-semibold text-foreground mt-0.5 block">Day {stageEndDay(stage)}</span>
        </div>
      </div>
    </div>
  );
}
