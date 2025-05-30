package system

// import (
// 	"encoding/json"
// 	"net/http"
// 	"net/http/httptest"
// 	"os"
// 	"os/exec"
// 	"reflect"
// 	"runtime"
// 	"testing"
// 	"time"
// )

// func TestServeSystemResources(t *testing.T) {
// 	// Create a test recorder to capture the response
// 	w := httptest.NewRecorder()

// 	// Call the function being tested
// 	ServeSystemResources(w)

// 	// Check status code
// 	if w.Code != http.StatusOK {
// 		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
// 	}

// 	// Check content type
// 	contentType := w.Header().Get("Content-Type")
// 	if contentType != "application/json" {
// 		t.Errorf("Expected Content-Type %s, got %s", "application/json", contentType)
// 	}

// 	// Decode the response
// 	var systemInfo SystemInfo
// 	if err := json.Unmarshal(w.Body.Bytes(), &systemInfo); err != nil {
// 		t.Fatalf("Failed to decode response: %v", err)
// 	}

// 	// Basic validation of response fields
// 	if systemInfo.Uptime <= 0 {
// 		t.Errorf("Expected positive uptime, got %d", systemInfo.Uptime)
// 	}

// 	if _, err := time.Parse(time.RFC3339, systemInfo.Timestamp); err != nil {
// 		t.Errorf("Invalid timestamp format: %s", systemInfo.Timestamp)
// 	}

// 	if systemInfo.CPU.Cores <= 0 {
// 		t.Errorf("Expected positive number of CPU cores, got %d", systemInfo.CPU.Cores)
// 	}

// 	if systemInfo.Memory.Total <= 0 {
// 		t.Errorf("Expected positive total memory, got %d", systemInfo.Memory.Total)
// 	}

// 	if len(systemInfo.Disk) == 0 {
// 		t.Error("Expected at least one disk entry")
// 	}
// }

// // Mock for the exec.Command function to simulate command execution
// type mockCmd struct {
// 	output string
// 	err    error
// }

// func (m mockCmd) Output() ([]byte, error) {
// 	return []byte(m.output), m.err
// }

// // Test helper to patch the exec.Command function during tests
// func patchExecCommand(t *testing.T, mockOutput string, mockErr error) func() {
// 	// Save original implementation
// 	original := execCommand

// 	// Replace with mock
// 	execCommand = func(command string, args ...string) cmdInterface {
// 		return mockCmd{output: mockOutput, err: mockErr}
// 	}

// 	// Return a function to restore the original implementation
// 	return func() {
// 		execCommand = original
// 	}
// }

// // Interface to abstract exec.Cmd functionality
// type cmdInterface interface {
// 	Output() ([]byte, error)
// }

// // Variable to hold the exec.Command function for mocking
// var execCommand = func(command string, args ...string) cmdInterface {
// 	cmd := exec.Command(command, args...)
// 	return cmdAdapter{cmd}
// }

// // Adapter to implement cmdInterface for exec.Cmd
// type cmdAdapter struct {
// 	*exec.Cmd
// }

// func (c cmdAdapter) Output() ([]byte, error) {
// 	return c.Cmd.Output()
// }

// func TestGetUptime(t *testing.T) {
// 	tests := []struct {
// 		name        string
// 		mockOutput  string
// 		mockError   error
// 		expected    int64
// 		shouldError bool
// 	}{
// 		{
// 			name:        "Linux successful uptime",
// 			mockOutput:  "12345.67 98765.43",
// 			mockError:   nil,
// 			expected:    12345,
// 			shouldError: false,
// 		},
// 		{
// 			name:        "Error getting uptime",
// 			mockOutput:  "",
// 			mockError:   os.ErrNotExist,
// 			expected:    0,
// 			shouldError: true,
// 		},
// 		{
// 			name:        "Invalid uptime format",
// 			mockOutput:  "not a number",
// 			mockError:   nil,
// 			expected:    0,
// 			shouldError: true,
// 		},
// 	}

// 	for _, tc := range tests {
// 		t.Run(tc.name, func(t *testing.T) {
// 			// Skip test if it requires mocking on unsupported platforms
// 			if tc.mockOutput != "" && runtime.GOOS != "linux" {
// 				t.Skip("Skipping test that uses Linux mocking on non-Linux platform")
// 			}

// 			// Patch exec.Command
// 			restore := patchExecCommand(t, tc.mockOutput, tc.mockError)
// 			defer restore()

// 			// Call the function
// 			uptime, err := getUptime()

// 			// Check results
// 			if tc.shouldError && err == nil {
// 				t.Error("Expected an error but got none")
// 			}

// 			if !tc.shouldError && err != nil {
// 				t.Errorf("Unexpected error: %v", err)
// 			}

// 			if !tc.shouldError && uptime != tc.expected {
// 				t.Errorf("Expected uptime %d, got %d", tc.expected, uptime)
// 			}
// 		})
// 	}
// }

// func TestParseFloat(t *testing.T) {
// 	tests := []struct {
// 		input     float64
// 		precision int
// 		expected  float64
// 	}{
// 		{123.456789, 2, 123.46},
// 		{0.123456789, 3, 0.123},
// 		{9.99999, 1, 10.0},
// 		{0, 2, 0},
// 		{-123.456789, 2, -123.46},
// 	}

// 	for _, tc := range tests {
// 		result := parseFloat(tc.input, tc.precision)
// 		if result != tc.expected {
// 			t.Errorf("ParseFloat(%f, %d): expected %f, got %f",
// 				tc.input, tc.precision, tc.expected, result)
// 		}
// 	}
// }

// // TestSystemInfoJsonMarshaling tests that the JSON marshaling of SystemInfo works correctly
// func TestSystemInfoJsonMarshaling(t *testing.T) {
// 	// Create a sample SystemInfo
// 	sampleInfo := SystemInfo{
// 		Uptime:    12345,
// 		Timestamp: "2023-01-01T12:00:00Z",
// 		CPU: CPUInfo{
// 			Model: "Test CPU",
// 			Cores: 4,
// 			Speed: 3200.0,
// 			Usage: 75.5,
// 		},
// 		Memory: MemoryInfo{
// 			Free:      1024 * 1024 * 1024,
// 			Available: 2048 * 1024 * 1024,
// 			Used:      3072 * 1024 * 1024,
// 			Total:     4096 * 1024 * 1024,
// 		},
// 		Disk: []DiskInfo{
// 			{
// 				Filesystem: "/dev/sda1",
// 				Size:       1000 * 1024 * 1024 * 1024,
// 				Used:       500 * 1024 * 1024 * 1024,
// 				MountedOn:  "/",
// 			},
// 		},
// 	}

// 	// Marshal to JSON
// 	jsonData, err := json.Marshal(sampleInfo)
// 	if err != nil {
// 		t.Fatalf("Failed to marshal SystemInfo: %v", err)
// 	}

// 	// Unmarshal back to a new struct
// 	var unmarshaledInfo SystemInfo
// 	if err := json.Unmarshal(jsonData, &unmarshaledInfo); err != nil {
// 		t.Fatalf("Failed to unmarshal SystemInfo: %v", err)
// 	}

// 	// Compare the original and unmarshaled structs
// 	if !reflect.DeepEqual(sampleInfo, unmarshaledInfo) {
// 		t.Errorf("Unmarshaled SystemInfo does not match original:\nOriginal: %+v\nUnmarshaled: %+v",
// 			sampleInfo, unmarshaledInfo)
// 	}
// }

// // MockSystemInfoProvider is a test double for functions that require real system information
// type MockSystemInfoProvider struct {
// 	UptimeFunc     func() (int64, error)
// 	CPUInfoFunc    func() (CPUInfo, error)
// 	MemoryInfoFunc func() (MemoryInfo, error)
// 	DiskInfoFunc   func() ([]DiskInfo, error)
// }

// func TestCollectSystemInfo(t *testing.T) {
// 	// For full integration testing, you'd need to expose the functions or use dependency injection
// 	// Here's a demonstration of how you might test it with mock dependencies

// 	// This test assumes you've modified your code to accept dependencies, which isn't shown in the original code
// 	// The following is a conceptual example:

// 	/*
// 		mockProvider := MockSystemInfoProvider{
// 			UptimeFunc: func() (int64, error) {
// 				return 12345, nil
// 			},
// 			CPUInfoFunc: func() (routes.CPUInfo, error) {
// 				return routes.CPUInfo{
// 					Model:  "Test CPU",
// 					Cores:  4,
// 					Speed:  3200.0,
// 					Usage:  75.5,
// 				}, nil
// 			},
// 			MemoryInfoFunc: func() (routes.MemInfo, error) {
// 				return routes.MemInfo{
// 					Free:      1024 * 1024 * 1024,
// 					Available: 2048 * 1024 * 1024,
// 					Used:      3072 * 1024 * 1024,
// 					Total:     4096 * 1024 * 1024,
// 				}, nil
// 			},
// 			DiskInfoFunc: func() ([]routes.DiskInfo, error) {
// 				return []routes.DiskInfo{
// 					{
// 						Filesystem: "/dev/sda1",
// 						Size:       1000 * 1024 * 1024 * 1024,
// 						Used:       500 * 1024 * 1024 * 1024,
// 						MountedOn:  "/",
// 					},
// 				}, nil
// 			},
// 		}

// 		systemInfo, err := routes.CollectSystemInfoWithDependencies(mockProvider)
// 		if err != nil {
// 			t.Fatalf("CollectSystemInfo returned an error: %v", err)
// 		}

// 		// Verify the returned system info matches what we expect from our mocks
// 		if systemInfo.Uptime != 12345 {
// 			t.Errorf("Expected uptime 12345, got %d", systemInfo.Uptime)
// 		}

// 		if systemInfo.CPU.Cores != 4 {
// 			t.Errorf("Expected 4 CPU cores, got %d", systemInfo.CPU.Cores)
// 		}
// 	*/

// 	// Instead, for now we'll do a simple integration test:
// 	systemInfo, err := MeasureSystem()
// 	if err != nil {
// 		t.Fatalf("CollectSystemInfo returned an error: %v", err)
// 	}

// 	// Basic validation
// 	if systemInfo.Uptime <= 0 {
// 		t.Errorf("Expected positive uptime, got %d", systemInfo.Uptime)
// 	}

// 	if systemInfo.CPU.Cores <= 0 {
// 		t.Errorf("Expected at least one CPU core, got %d", systemInfo.CPU.Cores)
// 	}

// 	if systemInfo.Memory.Total <= 0 {
// 		t.Errorf("Expected positive total memory, got %d", systemInfo.Memory.Total)
// 	}
// }
