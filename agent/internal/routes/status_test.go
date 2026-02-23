package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func TestServeServerStatus(t *testing.T) {
	// Set up a start time for the server
	startTime := time.Now()

	// Temporary file paths (for testing purposes)
	nginxAccessPath := "/tmp/access.log"
	nginxErrorPath := "/tmp/error.log"

	// Create a test server to capture the response
	tests := []struct {
		name              string
		nginxAccessPath   string
		nginxErrorPath    string
		expectedStatus    string
		expectedUptime    string
		expectedAccessLog string
		expectedErrorLog  string
		createAccessLog   bool
		createErrorLog    bool
	}{
		{
			name:              "Both logs exist",
			nginxAccessPath:   nginxAccessPath,
			nginxErrorPath:    nginxErrorPath,
			expectedStatus:    "ok",
			expectedAccessLog: "ok",
			expectedErrorLog:  "ok",
			createAccessLog:   true,
			createErrorLog:    true,
		},
		{
			name:              "Access log does not exist",
			nginxAccessPath:   nginxAccessPath,
			nginxErrorPath:    nginxErrorPath,
			expectedStatus:    "ok",
			expectedAccessLog: "not found",
			expectedErrorLog:  "ok",
			createAccessLog:   false,
			createErrorLog:    true,
		},
		{
			name:              "Error log does not exist",
			nginxAccessPath:   nginxAccessPath,
			nginxErrorPath:    nginxErrorPath,
			expectedStatus:    "ok",
			expectedAccessLog: "ok",
			expectedErrorLog:  "not found",
			createAccessLog:   true,
			createErrorLog:    false,
		},
		{
			name:              "Neither log exists",
			nginxAccessPath:   nginxAccessPath,
			nginxErrorPath:    nginxErrorPath,
			expectedStatus:    "ok",
			expectedAccessLog: "not found",
			expectedErrorLog:  "not found",
			createAccessLog:   false,
			createErrorLog:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set up the mock files based on the test case
			if tt.createAccessLog {
				// Create the access log file
				_, err := os.Create(tt.nginxAccessPath)
				if err != nil {
					t.Fatalf("failed to create access log file: %v", err)
				}
				defer os.Remove(tt.nginxAccessPath) // Clean up after test
			} else {
				// Ensure the access log file does not exist
				os.Remove(tt.nginxAccessPath)
			}

			if tt.createErrorLog {
				// Create the error log file
				_, err := os.Create(tt.nginxErrorPath)
				if err != nil {
					t.Fatalf("failed to create error log file: %v", err)
				}
				defer os.Remove(tt.nginxErrorPath) // Clean up after test
			} else {
				// Ensure the error log file does not exist
				os.Remove(tt.nginxErrorPath)
			}

			// Create a response recorder to capture the output
			rr := httptest.NewRecorder()
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				ServeServerStatus(w, tt.nginxAccessPath, tt.nginxErrorPath, startTime, "")
			})

			// Execute the handler
			handler.ServeHTTP(rr, httptest.NewRequest("GET", "/status", nil))

			// Check the response status code
			if status := rr.Code; status != http.StatusOK {
				t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			// Check the response body
			var status Status
			err := json.NewDecoder(rr.Body).Decode(&status)
			if err != nil {
				t.Fatalf("failed to decode response body: %v", err)
			}

			// Check values in the response body
			if status.Status != tt.expectedStatus {
				t.Errorf("unexpected status: got %v want %v", status.Status, tt.expectedStatus)
			}

			// Check uptime (uptime is dynamic, we can just ensure it's not empty)
			if status.Uptime == "" {
				t.Error("uptime is empty")
			}

			// Check access log status
			if status.AccessLogStatus != tt.expectedAccessLog {
				t.Errorf("unexpected access log status: got %v want %v", status.AccessLogStatus, tt.expectedAccessLog)
			}

			// Check error log status
			if status.ErrorLogStatus != tt.expectedErrorLog {
				t.Errorf("unexpected error log status: got %v want %v", status.ErrorLogStatus, tt.expectedErrorLog)
			}
		})
	}
}
