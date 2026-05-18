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

export default function WeatherDetailsChart({ currentTemp = 28 }: { currentTemp?: number }) {
  const data = useMemo(() => generateHourlyData(currentTemp), [currentTemp]);

  return (
    <div className="w-full h-full min-h-[400px] mt-6">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
          
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickMargin={10}
            minTickGap={20}
          />
          
          {/* Temperature Axis (Left) */}
          <YAxis 
            yAxisId="temp"
            orientation="left"
            stroke="hsl(var(--destructive))"
            tickFormatter={(val) => `${val}°C`}
            fontSize={12}
            width={45}
          />
          
          {/* Voltage Axis (Right Inner) */}
          <YAxis 
            yAxisId="voltage"
            orientation="right"
            stroke="hsl(var(--sun))"
            tickFormatter={(val) => `${val}V`}
            fontSize={12}
            width={40}
          />
          
          {/* Lux Axis (Right Outer) */}
          <YAxis 
            yAxisId="lux"
            orientation="right"
            stroke="hsl(var(--leaf))"
            tickFormatter={(val) => `${val/1000}k`}
            fontSize={12}
            width={45}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            itemStyle={{ fontSize: '14px', fontWeight: 500 }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />

          {/* Light Intensity (Area Chart to act as a backdrop for voltage) */}
          <Area 
            yAxisId="lux"
            type="monotone" 
            dataKey="lightIntensity" 
            name="Light Intensity (Lux)"
            fill="hsl(var(--leaf)/0.2)" 
            stroke="hsl(var(--leaf))" 
            strokeWidth={2}
          />
          
          {/* Solar Voltage (Area Chart) */}
          <Area 
            yAxisId="voltage"
            type="monotone" 
            dataKey="solarVoltage" 
            name="Solar Voltage (V)"
            fill="hsl(var(--sun)/0.2)" 
            stroke="hsl(var(--sun))" 
            strokeWidth={2}
          />
          
          {/* Temperature (Line Chart) */}
          <Line 
            yAxisId="temp"
            type="monotone" 
            dataKey="temperature" 
            name="Temperature (°C)"
            stroke="hsl(var(--destructive))" 
            strokeWidth={3}
            dot={{ r: 2, fill: "hsl(var(--destructive))" }}
            activeDot={{ r: 6 }}
          />
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
