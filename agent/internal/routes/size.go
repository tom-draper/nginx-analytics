package routes

import (
	"encoding/json"
	"fmt"
	"net/http"

	logs "github.com/tom-draper/nginx-analytics/agent/pkg/logs"
)

func ServeLogSizes(w http.ResponseWriter, r *http.Request, dirPath string) {
	logSizes, err := logs.GetLogSizes(dirPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("error serving logs size: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logSizes)
}

func ServeLogSize(w http.ResponseWriter, r *http.Request, filePath string) {
	logSize, err := logs.GetLogSize(filePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("error serving log size: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logSize)
}
