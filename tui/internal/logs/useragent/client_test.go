package useragent

import (
	"testing"
)

// TestGetClient_Browsers tests browser detection
func TestGetClient_Browsers(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "Chrome on Windows",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			expected:  "Chrome",
		},
		{
			name:      "Firefox on macOS",
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
			expected:  "Firefox",
		},
		{
			name:      "Safari on macOS",
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
			expected:  "Safari",
		},
		{
			name:      "Edge on Windows",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
			expected:  "Edge",
		},
		{
			name:      "Opera on Windows",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/105.0.0.0",
			expected:  "Opera",
		},
		{
			name:      "Internet Explorer 11",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
			expected:  "Internet Explorer",
		},
		{
			name:      "Internet Explorer 9",
			userAgent: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
			expected:  "Internet Explorer",
		},
		{
			name:      "Chromium",
			userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/120.0.0.0 Safari/537.36",
			expected:  "Chromium",
		},
		{
			name:      "Seamonkey",
			userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0 Seamonkey/2.53.14",
			expected:  "Seamonkey",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetClient(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetClient() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetClient_Tools tests HTTP client and tool detection
func TestGetClient_Tools(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "curl",
			userAgent: "curl/7.88.1",
			expected:  "Curl",
		},
		{
			name:      "Postman",
			userAgent: "PostmanRuntime/7.32.3",
			expected:  "Postman",
		},
		{
			name:      "Python requests",
			userAgent: "python-requests/2.31.0",
			expected:  "Python requests",
		},
		{
			name:      "Go http client",
			userAgent: "Go-http-client/1.1",
			expected:  "Go http",
		},
		{
			name:      "axios",
			userAgent: "axios/1.6.2",
			expected:  "axios",
		},
		{
			name:      "Node.js fetch",
			userAgent: "node-fetch/2.6.7",
			expected:  "Nodejs fetch",
		},
		{
			name:      "Python",
			userAgent: "Python/3.11.0",
			expected:  "Python",
		},
		{
			name:      "Java",
			userAgent: "Java/17.0.1",
			expected:  "Java",
		},
		{
			name:      "Insomnia",
			userAgent: "insomnia/2023.5.8",
			expected:  "Insomnia",
		},
		{
			name:      "aiohttp",
			userAgent: "Python/3.11 aiohttp/3.9.1",
			expected:  "aiohttp",
		},
		{
			name:      "OkHttp",
			userAgent: "okhttp/4.12.0",
			expected:  "OkHttp",
		},
		{
			name:      "Dart",
			userAgent: "Dart/3.2.0 (dart:io)",
			expected:  "Dart",
		},
		{
			name:      "undici",
			userAgent: "undici/5.28.2",
			expected:  "undici",
		},
		{
			name:      "Guzzle",
			userAgent: "GuzzleHttp/7.0",
			expected:  "Guzzle",
		},
		{
			name:      "Ruby",
			userAgent: "Ruby/3.2.0",
			expected:  "Ruby",
		},
		{
			name:      "Uptime Kuma",
			userAgent: "Uptime-Kuma/1.23.0",
			expected:  "Uptime Kuma",
		},
		{
			name:      "Better Uptime",
			userAgent: "Better Uptime Bot",
			expected:  "Uptime",
		},
		{
			name:      "Zabbix",
			userAgent: "Zabbix",
			expected:  "Zabbix",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetClient(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetClient() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetClient_Services tests service and platform detection
func TestGetClient_Services(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "Next.js",
			userAgent: "Next.js Middleware",
			expected:  "Next.js",
		},
		{
			name:      "Vercel Edge Functions",
			userAgent: "Vercel Edge Functions",
			expected:  "Vercel Edge Functions",
		},
		{
			name:      "OpenAI",
			userAgent: "OpenAI/1.0",
			expected:  "OpenAI",
		},
		{
			name:      "OpenAI Image Downloader",
			userAgent: "OpenAI Image Downloader/1.0",
			expected:  "OpenAI Image Downloader",
		},
		{
			name:      "GitHub Camo",
			userAgent: "github-camo (cafed00d)",
			expected:  "GitHub Camo",
		},
		{
			name:      "Node.js generic",
			userAgent: "node/v18.12.0",
			expected:  "Node.js",
		},
		{
			name:      "Tsunami Security Scanner",
			userAgent: "TsunamiSecurityScanner",
			expected:  "Tsunami Security Scanner",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetClient(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetClient() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetClient_EdgeCases tests edge cases
func TestGetClient_EdgeCases(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "Empty string",
			userAgent: "",
			expected:  "Unknown",
		},
		{
			name:      "Unknown client",
			userAgent: "SomeUnknownClient/1.0",
			expected:  "Other",
		},
		{
			name:      "Malformed Mozilla UA",
			userAgent: "Mozilla/5.0",
			expected:  "Other",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetClient(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetClient() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetOS_Windows tests Windows version detection
func TestGetOS_Windows(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "Windows 10/11",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			expected:  "Windows 10/11",
		},
		{
			name:      "Windows 8.1",
			userAgent: "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36",
			expected:  "Windows 8.1",
		},
		{
			name:      "Windows 8",
			userAgent: "Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36",
			expected:  "Windows 8",
		},
		{
			name:      "Windows 7",
			userAgent: "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36",
			expected:  "Windows 7",
		},
		{
			name:      "Windows Vista",
			userAgent: "Mozilla/5.0 (Windows NT 6.0; Win64; x64) AppleWebKit/537.36",
			expected:  "Windows Vista",
		},
		{
			name:      "Windows XP",
			userAgent: "Mozilla/5.0 (Windows NT 5.1; rv:52.0) Gecko/20100101 Firefox/52.0",
			expected:  "Windows XP",
		},
		{
			name:      "Windows 95",
			userAgent: "Mozilla/4.0 (compatible; MSIE 4.0; Windows 95)",
			expected:  "Windows 95",
		},
		{
			name:      "Windows 98",
			userAgent: "Mozilla/4.0 (compatible; MSIE 5.0; Windows 98)",
			expected:  "Windows 98",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetOS(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetOS() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetOS_Mobile tests mobile OS detection
func TestGetOS_Mobile(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "iOS iPhone",
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
			expected:  "iOS",
		},
		{
			name:      "iOS iPad",
			userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
			expected:  "iOS",
		},
		{
			name:      "Android",
			userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
			expected:  "Android",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetOS(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetOS() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetOS_Desktop tests desktop OS detection
func TestGetOS_Desktop(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "macOS",
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			expected:  "macOS",
		},
		{
			name:      "ChromeOS",
			userAgent: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36",
			expected:  "ChromeOS",
		},
		{
			name:      "Linux",
			userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
			expected:  "Linux",
		},
		{
			name:      "Linux with X11",
			userAgent: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36",
			expected:  "Linux",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetOS(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetOS() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetOS_Bots tests bot detection
func TestGetOS_Bots(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "Googlebot",
			userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
			expected:  "Bot",
		},
		{
			name:      "Bingbot",
			userAgent: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
			expected:  "Bot",
		},
		{
			name:      "Generic spider",
			userAgent: "SomeSpider/1.0",
			expected:  "Bot",
		},
		{
			name:      "Crawler",
			userAgent: "MyCrawler/1.0",
			expected:  "Bot",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetOS(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetOS() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetOS_EdgeCases tests edge cases
func TestGetOS_EdgeCases(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "Empty string",
			userAgent: "",
			expected:  "Unknown",
		},
		{
			name:      "Unknown OS",
			userAgent: "SomeClient/1.0",
			expected:  "Other",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetOS(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetOS() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestGetDevice tests device detection
func TestGetDevice(t *testing.T) {
	detector := NewUserAgentDetector()

	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "iPhone",
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
			expected:  "iPhone",
		},
		{
			name:      "iPad",
			userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
			expected:  "iPad",
		},
		{
			name:      "Android Phone",
			userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
			expected:  "Android Phone",
		},
		{
			name:      "Android Tablet",
			userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			expected:  "Android Tablet",
		},
		{
			name:      "Mac",
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			expected:  "Mac",
		},
		{
			name:      "Windows PC",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			expected:  "Windows PC",
		},
		{
			name:      "Chromebook",
			userAgent: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36",
			expected:  "Chromebook",
		},
		{
			name:      "Linux",
			userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
			expected:  "Linux",
		},
		{
			name:      "Bot",
			userAgent: "Googlebot/2.1",
			expected:  "Bot",
		},
		{
			name:      "Unknown",
			userAgent: "",
			expected:  "Unknown",
		},
		{
			name:      "Other",
			userAgent: "SomeDevice/1.0",
			expected:  "Other",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detector.GetDevice(tt.userAgent)
			if result != tt.expected {
				t.Errorf("GetDevice() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// BenchmarkGetClient benchmarks client detection
func BenchmarkGetClient_Chrome(b *testing.B) {
	detector := NewUserAgentDetector()
	ua := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetClient(ua)
	}
}

// BenchmarkGetClient_Curl benchmarks tool detection
func BenchmarkGetClient_Curl(b *testing.B) {
	detector := NewUserAgentDetector()
	ua := "curl/7.88.1"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetClient(ua)
	}
}

// BenchmarkGetOS benchmarks OS detection
func BenchmarkGetOS_Windows(b *testing.B) {
	detector := NewUserAgentDetector()
	ua := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetOS(ua)
	}
}

// BenchmarkGetDevice benchmarks device detection
func BenchmarkGetDevice(b *testing.B) {
	detector := NewUserAgentDetector()
	ua := "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.GetDevice(ua)
	}
}
