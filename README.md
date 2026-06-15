# System Monitor Dashboard

A real-time system monitoring tool with a Go backend and a React frontend. The backend polls CPU, memory, and disk metrics every second and exposes them over a REST API. The frontend consumes those metrics through a smooth playback queue and renders live charts and gauges.

---

## Screenshots

**Dashboard — Live Metrics & System Info**
![Dashboard](assets/dashboard.png)

**System Metrics Trend Chart (CPU, Memory, Disk)**
![System Metrics Trend](assets/charts.png)

**CPU History Chart (1 Minute / 1 Hour / 1 Day)**
![CPU History](assets/cpu-history.png)

---

## Features

- **Live metrics** — CPU usage, memory usage, and disk usage updated every second
- **System info** — hostname, OS, platform, and uptime displayed at a glance
- **System Metrics Trend chart** — rolling line chart of CPU, memory, and disk over the last 100 readings
- **CPU History chart** — three selectable time ranges (1 minute, 1 hour, 1 day) with automatic resolution aggregation
- **Playback buffer** — client-side queue smooths out network jitter so the display never stutters
- **Color-coded severity** — metric cards turn amber at ≥ 50 % and red at ≥ 80 %

---

## Tech Stack

| Layer    | Technology                                                                 |
|----------|----------------------------------------------------------------------------|
| Backend  | Go · [Gin](https://github.com/gin-gonic/gin) · [gopsutil v4](https://github.com/shirou/gopsutil) |
| Frontend | React 18 · [Vite](https://vitejs.dev/) · [Recharts](https://recharts.org/) · Axios |

---

## Project Structure

```
.
├── task-manager/          # Go backend
│   ├── main.go            # API server, metric collection, CPU history
│   ├── go.mod
│   └── go.sum
└── frontend/              # React frontend
    ├── src/
    │   ├── app.jsx        # Root component
    │   ├── Dashboard.jsx  # Main dashboard layout and data orchestration
    │   ├── SystemChart.jsx        # Rolling CPU/memory/disk trend chart
    │   └── Cpuhistorychart.jsx    # CPU history chart with range selector
    ├── package.json
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- Go 1.21+
- Node.js 18+

### 1. Start the backend

```bash
cd task-manager
go mod download
go run main.go
```

The API server starts on **http://localhost:8080**.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on **http://localhost:3000** and proxies `/api/*` requests to the backend.

---

## API Reference

All endpoints return JSON and only accept `GET` requests.

### `GET /system-info/static`

Returns static host information. Called once on page load.

**Response**
```json
{
  "hostname": "my-machine",
  "os": "linux",
  "platform": "ubuntu"
}
```

---

### `GET /system-info/dynamic`

Returns a sliding window of the last 18 metric snapshots (one per second).

**Response**
```json
[
  {
    "cpu_usage_percent": 12.5,
    "memory_used_percent": 47.3,
    "disk_used_percent": 61.0,
    "uptime_seconds": 86400,
    "collected_at": 1718435200000
  }
]
```

---

### `GET /cpu-history?range=<1m|1h|1d>`

Returns averaged CPU usage samples for the requested time range.

| Range | Data points | Resolution |
|-------|-------------|------------|
| `1m`  | up to 60    | 1 sample/second |
| `1h`  | up to 60    | 1-minute averages |
| `1d`  | up to 24    | 1-hour averages |

**Response**
```json
[12.5, 14.0, 9.8, ...]
```

---

### `GET /health`

Health check endpoint.

**Response**
```json
{ "status": "ok" }
```

---

## How It Works

### Backend

A goroutine fires every second, collects CPU/memory/disk/uptime via `gopsutil`, and pushes the result into two in-memory structures:

- **`Queue`** — a thread-safe ring buffer capped at 18 entries, served by `/system-info/dynamic`
- **`CPUHistory`** — maintains three rolling slices (`minute`, `hour`, `day`) at decreasing resolution; minute samples roll up into hour averages, which roll up into day averages

### Frontend

The dashboard fetches `/system-info/dynamic` every 8 seconds and merges new records (deduplicated by `collected_at` timestamp) into a client-side queue. A separate 1-second `setInterval` drains one record at a time from the front of that queue, producing smooth 1 Hz display updates independent of network latency. The CPU History chart manages its own polling interval per range: 1 s for the minute view, 5 s for hourly, and 30 s for daily.

---

## Configuration

| Variable | File | Default | Description |
|----------|------|---------|-------------|
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8080` | Backend base URL |
| Backend port | `main.go` | `8080` | Change `r.Run(":8080")` to use a different port |
| CORS origins | `main.go` | `localhost:3000`, `localhost:5173` | Add your production origin here |

---

## Building for Production

### Backend

```bash
cd task-manager
go build -o system-monitor .
./system-monitor
```

### Frontend

```bash
cd frontend
npm run build
# Output is in frontend/dist/
```

Serve `dist/` with any static file server (Nginx, Caddy, etc.) and point it at your running backend.

---

## License

MIT
