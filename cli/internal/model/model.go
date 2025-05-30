package model

import (
	"math/rand"
	"os"
	"time"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/term"

	"github.com/tom-draper/nginx-analytics/agent/pkg/config"
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
	placeholderCard := cards.NewCard("", cards.NewLogoCard())
	successCard := cards.NewCard("Success Rate", successRateCard)
	requestCard := cards.NewCard("Requests", requestsCard)
	userCard := cards.NewCard("Users", usersCard)

	// Set small sizes for compact display
	cardWidth, cardHeight := 18, 4
	placeholderCard.SetSize(cardWidth, cardHeight)
	successCard.SetSize(cardWidth, cardHeight)
	requestCard.SetSize(cardWidth, cardHeight)
	userCard.SetSize(cardWidth, cardHeight)

	// Create grid (2x2 for top-left placement)
	termWidth, _, _ := term.GetSize(os.Stdout.Fd())
	grid := dashboard.NewDashboardGrid(2, 2, termWidth)
	grid.AddCard(placeholderCard)
	grid.AddCard(successCard)
	grid.AddCard(requestCard)
	grid.AddCard(userCard)

	sidebarContentCard := cards.NewCard("Activity", cards.NewPlaceholderCard("")) // Assuming cards.NewCard exists
	grid.AddSidebarCard(sidebarContentCard)

	grid.AddMiddleCard(cards.NewCard("Endpoints", cards.NewPlaceholderCard("")))
	grid.AddBottomCard(cards.NewCard("Location", cards.NewPlaceholderCard(""))) // Add success card to bottom
	grid.AddBottomCard(cards.NewCard("Device", cards.NewPlaceholderCard(""))) // Add requests card to bottom

	// Set first card as active
	grid.SetActiveCard(0)

	return Model{
		Config:          cfg,
		Grid:            grid,
		Help:            help.New(),
		Keys:            ui.NewKeyMap(),
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
		m.Grid.SetTerminalWidth(msg.Width)
	}

	return m, nil
}

func (m *Model) updateCardData() {
	// Update success rate (fluctuate around 95%)
	successful := 9500 + rand.Intn(500)
	total := 10000 + rand.Intn(200)
	m.successRateCard.Update(successful, total)

	// Update requests (simulate traffic changes)
	currentRequests := max(m.requestsCard.Count + rand.Intn(200) - 100, 0)
	rate := 35.0 + rand.Float64()*20.0 // 35-55 req/s
	m.requestsCard.Update(currentRequests, rate)

	// Update users (gradual changes)
	activeChange := rand.Intn(20) - 10
	newActive := min(max(m.usersCard.ActiveUsers+activeChange, 0), m.usersCard.TotalUsers)
	m.usersCard.Update(newActive, m.usersCard.TotalUsers)
}

func (m Model) View() string {
	if !m.Initialized {
		return "Initializing dashboard..."
	}

	// Render the grid in top-left corner
	gridView := m.Grid.RenderGrid()

	// Add some navigation help at the bottom
	help := "\n\n← → ↑ ↓    [q] quit "

	// Create a lipgloss style for faint white color

	// faintWhiteStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("238")) // A common faint white/light gray

	// Render the help text right-aligned at the bottom
	// We need to calculate padding based on the current terminal width
	// The gridView already takes up space, so we want the help to be below it.
	// We'll calculate the horizontal padding for right alignment based on m.Width.
	// Since the help is below the grid, we use m.Width for alignment.
	helpLine := lipgloss.NewStyle().
		Width(m.Width).
		Align(lipgloss.Right).Foreground(styles.BorderColor).Render(help)

	return gridView + helpLine
}

// Alternative view for just the top-left placement
func (m Model) ViewCompact() string {
	if !m.Initialized {
		return "Initializing..."
	}

	// Just render the cards in a simple top-left layout
	gridView := m.Grid.RenderGrid()

	return gridView
}
