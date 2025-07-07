package useragent

import (
	"strings"
	"sync"
)

type DeviceCandidate struct {
	Name     string
	Pattern  string
	Matches  uint64
}

type DeviceDetector struct {
	candidates []DeviceCandidate
	mu         sync.RWMutex
}

func NewDeviceDetector() *DeviceDetector {
	candidates := []DeviceCandidate{
		{"iPhone", "iPhone", 0},
		{"Android", "Android", 0},
		{"Samsung", "Tizen/", 0},
		{"Mac", "Macintosh", 0},
		{"Windows", "Windows", 0},
	}

	return &DeviceDetector{
		candidates: candidates,
	}
}

func (d *DeviceDetector) GetDevice(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	for i := range d.candidates {
		candidate := &d.candidates[i]
		
		if strings.Contains(userAgent, candidate.Pattern) {
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

func (d *DeviceDetector) GetDeviceConcurrent(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	// First, try read-only check
	d.mu.RLock()
	for _, candidate := range d.candidates {
		if strings.Contains(userAgent, candidate.Pattern) {
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

func (d *DeviceDetector) GetStats() map[string]uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	stats := make(map[string]uint64)
	for _, candidate := range d.candidates {
		stats[candidate.Name] = candidate.Matches
	}
	return stats
}

type FastDeviceDetector struct {
	mobilePatterns  []DeviceCandidate
	desktopPatterns []DeviceCandidate
	mu              sync.RWMutex
}

func NewFastDeviceDetector() *FastDeviceDetector {
	mobilePatterns := []DeviceCandidate{
		{"iPhone", "iPhone", 0},
		{"Android", "Android", 0},
		{"Samsung", "Tizen/", 0},
	}

	desktopPatterns := []DeviceCandidate{
		{"Windows", "Windows", 0},
		{"Mac", "Macintosh", 0},
	}

	return &FastDeviceDetector{
		mobilePatterns:  mobilePatterns,
		desktopPatterns: desktopPatterns,
	}
}

func (d *FastDeviceDetector) GetDevice(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	// Check mobile patterns first (more common in modern traffic)
	for i := range d.mobilePatterns {
		candidate := &d.mobilePatterns[i]
		if strings.Contains(userAgent, candidate.Pattern) {
			candidate.Matches++
			// Auto-sort by moving popular patterns forward
			if i > 0 && candidate.Matches > d.mobilePatterns[i-1].Matches {
				d.mobilePatterns[i-1], d.mobilePatterns[i] = d.mobilePatterns[i], d.mobilePatterns[i-1]
			}
			return candidate.Name
		}
	}

	// Check desktop patterns
	for i := range d.desktopPatterns {
		candidate := &d.desktopPatterns[i]
		if strings.Contains(userAgent, candidate.Pattern) {
			candidate.Matches++
			// Auto-sort by moving popular patterns forward
			if i > 0 && candidate.Matches > d.desktopPatterns[i-1].Matches {
				d.desktopPatterns[i-1], d.desktopPatterns[i] = d.desktopPatterns[i], d.desktopPatterns[i-1]
			}
			return candidate.Name
		}
	}

	return "Other"
}

func (d *FastDeviceDetector) GetStats() map[string]uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	stats := make(map[string]uint64)
	
	for _, candidate := range d.mobilePatterns {
		stats[candidate.Name] = candidate.Matches
	}
	
	for _, candidate := range d.desktopPatterns {
		stats[candidate.Name] = candidate.Matches
	}
	
	return stats
}

type InlineDeviceDetector struct {
	iphoneMatches  uint64
	androidMatches uint64
	samsungMatches uint64
	macMatches     uint64
	windowsMatches uint64
	mu             sync.RWMutex
}

func NewInlineDeviceDetector() *InlineDeviceDetector {
	return &InlineDeviceDetector{}
}

func (d *InlineDeviceDetector) GetDevice(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	// Inline checks for maximum performance - no loops, no indirection
	if strings.Contains(userAgent, "iPhone") {
		d.iphoneMatches++
		return "iPhone"
	}
	if strings.Contains(userAgent, "Android") {
		d.androidMatches++
		return "Android"
	}
	if strings.Contains(userAgent, "Tizen/") {
		d.samsungMatches++
		return "Samsung"
	}
	if strings.Contains(userAgent, "Macintosh") {
		d.macMatches++
		return "Mac"
	}
	if strings.Contains(userAgent, "Windows") {
		d.windowsMatches++
		return "Windows"
	}

	return "Other"
}

func (d *InlineDeviceDetector) GetStats() map[string]uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	return map[string]uint64{
		"iPhone":  d.iphoneMatches,
		"Android": d.androidMatches,
		"Samsung": d.samsungMatches,
		"Mac":     d.macMatches,
		"Windows": d.windowsMatches,
	}
}
