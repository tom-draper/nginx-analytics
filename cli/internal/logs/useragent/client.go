package useragent

import "strings"

type UserAgentDetector struct{}

func NewUserAgentDetector() *UserAgentDetector {
	return &UserAgentDetector{}
}

// GetClient identifies the client/browser from a user agent string.
// Uses two-path branching: browser UAs (starting with "Mozilla/") skip all
// tool checks, and tool UAs skip all browser checks. No regex, no mutex,
// no allocations.
func (d *UserAgentDetector) GetClient(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	// Fast path: ~90% of browser traffic starts with "Mozilla/"
	// Skip 20+ tool checks and go straight to browser detection
	if strings.HasPrefix(userAgent, "Mozilla/") {
		return detectBrowserClient(userAgent)
	}

	// Non-Mozilla UAs: tools, libraries, bots
	return detectToolClient(userAgent)
}

func detectBrowserClient(userAgent string) string {
	// Order matters: check more-specific UAs before less-specific ones.
	// Edge/Opera UAs contain "Chrome/", Chrome UAs contain "Safari/".
	if strings.Contains(userAgent, "Seamonkey/") {
		return "Seamonkey"
	}
	if strings.Contains(userAgent, "Firefox/") {
		return "Firefox"
	}
	if strings.Contains(userAgent, "Edg/") {
		return "Edge"
	}
	if strings.Contains(userAgent, "OPR/") || strings.Contains(userAgent, "Opera/") {
		return "Opera"
	}
	if strings.Contains(userAgent, "Chromium/") {
		return "Chromium"
	}
	if strings.Contains(userAgent, "Chrome/") {
		return "Chrome"
	}
	if strings.Contains(userAgent, "; MSIE ") || strings.Contains(userAgent, "Trident/") {
		return "Internet Explorer"
	}
	if strings.Contains(userAgent, "iOS/") {
		return "iOS"
	}
	if strings.Contains(userAgent, "Safari/") {
		return "Safari"
	}

	// Some non-browser UAs still use a Mozilla/ prefix
	return detectToolClient(userAgent)
}

func detectToolClient(userAgent string) string {
	// HTTP tools and libraries
	if strings.Contains(userAgent, "curl/") {
		return "Curl"
	}
	if strings.Contains(userAgent, "PostmanRuntime/") {
		return "Postman"
	}
	if strings.Contains(userAgent, "insomnia/") {
		return "Insomnia"
	}
	if strings.Contains(userAgent, "python-requests/") {
		return "Python requests"
	}
	if strings.Contains(userAgent, "node-fetch/") {
		return "Nodejs fetch"
	}
	if strings.Contains(userAgent, "aiohttp/") {
		return "aiohttp"
	}
	if strings.Contains(userAgent, "Python/") {
		return "Python"
	}
	if strings.Contains(userAgent, "Go-http-client/") || strings.Contains(userAgent, "go-http-client/") {
		return "Go http"
	}
	if strings.Contains(userAgent, "Java/") {
		return "Java"
	}
	if strings.Contains(userAgent, "axios/") {
		return "axios"
	}
	if strings.Contains(userAgent, "Dart/") {
		return "Dart"
	}
	if strings.Contains(userAgent, "OkHttp/") {
		return "OkHttp"
	}
	if strings.Contains(userAgent, "Uptime-Kuma/") {
		return "Uptime Kuma"
	}
	if strings.Contains(userAgent, "undici/") {
		return "undici"
	}
	if strings.Contains(userAgent, "Lush/") {
		return "Lush"
	}
	if strings.Contains(userAgent, "Zabbix") {
		return "Zabbix"
	}
	if strings.Contains(userAgent, "GuzzleHttp/") {
		return "Guzzle"
	}
	if strings.Contains(userAgent, "Better Uptime") {
		return "Uptime"
	}
	if strings.Contains(userAgent, "github-camo") {
		return "GitHub Camo"
	}
	if strings.Contains(userAgent, "Ruby") {
		return "Ruby"
	}

	// Platforms and services — check specific before generic
	if strings.Contains(userAgent, "Next.js") {
		return "Next.js"
	}
	if strings.Contains(userAgent, "Vercel Edge Functions") {
		return "Vercel Edge Functions"
	}
	if strings.Contains(userAgent, "OpenAI Image Downloader") {
		return "OpenAI Image Downloader"
	}
	if strings.Contains(userAgent, "OpenAI") {
		return "OpenAI"
	}
	if strings.Contains(userAgent, "TsunamiSecurityScanner") {
		return "Tsunami Security Scanner"
	}
	// "node" is very generic — must be last
	if strings.Contains(userAgent, "node") {
		return "Node.js"
	}

	return "Other"
}

// GetOS uses hierarchical branching to identify the OS in 1-3 string scans
// instead of iterating N candidates. All Windows versions resolve from a single
// strings.Index call. No regex, no allocations, no mutex.
func (d *UserAgentDetector) GetOS(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	// Windows family: one Index call resolves all versions via prefix check
	if idx := strings.Index(userAgent, "Windows NT "); idx >= 0 {
		ver := userAgent[idx+11:] // skip past "Windows NT "
		switch {
		case strings.HasPrefix(ver, "10.0"):
			return "Windows 10/11"
		case strings.HasPrefix(ver, "6.3"):
			return "Windows 8.1"
		case strings.HasPrefix(ver, "6.2"):
			return "Windows 8"
		case strings.HasPrefix(ver, "6.1"):
			return "Windows 7"
		case strings.HasPrefix(ver, "6.0"):
			return "Windows Vista"
		case strings.HasPrefix(ver, "5.2"):
			return "Windows Server 2003"
		case strings.HasPrefix(ver, "5.1"):
			return "Windows XP"
		case strings.HasPrefix(ver, "5.0"):
			return "Windows 2000"
		case strings.HasPrefix(ver, "4.0"):
			return "Windows NT 4.0"
		default:
			return "Windows"
		}
	}
	// Legacy Windows (pre-NT)
	if strings.Contains(userAgent, "Win16") {
		return "Windows 3.11"
	}
	if strings.Contains(userAgent, "Windows 95") || strings.Contains(userAgent, "Win95") {
		return "Windows 95"
	}
	if strings.Contains(userAgent, "Windows 98") || strings.Contains(userAgent, "Win98") {
		return "Windows 98"
	}
	if strings.Contains(userAgent, "Windows ME") {
		return "Windows ME"
	}

	// Mobile platforms
	if strings.Contains(userAgent, "iPhone OS") {
		return "iOS"
	}
	if strings.Contains(userAgent, "iPad") {
		return "iOS"
	}
	if strings.Contains(userAgent, "Android") {
		return "Android"
	}

	// Desktop platforms
	if strings.Contains(userAgent, "CrOS") {
		return "ChromeOS"
	}
	if strings.Contains(userAgent, "Macintosh") || strings.Contains(userAgent, "Mac_PowerPC") {
		return "macOS"
	}

	// Unix-like
	if strings.Contains(userAgent, "OpenBSD") {
		return "OpenBSD"
	}
	if strings.Contains(userAgent, "SunOS") {
		return "SunOS"
	}
	if strings.Contains(userAgent, "QNX") {
		return "QNX"
	}
	if strings.Contains(userAgent, "BeOS") {
		return "BeOS"
	}
	if strings.Contains(userAgent, "OS/2") {
		return "OS/2"
	}
	if strings.Contains(userAgent, "Linux") || strings.Contains(userAgent, "X11") {
		return "Linux"
	}

	// Bot detection last — most traffic is real users, so checking bots
	// last avoids the cost for the common case. Bots that spoof a real OS
	// (e.g. Googlebot with Android UA) get classified by that OS, matching
	// the web app behavior.
	if isBot(userAgent) {
		return "Bot"
	}

	return "Other"
}

// GetDevice uses the same branching strategy as GetOS.
func (d *UserAgentDetector) GetDevice(userAgent string) string {
	if userAgent == "" {
		return "Unknown"
	}

	if strings.Contains(userAgent, "iPhone") {
		return "iPhone"
	}
	if strings.Contains(userAgent, "iPad") {
		return "iPad"
	}
	if strings.Contains(userAgent, "Android") {
		if strings.Contains(userAgent, "Mobile") {
			return "Android Phone"
		}
		return "Android Tablet"
	}
	if strings.Contains(userAgent, "Tizen/") {
		return "Samsung"
	}
	if strings.Contains(userAgent, "Macintosh") || strings.Contains(userAgent, "Mac_PowerPC") {
		return "Mac"
	}
	if strings.Contains(userAgent, "Windows NT") {
		return "Windows PC"
	}
	if strings.Contains(userAgent, "CrOS") {
		return "Chromebook"
	}
	if strings.Contains(userAgent, "Linux") || strings.Contains(userAgent, "X11") {
		return "Linux"
	}
	if isBot(userAgent) {
		return "Bot"
	}

	return "Other"
}

// isBot checks for common bot indicators without allocating a lowercase copy.
func isBot(userAgent string) bool {
	return strings.Contains(userAgent, "bot") ||
		strings.Contains(userAgent, "Bot") ||
		strings.Contains(userAgent, "spider") ||
		strings.Contains(userAgent, "Spider") ||
		strings.Contains(userAgent, "crawl") ||
		strings.Contains(userAgent, "Crawl") ||
		strings.Contains(userAgent, "Slurp") ||
		strings.Contains(userAgent, "APIs-Google") ||
		strings.Contains(userAgent, "AdsBot") ||
		strings.Contains(userAgent, "Mediapartners") ||
		strings.Contains(userAgent, "ia_archiver")
}
