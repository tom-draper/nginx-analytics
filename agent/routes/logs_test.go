package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServeSingleLog(t *testing.T) {
	// Create a temporary log file
	tempDir := t.TempDir()
	logFile := filepath.Join(tempDir, "test.log")

	// Write test content to log file
	err := os.WriteFile(logFile, []byte("line1\nline2\nline3\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	// Test reading from beginning
	w := httptest.NewRecorder()

	serveSingleLog(w, logFile, 0)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	var result LogResult
	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(result.Logs) != 3 {
		t.Errorf("Expected 3 log lines, got %d", len(result.Logs))
	}

	if result.Logs[0] != "line1" {
		t.Errorf("Expected 'line1', got '%s'", result.Logs[0])
	}

	// Test reading from middle
	w = httptest.NewRecorder()
	serveSingleLog(w, logFile, 6) // Position after "line1\n"

	resp = w.Result()
	body, _ = io.ReadAll(resp.Body)

	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 log lines, got %d", len(result.Logs))
	}

	if result.Logs[0] != "line2" {
		t.Errorf("Expected 'line2', got '%s'", result.Logs[0])
	}

	// Test reading past file end
	w = httptest.NewRecorder()
	serveSingleLog(w, logFile, 100) // Position beyond file size

	resp = w.Result()
	body, _ = io.ReadAll(resp.Body)

	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(result.Logs) != 0 {
		t.Errorf("Expected 0 log lines for position past file end, got %d", len(result.Logs))
	}
}

func TestReadNormalLogFile(t *testing.T) {
	// Setup temp file
	tempDir := t.TempDir()
	logFile := filepath.Join(tempDir, "test.log")

	// Test with empty file
	err := os.WriteFile(logFile, []byte(""), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	result, err := readNormalLogFile(logFile, 0)
	if err != nil {
		t.Fatalf("Failed to read log file: %v", err)
	}

	if len(result.Logs) != 0 {
		t.Errorf("Expected 0 logs from empty file, got %d", len(result.Logs))
	}

	// Test with file ending with newline
	err = os.WriteFile(logFile, []byte("line1\nline2\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to update test log file: %v", err)
	}

	result, err = readNormalLogFile(logFile, 0)
	if err != nil {
		t.Fatalf("Failed to read log file: %v", err)
	}

	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 logs, got %d", len(result.Logs))
	}

	// Test with file not ending with newline
	err = os.WriteFile(logFile, []byte("line1\nline2"), 0644)
	if err != nil {
		t.Fatalf("Failed to update test log file: %v", err)
	}

	result, err = readNormalLogFile(logFile, 0)
	if err != nil {
		t.Fatalf("Failed to read log file: %v", err)
	}

	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 logs, got %d", len(result.Logs))
	}

	if result.Logs[1] != "line2" {
		t.Errorf("Expected 'line2', got '%s'", result.Logs[1])
	}
}

func TestReadGzippedLogFile(t *testing.T) {
	// This test requires a pre-created gzip file or creating one dynamically
	// For simplicity, we'll test the error case and skip actual decompression test

	// Test with non-existent file
	_, err := readGzippedLogFile("nonexistent.gz")
	if err == nil {
		t.Errorf("Expected error reading non-existent gzip file, got nil")
	}
}

func TestServeDirectoryLogs(t *testing.T) {
	// Setup temp directory with multiple log files
	tempDir := t.TempDir()

	// Create normal log files
	err := os.WriteFile(filepath.Join(tempDir, "access.log"), []byte("access line1\naccess line2\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	err = os.WriteFile(filepath.Join(tempDir, "error.log"), []byte("error line1\nerror line2\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	// Test serving all logs (non-error)
	w := httptest.NewRecorder()

	// Create positions array
	positions := []Position{
		{Filename: "access.log", Position: 0},
	}

	// Test non-error logs
	serveDirectoryLogs(w, tempDir, positions, false, false)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	var result LogResult
	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Should only get access logs
	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 access log lines, got %d", len(result.Logs))
	}

	if !strings.Contains(result.Logs[0], "access") {
		t.Errorf("Expected access log, got: %s", result.Logs[0])
	}

	// Check positions array
	if len(result.Positions) != 1 {
		t.Errorf("Expected 1 position entry, got %d", len(result.Positions))
	}

	// Test error logs
	w = httptest.NewRecorder()
	positions = []Position{
		{Filename: "error.log", Position: 0},
	}

	serveDirectoryLogs(w, tempDir, positions, true, false)

	resp = w.Result()
	body, _ = io.ReadAll(resp.Body)

	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Should only get error logs
	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 error log lines, got %d", len(result.Logs))
	}

	if !strings.Contains(result.Logs[0], "error") {
		t.Errorf("Expected error log, got: %s", result.Logs[0])
	}
}

func TestInitializeFilePositions(t *testing.T) {
	logFiles := []string{"access.log", "error.log", "old.log.gz"}
	positions := []Position{
		{Filename: "access.log", Position: 100},
		{Filename: "error.log", Position: 200},
	}

	result := initializeFilePositions(logFiles, positions)

	if len(result) != 3 {
		t.Errorf("Expected 3 positions, got %d", len(result))
	}

	// Check specific positions
	for _, pos := range result {
		switch pos.Filename {
		case "access.log":
			if pos.Position != 100 {
				t.Errorf("Expected position 100 for access.log, got %d", pos.Position)
			}
		case "error.log":
			if pos.Position != 200 {
				t.Errorf("Expected position 200 for error.log, got %d", pos.Position)
			}
		case "old.log.gz":
			if pos.Position != 0 {
				t.Errorf("Expected position 0 for gzip file, got %d", pos.Position)
			}
		}
	}
}

func TestServeLogsHandler(t *testing.T) {
	// Setup temp directory with a log file
	tempDir := t.TempDir()
	logFile := filepath.Join(tempDir, "test.log")

	err := os.WriteFile(logFile, []byte("line1\nline2\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	// Test ServeLogs function with single file
	req := httptest.NewRequest("GET", "/logs", nil)
	w := httptest.NewRecorder()

	ServeLogs(w, req, logFile)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	var result LogResult
	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 logs, got %d", len(result.Logs))
	}

	// Test ServeErrorLogs function with single file
	req = httptest.NewRequest("GET", "/logs", nil)
	w = httptest.NewRecorder()

	ServeErrorLogs(w, req, logFile)

	resp = w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %d", resp.StatusCode)
	}
}

func TestServeLogWithPositionParam(t *testing.T) {
	// Setup temp directory with a log file
	tempDir := t.TempDir()
	logFile := filepath.Join(tempDir, "test.log")

	err := os.WriteFile(logFile, []byte("line1\nline2\nline3\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	// Test with position parameter
	req := httptest.NewRequest("GET", "/logs?position=6", nil) // Position after "line1\n"
	w := httptest.NewRecorder()

	ServeLog(w, req, logFile)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	var result LogResult
	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 logs from position 6, got %d", len(result.Logs))
	}

	if result.Logs[0] != "line2" {
		t.Errorf("Expected 'line2', got '%s'", result.Logs[0])
	}
}

func TestServeLogsWithPositionsParam(t *testing.T) {
	// Setup temp directory with multiple log files
	tempDir := t.TempDir()

	err := os.WriteFile(filepath.Join(tempDir, "access.log"), []byte("access line1\naccess line2\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}

	// Create positions JSON
	positions := []Position{
		{Filename: "access.log", Position: 12}, // Position after "access line1\n"
	}

	positionsJSON, err := json.Marshal(positions)
	if err != nil {
		t.Fatalf("Failed to marshal positions: %v", err)
	}

	// Test with positions parameter
	req := httptest.NewRequest("GET", "/logs?positions="+string(positionsJSON), nil)
	w := httptest.NewRecorder()

	ServeLogs(w, req, tempDir)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)

	var result LogResult
	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(result.Logs) != 1 {
		t.Errorf("Expected 1 log from position, got %d", len(result.Logs))
	}

	if result.Logs[0] != "access line2" {
		t.Errorf("Expected 'access line2', got '%s'", result.Logs[0])
	}
}

func TestServeLogsInvalidPath(t *testing.T) {
	// Test with non-existent file
	req := httptest.NewRequest("GET", "/logs", nil)
	w := httptest.NewRecorder()

	ServeLogs(w, req, "nonexistent-file.log")

	resp := w.Result()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status 500 for non-existent file, got %d", resp.StatusCode)
	}
}

func TestReadErrorLogDirectly(t *testing.T) {
	// Setup temp directory with an error log file
	tempDir := t.TempDir()
	logFile := filepath.Join(tempDir, "error.log")

	// Write test content
	err := os.WriteFile(logFile, []byte("error1\nerror2\n"), 0644)
	if err != nil {
		t.Fatalf("Failed to create test error log file: %v", err)
	}

	// Test reading from beginning
	result, err := readErrorLogDirectly(logFile, 0)
	if err != nil {
		t.Fatalf("Failed to read error log: %v", err)
	}

	if len(result.Logs) != 2 {
		t.Errorf("Expected 2 error logs, got %d", len(result.Logs))
	}

	// Test reading from middle
	result, err = readErrorLogDirectly(logFile, 7) // Position after "error1\n"
	if err != nil {
		t.Fatalf("Failed to read error log: %v", err)
	}

	if len(result.Logs) != 1 {
		t.Errorf("Expected 1 error log from position, got %d", len(result.Logs))
	}

	if result.Logs[0] != "error2" {
		t.Errorf("Expected 'error2', got '%s'", result.Logs[0])
	}
}
