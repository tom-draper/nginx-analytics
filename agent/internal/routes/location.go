package routes

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	location "github.com/tom-draper/nginx-analytics/agent/pkg/location"
)

func ServeLocations(w http.ResponseWriter, r *http.Request) {
	log.Println("Serving locations...")

	// Ensure request body is closed after reading
	defer r.Body.Close()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Println("Failed to read request body:", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	var ipAddresses []string
	if err := json.Unmarshal(body, &ipAddresses); err != nil {
		log.Println("Failed to parse request body:", err)
		http.Error(w, "Failed to parse request body", http.StatusBadRequest)
		return
	}

	var locations []*location.Location
	if len(ipAddresses) > 0 {
		log.Printf("Resolving %d locations\n", len(ipAddresses))
		locations, err = location.ResolveLocations(ipAddresses)
		if err != nil {
			log.Println("Failed to get locations:", err)
			http.Error(w, "Failed to get locations", http.StatusInternalServerError)
			return
		}
	}

	// Set header before writing response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(locations)
}

func LocationsEnabled() bool {
	return location.LocationsEnabled()
}