package nginx

import "time"

// NginxError represents a parsed nginx error log entry
type NGINXError struct {
	Timestamp     time.Time `json:"timestamp"`
	Level         string    `json:"level"`
	PID           int       `json:"pid"`
	TID           string    `json:"tid"`
	CID           string    `json:"cid"`
	Message       string    `json:"message"`
	ClientAddress *string   `json:"clientAddress,omitempty"`
	ServerAddress *string   `json:"serverAddress,omitempty"`
	Request       *string   `json:"request,omitempty"`
	Referrer      *string   `json:"referrer,omitempty"`
	Host          *string   `json:"host,omitempty"`
}
