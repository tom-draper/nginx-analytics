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

	"github.com/joho/godotenv"
	"github.com/tom-draper/nginx-analytics/agent/routes"
)

const defaultPort string = "3000"
const defaultNginxAccessDir string = "/var/log/nginx"
const defaultNginxErrorDir string = "/var/log/nginx"
const defaultNginxAccessPath string = "/var/log/nginx/access.log"
const defaultNginxErrorPath string = "/var/log/nginx/error.log"
const defaultSystemMonitoring bool = false

var startTime = time.Now()

func main() {
	args := getArguments()

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
	setupRoute("/logs/access", http.MethodGet, "Accessing access log", func(w http.ResponseWriter, r *http.Request) {
		if args.nginxAccessDir != "" {
			routes.ServeLogs(w, r, args.nginxAccessDir)
		} else if args.nginxAccessPath != "" {
			routes.ServeLog(w, r, args.nginxAccessPath)
		} else if args.nginxErrorDir != "" {
			routes.ServeLogs(w, r, args.nginxErrorDir)
		} else {
			routes.ServeLogs(w, r, defaultNginxAccessDir)
		}
	})

	setupRoute("/logs/error", http.MethodGet, "Accessing error logs", func(w http.ResponseWriter, r *http.Request) {
		if args.nginxErrorDir != "" {
			routes.ServeLogs(w, r, args.nginxErrorDir)
		} else if args.nginxErrorPath != "" {
			routes.ServeLog(w, r, args.nginxErrorPath)
		} else if args.nginxAccessDir != "" {
			routes.ServeLogs(w, r, args.nginxAccessDir)
		} else {
			routes.ServeLogs(w, r, defaultNginxErrorDir)
		}
	})

	setupRoute("/logs/size", http.MethodGet, "Checking log size", func(w http.ResponseWriter, r *http.Request) {
		if !args.systemMonitoring {
			log.Println("Forbidden: System monitoring disabled")
			http.Error(w, "Forbidden: System monitoring disabled", http.StatusForbidden)
			return
		}

		if args.nginxAccessDir != "" {
			routes.ServeLogsSize(w, r, args.nginxAccessDir)
		} else if args.nginxAccessPath != "" {
			routes.ServeLogSize(w, r, args.nginxAccessPath)
		} else if args.nginxErrorDir != "" {
			routes.ServeLogsSize(w, r, args.nginxErrorDir)
		} else {
			routes.ServeLogsSize(w, r, defaultNginxAccessDir)
		}
	})

	setupRoute("/location", http.MethodPost, "", func(w http.ResponseWriter, r *http.Request) {
		if !routes.LocationsEnabled() {
			log.Println("Forbidden: Location lookup not configured")
			http.Error(w, "Forbidden: Location lookup not configured", http.StatusForbidden)
			return
		}

		routes.ServeLocations(w, r)
	})

	setupRoute("/status", http.MethodGet, "Checking status", func(w http.ResponseWriter, r *http.Request) {
		routes.ServeServerStatus(w, args.nginxAccessPath, args.nginxErrorPath, startTime)
	})

	setupRoute("/system", http.MethodGet, "Checking system resources", func(w http.ResponseWriter, r *http.Request) {
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

type Arguments struct {
	port             string
	authToken        string
	nginxAccessDir   string
	nginxErrorDir    string
	nginxAccessPath  string
	nginxErrorPath   string
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

	// Determine access log directory
	nginxAccessDir := *cmdNginxAccessDir
	if nginxAccessDir == "" {
		nginxAccessDir = os.Getenv("NGINX_ANALYTICS_ACCESS_DIR")
	}
	if nginxAccessDir != "" {
		log.Println("Nginx access.log directory: " + nginxAccessDir)
	}

	// Determine error log directory
	nginxErrorDir := *cmdNginxErrorDir
	if nginxErrorDir == "" {
		nginxErrorDir = os.Getenv("NGINX_ANALYTICS_ERROR_DIR")
	}
	if nginxErrorDir != "" {
		log.Println("Nginx error.log directory: " + nginxErrorDir)
	}

	// Determine access log path
	nginxAccessPath := *cmdNginxAccessPath
	if nginxAccessPath == "" {
		nginxAccessPath = os.Getenv("NGINX_ANALYTICS_ACCESS_PATH")
	}
	if nginxAccessPath != "" {
		log.Println("Nginx access.log path: " + nginxAccessPath)
	}

	// Determine error log path
	nginxErrorPath := *cmdNginxErrorPath
	if nginxErrorPath == "" {
		nginxErrorPath = os.Getenv("NGINX_ANALYTICS_ERROR_PATH")
	}
	if nginxErrorPath != "" {
		log.Println("Nginx error.log path: " + nginxErrorPath)
	}

	if nginxAccessDir != "" {
		log.Println("Using Nginx log directory: " + nginxAccessDir)
	} else if nginxAccessPath != "" {
		log.Println("Using Nginx access.log file: " + nginxAccessPath)
	} else if nginxErrorDir != "" {
		log.Println("Using Nginx log directory: " + nginxErrorDir)
	} else {
		log.Println("Using default Nginx log directory: " + defaultNginxAccessDir)
	}

	if nginxErrorDir != "" {
		log.Println("Using Nginx error log directory: " + nginxErrorDir)
	} else if nginxErrorPath != "" {
		log.Println("Using Nginx error.log file: " + nginxErrorPath)
	} else if nginxAccessDir != "" {
		log.Println("Using Nginx error log directory: " + nginxAccessDir)
	} else {
		log.Println("Using default Nginx error log directory: " + defaultNginxErrorDir)
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

	return Arguments{port, authToken, nginxAccessDir, nginxErrorDir, nginxAccessPath, nginxErrorPath, systemMonitoring}
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
