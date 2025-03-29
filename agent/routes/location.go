package routes

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"sync"

	"github.com/oschwald/geoip2-golang"
)

// Location represents geolocation information for an IP address
type Location struct {
	IPAddress string `json:"ipAddress"`
	Country   string `json:"country,omitempty"`
	City      string `json:"city,omitempty"`
}

var (
	cityReader    *geoip2.Reader
	countryReader *geoip2.Reader
	initOnce      sync.Once
	initErr       error
	initDone      = make(chan struct{})
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

	var locations []*Location
	if len(ipAddresses) > 0 {
		log.Printf("Resolving %d locations\n", len(ipAddresses))
		locations, err = GetLocations(ipAddresses)
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
	err := InitializeLookups()
	return err == nil && (cityReader != nil || countryReader != nil)
}

// InitializeLookups ensures the MaxMind databases are loaded
func InitializeLookups() error {
	initOnce.Do(func() {
		// Try to open the city database first
		var cityErr error
		cityReader, cityErr = geoip2.Open("GeoLite2-City.mmdb")
		if cityErr != nil {
			// If city database fails, try to open the country database
			var countryErr error
			countryReader, countryErr = geoip2.Open("GeoLite2-Country.mmdb")
			if countryErr != nil {
				log.Println("Failed to load GeoLite2 City database:", cityErr)
				log.Println("Failed to load GeoLite2 Country database:", countryErr)
				initErr = countryErr
			} else {
				log.Println("GeoLite2 Country database loaded successfully")
			}
		} else {
			log.Println("GeoLite2 City database loaded successfully")
		}
		close(initDone)
	})

	// Wait for initialization to complete
	<-initDone
	return initErr
}

// LocationLookup returns geolocation information for a single IP address
func LocationLookup(ipAddress string) (*Location, error) {
	// Ensure databases are initialized
	if err := InitializeLookups(); err != nil && cityReader == nil && countryReader == nil {
		return &Location{
			IPAddress: ipAddress,
			Country:   "",
			City:      "",
		}, nil
	}

	// Parse the IP address
	ip := net.ParseIP(ipAddress)
	if ip == nil {
		return &Location{
			IPAddress: ipAddress,
			Country:   "",
			City:      "",
		}, nil
	}

	location := &Location{
		IPAddress: ipAddress,
	}

	// Try city lookup first if available
	if cityReader != nil {
		city, err := cityReader.City(ip)
		if err == nil {
			location.Country = city.Country.IsoCode
			if city.City.Names != nil {
				location.City = city.City.Names["en"]
			}
			return location, nil
		}
	}

	// Fall back to country lookup if available
	if countryReader != nil {
		country, err := countryReader.Country(ip)
		if err == nil {
			location.Country = country.Country.IsoCode
			return location, nil
		}
	}

	// Return empty location if no lookup was successful
	return location, nil
}

// GetLocations performs geolocation lookups for multiple IP addresses
func GetLocations(ipAddresses []string) ([]*Location, error) {
	// Ensure databases are initialized
	if err := InitializeLookups(); err != nil && cityReader == nil && countryReader == nil {
		// Return empty locations if neither database is available
		locations := make([]*Location, len(ipAddresses))
		for i, ip := range ipAddresses {
			locations[i] = &Location{
				IPAddress: ip,
				Country:   "",
				City:      "",
			}
		}
		return locations, nil
	}

	// Use a wait group to track parallel lookups
	var wg sync.WaitGroup
	locations := make([]*Location, len(ipAddresses))

	// Perform lookups in parallel
	for i, ip := range ipAddresses {
		wg.Add(1)
		go func(idx int, ipAddr string) {
			defer wg.Done()
			location, _ := LocationLookup(ipAddr)
			locations[idx] = location
		}(i, ip)
	}

	// Wait for all lookups to complete
	wg.Wait()
	return locations, nil
}

// Close releases resources used by MaxMind readers
func Close() {
	if cityReader != nil {
		cityReader.Close()
	}
	if countryReader != nil {
		countryReader.Close()
	}
}
