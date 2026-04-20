package logs

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetLogSizes_RotatedFiles(t *testing.T) {
	// Setup test directory
	dirPath, err := os.MkdirTemp("", "test_logs_size")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(dirPath)

	// Create test files
	files := map[string]int64{
		"access.log":   100,
		"access.log.1": 200,
		"test.gz":      50,
		"notes.1":      25,
	}

	for name, size := range files {
		err := os.WriteFile(filepath.Join(dirPath, name), make([]byte, size), 0644)
		if err != nil {
			t.Fatalf("Failed to create test file %s: %v", name, err)
		}
	}

	result, err := GetLogSizes(dirPath)
	if err != nil {
		t.Fatalf("GetLogSizes failed: %v", err)
	}

	// access.log and access.log.1 should be counted as log files, but unrelated .1 files should not.
	if result.Summary.LogFilesCount != 2 {
		t.Errorf("Expected 2 log files, got %d", result.Summary.LogFilesCount)
	}
	if result.Summary.LogFilesSize != 300 {
		t.Errorf("Expected 300 log files size, got %d", result.Summary.LogFilesSize)
	}
	if result.Summary.TotalFiles != 4 {
		t.Errorf("Expected 4 total files, got %d", result.Summary.TotalFiles)
	}
	if result.Summary.CompressedFilesCount != 1 {
		t.Errorf("Expected 1 compressed file, got %d", result.Summary.CompressedFilesCount)
	}
}

func TestGetLogSize_RotatedFile(t *testing.T) {
	// Create test log file
	logFile, err := os.CreateTemp("", "access.log.1")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(logFile.Name())
	
	logFile.Write(make([]byte, 150))
	logFile.Close()

	result, err := GetLogSize(logFile.Name())
	if err != nil {
		t.Fatalf("GetLogSize failed: %v", err)
	}

	if result.Summary.LogFilesCount != 1 {
		t.Errorf("Expected 1 log file, got %d", result.Summary.LogFilesCount)
	}
	if result.Summary.LogFilesSize != 150 {
		t.Errorf("Expected 150 log files size, got %d", result.Summary.LogFilesSize)
	}
}
