package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/tom-draper/nginx-analytics/agent/internal/auth"
	"github.com/tom-draper/nginx-analytics/agent/internal/utils"
	"github.com/tom-draper/nginx-analytics/agent/pkg/config"
	"github.com/tom-draper/nginx-analytics/agent/pkg/logs"
	"github.com/tom-draper/nginx-analytics/agent/internal/routes"
)

var startTime = time.Now()

func main() {
	cfg := config.LoadConfig()
	logConfig(cfg)

	// Define HTTP routes
	setupRoute := func(path string, method string, logMessage string, handler func(http.ResponseWriter, *http.Request)) {
		http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			if logMessage != "" {
				log.Println(logMessage)
			}

			// Check HTTP method
			if r.Method != method {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}

			// Check authentication
			if !auth.IsAuthenticated(r, cfg.AuthToken) {
				log.Println("Forbidden: Invalid auth token")
				http.Error(w, "Forbidden: Invalid auth token", http.StatusForbidden)
				return
			}

			handler(w, r)
		})
	}

	setupRoute("/api/logs/access", http.MethodGet, "", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Polling access logs")

		includeCompressed := r.URL.Query().Get("includeCompressed") == "true"

		positionsStr := r.URL.Query().Get("positions")
		var positions []logs.Position
		if positionsStr != "" {
			if err := json.Unmarshal([]byte(positionsStr), &positions); err != nil {
				http.Error(w, fmt.Sprintf("Failed to parse positions: %v", err), http.StatusBadRequest)
				return
			}
		}

		logPath := cfg.AccessPath
		if logPath == "" && utils.IsDir(cfg.ErrorPath) {
			logPath = cfg.ErrorPath
		} else if logPath == "" {
			logPath = config.DefaultConfig.AccessPath
		}
		routes.ServeLogs(w, r, logPath, positions, false, includeCompressed)
	})

	setupRoute("/api/logs/error", http.MethodGet, "", func(w http.ResponseWriter, r *http.Request) {
		includeCompressed := r.URL.Query().Get("includeCompressed") == "true"

		positionsStr := r.URL.Query().Get("positions")
		var positions []logs.Position
		if positionsStr != "" {
			if err := json.Unmarshal([]byte(positionsStr), &positions); err != nil {
				http.Error(w, fmt.Sprintf("Failed to parse positions: %v", err), http.StatusBadRequest)
				return
			}
		}

		log.Println("Polling error logs")
		logPath := cfg.ErrorPath
		if logPath == "" && utils.IsDir(cfg.AccessPath) {
			logPath = cfg.AccessPath
		} else if logPath == "" {
			logPath = config.DefaultConfig.AccessPath
		}
		routes.ServeLogs(w, r, logPath, positions, true, includeCompressed)
	})

	setupRoute("/api/system/logs", http.MethodGet, "Checking log size", func(w http.ResponseWriter, r *http.Request) {
		if !cfg.SystemMonitoring {
			log.Println("Forbidden: System monitoring disabled")
			http.Error(w, "Forbidden: System monitoring disabled", http.StatusForbidden)
			return
		}

		logPath := cfg.AccessPath
		if logPath == "" {
			logPath = cfg.ErrorPath
		}
		if logPath == "" {
			logPath = config.DefaultConfig.AccessPath
		}
		routes.ServeLogSizes(w, r, logPath)
	})

	setupRoute("/api/location", http.MethodPost, "", func(w http.ResponseWriter, r *http.Request) {
		if !routes.LocationsEnabled() {
			log.Println("Forbidden: Location lookup not configured")
			http.Error(w, "Forbidden: Location lookup not configured", http.StatusForbidden)
			return
		}

		routes.ServeLocations(w, r)
	})

	setupRoute("/api/status", http.MethodGet, "Checking status", func(w http.ResponseWriter, r *http.Request) {
		routes.ServeServerStatus(w, cfg.AccessPath, cfg.ErrorPath, startTime)
	})

	setupRoute("/api/system", http.MethodGet, "Checking system resources", func(w http.ResponseWriter, r *http.Request) {
		if !cfg.SystemMonitoring {
			log.Println("Forbidden: System monitoring disabled")
			http.Error(w, "Forbidden: System monitoring disabled", http.StatusForbidden)
			return
		}

		routes.ServeSystemResources(w, r)
	})

	// Handle graceful shutdown
	go func() {
		log.Printf("Agent running on port %s...\n", cfg.Port)
		if err := http.ListenAndServe(":"+cfg.Port, nil); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for an interrupt signal to gracefully shut down the server
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan

	log.Println("Shutting down...")
}

func logConfig(cfg config.Config) {
	if cfg.AuthToken == "" {
		log.Println("Auth token not set in environment or command line argument. Access may be insecure.")
	}
	log.Println("Using NGINX access log path:", cfg.AccessPath)
	log.Println("Using NGINX error log path:", cfg.ErrorPath)

	if cfg.SystemMonitoring {
		log.Println("System monitoring enabled")
	} else {
		log.Println("System monitoring disabled")
	}
}