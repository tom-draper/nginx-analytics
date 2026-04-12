package nginx

import "time"

// NginxLog represents a parsed nginx access log entry
type NGINXLog struct {
	IPAddress    string     `json:"ipAddress"`
	Timestamp    *time.Time `json:"timestamp"`
	Method       string     `json:"method"`
	Path         string     `json:"path"`
	HTTPVersion  string     `json:"httpVersion"`
	Status       *int       `json:"status"`
	ResponseSize *int       `json:"responseSize"`
	Referrer     string     `json:"referrer"`
	UserAgent    string     `json:"userAgent"`
}
