package logs

import (
	"compress/gzip"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func TestGetDirectoryLogs_RotatedFiles(t *testing.T) {
	// Setup test directory
	dirPath, err := os.MkdirTemp("", "test_logs")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(dirPath)

	// Create test log files
	files := map[string]string{
		"access.log":      "today logs\n",
		"access.log.1":    "yesterday logs\n",
		"access.log.2.gz": "older logs\n",
		"error.log":       "error logs\n",
		"notes.1":         "not a log\n",
	}

	for name, content := range files {
		fullPath := filepath.Join(dirPath, name)
		if filepath.Ext(name) == ".gz" {
			f, err := os.Create(fullPath)
			if err != nil {
				t.Fatalf("Failed to create gzip file %s: %v", name, err)
			}
			gw := gzip.NewWriter(f)
			if _, err := gw.Write([]byte(content)); err != nil {
				t.Fatalf("Failed to write gzip file %s: %v", name, err)
			}
			if err := gw.Close(); err != nil {
				t.Fatalf("Failed to close gzip writer for %s: %v", name, err)
			}
			if err := f.Close(); err != nil {
				t.Fatalf("Failed to close gzip file %s: %v", name, err)
			}
		} else {
			err := os.WriteFile(fullPath, []byte(content), 0644)
			if err != nil {
				t.Fatalf("Failed to create test file %s: %v", name, err)
			}
		}
	}

	tests := []struct {
		name              string
		isErrorLog        bool
		includeCompressed bool
		wantLogs          []string
		wantPositions     []string
	}{
		{
			name:              "Access logs - no compressed",
			isErrorLog:        false,
			includeCompressed: false,
			wantLogs:          []string{"today logs", "yesterday logs"},
			wantPositions:     []string{"access.log", "access.log.1"},
		},
		{
			name:              "Access logs - with compressed",
			isErrorLog:        false,
			includeCompressed: true,
			wantLogs:          []string{"today logs", "yesterday logs", "older logs"},
			wantPositions:     []string{"access.log", "access.log.1"},
		},
		{
			name:              "Error logs",
			isErrorLog:        true,
			includeCompressed: false,
			wantLogs:          []string{"error logs"},
			wantPositions:     []string{"error.log"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := GetDirectoryLogs(dirPath, nil, tt.isErrorLog, tt.includeCompressed)
			if err != nil {
				t.Fatalf("GetDirectoryLogs failed: %v", err)
			}

			if !slices.Equal(result.Logs, tt.wantLogs) {
				t.Fatalf("unexpected logs: got %v want %v", result.Logs, tt.wantLogs)
			}

			var gotPositions []string
			for _, pos := range result.Positions {
				gotPositions = append(gotPositions, pos.Filename)
			}
			if !slices.Equal(gotPositions, tt.wantPositions) {
				t.Fatalf("unexpected positions: got %v want %v", gotPositions, tt.wantPositions)
			}

			for _, unexpected := range []string{"not a log", "error logs", "older logs"} {
				if tt.isErrorLog || tt.includeCompressed {
					if unexpected == "error logs" || unexpected == "older logs" {
						continue
					}
				}
				if slices.Contains(result.Logs, unexpected) {
					t.Errorf("unexpected log line %q was returned", unexpected)
				}
			}
		})
	}
}

func TestIsNumericExtension(t *testing.T) {
	tests := []struct {
		ext      string
		expected bool
	}{
		{".1", true},
		{".10", true},
		{".log", false},
		{".gz", false},
		{".", false},
		{"", false},
		{".1a", false},
	}

	for _, tt := range tests {
		if result := isNumericExtension(tt.ext); result != tt.expected {
			t.Errorf("isNumericExtension(%s) = %v; want %v", tt.ext, result, tt.expected)
		}
	}
}

func TestReadLogFileRestartsAfterTruncation(t *testing.T) {
	dirPath := t.TempDir()
	filePath := filepath.Join(dirPath, "access.log")
	if err := os.WriteFile(filePath, []byte("new entry\n"), 0644); err != nil {
		t.Fatal(err)
	}

	result, err := readLogFile(filePath, int64(len("previous entry that was longer\n")))
	if err != nil {
		t.Fatal(err)
	}

	if !slices.Equal(result.Logs, []string{"new entry"}) {
		t.Fatalf("unexpected logs: got %v", result.Logs)
	}
	if result.Positions[0].Position != int64(len("new entry\n")) {
		t.Fatalf("unexpected position: got %d", result.Positions[0].Position)
	}
}

func TestReadLogFileSupportsLongLines(t *testing.T) {
	filePath := filepath.Join(t.TempDir(), "access.log")
	longLine := strings.Repeat("x", 128*1024)
	if err := os.WriteFile(filePath, []byte(longLine+"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	result, err := readLogFile(filePath, 0)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(result.Logs, []string{longLine}) {
		t.Fatalf("unexpected logs: got %d lines", len(result.Logs))
	}
}

func TestReadLogFileDefersIncompleteLine(t *testing.T) {
	filePath := filepath.Join(t.TempDir(), "access.log")
	if err := os.WriteFile(filePath, []byte("complete\npartial"), 0644); err != nil {
		t.Fatal(err)
	}

	result, err := readLogFile(filePath, 0)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(result.Logs, []string{"complete"}) {
		t.Fatalf("unexpected logs: %v", result.Logs)
	}
	if result.Positions[0].Position != int64(len("complete\n")) {
		t.Fatalf("unexpected position: %d", result.Positions[0].Position)
	}
}
