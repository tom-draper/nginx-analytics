package logs

import (
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
)

type Position struct {
	Position int64  `json:"position"`
	Filename string `json:"filename,omitempty"`
}

type LogResult struct {
	Logs      []string   `json:"logs"`
	Positions []Position `json:"positions,omitempty"`
}

func GetLogs(path string, positions []Position, isErrorLog bool, includeCompressed bool) (LogResult, error) {
	// Check if we're serving a directory or a single file
	fileInfo, err := os.Stat(path)
	if err != nil {
		return LogResult{}, fmt.Errorf("path error: %w", err)
	}

	var result LogResult
	if fileInfo.IsDir() {
		// Serve logs from directory
		result, err = GetDirectoryLogs(path, positions, isErrorLog, includeCompressed)
	} else {
		// Serve a single log file
		singlePos := int64(0)
		if len(positions) > 0 {
			singlePos = positions[0].Position
		}
		result, err = GetLog(path, singlePos)
	}

	return result, err
}

func GetLog(filePath string, position int64) (LogResult, error) {
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		logger.Log.Println("File not found")
		return LogResult{}, fmt.Errorf("file not found: %s", filePath)
	}

	var result LogResult
	var err error

	// Handle different file types
	if strings.HasSuffix(filePath, ".gz") {
		result, err = readCompressedLogFile(filePath)
		if err != nil {
			return LogResult{}, fmt.Errorf("error reading compressed log file: %w", err)
		}
	} else {
		result, err = readLogFile(filePath, position)
		if err != nil {
			return LogResult{}, fmt.Errorf("error reading log file: %w", err)
		}
	}

	return result, nil
}

func readLogFile(filePath string, position int64) (LogResult, error) {
	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return LogResult{}, err
	}

	fileSize := fileInfo.Size()

	// If position is past the file size, no new logs
	if position >= fileSize {
		return LogResult{Logs: []string{}, Positions: []Position{{Position: position}}}, nil
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
		}
	}

	// Add the last line if it's not empty and doesn't end with newline
	lastLine := buffer.String()
	if lastLine != "" {
		logs = append(logs, lastLine)
	}

	newPosition := fileSize

	return LogResult{
		Logs:      logs,
		Positions: []Position{{Position: newPosition}},
	}, nil
}

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
		return LogResult{Logs: []string{}, Positions: []Position{{Position: position}}}, nil
	}

	// Get new content from position
	newContent := strContent[position:]

	// Split into lines and filter out empty lines
	lines := []string{}
	for line := range strings.SplitSeq(newContent, "\n") {
		if strings.TrimSpace(line) != "" {
			lines = append(lines, line)
		}
	}

	return LogResult{
		Logs:      lines,
		Positions: []Position{{Position: int64(len(strContent))}},
	}, nil
}

func readCompressedLogFile(filePath string) (LogResult, error) {
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
		Logs:      logs,
		Positions: []Position{{Position: 0}}, // Always return 0 as position for gzipped files
	}, nil
}

func GetDirectoryLogs(dirPath string, positions []Position, isErrorLog bool, includeCompressed bool) (LogResult, error) {
	// Read directory entries
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return LogResult{}, fmt.Errorf("failed to read directory: %w", err)
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
		return LogResult{Logs: []string{}}, nil
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
			result, err = readCompressedLogFile(fullPath)
		} else {
			result, err = readLogFile(fullPath, filePos.Position)
		}

		if err != nil {
			logger.Log.Printf("Error reading file %s: %v", fullPath, err)
			continue
		}

		// Add logs to result
		if len(result.Logs) > 0 {
			allLogs = append(allLogs, result.Logs...)
		}

		// Only track positions for .log files
		if strings.HasSuffix(filePos.Filename, ".log") {
			var position int64 = 0
			if len(result.Positions) > 0 {
				position = result.Positions[0].Position
			}
			newPositions = append(newPositions, Position{
				Filename: filePos.Filename,
				Position: position,
			})
		}
	}

	// Respond with combined results
	return LogResult{
		Logs:      allLogs,
		Positions: newPositions,
	}, nil
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
