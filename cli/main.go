package main

import (
	"log"
	"os"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/tom-draper/nginx-analytics/agent/pkg/config"
	"github.com/tom-draper/nginx-analytics/cli/internal/model"
)

func main() {
	cfg := config.LoadConfig()

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
