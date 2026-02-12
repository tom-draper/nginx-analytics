package logs

import (
	"bufio"
	"compress/gzip"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

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

	// Open file for reading
	file, err := os.Open(filePath)
	if err != nil {
		return LogResult{}, err
	}
	defer file.Close()

	// Seek to position
	if _, err = file.Seek(position, 0); err != nil {
		return LogResult{}, err
	}

	var logs []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if line := scanner.Text(); line != "" {
			logs = append(logs, line)
		}
	}
	if err := scanner.Err(); err != nil {
		return LogResult{}, err
	}

	return LogResult{
		Logs:      logs,
		Positions: []Position{{Position: fileSize}},
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

	var logs []string
	scanner := bufio.NewScanner(gzReader)
	for scanner.Scan() {
		if line := scanner.Text(); line != "" {
			logs = append(logs, line)
		}
	}
	if err := scanner.Err(); err != nil {
		return LogResult{}, err
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
	sort.Strings(logFiles)

	if len(logFiles) == 0 {
		return LogResult{Logs: []string{}}, nil
	}

	// Initialize file positions
	filePositions := initializeFilePositions(logFiles, positions)

	type fileResult struct {
		logs     []string
		position Position
		hasPos   bool
	}

	// Read all files concurrently, preserving order
	results := make([]fileResult, len(filePositions))
	var wg sync.WaitGroup

	for i, filePos := range filePositions {
		isGzFile := strings.HasSuffix(filePos.Filename, ".gz")
		if isGzFile && !includeCompressed {
			continue
		}

		wg.Add(1)
		go func(idx int, fp Position) {
			defer wg.Done()
			fullPath := filepath.Join(dirPath, fp.Filename)
			isGz := strings.HasSuffix(fp.Filename, ".gz")

			var result LogResult
			var err error
			if isGz {
				result, err = readCompressedLogFile(fullPath)
			} else {
				result, err = readLogFile(fullPath, fp.Position)
			}
			if err != nil {
				logger.Log.Printf("Error reading file %s: %v", fullPath, err)
				return
			}

			r := fileResult{logs: result.Logs}
			if strings.HasSuffix(fp.Filename, ".log") {
				var pos int64
				if len(result.Positions) > 0 {
					pos = result.Positions[0].Position
				}
				r.position = Position{Filename: fp.Filename, Position: pos}
				r.hasPos = true
			}
			results[idx] = r
		}(i, filePos)
	}

	wg.Wait()

	// Collect results in order
	var allLogs []string
	var newPositions []Position
	for _, r := range results {
		allLogs = append(allLogs, r.logs...)
		if r.hasPos {
			newPositions = append(newPositions, r.position)
		}
	}

	return LogResult{
		Logs:      allLogs,
		Positions: newPositions,
	}, nil
}

// initializeFilePositions initializes positions for each log file
func initializeFilePositions(logFiles []string, positions []Position) []Position {
	posMap := make(map[string]int64, len(positions))
	for _, pos := range positions {
		posMap[pos.Filename] = pos.Position
	}

	filePositions := make([]Position, len(logFiles))
	for i, filename := range logFiles {
		position := posMap[filename] // 0 if not found
		if strings.HasSuffix(filename, ".gz") {
			position = 0
		}
		filePositions[i] = Position{Filename: filename, Position: position}
	}

	return filePositions
}
