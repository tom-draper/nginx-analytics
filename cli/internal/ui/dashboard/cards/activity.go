package cards

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
)

type ActivityCard struct {
	endpoints []endpoint
}

func NewActivityCard(logs []n.NGINXLog, period p.Period) *ActivityCard {
	card := &ActivityCard{}
	card.UpdateCalculated(logs, period)
	return card
}

func (p *ActivityCard) RenderContent(width, height int) string {
	lines := []string{
		"",
		"h",
	}


	// Center content
	for i, line := range lines {
		if len(line) > 0 {
			displayWidth := lipgloss.Width(line)
			padding := (width - displayWidth) / 2
			if padding > 0 {
				lines[i] = strings.Repeat(" ", padding) + line
			}
		}
	}

	// Fill to height
	for len(lines) < height {
		lines = append(lines, "")
	}

	return strings.Join(lines[:height], "\n")
}

func (p *ActivityCard) GetTitle() string {
	return "Activity"
}

func (r *ActivityCard) UpdateCalculated(logs []n.NGINXLog, period p.Period) {
	endpoints := getEndpoints(logs)
	r.endpoints = endpoints
}
