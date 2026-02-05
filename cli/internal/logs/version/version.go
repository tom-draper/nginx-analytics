package version

import (
	"regexp"
	"strings"
	"sync"
)

type VersionCandidate struct {
	Name    string
	Pattern string
	IsRegex bool
	Regex   *regexp.Regexp
	Matches uint64
}

type VersionDetector struct {
	candidates []VersionCandidate
	mu         sync.RWMutex
}

func NewVersionDetector() *VersionDetector {
	candidates := []VersionCandidate{
		// Common API versioning patterns
		{"v1", "/v1/", false, nil, 0},
		{"v2", "/v2/", false, nil, 0},
		{"v3", "/v3/", false, nil, 0},
		{"v4", "/v4/", false, nil, 0},
		{"v5", "/v5/", false, nil, 0},
		{"v1.0", "/v1.0/", false, nil, 0},
		{"v1.1", "/v1.1/", false, nil, 0},
		{"v2.0", "/v2.0/", false, nil, 0},
		{"v2.1", "/v2.1/", false, nil, 0},
		{"v3.0", "/v3.0/", false, nil, 0},
		
		// API prefix patterns
		{"v1", "/api/v1/", false, nil, 0},
		{"v2", "/api/v2/", false, nil, 0},
		{"v3", "/api/v3/", false, nil, 0},
		{"v4", "/api/v4/", false, nil, 0},
		{"v5", "/api/v5/", false, nil, 0},
		{"v1.0", "/api/v1.0/", false, nil, 0},
		{"v1.1", "/api/v1.1/", false, nil, 0},
		{"v2.0", "/api/v2.0/", false, nil, 0},
		{"v2.1", "/api/v2.1/", false, nil, 0},
		{"v3.0", "/api/v3.0/", false, nil, 0},
		
		// Complex patterns that need regex
		{"dynamic", "", true, regexp.MustCompile(`/api/v(\d+)(?:\.(\d+))?/`), 0},
		{"dynamic", "", true, regexp.MustCompile(`/v(\d+)(?:\.(\d+))?/`), 0},
		{"version", "", true, regexp.MustCompile(`/version/(\d+)(?:\.(\d+))?/`), 0},
		{"api", "", true, regexp.MustCompile(`/api/(\d+)(?:\.(\d+))?/`), 0},
	}

	return &VersionDetector{
		candidates: candidates,
	}
}

func (d *VersionDetector) GetVersion(path string) string {
	if path == "" {
		return ""
	}

	// Use write lock since we're updating match counts
	d.mu.Lock()
	defer d.mu.Unlock()

	for i := range d.candidates {
		candidate := &d.candidates[i]

		if candidate.IsRegex {
			matches := candidate.Regex.FindStringSubmatch(path)
			if len(matches) > 1 {
				// Extract version from regex groups
				version := "v" + matches[1]
				if len(matches) > 2 && matches[2] != "" {
					version += "." + matches[2]
				}
				candidate.Matches++
				return version
			}
		} else {
			if strings.Contains(path, candidate.Pattern) {
				candidate.Matches++
				return candidate.Name
			}
		}
	}

	return ""
}

// FastVersionDetector - Optimized for common API patterns
type FastVersionDetector struct {
	versionStats map[string]uint64
	mu           sync.RWMutex
}

func NewFastVersionDetector() *FastVersionDetector {
	return &FastVersionDetector{
		versionStats: make(map[string]uint64),
	}
}

func (d *FastVersionDetector) GetVersion(path string) string {
	if path == "" {
		return ""
	}

	version := d.extractVersionFast(path)
	
	if version != "" {
		d.mu.Lock()
		d.versionStats[version]++
		d.mu.Unlock()
	}
	
	return version
}

func (d *FastVersionDetector) extractVersionFast(path string) string {
	// Fast path for most common patterns
	if idx := strings.Index(path, "/api/v"); idx != -1 {
		return d.extractVersionFromIndex(path, idx+5) // Skip "/api/v"
	}
	
	if idx := strings.Index(path, "/v"); idx != -1 {
		return d.extractVersionFromIndex(path, idx+2) // Skip "/v"
	}
	
	if idx := strings.Index(path, "/version/"); idx != -1 {
		return d.extractVersionFromIndex(path, idx+9) // Skip "/version/"
	}
	
	return ""
}

func (d *FastVersionDetector) extractVersionFromIndex(path string, startIdx int) string {
	if startIdx >= len(path) {
		return ""
	}
	
	// Find the end of version string (next slash or end of string)
	endIdx := startIdx
	for endIdx < len(path) && path[endIdx] != '/' {
		endIdx++
	}
	
	if endIdx == startIdx {
		return ""
	}
	
	versionStr := path[startIdx:endIdx]
	
	// Validate it looks like a version (starts with digit)
	if len(versionStr) > 0 && versionStr[0] >= '0' && versionStr[0] <= '9' {
		return "v" + versionStr
	}
	
	return ""
}

func (d *FastVersionDetector) GetStats() map[string]uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()
	
	stats := make(map[string]uint64)
	for k, v := range d.versionStats {
		stats[k] = v
	}
	return stats
}

// InlineVersionDetector - Ultra-fast version for most common cases
type InlineVersionDetector struct {
	v1Matches  uint64
	v2Matches  uint64
	v3Matches  uint64
	v4Matches  uint64
	v5Matches  uint64
	otherStats map[string]uint64
	mu         sync.RWMutex
}

func NewInlineVersionDetector() *InlineVersionDetector {
	return &InlineVersionDetector{
		otherStats: make(map[string]uint64),
	}
}

func (d *InlineVersionDetector) GetVersion(path string) string {
	if path == "" {
		return ""
	}

	// Inline checks for maximum performance - most common first
	// Check patterns without lock for better performance
	var version string
	var matchType int // 1-5 for v1-v5, 6 for other

	if strings.Contains(path, "/api/v1/") || strings.Contains(path, "/v1/") {
		version = "v1"
		matchType = 1
	} else if strings.Contains(path, "/api/v2/") || strings.Contains(path, "/v2/") {
		version = "v2"
		matchType = 2
	} else if strings.Contains(path, "/api/v3/") || strings.Contains(path, "/v3/") {
		version = "v3"
		matchType = 3
	} else if strings.Contains(path, "/api/v4/") || strings.Contains(path, "/v4/") {
		version = "v4"
		matchType = 4
	} else if strings.Contains(path, "/api/v5/") || strings.Contains(path, "/v5/") {
		version = "v5"
		matchType = 5
	} else {
		// Handle decimal versions and dynamic extraction
		version = d.extractAdvancedVersion(path)
		if version != "" {
			matchType = 6
		}
	}

	// Only lock for the counter increment
	if version != "" {
		d.mu.Lock()
		switch matchType {
		case 1:
			d.v1Matches++
		case 2:
			d.v2Matches++
		case 3:
			d.v3Matches++
		case 4:
			d.v4Matches++
		case 5:
			d.v5Matches++
		case 6:
			d.otherStats[version]++
		}
		d.mu.Unlock()
		return version
	}

	return ""
}

func (d *InlineVersionDetector) extractAdvancedVersion(path string) string {
	// Dynamic extraction handles all version patterns (including decimals)
	if idx := strings.Index(path, "/api/v"); idx != -1 {
		return d.extractVersionFromPos(path, idx+5)
	}
	if idx := strings.Index(path, "/v"); idx != -1 {
		return d.extractVersionFromPos(path, idx+2)
	}

	return ""
}

func (d *InlineVersionDetector) extractVersionFromPos(path string, pos int) string {
	if pos >= len(path) {
		return ""
	}

	end := pos
	for end < len(path) && (path[end] >= '0' && path[end] <= '9' || path[end] == '.') {
		end++
	}

	if end == pos {
		return ""
	}

	return "v" + path[pos:end]
}

func (d *InlineVersionDetector) GetStats() map[string]uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()
	
	stats := map[string]uint64{
		"v1": d.v1Matches,
		"v2": d.v2Matches,
		"v3": d.v3Matches,
		"v4": d.v4Matches,
		"v5": d.v5Matches,
	}
	
	for k, v := range d.otherStats {
		stats[k] = v
	}
	
	return stats
}

// HTTPVersionExtractor - Real-world HTTP middleware integration
type HTTPVersionExtractor struct {
	detector *InlineVersionDetector
}

func NewHTTPVersionExtractor() *HTTPVersionExtractor {
	return &HTTPVersionExtractor{
		detector: NewInlineVersionDetector(),
	}
}

func (h *HTTPVersionExtractor) ExtractFromRequest(path string) string {
	return h.detector.GetVersion(path)
}

func (h *HTTPVersionExtractor) ExtractFromURL(url string) string {
	// Extract path from URL
	if idx := strings.Index(url, "://"); idx != -1 {
		url = url[idx+3:]
	}
	if idx := strings.Index(url, "/"); idx != -1 {
		path := url[idx:]
		return h.detector.GetVersion(path)
	}
	return ""
}

func (h *HTTPVersionExtractor) GetStats() map[string]uint64 {
	return h.detector.GetStats()
}