package main

import (
	"fmt"
	"log"
	"os"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/tom-draper/nginx-analytics/agent/pkg/config"
	"github.com/tom-draper/nginx-analytics/cli/internal/model"
	grid "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard"
	cards "github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
)

func main() {
	// Load your config
	cfg := config.Config{} // Your config initialization

	// Create the model with the dashboard
	m := model.New(cfg)

	// Create the program
	p := tea.NewProgram(m, tea.WithAltScreen())

	// Run the program
	if _, err := p.Run(); err != nil {
		log.Printf("Error running program: %v", err)
		os.Exit(1)
	}
}

// If you want to create cards programmatically elsewhere:
func createCustomDashboard() {
	// Create individual card renderers
	successRenderer := cards.NewSuccessRateCard(850, 900) // 94.4% success
	requestRenderer := cards.NewRequestsCard(50000, 23.5) // 50K requests, 23.5/s
	userRenderer := cards.NewUsersCard(432, 5600)         // 432 active users

	// Create base cards
	successCard := cards.NewBaseCard("API Success", successRenderer)
	requestCard := cards.NewBaseCard("Total Reqs", requestRenderer)
	userCard := cards.NewBaseCard("Online", userRenderer)
	placeholderCard := cards.NewBaseCard("Status", cards.NewPlaceholderCard("All Good"))

	// Set compact sizes
	for _, card := range []*cards.BaseCard{successCard, requestCard, userCard, placeholderCard} {
		card.SetSize(18, 5) // Even smaller if needed
	}

	// Create grid and add cards
	grid := grid.NewDashboardGrid(2, 2)
	grid.AddCard(placeholderCard) // Top-left
	grid.AddCard(successCard)     // Top-right
	grid.AddCard(requestCard)     // Bottom-left
	grid.AddCard(userCard)        // Bottom-right

	// Render the dashboard
	dashboard := grid.RenderGrid()
	fmt.Println(dashboard)
}
