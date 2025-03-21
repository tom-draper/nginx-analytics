package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestServeLogsSize(t *testing.T) {
	// Setup test directory
	dirPath := "test_logs"
	err := os.Mkdir(dirPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test directory: %v", err)
	}
	defer os.RemoveAll(dirPath)

	// Create test files
	logFile := filepath.Join(dirPath, "test.log")
	err = os.WriteFile(logFile, []byte("log content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	zipFile := filepath.Join(dirPath, "test.zip")
	err = os.WriteFile(zipFile, []byte("compressed content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test zip file: %v", err)
	}

	// Create request and response recorder
	r, _ := http.NewRequest("GET", "/logs-size", nil)
	w := httptest.NewRecorder()

	// Call the function
	ServeLogsSize(w, r, dirPath)

	// Check response status
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Parse response
	var result LogSizes
	err = json.Unmarshal(w.Body.Bytes(), &result)
	if err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	// Validate file count
	if len(result.Files) != 2 {
		t.Errorf("Expected 2 files, got %d", len(result.Files))
	}

	// Validate summary
	if result.Summary.TotalFiles != 2 {
		t.Errorf("Expected total files to be 2, got %d", result.Summary.TotalFiles)
	}
	if result.Summary.LogFilesCount != 1 {
		t.Errorf("Expected 1 log file, got %d", result.Summary.LogFilesCount)
	}
	if result.Summary.CompressedFilesCount != 1 {
		t.Errorf("Expected 1 compressed file, got %d", result.Summary.CompressedFilesCount)
	}
}

func TestServeLogSize(t *testing.T) {
	// Create test log file
	logFile := "test.log"
	err := os.WriteFile(logFile, []byte("test log data"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}
	defer os.Remove(logFile)

	// Create request and response recorder
	r, _ := http.NewRequest("GET", "/log-size", nil)
	w := httptest.NewRecorder()

	// Call the function
	ServeLogSize(w, r, logFile)

	// Check response status
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Parse response
	var result LogSizes
	err = json.Unmarshal(w.Body.Bytes(), &result)
	if err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	// Validate single file
	if len(result.Files) != 1 {
		t.Errorf("Expected 1 file, got %d", len(result.Files))
	}

	// Validate summary
	if result.Summary.TotalFiles != 1 {
		t.Errorf("Expected total files to be 1, got %d", result.Summary.TotalFiles)
	}
	if result.Summary.LogFilesCount != 1 {
		t.Errorf("Expected log files count to be 1, got %d", result.Summary.LogFilesCount)
	}
}

func TestServeNonExistentLogSize(t *testing.T) {
	// Create request for a non-existent file
	r, _ := http.NewRequest("GET", "/log-size", nil)
	w := httptest.NewRecorder()

	// Call the function
	ServeLogSize(w, r, "non_existent.log")

	// Check response status
	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}
