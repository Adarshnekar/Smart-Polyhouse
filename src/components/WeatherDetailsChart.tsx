import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Simulated hourly data
const generateHourlyData = (baseTemp: number) => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    // Temperature curve: coldest around 4 AM, hottest around 3 PM
    const tempOffset = Math.sin((i - 9) * Math.PI / 12) * 8;
    const temp = Math.round((baseTemp + tempOffset) * 10) / 10;
    
    // Solar voltage curve: peaks at noon, zero at night
    let solarVoltage = 0;
    if (i >= 6 && i <= 18) {
      solarVoltage = Math.round(Math.max(0, Math.sin((i - 6) * Math.PI / 12) * 18 * 10)) / 10;
    }
    
    // Light intensity (Lux): similar curve to solar but with some noise (clouds)
    let lux = 0;
    if (i >= 6 && i <= 18) {
      const noise = 0.8 + Math.random() * 0.4; // +/- 20% noise
      lux = Math.round(Math.max(0, Math.sin((i - 6) * Math.PI / 12) * 80000 * noise));
    }

    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      temperature: temp,
      solarVoltage: solarVoltage,
      lightIntensity: lux,
    });
  }
  return data;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomChartTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[#E8E4D5] bg-[#FFFFFF] p-3.5 shadow-md backdrop-blur-md">
        <p className="mb-2 text-xs font-bold text-[#17221B]">Time: {label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-[#17221B]">
                {entry.name.includes("Temperature")
                  ? `${entry.value}°C`
                  : entry.name.includes("Voltage")
                  ? `${entry.value} V`
                  : `${(entry.value / 1000).toFixed(1)}k lux`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function WeatherDetailsChart({ currentTemp = 28 }: { currentTemp?: number }) {
  const data = useMemo(() => generateHourlyData(currentTemp), [currentTemp]);

  return (
    <div className="w-full h-full min-h-[380px] mt-4 p-2 rounded-2xl bg-[#FCFCF8] border border-[#E8E4D5]">
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            bottom: 10,
            left: 10,
          }}
        >
          <defs>
            <linearGradient id="luxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2F6B4F" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2F6B4F" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="voltGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D97706" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D5" vertical={false} />
          
          <XAxis 
            dataKey="time" 
            stroke="#66756A"
            fontSize={11}
            tickMargin={10}
            minTickGap={25}
          />
          
          {/* Temperature Axis (Left) - warm orange */}
          <YAxis 
            yAxisId="temp"
            orientation="left"
            stroke="#E6672E"
            tickFormatter={(val) => `${val}°C`}
            fontSize={11}
            width={45}
            tickLine={false}
          />
          
          {/* Voltage Axis (Right Inner) - solar amber */}
          <YAxis 
            yAxisId="voltage"
            orientation="right"
            stroke="#D97706"
            tickFormatter={(val) => `${val}V`}
            fontSize={11}
            width={40}
            tickLine={false}
          />
          
          {/* Lux Axis (Right Outer) - natural emerald */}
          <YAxis 
            yAxisId="lux"
            orientation="right"
            stroke="#2F6B4F"
            tickFormatter={(val) => `${val/1000}k`}
            fontSize={11}
            width={45}
            tickLine={false}
          />

          <Tooltip content={<CustomChartTooltip />} />
          
          <Legend 
            wrapperStyle={{ paddingTop: '15px' }}
            iconType="circle"
          />

          {/* Light Intensity (Area Chart to act as backdrop) */}
          <Area 
            yAxisId="lux"
            type="monotone" 
            dataKey="lightIntensity" 
            name="Light Intensity (Lux)"
            fill="url(#luxGradient)" 
            stroke="#2F6B4F" 
            strokeWidth={2}
          />
          
          {/* Solar Voltage (Area Chart) */}
          <Area 
            yAxisId="voltage"
            type="monotone" 
            dataKey="solarVoltage" 
            name="Solar Voltage (V)"
            fill="url(#voltGradient)" 
            stroke="#D97706" 
            strokeWidth={2}
          />
          
          {/* Temperature (Line Chart) - warm orange */}
          <Line 
            yAxisId="temp"
            type="monotone" 
            dataKey="temperature" 
            name="Temperature (°C)"
            stroke="#E6672E" 
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: "#FCFCF8", strokeWidth: 2 }}
          />
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
