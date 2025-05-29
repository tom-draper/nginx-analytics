package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/tom-draper/nginx-analytics/agent/internal/routes"
	cfg "github.com/tom-draper/nginx-analytics/agent/internal/config"
	logs "github.com/tom-draper/nginx-analytics/agent/pkg/logs"
)



var startTime = time.Now()

func main() {
	config := cfg.LoadConfig()

	isAccessDir := isDir(config.AccessPath)
	isErrorDir := isDir(config.ErrorPath)

	// Define HTTP routes
	// setupRoute creates a route handler with common middleware
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
			if !isAuthenticated(r, config.AuthToken) {
				log.Println("Forbidden: Invalid auth token")
				http.Error(w, "Forbidden: Invalid auth token", http.StatusForbidden)
				return
			}

			handler(w, r)
		})
	}

	// Set up routes with common middleware
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

		if config.AccessPath != "" {
			routes.ServeLogs(w, r, config.AccessPath, positions, false, includeCompressed)
		} else if config.ErrorPath != "" && isErrorDir {
			routes.ServeLogs(w, r, config.ErrorPath, positions, false, includeCompressed)
		} else {
			routes.ServeLogs(w, r, cfg.DefaultConfig.AccessPath, positions, false, includeCompressed)
		}
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
		if config.ErrorPath != "" {
			routes.ServeLogs(w, r, config.ErrorPath, positions, true, includeCompressed)
		} else if config.AccessPath != "" && isAccessDir {
			routes.ServeLogs(w, r, config.AccessPath, positions, true, includeCompressed)
		} else {
			routes.ServeLogs(w, r, cfg.DefaultConfig.AccessPath, positions, true, includeCompressed)
		}
	})

	setupRoute("/api/system/logs", http.MethodGet, "Checking log size", func(w http.ResponseWriter, r *http.Request) {
		if !config.SystemMonitoring {
			log.Println("Forbidden: System monitoring disabled")
			http.Error(w, "Forbidden: System monitoring disabled", http.StatusForbidden)
			return
		}

		if config.AccessPath != "" {
			routes.ServeLogSize(w, r, config.AccessPath)
		} else if config.ErrorPath != "" {
			routes.ServeLogSizes(w, r, config.ErrorPath)
		} else {
			routes.ServeLogSizes(w, r, cfg.DefaultConfig.AccessPath)
		}
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
		routes.ServeServerStatus(w, config.AccessPath, config.ErrorPath, startTime)
	})

	setupRoute("/api/system", http.MethodGet, "Checking system resources", func(w http.ResponseWriter, r *http.Request) {
		if !config.SystemMonitoring {
			log.Println("Forbidden: System monitoring disabled")
			http.Error(w, "Forbidden: System monitoring disabled", http.StatusForbidden)
			return
		}

		routes.ServeSystemResources(w)
	})

	// Handle graceful shutdown
	go func() {
		log.Printf("Agent running on port %s...\n", config.Port)
		if err := http.ListenAndServe(":"+config.Port, nil); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for an interrupt signal to gracefully shut down the server
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan

	log.Println("Shutting down...")
}

func isDir(path string) bool {
	if path == "" {
		return false
	}

	fileInfo, err := os.Stat(path)
	if err != nil {
		return false
	}

	return fileInfo.IsDir()
}

func isAuthenticated(r *http.Request, authToken string) bool {
	if authToken == "" {
		return true
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return false
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		return false
	}

	providedAuthToken := strings.TrimPrefix(authHeader, "Bearer ")
	return providedAuthToken == authToken
}
