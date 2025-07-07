package model

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/charmbracelet/x/term"

	"github.com/tom-draper/nginx-analytics/cli/internal/config"
	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
	parse "github.com/tom-draper/nginx-analytics/agent/pkg/logs"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	l "github.com/tom-draper/nginx-analytics/cli/internal/logs"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
)

type LogService struct {
	serverURL string
}

func NewLogService(serverURL string) *LogService {
	return &LogService{
		serverURL: serverURL,
	}
}

// LoadLogs loads and parses nginx logs from either local file or remote server
func (ls *LogService) LoadLogs(accessPath string, positions []parse.Position, isErrorLog bool, includeCompressed bool) ([]nginx.NGINXLog, []parse.Position, error) {
	result := ls.getLogs(accessPath, positions, isErrorLog, includeCompressed)
	return l.ParseNginxLogs(result.Logs), result.Positions, nil
}

// LoadLogSizes loads log size information
func (ls *LogService) LoadLogSizes(accessPath string) (parse.LogSizes, error) {
	if ls.serverURL != "" {
		return ls.fetchLogsSizes()
	}
	return ls.readLogsSizes(accessPath)
}

func (ls *LogService) FilterLogsByPeriod(logs []nginx.NGINXLog, period period.Period) []nginx.NGINXLog {
	return l.FilterLogs(logs, period)
}

func (ls *LogService) getLogs(accessPath string, positions []parse.Position, isErrorLog bool, includeCompressed bool) parse.LogResult {
	var logs parse.LogResult
	var err error

	if ls.serverURL != "" {
		logs, err = ls.fetchLogs(positions, isErrorLog, includeCompressed)
	} else {
		logs, err = ls.readLogs(accessPath, positions, isErrorLog, includeCompressed)
	}

	if err != nil {
		logger.Log.Printf("Error getting logs: %v", err)
	}

	return logs
}

func (ls *LogService) readLogs(path string, positions []parse.Position, isErrorLog bool, includeCompressed bool) (parse.LogResult, error) {
	if path == "" {
		return parse.LogResult{}, nil
	}
	return parse.GetLogs(path, positions, isErrorLog, includeCompressed)
}

func (ls *LogService) fetchLogs(positions []parse.Position, isErrorLog bool, includeCompressed bool) (parse.LogResult, error) {
	path := "/api/logs/access"
	if isErrorLog {
		path = "/api/logs/error"
	}

	endpoint, err := url.Parse(ls.serverURL + path)
	if err != nil {
		return parse.LogResult{}, fmt.Errorf("invalid base URL: %w", err)
	}

	params := url.Values{}
	params.Add("includeCompressed", fmt.Sprintf("%t", includeCompressed))
	if len(positions) > 0 {
		jsonStr, err := ls.positionsToJSON(positions)
		if err != nil {
			return parse.LogResult{}, err
		}
		params.Add("positions", jsonStr)
	}
	endpoint.RawQuery = params.Encode()

	body, err := ls.httpGetAndReadBody(endpoint.String())
	if err != nil {
		return parse.LogResult{}, err
	}

	var result parse.LogResult
	if err := json.Unmarshal(body, &result); err != nil {
		return parse.LogResult{}, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return result, nil
}

func (ls *LogService) readLogsSizes(path string) (parse.LogSizes, error) {
	return parse.GetLogSizes(path)
}

func (ls *LogService) fetchLogsSizes() (parse.LogSizes, error) {
	url := ls.serverURL + "/api/system/logs"
	body, err := ls.httpGetAndReadBody(url)
	if err != nil {
		return parse.LogSizes{}, err
	}

	var result parse.LogSizes
	if err := json.Unmarshal(body, &result); err != nil {
		return parse.LogSizes{}, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return result, nil
}

func (ls *LogService) positionsToJSON(positions []parse.Position) (string, error) {
	bytes, err := json.Marshal(positions)
	if err != nil {
		return "", fmt.Errorf("failed to marshal positions: %w", err)
	}
	return string(bytes), nil
}

func (ls *LogService) httpGetAndReadBody(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to %s: %w", url, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", url, err)
	}

	return body, nil
}

type SystemService struct {
	serverURL string
}

func NewSystemService(serverURL string) *SystemService {
	return &SystemService{
		serverURL: serverURL,
	}
}

func (ss *SystemService) GetSystemInfo() (system.SystemInfo, error) {
	if ss.serverURL != "" {
		return ss.fetchSystemInfo()
	}
	return system.MeasureSystem()
}

func (ss *SystemService) fetchSystemInfo() (system.SystemInfo, error) {
	url := ss.serverURL + "/api/system"

	resp, err := http.Get(url)
	if err != nil {
		return system.SystemInfo{}, fmt.Errorf("failed to make request to %s: %w", url, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return system.SystemInfo{}, fmt.Errorf("failed to read response body from %s: %w", url, err)
	}

	var sysInfo system.SystemInfo
	if err := json.Unmarshal(body, &sysInfo); err != nil {
		return system.SystemInfo{}, fmt.Errorf("failed to parse system info JSON: %w", err)
	}

	return sysInfo, nil
}

// CardFactory handles the creation of dashboard cards
type CardFactory struct{}

// NewCardFactory creates a new CardFactory instance
func NewCardFactory() *CardFactory {
	return &CardFactory{}
}

// CreateCards creates all dashboard cards with the given data
func (cf *CardFactory) CreateCards(currentLogs []nginx.NGINXLog, p period.Period, logSizes parse.LogSizes, serverURL string) map[string]*cards.Card {
	// Create specific card instances
	successRateCard := cards.NewSuccessRateCard(currentLogs, p)
	requestsCard := cards.NewRequestsCard(currentLogs, p)
	usersCard := cards.NewUsersCard(currentLogs, p)
	endpointsCard := cards.NewEndpointsCard(currentLogs, p)
	versionsCard := cards.NewVersionCard(currentLogs, p)
	locationsCard := cards.NewLocationsCard(currentLogs, p, serverURL)
	devicesCard := cards.NewDeviceCard(currentLogs, p)
	activitiesCard := cards.NewActivityCard(currentLogs, p)
	cpusCard := cards.NewCPUCard()
	memorysCard := cards.NewMemoryCard()
	usageTimesCard := cards.NewUsageTimeCard(currentLogs, p)
	referrersCard := cards.NewReferrersCard(currentLogs, p)
	storagesCard := cards.NewStorageCard()
	logSizesCard := cards.NewLogSizeCard(logSizes)

	// Create base cards with renderers
	cardInstances := map[string]*cards.Card{
		"placeholder": cards.NewCard("", cards.NewLogoCard()),
		"success":     cards.NewCard("Success Rate", successRateCard),
		"request":     cards.NewCard("Requests", requestsCard),
		"user":        cards.NewCard("Users", usersCard),
		"activity":    cards.NewCard("Activity", activitiesCard),
		"endpoint":    cards.NewCard("Endpoints", endpointsCard),
		"location":    cards.NewCard("Location", locationsCard),
		"device":      cards.NewCard("Device", devicesCard),
		"cpu":         cards.NewCard("CPU", cpusCard),
		"memory":      cards.NewCard("Memory", memorysCard),
		"storage":     cards.NewCard("Storage", storagesCard),
		"log":         cards.NewCard("Logs", logSizesCard),
		"usageTime":   cards.NewCard("Usage Time", usageTimesCard),
		"referrer":    cards.NewCard("Referrers", referrersCard),
		"version":     cards.NewCard("Version", versionsCard),
	}

	// Set card sizes
	cf.setCardSizes(cardInstances)

	return cardInstances
}

func (cf *CardFactory) setCardSizes(cardInstances map[string]*cards.Card) {
	cardWidth, cardHeight := 18, 4

	sizesToSet := []string{
		"placeholder", "success", "request", "user", "activity",
		"endpoint", "location", "device",
	}

	for _, cardName := range sizesToSet {
		if card, exists := cardInstances[cardName]; exists {
			card.SetSize(cardWidth, cardHeight)
		}
	}

	// Special size for referrer card
	if referrerCard, exists := cardInstances["referrer"]; exists {
		referrerCard.SetSize(cardWidth, 35)
	}
}

// GridFactory handles the creation and setup of the dashboard grid
type GridFactory struct{}

// NewGridFactory creates a new GridFactory instance
func NewGridFactory() *GridFactory {
	return &GridFactory{}
}

func (gf *GridFactory) SetupGrid(cardInstances map[string]*cards.Card) *dashboard.DashboardGrid {
	termWidth, _, _ := term.GetSize(os.Stdout.Fd())
	grid := dashboard.NewDashboardGrid(2, 2, termWidth)

	// Define card order explicitly using a slice
	cardOrder := []struct {
		name     string
		position dashboard.CardPosition
	}{
		{"placeholder", dashboard.PositionMainGrid},
		{"success", dashboard.PositionMainGrid},
		{"request", dashboard.PositionMainGrid},
		{"user", dashboard.PositionMainGrid},
		{"activity", dashboard.PositionSidebar},
		{"endpoint", dashboard.PositionEndpoints},
		{"location", dashboard.PositionCenterPair},
		{"device", dashboard.PositionCenterPair},
		{"cpu", dashboard.PositionSystem},
		{"memory", dashboard.PositionSystem},
		{"log", dashboard.PositionSystem},
		{"storage", dashboard.PositionSystem},
		{"usageTime", dashboard.PositionFooter},
		{"referrer", dashboard.PositionFooter},
		{"version", dashboard.PositionVersion},
	}

	// Iterate in the defined order
	for _, cardConfig := range cardOrder {
		if card, exists := cardInstances[cardConfig.name]; exists {
			grid.AddCard(card, cardConfig.position)
		}
	}

	grid.SetActiveCard(0)
	return grid
}

// ConfigValidator validates configuration settings
type ConfigValidator struct{}

// NewConfigValidator creates a new ConfigValidator instance
func NewConfigValidator() *ConfigValidator {
	return &ConfigValidator{}
}

// ValidateServerURL validates the server URL format
func (cv *ConfigValidator) ValidateServerURL(serverURL string) error {
	if serverURL == "" {
		return nil // Empty is valid for local mode
	}

	_, err := url.Parse(serverURL)
	if err != nil {
		return fmt.Errorf("invalid server URL: %w", err)
	}

	return nil
}

// ValidateAccessPath validates the access path exists and is readable
func (cv *ConfigValidator) ValidateAccessPath(accessPath string) error {
	if accessPath == "" {
		return nil // Empty is valid when using server URL
	}

	_, err := os.Stat(accessPath)
	if err != nil {
		return fmt.Errorf("access path error: %w", err)
	}

	return nil
}

// ErrorHandler provides centralized error handling
type ErrorHandler struct{}

// NewErrorHandler creates a new ErrorHandler instance
func NewErrorHandler() *ErrorHandler {
	return &ErrorHandler{}
}

// HandleLogError handles log-related errors
func (eh *ErrorHandler) HandleLogError(err error, context string) {
	if err != nil {
		logger.Log.Printf("Log error in %s: %v", context, err)
	}
}

// HandleSystemError handles system-related errors
func (eh *ErrorHandler) HandleSystemError(err error, context string) {
	if err != nil {
		logger.Log.Printf("System error in %s: %v", context, err)
	}
}

// HandleNetworkError handles network-related errors
func (eh *ErrorHandler) HandleNetworkError(err error, context string) {
	if err != nil {
		logger.Log.Printf("Network error in %s: %v", context, err)
	}
}

// DataCache provides caching functionality for expensive operations
type DataCache struct {
	logCache    map[string][]nginx.NGINXLog
	systemCache map[string]system.SystemInfo
}

// NewDataCache creates a new DataCache instance
func NewDataCache() *DataCache {
	return &DataCache{
		logCache:    make(map[string][]nginx.NGINXLog),
		systemCache: make(map[string]system.SystemInfo),
	}
}

// GetLogs retrieves logs from cache or loads them if not cached
func (dc *DataCache) GetLogs(key string, loader func() []nginx.NGINXLog) []nginx.NGINXLog {
	if logs, exists := dc.logCache[key]; exists {
		return logs
	}

	logs := loader()
	dc.logCache[key] = logs
	return logs
}

// GetSystemInfo retrieves system info from cache or loads it if not cached
func (dc *DataCache) GetSystemInfo(key string, loader func() system.SystemInfo) system.SystemInfo {
	if info, exists := dc.systemCache[key]; exists {
		return info
	}

	info := loader()
	dc.systemCache[key] = info
	return info
}

// ClearCache clears all cached data
func (dc *DataCache) ClearCache() {
	dc.logCache = make(map[string][]nginx.NGINXLog)
	dc.systemCache = make(map[string]system.SystemInfo)
}

// ModelBuilder provides a fluent interface for building models
type ModelBuilder struct {
	config       *config.Config
	serverURL    string
	cache        *DataCache
	validator    *ConfigValidator
	errorHandler *ErrorHandler
}

// NewModelBuilder creates a new ModelBuilder instance
func NewModelBuilder() *ModelBuilder {
	return &ModelBuilder{
		cache:        NewDataCache(),
		validator:    NewConfigValidator(),
		errorHandler: NewErrorHandler(),
	}
}

// WithConfig sets the configuration
func (mb *ModelBuilder) WithConfig(cfg config.Config) *ModelBuilder {
	mb.config = &cfg
	return mb
}

// WithServerURL sets the server URL
func (mb *ModelBuilder) WithServerURL(serverURL string) *ModelBuilder {
	mb.serverURL = serverURL
	return mb
}

// Build creates and returns a new Model instance
func (mb *ModelBuilder) Build() (*Model, error) {
	if mb.config == nil {
		return nil, fmt.Errorf("configuration is required")
	}

	// Validate configuration
	if err := mb.validator.ValidateServerURL(mb.serverURL); err != nil {
		return nil, fmt.Errorf("invalid server URL: %w", err)
	}

	if err := mb.validator.ValidateAccessPath(mb.config.AccessPath); err != nil {
		return nil, fmt.Errorf("invalid access path: %w", err)
	}

	// Create the model
	model := NewModel(*mb.config, mb.serverURL)

	return &model, nil
}

// StateManager manages application state persistence
type StateManager struct {
	currentState map[string]interface{}
}

// NewStateManager creates a new StateManager instance
func NewStateManager() *StateManager {
	return &StateManager{
		currentState: make(map[string]interface{}),
	}
}

// SaveState saves the current application state
func (sm *StateManager) SaveState(key string, value interface{}) {
	sm.currentState[key] = value
}

// LoadState loads application state by key
func (sm *StateManager) LoadState(key string) (interface{}, bool) {
	value, exists := sm.currentState[key]
	return value, exists
}

// GetCurrentPeriod returns the currently selected period from state
func (sm *StateManager) GetCurrentPeriod() (period.Period, bool) {
	if value, exists := sm.currentState["selectedPeriod"]; exists {
		if period, ok := value.(period.Period); ok {
			return period, true
		}
	}
	return period.Period30Days, false // Default fallback
}

// SetCurrentPeriod saves the currently selected period to state
func (sm *StateManager) SetCurrentPeriod(p period.Period) {
	sm.currentState["selectedPeriod"] = p
}

// MetricsCollector collects and aggregates metrics from logs
type MetricsCollector struct {
	cache *DataCache
}

// NewMetricsCollector creates a new MetricsCollector instance
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		cache: NewDataCache(),
	}
}

// CollectRequestMetrics collects request-related metrics
func (mc *MetricsCollector) CollectRequestMetrics(logs []nginx.NGINXLog) map[string]interface{} {
	metrics := make(map[string]interface{})

	totalRequests := len(logs)
	successfulRequests := 0

	for _, log := range logs {
		if *log.Status >= 200 && *log.Status < 400 {
			successfulRequests++
		}
	}

	metrics["total_requests"] = totalRequests
	metrics["successful_requests"] = successfulRequests

	if totalRequests > 0 {
		metrics["success_rate"] = float64(successfulRequests) / float64(totalRequests) * 100
	} else {
		metrics["success_rate"] = 0.0
	}

	return metrics
}

// CollectUserMetrics collects user-related metrics
func (mc *MetricsCollector) CollectUserMetrics(logs []nginx.NGINXLog) map[string]interface{} {
	metrics := make(map[string]interface{})
	uniqueIPs := make(map[string]bool)

	for _, log := range logs {
		if log.IPAddress != "" {
			uniqueIPs[log.IPAddress] = true
		}
	}

	metrics["unique_users"] = len(uniqueIPs)
	metrics["total_requests"] = len(logs)

	return metrics
}

// PerformanceMonitor monitors application performance
type PerformanceMonitor struct {
	startTime time.Time
	metrics   map[string]time.Duration
}

// NewPerformanceMonitor creates a new PerformanceMonitor instance
func NewPerformanceMonitor() *PerformanceMonitor {
	return &PerformanceMonitor{
		startTime: time.Now(),
		metrics:   make(map[string]time.Duration),
	}
}

// StartTimer starts timing an operation
func (pm *PerformanceMonitor) StartTimer(operation string) func() {
	start := time.Now()
	return func() {
		pm.metrics[operation] = time.Since(start)
	}
}

// GetMetrics returns all collected performance metrics
func (pm *PerformanceMonitor) GetMetrics() map[string]time.Duration {
	return pm.metrics
}

// GetUptime returns the application uptime
func (pm *PerformanceMonitor) GetUptime() time.Duration {
	return time.Since(pm.startTime)
}
