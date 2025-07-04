package location

import (
	"fmt"
	"bytes"
	"encoding/json"
	"net/http"
	"sort"

	"github.com/tom-draper/nginx-analytics/agent/pkg/location"
	loc "github.com/tom-draper/nginx-analytics/agent/pkg/location"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
)

type Location struct {
	Location string
	Count    int
}

type Locations struct {
	Locations []Location
	cache     map[string]loc.Location
}

func (l *Locations) UpdateLocations(logs []nginx.NGINXLog, serverURL string) {
	if !loc.LocationsEnabled() {
		return
	}

	l.maintainCache(logs, serverURL)
	l.updateLocations(logs)
}

func (l *Locations) updateLocations(logs []nginx.NGINXLog) {
	locationCounter := make(map[string]int)

	for _, log := range logs {
		location := l.cache[log.IPAddress]
		if location.Country == "" {
			continue
		}

		locationCounter[location.Country]++
	}

	locations := make([]Location, 0, len(locationCounter))
	for loc, count := range locationCounter {
		locations = append(locations, Location{Location: loc, Count: count})
	}

	sort.Slice(locations, func(i, j int) bool {
		return locations[i].Count > locations[j].Count
	})

	l.Locations = locations
}

func (l *Locations) maintainCache(logs []nginx.NGINXLog, serverURL string) {
	ipAddresses := getIPAddresses(logs)
	if len(ipAddresses) == 0 {
		return
	}

	filterCached := filterCached(ipAddresses, l.cache)
	if len(filterCached) == 0 {
		return
	}

	var locations []location.Location
	var err error
	if serverURL != "" {
		locations, err = fetchLocations(serverURL)
		if err != nil {
			return
		}
	} else {
		locations, err = loc.ResolveLocations(filterCached)
		if err != nil {
			return
		}
	}
	
	l.updateCache(locations, filterCached)
}

func fetchLocations(serverURL string) ([]location.Location, error) {
	reqBody, err := json.Marshal(filterCached)
	if err != nil {
		return nil, err
	}

	url := serverURL + "/api/location"
	resp, err := http.Post(url, "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var locations []location.Location
	err = json.NewDecoder(resp.Body).Decode(&locations)
	return locations, err
}

func (l *Locations) updateCache(locations []loc.Location, ipAddresses []string) {
	if len(locations) == 0 || (len(locations) != len(ipAddresses)) {
		return
	}

	if l.cache == nil {
		l.cache = make(map[string]loc.Location)
	}

	for i, location := range locations {
		ip := ipAddresses[i]
		if _, exists := l.cache[ip]; !exists {
			l.cache[ip] = location
		}
	}
}

func getIPAddresses(logs []nginx.NGINXLog) []string {
	ipAddresses := make([]string, 0)
	for _, log := range logs {
		if log.IPAddress != "" {
			ipAddresses = append(ipAddresses, log.IPAddress)
		}
	}

	return ipAddresses
}

func filterCached(ipAddresses []string, cache map[string]loc.Location) []string {
	var filtered []string
	for _, ip := range ipAddresses {
		if _, ok := cache[ip]; !ok {
			filtered = append(filtered, ip)
		}
	}

	return filtered
}
