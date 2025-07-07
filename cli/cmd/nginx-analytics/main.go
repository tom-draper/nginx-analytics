package main

import (
	"os"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/tom-draper/nginx-analytics/cli/internal/config"
	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
	"github.com/tom-draper/nginx-analytics/cli/internal/env"
	"github.com/tom-draper/nginx-analytics/cli/internal/model"
)

func main() {
	logger.Log.Println("Starting Nginx Analytics CLI...")
	cfg := config.LoadConfig()
	e := env.LoadEnv()

	// Create the model with the dashboard
	m := model.New(cfg, e.ServerURL)

	// Create the program
	p := tea.NewProgram(m, tea.WithAltScreen())

	// Run the program
	if _, err := p.Run(); err != nil {
		logger.Log.Fatalf("Error running program: %v", err)
		os.Exit(1)
	}
}
