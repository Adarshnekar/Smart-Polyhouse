/**
 * Crop Growth Stage Training Data
 * Light intensity values are in LUX (table values × 100).
 * Auto-mode uses these to drive LED and mist decisions per stage.
 */

export type Stage = "Seedling" | "Vegetative" | "Flowering" | "Harvest";

export interface StageProfile {
  label: string;
  emoji: string;
  photoperiodMin: number;  // hours/day
  photoperiodMax: number;
  tempDayMin: number;      // °C
  tempDayMax: number;
  tempNightMin: number;    // °C
  tempNightMax: number;
  humidityMin: number;     // %
  humidityMax: number;
  luxMin: number;          // lux (table value × 100)
  luxMax: number;
  targetDLI: number;       // mol·m⁻²·d⁻¹ (derived)
  durationMin: number;     // days
  durationMax: number;
  accentColor: string;     // CSS class token
}

export const GROWTH_STAGES: Record<Stage, StageProfile> = {
  Seedling: {
    label: "Seedling",
    emoji: "🌱",
    photoperiodMin: 16, photoperiodMax: 18,
    tempDayMin: 24,    tempDayMax: 28,
    tempNightMin: 19,  tempNightMax: 22,
    humidityMin: 65,   humidityMax: 75,
    luxMin: 10000,     luxMax: 20000,
    targetDLI: 6,
    durationMin: 21,   durationMax: 35,
    accentColor: "leaf",
  },
  Vegetative: {
    label: "Vegetative",
    emoji: "🌿",
    photoperiodMin: 14, photoperiodMax: 16,
    tempDayMin: 22,    tempDayMax: 30,
    tempNightMin: 19,  tempNightMax: 22,
    humidityMin: 55,   humidityMax: 65,
    luxMin: 20000,     luxMax: 40000,
    targetDLI: 12,
    durationMin: 21,   durationMax: 35,
    accentColor: "sun",
  },
  Flowering: {
    label: "Flowering",
    emoji: "🌸",
    photoperiodMin: 12, photoperiodMax: 14,
    tempDayMin: 20,    tempDayMax: 27,
    tempNightMin: 16,  tempNightMax: 20,
    humidityMin: 50,   humidityMax: 60,
    luxMin: 30000,     luxMax: 50000,
    targetDLI: 14,
    durationMin: 14,   durationMax: 21,
    accentColor: "warning",
  },
  Harvest: {
    label: "Harvesting",
    emoji: "🍅",
    photoperiodMin: 12, photoperiodMax: 14,
    tempDayMin: 22,    tempDayMax: 28,
    tempNightMin: 16,  tempNightMax: 20,
    humidityMin: 45,   humidityMax: 55,
    luxMin: 40000,     luxMax: 60000,
    targetDLI: 16,
    durationMin: 42,   durationMax: 70,
    accentColor: "water",
  },
};

export const STAGE_ORDER: Stage[] = ["Seedling", "Vegetative", "Flowering", "Harvest"];

/** Cumulative day thresholds for each stage using durationMax */
const STAGE_THRESHOLDS: Record<Stage, [number, number]> = (() => {
  let accum = 0;
  const result = {} as Record<Stage, [number, number]>;
  for (const s of STAGE_ORDER) {
    const start = accum;
    accum += GROWTH_STAGES[s].durationMax;
    result[s] = [start, accum];
  }
  return result;
})();

/** Derive current stage from total days since planting */
export function stageFromDays(totalDays: number): Stage {
  for (const s of STAGE_ORDER) {
    if (totalDays <= STAGE_THRESHOLDS[s][1]) return s;
  }
  return "Harvest";
}

/** Days elapsed within the current stage */
export function daysInStage(totalDays: number): number {
  const s = stageFromDays(totalDays);
  return totalDays - STAGE_THRESHOLDS[s][0];
}

/** Total days at which a stage ends */
export function stageEndDay(stage: Stage): number {
  return STAGE_THRESHOLDS[stage][1];
}

/** Total days (since planting) when project is fully done */
export const TOTAL_GROW_DAYS = STAGE_THRESHOLDS["Harvest"][1]; // 161 days
