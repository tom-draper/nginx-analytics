package model

import (
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/tom-draper/nginx-analytics/agent/pkg/config"
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
	serverURL    string
	logs         []nginx.NGINXLog
	logSizes     parse.LogSizes
	currentLogs  []nginx.NGINXLog
	calculatable []c.CalculatedCard
	systemCards  []c.CalculatedSystemCard
	positions    []parse.Position // Track the last log position for incremental loading
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
func New(cfg config.Config, serverURL string) Model {
	return NewModel(cfg, serverURL)
}

func NewModel(cfg config.Config, serverURL string) Model {
	// Initialize data manager
	dataManager := newDataManager(cfg, serverURL)

	// Initialize navigation manager
	navManager := newNavigationManager(dataManager.logs)

	// Get current logs for selected period
	currentLogs := dataManager.getCurrentLogs(navManager.getCurrentPeriod())

	// Initialize UI manager
	uiManager := newUIManager(currentLogs, navManager.getCurrentPeriod(), dataManager.getLogSizes(), serverURL)

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

func newDataManager(cfg config.Config, serverURL string) *DataManager {
	logService := NewLogService(serverURL)

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
	logSizes parse.LogSizes, serverURL string) *UIManager {

	cardFactory := NewCardFactory()
	cardInstances := cardFactory.CreateCards(currentLogs, period, logSizes, serverURL)

	gridFactory := NewGridFactory()
	grid := gridFactory.SetupGrid(cardInstances)

	return &UIManager{
		grid: grid,
		help: help.New(),
		keys: ui.NewKeyMap(),
	}
}

func (dm *DataManager) getCurrentLogs(period period.Period) []nginx.NGINXLog {
	return l.FilterLogs(dm.logs, period)
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
	if len(newLogs) > 0 {
		dm.logs = append(dm.logs, newLogs...)
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
	totalCards := um.grid.GetTotalCardCount()
	newIndex := (um.grid.ActiveCard - 1 + totalCards) % totalCards
	um.grid.SetActiveCard(newIndex)
}

func (um *UIManager) navigateRight() {
	totalCards := um.grid.GetTotalCardCount()
	newIndex := (um.grid.ActiveCard + 1) % totalCards
	um.grid.SetActiveCard(newIndex)
}

func (um *UIManager) navigateUp() {
	position := um.grid.GetActiveCardPosition()

	switch position {
	case "main":
		row, col := um.grid.GetMainGridPosition(um.grid.ActiveCard)
		if row > 0 {
			newIndex := um.grid.GetMainGridCardIndex(row-1, col)
			if newIndex >= 0 {
				um.grid.SetActiveCard(newIndex)
			}
		}
	case "sidebar":
		newIndex := um.grid.GetMainGridCardIndex(0, 1)
		if newIndex >= 0 {
			um.grid.SetActiveCard(newIndex)
		}
	case "middle":
		newIndex := um.grid.GetMainGridCardIndex(1, 0)
		if newIndex >= 0 {
			um.grid.SetActiveCard(newIndex)
		}
	case "bottom":
		middleIndex := um.grid.GetMiddleCardIndex()
		if middleIndex >= 0 {
			um.grid.SetActiveCard(middleIndex)
		} else {
			sidebarIndex := um.grid.GetSidebarCardIndex()
			if sidebarIndex >= 0 {
				um.grid.SetActiveCard(sidebarIndex)
			}
		}
	}
}

func (um *UIManager) navigateDown() {
	position := um.grid.GetActiveCardPosition()

	switch position {
	case "main":
		row, col := um.grid.GetMainGridPosition(um.grid.ActiveCard)
		if row < um.grid.Rows-1 {
			newIndex := um.grid.GetMainGridCardIndex(row+1, col)
			if newIndex >= 0 {
				um.grid.SetActiveCard(newIndex)
				return
			}
		}
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
		bottomIndex := um.grid.GetSidebarBottomCardIndex(0)
		if bottomIndex >= 0 {
			um.grid.SetActiveCard(bottomIndex)
		}
	case "bottom":
		cardIndex := um.grid.GetActiveCardIndexInArea()
		if cardIndex == 0 {
			secondBottomIndex := um.grid.GetSidebarBottomCardIndex(1)
			if secondBottomIndex >= 0 {
				um.grid.SetActiveCard(secondBottomIndex)
			}
		}
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		periodicSystemInfoCmd(0, m.dataManager.serverURL),
		periodicLogRefreshCmd(30*time.Second, m.config.AccessPath, m.dataManager.serverURL, m.dataManager.getPositions()),
	)
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case UpdateSystemDataMsg:
		m.dataManager.updateSystemCardData(msg.SysInfo)
		return m, periodicSystemInfoCmd(time.Second*2, m.dataManager.serverURL)

	case UpdateLogsMsg:
		// Append new logs to existing logs
		m.dataManager.appendNewLogs(msg.NewLogs)
		m.dataManager.positions = msg.NewPositions
		// Update current data to reflect new logs
		m.updateCurrentData()
		// Schedule next log refresh
		return m, periodicLogRefreshCmd(30*time.Second, m.config.AccessPath, m.dataManager.serverURL, m.dataManager.getPositions())

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
	switch {
	case key.Matches(msg, m.uiManager.keys.Quit):
		return m, tea.Quit

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
		} else {
			m.uiManager.navigateLeft()
		}

	case key.Matches(msg, m.uiManager.keys.Right):
		if m.navManager.isTabNavigationMode() {
			m.navManager.navigatePeriodsRight()
			m.updateCurrentData()
		} else {
			m.uiManager.navigateRight()
		}

	case key.Matches(msg, m.uiManager.keys.Up):
		if !m.navManager.isTabNavigationMode() {
			m.uiManager.navigateUp()
		}

	case key.Matches(msg, m.uiManager.keys.Down):
		if !m.navManager.isTabNavigationMode() {
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

func periodicSystemInfoCmd(d time.Duration, serverURL string) tea.Cmd {
	return tea.Tick(d, func(t time.Time) tea.Msg {
		systemService := NewSystemService(serverURL)
		sysInfo, err := systemService.GetSystemInfo()
		if err != nil {
			return nil
		}
		return UpdateSystemDataMsg{SysInfo: sysInfo}
	})
}

// periodicLogRefreshCmd creates a command that periodically fetches new logs
func periodicLogRefreshCmd(d time.Duration, accessPath, serverURL string, positions []parse.Position) tea.Cmd {
	return tea.Tick(d, func(t time.Time) tea.Msg {
		logService := NewLogService(serverURL)

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
