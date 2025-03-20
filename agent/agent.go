package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/tom-draper/nginx-analytics/agent/routes"
	"github.com/joho/godotenv"
)

const defaultPort string = "3000"
const defaultNginxAccessDir string = "/var/log/nginx"
const defaultNginxErrorDir string = "/var/log/nginx"
const defaultNginxAccessPath string = "/var/log/nginx/access.log"
const defaultNginxErrorPath string = "/var/log/nginx/error.log"
const defaultSystemMonitoring bool = false

var startTime = time.Now()

var authToken string // Declare variable to hold the authentication token

func main() {
	args := getArguments()

	// Define HTTP routes
	// setupRoute creates a route handler with common middleware
	setupRoute := func(path string, method string, logMessage string, handler func(http.ResponseWriter, *http.Request)) {
		http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			log.Println(logMessage)
			
			// Check HTTP method
			if r.Method != method {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}

			// Check authentication
			if authToken != "" && !isAuthenticated(r) {
				log.Println("Forbidden: Invalid auth token")
				http.Error(w, "Forbidden: Invalid auth token", http.StatusForbidden)
				return
			}

			handler(w, r)
		})
	}

	// Set up routes with common middleware
	setupRoute("/logs/access", http.MethodGet, "Accessing access.log", func(w http.ResponseWriter, r *http.Request) {
		if args.nginxAccessDir != "" {
			routes.ServeLogs(w, r, args.nginxAccessDir)
		} else {
			routes.ServeLog(w, r, args.nginxAccessPath)
		}
	})

	setupRoute("/logs/error", http.MethodGet, "Accessing error.log", func(w http.ResponseWriter, r *http.Request) {
		if args.nginxErrorDir != "" {
			routes.ServeLogs(w, r, args.nginxErrorDir)
		} else {
			routes.ServeLog(w, r, args.nginxErrorPath)
		}
	})

	setupRoute("/logs/size", http.MethodGet, "Accessing log size", func(w http.ResponseWriter, r *http.Request) {
		if args.nginxAccessDir != "" {
			routes.ServeLogsSize(w, r, args.nginxAccessDir)
		} else {
			routes.ServeLogSize(w, r, args.nginxAccessPath)
		}
	})

	setupRoute("/location", http.MethodPost, "Getting locations", func(w http.ResponseWriter, r *http.Request) {
		routes.ServeLocation(w, r)
	})

	setupRoute("/status", http.MethodGet, "Checking status", func(w http.ResponseWriter, r *http.Request) {
		routes.ServeServerStatus(w, args.nginxAccessPath, args.nginxErrorPath, startTime)
	})

	setupRoute("/system", http.MethodGet, "Monitoring system", func(w http.ResponseWriter, r *http.Request) {
		routes.ServeSystemResources(w, args.systemMonitoring)
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

type Arguments struct {
	port            string
	nginxAccessDir  string
	nginxErrorDir   string
	nginxAccessPath string
	nginxErrorPath  string
	systemMonitoring bool
}

func getArguments() Arguments {
	// Define command-line flags
	cmdAuthToken := flag.String("auth-token", "", "Authentication token (recommended)")
	cmdPort := flag.String("port", "", fmt.Sprintf("Port to run the server on (default %s)", defaultPort))
	cmdNginxAccessDir := flag.String("nginx-access-dir", "", fmt.Sprintf("Directory containing Nginx access.log file"))
	cmdNginxErrorDir := flag.String("nginx-error-dir", "", fmt.Sprintf("Directory containing Nginx error.log file"))
	cmdNginxAccessPath := flag.String("nginx-access-path", "", fmt.Sprintf("Path to the Nginx access.log file"))
	cmdNginxErrorPath := flag.String("nginx-error-path", "", fmt.Sprintf("Path to the Nginx error.log file"))
	cmdSystemMonitoring := flag.String("system-monitoring", "", fmt.Sprintf("System resource monitoring toggle (default %b)", defaultSystemMonitoring))
	flag.Parse()

	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Error loading .env file")
	}

	// Determine auth token
	authToken = *cmdAuthToken
	if authToken == "" {
		authToken = os.Getenv("NGINX_ANALYTICS_AUTH_TOKEN")
	}
	if authToken == "" {
		log.Println("Auth token not set in environment or command line argument. Connection will be insecure.")
	}

	// Determine port
	port := *cmdPort
	if port == "" {
		port = os.Getenv("PORT")
		if port == "" {
			port = defaultPort
		}
	}

	// Determine access log directory
	nginxAccessDir := *cmdNginxAccessDir
	if nginxAccessDir == "" {
		nginxAccessDir = os.Getenv("NGINX_ACCESS_DIR")
	}
	log.Println("Nginx access.log directory: " + nginxAccessDir)

	// Determine error log directory
	nginxErrorDir := *cmdNginxErrorDir
	if nginxErrorDir == "" {
		nginxErrorDir = os.Getenv("NGINX_ERROR_DIR")
	}
	log.Println("Nginx error.log directory: " + nginxErrorDir)

	// Determine access log path
	nginxAccessPath := *cmdNginxAccessPath
	if nginxAccessPath == "" {
		nginxAccessPath = os.Getenv("NGINX_ACCESS_PATH")
	}
	log.Println("Nginx access.log path: " + nginxAccessPath)

	// Determine error log path
	nginxErrorPath := *cmdNginxErrorPath
	if nginxErrorPath == "" {
		nginxErrorPath = os.Getenv("NGINX_ERROR_PATH")
	}
	log.Println("Nginx error.log path: " + nginxErrorPath)

	systemMonitoring := defaultSystemMonitoring
	if *cmdSystemMonitoring != "" {
		systemMonitoring = os.Getenv("NGINX_ANALYTICS_SYSTEM_MONITORING") == "true"
	}
	log.Printf("System monitoring enabled: %v", systemMonitoring)

	return Arguments{port, nginxAccessDir, nginxErrorDir, nginxAccessPath, nginxErrorPath, systemMonitoring}
}

func isAuthenticated(r *http.Request) bool {
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
