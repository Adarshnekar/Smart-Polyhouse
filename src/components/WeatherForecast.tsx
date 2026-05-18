import { useMemo, useEffect, useState } from "react";
import {
  Cloud, CloudRain, CloudSun, Sun, Sparkles, Brain,
  Thermometer, Droplets, Umbrella, Wind, CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import WeatherDetailsChart from "./WeatherDetailsChart";

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

type Props = { stage: "Seedling" | "Vegetative" | "Flowering" | "Harvest" };

const DEFAULT_FORECAST: Forecast[] = [
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
    case "destructive": return "border-destructive/20 bg-destructive/5 text-destructive";
    case "warning":     return "border-warning/20 bg-warning/5 text-warning";
    case "water":       return "border-water/20 bg-water/5 text-water";
    case "sun":         return "border-sun/20 bg-sun/5 text-sun";
    default:            return "border-leaf/20 bg-leaf/5 text-leaf";
  }
}

function ConditionIcon({ c, className = "h-6 w-6" }: { c: Forecast["condition"]; className?: string }) {
  if (c === "Sunny") return <Sun className={`${className} text-sun`} />;
  if (c === "Cloudy") return <Cloud className={`${className} text-water`} />;
  if (c === "Rainy") return <CloudRain className={`${className} text-water`} />;
  return <CloudSun className={`${className} text-sun`} />;
}

function buildPredictions(forecast: Forecast[], stage: Props["stage"]) {
  // Normalise Harvest → treat like Vegetative for advisory purposes
  const displayStage = stage === "Harvest" ? "Harvest" : stage;
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
      detail: `UV ${dayAfter.uv} — LEDs auto-OFF 10:00–16:00. Shade cloth recommended for ${displayStage.toLowerCase()} canopy.`,
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
  const [forecast, setForecast] = useState<Forecast[]>(DEFAULT_FORECAST);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`http://api.weatherstack.com/current?access_key=852e0e0f1fc222345539ddcb48c96867&query=Mysore`);
        const data = await res.json();
        if (data && data.current) {
          const c = data.current;
          let condition: Forecast["condition"] = "Sunny";
          const desc = c.weather_descriptions[0]?.toLowerCase() || "";
          if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("shower")) condition = "Rainy";
          else if (desc.includes("cloudy") && desc.includes("partly")) condition = "Partly Cloudy";
          else if (desc.includes("cloud") || desc.includes("overcast")) condition = "Cloudy";

          setForecast((prev) => {
            const next = [...prev];
            next[0] = {
              ...next[0],
              condition,
              cloudCover: c.cloudcover,
              uv: c.uv_index,
              tempMin: c.temperature,
              tempMax: c.temperature,
              rain: c.precip > 0 ? Math.min(100, c.precip * 10) : 0,
              wind: c.wind_speed,
            };
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to fetch live weather", err);
      }
    };
    fetchWeather();
  }, []);

  const predictions = useMemo(() => buildPredictions(forecast, stage), [forecast, stage]);

  return (
    <div className="glass-card rounded-3xl p-6 md:col-span-2 lg:col-span-4">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <CloudSun className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold leading-tight text-foreground">3-Day Smart Forecast</h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">AI-driven predictive greenhouse planning</p>
        </div>
        <Badge className="ml-auto bg-primary text-primary-foreground">
          <Brain className="mr-1 h-3 w-3" /> Predictive AI
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {forecast.map((f, i) => {
          const isPlanning = f.label === "Tomorrow";
          const isLive = f.label === "Today";
          
          const cardContent = (
            <div
              key={f.day}
              className={`relative overflow-hidden rounded-3xl border p-5 transition-all ${
                isPlanning
                  ? "border-primary/30 bg-primary/5 shadow-sm"
                  : "border-border/50 bg-secondary/30 hover:shadow-sm"
              } ${isLive ? "cursor-pointer hover:border-primary/50" : ""}`}
            >
              {isPlanning && (
                <div className="absolute right-3 top-3">
                  <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wider">
                    <CalendarDays className="mr-1 h-3 w-3" /> Planning Day
                  </Badge>
                </div>
              )}
              {isLive && (
                <div className="absolute right-3 top-3">
                  <Badge className="bg-leaf text-primary-foreground text-[10px] uppercase tracking-wider">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-background animate-pulse" /> Live Data
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

          if (isLive) {
            return (
              <Dialog key={f.day}>
                <DialogTrigger asChild>
                  <div role="button" tabIndex={0} className="w-full text-left">
                    {cardContent}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Sun className="h-6 w-6 text-sun" />
                      Detailed Hourly Comparison
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Interactive comparison of hourly weather conditions, simulated solar panel output voltage, and light intensity.
                    </DialogDescription>
                  </DialogHeader>
                  <WeatherDetailsChart currentTemp={f.tempMax} />
                </DialogContent>
              </Dialog>
            );
          }

          return cardContent;
        })}
      </div>

      {/* Predictive AI decisions */}
      <div className="mt-6 rounded-3xl border border-border/60 bg-secondary/40 p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <h4 className="text-lg font-bold text-foreground">Automated Predictive Decisions</h4>
          <Badge variant="outline" className="ml-auto border-primary/20 text-primary bg-primary/5 text-xs">
            {predictions.length} actions queued
          </Badge>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {predictions.map((p, i) => (
            <li key={i} className={`flex items-start gap-4 rounded-2xl border p-4 ${toneClasses(p.tone)}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/60 shadow-sm">
                {p.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-bold text-foreground">{p.title}</p>
                  <span className="text-xs font-semibold text-muted-foreground bg-background/40 px-2 py-0.5 rounded-full">{p.when}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground leading-relaxed">{p.detail}</p>
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
