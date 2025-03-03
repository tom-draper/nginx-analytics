package main

import (
	"bufio"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
)

const defaultPort string = "8080"

var authToken string // Declare variable to hold the passphrase

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Read the passphrase from environment variable
	authToken = os.Getenv("AUTH_TOKEN")
	if authToken == "" {
		log.Fatal("AUTH_TOKEN not set in the environment")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	http.HandleFunc("/access", func(w http.ResponseWriter, r *http.Request) {
		if !isAuthenticated(r) {
            http.Error(w, "Forbidden: Invalid Auth Token", http.StatusForbidden)
            return
        }
		streamLog(w, "/var/log/nginx/access.log")
	})

	http.HandleFunc("/error", func(w http.ResponseWriter, r *http.Request) {
		if !isAuthenticated(r) {
            http.Error(w, "Forbidden: Invalid Auth Token", http.StatusForbidden)
            return
        }
		streamLog(w, "/var/log/nginx/error.log")
	})

	// Handle graceful shutdown
	go func() {
		fmt.Printf("Log agent running on :%s...\n", port)
		if err := http.ListenAndServe(":" + port, nil); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for an interrupt signal to gracefully shut down the server
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan

	fmt.Println("Shutting down...")
}

func isAuthenticated(r *http.Request) bool {
	// Extract the passphrase from the Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return false
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		return false
	}

	// Compare the passphrase from the header with the expected passphrase
	providedPassphrase := strings.TrimPrefix(authHeader, "Bearer ")
	return providedPassphrase == authToken
}

func streamLog(w http.ResponseWriter, filePath string) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "Failed to open log file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Move to the end of the file to stream the new logs.
	reader := bufio.NewReader(file)
	file.Seek(0, 2) // Skip the file's current content and start at the end

	// Keep reading new log lines
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			// Handle errors gracefully
			if err.Error() == "EOF" {
				time.Sleep(500 * time.Millisecond) // Wait and retry
				continue
			}
			http.Error(w, fmt.Sprintf("Error reading log file: %v", err), http.StatusInternalServerError)
			return
		}
		// Stream the log line to the client using SSE
		fmt.Fprintf(w, "data: %s\n\n", line)
		// Flush the response to the client
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
	}
}
