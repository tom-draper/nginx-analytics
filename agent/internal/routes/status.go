package routes

import (
	"encoding/json"
	"net/http"
	"os"
	"time"
)


type Status struct {
	Status           string `json:"status"`
	Uptime           string `json:"uptime"`
	Timestamp        string `json:"timestamp"`
	Version          string `json:"version"`
	AccessLogStatus  string `json:"accessLogStatus"`
	ErrorLogStatus   string `json:"errorLogStatus"`
	LogFormat        string `json:"logFormat,omitempty"`
}

func ServeServerStatus(w http.ResponseWriter, nginxAccessPath string, nginxErrorPath string, startTime time.Time, logFormat string) {
	// Create an instance of Status struct
	status := Status{
		Status:    "ok",
		Uptime:    time.Since(startTime).String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0.0",
		LogFormat: logFormat,
	}

	// Check if the access log file exists
	if _, err := os.Stat(nginxAccessPath); err != nil {
		status.AccessLogStatus = "not found"
	} else {
		status.AccessLogStatus = "ok"
	}

	// Check if the error log file exists
	if _, err := os.Stat(nginxErrorPath); err != nil {
		status.ErrorLogStatus = "not found"
	} else {
		status.ErrorLogStatus = "ok"
	}

	// Send status as JSON response
	data, err := json.Marshal(status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}
