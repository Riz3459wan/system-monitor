import { useEffect, useRef, useState } from "react";
import SystemChart from "./SystemChart";
import CPUHistoryChart from "./CPUHistoryChart";
import "./dashboard.css";

const QUEUE_MAX = 18;
const FETCH_INTERVAL_MS = 8000;
const DISPLAY_INTERVAL_MS = 1000;
const MIN_BUFFER = 3;

function Dashboard() {
  const queueRef = useRef([]);
  const intervalRef = useRef(null);
  const seenTimestamps = useRef(new Set());

  const [staticInfo, setStaticInfo] = useState(null);
  const [displayData, setDisplayData] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [bufferSize, setBufferSize] = useState(0);
  const [status, setStatus] = useState("loading");

  const fetchStatic = async () => {
    try {
      const res = await fetch("http://localhost:8080/system-info/static");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStaticInfo(data);
    } catch {
      setStaticInfo(null);
    }
  };

  const appendToQueue = (incoming) => {
    const newRecords = incoming.filter(
      (r) => !seenTimestamps.current.has(r.collected_at),
    );
    newRecords.forEach((r) => seenTimestamps.current.add(r.collected_at));
    if (newRecords.length === 0) return;
    queueRef.current = [...queueRef.current, ...newRecords].slice(-QUEUE_MAX);
    setBufferSize(queueRef.current.length);
  };

  const startDisplay = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (queueRef.current.length === 0) return;
      const [head, ...rest] = queueRef.current;
      queueRef.current = rest;
      setBufferSize(rest.length);
      setDisplayData(head);
      setChartHistory((prev) => [...prev, head].slice(-100));
    }, DISPLAY_INTERVAL_MS);
  };

  const fetchDynamic = async () => {
    try {
      const res = await fetch("http://localhost:8080/system-info/dynamic");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      appendToQueue(data);
      setStatus("live");
      if (queueRef.current.length >= MIN_BUFFER) startDisplay();
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchStatic();
    fetchDynamic();
    const apiInterval = setInterval(fetchDynamic, FETCH_INTERVAL_MS);
    return () => {
      clearInterval(apiInterval);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const getUsageClass = (val) => {
    if (val == null) return "";
    if (val >= 80) return "critical";
    if (val >= 50) return "warning";
    return "normal";
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <span className="header-icon">⬡</span>
          <div>
            <h1 className="header-title">CPU Manager</h1>
            <p className="header-subtitle">System Monitor Dashboard</p>
          </div>
        </div>
        <div className={`status-badge ${status}`}>
          <span className="status-dot" />
          {status === "live" && "Live"}
          {status === "loading" && "Connecting..."}
          {status === "error" && "Disconnected"}
        </div>
      </header>

      <div className="metrics-grid">
        {[
          {
            label: "CPU Usage",
            value: displayData?.cpu_usage_percent,
            icon: "◈",
          },
          {
            label: "Memory Usage",
            value: displayData?.memory_used_percent,
            icon: "▦",
          },
          {
            label: "Disk Usage",
            value: displayData?.disk_used_percent,
            icon: "◫",
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className={`metric-card ${getUsageClass(value)}`}>
            <div className="metric-top">
              <span className="metric-icon">{icon}</span>
              <span className="metric-label">{label}</span>
            </div>
            <div className="metric-value">
              {value != null ? value.toFixed(1) : "—"}
              <span className="metric-unit">%</span>
            </div>
            <div className="metric-bar-track">
              <div
                className="metric-bar-fill"
                style={{ width: `${value ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="info-grid">
        {[
          { label: "Hostname", value: staticInfo?.hostname },
          { label: "Operating System", value: staticInfo?.os },
          { label: "Platform", value: staticInfo?.platform },
          { label: "Uptime", value: formatUptime(displayData?.uptime_seconds) },
        ].map(({ label, value }) => (
          <div key={label} className="info-card">
            <span className="info-label">{label}</span>
            <span className="info-value">{value ?? "—"}</span>
          </div>
        ))}
      </div>

      <div className="queue-indicator">
        <span className="queue-label">Buffer</span>
        <div className="queue-bar-track">
          <div
            className="queue-bar-fill"
            style={{ width: `${(bufferSize / QUEUE_MAX) * 100}%` }}
          />
        </div>
        <span className="queue-count">
          {bufferSize}/{QUEUE_MAX}
        </span>
      </div>

      {chartHistory.length > 0 && <SystemChart records={chartHistory} />}

      <CPUHistoryChart />
    </div>
  );
}

export default Dashboard;
