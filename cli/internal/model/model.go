package model

import (
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
	l "github.com/tom-draper/nginx-analytics/cli/internal/logs"
	period "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// Model represents the application state
type Model struct {
	Config      config.Config
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

	calculatable []cards.CalculatedCard

	logs       []string
	parsedLogs []nginx.NGINXLog // Parsed logs for card updates

	currentLogs []nginx.NGINXLog
}

// New creates a new model with initial state
func New(cfg config.Config) Model {
	logs, _ := getLogs(cfg.AccessPath)
	parsedLogs := l.ParseNginxLogs(logs)

	sysInfo, _ := system.MeasureSystem()

	logSizes, _ := parse.GetLogSizes(cfg.AccessPath)

	// Initialize periods
	periods := []period.Period{
		period.Period24Hours,
		period.Period1Week,
		period.Period30Days,
		period.Period6Months,
		period.PeriodAllTime,
	}
	selectedPeriod := 2
	period := periods[selectedPeriod]

	currentLogs := l.FilterLogs(parsedLogs, period)

	// Create specific card instances
	successRateCard := cards.NewSuccessRateCard(currentLogs, period)
	requestsCard := cards.NewRequestsCard(currentLogs, period)
	usersCard := cards.NewUsersCard(currentLogs, period)
	endpointsCard := cards.NewEndpointsCard(currentLogs, period)
	locationsCard := cards.NewLocationsCard(currentLogs, period)
	activitiesCard := cards.NewActivityCard(currentLogs, period)

	// Create base cards with renderers - these will all be treated uniformly
	placeholderCard := cards.NewCard("", cards.NewLogoCard())
	successCard := cards.NewCard("Success Rate", successRateCard)
	requestCard := cards.NewCard("Requests", requestsCard)
	userCard := cards.NewCard("Users", usersCard)
	activityCard := cards.NewCard("Activity", activitiesCard)
	endpointCard := cards.NewCard("Endpoints", endpointsCard)
	locationCard := cards.NewCard("Location", locationsCard)
	deviceCard := cards.NewCard("Device", cards.NewPlaceholderCard(""))
	cpuCard := cards.NewCard("CPU", cards.NewPlaceholderCard(""))
	memorycard := cards.NewCard("Memory", cards.NewPlaceholderCard(""))
	storageCard := cards.NewCard("Storage", cards.NewStorageCard(sysInfo))
	logCard := cards.NewCard("Logs", cards.NewLogSizeCard(logSizes))

	// Set small sizes for compact display
	cardWidth, cardHeight := 18, 4
	placeholderCard.SetSize(cardWidth, cardHeight)
	successCard.SetSize(cardWidth, cardHeight)
	requestCard.SetSize(cardWidth, cardHeight)
	userCard.SetSize(cardWidth, cardHeight)
	activityCard.SetSize(cardWidth, cardHeight)
	endpointCard.SetSize(cardWidth, cardHeight)
	locationCard.SetSize(cardWidth, cardHeight)
	deviceCard.SetSize(cardWidth, cardHeight)

	// Create grid (2x2 for top-left placement)
	termWidth, _, _ := term.GetSize(os.Stdout.Fd())
	grid := dashboard.NewDashboardGrid(2, 2, termWidth)

	// Add all cards to the grid - the grid will handle layout positioning
	// The order here determines the navigation order
	allCards := []*cards.Card{
		placeholderCard, // 0 - top-left grid
		successCard,     // 1 - top-right grid
		requestCard,     // 2 - bottom-left grid
		userCard,        // 3 - bottom-right grid
		activityCard,    // 4 - sidebar
		endpointCard,    // 5 - middle
		locationCard,    // 6 - bottom area
		deviceCard,      // 7 - bottom area
		cpuCard,         // 8 - sub-grid
		memorycard,      // 9 - sub-grid
		storageCard,     // 10 - sub-grid
		logCard,         // 11 - sub-grid
	}

	calculatable := []cards.CalculatedCard{
		successRateCard,
		requestsCard,
		usersCard,
		endpointsCard,
		locationsCard,
		activitiesCard,
	}

	// Add cards to grid with their layout positions
	// Main grid cards (positions 0-3)
	for i := range 4 {
		grid.AddCard(allCards[i])
	}

	// Sidebar card (position 4)
	grid.AddSidebarCard(allCards[4])

	// Middle card (position 5)
	// Ensure the card implements DynamicHeightCard before adding
	grid.AddMiddleCard(allCards[5])

	// Bottom cards (positions 6-7)
	grid.AddSidebarBottomCard(allCards[6])
	grid.AddSidebarBottomCard(allCards[7])

	grid.AddSidebarSubGridCard(allCards[8])
	grid.AddSidebarSubGridCard(allCards[9])
	grid.AddSidebarSubGridCard(allCards[10])
	grid.AddSidebarSubGridCard(allCards[11])

	// Set first card as active
	grid.SetActiveCard(0)

	return Model{
		Config:            cfg,
		Grid:              grid,
		Help:              help.New(),
		Keys:              ui.NewKeyMap(),
		Initialized:       false,
		Periods:           periods,
		SelectedPeriod:    2, // Default to "30 days"
		TabNavigationMode: false,
		calculatable:      calculatable,
		logs:              logs,
		parsedLogs:        parsedLogs,
		currentLogs:       currentLogs,
	}
}

func (m Model) Init() tea.Cmd {
	return nil
	// return tea.Batch(
	// tea.Tick(time.Second*2, func(t time.Time) tea.Msg {
	// 	return UpdateDataMsg{}
	// }),
	// )
}

// UpdateDataMsg is sent to trigger data updates
type UpdateDataMsg struct{}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case UpdateDataMsg:
		// Simulate real-time data updates
		m.updateCardData()
		return m, tea.Tick(time.Second*2, func(t time.Time) tea.Msg {
			return UpdateDataMsg{}
		})

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
				m.Grid.SetActiveCard(newIndex);
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

	// Update all calculatable cards with updated logs
	for _, card := range m.calculatable {
		card.UpdateCalculated(m.currentLogs, period)
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

	card := m.Cards[m.ActiveCard]
	
	// Render compact card for top-left corner
	cardView := card.RenderCompact(true)
	
	// Add some navigation help at the bottom
	help := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241")).
		Render("\n\n← → Navigate cards | ↑ ↓ Adjust values | q Quit")
	
	return cardView + help
}