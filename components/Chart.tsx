"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartProps {
  data: any[];
  type: "line" | "bar" | "pie";
  title?: string;
  height?: number;
  colors?: string[];
  dataKeys?: string[];
}

const COLORS = ["#0d1b2a", "#2d6a4f", "#9d4edd", "#ff9500", "#00a8e8"];

export function Chart({
  data,
  type,
  title,
  height = 300,
  colors = COLORS,
  dataKeys = ["total"],
}: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {title && <h3 className="text-lg font-semibold text-navy mb-4">{title}</h3>}
        <div className="flex h-64 items-center justify-center text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      {title && <h3 className="text-lg font-semibold text-navy mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {type === "line" && (
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8ef" />
            <XAxis dataKey="date" stroke="#7a9ab8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#7a9ab8" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8ef",
                borderRadius: "12px",
              }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            {dataKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[idx % colors.length], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        )}
        {type === "bar" && (
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8ef" />
            <XAxis dataKey="date" stroke="#7a9ab8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#7a9ab8" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8ef",
                borderRadius: "12px",
              }}
            />
            <Legend />
            {dataKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[idx % colors.length]}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </BarChart>
        )}
        {type === "pie" && (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKeys[0] || "value"}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" align="center" />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
