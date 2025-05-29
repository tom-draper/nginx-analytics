package logs

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// LogFileSize represents the size information for a single log file
type LogFileSize struct {
	Name      string `json:"name"`
	Size      int64  `json:"size"`
	Extension string `json:"extension"`
}

// LogFilesSummary represents summary information for log files
type LogFilesSummary struct {
	TotalSize            int64 `json:"totalSize"`
	LogFilesSize         int64 `json:"logFilesSize"`
	CompressedFilesSize  int64 `json:"compressedFilesSize"`
	TotalFiles           int   `json:"totalFiles"`
	LogFilesCount        int   `json:"logFilesCount"`
	CompressedFilesCount int   `json:"compressedFilesCount"`
}

// LogSizes represents the complete log size information
type LogSizes struct {
	Files   []LogFileSize   `json:"files"`
	Summary LogFilesSummary `json:"summary"`
}

func GetLogSizes(dirPath string) (LogSizes, error) {
	var files []LogFileSize
	var summary LogFilesSummary

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() {
			fileName := filepath.Base(path)
			extension := strings.ToLower(filepath.Ext(path))
			fileSize := info.Size()

			// Add to files list
			files = append(files, LogFileSize{
				Name:      fileName,
				Size:      fileSize,
				Extension: extension,
			})

			// Update summary information
			summary.TotalSize += fileSize
			summary.TotalFiles++

			if extension == ".log" {
				summary.LogFilesSize += fileSize
				summary.LogFilesCount++
			} else if extension == ".gz" || extension == ".zip" || extension == ".tar" {
				summary.CompressedFilesSize += fileSize
				summary.CompressedFilesCount++
			}
		}
		return nil
	})

	if err != nil {
		return LogSizes{}, fmt.Errorf("error walking directory: %w", err)
	}

	return LogSizes{
		Files:   files,
		Summary: summary,
	}, nil
}

func GetLogSize(filePath string) (LogSizes, error) {
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return LogSizes{}, fmt.Errorf("log file not found: %s", filePath)
		} else {
			return LogSizes{}, fmt.Errorf("error accessing file: %w", err)
		}
	}

	fileName := filepath.Base(filePath)
	extension := strings.ToLower(filepath.Ext(filePath))
	fileSize := fileInfo.Size()

	// Create a response with a single file and its summary
	response := LogSizes{
		Files: []LogFileSize{
			{
				Name:      fileName,
				Size:      fileSize,
				Extension: extension,
			},
		},
		Summary: LogFilesSummary{
			TotalSize:            fileSize,
			LogFilesSize:         fileSize,
			CompressedFilesSize:  0,
			TotalFiles:           1,
			LogFilesCount:        1,
			CompressedFilesCount: 0,
		},
	}

	// If it's a compressed file, update the summary
	if extension == ".gz" || extension == ".zip" || extension == ".tar" {
		response.Summary.LogFilesSize = 0
		response.Summary.CompressedFilesSize = fileSize
		response.Summary.LogFilesCount = 0
		response.Summary.CompressedFilesCount = 1
	}

	return response, nil
}
