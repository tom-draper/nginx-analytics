package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
	logs "github.com/tom-draper/nginx-analytics/agent/pkg/logs"
)

func ServeLogs(w http.ResponseWriter, r *http.Request, path string, positions []logs.Position, isErrorLog bool, includeCompressed bool) {
	w.Header().Set("Content-Type", "application/json")

	// Check if we're serving a directory or a single file
	fileInfo, err := os.Stat(path)
	if err != nil {
		http.Error(w, fmt.Sprintf("path error: %v", err), http.StatusInternalServerError)
		return
	}

	if fileInfo.IsDir() {
		// Serve logs from directory
		serveLogs(w, path, positions, isErrorLog, includeCompressed)
	} else {
		// Serve a single log file
		singlePos := int64(0)
		if len(positions) > 0 {
			singlePos = positions[0].Position
		}

		serveLog(w, path, singlePos)
	}
}

func serveLogs(w http.ResponseWriter, dirPath string, positions []logs.Position, isErrorLog bool, includeCompressed bool) {
	// Check if file exists
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		logger.Log.Println("File not found")
		respondWithError(w, "file not found", http.StatusNotFound)
		return
	}

	// Serve logs from directory
	result, err := logs.GetDirectoryLogs(dirPath, positions, isErrorLog, includeCompressed)
	if err != nil {
		respondWithError(w, fmt.Sprintf("error reading directory logs: %v", err), http.StatusInternalServerError)
		return
	}

	respondWithJSON(w, result)
}

func serveLog(w http.ResponseWriter, filePath string, position int64) {
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		logger.Log.Println("File not found")
		respondWithError(w, "file not found", http.StatusNotFound)
		return
	}

	result, err := logs.GetLog(filePath, position)
	if err != nil {
		respondWithError(w, fmt.Sprintf("error reading log file: %v", err), http.StatusInternalServerError)
		return
	}

	respondWithJSON(w, result)
}

func respondWithJSON(w http.ResponseWriter, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write(jsonData)
}

func respondWithError(w http.ResponseWriter, message string, status int) {
	errorResp := map[string]string{"error": message}
	jsonData, _ := json.Marshal(errorResp)
	w.WriteHeader(status)
	w.Write(jsonData)
}
