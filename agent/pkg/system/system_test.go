package system

import (
	"testing"
	"time"
)

func TestMeasureSystem(t *testing.T) {
	info, err := MeasureSystem()
	if err != nil {
		t.Fatalf("MeasureSystem() returned an error: %v", err)
	}

	if info.Uptime <= 0 {
		t.Error("Expected uptime to be positive")
	}

	_, err = time.Parse(time.RFC3339, info.Timestamp)
	if err != nil {
		t.Errorf("Invalid timestamp format: %v", err)
	}

	if info.CPU.Model == "" {
		t.Error("CPU model should not be empty")
	}
	if info.CPU.Cores <= 0 {
		t.Error("Expected CPU cores to be positive")
	}

	if info.Memory.Total == 0 {
		t.Error("Total memory should not be zero")
	}

	if len(info.Disk) == 0 {
		t.Error("Disk info should not be empty")
	}
}

func TestGetUptime(t *testing.T) {
	uptime, err := getUptime()
	if err != nil {
		t.Fatalf("getUptime() returned an error: %v", err)
	}
	if uptime <= 0 {
		t.Error("Uptime should be a positive value")
	}
}

func TestGetCPUInfo(t *testing.T) {
	cpuInfo, err := getCPUInfo()
	if err != nil {
		t.Fatalf("getCPUInfo() returned an error: %v", err)
	}
	if cpuInfo.Model == "" {
		t.Error("CPU model should not be empty")
	}
	if cpuInfo.Cores <= 0 {
		t.Error("Expected CPU cores to be a positive value")
	}
	if cpuInfo.Speed < 0 {
		t.Error("CPU speed should not be negative")
	}
	if cpuInfo.Usage < 0 || cpuInfo.Usage > 100 {
		t.Errorf("CPU usage is outside the expected range (0-100): %f", cpuInfo.Usage)
	}
}

func TestGetMemoryInfo(t *testing.T) {
	memInfo, err := getMemoryInfo()
	if err != nil {
		t.Fatalf("getMemoryInfo() returned an error: %v", err)
	}
	if memInfo.Total == 0 {
		t.Error("Total memory should not be zero")
	}
	if memInfo.Used > memInfo.Total {
		t.Errorf("Used memory (%d) should not be greater than total memory (%d)", memInfo.Used, memInfo.Total)
	}
	if memInfo.Free > memInfo.Total {
		t.Errorf("Free memory (%d) should not be greater than total memory (%d)", memInfo.Free, memInfo.Total)
	}
}

func TestGetDiskInfo(t *testing.T) {
	diskInfo, err := getDiskInfo()
	if err != nil {
		t.Fatalf("getDiskInfo() returned an error: %v", err)
	}
	if len(diskInfo) == 0 {
		t.Error("Disk info should not be empty")
	}
	for _, d := range diskInfo {
		if d.Filesystem == "" {
			t.Error("Filesystem name should not be empty")
		}
		if d.MountedOn == "" {
			t.Error("Mount point should not be empty")
		}
		if d.Used > d.Size {
			t.Errorf("Used disk space (%d) should not be greater than total size (%d) for %s", d.Used, d.Size, d.Filesystem)
		}
	}
}

func TestParseFloat(t *testing.T) {
	testCases := []struct {
		name      string
		value     float64
		precision int
		expected  float64
	}{
		{"Positive value, round up", 123.456, 2, 123.46},
		{"Positive value, round down", 123.454, 2, 123.45},
		{"Zero precision", 123.456, 0, 123},
		{"Negative value", -123.456, 2, -123.46},
		{"No change", 123.45, 2, 123.45},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := parseFloat(tc.value, tc.precision)
			if result != tc.expected {
				t.Errorf("Expected %f, got %f", tc.expected, result)
			}
		})
	}
}