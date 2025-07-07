package location

import (
	"net"
	"sync"

	"github.com/oschwald/geoip2-golang"
	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
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
				logger.Log.Println("Failed to load GeoLite2 City database:", cityErr)
				logger.Log.Println("Failed to load GeoLite2 Country database:", countryErr)
				initErr = countryErr
			} else {
				logger.Log.Println("GeoLite2 Country database loaded successfully")
			}
		} else {
			logger.Log.Println("GeoLite2 City database loaded successfully")
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
func ResolveLocations(ipAddresses []string) ([]*Location, error) {
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
