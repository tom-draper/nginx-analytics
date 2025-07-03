package model

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/term"

	"github.com/tom-draper/nginx-analytics/agent/pkg/config"
	parse "github.com/tom-draper/nginx-analytics/agent/pkg/logs"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
	l "github.com/tom-draper/nginx-analytics/cli/internal/logs"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	period "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// Model represents the application state
type Model struct {
	Config      config.Config
	ServerURL   string
	Grid        *dashboard.DashboardGrid
	Help        help.Model
	Keys        ui.KeyMap
	Width       int
	Height      int
	Initialized bool

	// Period tabs
	Periods           []period.Period
	SelectedPeriod    int
	TabNavigationMode bool // true when navigating tabs, false when navigating cards

	calculatable       []cards.CalculatedCard
	systemCalculatable []cards.CalclatedSystemCard

	logs       []string
	parsedLogs []nginx.NGINXLog // Parsed logs for card updates

	currentLogs []nginx.NGINXLog
}

func New(cfg config.Config, serverURL string) Model {
	return NewModel(cfg, serverURL)
}

func NewModel(cfg config.Config, serverURL string) Model {
	logs, parsedLogs := getLogs(cfg.AccessPath, serverURL)
	logSizes := getLogsSizes(cfg.AccessPath, serverURL)

	periods := []period.Period{
		period.Period24Hours,
		period.Period1Week,
		period.Period30Days,
		period.Period6Months,
		period.PeriodAllTime,
	}
	selectedPeriod := initialSelectedPeriodIndex(periods, parsedLogs)
	p := periods[selectedPeriod]

	currentLogs := l.FilterLogs(parsedLogs, p)

	cardInstances := createCards(currentLogs, p, logSizes)
	grid := setupGrid(cardInstances)

	calculatable, systemCalculatable := collectCalculatableCards(cardInstances)

	return Model{
		Config:             cfg,
		ServerURL:          serverURL,
		Grid:               grid,
		Help:               help.New(),
		Keys:               ui.NewKeyMap(),
		Initialized:        false,
		Periods:            periods,
		SelectedPeriod:     selectedPeriod,
		TabNavigationMode:  false,
		calculatable:       calculatable,
		systemCalculatable: systemCalculatable,
		logs:               logs,
		parsedLogs:         parsedLogs,
		currentLogs:        currentLogs,
	}
}

func getLogs(accessPath, serverURL string) ([]string, []nginx.NGINXLog) {
	var logs []string
	var err error

	if serverURL != "" {
		logs, err = fetchLogs(serverURL)
	} else {
		logs, err = readLogs(accessPath)
	}

	if err != nil {
		logger.Log.Printf("Error getting logs: %v", err)
	}

	return logs, l.ParseNginxLogs(logs)
}

func readLogs(path string) ([]string, error) {
	if path == "" {
		return nil, nil
	}
	logResult, err := parse.GetLogs(path, []parse.Position{}, false, true)
	if err != nil {
		return nil, err
	}
	return logResult.Logs, nil
}

func fetchLogs(baseURL string) ([]string, error) {
	url := baseURL + "/api/logs/access"
	body, err := httpGetAndReadBody(url)
	if err != nil {
		return nil, err
	}

	var result parse.LogResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return result.Logs, nil
}

func getLogsSizes(accessPath, serverURL string) parse.LogSizes {
	var logSizes parse.LogSizes
	var err error

	if serverURL != "" {
		logSizes, err = fetchLogsSizes(serverURL)
	} else {
		logSizes, err = readLogsSizes(accessPath)
	}

	if err != nil {
		logger.Log.Printf("Error getting log sizes: %v", err)
	}

	return logSizes
}

func readLogsSizes(path string) (parse.LogSizes, error) {
	logSizes, err := parse.GetLogSizes(path)
	if err != nil {
		return parse.LogSizes{}, err
	}
	return logSizes, nil
}

func fetchLogsSizes(baseURL string) (parse.LogSizes, error) {
	url := baseURL + "/api/system/logs"
	body, err := httpGetAndReadBody(url)
	if err != nil {
		return parse.LogSizes{}, err
	}

	var result parse.LogSizes
	if err := json.Unmarshal(body, &result); err != nil {
		return parse.LogSizes{}, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return result, nil
}

// Helper to do HTTP GET and read body with error handling
func httpGetAndReadBody(url string) ([]byte, error) {
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

func createCards(currentLogs []nginx.NGINXLog, p period.Period, logSizes parse.LogSizes) map[string]*cards.Card {
	// Create specific card instances
	successRateCard := cards.NewSuccessRateCard(currentLogs, p)
	requestsCard := cards.NewRequestsCard(currentLogs, p)
	usersCard := cards.NewUsersCard(currentLogs, p)
	endpointsCard := cards.NewEndpointsCard(currentLogs, p)
	versionsCard := cards.NewVersionCard(currentLogs, p)
	locationsCard := cards.NewLocationsCard(currentLogs, p)
	devicesCard := cards.NewDeviceCard(currentLogs, p)
	activitiesCard := cards.NewActivityCard(currentLogs, p)
	cpusCard := cards.NewCPUCard()
	memorysCard := cards.NewMemoryCard()
	usageTimesCard := cards.NewUsageTimeCard(currentLogs, p)
	referrersCard := cards.NewReferrersCard(currentLogs, p)
	storagesCard := cards.NewStorageCard()

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
		"log":         cards.NewCard("Logs", cards.NewLogSizeCard(logSizes)),
		"usageTime":   cards.NewCard("Usage Time", usageTimesCard),
		"referrer":    cards.NewCard("Referrers", referrersCard),
		"version":     cards.NewCard("Version", versionsCard),
	}

	// Set small sizes for compact display
	cardWidth, cardHeight := 18, 4
	cardInstances["placeholder"].SetSize(cardWidth, cardHeight)
	cardInstances["success"].SetSize(cardWidth, cardHeight)
	cardInstances["request"].SetSize(cardWidth, cardHeight)
	cardInstances["user"].SetSize(cardWidth, cardHeight)
	cardInstances["activity"].SetSize(cardWidth, cardHeight)
	cardInstances["endpoint"].SetSize(cardWidth, cardHeight)
	cardInstances["location"].SetSize(cardWidth, cardHeight)
	cardInstances["device"].SetSize(cardWidth, cardHeight)
	cardInstances["referrer"].SetSize(cardWidth, 35)

	return cardInstances
}

func setupGrid(cardInstances map[string]*cards.Card) *dashboard.DashboardGrid {
	termWidth, _, _ := term.GetSize(os.Stdout.Fd())
	grid := dashboard.NewDashboardGrid(2, 2, termWidth)

	// Add cards to grid with their layout positions
	grid.AddCard(cardInstances["placeholder"], dashboard.PositionMainGrid)
	grid.AddCard(cardInstances["success"], dashboard.PositionMainGrid)
	grid.AddCard(cardInstances["request"], dashboard.PositionMainGrid)
	grid.AddCard(cardInstances["user"], dashboard.PositionMainGrid)
	grid.AddCard(cardInstances["activity"], dashboard.PositionSidebar)
	grid.AddCard(cardInstances["endpoint"], dashboard.PositionEndpoints)
	grid.AddCard(cardInstances["location"], dashboard.PositionCenterPair)
	grid.AddCard(cardInstances["device"], dashboard.PositionCenterPair)
	grid.AddCard(cardInstances["cpu"], dashboard.PositionSystem)
	grid.AddCard(cardInstances["memory"], dashboard.PositionSystem)
	grid.AddCard(cardInstances["storage"], dashboard.PositionSystem)
	grid.AddCard(cardInstances["log"], dashboard.PositionSystem)
	grid.AddCard(cardInstances["usageTime"], dashboard.PositionFooter)
	grid.AddCard(cardInstances["referrer"], dashboard.PositionFooter)
	grid.AddCard(cardInstances["version"], dashboard.PositionVersion)

	grid.SetActiveCard(0)

	return grid
}

func collectCalculatableCards(cardInstances map[string]*cards.Card) ([]cards.CalculatedCard, []cards.CalclatedSystemCard) {
	var calculatable []cards.CalculatedCard
	var systemCalculatable []cards.CalclatedSystemCard

	for _, card := range cardInstances {
		if c, ok := card.Renderer.(cards.CalculatedCard); ok {
			calculatable = append(calculatable, c)
		}
		if sc, ok := card.Renderer.(cards.CalclatedSystemCard); ok {
			systemCalculatable = append(systemCalculatable, sc)
		}
	}

	return calculatable, systemCalculatable
}

func initialSelectedPeriodIndex(periods []period.Period, logs []nginx.NGINXLog) int {
	logStart, _ := period.LogRange(logs)

	selectedPeriod := 2 // 1 month

	for i, p := range periods {
		if p == period.PeriodAllTime || logStart.After(p.Start()) {
			selectedPeriod = i
			break
		}

	}

	return selectedPeriod
}

type UpdateDataMsg struct{}

type UpdateSystemDataMsg struct {
	SysInfo system.SystemInfo
}

func (m Model) Init() tea.Cmd {
	return periodicSystemInfoCmd(0, m.ServerURL)
}

func periodicSystemInfoCmd(d time.Duration, serverURL string) tea.Cmd {
	return tea.Tick(d, func(t time.Time) tea.Msg {
		logger.Log.Println("Checking system resources...")

		var sysInfo system.SystemInfo
		var err error

		if serverURL != "" {
			sysInfo, err = fetchSystemInfo(serverURL)
		} else {
			sysInfo, err = system.MeasureSystem()
		}

		if err != nil {
			logger.Log.Printf("Error measuring system: %v", err)
			return nil
		}

		return UpdateSystemDataMsg{SysInfo: sysInfo}
	})
}

// fetchSystemInfo fetches system info JSON from the remote server
func fetchSystemInfo(baseURL string) (system.SystemInfo, error) {
	url := baseURL + "/api/system"
	body, err := httpGetAndReadBody(url)
	if err != nil {
		return system.SystemInfo{}, err
	}

	var sysInfo system.SystemInfo
	if err := json.Unmarshal(body, &sysInfo); err != nil {
		return system.SystemInfo{}, fmt.Errorf("failed to parse system info JSON: %w", err)
	}

	return sysInfo, nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case UpdateSystemDataMsg:
		m.updateSystemCardData(msg.SysInfo)
		return m, periodicSystemInfoCmd(time.Second * 2, m.ServerURL)

	case tea.KeyMsg:
		switch {
		case key.Matches(msg, m.Keys.Quit):
			return m, tea.Quit
		case msg.String() == "tab":
			// Toggle between tab navigation and card navigation
			m.TabNavigationMode = !m.TabNavigationMode
		case msg.String() == "p":
			// Navigate tabs right
			if m.SelectedPeriod < len(m.Periods)-1 {
				m.SelectedPeriod++
			} else {
				m.SelectedPeriod = 0 // Wrap to first tab
			}
			m.updateCardData()
		case msg.String() == "P":
			// Navigate tabs left
			if m.SelectedPeriod > 0 {
				m.SelectedPeriod--
			} else {
				m.SelectedPeriod = len(m.Periods) - 1 // Wrap to last tab
			}
			m.updateCardData()
		case key.Matches(msg, m.Keys.Left):
			if m.TabNavigationMode {
				// Navigate tabs left
				if m.SelectedPeriod > 0 {
					m.SelectedPeriod--
				} else {
					m.SelectedPeriod = len(m.Periods) - 1 // Wrap to last tab
				}
				m.updateCardData()
			} else {
				// Cycle through all cards (backwards)
				totalCards := m.Grid.GetTotalCardCount()
				newIndex := (m.Grid.ActiveCard - 1 + totalCards) % totalCards
				m.Grid.SetActiveCard(newIndex)
			}
		case key.Matches(msg, m.Keys.Right):
			if m.TabNavigationMode {
				// Navigate tabs right
				if m.SelectedPeriod < len(m.Periods)-1 {
					m.SelectedPeriod++
				} else {
					m.SelectedPeriod = 0 // Wrap to first tab
				}
				m.updateCardData()
			} else {
				// Cycle through all cards (forwards)
				totalCards := m.Grid.GetTotalCardCount()
				newIndex := (m.Grid.ActiveCard + 1) % totalCards
				m.Grid.SetActiveCard(newIndex)
			}
		case key.Matches(msg, m.Keys.Up):
			if !m.TabNavigationMode {
				// Smart up navigation based on layout
				m.navigateUp()
			}
		case key.Matches(msg, m.Keys.Down):
			if !m.TabNavigationMode {
				// Smart down navigation based on layout
				m.navigateDown()
			}
		}
	case tea.WindowSizeMsg:
		m.Height = msg.Height
		m.Width = msg.Width
		m.Initialized = true
		m.Grid.SetTerminalWidth(msg.Width)
	}

	return m, nil
}

// navigateUp handles smart up navigation considering the layout
func (m *Model) navigateUp() {
	position := m.Grid.GetActiveCardPosition()

	switch position {
	case "main":
		// Navigate within main grid
		row, col := m.Grid.GetMainGridPosition(m.Grid.ActiveCard)
		if row > 0 {
			newIndex := m.Grid.GetMainGridCardIndex(row-1, col)
			if newIndex >= 0 {
				m.Grid.SetActiveCard(newIndex)
			}
		}
	case "sidebar":
		// Go to top-right of main grid
		newIndex := m.Grid.GetMainGridCardIndex(0, 1)
		if newIndex >= 0 {
			m.Grid.SetActiveCard(newIndex)
		}
	case "middle":
		// Go to bottom-left of main grid
		newIndex := m.Grid.GetMainGridCardIndex(1, 0)
		if newIndex >= 0 {
			m.Grid.SetActiveCard(newIndex)
		}
	case "bottom":
		// Go to middle card if it exists, otherwise sidebar
		middleIndex := m.Grid.GetMiddleCardIndex()
		if middleIndex >= 0 {
			m.Grid.SetActiveCard(middleIndex)
		} else {
			sidebarIndex := m.Grid.GetSidebarCardIndex()
			if sidebarIndex >= 0 {
				m.Grid.SetActiveCard(sidebarIndex)
			}
		}
	}
}

// navigateDown handles smart down navigation considering the layout
func (m *Model) navigateDown() {
	position := m.Grid.GetActiveCardPosition()

	switch position {
	case "main":
		row, col := m.Grid.GetMainGridPosition(m.Grid.ActiveCard)

		// Try to move down within main grid first
		if row < m.Grid.Rows-1 {
			newIndex := m.Grid.GetMainGridCardIndex(row+1, col)
			if newIndex >= 0 {
				m.Grid.SetActiveCard(newIndex)
				return
			}
		}

		// If we're in bottom row, go to middle card
		middleIndex := m.Grid.GetMiddleCardIndex()
		if middleIndex >= 0 {
			m.Grid.SetActiveCard(middleIndex)
		}
	case "sidebar":
		// Go to first bottom card
		bottomIndex := m.Grid.GetSidebarBottomCardIndex(0)
		if bottomIndex >= 0 {
			m.Grid.SetActiveCard(bottomIndex)
		}
	case "middle":
		// Go to first bottom card
		bottomIndex := m.Grid.GetSidebarBottomCardIndex(0)
		if bottomIndex >= 0 {
			m.Grid.SetActiveCard(bottomIndex)
		}
	case "bottom":
		// Move between bottom cards
		cardIndex := m.Grid.GetActiveCardIndexInArea()
		if cardIndex == 0 {
			// From first bottom card to second
			secondBottomIndex := m.Grid.GetSidebarBottomCardIndex(1)
			if secondBottomIndex >= 0 {
				m.Grid.SetActiveCard(secondBottomIndex)
			}
		}
		// If already on second bottom card, can't go down further
	}
}

func (m *Model) updateCardData() {
	period := m.GetSelectedPeriod()
	m.currentLogs = l.FilterLogs(m.parsedLogs, period)

	for _, card := range m.calculatable {
		card.UpdateCalculated(m.currentLogs, period)
	}
}

func (m *Model) updateSystemCardData(sysInfo system.SystemInfo) {
	for _, card := range m.systemCalculatable {
		card.UpdateCalculated(sysInfo)
	}
}

// renderTabs renders the period tabs in the top-right area
func (m Model) renderTabs() string {
	if m.Width < 40 { // Don't show tabs if terminal is too narrow
		return ""
	}

	var tabs []string

	// Define tab styles
	activeTabStyle := lipgloss.NewStyle().
		Background(styles.Green). // Green background
		Foreground(styles.Black). // Black text
		Padding(0, 1).
		MarginRight(1)

	inactiveTabStyle := lipgloss.NewStyle().
		Foreground(styles.BorderColor).
		Padding(0, 1).
		MarginRight(1)

	// Build tab strings
	for i, period := range m.Periods {
		if i == m.SelectedPeriod {
			tabs = append(tabs, activeTabStyle.Render(string(period)))
		} else {
			tabs = append(tabs, inactiveTabStyle.Render(string(period)))
		}
	}

	// Join tabs and right-align them
	tabsStr := strings.Join(tabs, "")

	// Calculate total tab width
	totalTabWidth := 0
	for _, period := range m.Periods {
		totalTabWidth += len(string(period)) + 3 // +3 for padding and margin
	}

	// Right-align the tabs
	tabLine := lipgloss.NewStyle().
		Width(m.Width).
		Align(lipgloss.Right).
		Render(tabsStr)

	return tabLine
}

func (m Model) View() string {
	if !m.Initialized {
		return "Initializing dashboard..."
	}

	var view strings.Builder

	// Add tabs at the top
	tabsView := m.renderTabs()
	if tabsView != "" {
		view.WriteString(tabsView)
		view.WriteString("\n")
	}

	// Render the grid (now positioned below tabs)
	gridView := m.Grid.RenderGrid()
	view.WriteString(gridView)

	// Add navigation help at the bottom
	helpText := "← → ↑ ↓    [tab] switch mode    [q] quit  "
	if m.TabNavigationMode {
		helpText = "← → navigate tabs    [tab] switch to cards    [q] quit  "
	}

	// Render the help text right-aligned at the bottom
	helpLine := lipgloss.NewStyle().
		Width(m.Width).
		Align(lipgloss.Right).
		Foreground(styles.BorderColor).
		Render(helpText)

	view.WriteString("\n\n")
	view.WriteString(helpLine)

	return view.String()
}

// Alternative view for just the top-left placement
func (m Model) ViewCompact() string {
	if !m.Initialized {
		return "Initializing..."
	}

	var view strings.Builder

	// Add tabs at the top
	tabsView := m.renderTabs()
	if tabsView != "" {
		view.WriteString(tabsView)
		view.WriteString("\n")
	}

	// Just render the cards in a simple top-left layout
	gridView := m.Grid.RenderGrid()
	view.WriteString(gridView)

	return view.String()
}

// GetSelectedPeriod returns the currently selected period
func (m Model) GetSelectedPeriod() period.Period {
	return m.Periods[m.SelectedPeriod]
}
