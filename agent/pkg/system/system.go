package system

import (
	"fmt"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/disk"
	"github.com/shirou/gopsutil/mem"
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
	if runtime.GOOS == "windows" {
		// For Windows, parse the output of systeminfo command
		cmd := exec.Command("systeminfo")
		output, err := cmd.Output()
		if err != nil {
			return 0, err
		}

		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, "System Boot Time") {
				// Extract boot time and calculate uptime
				bootTimeStr := strings.TrimSpace(strings.Split(line, ":")[1])
				bootTime, err := time.Parse("1/2/2006, 3:04:05 PM", bootTimeStr)
				if err != nil {
					return 0, err
				}
				return int64(time.Since(bootTime).Seconds()), nil
			}
		}
		return 0, fmt.Errorf("could not determine system uptime")
	}

	// For Linux and macOS
	cmd := exec.Command("cat", "/proc/uptime")
	output, err := cmd.Output()
	if err != nil {
		// Fallback for macOS
		if runtime.GOOS == "darwin" {
			cmd := exec.Command("sysctl", "-n", "kern.boottime")
			output, err := cmd.Output()
			if err != nil {
				return 0, err
			}

			// Parse the output to get boot time
			// Format is typically: { sec = 1234567890, usec = 123456 } Thu Jan 1 00:00:00 2000
			parts := strings.Split(string(output), "sec = ")
			if len(parts) < 2 {
				return 0, fmt.Errorf("unexpected sysctl output format")
			}
			bootTimeParts := strings.Split(parts[1], ",")
			bootTimeStr := strings.TrimSpace(bootTimeParts[0])
			bootTime, err := strconv.ParseInt(bootTimeStr, 10, 64)
			if err != nil {
				return 0, err
			}

			currentTime := time.Now().Unix()
			return currentTime - bootTime, nil
		}
		return 0, err
	}

	uptimeStr := strings.Split(string(output), " ")[0]
	uptimeFloat, err := strconv.ParseFloat(uptimeStr, 64)
	if err != nil {
		return 0, err
	}

	return int64(uptimeFloat), nil
}

func getCPUInfo() (CPUInfo, error) {
	cpuUsage, err := cpu.Percent(100*time.Millisecond, false)
	if err != nil {
		return CPUInfo{}, err
	}

	cpuInfo, err := cpu.Info()
	if err != nil {
		return CPUInfo{}, err
	}

	if len(cpuInfo) == 0 {
		return CPUInfo{}, fmt.Errorf("no CPU info available")
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
