package cards

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	u "github.com/tom-draper/nginx-analytics/cli/internal/logs/user"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// RequestsCard displays request count and rate
type UsersCard struct {
	logs   []n.NGINXLog // Reference to log entries
	period p.Period

	calculated struct {
		count      int       // Total request count (cached)
		rate       float64   // Requests per hour (cached)
		lastUpdate time.Time // When metrics were last calculated
	}
}

func NewUsersCard(logs []n.NGINXLog, period p.Period) *UsersCard {
	card := &UsersCard{logs: logs, period: period}

	// Initial calculation
	card.updateCalculated()
	return card
}

// UpdateLogs should be called when the log slice content changes
func (r *UsersCard) UpdateLogs(newLogs []n.NGINXLog, period p.Period) {
	r.logs = newLogs
	r.period = period
	r.updateCalculated()
}

func (r *UsersCard) updateCalculated() {
	r.calculated.count = userCount(r.logs)
	r.calculated.rate = float64(r.calculated.count) / float64(p.LogRangePeriodHours(r.logs, r.period))
}

func userCount(logs []n.NGINXLog) int {
	userSet := make(map[string]struct{})
	for _, log := range logs {
		userID := u.UserID(log)
		userSet[userID] = struct{}{}
	}
	return len(userSet)
}

func (r *UsersCard) RenderContent(width, height int) string {
	// Ensure metrics are up to date
	r.updateCalculated()

	countStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#ffffff")).
		Bold(true)

	rateStyle := lipgloss.NewStyle().
		Foreground(styles.LightGray)

	lines := []string{
		"",
		countStyle.Render(r.formatCount()),
		rateStyle.Render(fmt.Sprintf("%.1f/h", r.calculated.rate)),
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
	if r.calculated.count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(r.calculated.count)/1000000)
	} else if r.calculated.count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(r.calculated.count)/1000)
	}
	return fmt.Sprintf("%d", r.calculated.count)
}

func (r *UsersCard) GetTitle() string {
	return "Requests"
}

// GetLastUpdate returns when metrics were last calculated
func (r *UsersCard) GetLastUpdate() time.Time {
	return r.calculated.lastUpdate
}

// ForceUpdate forces recalculation of metrics even if hash hasn't changed
func (r *UsersCard) ForceUpdate() {
	r.updateCalculated()
}
