import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e2e",
        borderRadius: "8px",
        padding: "12px 16px",
        fontSize: "13px",
      }}
    >
      <p
        style={{
          color: "#64748b",
          marginBottom: "8px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          style={{
            color: entry.color,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {entry.name}: {entry.value?.toFixed(1)}%
        </p>
      ))}
    </div>
  );
};

const SystemChart = ({ records }) => {
  const chartData = records.map((record, index) => ({
    name: `T${index + 1}`,
    cpu: record?.cpu_usage_percent || 0,
    memory: record?.memory_used_percent || 0,
    disk: record?.disk_used_percent || 0,
  }));

  return (
    <div
      style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e2e",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          marginBottom: "20px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        System Metrics Trend
      </p>
      <div style={{ width: "100%", height: "280px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis
              dataKey="name"
              tick={{
                fill: "#475569",
                fontSize: 11,
                fontFamily: "JetBrains Mono",
              }}
              axisLine={{ stroke: "#1e1e2e" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{
                fill: "#475569",
                fontSize: 11,
                fontFamily: "JetBrains Mono",
              }}
              axisLine={{ stroke: "#1e1e2e" }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontSize: "12px",
                fontFamily: "Inter, sans-serif",
                color: "#64748b",
              }}
            />
            <Line
              type="monotone"
              dataKey="cpu"
              stroke="#7c6af7"
              name="CPU %"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="memory"
              stroke="#4ade80"
              name="Memory %"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="disk"
              stroke="#f59e0b"
              name="Disk %"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SystemChart;
