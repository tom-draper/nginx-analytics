package system

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
)

// Background CPU usage sampler — avoids the 1-second blocking call on the hot path.
var (
	cpuUsageMu sync.RWMutex
	cpuSampled []float64
)

// StartSampler starts a background goroutine that samples per-core CPU usage at
// the given interval. Call once at startup before serving requests.
func StartSampler(interval time.Duration) {
	go func() {
		for {
			usage, err := cpu.Percent(interval, true)
			if err == nil {
				cpuUsageMu.Lock()
				cpuSampled = usage
				cpuUsageMu.Unlock()
			}
		}
	}()
}

func getCachedCPUUsage() []float64 {
	cpuUsageMu.RLock()
	defer cpuUsageMu.RUnlock()
	cp := make([]float64, len(cpuSampled))
	copy(cp, cpuSampled)
	return cp
}

// Static CPU info (model, cores, speed) never changes — fetch once.
var (
	cpuInfoOnce  sync.Once
	cpuInfoCache []cpu.InfoStat
	cpuInfoErr   error
)

func getCPUInfoCached() ([]cpu.InfoStat, error) {
	cpuInfoOnce.Do(func() {
		cpuInfoCache, cpuInfoErr = cpu.Info()
	})
	return cpuInfoCache, cpuInfoErr
}

type SystemInfo struct {
	Uptime    int64      `json:"uptime"`
	Timestamp string     `json:"timestamp"`
	CPU       CPUInfo    `json:"cpu"`
	Memory    MemoryInfo `json:"memory"`
	Disk      []DiskInfo `json:"disk"`
}

type CPUInfo struct {
	Model     string    `json:"model"`
	Cores     int       `json:"cores"`
	Speed     float64   `json:"speed"`
	Usage     float64   `json:"usage"`
	CoreUsage []float64 `json:"coreUsage"`
}

type MemoryInfo struct {
	Free      uint64 `json:"free"`
	Available uint64 `json:"available"`
	Used      uint64 `json:"used"`
	Total     uint64 `json:"total"`
}

type DiskInfo struct {
	Filesystem string `json:"filesystem"`
	Size       uint64 `json:"size"`
	Used       uint64 `json:"used"`
	MountedOn  string `json:"mountedOn"`
}

func MeasureSystem() (SystemInfo, error) {
	var (
		uptimeVal int64
		cpuInfo   CPUInfo
		memInfo   MemoryInfo
		diskInfo  []DiskInfo
		errs      [4]error
		wg        sync.WaitGroup
	)

	wg.Add(4)
	go func() { defer wg.Done(); uptimeVal, errs[0] = getUptime() }()
	go func() { defer wg.Done(); cpuInfo, errs[1] = getCPUInfo() }()
	go func() { defer wg.Done(); memInfo, errs[2] = getMemoryInfo() }()
	go func() { defer wg.Done(); diskInfo, errs[3] = getDiskInfo() }()
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			return SystemInfo{}, err
		}
	}

	return SystemInfo{
		Uptime:    uptimeVal,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		CPU:       cpuInfo,
		Memory:    memInfo,
		Disk:      diskInfo,
	}, nil
}

func getUptime() (int64, error) {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("systeminfo")
		output, err := cmd.Output()
		if err != nil {
			return 0, err
		}
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, "System Boot Time") {
				bootTimeStr := strings.TrimSpace(strings.SplitN(line, ":", 2)[1])
				bootTime, err := time.Parse("1/2/2006, 3:04:05 PM", bootTimeStr)
				if err != nil {
					return 0, err
				}
				return int64(time.Since(bootTime).Seconds()), nil
			}
		}
		return 0, fmt.Errorf("could not determine system uptime")

	case "darwin":
		cmd := exec.Command("sysctl", "-n", "kern.boottime")
		output, err := cmd.Output()
		if err != nil {
			return 0, err
		}

		parts := strings.Split(string(output), "sec = ")
		if len(parts) < 2 {
			return 0, fmt.Errorf("unexpected sysctl output format: %s", string(output))
		}

		bootTimeParts := strings.Split(parts[1], ",")
		bootTimeStr := strings.TrimSpace(bootTimeParts[0])
		bootTime, err := strconv.ParseInt(bootTimeStr, 10, 64)
		if err != nil {
			return 0, err
		}

		currentTime := time.Now().Unix()
		return currentTime - bootTime, nil

	default:
		output, err := os.ReadFile("/proc/uptime")
		if err != nil {
			return 0, err
		}

		uptimeStr := strings.Split(string(output), " ")[0]
		uptimeFloat, err := strconv.ParseFloat(uptimeStr, 64)
		if err != nil {
			return 0, err
		}

		return int64(uptimeFloat), nil
	}
}

func getCPUInfo() (CPUInfo, error) {
	cpuInfo, err := getCPUInfoCached()
	if err != nil {
		logger.Log.Printf("gopsutil cpu.Info() failed: %v, trying OS-specific fallback", err)
		return getCPUInfoFallback()
	}
	if len(cpuInfo) == 0 {
		logger.Log.Printf("gopsutil returned empty CPU info, trying OS-specific fallback")
		return getCPUInfoFallback()
	}

	cpuUsage := getCachedCPUUsage()
	cores := len(cpuUsage)
	if cores == 0 {
		cores = len(cpuInfo)
	}

	var overallUsage float64
	for _, u := range cpuUsage {
		overallUsage += u
	}
	if len(cpuUsage) > 0 {
		overallUsage /= float64(len(cpuUsage))
	}

	return CPUInfo{
		Model:     cpuInfo[0].ModelName,
		Cores:     cores,
		Speed:     cpuInfo[0].Mhz,
		Usage:     parseFloat(overallUsage, 1),
		CoreUsage: cpuUsage,
	}, nil
}

func getCPUInfoFallback() (CPUInfo, error) {
	switch runtime.GOOS {
	case "darwin":
		return getCPUInfoMacOS()
	case "windows":
		return getCPUInfoWindows()
	default:
		return getCPUInfoLinux()
	}
}

func getCPUInfoMacOS() (CPUInfo, error) {
	var info CPUInfo

	// Get CPU model
	cmd := exec.Command("sysctl", "-n", "machdep.cpu.brand_string")
	output, err := cmd.Output()
	if err == nil {
		info.Model = strings.TrimSpace(string(output))
	} else {
		info.Model = "Unknown"
	}

	// Get CPU core count
	cmd = exec.Command("sysctl", "-n", "hw.ncpu")
	output, err = cmd.Output()
	if err == nil {
		if cores, err := strconv.Atoi(strings.TrimSpace(string(output))); err == nil {
			info.Cores = cores
		}
	} else {
		info.Cores = runtime.NumCPU() // Fallback to runtime value
	}

	// Get CPU frequency (try multiple sysctl keys)
	freqKeys := []string{"hw.cpufrequency_max", "hw.cpufrequency", "machdep.cpu.max_basic"}
	for _, key := range freqKeys {
		cmd = exec.Command("sysctl", "-n", key)
		output, err = cmd.Output()
		if err == nil {
			if freq, err := strconv.ParseFloat(strings.TrimSpace(string(output)), 64); err == nil {
				if freq > 1000000 { // If in Hz, convert to MHz
					info.Speed = freq / 1000000
				} else {
					info.Speed = freq
				}
				break
			}
		}
	}

	cpuUsage := getCachedCPUUsage()
	if len(cpuUsage) > 0 {
		var total float64
		for _, u := range cpuUsage {
			total += u
		}
		info.Usage = parseFloat(total/float64(len(cpuUsage)), 1)
	}

	return info, nil
}

func getCPUInfoWindows() (CPUInfo, error) {
	var info CPUInfo

	// Get CPU info using wmic
	cmd := exec.Command("wmic", "cpu", "get", "Name,NumberOfCores,MaxClockSpeed", "/format:csv")
	output, err := cmd.Output()
	if err != nil {
		return info, err
	}

	lines := strings.SplitSeq(string(output), "\n")
	for line := range lines {
		if strings.Contains(line, ",") && !strings.Contains(line, "Node") {
			parts := strings.Split(line, ",")
			if len(parts) >= 4 {
				info.Model = strings.TrimSpace(parts[2])
				if cores, err := strconv.Atoi(strings.TrimSpace(parts[3])); err == nil {
					info.Cores = cores
				}
				if speed, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64); err == nil {
					info.Speed = speed
				}
				break
			}
		}
	}

	cpuUsage := getCachedCPUUsage()
	if len(cpuUsage) > 0 {
		var total float64
		for _, u := range cpuUsage {
			total += u
		}
		info.Usage = parseFloat(total/float64(len(cpuUsage)), 1)
	}

	return info, nil
}

func getCPUInfoLinux() (CPUInfo, error) {
	var info CPUInfo

	output, err := os.ReadFile("/proc/cpuinfo")
	if err != nil {
		return info, err
	}

	coreCount := 0
	for _, line := range strings.Split(string(output), "\n") {
		if strings.HasPrefix(line, "model name") {
			if parts := strings.SplitN(line, ":", 2); len(parts) == 2 {
				info.Model = strings.TrimSpace(parts[1])
			}
		} else if strings.HasPrefix(line, "cpu MHz") {
			if parts := strings.SplitN(line, ":", 2); len(parts) == 2 {
				if speed, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64); err == nil {
					info.Speed = speed
				}
			}
		} else if strings.HasPrefix(line, "processor") {
			coreCount++
		}
	}
	info.Cores = coreCount

	cpuUsage := getCachedCPUUsage()
	if len(cpuUsage) > 0 {
		var total float64
		for _, u := range cpuUsage {
			total += u
		}
		info.Usage = parseFloat(total/float64(len(cpuUsage)), 1)
	}

	return info, nil
}

func getMemoryInfo() (MemoryInfo, error) {
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return MemoryInfo{}, err
	}

	return MemoryInfo{
		Free:      vmStat.Free,
		Available: vmStat.Available,
		Used:      vmStat.Used,
		Total:     vmStat.Total,
	}, nil
}

func getDiskInfo() ([]DiskInfo, error) {
	var disks []DiskInfo

	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil, err
	}

	for _, partition := range partitions {
		usage, err := disk.Usage(partition.Mountpoint)
		if err != nil {
			logger.Log.Printf("Error getting disk usage for %s: %v", partition.Mountpoint, err)
			continue // Skip this partition if there's an error
		}

		disks = append(disks, DiskInfo{
			Filesystem: partition.Device,
			Size:       usage.Total,
			Used:       usage.Used,
			MountedOn:  partition.Mountpoint,
		})
	}

	return disks, nil
}

func parseFloat(val float64, precision int) float64 {
	format := fmt.Sprintf("%%.%df", precision)
	formatted := fmt.Sprintf(format, val)
	result, _ := strconv.ParseFloat(formatted, 64)
	return result
}
