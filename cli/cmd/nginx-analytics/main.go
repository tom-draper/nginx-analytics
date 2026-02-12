package main

import (
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/tom-draper/nginx-analytics/agent/pkg/logger"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	"github.com/tom-draper/nginx-analytics/cli/internal/config"
	"github.com/tom-draper/nginx-analytics/cli/internal/env"
	"github.com/tom-draper/nginx-analytics/cli/internal/model"
)

func main() {
	logger.Log.Println("Starting Nginx Analytics CLI...")
	cfg := config.LoadConfig()
	e := env.LoadEnv()

	// In local mode, start the background CPU sampler so MeasureSystem()
	// doesn't block for a second on every poll.
	if e.ServerURL == "" {
		system.StartSampler(2 * time.Second)
	}

	// Create the model with the dashboard
	m := model.New(cfg, e.ServerURL, e.AuthToken)

	// Create the program
	p := tea.NewProgram(m, tea.WithAltScreen())

	// Run the program
	if _, err := p.Run(); err != nil {
		logger.Log.Fatalf("Error running program: %v", err)
		os.Exit(1)
	}
}
