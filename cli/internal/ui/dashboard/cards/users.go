package cards

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	l "github.com/tom-draper/nginx-analytics/cli/internal/logs"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	u "github.com/tom-draper/nginx-analytics/cli/internal/logs/user"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// RequestsCard displays request count and rate
type UsersCard struct {
	logs        []l.NginxLog // Reference to log entries
	period      p.Period
	Count       int       // Total request count (cached)
	Rate        float64   // Requests per hour (cached)
	lastUpdate  time.Time // When metrics were last calculated
}

func NewUsersCard(logs []l.NginxLog, period p.Period) *UsersCard {
	card := &UsersCard{logs: logs, period: period}

	// Initial calculation
	card.updateMetrics()
	return card
}

// UpdateLogs should be called when the log slice content changes
func (r *UsersCard) UpdateLogs(newLogs []l.NginxLog, period p.Period) {
	r.logs = newLogs
	r.updateMetrics()
}

func (r *UsersCard) updateMetrics() {
	r.Count = userCount(r.logs)
	r.Rate = float64(r.Count) / float64(p.PeriodHours(r.period))
}

func userCount(logs []l.NginxLog) int {
	userSet := make(map[string]struct{})
	for _, log := range logs {
		userID := u.UserID(log)
		userSet[userID] = struct{}{}
	}
	return len(userSet)
}

func (r *UsersCard) RenderContent(width, height int) string {
	// Ensure metrics are up to date
	r.updateMetrics()

	countStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#ffffff")).
		Bold(true)

	rateStyle := lipgloss.NewStyle().
		Foreground(styles.LightGray)

	lines := []string{
		"",
		countStyle.Render(r.formatCount()),
		rateStyle.Render(fmt.Sprintf("%.1f/h", r.Rate)),
		"",
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

func (r *UsersCard) formatCount() string {
	if r.Count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(r.Count)/1000000)
	} else if r.Count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(r.Count)/1000)
	}
	return fmt.Sprintf("%d", r.Count)
}

func (r *UsersCard) GetTitle() string {
	return "Requests"
}

// GetLastUpdate returns when metrics were last calculated
func (r *UsersCard) GetLastUpdate() time.Time {
	return r.lastUpdate
}

// ForceUpdate forces recalculation of metrics even if hash hasn't changed
func (r *UsersCard) ForceUpdate() {
	r.updateMetrics()
}
