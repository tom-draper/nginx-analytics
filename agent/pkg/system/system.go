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
	switch runtime.GOOS {
	case "windows":
		return getUptimeWindows()
	case "darwin":
		return getUptimeDarwin()
	default:
		// Assume Linux/Unix-like systems
		return getUptimeLinux()
	}
}

func getUptimeWindows() (int64, error) {
	// Try WMI first (more reliable)
	cmd := exec.Command("wmic", "os", "get", "lastbootuptime", "/value")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "LastBootUpTime=") {
				bootTimeStr := strings.TrimSpace(strings.Split(line, "=")[1])
				// WMI format: 20210101120000.000000+000
				if len(bootTimeStr) >= 14 {
					bootTime, err := time.Parse("20060102150405", bootTimeStr[:14])
					if err == nil {
						return int64(time.Since(bootTime).Seconds()), nil
					}
				}
			}
		}
	}

	// Fallback to systeminfo
	cmd = exec.Command("systeminfo")
	output, err = cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get system info: %w", err)
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "System Boot Time") {
			parts := strings.Split(line, ":")
			if len(parts) < 2 {
				continue
			}
			bootTimeStr := strings.TrimSpace(strings.Join(parts[1:], ":"))
			
			// Try different time formats
			formats := []string{
				"1/2/2006, 3:04:05 PM",
				"2/1/2006, 15:04:05",
				"1/2/2006 3:04:05 PM",
				"2/1/2006 15:04:05",
			}
			
			for _, format := range formats {
				bootTime, err := time.Parse(format, bootTimeStr)
				if err == nil {
					return int64(time.Since(bootTime).Seconds()), nil
				}
			}
		}
	}
	return 0, fmt.Errorf("could not determine system uptime")
}

func getUptimeDarwin() (int64, error) {
	cmd := exec.Command("sysctl", "-n", "kern.boottime")
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get boot time: %w", err)
	}

	// Parse output like: { sec = 1609459200, usec = 0 } Fri Jan  1 00:00:00 2021
	outputStr := strings.TrimSpace(string(output))
	
	// Look for "sec = " pattern
	secIndex := strings.Index(outputStr, "sec = ")
	if secIndex == -1 {
		return 0, fmt.Errorf("unexpected sysctl output format: %s", outputStr)
	}

	// Extract the number after "sec = "
	secStr := outputStr[secIndex+6:]
	commaIndex := strings.Index(secStr, ",")
	if commaIndex != -1 {
		secStr = secStr[:commaIndex]
	} else {
		// Look for space or end of string
		spaceIndex := strings.Index(secStr, " ")
		if spaceIndex != -1 {
			secStr = secStr[:spaceIndex]
		}
	}

	bootTime, err := strconv.ParseInt(strings.TrimSpace(secStr), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse boot time: %w", err)
	}

	currentTime := time.Now().Unix()
	return currentTime - bootTime, nil
}

func getUptimeLinux() (int64, error) {
	cmd := exec.Command("cat", "/proc/uptime")
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to read /proc/uptime: %w", err)
	}

	uptimeStr := strings.Split(strings.TrimSpace(string(output)), " ")[0]
	uptimeFloat, err := strconv.ParseFloat(uptimeStr, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse uptime: %w", err)
	}

	return int64(uptimeFloat), nil
}

func getCPUInfo() (CPUInfo, error) {
	// Get CPU usage with a longer sampling period for more accurate results
	cpuUsage, err := cpu.Percent(500*time.Millisecond, false)
	if err != nil {
		// If CPU usage fails, continue with 0 usage rather than failing entirely
		cpuUsage = []float64{0.0}
	}

	cpuInfo, err := cpu.Info()
	if err != nil {
		return CPUInfo{}, fmt.Errorf("failed to get CPU info: %w", err)
	}

	if len(cpuInfo) == 0 {
		return CPUInfo{}, fmt.Errorf("no CPU info available")
	}

	// Get logical CPU count (more reliable across platforms)
	logicalCores := runtime.NumCPU()
	
	// Use the first CPU's info as representative
	firstCPU := cpuInfo[0]
	model := firstCPU.ModelName
	speed := firstCPU.Mhz

	// Fallback for model name if empty
	if model == "" {
		model = "Unknown CPU"
	}

	// Handle CPU speed fallbacks
	if speed == 0 {
		// Try to get max frequency on Linux
		if runtime.GOOS == "linux" {
			if maxFreq := getCPUMaxFreqLinux(); maxFreq > 0 {
				speed = maxFreq
			}
		}
		// If still 0, use a placeholder
		if speed == 0 {
			speed = 0.0 // Will be displayed as 0 MHz
		}
	}

	var usage float64
	if len(cpuUsage) > 0 {
		usage = cpuUsage[0]
	}

	return CPUInfo{
		Model: model,
		Cores: logicalCores,
		Speed: parseFloat(speed, 1),
		Usage: parseFloat(usage, 1),
	}, nil
}

func getCPUMaxFreqLinux() float64 {
	cmd := exec.Command("cat", "/proc/cpuinfo")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "cpu MHz") {
			parts := strings.Split(line, ":")
			if len(parts) == 2 {
				freqStr := strings.TrimSpace(parts[1])
				if freq, err := strconv.ParseFloat(freqStr, 64); err == nil {
					return freq
				}
			}
		}
	}
	return 0
}

func getMemoryInfo() (MemoryInfo, error) {
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return MemoryInfo{}, fmt.Errorf("failed to get memory info: %w", err)
	}

	// Handle potential issues with gopsutil on different platforms
	memInfo := MemoryInfo{
		Total: vmStat.Total,
		Used:  vmStat.Used,
		Free:  vmStat.Free,
	}

	// Available memory handling (may not be available on all platforms)
	if vmStat.Available > 0 {
		memInfo.Available = vmStat.Available
	} else {
		// Fallback: estimate available as free + buffers + cached
		// This is a rough estimate when Available is not provided
		memInfo.Available = vmStat.Free
	}

	// Sanity checks
	if memInfo.Total == 0 {
		return MemoryInfo{}, fmt.Errorf("invalid memory information: total memory is 0")
	}

	// Ensure consistency in memory calculations
	if memInfo.Used > memInfo.Total {
		memInfo.Used = memInfo.Total - memInfo.Free
	}

	return memInfo, nil
}

func getDiskInfo() ([]DiskInfo, error) {
	var disks []DiskInfo

	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil, fmt.Errorf("failed to get disk partitions: %w", err)
	}

	for _, partition := range partitions {
		// Skip certain filesystem types that are not relevant
		if shouldSkipFilesystem(partition.Fstype, partition.Mountpoint) {
			continue
		}

		usage, err := disk.Usage(partition.Mountpoint)
		if err != nil {
			// Log the error but continue with other partitions
			continue
		}

		// Skip partitions with 0 total space (they might be virtual)
		if usage.Total == 0 {
			continue
		}

		diskInfo := DiskInfo{
			Filesystem: partition.Device,
			Size:       usage.Total,
			Used:       usage.Used,
			MountedOn:  partition.Mountpoint,
		}

		// Clean up filesystem name for better display
		if diskInfo.Filesystem == "" {
			diskInfo.Filesystem = partition.Mountpoint
		}

		disks = append(disks, diskInfo)
	}

	if len(disks) == 0 {
		return nil, fmt.Errorf("no accessible disk partitions found")
	}

	return disks, nil
}

func shouldSkipFilesystem(fstype, mountpoint string) bool {
	// Skip virtual/special filesystems
	skipFsTypes := map[string]bool{
		"proc":     true,
		"sysfs":    true,
		"devfs":    true,
		"devpts":   true,
		"tmpfs":    true,
		"debugfs":  true,
		"securityfs": true,
		"cgroup":   true,
		"pstore":   true,
		"hugetlbfs": true,
		"configfs": true,
		"selinuxfs": true,
		"systemd-1": true,
		"binfmt_misc": true,
		"autofs":   true,
		"rpc_pipefs": true,
		"nfsd":     true,
		"sunrpc":   true,
	}

	// Skip by filesystem type
	if skipFsTypes[strings.ToLower(fstype)] {
		return true
	}

	// Skip certain mount points (common virtual mounts)
	skipMountPoints := []string{
		"/proc", "/sys", "/dev", "/run", "/boot/efi",
		"/var/lib/docker", "/snap/", "/System/Volumes/",
	}

	for _, skipMount := range skipMountPoints {
		if strings.HasPrefix(mountpoint, skipMount) {
			return true
		}
	}

	// Skip if mountpoint is empty
	if mountpoint == "" {
		return true
	}

	return false
}

func parseFloat(val float64, precision int) float64 {
	format := fmt.Sprintf("%%.%df", precision)
	formatted := fmt.Sprintf(format, val)
	result, _ := strconv.ParseFloat(formatted, 64)
	return result
}
