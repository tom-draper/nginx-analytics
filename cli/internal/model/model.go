package model

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/guptarohit/asciigraph"

	"github.com/tom-draper/nginx-analytics/cli/internal/data"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui"
)

var TitleStyle = lipgloss.NewStyle().
	Bold(true).
	Foreground(lipgloss.Color("205"))

// Model represents the application state
type Model struct {
	Cards       []ui.Card
	ActiveCard  int
	Help        help.Model
	Keys        ui.KeyMap
	Width       int
	Height      int
	Initialized bool
}

// New creates a new model with initial state
func New() Model {
	// Generate some sample data
	cpuData := data.GenerateSampleData(100, 40, 90)
	memoryData := data.GenerateSampleData(100, 50, 80)
	networkData := data.GenerateSampleData(100, 0, 1000)
	diskIOData := data.GenerateSampleData(100, 100, 800)

	return Model{
		Cards: []ui.Card{
			{Title: "CPU Usage (%)", Data: cpuData, Color: lipgloss.Color("168")},
			{Title: "Memory Usage (%)", Data: memoryData, Color: lipgloss.Color("43")},
			{Title: "Network Traffic (Mbps)", Data: networkData, Color: lipgloss.Color("39")},
			{Title: "Disk I/O (IOPS)", Data: diskIOData, Color: lipgloss.Color("208")},
		},
		ActiveCard:  0,
		Help:        help.New(),
		Keys:        ui.NewKeyMap(),
		Initialized: false,
	}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch {
		case key.Matches(msg, m.Keys.Quit):
			return m, tea.Quit
		case key.Matches(msg, m.Keys.Left):
			m.ActiveCard = max(0, m.ActiveCard-1)
		case key.Matches(msg, m.Keys.Right):
			m.ActiveCard = min(len(m.Cards)-1, m.ActiveCard+1)
		case key.Matches(msg, m.Keys.Up):
			// Add some data to simulate real-time updates
			card := &m.Cards[m.ActiveCard]
			card.Data = append(card.Data[1:], card.Data[len(card.Data)-1]+5)
		case key.Matches(msg, m.Keys.Down):
			// Add some data to simulate real-time updates
			card := &m.Cards[m.ActiveCard]
			card.Data = append(card.Data[1:], card.Data[len(card.Data)-1]-5)
		}
	case tea.WindowSizeMsg:
		m.Height = msg.Height
		m.Width = msg.Width
		m.Initialized = true
	}

	return m, nil
}

func (m Model) View() string {
	if !m.Initialized {
		return "Initializing..."
	}

	var s strings.Builder
	card := m.Cards[m.ActiveCard]

	graph := asciigraph.Plot(
		card.Data,
		asciigraph.Width(40),
		asciigraph.Height(10),
		asciigraph.Caption(fmt.Sprintf("Last %d points", len(card.Data))),
	)

	s.WriteString(TitleStyle.Render(card.Title) + "\n\n")
	s.WriteString(graph)
	s.WriteString(fmt.Sprintf("\nCurrent: %.2f | Min: %.2f | Max: %.2f",
		card.GetLatestValue(), card.GetMin(), card.GetMax()))

	return s.String()
}
