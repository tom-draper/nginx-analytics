package useragent

import (
	"regexp"
	"strings"
	"sync"
)

type OSCandidate struct {
	Name     string
	Pattern  string
	IsRegex  bool
	Regex    *regexp.Regexp
	Matches  uint64
}

type OSDetector struct {
	candidates []OSCandidate
	mu         sync.RWMutex
}

func NewOSDetector() *OSDetector {
	candidates := []OSCandidate{
		// Simple string patterns (fastest)
		{"Windows 3.11", "Win16", false, nil, 0},
		{"Windows ME", "Windows ME", false, nil, 0},
		{"OpenBSD", "OpenBSD", false, nil, 0},
		{"SunOS", "SunOS", false, nil, 0},
		{"Android", "Android", false, nil, 0},
		{"QNX", "QNX", false, nil, 0},
		{"iOS", "iPhone OS", false, nil, 0},
		{"BeOS", "BeOS", false, nil, 0},
		{"Windows NT 5.0", "Windows NT 5.0", false, nil, 0}, // Windows 2000 priority check
		{"Windows 2000", "Windows 2000", false, nil, 0},
		{"Windows NT 5.1", "Windows NT 5.1", false, nil, 0}, // Windows XP priority check
		{"Windows XP", "Windows XP", false, nil, 0},
		{"Windows NT 5.2", "Windows NT 5.2", false, nil, 0}, // Windows Server 2003
		{"Windows NT 6.0", "Windows NT 6.0", false, nil, 0}, // Windows Vista
		{"Windows NT 6.1", "Windows NT 6.1", false, nil, 0}, // Windows 7
		{"Windows NT 6.2", "Windows NT 6.2", false, nil, 0}, // Windows 8
		{"Windows NT 10.0", "Windows NT 10.0", false, nil, 0}, // Windows 10/11
		
		// Complex regex patterns (slower but necessary)
		{"Windows 95", "", true, regexp.MustCompile(`(Windows 95)|(Win95)|(Windows_95)`), 0},
		{"Windows 98", "", true, regexp.MustCompile(`(Windows 98)|(Win98)`), 0},
		{"Windows 2000", "", true, regexp.MustCompile(`(Windows NT 5\.0)|(Windows 2000)`), 0},
		{"Windows XP", "", true, regexp.MustCompile(`(Windows NT 5\.1)|(Windows XP)`), 0},
		{"Windows Server 2003", "", true, regexp.MustCompile(`Windows NT 5\.2`), 0},
		{"Windows Vista", "", true, regexp.MustCompile(`Windows NT 6\.0`), 0},
		{"Windows 7", "", true, regexp.MustCompile(`Windows NT 6\.1`), 0},
		{"Windows 8", "", true, regexp.MustCompile(`Windows NT 6\.2`), 0},
		{"Windows 10/11", "", true, regexp.MustCompile(`Windows NT 10\.0`), 0},
		{"Windows NT 4.0", "", true, regexp.MustCompile(`(Windows NT 4\.0)|(WinNT4\.0)|(WinNT)|(Windows NT)`), 0},
		{"Linux", "", true, regexp.MustCompile(`(Linux)|(X11)`), 0},
		{"MacOS", "", true, regexp.MustCompile(`(Mac_PowerPC)|(Macintosh)`), 0},
		{"OS/2", "", true, regexp.MustCompile(`OS/2`), 0},
		{"Search Bot", "", true, regexp.MustCompile(`(APIs-Google)|(AdsBot)|(nuhk)|(Googlebot)|(Storebot)|(Google-Site-Verification)|(Mediapartners)|(Yammybot)|(Openbot)|(Slurp)|(MSNBot)|(Ask Jeeves/Teoma)|(ia_archiver)`), 0},
	}

	return &OSDetector{
		candidates: candidates,
	}
}

func (d *OSDetector) GetOS(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	for i := range d.candidates {
		candidate := &d.candidates[i]
		
		var matched bool
		if candidate.IsRegex {
			matched = candidate.Regex.MatchString(userAgent)
		} else {
			matched = strings.Contains(userAgent, candidate.Pattern)
		}

		if matched {
			candidate.Matches++
			// Simple bubble-up optimization
			if i > 0 && candidate.Matches > d.candidates[i-1].Matches {
				d.candidates[i-1], d.candidates[i] = d.candidates[i], d.candidates[i-1]
			}
			return candidate.Name
		}
	}

	return "Other"
}

func (d *OSDetector) GetOSConcurrent(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	// First, try read-only check
	d.mu.RLock()
	for _, candidate := range d.candidates {
		var matched bool
		if candidate.IsRegex {
			matched = candidate.Regex.MatchString(userAgent)
		} else {
			matched = strings.Contains(userAgent, candidate.Pattern)
		}
		
		if matched {
			name := candidate.Name
			d.mu.RUnlock()
			// Now acquire write lock to update counter
			d.mu.Lock()
			// Find the candidate again (index might have changed)
			for i := range d.candidates {
				if d.candidates[i].Name == name {
					d.candidates[i].Matches++
					break
				}
			}
			d.mu.Unlock()
			return name
		}
	}
	d.mu.RUnlock()

	return "Other"
}

func (d *OSDetector) GetStats() map[string]uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	stats := make(map[string]uint64)
	for _, candidate := range d.candidates {
		stats[candidate.Name] = candidate.Matches
	}
	return stats
}

type OptimizedOSDetector struct {
	windowsDetector *WindowsDetector
	commonOS        []OSCandidate
	complexOS       []OSCandidate
	mu              sync.RWMutex
}

type WindowsDetector struct {
	versions []WindowsVersion
}

type WindowsVersion struct {
	Name    string
	Pattern string
	Matches uint64
}

func NewOptimizedOSDetector() *OptimizedOSDetector {
	windowsDetector := &WindowsDetector{
		versions: []WindowsVersion{
			{"Windows 10/11", "Windows NT 10.0", 0},
			{"Windows 8", "Windows NT 6.2", 0},
			{"Windows 7", "Windows NT 6.1", 0},
			{"Windows Vista", "Windows NT 6.0", 0},
			{"Windows XP", "Windows NT 5.1", 0},
			{"Windows 2000", "Windows NT 5.0", 0},
			{"Windows Server 2003", "Windows NT 5.2", 0},
			{"Windows NT 4.0", "Windows NT 4.0", 0},
			{"Windows ME", "Windows ME", 0},
			{"Windows 98", "Windows 98", 0},
			{"Windows 95", "Windows 95", 0},
			{"Windows 3.11", "Win16", 0},
		},
	}

	commonOS := []OSCandidate{
		{"Android", "Android", false, nil, 0},
		{"iOS", "iPhone OS", false, nil, 0},
		{"Linux", "Linux", false, nil, 0},
		{"OpenBSD", "OpenBSD", false, nil, 0},
		{"SunOS", "SunOS", false, nil, 0},
		{"QNX", "QNX", false, nil, 0},
		{"BeOS", "BeOS", false, nil, 0},
	}

	complexOS := []OSCandidate{
		{"MacOS", "", true, regexp.MustCompile(`(Mac_PowerPC)|(Macintosh)`), 0},
		{"OS/2", "", true, regexp.MustCompile(`OS/2`), 0},
		{"Search Bot", "", true, regexp.MustCompile(`(APIs-Google)|(AdsBot)|(nuhk)|(Googlebot)|(Storebot)|(Google-Site-Verification)|(Mediapartners)|(Yammybot)|(Openbot)|(Slurp)|(MSNBot)|(Ask Jeeves/Teoma)|(ia_archiver)`), 0},
	}

	return &OptimizedOSDetector{
		windowsDetector: windowsDetector,
		commonOS:        commonOS,
		complexOS:       complexOS,
	}
}

func (d *OptimizedOSDetector) GetOS(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	// Check Windows first (most common desktop OS)
	if strings.Contains(userAgent, "Windows") {
		for i := range d.windowsDetector.versions {
			version := &d.windowsDetector.versions[i]
			if strings.Contains(userAgent, version.Pattern) {
				version.Matches++
				return version.Name
			}
		}
		// Fallback for unrecognized Windows versions
		return "Windows"
	}

	// Check common mobile/Unix OS
	for i := range d.commonOS {
		candidate := &d.commonOS[i]
		if strings.Contains(userAgent, candidate.Pattern) {
			candidate.Matches++
			return candidate.Name
		}
	}

	// Check complex patterns
	for i := range d.complexOS {
		candidate := &d.complexOS[i]
		if candidate.Regex.MatchString(userAgent) {
			candidate.Matches++
			return candidate.Name
		}
	}

	return "Other"
}