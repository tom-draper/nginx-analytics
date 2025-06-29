package system

import (
	"fmt"
	"log"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemInfo struct {
	Uptime    int64      `json:"uptime"`
	Timestamp string     `json:"timestamp"`
	CPU       CPUInfo    `json:"cpu"`
	Memory    MemoryInfo `json:"memory"`
	Disk      []DiskInfo `json:"disk"`
}

type CPUInfo struct {
	Model string  `json:"model"`
	Cores int     `json:"cores"`
	Speed float64 `json:"speed"`
	Usage float64 `json:"usage"`
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
	uptime, err := getUptime()
	if err != nil {
		return SystemInfo{}, err
	}

	cpuInfo, err := getCPUInfo()
	if err != nil {
		return SystemInfo{}, err
	}

	memoryInfo, err := getMemoryInfo()
	if err != nil {
		return SystemInfo{}, err
	}

	diskInfo, err := getDiskInfo()
	if err != nil {
		return SystemInfo{}, err
	}

	return SystemInfo{
		Uptime:    uptime,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		CPU:       cpuInfo,
		Memory:    memoryInfo,
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
				bootTimeStr := strings.TrimSpace(strings.Split(line, ":")[1])
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
		cmd := exec.Command("cat", "/proc/uptime")
		output, err := cmd.Output()
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
	// Try gopsutil first
	cpuInfo, err := cpu.Info()
	if err != nil {
		log.Printf("gopsutil cpu.Info() failed: %v, trying OS-specific fallback", err)
		return getCPUInfoFallback()
	}

	if len(cpuInfo) == 0 {
		log.Printf("gopsutil returned empty CPU info, trying OS-specific fallback")
		return getCPUInfoFallback()
	}

	// Get CPU usage
	cpuUsage, err := cpu.Percent(time.Second, false)
	if err != nil {
		log.Printf("Warning: Could not get CPU usage: %v", err)
		cpuUsage = []float64{0.0} // Default to 0 if can't read
	}

	model := cpuInfo[0].ModelName
	cores := len(cpuInfo)
	speed := cpuInfo[0].Mhz

	var usage float64
	if len(cpuUsage) > 0 {
		usage = cpuUsage[0]
	}

	return CPUInfo{
		Model: model,
		Cores: cores,
		Speed: speed,
		Usage: parseFloat(usage, 1),
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

	// For CPU usage, still try gopsutil
	cpuUsage, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuUsage) > 0 {
		info.Usage = parseFloat(cpuUsage[0], 1)
	} else {
		info.Usage = 0.0
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

	// Try to get CPU usage
	cpuUsage, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuUsage) > 0 {
		info.Usage = parseFloat(cpuUsage[0], 1)
	}

	return info, nil
}

func getCPUInfoLinux() (CPUInfo, error) {
	var info CPUInfo

	// Read /proc/cpuinfo
	cmd := exec.Command("cat", "/proc/cpuinfo")
	output, err := cmd.Output()
	if err != nil {
		return info, err
	}

	lines := strings.Split(string(output), "\n")
	coreCount := 0
	for _, line := range lines {
		if strings.HasPrefix(line, "model name") {
			parts := strings.Split(line, ":")
			if len(parts) >= 2 {
				info.Model = strings.TrimSpace(parts[1])
			}
		} else if strings.HasPrefix(line, "cpu MHz") {
			parts := strings.Split(line, ":")
			if len(parts) >= 2 {
				if speed, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64); err == nil {
					info.Speed = speed
				}
			}
		} else if strings.HasPrefix(line, "processor") {
			coreCount++
		}
	}
	info.Cores = coreCount

	// Try to get CPU usage
	cpuUsage, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuUsage) > 0 {
		info.Usage = parseFloat(cpuUsage[0], 1)
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
			log.Printf("Error getting disk usage for %s: %v", partition.Mountpoint, err)
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