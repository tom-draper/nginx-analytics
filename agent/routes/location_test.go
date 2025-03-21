package routes

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInitializeLookups(t *testing.T) {
	// Ensure that the GeoIP databases are loaded successfully
	err := InitializeLookups()
	if err != nil {
		t.Fatalf("Failed to initialize lookups: %v", err)
	}
}

func TestLocationLookup_InvalidIP(t *testing.T) {
	// Test invalid IP address format
	ip := "invalid-ip"
	location, err := LocationLookup(ip)
	if err != nil {
		t.Fatalf("Expected no error for invalid IP lookup, but got: %v", err)
	}

	if location.IPAddress != ip {
		t.Errorf("Expected IP address to be %v, but got: %v", ip, location.IPAddress)
	}
	if location.Country != "" {
		t.Errorf("Expected no country for invalid IP, but got: %v", location.Country)
	}
	if location.City != "" {
		t.Errorf("Expected no city for invalid IP, but got: %v", location.City)
	}
}

func TestLocationLookup_ValidIP(t *testing.T) {
	// You should use a known IP address for a valid test (example: 8.8.8.8 for Google DNS)
	ip := "8.8.8.8"
	location, err := LocationLookup(ip)
	if err != nil {
		t.Fatalf("Failed to look up valid IP address: %v", err)
	}

	if location.IPAddress != ip {
		t.Errorf("Expected IP address to be %v, but got: %v", ip, location.IPAddress)
	}
	if location.Country == "" {
		t.Errorf("Expected a country code, but got empty: %v", location.Country)
	}
	if location.City == "" {
		t.Errorf("Expected a city, but got empty: %v", location.City)
	}
}

func TestServeLocations(t *testing.T) {
	// Create a new request with a valid IP addresses
	ipAddresses := []string{"8.8.8.8", "8.8.4.4"}

	body, err := json.Marshal(ipAddresses)
	if err != nil {
		t.Fatalf("Failed to marshal IP addresses: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/locations", bytes.NewReader(body))
	// Create a ResponseRecorder to record the response
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(ServeLocations)

	// Serve the request
	handler.ServeHTTP(rr, req)

	// Check if the status code is what we expect
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Expected status %v, but got %v", http.StatusOK, status)
	}

	// Check the response body contains the locations
	var locations []*Location
	if err := json.NewDecoder(rr.Body).Decode(&locations); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(locations) != len(ipAddresses) {
		t.Errorf("Expected %v locations, but got %v", len(ipAddresses), len(locations))
	}
}

func TestLocationsEnabled(t *testing.T) {
	// Test the LocationsEnabled function
	if !LocationsEnabled() {
		t.Fatalf("LocationsEnabled should return true when databases are initialized")
	}
}

func TestGetLocations(t *testing.T) {
	// Test getting locations for multiple IPs
	ipAddresses := []string{"8.8.8.8", "8.8.4.4", "1.1.1.1"}
	locations, err := GetLocations(ipAddresses)
	if err != nil {
		t.Fatalf("Failed to get locations for multiple IPs: %v", err)
	}

	if len(locations) != len(ipAddresses) {
		t.Errorf("Expected %v locations, but got %v", len(ipAddresses), len(locations))
	}

	// Verify that each location has an IP address
	for i, location := range locations {
		if location.IPAddress != ipAddresses[i] {
			t.Errorf("Expected IP address %v, but got %v", ipAddresses[i], location.IPAddress)
		}
	}
}

func TestClose(t *testing.T) {
	// Test the Close function
	Close() // This should close any open readers without error
}
