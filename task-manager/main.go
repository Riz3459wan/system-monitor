package main

import (
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

const queueMax = 18

type StaticInfo struct {
	Hostname string `json:"hostname"`
	OS       string `json:"os"`
	Platform string `json:"platform"`
}

type DynamicInfo struct {
	CPUUsagePercent   float64 `json:"cpu_usage_percent"`
	MemoryUsedPercent float64 `json:"memory_used_percent"`
	DiskUsedPercent   float64 `json:"disk_used_percent"`
	UptimeSeconds     uint64  `json:"uptime_seconds"`
	CollectedAt       int64   `json:"collected_at"`
}

type Queue struct {
	mu   sync.RWMutex
	data []DynamicInfo
}

func (q *Queue) Push(info DynamicInfo) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.data = append(q.data, info)
	if len(q.data) > queueMax {
		q.data = q.data[len(q.data)-queueMax:]
	}
}

func (q *Queue) GetAll() []DynamicInfo {
	q.mu.RLock()
	defer q.mu.RUnlock()
	result := make([]DynamicInfo, len(q.data))
	copy(result, q.data)
	return result
}

func getStaticInfo() (StaticInfo, error) {
	hostStat, err := host.Info()
	if err != nil {
		return StaticInfo{}, err
	}
	return StaticInfo{
		Hostname: hostStat.Hostname,
		OS:       hostStat.OS,
		Platform: hostStat.Platform,
	}, nil
}

func collectDynamic() (DynamicInfo, error) {
	cpuPercents, err := cpu.Percent(0, false)
	if err != nil {
		return DynamicInfo{}, err
	}

	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return DynamicInfo{}, err
	}

	diskStat, err := disk.Usage("/")
	if err != nil {
		return DynamicInfo{}, err
	}

	hostStat, err := host.Info()
	if err != nil {
		return DynamicInfo{}, err
	}

	cpuVal := 0.0
	if len(cpuPercents) > 0 {
		cpuVal = cpuPercents[0]
	}

	return DynamicInfo{
		CPUUsagePercent:   cpuVal,
		MemoryUsedPercent: vmStat.UsedPercent,
		DiskUsedPercent:   diskStat.UsedPercent,
		UptimeSeconds:     hostStat.Uptime,
		CollectedAt:       time.Now().UnixMilli(),
	}, nil
}

// CPUHistory keeps three resolutions:
// minute -> last 60 raw 1s samples (1 minute)
// hour   -> last 60 per-minute averages (1 hour)
// day    -> last 24 per-hour averages (1 day)
type CPUHistory struct {
	mu sync.RWMutex

	minute []float64
	hour   []float64
	day    []float64

	secCount int
	minCount int
}

func average(vals []float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range vals {
		sum += v
	}
	return sum / float64(len(vals))
}

func (h *CPUHistory) Add(cpuVal float64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.minute = append(h.minute, cpuVal)
	if len(h.minute) > 60 {
		h.minute = h.minute[len(h.minute)-60:]
	}

	h.secCount++
	if h.secCount >= 60 { // 60 -> 6
		h.secCount = 0

		minuteAvg := average(h.minute)
		h.hour = append(h.hour, minuteAvg)
		if len(h.hour) > 60 {
			h.hour = h.hour[len(h.hour)-60:]
		}

		h.minCount++
		if h.minCount >= 60 { // 60 -> 6
			h.minCount = 0

			hourAvg := average(h.hour)
			h.day = append(h.day, hourAvg)
			if len(h.day) > 24 {
				h.day = h.day[len(h.day)-24:]
			}
		}
	}
}

func (h *CPUHistory) GetHistory(rangeType string) []float64 {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var src []float64
	switch rangeType {
	case "1h":
		src = h.hour
	case "1d":
		src = h.day
	default: // "1m"
		src = h.minute
	}

	result := make([]float64, len(src))
	copy(result, src)
	return result
}

func main() {
	q := &Queue{}
	history := &CPUHistory{}

	cpu.Percent(0, false) // first reading to initialize

	go func() {
		// ticker := time.NewTicker(100 * time.Millisecond)
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			info, err := collectDynamic()
			if err == nil {
				q.Push(info)
				history.Add(info.CPUUsagePercent)
			}
		}
	}()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET"},
		AllowHeaders:     []string{"Content-Type"},
		AllowCredentials: false,
	}))

	r.GET("/system-info/static", func(c *gin.Context) {
		info, err := getStaticInfo()
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to fetch static info"})
			return
		}
		c.JSON(200, info)
	})

	r.GET("/system-info/dynamic", func(c *gin.Context) {
		data := q.GetAll()
		if len(data) == 0 {
			c.JSON(200, []DynamicInfo{})
			return
		}
		c.JSON(200, data)
	})

	r.GET("/cpu-history", func(c *gin.Context) {
		rangeType := c.DefaultQuery("range", "1m") // "1m", "1h", "1d"
		c.JSON(200, history.GetHistory(rangeType))
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	r.Run(":8080")
}
