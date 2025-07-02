package useragent

import (
	"regexp"
	"strings"
	"sync"
)

type Candidate struct {
	Name    string
	Regex   *regexp.Regexp
	Matches uint64
}

type UserAgentDetector struct {
	candidates []*Candidate
	mu         sync.RWMutex
}

func NewUserAgentDetector() *UserAgentDetector {
	candidates := []*Candidate{
		{"Curl", regexp.MustCompile(`curl/`), 0},
		{"Postman", regexp.MustCompile(`PostmanRuntime/`), 0},
		{"Insomnia", regexp.MustCompile(`insomnia/`), 0},
		{"Python requests", regexp.MustCompile(`python-requests/`), 0},
		{"Nodejs fetch", regexp.MustCompile(`node-fetch/`), 0},
		{"Seamonkey", regexp.MustCompile(`Seamonkey/`), 0},
		{"Firefox", regexp.MustCompile(`Firefox/`), 0},
		{"Chrome", regexp.MustCompile(`Chrome/`), 0},
		{"Chromium", regexp.MustCompile(`Chromium/`), 0},
		{"aiohttp", regexp.MustCompile(`aiohttp/`), 0},
		{"Python", regexp.MustCompile(`Python/`), 0},
		{"Go http", regexp.MustCompile(`[Gg]o-http-client/`), 0},
		{"Java", regexp.MustCompile(`Java/`), 0},
		{"axios", regexp.MustCompile(`axios/`), 0},
		{"Dart", regexp.MustCompile(`Dart/`), 0},
		{"OkHttp", regexp.MustCompile(`OkHttp/`), 0},
		{"Uptime Kuma", regexp.MustCompile(`Uptime-Kuma/`), 0},
		{"undici", regexp.MustCompile(`undici/`), 0},
		{"Lush", regexp.MustCompile(`Lush/`), 0},
		{"Zabbix", regexp.MustCompile(`Zabbix`), 0},
		{"Guzzle", regexp.MustCompile(`GuzzleHttp/`), 0},
		{"Uptime", regexp.MustCompile(`Better Uptime`), 0},
		{"GitHub Camo", regexp.MustCompile(`github-camo`), 0},
		{"Ruby", regexp.MustCompile(`Ruby`), 0},
		{"Node.js", regexp.MustCompile(`node`), 0},
		{"Next.js", regexp.MustCompile(`Next\.js`), 0},
		{"Vercel Edge Functions", regexp.MustCompile(`Vercel Edge Functions`), 0},
		{"OpenAI Image Downloader", regexp.MustCompile(`OpenAI Image Downloader`), 0},
		{"OpenAI", regexp.MustCompile(`OpenAI`), 0},
		{"Tsunami Security Scanner", regexp.MustCompile(`TsunamiSecurityScanner`), 0},
		{"iOS", regexp.MustCompile(`iOS/`), 0},
		{"Safari", regexp.MustCompile(`Safari/`), 0},
		{"Edge", regexp.MustCompile(`Edg/`), 0},
		{"Opera", regexp.MustCompile(`(OPR|Opera)/`), 0},
		{"Internet Explorer", regexp.MustCompile(`(; MSIE |Trident/)`), 0},
	}

	return &UserAgentDetector{
		candidates: candidates,
	}
}

func (d *UserAgentDetector) GetClient(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	for i, candidate := range d.candidates {
		if candidate.Regex.MatchString(userAgent) {
			candidate.Matches++
			// Move matched candidate towards front for better cache locality
			d.moveTowardsFront(i)
			return candidate.Name
		}
	}

	return "Other"
}

func (d *UserAgentDetector) moveTowardsFront(index int) {
	if index == 0 {
		return
	}

	current := d.candidates[index]
	previous := d.candidates[index-1]

	// If current has more matches than previous, swap them
	if current.Matches > previous.Matches {
		d.candidates[index-1], d.candidates[index] = current, previous
	}
}

func (d *UserAgentDetector) GetStats() map[string]uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	stats := make(map[string]uint64)
	for _, candidate := range d.candidates {
		stats[candidate.Name] = candidate.Matches
	}
	return stats
}

func (d *UserAgentDetector) GetClientConcurrent(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	// First, try read-only check
	d.mu.RLock()
	for _, candidate := range d.candidates {
		if candidate.Regex.MatchString(userAgent) {
			d.mu.RUnlock()
			// Now acquire write lock to update counter
			d.mu.Lock()
			candidate.Matches++
			name := candidate.Name
			d.mu.Unlock()
			return name
		}
	}
	d.mu.RUnlock()

	return "Other"
}

type FastUserAgentDetector struct {
	candidates []FastCandidate
	mu         sync.RWMutex
}

type FastCandidate struct {
	Name     string
	Pattern  string
	IsRegex  bool
	Regex    *regexp.Regexp
	Matches  uint64
}

func NewFastUserAgentDetector() *FastUserAgentDetector {
	candidates := []FastCandidate{
		// Simple string patterns (fastest)
		{"Curl", "curl/", false, nil, 0},
		{"Postman", "PostmanRuntime/", false, nil, 0},
		{"Insomnia", "insomnia/", false, nil, 0},
		{"Python requests", "python-requests/", false, nil, 0},
		{"Nodejs fetch", "node-fetch/", false, nil, 0},
		{"Seamonkey", "Seamonkey/", false, nil, 0},
		{"Firefox", "Firefox/", false, nil, 0},
		{"Chrome", "Chrome/", false, nil, 0},
		{"Chromium", "Chromium/", false, nil, 0},
		{"aiohttp", "aiohttp/", false, nil, 0},
		{"Python", "Python/", false, nil, 0},
		{"Java", "Java/", false, nil, 0},
		{"axios", "axios/", false, nil, 0},
		{"Dart", "Dart/", false, nil, 0},
		{"OkHttp", "OkHttp/", false, nil, 0},
		{"Uptime Kuma", "Uptime-Kuma/", false, nil, 0},
		{"undici", "undici/", false, nil, 0},
		{"Lush", "Lush/", false, nil, 0},
		{"Zabbix", "Zabbix", false, nil, 0},
		{"Guzzle", "GuzzleHttp/", false, nil, 0},
		{"Uptime", "Better Uptime", false, nil, 0},
		{"GitHub Camo", "github-camo", false, nil, 0},
		{"Ruby", "Ruby", false, nil, 0},
		{"Node.js", "node", false, nil, 0},
		{"Vercel Edge Functions", "Vercel Edge Functions", false, nil, 0},
		{"OpenAI Image Downloader", "OpenAI Image Downloader", false, nil, 0},
		{"OpenAI", "OpenAI", false, nil, 0},
		{"Tsunami Security Scanner", "TsunamiSecurityScanner", false, nil, 0},
		{"iOS", "iOS/", false, nil, 0},
		{"Safari", "Safari/", false, nil, 0},
		{"Edge", "Edg/", false, nil, 0},
		
		// Complex regex patterns (slower but necessary)
		{"Go http", "", true, regexp.MustCompile(`[Gg]o-http-client/`), 0},
		{"Opera", "", true, regexp.MustCompile(`(OPR|Opera)/`), 0},
		{"Internet Explorer", "", true, regexp.MustCompile(`(; MSIE |Trident/)`), 0},
		{"Next.js", "", true, regexp.MustCompile(`Next\.js`), 0},
	}

	return &FastUserAgentDetector{
		candidates: candidates,
	}
}

func (d *FastUserAgentDetector) GetClient(userAgent string) string {
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
