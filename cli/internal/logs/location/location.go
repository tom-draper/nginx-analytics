package location

import (
	"sort"

	loc "github.com/tom-draper/nginx-analytics/agent/pkg/location"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
)

type location struct {
	Location string
	Count    int
}

type Locations struct {
	Locations []location
	cache     map[string]loc.Location
}

func (l *Locations) UpdateLocations(logs []n.NGINXLog) {
	if !loc.LocationsEnabled() {
		return
	}

	l.maintainCache(logs)
	l.updateLocations(logs)
}

func (l *Locations) updateLocations(logs []n.NGINXLog) {
	locationCounter := make(map[string]int)

	for _, log := range logs {
		location := l.cache[log.IPAddress]
		if location.Country == "" {
			continue
		}

		locationCounter[location.Country]++
	}

	locations := make([]location, 0, len(locationCounter))
	for loc, count := range locationCounter {
		locations = append(locations, location{Location: loc, Count: count})
	}

	sort.Slice(locations, func(i, j int) bool {
		return locations[i].Count > locations[j].Count
	})

	l.Locations = locations
}

func (l *Locations) maintainCache(logs []n.NGINXLog) {
	ipAddresses := getIPAddresses(logs)
	if len(ipAddresses) == 0 {
		return
	}

	filterCached := filterCached(ipAddresses, l.cache)
	if len(filterCached) > 0 {
		locations, err := loc.ResolveLocations(filterCached)
		if err != nil {
			return
		}

		l.updateCache(locations, filterCached)
	}
}

func (l *Locations) updateCache(locations []*loc.Location, ipAddresses []string) {
	if len(locations) == 0 || (len(locations) != len(ipAddresses)) {
		return
	}

	if l.cache == nil {
		l.cache = make(map[string]loc.Location)
	}

	for i, location := range locations {
		ip := ipAddresses[i]
		if _, exists := l.cache[ip]; !exists {
			l.cache[ip] = *location
		}
	}
}

func getIPAddresses(logs []n.NGINXLog) []string {
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
