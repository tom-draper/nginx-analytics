package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestIsAuthenticated(t *testing.T) {
	t.Setenv("AUTH_TOKEN", "testtoken")  // Set test authentication token
	authToken := os.Getenv("AUTH_TOKEN") // Load token into global variable

	tests := []struct {
		name     string
		header   string
		expected bool
	}{
		{"Valid Token", "Bearer testtoken", true},
		{"Invalid Token", "Bearer wrongtoken", false},
		{"Missing Bearer Prefix", "testtoken", false},
		{"Empty Token", "Bearer ", false},
		{"No Authorization Header", "", false},
	}

	for _, tc := range tests {
		r := httptest.NewRequest("GET", "/", nil)
		if tc.header != "" {
			r.Header.Set("Authorization", tc.header)
		}

		result := isAuthenticated(r, authToken)
		if result != tc.expected {
			t.Errorf("%s: expected %v, got %v", tc.name, tc.expected, result)
		}
	}
}

func TestAccessLogEndpoint(t *testing.T) {
	t.Setenv("AUTH_TOKEN", "testtoken")
	authToken := os.Getenv("AUTH_TOKEN")

	req := httptest.NewRequest("GET", "/access", nil)
	req.Header.Set("Authorization", "Bearer testtoken")

	w := httptest.NewRecorder()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isAuthenticated(r, authToken) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Log Streaming Started"))
	})

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "Log Streaming Started") {
		t.Errorf("Unexpected response body: %s", w.Body.String())
	}
}

func TestAccessLogForbidden(t *testing.T) {
	t.Setenv("AUTH_TOKEN", "testtoken")
	authToken := os.Getenv("AUTH_TOKEN") // Load token into global variable

	req := httptest.NewRequest("GET", "/access", nil)
	req.Header.Set("Authorization", "Bearer wrongtoken")

	w := httptest.NewRecorder()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isAuthenticated(r, authToken) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}
