package logs

import (
	"testing"
	"time"
)

func TestParseNginxLogs(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected int // number of expected parsed logs
		wantErr  bool
	}{
		{
			name: "valid single log entry",
			input: []string{
				`192.168.1.1 - - [01/Jan/2024:12:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"`,
			},
			expected: 1,
			wantErr:  false,
		},
		{
			name: "multiple valid log entries",
			input: []string{
				`192.168.1.1 - - [01/Jan/2024:12:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"`,
				`192.168.1.2 - - [01/Jan/2024:12:01:00 +0000] "POST /api/data HTTP/1.1" 201 567 "https://example.com" "Chrome/90.0"`,
			},
			expected: 2,
			wantErr:  false,
		},
		{
			name: "malformed log entry",
			input: []string{
				`this is not a valid log entry`,
			},
			expected: 0,
			wantErr:  false, // Malformed entries are skipped, not errors
		},
		{
			name: "mixed valid and invalid entries",
			input: []string{
				`192.168.1.1 - - [01/Jan/2024:12:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"`,
				`invalid entry`,
				`192.168.1.2 - - [01/Jan/2024:12:01:00 +0000] "POST /api/data HTTP/1.1" 201 567 "https://example.com" "Chrome/90.0"`,
			},
			expected: 2,
			wantErr:  false,
		},
		{
			name:     "empty input",
			input:    []string{},
			expected: 0,
			wantErr:  false,
		},
		{
			name: "nginx proxy manager vcombined format (host:port prefix)",
			input: []string{
				`example.com:443 192.168.1.1 - - [01/Jan/2024:12:00:00 +0000] "GET /api/users HTTP/2.0" 200 1234 "https://example.com" "Mozilla/5.0"`,
			},
			expected: 1,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ParseNginxLogs(tt.input)

			if len(result) != tt.expected {
				t.Errorf("ParseNginxLogs() returned %d logs, expected %d", len(result), tt.expected)
			}

			// Validate first log entry structure if we expect results
			if tt.expected > 0 && len(result) > 0 {
				log := result[0]
				if log.IPAddress == "" {
					t.Error("Expected IPAddress to be set")
				}
				if log.Timestamp == nil {
					t.Error("Expected Timestamp to be set")
				}
				if log.Method == "" {
					t.Error("Expected Method to be set")
				}
				if log.Path == "" {
					t.Error("Expected Path to be set")
				}
				if log.Status == nil {
					t.Error("Expected Status to be set")
				}
			}
		})
	}
}

func TestParseNginxLogsFieldExtraction(t *testing.T) {
	input := []string{
		`10.0.0.1 - - [15/Mar/2024:10:30:45 +0000] "GET /api/endpoint HTTP/1.1" 404 2048 "https://referrer.com" "TestAgent/1.0"`,
	}

	result := ParseNginxLogs(input)

	if len(result) != 1 {
		t.Fatalf("Expected 1 log entry, got %d", len(result))
	}

	log := result[0]

	// Test IP address
	if log.IPAddress != "10.0.0.1" {
		t.Errorf("Expected IPAddress '10.0.0.1', got '%s'", log.IPAddress)
	}

	// Test method
	if log.Method != "GET" {
		t.Errorf("Expected Method 'GET', got '%s'", log.Method)
	}

	// Test path
	if log.Path != "/api/endpoint" {
		t.Errorf("Expected Path '/api/endpoint', got '%s'", log.Path)
	}

	// Test HTTP version
	if log.HTTPVersion != "HTTP/1.1" {
		t.Errorf("Expected HTTPVersion 'HTTP/1.1', got '%s'", log.HTTPVersion)
	}

	// Test status code
	if log.Status == nil {
		t.Fatal("Expected Status to be set")
	}
	if *log.Status != 404 {
		t.Errorf("Expected Status 404, got %d", *log.Status)
	}

	// Test response size
	if log.ResponseSize == nil {
		t.Fatal("Expected ResponseSize to be set")
	}
	if *log.ResponseSize != 2048 {
		t.Errorf("Expected ResponseSize 2048, got %d", *log.ResponseSize)
	}

	// Test referrer
	if log.Referrer != "https://referrer.com" {
		t.Errorf("Expected Referrer 'https://referrer.com', got '%s'", log.Referrer)
	}

	// Test user agent
	if log.UserAgent != "TestAgent/1.0" {
		t.Errorf("Expected UserAgent 'TestAgent/1.0', got '%s'", log.UserAgent)
	}
}

func TestParseDate(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		wantNil   bool
		wantYear  int
		wantMonth time.Month
		wantDay   int
	}{
		{
			name:      "valid nginx date format",
			input:     "01/Jan/2024:12:00:00 +0000",
			wantNil:   false,
			wantYear:  2024,
			wantMonth: time.January,
			wantDay:   1,
		},
		{
			name:      "valid date with different timezone",
			input:     "15/Mar/2024:10:30:45 -0500",
			wantNil:   false,
			wantYear:  2024,
			wantMonth: time.March,
			wantDay:   15,
		},
		{
			name:    "empty string",
			input:   "",
			wantNil: true,
		},
		{
			name:    "invalid format",
			input:   "not a date",
			wantNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseDate(tt.input)

			if tt.wantNil {
				if result != nil {
					t.Errorf("Expected nil result, got %v", result)
				}
				return
			}

			if result == nil {
				t.Fatal("Expected non-nil result")
			}

			if result.Year() != tt.wantYear {
				t.Errorf("Expected year %d, got %d", tt.wantYear, result.Year())
			}
			if result.Month() != tt.wantMonth {
				t.Errorf("Expected month %s, got %s", tt.wantMonth, result.Month())
			}
			if result.Day() != tt.wantDay {
				t.Errorf("Expected day %d, got %d", tt.wantDay, result.Day())
			}
		})
	}
}

func TestParseIntPtr(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected *int
	}{
		{
			name:     "valid integer",
			input:    "200",
			expected: intPtr(200),
		},
		{
			name:     "zero",
			input:    "0",
			expected: intPtr(0),
		},
		{
			name:     "large number",
			input:    "1234567",
			expected: intPtr(1234567),
		},
		{
			name:     "empty string",
			input:    "",
			expected: nil,
		},
		{
			name:     "invalid string",
			input:    "abc",
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseIntPtr(tt.input)

			if tt.expected == nil {
				if result != nil {
					t.Errorf("Expected nil, got %v", *result)
				}
				return
			}

			if result == nil {
				t.Fatalf("Expected %d, got nil", *tt.expected)
			}

			if *result != *tt.expected {
				t.Errorf("Expected %d, got %d", *tt.expected, *result)
			}
		})
	}
}

func TestParseNginxErrors(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected int
	}{
		{
			name: "valid error log entry",
			input: []string{
				`2024/01/15 10:30:45 [error] 12345#0: *1 connect() failed (111: Connection refused)`,
			},
			expected: 1,
		},
		{
			name: "multiple error entries",
			input: []string{
				`2024/01/15 10:30:45 [error] 12345#0: *1 connect() failed (111: Connection refused)`,
				`2024/01/15 10:31:00 [warn] 12345#0: *2 upstream server temporarily disabled`,
			},
			expected: 2,
		},
		{
			name:     "empty input",
			input:    []string{},
			expected: 0,
		},
		{
			name: "blank lines",
			input: []string{
				``,
				`   `,
			},
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ParseNginxErrors(tt.input)

			if len(result) != tt.expected {
				t.Errorf("ParseNginxErrors() returned %d errors, expected %d", len(result), tt.expected)
			}

			// Validate first error entry if we expect results
			if tt.expected > 0 && len(result) > 0 {
				err := result[0]
				if err.Level == "" {
					t.Error("Expected Level to be set")
				}
				if err.PID == 0 {
					t.Error("Expected PID to be set")
				}
			}
		})
	}
}

// Helper function to create int pointer
func intPtr(i int) *int {
	return &i
}

// Benchmark tests
func BenchmarkParseNginxLogs(b *testing.B) {
	input := []string{
		`192.168.1.1 - - [01/Jan/2024:12:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"`,
		`192.168.1.2 - - [01/Jan/2024:12:01:00 +0000] "POST /api/data HTTP/1.1" 201 567 "https://example.com" "Chrome/90.0"`,
		`192.168.1.3 - - [01/Jan/2024:12:02:00 +0000] "GET /api/status HTTP/1.1" 200 89 "https://example.com" "Safari/14.0"`,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ParseNginxLogs(input)
	}
}

func BenchmarkParseNginxErrors(b *testing.B) {
	input := []string{
		`2024/01/15 10:30:45 [error] 12345#0: *1 connect() failed (111: Connection refused)`,
		`2024/01/15 10:31:00 [warn] 12345#0: *2 upstream server temporarily disabled`,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ParseNginxErrors(input)
	}
}
