package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
)

const defaultPort string = "8080"
const defaultNginxAccessPath string = "/var/log/nginx/access.log"
const defaultNginxErrorPath string = "/var/log/nginx/error.log"

var startTime = time.Now()

var authToken string // Declare variable to hold the authentication token

func main() {
	args := getArguments()

	// Define HTTP routes
	http.HandleFunc("/logs/access", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Accessing access.log")
		if authToken != "" && !isAuthenticated(r) {
			log.Println("Forbidden: Invalid auth token")
			http.Error(w, "Forbidden: Invalid auth token", http.StatusForbidden)
			return
		}
		serveLog(w, r, args.nginxAccessPath)
	})

	http.HandleFunc("/logs/errors", func(w http.ResponseWriter, r *http.Request) {
		if authToken != "" && !isAuthenticated(r) {
			http.Error(w, "Forbidden: Invalid auth token", http.StatusForbidden)
			return
		}
		serveLog(w, r, args.nginxErrorPath)
	})

	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		if authToken != "" && !isAuthenticated(r) {
			http.Error(w, "Forbidden: Invalid auth token", http.StatusForbidden)
			return
		}
		checkServerStatus(w, args.nginxAccessPath, args.nginxErrorPath)
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
	nginxAccessPath string
	nginxErrorPath  string
}

func getArguments() Arguments {
	// Define command-line flags
	cmdAuthToken := flag.String("auth-token", "", "Authentication token (recommended)")
	cmdPort := flag.String("port", "", fmt.Sprintf("Port to run the server on (default %s)", defaultPort))
	cmdNginxAccessPath := flag.String("nginx-access-path", "", fmt.Sprintf("Path to the Nginx access.log file (default %s)", defaultNginxAccessPath))
	cmdNginxErrorPath := flag.String("nginx-error-path", "", fmt.Sprintf("Path to the Nginx error.log file (default %s)", defaultNginxErrorPath))
	flag.Parse()

	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Error loading .env file")
	}

	// Determine auth token
	authToken = *cmdAuthToken
	if authToken == "" {
		authToken = os.Getenv("AUTH_TOKEN")
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

	// Determine access log path
	nginxAccessPath := *cmdNginxAccessPath
	if nginxAccessPath == "" {
		nginxAccessPath = os.Getenv("NGINX_ACCESS_PATH")
		if nginxAccessPath == "" {
			nginxAccessPath = defaultNginxAccessPath
		}
	}
	log.Println("Nginx access.log path: " + nginxAccessPath)

	// Determine error log path
	nginxErrorPath := *cmdNginxErrorPath
	if nginxErrorPath == "" {
		nginxErrorPath = os.Getenv("NGINX_ERROR_PATH")
		if nginxErrorPath == "" {
			nginxErrorPath = defaultNginxErrorPath
		}
	}
	log.Println("Nginx error.log path: " + nginxErrorPath)

	return Arguments{port, nginxAccessPath, nginxErrorPath}
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

func streamLog(w http.ResponseWriter, filePath string) {
	// Set headers for SSE (Server-Sent Events)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Open the log file
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "Failed to open log file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Stream the full content first (sending existing log entries)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		// Send each log line as SSE data
		fmt.Fprintf(w, "data: %s\n\n", scanner.Text())
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
	}

	if err := scanner.Err(); err != nil {
		http.Error(w, fmt.Sprintf("Error reading log file: %v", err), http.StatusInternalServerError)
		return
	}

	// Stream new log lines in real-time (tail -f equivalent)
	reader := bufio.NewReader(file)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			// EOF reached, wait and retry
			if err.Error() == "EOF" {
				time.Sleep(500 * time.Millisecond) // Retry after waiting
				continue
			}
			http.Error(w, fmt.Sprintf("Error reading log file: %v", err), http.StatusInternalServerError)
			return
		}

		// Send each new log line as SSE data
		fmt.Fprintf(w, "data: %s\n\n", line)
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
	}
}

func serveLog(w http.ResponseWriter, r *http.Request, filePath string) {
	// Get 'position' from the query parameters
	positionStr := r.URL.Query().Get("position")
	var position int64 = 0

	if positionStr != "" {
		value, err := strconv.ParseInt(positionStr, 10, 64)
		if err != nil {
			http.Error(w, "Invalid position value", http.StatusBadRequest)
			return
		}
		position = value
	}

	// Open the log file
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "Failed to open log file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Move the file pointer to the last position
	_, err = file.Seek(position, 0)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error seeking file: %v", err), http.StatusInternalServerError)
		return
	}

	// Use a buffer to efficiently read the file
	buffer := make([]byte, 4096) // Read in 4KB chunks
	var logs []string
	var totalRead int64
	var incompleteLine string

	// Read the file in chunks
	for {
		n, err := file.Read(buffer)
		if n == 0 {
			// End of file or nothing more to read
			if err != nil {
				if err.Error() != "EOF" {
					http.Error(w, fmt.Sprintf("Error reading file: %v", err), http.StatusInternalServerError)
				}
			}
			break
		}

		// Process he chunk into log lines
		totalRead += int64(n)
		content := string(buffer[:n])

		// If there's an incomplete line from the previous chunk, prepend it
		if incompleteLine != "" {
			content = incompleteLine + content
		}

		lines := strings.Split(content, "\n")
		incompleteLine = lines[len(lines)-1] // The last line may be incomplete
		lines = lines[:len(lines)-1]         // Exclude the incomplete line

		// Add the complete lines to the logs
		for _, line := range lines {
			if line != "" {
				logs = append(logs, line)
			}
		}

		// If we've reached the end of the file, break
		if n < len(buffer) {
			break
		}
	}

	// Adjust the position if we had an incomplete line
	newPosition := position + totalRead - int64(len(incompleteLine))

	if newPosition == position {
		log.Println("No new logs.")
	} else {
		log.Printf("Returning %d lines.\n", len(logs))
	}

	// Set the response as JSON
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"logs":     logs,
		"position": newPosition,
	}

	// Send the response
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

func checkServerStatus(w http.ResponseWriter, nginxAccessPath string, nginxErrorPath string) {
	status := map[string]interface{}{
		"status":    "ok",
		"uptime":    time.Since(startTime).String(),
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   "1.0.0",
	}

	if _, err := os.Stat(nginxAccessPath); err != nil {
		status["accessLogStatus"] = "not found"
	} else {
		status["accessLogStatus"] = "ok"
	}

	if _, err := os.Stat(nginxErrorPath); err != nil {
		status["errorLogStatus"] = "not found"
	} else {
		status["errorLogStatus"] = "ok"
	}

	// Send status as JSON response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(status)
}
