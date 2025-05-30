package model

import (
	"math/rand"
	"time"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"

	"github.com/tom-draper/nginx-analytics/agent/pkg/config"
	cards "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
	grid "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard"
	keymap "github.com/tom-draper/nginx-analytics/cli/internal/ui"
)

// Model represents the application state
type Model struct {
	Config      config.Config
	Grid        *grid.DashboardGrid
	Help        help.Model
	Keys        keymap.KeyMap
	Width       int
	Height      int
	Initialized bool

	// Data for cards
	successRateCard *cards.SuccessRateCard
	requestsCard    *cards.RequestsCard
	usersCard       *cards.UsersCard
}

// New creates a new model with initial state
func New(cfg config.Config) Model {
	// Create specific card instances
	successRateCard := cards.NewSuccessRateCard(9534, 10000) // 95.34% success rate
	requestsCard := cards.NewRequestsCard(125600, 42.3)      // 125.6K requests at 42.3/s
	usersCard := cards.NewUsersCard(1250, 15600)             // 1.25K active of 15.6K total

	// Create base cards with renderers
	placeholderCard := cards.NewBaseCard("Dashboard", cards.NewPlaceholderCard("Analytics"))
	successCard := cards.NewBaseCard("Success Rate", successRateCard)
	requestCard := cards.NewBaseCard("Requests", requestsCard)
	userCard := cards.NewBaseCard("Users", usersCard)

	// Set small sizes for compact display
	cardWidth, cardHeight := 20, 6
	placeholderCard.SetSize(cardWidth, cardHeight)
	successCard.SetSize(cardWidth, cardHeight)
	requestCard.SetSize(cardWidth, cardHeight)
	userCard.SetSize(cardWidth, cardHeight)

	// Create grid (2x2 for top-left placement)
	grid := grid.NewDashboardGrid(2, 2)
	grid.AddCard(placeholderCard)
	grid.AddCard(successCard)
	grid.AddCard(requestCard)
	grid.AddCard(userCard)

	// Set first card as active
	grid.SetActiveCard(0)

	return Model{
		Config:          cfg,
		Grid:            grid,
		Help:            help.New(),
		Keys:            keymap.NewKeyMap(),
		Initialized:     false,
		successRateCard: successRateCard,
		requestsCard:    requestsCard,
		usersCard:       usersCard,
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		tea.Tick(time.Second*2, func(t time.Time) tea.Msg {
			return UpdateDataMsg{}
		}),
	)
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
		case key.Matches(msg, m.Keys.Left):
			newIndex := m.Grid.ActiveCard - 1
			if newIndex < 0 {
				newIndex = len(m.Grid.Cards) - 1
			}
			m.Grid.SetActiveCard(newIndex)
		case key.Matches(msg, m.Keys.Right):
			newIndex := (m.Grid.ActiveCard + 1) % len(m.Grid.Cards)
			m.Grid.SetActiveCard(newIndex)
		case key.Matches(msg, m.Keys.Up):
			// Move up in grid
			newIndex := m.Grid.ActiveCard - m.Grid.Cols
			if newIndex >= 0 {
				m.Grid.SetActiveCard(newIndex)
			}
		case key.Matches(msg, m.Keys.Down):
			// Move down in grid
			newIndex := m.Grid.ActiveCard + m.Grid.Cols
			if newIndex < len(m.Grid.Cards) {
				m.Grid.SetActiveCard(newIndex)
			}
		}
	case tea.WindowSizeMsg:
		m.Height = msg.Height
		m.Width = msg.Width
		m.Initialized = true
	}

	return m, nil
}

func (m *Model) updateCardData() {
	// Simulate data changes
	rand.Seed(time.Now().UnixNano())

	// Update success rate (fluctuate around 95%)
	successful := 9500 + rand.Intn(500)
	total := 10000 + rand.Intn(200)
	m.successRateCard.Update(successful, total)

	// Update requests (simulate traffic changes)
	currentRequests := m.requestsCard.Count + rand.Intn(200) - 100
	if currentRequests < 0 {
		currentRequests = 0
	}
	rate := 35.0 + rand.Float64()*20.0 // 35-55 req/s
	m.requestsCard.Update(currentRequests, rate)

	// Update users (gradual changes)
	activeChange := rand.Intn(20) - 10
	newActive := m.usersCard.ActiveUsers + activeChange
	if newActive < 0 {
		newActive = 0
	}
	if newActive > m.usersCard.TotalUsers {
		newActive = m.usersCard.TotalUsers
	}
	m.usersCard.Update(newActive, m.usersCard.TotalUsers)
}

func (m Model) View() string {
	if !m.Initialized {
		return "Initializing dashboard..."
	}

	// Render the grid in top-left corner
	gridView := m.Grid.RenderGrid()

	// Add some navigation help at the bottom
	help := "\n\n" +
		"Navigation: ← → ↑ ↓  |  Quit: q\n" +
		"Data updates every 2 seconds"

	return gridView + help
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