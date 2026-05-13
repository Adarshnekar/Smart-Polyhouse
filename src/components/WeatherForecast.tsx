import { useMemo } from "react";
import {
  Cloud, CloudRain, CloudSun, Sun, Sparkles, Brain,
  Thermometer, Droplets, Umbrella, Wind, CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type Forecast = {
  day: string;
  label: "Today" | "Tomorrow" | string;
  condition: "Sunny" | "Partly Cloudy" | "Cloudy" | "Rainy";
  cloudCover: number; // %
  uv: number;         // 0-11
  tempMin: number;    // °C
  tempMax: number;    // °C
  rain: number;       // %
  wind: number;       // km/h
};

type Props = { stage: "Seedling" | "Vegetative" | "Flowering" };

const FORECAST: Forecast[] = [
  { day: "Wed", label: "Today",    condition: "Partly Cloudy", cloudCover: 40, uv: 6, tempMin: 21, tempMax: 28, rain: 15, wind: 9 },
  { day: "Thu", label: "Tomorrow", condition: "Cloudy",        cloudCover: 78, uv: 3, tempMin: 19, tempMax: 24, rain: 65, wind: 14 },
  { day: "Fri", label: "Fri",      condition: "Sunny",         cloudCover: 12, uv: 9, tempMin: 22, tempMax: 33, rain: 5,  wind: 7 },
];

function severity(kind: "uv" | "rain" | "cloud" | "heat", v: number) {
  if (kind === "uv")   return v >= 8 ? "destructive" : v >= 6 ? "warning" : v >= 3 ? "leaf" : "water";
  if (kind === "rain") return v >= 60 ? "water" : v >= 30 ? "warning" : "leaf";
  if (kind === "cloud")return v >= 70 ? "water" : v >= 40 ? "warning" : "sun";
  return v >= 32 ? "destructive" : v >= 28 ? "warning" : v >= 18 ? "leaf" : "water";
}

function toneClasses(t: string) {
  switch (t) {
    case "destructive": return "border-destructive/40 bg-destructive/10 text-destructive";
    case "warning":     return "border-warning/40 bg-warning/10 text-warning";
    case "water":       return "border-water/40 bg-water/10 text-water";
    case "sun":         return "border-sun/40 bg-sun/10 text-sun";
    default:            return "border-leaf/40 bg-leaf/10 text-leaf";
  }
}

function ConditionIcon({ c, className = "h-6 w-6" }: { c: Forecast["condition"]; className?: string }) {
  if (c === "Sunny") return <Sun className={`${className} text-sun`} />;
  if (c === "Cloudy") return <Cloud className={`${className} text-water`} />;
  if (c === "Rainy") return <CloudRain className={`${className} text-water`} />;
  return <CloudSun className={`${className} text-sun`} />;
}

function buildPredictions(forecast: Forecast[], stage: Props["stage"]) {
  const out: { icon: React.ReactNode; title: string; detail: string; tone: string; when: string }[] = [];
  const tomorrow = forecast[1];
  const dayAfter = forecast[2];

  if (tomorrow.cloudCover >= 60 || tomorrow.rain >= 50) {
    out.push({
      icon: <Sparkles className="h-4 w-4" />,
      title: "DLI banking activated",
      detail: `Boost LED today by +20% to bank ~3.2 mol·m⁻² before ${tomorrow.label}'s low-light day.`,
      tone: "leaf",
      when: "Tonight 18:00 → 22:00",
    });
  }
  if (tomorrow.rain >= 50) {
    out.push({
      icon: <Umbrella className="h-4 w-4" />,
      title: "Mist system pre-disabled",
      detail: `Rain ${tomorrow.rain}% expected — humidity will rise naturally. Mist cycles paused 06:00–14:00.`,
      tone: "water",
      when: "Tomorrow",
    });
  }
  if (dayAfter.tempMax >= 32) {
    out.push({
      icon: <Thermometer className="h-4 w-4" />,
      title: "Pre-cooling scheduled",
      detail: `Heat spike to ${dayAfter.tempMax}°C on ${dayAfter.day}. Vents open + mist priming starts 05:30.`,
      tone: "warning",
    when: `${dayAfter.day} 05:30`,
    });
  }
  if (dayAfter.uv >= 8) {
    out.push({
      icon: <Sun className="h-4 w-4" />,
      title: "LED standby + shade mode",
      detail: `UV ${dayAfter.uv} — LEDs auto-OFF 10:00–16:00. Shade cloth recommended for ${stage.toLowerCase()} canopy.`,
      tone: "sun",
      when: `${dayAfter.day} mid-day`,
    });
  }
  if (out.length === 0) {
    out.push({
      icon: <Brain className="h-4 w-4" />,
      title: "Conditions stable",
      detail: "No predictive overrides needed for the next 72h. Maintaining baseline schedule.",
      tone: "leaf",
      when: "Next 72h",
    });
  }
  return out;
}

export default function WeatherForecast({ stage }: Props) {
  const predictions = useMemo(() => buildPredictions(FORECAST, stage), [stage]);

  return (
    <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-4">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="grad-water glow-leaf flex h-10 w-10 items-center justify-center rounded-xl">
          <CloudSun className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold leading-tight">3-Day Smart Forecast</h3>
          <p className="text-xs text-muted-foreground">AI-driven predictive greenhouse planning</p>
        </div>
        <Badge className="ml-auto grad-leaf text-primary-foreground">
          <Brain className="mr-1 h-3 w-3" /> Predictive AI
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {FORECAST.map((f, i) => {
          const isPlanning = f.label === "Tomorrow";
          return (
            <div
              key={f.day}
              className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                isPlanning
                  ? "border-leaf/50 bg-leaf/5 ring-1 ring-leaf/30 glow-leaf"
                  : "border-border/40 bg-secondary/30"
              }`}
            >
              {isPlanning && (
                <div className="absolute right-3 top-3">
                  <Badge className="grad-leaf text-primary-foreground text-[10px]">
                    <CalendarDays className="mr-1 h-3 w-3" /> Planning Day
                  </Badge>
                </div>
              )}
              <div className="mb-3 flex items-center gap-3">
                <ConditionIcon c={f.condition} className="h-9 w-9" />
                <div>
                  <p className="text-sm text-muted-foreground">{f.label}</p>
                  <p className="text-base font-semibold">{f.condition}</p>
                </div>
              </div>

              <div className="mb-3 flex items-end gap-2">
                <p className="text-3xl font-bold tracking-tight">{f.tempMax}°</p>
                <p className="pb-1 text-sm text-muted-foreground">/ {f.tempMin}°C</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric icon={<Cloud className="h-3.5 w-3.5" />} label="Cloud" value={`${f.cloudCover}%`} tone={severity("cloud", f.cloudCover)} />
                <Metric icon={<Sun className="h-3.5 w-3.5" />}    label="UV"    value={`${f.uv}`}             tone={severity("uv", f.uv)} />
                <Metric icon={<Droplets className="h-3.5 w-3.5" />} label="Rain" value={`${f.rain}%`}        tone={severity("rain", f.rain)} />
                <Metric icon={<Wind className="h-3.5 w-3.5" />}   label="Wind"  value={`${f.wind} km/h`}    tone="leaf" />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Rain probability</span><span>{f.rain}%</span>
                </div>
                <Progress value={f.rain} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Predictive AI decisions */}
      <div className="mt-6 rounded-2xl border border-leaf/20 bg-secondary/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-leaf" />
          <h4 className="text-sm font-semibold">Automated Predictive Decisions</h4>
          <Badge variant="outline" className="ml-auto border-leaf/40 text-leaf text-[10px]">
            {predictions.length} actions queued
          </Badge>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {predictions.map((p, i) => (
            <li key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${toneClasses(p.tone)}`}>
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/40">
                {p.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  <span className="text-[10px] text-muted-foreground">{p.when}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-2 py-1.5 ${toneClasses(tone)}`}>
      <span className="flex items-center gap-1.5 opacity-90">{icon}{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
