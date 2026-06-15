import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const RANGE_OPTIONS = [
  { label: "1 Minute", value: "1m" },
  { label: "1 Hour", value: "1h" },
  { label: "1 Day", value: "1d" },
];

// how often to refetch for each range
const REFRESH_INTERVAL_MS = {
  "1m": 1000, // every 1s
  "1h": 5000, // every 5s
  "1d": 30000, // every 30s
};

const LABEL_PREFIX = {
  "1m": "s",
  "1h": "m",
  "1d": "h",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e2e",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
      }}
    >
      <p
        style={{
          color: "#64748b",
          marginBottom: "6px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </p>
      <p style={{ color: "#7c6af7", fontFamily: "JetBrains Mono, monospace" }}>
        CPU: {payload[0].value?.toFixed(1)}%
      </p>
    </div>
  );
};

const CPUHistoryChart = () => {
  const [range, setRange] = useState("1m");
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async (showLoading) => {
      if (showLoading) setStatus("loading");
      try {
        const res = await fetch(
          `http://localhost:8080/cpu-history?range=${range}`,
        );
        if (!res.ok) throw new Error();
        const raw = await res.json();
        if (cancelled) return;
        const suffix = LABEL_PREFIX[range];
        const chartData = (raw || []).map((val, idx) => ({
          name: `${idx + 1}${suffix}`,
          cpu: val,
        }));
        setData(chartData);
        setStatus("ok");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    fetchHistory(true);
    const intervalMs = REFRESH_INTERVAL_MS[range] || 5000;
    const poller = setInterval(() => fetchHistory(false), intervalMs);

    return () => {
      cancelled = true;
      clearInterval(poller);
    };
  }, [range]);

  return (
    <div
      style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e2e",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          CPU History
        </p>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          style={{
            background: "#1e1e2e",
            color: "#cbd5e1",
            border: "1px solid #2a2a3c",
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "12px",
            fontFamily: "Inter, sans-serif",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ width: "100%", height: "280px" }}>
        {status === "loading" && data.length === 0 && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              fontSize: "13px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Loading...
          </div>
        )}

        {status === "error" && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f43f5e",
              fontSize: "13px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Failed to load history
          </div>
        )}

        {status === "ok" && data.length === 0 && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              fontSize: "13px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            No data yet
          </div>
        )}

        {data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
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
                interval={Math.max(0, Math.floor(data.length / 10) - 1)}
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
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#7c6af7"
                name="CPU %"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CPUHistoryChart;
