import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Custom Tooltip
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-yellow-500/30 rounded-lg px-4 py-2 text-sm">
        <p className="text-gray-400 mb-1">{label}</p>
        <p className="text-yellow-400 font-bold">
          {Number(payload[0].value).toLocaleString()} CRP
        </p>
      </div>
    );
  }
  return null;
}

export default function TVLChart({ data = [] }) {

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        📊 TVL data available nahi hai
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">

      <h3 className="text-white font-semibold mb-4">
        📈 TVL History
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="tvl"
            stroke="#facc15"
            strokeWidth={3}
            dot={{ fill: "#facc15", r: 4 }}
            activeDot={{ r: 6, fill: "#fbbf24" }}
          />

        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}