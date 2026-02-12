package model

import (
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/tom-draper/nginx-analytics/cli/internal/config"
	parse "github.com/tom-draper/nginx-analytics/agent/pkg/logs"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	l "github.com/tom-draper/nginx-analytics/cli/internal/logs"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard"
	c "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

const (
	// maxStoredLogs limits memory usage by rotating old logs
	// At ~500 bytes per log, 100k logs = ~50MB
	maxStoredLogs = 100000
)

// Model represents the main application state
type Model struct {
	config      config.Config
	dataManager *DataManager
	uiManager   *UIManager
	navManager  *NavigationManager

	width       int
	height      int
	initialized bool
}

// DataManager handles all data operations
type DataManager struct {
	serverURL      string
	authToken      string
	logs           []nginx.NGINXLog
	logSizes       parse.LogSizes
	currentLogs    []nginx.NGINXLog
	calculatable   []c.CalculatedCard
	systemCards    []c.CalculatedSystemCard
	positions      []parse.Position // Track the last log position for incremental loading
	endpointFilter *l.EndpointFilter
	referrerFilter *l.ReferrerFilter
	locationFilter *l.LocationFilter
	locationLookup func(string) string
	deviceFilter   *l.DeviceFilter
	deviceLookup   func(string) string
	versionFilter  *l.VersionFilter
	versionLookup  func(string) string
}

// UIManager handles UI rendering and layout
type UIManager struct {
	grid  *dashboard.DashboardGrid
	help  help.Model
	keys  ui.KeyMap
	width int
}

// NavigationManager handles navigation state and logic
type NavigationManager struct {
	periods           []period.Period
	selectedPeriod    int
	tabNavigationMode bool
}

// Messages
type UpdateDataMsg struct{}
type UpdateSystemDataMsg struct {
	SysInfo system.SystemInfo
}
type UpdateLogsMsg struct {
	NewLogs      []nginx.NGINXLog
	NewPositions []parse.Position
}

// New creates a new Model instance
func New(cfg config.Config, serverURL string, authToken string) Model {
	return NewModel(cfg, serverURL, authToken)
}

func NewModel(cfg config.Config, serverURL string, authToken string) Model {
	// Initialize data manager
	dataManager := newDataManager(cfg, serverURL, authToken)

	// Initialize navigation manager
	navManager := newNavigationManager(dataManager.logs)

	// Get current logs for selected period
	currentLogs := dataManager.getCurrentLogs(navManager.getCurrentPeriod())

	// Initialize UI manager
	uiManager := newUIManager(currentLogs, navManager.getCurrentPeriod(), dataManager.getLogSizes(), serverURL, authToken)

	// Collect calculatable cards
	dataManager.collectCalculatableCards(uiManager.getCards())

	return Model{
		config:      cfg,
		dataManager: dataManager,
		uiManager:   uiManager,
		navManager:  navManager,
		initialized: false,
	}
}

func newDataManager(cfg config.Config, serverURL string, authToken string) *DataManager {
	logService := NewLogService(serverURL, authToken)

	// Load initial logs
	logs, positions, err := logService.LoadLogs(cfg.AccessPath, []parse.Position{}, false, true)
	if err != nil {
		logs = []nginx.NGINXLog{}
	}

	logSizes, err := logService.LoadLogSizes(cfg.AccessPath)
	if err != nil {
		logSizes = parse.LogSizes{}
	}

	return &DataManager{
		serverURL: serverURL,
		authToken: authToken,
		logs:      logs,
		logSizes:  logSizes,
		positions: positions,
	}
}

// newNavigationManager creates a new NavigationManager
func newNavigationManager(logs []nginx.NGINXLog) *NavigationManager {
	periods := []period.Period{
		period.Period24Hours,
		period.Period1Week,
		period.Period30Days,
		period.Period6Months,
		period.PeriodAllTime,
	}

	selectedPeriod := calculateInitialPeriod(periods, logs)

	return &NavigationManager{
		periods:           periods,
		selectedPeriod:    selectedPeriod,
		tabNavigationMode: false,
	}
}

// newUIManager creates a new UIManager
func newUIManager(currentLogs []nginx.NGINXLog, period period.Period,
	logSizes parse.LogSizes, serverURL string, authToken string) *UIManager {

	cardFactory := NewCardFactory()
	cardInstances := cardFactory.CreateCards(currentLogs, period, logSizes, serverURL, authToken)

	gridFactory := NewGridFactory()
	grid := gridFactory.SetupGrid(cardInstances)

	return &UIManager{
		grid: grid,
		help: help.New(),
		keys: ui.NewKeyMap(),
	}
}

func (dm *DataManager) getCurrentLogs(period period.Period) []nginx.NGINXLog {
	logs := l.FilterLogs(dm.logs, period)
	if dm.endpointFilter != nil {
		logs = l.FilterByEndpoint(logs, dm.endpointFilter)
	}
	if dm.referrerFilter != nil {
		logs = l.FilterByReferrer(logs, dm.referrerFilter)
	}
	if dm.locationFilter != nil && dm.locationLookup != nil {
		logs = l.FilterByLocation(logs, dm.locationFilter, dm.locationLookup)
	}
	if dm.deviceFilter != nil && dm.deviceLookup != nil {
		logs = l.FilterByDevice(logs, dm.deviceFilter, dm.deviceLookup)
	}
	if dm.versionFilter != nil && dm.versionLookup != nil {
		logs = l.FilterByVersion(logs, dm.versionFilter, dm.versionLookup)
	}
	return logs
}

func (dm *DataManager) setEndpointFilter(filter *l.EndpointFilter) {
	dm.endpointFilter = filter
}

func (dm *DataManager) setReferrerFilter(filter *l.ReferrerFilter) {
	dm.referrerFilter = filter
}

func (dm *DataManager) setLocationFilter(filter *l.LocationFilter, lookup func(string) string) {
	dm.locationFilter = filter
	dm.locationLookup = lookup
}

func (dm *DataManager) setDeviceFilter(filter *l.DeviceFilter, lookup func(string) string) {
	dm.deviceFilter = filter
	dm.deviceLookup = lookup
}

func (dm *DataManager) setVersionFilter(filter *l.VersionFilter, lookup func(string) string) {
	dm.versionFilter = filter
	dm.versionLookup = lookup
}

func (dm *DataManager) hasAnyFilter() bool {
	return dm.endpointFilter != nil || dm.referrerFilter != nil ||
		dm.locationFilter != nil || dm.deviceFilter != nil || dm.versionFilter != nil
}

func (dm *DataManager) clearAllFilters() {
	dm.endpointFilter = nil
	dm.referrerFilter = nil
	dm.locationFilter = nil
	dm.deviceFilter = nil
	dm.versionFilter = nil
	dm.locationLookup = nil
	dm.deviceLookup = nil
	dm.versionLookup = nil
}

// clearAllFilteredStates clears the filtered state on all cards
func (um *UIManager) clearAllFilteredStates() {
	for _, card := range um.grid.GetAllCards() {
		card.Card.SetFiltered(false)
	}
}

func (dm *DataManager) getLogSizes() parse.LogSizes {
	return dm.logSizes
}

func (dm *DataManager) collectCalculatableCards(cards []c.Card) {
	for _, card := range cards {
		// Check if the card's Renderer implements CalculatedCard interface
		if c, ok := card.Renderer.(c.CalculatedCard); ok {
			dm.calculatable = append(dm.calculatable, c)
		}
		// Check if the card's Renderer implements CalculatedSystemCard interface
		if sc, ok := card.Renderer.(c.CalculatedSystemCard); ok {
			dm.systemCards = append(dm.systemCards, sc)
		}
	}
}

func (dm *DataManager) updateCardData(currentLogs []nginx.NGINXLog, period period.Period) {
	for _, card := range dm.calculatable {
		card.UpdateCalculated(currentLogs, period)
	}
}

func (dm *DataManager) updateSystemCardData(sysInfo system.SystemInfo) {
	for _, card := range dm.systemCards {
		card.UpdateCalculated(sysInfo)
	}
}

func (dm *DataManager) appendNewLogs(newLogs []nginx.NGINXLog) {
	if len(newLogs) == 0 {
		return
	}

	dm.logs = append(dm.logs, newLogs...)

	// Rotate logs if we exceed the maximum
	if len(dm.logs) > maxStoredLogs {
		// Keep the most recent logs, discard old ones
		excess := len(dm.logs) - maxStoredLogs
		dm.logs = dm.logs[excess:]
	}
}

func (dm *DataManager) getPositions() []parse.Position {
	return dm.positions
}

func (nm *NavigationManager) getCurrentPeriod() period.Period {
	return nm.periods[nm.selectedPeriod]
}

func (nm *NavigationManager) navigatePeriodsLeft() {
	if nm.selectedPeriod > 0 {
		nm.selectedPeriod--
	} else {
		nm.selectedPeriod = len(nm.periods) - 1
	}
}

func (nm *NavigationManager) navigatePeriodsRight() {
	if nm.selectedPeriod < len(nm.periods)-1 {
		nm.selectedPeriod++
	} else {
		nm.selectedPeriod = 0
	}
}

func (nm *NavigationManager) toggleNavigationMode() {
	nm.tabNavigationMode = !nm.tabNavigationMode
}

func (nm *NavigationManager) isTabNavigationMode() bool {
	return nm.tabNavigationMode
}

func (um *UIManager) getCards() []c.Card {
	gridCards := um.grid.GetAllCards()

	cards := make([]c.Card, len(gridCards))

	for i, card := range gridCards {
		cards[i] = *card.Card
	}

	return cards
}

func (um *UIManager) setWidth(width int) {
	um.width = width
	um.grid.SetTerminalWidth(width)
}

func (um *UIManager) navigateLeft() {
	position := um.grid.GetActiveCardPosition()

	switch position {
	case "main":
		localIndex := um.grid.GetActiveCardIndexInArea()
		row, col := um.grid.GetMainGridPosition(localIndex)
		if col > 0 {
			newIndex := um.grid.GetMainGridCardIndex(row, col-1)
			if newIndex >= 0 {
				um.grid.SetActiveCard(newIndex)
			}
		}
	case "sidebar":
		// From sidebar, go to right edge of main grid (top row)
		newIndex := um.grid.GetMainGridCardIndex(0, um.grid.Cols-1)
		if newIndex >= 0 {
			um.grid.SetActiveCard(newIndex)
		}
	case "sidebar-bottom":
		// From sidebar-bottom, go to Version (or Endpoints if no Version)
		currentIndex := um.grid.GetActiveCardIndexInArea()
		if currentIndex > 0 {
			// Move left within sidebar-bottom
			prevIndex := um.grid.GetSidebarBottomCardIndex(currentIndex - 1)
			if prevIndex >= 0 {
				um.grid.SetActiveCard(prevIndex)
			}
		} else {
			// At leftmost sidebar-bottom, go to Version
			versionIndex := um.grid.GetVersionCardIndex()
			if versionIndex >= 0 {
				um.grid.SetActiveCard(versionIndex)
			} else {
				middleIndex := um.grid.GetMiddleCardIndex()
				if middleIndex >= 0 {
					um.grid.SetActiveCard(middleIndex)
				}
			}
		}
	case "sidebar-subgrid":
		um.grid.MoveLeft()
	case "sidebar-footer":
		currentIndex := um.grid.GetActiveCardIndexInArea()
		if currentIndex > 0 {
			prevIndex := um.grid.GetSidebarFooterCardIndex(currentIndex - 1)
			if prevIndex >= 0 {
				um.grid.SetActiveCard(prevIndex)
			}
		} else {
			// At leftmost footer card (usage time), go to version card
			versionIndex := um.grid.GetVersionCardIndex()
			if versionIndex >= 0 {
				um.grid.SetActiveCard(versionIndex)
			}
		}
	}
}

func (um *UIManager) navigateRight() {
	position := um.grid.GetActiveCardPosition()

	switch position {
	case "main":
		localIndex := um.grid.GetActiveCardIndexInArea()
		row, col := um.grid.GetMainGridPosition(localIndex)
		if col < um.grid.Cols-1 {
			newIndex := um.grid.GetMainGridCardIndex(row, col+1)
			if newIndex >= 0 {
				um.grid.SetActiveCard(newIndex)
			}
		} else {
			// At right edge of main grid, go to sidebar
			sidebarIndex := um.grid.GetSidebarCardIndex()
			if sidebarIndex >= 0 {
				um.grid.SetActiveCard(sidebarIndex)
			}
		}
	case "middle", "version":
		// From left column cards (Endpoints, Version), go to sidebar-bottom (Location)
		bottomIndex := um.grid.GetSidebarBottomCardIndex(0)
		if bottomIndex >= 0 {
			um.grid.SetActiveCard(bottomIndex)
		}
	case "sidebar-bottom":
		// Move right within sidebar-bottom
		currentIndex := um.grid.GetActiveCardIndexInArea()
		if currentIndex == 0 {
			nextIndex := um.grid.GetSidebarBottomCardIndex(1)
			if nextIndex >= 0 {
				um.grid.SetActiveCard(nextIndex)
			}
		}
	case "sidebar-subgrid":
		um.grid.MoveRight()
	case "sidebar-footer":
		currentIndex := um.grid.GetActiveCardIndexInArea()
		if currentIndex == 0 {
			nextIndex := um.grid.GetSidebarFooterCardIndex(1)
			if nextIndex >= 0 {
				um.grid.SetActiveCard(nextIndex)
			}
		}
	}
}

func (um *UIManager) navigateUp() {
	position := um.grid.GetActiveCardPosition()

	switch position {
	case "main":
		localIndex := um.grid.GetActiveCardIndexInArea()
		row, col := um.grid.GetMainGridPosition(localIndex)
		if row > 0 {
			newIndex := um.grid.GetMainGridCardIndex(row-1, col)
			if newIndex >= 0 {
				um.grid.SetActiveCard(newIndex)
			}
		} else {
			// At top row of main grid, wrap to footer (referrers area)
			// Go to last footer card (rightmost, which is referrers)
			footerIndex := um.grid.GetSidebarFooterCardIndex(1) // Index 1 is referrers
			if footerIndex >= 0 {
				um.grid.SetActiveCard(footerIndex)
			} else {
				// Fallback to first footer card
				footerIndex = um.grid.GetSidebarFooterCardIndex(0)
				if footerIndex >= 0 {
					um.grid.SetActiveCard(footerIndex)
				}
			}
		}
	case "sidebar":
		newIndex := um.grid.GetMainGridCardIndex(0, 1)
		if newIndex >= 0 {
			um.grid.SetActiveCard(newIndex)
		}
	case "middle":
		// From Endpoints, go up to bottom of main grid (left column)
		newIndex := um.grid.GetMainGridCardIndex(um.grid.Rows-1, 0)
		if newIndex >= 0 {
			um.grid.SetActiveCard(newIndex)
		}
	case "version":
		// From Version, go up to Endpoints (middle)
		middleIndex := um.grid.GetMiddleCardIndex()
		if middleIndex >= 0 {
			um.grid.SetActiveCard(middleIndex)
		}
	case "sidebar-bottom":
		// From Location, go up to Sidebar
		sidebarIndex := um.grid.GetSidebarCardIndex()
		if sidebarIndex >= 0 {
			um.grid.SetActiveCard(sidebarIndex)
		}
	case "sidebar-subgrid":
		// From CPU area, go up to Location (sidebar-bottom)
		um.grid.MoveUp()
	case "sidebar-footer":
		// Go up to system subgrid
		um.grid.MoveUp()
	}
}

func (um *UIManager) navigateDown() {
	position := um.grid.GetActiveCardPosition()

	switch position {
	case "main":
		localIndex := um.grid.GetActiveCardIndexInArea()
		row, col := um.grid.GetMainGridPosition(localIndex)
		if row < um.grid.Rows-1 {
			newIndex := um.grid.GetMainGridCardIndex(row+1, col)
			if newIndex >= 0 {
				um.grid.SetActiveCard(newIndex)
				return
			}
		}
		// At bottom of main grid, go to middle (endpoints)
		middleIndex := um.grid.GetMiddleCardIndex()
		if middleIndex >= 0 {
			um.grid.SetActiveCard(middleIndex)
		}
	case "sidebar":
		bottomIndex := um.grid.GetSidebarBottomCardIndex(0)
		if bottomIndex >= 0 {
			um.grid.SetActiveCard(bottomIndex)
		}
	case "middle":
		// From Endpoints, go down to Version
		versionIndex := um.grid.GetVersionCardIndex()
		if versionIndex >= 0 {
			um.grid.SetActiveCard(versionIndex)
		}
	case "version":
		// From Version, wrap to top of main grid
		newIndex := um.grid.GetMainGridCardIndex(0, 0)
		if newIndex >= 0 {
			um.grid.SetActiveCard(newIndex)
		}
	case "sidebar-bottom":
		// From sidebar-bottom (Location/Device), go down to system subgrid (CPU/Memory)
		// Maintain column alignment
		currentCol := um.grid.GetActiveCardIndexInArea()
		subGridIndex := um.grid.GetSidebarSubGridCardIndex(currentCol)
		if subGridIndex >= 0 {
			um.grid.SetActiveCard(subGridIndex)
		}
	case "sidebar-subgrid":
		// Move down within system subgrid or to footer
		um.grid.MoveDown()
	case "sidebar-footer":
		// Wrap to top
		newIndex := um.grid.GetMainGridCardIndex(0, 0)
		if newIndex >= 0 {
			um.grid.SetActiveCard(newIndex)
		}
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		periodicSystemInfoCmd(0, m.dataManager.serverURL, m.dataManager.authToken),
		periodicLogRefreshCmd(30*time.Second, m.config.AccessPath, m.dataManager.serverURL, m.dataManager.authToken, m.dataManager.getPositions()),
	)
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case UpdateSystemDataMsg:
		m.dataManager.updateSystemCardData(msg.SysInfo)
		return m, periodicSystemInfoCmd(time.Second*2, m.dataManager.serverURL, m.dataManager.authToken)

	case UpdateLogsMsg:
		// Append new logs to existing logs
		m.dataManager.appendNewLogs(msg.NewLogs)
		m.dataManager.positions = msg.NewPositions
		// Update current data to reflect new logs
		m.updateCurrentData()
		// Schedule next log refresh
		return m, periodicLogRefreshCmd(30*time.Second, m.config.AccessPath, m.dataManager.serverURL, m.dataManager.authToken, m.dataManager.getPositions())

	case tea.KeyMsg:
		return m.handleKeyMsg(msg)

	case tea.WindowSizeMsg:
		m.height = msg.Height
		m.width = msg.Width
		m.initialized = true
		m.uiManager.setWidth(msg.Width)
	}

	return m, nil
}

func (m Model) handleKeyMsg(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Check if active card is in select mode
	activeCard := m.uiManager.grid.GetActiveCard()
	var selectable c.SelectableCard
	if activeCard != nil {
		selectable, _ = activeCard.Renderer.(c.SelectableCard)
	}
	inSelectMode := selectable != nil && selectable.IsInSelectMode()

	switch {
	case key.Matches(msg, m.uiManager.keys.Quit):
		// If in select mode, exit select mode instead of quitting
		if inSelectMode {
			selectable.ExitSelectMode()
			return m, nil
		}
		// If the active card has a filter, clear only that filter
		if activeCard != nil && activeCard.IsFiltered {
			switch activeCard.Renderer.(type) {
			case *c.EndpointsCard:
				m.dataManager.endpointFilter = nil
			case *c.ReferrersCard:
				m.dataManager.referrerFilter = nil
			case *c.LocationsCard:
				m.dataManager.locationFilter = nil
				m.dataManager.locationLookup = nil
			case *c.DeviceCard:
				m.dataManager.deviceFilter = nil
				m.dataManager.deviceLookup = nil
			case *c.VersionCard:
				m.dataManager.versionFilter = nil
				m.dataManager.versionLookup = nil
			}
			activeCard.SetFiltered(false)
			m.updateCurrentData()
			return m, nil
		}
		return m, tea.Quit

	case msg.String() == "m":
		// If active card is a DeviceCard, cycle the display mode
		if deviceCard, ok := activeCard.Renderer.(*c.DeviceCard); ok {
			deviceCard.CycleMode()
			return m, nil
		}

	case msg.String() == "enter":
		if selectable != nil {
			if inSelectMode {
				// Select the item and apply filter based on card type
				if endpointsCard, ok := activeCard.Renderer.(*c.EndpointsCard); ok {
					if filter := endpointsCard.GetSelectedEndpoint(); filter != nil {
						m.dataManager.setEndpointFilter(&l.EndpointFilter{
							Path:   filter.Path,
							Method: filter.Method,
							Status: filter.Status,
						})
						activeCard.SetFiltered(true)
						selectable.ExitSelectMode()
						m.updateCurrentData()
					}
				} else if referrersCard, ok := activeCard.Renderer.(*c.ReferrersCard); ok {
					if filter := referrersCard.GetSelectedReferrer(); filter != nil {
						m.dataManager.setReferrerFilter(&l.ReferrerFilter{
							Referrer: filter.Referrer,
						})
						activeCard.SetFiltered(true)
						selectable.ExitSelectMode()
						m.updateCurrentData()
					}
				} else if locationsCard, ok := activeCard.Renderer.(*c.LocationsCard); ok {
					if filter := locationsCard.GetSelectedLocation(); filter != nil {
						m.dataManager.setLocationFilter(&l.LocationFilter{
							Location: filter.Location,
						}, locationsCard.GetLocationLookup())
						activeCard.SetFiltered(true)
						selectable.ExitSelectMode()
						m.updateCurrentData()
					}
				} else if deviceCard, ok := activeCard.Renderer.(*c.DeviceCard); ok {
					if filter := deviceCard.GetSelectedDevice(); filter != nil {
						m.dataManager.setDeviceFilter(&l.DeviceFilter{
							Device: filter.Device,
						}, deviceCard.GetDeviceLookup())
						activeCard.SetFiltered(true)
						selectable.ExitSelectMode()
						m.updateCurrentData()
					}
				} else if versionCard, ok := activeCard.Renderer.(*c.VersionCard); ok {
					if filter := versionCard.GetSelectedVersion(); filter != nil {
						m.dataManager.setVersionFilter(&l.VersionFilter{
							Version: filter.Version,
						}, versionCard.GetVersionLookup())
						activeCard.SetFiltered(true)
						selectable.ExitSelectMode()
						m.updateCurrentData()
					}
				}
			} else {
				// Enter select mode
				selectable.EnterSelectMode()
			}
		}

	case msg.String() == "tab":
		m.navManager.toggleNavigationMode()

	case msg.String() == "p":
		m.navManager.navigatePeriodsRight()
		m.updateCurrentData()

	case msg.String() == "P":
		m.navManager.navigatePeriodsLeft()
		m.updateCurrentData()

	case key.Matches(msg, m.uiManager.keys.Left):
		if m.navManager.isTabNavigationMode() {
			m.navManager.navigatePeriodsLeft()
			m.updateCurrentData()
		} else if inSelectMode {
			// For LocationsCard in select mode, use left/right to select
			if _, ok := activeCard.Renderer.(*c.LocationsCard); ok {
				selectable.SelectLeft()
			}
		} else {
			m.uiManager.navigateLeft()
		}

	case key.Matches(msg, m.uiManager.keys.Right):
		if m.navManager.isTabNavigationMode() {
			m.navManager.navigatePeriodsRight()
			m.updateCurrentData()
		} else if inSelectMode {
			// For LocationsCard in select mode, use left/right to select
			if _, ok := activeCard.Renderer.(*c.LocationsCard); ok {
				selectable.SelectRight()
			}
		} else {
			m.uiManager.navigateRight()
		}

	case key.Matches(msg, m.uiManager.keys.Up):
		if inSelectMode {
			selectable.SelectUp()
		} else if !m.navManager.isTabNavigationMode() {
			m.uiManager.navigateUp()
		}

	case key.Matches(msg, m.uiManager.keys.Down):
		if inSelectMode {
			selectable.SelectDown()
		} else if !m.navManager.isTabNavigationMode() {
			m.uiManager.navigateDown()
		}
	}

	return m, nil
}

func (m *Model) updateCurrentData() {
	period := m.navManager.getCurrentPeriod()
	m.dataManager.currentLogs = m.dataManager.getCurrentLogs(period)
	m.dataManager.updateCardData(m.dataManager.currentLogs, period)
}

func (m Model) View() string {
	if !m.initialized {
		return "Initializing dashboard..."
	}

	var view strings.Builder

	// Render tabs
	tabsView := m.renderTabs()
	if tabsView != "" {
		view.WriteString(tabsView)
		view.WriteString("\n")
	}

	// Render grid
	gridView := m.uiManager.grid.RenderGrid()
	view.WriteString(gridView)

	// Render help
	helpText := m.getHelpText()
	helpLine := lipgloss.NewStyle().
		Width(m.width).
		Align(lipgloss.Right).
		Foreground(styles.BorderColor).
		Render(helpText)

	view.WriteString("\n\n")
	view.WriteString(helpLine)

	return view.String()
}

func (m Model) ViewCompact() string {
	if !m.initialized {
		return "Initializing..."
	}

	var view strings.Builder

	tabsView := m.renderTabs()
	if tabsView != "" {
		view.WriteString(tabsView)
		view.WriteString("\n")
	}

	gridView := m.uiManager.grid.RenderGrid()
	view.WriteString(gridView)

	return view.String()
}

func (m Model) renderTabs() string {
	if m.width < 40 {
		return ""
	}

	var tabs []string

	activeTabStyle := lipgloss.NewStyle().
		Background(styles.Green).
		Foreground(styles.Black).
		Padding(0, 1).
		MarginRight(1)

	inactiveTabStyle := lipgloss.NewStyle().
		Foreground(styles.BorderColor).
		Padding(0, 1).
		MarginRight(1)

	for i, period := range m.navManager.periods {
		if i == m.navManager.selectedPeriod {
			tabs = append(tabs, activeTabStyle.Render(string(period)))
		} else {
			tabs = append(tabs, inactiveTabStyle.Render(string(period)))
		}
	}

	tabsStr := strings.Join(tabs, "")
	tabLine := lipgloss.NewStyle().
		Width(m.width).
		Align(lipgloss.Right).
		Render(tabsStr)

	return tabLine
}

func (m Model) getHelpText() string {
	if m.navManager.isTabNavigationMode() {
		return "← → navigate tabs    [tab] switch to cards    [q] quit  "
	}

	// Check if we're in select mode
	activeCard := m.uiManager.grid.GetActiveCard()
	if activeCard != nil {
		if selectable, ok := activeCard.Renderer.(c.SelectableCard); ok && selectable.IsInSelectMode() {
			// In select mode - show select controls
			if _, isLocation := activeCard.Renderer.(*c.LocationsCard); isLocation {
				return "← → select    [enter] filter    [q] exit select mode  "
			}
			return "↑ ↓ select    [enter] filter    [q] exit select mode  "
		}

		// Not in select mode - check if it's a selectable card and show appropriate help
		if _, ok := activeCard.Renderer.(c.SelectableCard); ok {
			// Check specific card types for custom help text
			if _, ok := activeCard.Renderer.(*c.DeviceCard); ok {
				return "← → ↑ ↓    [enter] select    [m] cycle mode    [p] switch period    [q] quit  "
			}
			if _, ok := activeCard.Renderer.(*c.LocationsCard); ok {
				return "← → ↑ ↓    [enter] select    [p] switch period    [q] quit  "
			}
			// For other selectable cards (endpoint, version, referrers)
			return "← → ↑ ↓    [enter] select    [p] switch period    [q] quit  "
		}
	}

	return "← → ↑ ↓    [p] switch period    [q] quit  "
}

func (m Model) GetSelectedPeriod() period.Period {
	return m.navManager.getCurrentPeriod()
}

func calculateInitialPeriod(periods []period.Period, logs []nginx.NGINXLog) int {
	logStart, _ := period.LogRange(logs)
	selectedPeriod := 2 // Default to 1 month

	for i, p := range periods {
		if p == period.PeriodAllTime || logStart.After(p.Start()) {
			selectedPeriod = i
			break
		}
	}

	return selectedPeriod
}

func periodicSystemInfoCmd(d time.Duration, serverURL string, authToken string) tea.Cmd {
	return tea.Tick(d, func(t time.Time) tea.Msg {
		systemService := NewSystemService(serverURL, authToken)
		sysInfo, err := systemService.GetSystemInfo()
		if err != nil {
			return nil
		}
		return UpdateSystemDataMsg{SysInfo: sysInfo}
	})
}

// periodicLogRefreshCmd creates a command that periodically fetches new logs
func periodicLogRefreshCmd(d time.Duration, accessPath, serverURL string, authToken string, positions []parse.Position) tea.Cmd {
	return tea.Tick(d, func(t time.Time) tea.Msg {
		logService := NewLogService(serverURL, authToken)

		// Load new logs starting from the last position
		// You'll need to modify LoadLogsFromPosition to accept a position parameter
		// and return only logs after that position
		newLogs, newPositions, err := logService.LoadLogs(accessPath, positions, false, false)
		if err != nil {
			return nil
		}

		return UpdateLogsMsg{
			NewLogs:      newLogs,
			NewPositions: newPositions,
		}
	})
}
