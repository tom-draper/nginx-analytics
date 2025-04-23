package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/tom-draper/nginx-analytics/agent/routes"
)

const defaultPort string = "5000"
const defaultNginxPath string = "/var/log/nginx"
const defaultSystemMonitoring bool = false

var startTime = time.Now()

func main() {
	args := getArguments()

	isAccessDir := isDir(args.nginxAccessPath)
	isErrorDir := isDir(args.nginxErrorPath)

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
			if !isAuthenticated(r, args.authToken) {
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
		var positions []routes.Position
		if positionsStr != "" {
			if err := json.Unmarshal([]byte(positionsStr), &positions); err != nil {
				http.Error(w, fmt.Sprintf("Failed to parse positions: %v", err), http.StatusBadRequest)
				return
			}
		}

		if args.nginxAccessPath != "" {
			routes.ServeLogs(w, r, args.nginxAccessPath, positions, false, includeCompressed)
		} else if args.nginxErrorPath != "" && isErrorDir {
			routes.ServeLogs(w, r, args.nginxErrorPath, positions, false, includeCompressed)
		} else {
			routes.ServeLogs(w, r, defaultNginxPath, positions, false, includeCompressed)
		}
	})

	setupRoute("/api/logs/error", http.MethodGet, "", func(w http.ResponseWriter, r *http.Request) {
		includeCompressed := r.URL.Query().Get("includeCompressed") == "true"

		positionsStr := r.URL.Query().Get("positions")
		var positions []routes.Position
		if positionsStr != "" {
			if err := json.Unmarshal([]byte(positionsStr), &positions); err != nil {
				http.Error(w, fmt.Sprintf("Failed to parse positions: %v", err), http.StatusBadRequest)
				return
			}
		}

		log.Println("Polling error logs")
		if args.nginxErrorPath != "" {
			routes.ServeLogs(w, r, args.nginxErrorPath, positions, true, includeCompressed)
		} else if args.nginxAccessPath != "" && isAccessDir {
			routes.ServeLogs(w, r, args.nginxAccessPath, positions, true, includeCompressed)
		} else {
			routes.ServeLogs(w, r, defaultNginxPath, positions, true, includeCompressed)
		}
	})

	setupRoute("/api/system/logs", http.MethodGet, "Checking log size", func(w http.ResponseWriter, r *http.Request) {
		if !args.systemMonitoring {
			log.Println("Forbidden: System monitoring disabled")
			http.Error(w, "Forbidden: System monitoring disabled", http.StatusForbidden)
			return
		}

		if args.nginxAccessPath != "" {
			routes.ServeLogSize(w, r, args.nginxAccessPath)
		} else if args.nginxErrorPath != "" {
			routes.ServeLogsSize(w, r, args.nginxErrorPath)
		} else {
			routes.ServeLogsSize(w, r, defaultNginxPath)
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
		routes.ServeServerStatus(w, args.nginxAccessPath, args.nginxErrorPath, startTime)
	})

	setupRoute("/api/system", http.MethodGet, "Checking system resources", func(w http.ResponseWriter, r *http.Request) {
		if !args.systemMonitoring {
			log.Println("Forbidden: System monitoring disabled")
			http.Error(w, "Forbidden: System monitoring disabled", http.StatusForbidden)
			return
		}

		routes.ServeSystemResources(w)
	})

	// Handle graceful shutdown
	go func() {
		log.Printf("Agent running on port %s...\n", args.port)
		if err := http.ListenAndServe(":"+args.port, nil); err != nil {
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

type Arguments struct {
	port             string
	authToken        string
	nginxAccessPath  string
	nginxErrorPath   string
	systemMonitoring bool
}

func getArguments() Arguments {
	// Define command-line flags
	cmdAuthToken := flag.String("auth-token", "", "Authentication token (recommended)")
	cmdPort := flag.String("port", "", fmt.Sprintf("Port to run the server on (default %s)", defaultPort))
	cmdNginxAccessPath := flag.String("nginx-access-path", "", "Path to the NGINX access log file or parent directory")
	cmdNginxErrorPath := flag.String("nginx-error-path", "", "Path to the NGINX error log file or parent directory")
	cmdSystemMonitoring := flag.String("system-monitoring", "", fmt.Sprintf("System resource monitoring toggle (default %t)", defaultSystemMonitoring))
	flag.Parse()

	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Error loading .env file")
	}

	// Determine auth token
	authToken := *cmdAuthToken
	if authToken == "" {
		authToken = os.Getenv("NGINX_ANALYTICS_AUTH_TOKEN")
	}
	if authToken == "" {
		log.Println("Auth token not set in environment or command line argument. Access may be insecure.")
	}

	// Determine port
	port := *cmdPort
	if port == "" {
		port = os.Getenv("PORT")
		if port == "" {
			port = defaultPort
		}
	}

	// Determine access log path
	nginxAccessPath := *cmdNginxAccessPath
	if nginxAccessPath == "" {
		nginxAccessPath = os.Getenv("NGINX_ANALYTICS_ACCESS_PATH")
	}

	// Determine error log path
	nginxErrorPath := *cmdNginxErrorPath
	if nginxErrorPath == "" {
		nginxErrorPath = os.Getenv("NGINX_ANALYTICS_ERROR_PATH")
	}

	if nginxAccessPath != "" {
		log.Println("Using NGINX access log path: " + nginxAccessPath)
	} else if nginxErrorPath != "" && isDir(nginxErrorPath) {
		log.Println("No access log path set. Using NGINX error log path for access log files: " + nginxErrorPath)
	} else {
		log.Println("Using default NGINX access log directory: " + defaultNginxPath)
	}

	if nginxErrorPath != "" {
		log.Println("Using NGINX error log path: " + nginxErrorPath)
	} else if nginxAccessPath != "" && isDir(nginxAccessPath) {
		log.Println("No error log path set. Using NGINX error log path for error log files: " + nginxAccessPath)
	} else {
		log.Println("Using default NGINX error log directory: " + defaultNginxPath)
	}

	systemMonitoring := defaultSystemMonitoring
	if *cmdSystemMonitoring == "" {
		systemMonitoring = os.Getenv("NGINX_ANALYTICS_SYSTEM_MONITORING") == "true"
	}
	if systemMonitoring {
		log.Println("System monitoring enabled")
	} else {
		log.Println("System monitoring disabled")
	}

	return Arguments{port, authToken, nginxAccessPath, nginxErrorPath, systemMonitoring}
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
