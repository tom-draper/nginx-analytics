package version

import (
	"sync"
	"testing"
)

// TestInlineVersionDetector_BasicVersions tests common API version patterns
func TestInlineVersionDetector_BasicVersions(t *testing.T) {
	detector := NewInlineVersionDetector()

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		// API prefix patterns
		{"API v1", "/api/v1/users", "v1"},
		{"API v2", "/api/v2/posts", "v2"},
		{"API v3", "/api/v3/products", "v3"},
		{"API v4", "/api/v4/orders", "v4"},
		{"API v5", "/api/v5/items", "v5"},

		// Direct version patterns
		{"Direct v1", "/v1/users", "v1"},
		{"Direct v2", "/v2/posts", "v2"},
		{"Direct v3", "/v3/products", "v3"},

		// Decimal versions
		{"Decimal v1.0", "/api/v1.0/users", "v1.0"},
		{"Decimal v1.1", "/api/v1.1/users", "v1.1"},
		{"Decimal v2.0", "/api/v2.0/posts", "v2.0"},
		{"Decimal v2.5", "/api/v2.5/posts", "v2.5"},
		{"Decimal v3.14", "/v3.14/items", "v3.14"},

		// No version
		{"No version", "/users", ""},
		{"No version with api", "/api/users", ""},
		{"Empty path", "", ""},

		// Edge cases
		{"Version at end", "/api/v1", "v1"},
		{"Multiple versions uses first", "/api/v1/v2/users", "v1"},
		{"Version with query params", "/api/v2/users?id=1", "v2"},
		{"Version in middle", "/prefix/api/v1/users", "v1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetVersion(tt.path)
			if result != tt.expected {
				t.Errorf("GetVersion(%q) = %q, want %q", tt.path, result, tt.expected)
			}
		})
	}
}

// TestInlineVersionDetector_StatsTracking tests that stats are properly tracked
func TestInlineVersionDetector_StatsTracking(t *testing.T) {
	detector := NewInlineVersionDetector()

	// Call multiple times
	detector.GetVersion("/api/v1/users")
	detector.GetVersion("/api/v1/posts")
	detector.GetVersion("/api/v2/items")
	detector.GetVersion("/v3.5/products")
	detector.GetVersion("/api/v1/orders")

	stats := detector.GetStats()

	// Check v1 was called 3 times
	if stats["v1"] != 3 {
		t.Errorf("Expected v1 count to be 3, got %d", stats["v1"])
	}

	// Check v2 was called 1 time
	if stats["v2"] != 1 {
		t.Errorf("Expected v2 count to be 1, got %d", stats["v2"])
	}

	// Check v3.5 was called 1 time
	if stats["v3.5"] != 1 {
		t.Errorf("Expected v3.5 count to be 1, got %d", stats["v3.5"])
	}
}

// TestInlineVersionDetector_Concurrent tests thread safety
func TestInlineVersionDetector_Concurrent(t *testing.T) {
	detector := NewInlineVersionDetector()

	var wg sync.WaitGroup
	iterations := 1000

	// Start multiple goroutines making concurrent calls
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				detector.GetVersion("/api/v1/users")
			}
		}()
	}

	wg.Wait()

	stats := detector.GetStats()
	expected := uint64(10 * iterations)
	if stats["v1"] != expected {
		t.Errorf("Expected v1 count to be %d, got %d", expected, stats["v1"])
	}
}

// TestFastVersionDetector_BasicVersions tests FastVersionDetector
func TestFastVersionDetector_BasicVersions(t *testing.T) {
	detector := NewFastVersionDetector()

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"API v1", "/api/v1/users", "v1"},
		{"API v2", "/api/v2/posts", "v2"},
		{"Direct v1", "/v1/users", "v1"},
		{"Version keyword", "/version/1/users", "v1"},
		{"Version with decimal", "/api/v1.5/users", "v1.5"},
		{"No version", "/users", ""},
		{"Empty path", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetVersion(tt.path)
			if result != tt.expected {
				t.Errorf("GetVersion(%q) = %q, want %q", tt.path, result, tt.expected)
			}
		})
	}
}

// TestFastVersionDetector_Stats tests stats tracking
func TestFastVersionDetector_Stats(t *testing.T) {
	detector := NewFastVersionDetector()

	detector.GetVersion("/api/v1/users")
	detector.GetVersion("/api/v1/posts")
	detector.GetVersion("/v2/items")

	stats := detector.GetStats()

	if stats["v1"] != 2 {
		t.Errorf("Expected v1 count to be 2, got %d", stats["v1"])
	}

	if stats["v2"] != 1 {
		t.Errorf("Expected v2 count to be 1, got %d", stats["v2"])
	}
}

// TestVersionDetector_BasicVersions tests the original VersionDetector
func TestVersionDetector_BasicVersions(t *testing.T) {
	detector := NewVersionDetector()

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"API v1", "/api/v1/users", "v1"},
		{"API v2", "/api/v2/posts", "v2"},
		{"Direct v1", "/v1/users", "v1"},
		{"Decimal v1.0", "/api/v1.0/users", "v1.0"},
		{"Decimal v2.1", "/v2.1/posts", "v2.1"},
		{"No version", "/users", ""},
		{"Empty path", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetVersion(tt.path)
			if result != tt.expected {
				t.Errorf("GetVersion(%q) = %q, want %q", tt.path, result, tt.expected)
			}
		})
	}
}

// TestVersionDetector_DynamicPatterns tests regex-based dynamic patterns
func TestVersionDetector_DynamicPatterns(t *testing.T) {
	detector := NewVersionDetector()

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"Dynamic v6", "/api/v6/users", "v6"},
		{"Dynamic v7.5", "/api/v7.5/posts", "v7.5"},
		{"Dynamic v10", "/v10/items", "v10"},
		{"Version keyword v5", "/version/5/users", "v5"},
		{"Version keyword v5.2", "/version/5.2/users", "v5.2"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetVersion(tt.path)
			if result != tt.expected {
				t.Errorf("GetVersion(%q) = %q, want %q", tt.path, result, tt.expected)
			}
		})
	}
}

// TestHTTPVersionExtractor_FromURL tests URL extraction
func TestHTTPVersionExtractor_FromURL(t *testing.T) {
	extractor := NewHTTPVersionExtractor()

	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{"Full URL v1", "https://api.example.com/api/v1/users", "v1"},
		{"Full URL v2", "http://example.com/v2/posts", "v2"},
		{"Path only", "/api/v3/items", "v3"},
		{"URL with port", "https://api.example.com:8080/api/v1/users", "v1"},
		{"URL with query", "https://api.example.com/api/v2/users?id=1", "v2"},
		{"No version in URL", "https://api.example.com/users", ""},
		{"No path", "https://api.example.com", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractor.ExtractFromURL(tt.url)
			if result != tt.expected {
				t.Errorf("ExtractFromURL(%q) = %q, want %q", tt.url, result, tt.expected)
			}
		})
	}
}

// TestHTTPVersionExtractor_FromRequest tests request path extraction
func TestHTTPVersionExtractor_FromRequest(t *testing.T) {
	extractor := NewHTTPVersionExtractor()

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"Request v1", "/api/v1/users", "v1"},
		{"Request v2", "/v2/posts", "v2"},
		{"Request with query", "/api/v3/items?sort=name", "v3"},
		{"No version", "/users", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractor.ExtractFromRequest(tt.path)
			if result != tt.expected {
				t.Errorf("ExtractFromRequest(%q) = %q, want %q", tt.path, result, tt.expected)
			}
		})
	}
}

// TestVersionDetector_EdgeCases tests edge cases and boundary conditions
func TestVersionDetector_EdgeCases(t *testing.T) {
	detector := NewInlineVersionDetector()

	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"Just /v", "/v", ""},
		{"Just /api/v", "/api/v", ""},
		{"Version with letters", "/api/vabc/users", ""},
		{"Version at very end", "/api/v1", "v1"},
		{"Multiple dots", "/api/v1.2.3/users", "v1.2.3"},
		{"Trailing slash", "/api/v1/", "v1"},
		{"No leading slash", "api/v1/users", "v1"},
		{"Unicode path", "/api/v1/用户", "v1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetVersion(tt.path)
			if result != tt.expected {
				t.Errorf("GetVersion(%q) = %q, want %q", tt.path, result, tt.expected)
			}
		})
	}
}

// BenchmarkInlineVersionDetector benchmarks the most optimized detector
func BenchmarkInlineVersionDetector(b *testing.B) {
	detector := NewInlineVersionDetector()
	path := "/api/v1/users"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetVersion(path)
	}
}

// BenchmarkFastVersionDetector benchmarks the fast detector
func BenchmarkFastVersionDetector(b *testing.B) {
	detector := NewFastVersionDetector()
	path := "/api/v1/users"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetVersion(path)
	}
}

// BenchmarkVersionDetector benchmarks the original detector
func BenchmarkVersionDetector(b *testing.B) {
	detector := NewVersionDetector()
	path := "/api/v1/users"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetVersion(path)
	}
}

// BenchmarkInlineVersionDetector_DecimalVersion benchmarks decimal version extraction
func BenchmarkInlineVersionDetector_DecimalVersion(b *testing.B) {
	detector := NewInlineVersionDetector()
	path := "/api/v1.5/users"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetVersion(path)
	}
}
