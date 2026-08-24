package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/tom-draper/nginx-analytics/agent/pkg/logs"
)

func TestServeLogsPreservesPositionsAcrossRotation(t *testing.T) {
	dir := t.TempDir()
	activeLog := filepath.Join(dir, "access.log")
	if err := os.WriteFile(activeLog, []byte("already read\n"), 0644); err != nil {
		t.Fatal(err)
	}

	initial := requestLogs(t, dir, nil)
	if !slices.Equal(initial.Logs, []string{"already read"}) || len(initial.Positions) != 1 || initial.Positions[0].FileID == "" {
		t.Fatalf("unexpected initial response: %+v", initial)
	}

	if err := os.Rename(activeLog, filepath.Join(dir, "access.log.1")); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(activeLog, []byte("new entry\n"), 0644); err != nil {
		t.Fatal(err)
	}

	afterRotation := requestLogs(t, dir, initial.Positions)
	if !slices.Equal(afterRotation.Logs, []string{"new entry"}) {
		t.Fatalf("unexpected logs after rotation: %v", afterRotation.Logs)
	}
}

func requestLogs(t *testing.T, dir string, positions []logs.Position) logs.LogResult {
	t.Helper()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/logs/access", nil)
	ServeLogs(recorder, request, dir, positions, false, false)
	if recorder.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d: %s", recorder.Code, recorder.Body.String())
	}

	var result logs.LogResult
	if err := json.NewDecoder(recorder.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	return result
}
