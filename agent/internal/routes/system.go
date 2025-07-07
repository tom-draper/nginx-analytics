package routes

import (
	"encoding/json"
	"net/http"

	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
	system "github.com/tom-draper/nginx-analytics/agent/pkg/system"
)

func ServeSystemResources(w http.ResponseWriter, r *http.Request) {
	systemInfo, err := system.MeasureSystem()
	if err != nil {
		logger.Log.Printf("Error collecting system info: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Failed to collect system information",
		})
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(systemInfo)
}
