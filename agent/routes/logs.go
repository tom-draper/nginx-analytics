package routes

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Position represents a file's current read position
type Position struct {
	Position int64  `json:"position"`
	Filename string `json:"filename"`
}

// LogResult represents the response structure for log requests
type LogResult struct {
	Logs      []string   `json:"logs"`
	Position  int64      `json:"position,omitempty"`
	Positions []Position `json:"positions,omitempty"`
}

func ServeLogs(w http.ResponseWriter, r *http.Request, dirPath string) {
	serveLogs(w, r, dirPath, false)
}

func ServeErrorLogs(w http.ResponseWriter, r *http.Request, dirPath string) {
	serveLogs(w, r, dirPath, true)
}

// ServeLogs handles requests for logs, supporting multiple files and positions
func serveLogs(w http.ResponseWriter, r *http.Request, dirPath string, isErrorLog bool) {
	// Set JSON content type
	w.Header().Set("Content-Type", "application/json")

	// Get positions from query parameters
	positionsStr := r.URL.Query().Get("positions")
	var positions []Position

	if positionsStr != "" {
		if err := json.Unmarshal([]byte(positionsStr), &positions); err != nil {
			http.Error(w, fmt.Sprintf("Failed to parse positions: %v", err), http.StatusBadRequest)
			return
		}
	}

	// Check if this is first request or not
	includeCompressed := r.URL.Query().Get("includeCompressed") == "true"

	// Check if we're serving a directory or a single file
	fileInfo, err := os.Stat(dirPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Path error: %v", err), http.StatusInternalServerError)
		return
	}

	if fileInfo.IsDir() {
		// Serve logs from directory
		serveDirectoryLogs(w, dirPath, positions, isErrorLog, includeCompressed)
	} else {
		// Serve a single log file
		singlePos := int64(0)
		if len(positions) > 0 {
			singlePos = positions[0].Position
		}
		serveSingleLog(w, dirPath, singlePos)
	}
}

// serveSingleLog serves logs from a single file
func serveSingleLog(w http.ResponseWriter, filePath string, position int64) {
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		respondWithError(w, "File not found", http.StatusNotFound)
		return
	}

	var result LogResult
	var err error

	// Handle different file types
	if strings.HasSuffix(filePath, ".gz") {
		result, err = readGzippedLogFile(filePath)
	} else {
		result, err = readNormalLogFile(filePath, position)
	}

	if err != nil {
		respondWithError(w, fmt.Sprintf("Error reading log file: %v", err), http.StatusInternalServerError)
		return
	}

	// Respond with results
	respondWithJSON(w, result)
}

// readNormalLogFile reads content from a normal log file starting at the given position
func readNormalLogFile(filePath string, position int64) (LogResult, error) {
	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return LogResult{}, err
	}

	fileSize := fileInfo.Size()

	// If position is past the file size, no new logs
	if position >= fileSize {
		return LogResult{Logs: []string{}, Position: position}, nil
	}

	// Special handling for error logs with size 0
	if fileSize == 0 && strings.Contains(filePath, "error") {
		return readErrorLogDirectly(filePath, position)
	}

	// Open file for reading
	file, err := os.Open(filePath)
	if err != nil {
		return LogResult{}, err
	}
	defer file.Close()

	// Seek to position
	_, err = file.Seek(position, 0)
	if err != nil {
		return LogResult{}, err
	}

	// Read file content
	var logs []string
	var buffer strings.Builder
	buf := make([]byte, 4096)
	// var lastChar byte

	for {
		n, err := file.Read(buf)
		if err != nil && err != io.EOF {
			return LogResult{}, err
		}
		if n == 0 {
			break
		}

		for i := 0; i < n; i++ {
			c := buf[i]
			if c == '\n' {
				// We have a complete line
				line := buffer.String()
				if line != "" {
					logs = append(logs, line)
				}
				buffer.Reset()
			} else {
				buffer.WriteByte(c)
			}
			// lastChar = c
		}
	}

	// Add the last line if it's not empty and doesn't end with newline
	lastLine := buffer.String()
	if lastLine != "" {
		logs = append(logs, lastLine)
	}

	newPosition := fileSize 

	return LogResult{Logs: logs, Position: newPosition}, nil
}

// readErrorLogDirectly handles special case for error logs that report size 0 but contain data
func readErrorLogDirectly(filePath string, position int64) (LogResult, error) {
	// Read file content directly
	content, err := os.ReadFile(filePath)
	if err != nil {
		return LogResult{}, err
	}

	// Convert to string
	strContent := string(content)

	// If position is beyond content length, nothing new to read
	if position >= int64(len(strContent)) {
		return LogResult{Logs: []string{}, Position: position}, nil
	}

	// Get new content from position
	newContent := strContent[position:]

	// Split into lines and filter out empty lines
	lines := []string{}
	for _, line := range strings.Split(newContent, "\n") {
		if strings.TrimSpace(line) != "" {
			lines = append(lines, line)
		}
	}

	return LogResult{
		Logs:     lines,
		Position: int64(len(strContent)),
	}, nil
}

// readGzippedLogFile reads and decompresses a gzipped log file
func readGzippedLogFile(filePath string) (LogResult, error) {
	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		return LogResult{}, err
	}
	defer file.Close()

	// Create gzip reader
	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return LogResult{}, err
	}
	defer gzReader.Close()

	// Read decompressed content
	content, err := io.ReadAll(gzReader)
	if err != nil {
		return LogResult{}, err
	}

	// Split into lines and filter out empty lines
	var logs []string
	for _, line := range strings.Split(string(content), "\n") {
		if strings.TrimSpace(line) != "" {
			logs = append(logs, line)
		}
	}

	return LogResult{
		Logs:     logs,
		Position: 0, // Always return 0 as position for gzipped files
	}, nil
}

// serveDirectoryLogs serves logs from a directory containing multiple log files
func serveDirectoryLogs(w http.ResponseWriter, dirPath string, positions []Position, isErrorLog bool, includeCompressed bool) {
	// Read directory entries
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		respondWithError(w, fmt.Sprintf("Failed to read directory: %v", err), http.StatusInternalServerError)
		return
	}

	// Filter log files
	var logFiles []string
	for _, entry := range entries {
		fileName := entry.Name()
		// Check if it's a log file
		isLogFile := strings.HasSuffix(fileName, ".log")
		isGzipFile := strings.HasSuffix(fileName, ".gz")

		// Filter by log type and extension
		if (isLogFile || (isGzipFile && includeCompressed)) &&
			(isErrorLog && strings.Contains(fileName, "error") || !isErrorLog && !strings.Contains(fileName, "error")) {
			logFiles = append(logFiles, fileName)
		}
	}

	// Sort log files alphabetically
	for i := range len(logFiles) - 1 {
		for j := i + 1; j < len(logFiles); j++ {
			if logFiles[i] > logFiles[j] {
				logFiles[i], logFiles[j] = logFiles[j], logFiles[i]
			}
		}
	}

	if len(logFiles) == 0 {
		respondWithJSON(w, LogResult{Logs: []string{}})
		return
	}

	// Initialize file positions
	filePositions := initializeFilePositions(logFiles, positions)

	// Read logs from all files
	var allLogs []string
	var newPositions []Position

	for _, filePos := range filePositions {
		fullPath := filepath.Join(dirPath, filePos.Filename)
		isGzFile := strings.HasSuffix(filePos.Filename, ".gz")

		// Skip gz files if not first request
		if isGzFile && !includeCompressed {
			continue
		}

		var result LogResult
		var err error

		if isGzFile {
			result, err = readGzippedLogFile(fullPath)
		} else {
			result, err = readNormalLogFile(fullPath, filePos.Position)
		}

		if err != nil {
			log.Printf("Error reading file %s: %v", fullPath, err)
			continue
		}

		// Add logs to result
		if len(result.Logs) > 0 {
			allLogs = append(allLogs, result.Logs...)
		}

		// Only track positions for .log files
		if strings.HasSuffix(filePos.Filename, ".log") {
			newPositions = append(newPositions, Position{
				Filename: filePos.Filename,
				Position: result.Position,
			})
		}
	}

	// Respond with combined results
	respondWithJSON(w, LogResult{
		Logs:      allLogs,
		Positions: newPositions,
	})
}

// initializeFilePositions initializes positions for each log file
func initializeFilePositions(logFiles []string, positions []Position) []Position {
	var filePositions []Position

	for _, filename := range logFiles {
		// Find position for this file if it exists
		var position int64 = 0
		for _, pos := range positions {
			if pos.Filename == filename {
				position = pos.Position
				break
			}
		}

		// For .gz files, always use position 0
		if strings.HasSuffix(filename, ".gz") {
			position = 0
		}

		filePositions = append(filePositions, Position{
			Filename: filename,
			Position: position,
		})
	}

	return filePositions
}

// respondWithJSON sends a JSON response
func respondWithJSON(w http.ResponseWriter, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write(jsonData)
}

// respondWithError sends an error response
func respondWithError(w http.ResponseWriter, message string, status int) {
	errorResp := map[string]string{"error": message}
	jsonData, _ := json.Marshal(errorResp)
	w.WriteHeader(status)
	w.Write(jsonData)
}

func ServeLog(w http.ResponseWriter, r *http.Request, filePath string) {
	serveLog(w, r, filePath)
}

func ServeErrorLog(w http.ResponseWriter, r *http.Request, filePath string) {
	serveLog(w, r, filePath)
}

// ServeLog handles requests for logs from a single file
func serveLog(w http.ResponseWriter, r *http.Request, filePath string) {
	// Set JSON content type
	w.Header().Set("Content-Type", "application/json")

	// Get position from the query parameters
	var position int64 = 0
	posStr := r.URL.Query().Get("position")
	if posStr != "" {
		pos, err := strconv.ParseInt(posStr, 10, 64)
		if err == nil {
			position = pos
		}
	}

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		respondWithError(w, fmt.Sprintf("File not found: %s", filePath), http.StatusNotFound)
		return
	}

	var result LogResult
	var err error

	// Handle different file types
	if strings.HasSuffix(filePath, ".gz") {
		result, err = readGzippedLogFile(filePath)
	} else {
		result, err = readNormalLogFile(filePath, position)
	}

	if err != nil {
		respondWithError(w, fmt.Sprintf("Error reading log file: %v", err), http.StatusInternalServerError)
		return
	}

	// Respond with results
	respondWithJSON(w, result)
}
