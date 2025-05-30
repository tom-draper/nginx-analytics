package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/ansi"
)

// CardRenderer defines the interface for rendering card content
type CardRenderer interface {
	RenderContent(width, height int) string
	GetTitle() string
}

// BaseCard provides the generic card structure and rendering
type BaseCard struct {
	Title    string
	Width    int
	Height   int
	IsActive bool
	renderer CardRenderer
}

// NewBaseCard creates a new base card with a renderer
func NewBaseCard(title string, renderer CardRenderer) *BaseCard {
	return &BaseCard{
		Title:    title,
		Width:    20, // Default small size
		Height:   6,  // Default small size
		IsActive: false,
		renderer: renderer,
	}
}

// Render renders the complete card with border and title
func (c *BaseCard) Render() string {
	// Choose border style based on active state
	borderColor := lipgloss.Color("238") // Gray
	titleColor := lipgloss.Color("238")
	if c.IsActive {
		borderColor = lipgloss.Color("39") // Blue
		titleColor = lipgloss.Color("39")
	}

	// Calculate content dimensions
	contentWidth := c.Width - 4   // Account for border + padding
	contentHeight := c.Height - 3 // Account for border + padding (less because title overlay)

	if contentWidth < 1 {
		contentWidth = 1
	}
	if contentHeight < 1 {
		contentHeight = 1
	}

	// Get content from renderer
	content := c.renderer.RenderContent(contentWidth, contentHeight)

	// Create card style
	cardStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(borderColor).
		Width(c.Width).
		Height(c.Height).
		Padding(1)

	// Render the card
	card := cardStyle.Render(content)

	// Add title overlay
	return c.addTitleOverlay(card, titleColor)
}

// SetActive sets the active state of the card
func (c *BaseCard) SetActive(active bool) {
	c.IsActive = active
}

// SetSize sets the card dimensions
func (c *BaseCard) SetSize(width, height int) {
	c.Width = width
	c.Height = height
}

func (c *BaseCard) addTitleOverlay(card string, titleColor lipgloss.Color) string {
	lines := strings.Split(card, "\n")

	if len(lines) == 0 {
		return card
	}

	titleStyle := lipgloss.NewStyle().
		Bold(true).
		Foreground(titleColor)

	titleStart := 3 // Visual column where the title should start

	if len(lines) > 0 {
		originalTopLine := lines[0]
		
		rawTopLine := ansi.StripANSI(originalTopLine)
		rawTopLineRunes := []rune(rawTopLine) // Use runes for correct character length with Unicode

		styledTitleContent := " " + c.Title + " "
		renderedTitle := titleStyle.Render(styledTitleContent)
		renderedTitleVisualWidth := lipgloss.Width(renderedTitle)

		prefixVisualLength := min(titleStart, len(rawTopLineRunes))
		
		titleEndInRaw := titleStart + renderedTitleVisualWidth

		suffixRawRunes := []rune{}
		if titleEndInRaw < len(rawTopLineRunes) {
			suffixRawRunes = rawTopLineRunes[titleEndInRaw:]
		}

		newTopLine := titleStyle.Render(string(rawTopLineRunes[:prefixVisualLength])) + renderedTitle + titleStyle.Render(string(suffixRawRunes))

		lines[0] = newTopLine
	}

	return strings.Join(lines, "\n")
}

// PlaceholderCard shows a simple placeholder
type PlaceholderCard struct {
	message string
}

func NewPlaceholderCard(message string) *PlaceholderCard {
	return &PlaceholderCard{message: message}
}

func (p *PlaceholderCard) RenderContent(width, height int) string {
	lines := []string{
		"",
		p.message,
		"",
	}

	// Center the message
	for i, line := range lines {
		if len(line) > 0 {
			padding := (width - len(line)) / 2
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

func (p *PlaceholderCard) GetTitle() string {
	return "Dashboard"
}

// SuccessRateCard displays success rate percentage
type SuccessRateCard struct {
	SuccessRate float64
	Total       int
	Successful  int
}

func NewSuccessRateCard(successful, total int) *SuccessRateCard {
	rate := 0.0
	if total > 0 {
		rate = (float64(successful) / float64(total)) * 100
	}
	return &SuccessRateCard{
		SuccessRate: rate,
		Total:       total,
		Successful:  successful,
	}
}

func (s *SuccessRateCard) RenderContent(width, height int) string {
	// Choose color based on success rate
	rateColor := lipgloss.Color("196") // Red for low
	if s.SuccessRate >= 95 {
		rateColor = lipgloss.Color("46") // Green for high
	} else if s.SuccessRate >= 90 {
		rateColor = lipgloss.Color("226") // Yellow for medium
	}

	rateStyle := lipgloss.NewStyle().
		Foreground(rateColor).
		Bold(true)

	lines := []string{
		"",
		rateStyle.Render(fmt.Sprintf("%.1f%%", s.SuccessRate)),
		fmt.Sprintf("%d/%d", s.Successful, s.Total),
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

func (s *SuccessRateCard) GetTitle() string {
	return "Success Rate"
}

// Update method for real-time data
func (s *SuccessRateCard) Update(successful, total int) {
	s.Successful = successful
	s.Total = total
	if total > 0 {
		s.SuccessRate = (float64(successful) / float64(total)) * 100
	} else {
		s.SuccessRate = 0
	}
}

// RequestsCard displays request count and rate
type RequestsCard struct {
	Count int
	Rate  float64 // requests per second
}

func NewRequestsCard(count int, rate float64) *RequestsCard {
	return &RequestsCard{
		Count: count,
		Rate:  rate,
	}
}

func (r *RequestsCard) RenderContent(width, height int) string {
	countStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("39")).
		Bold(true)

	rateStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241"))

	lines := []string{
		"",
		countStyle.Render(r.formatCount()),
		rateStyle.Render(fmt.Sprintf("%.1f/s", r.Rate)),
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

func (r *RequestsCard) formatCount() string {
	if r.Count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(r.Count)/1000000)
	} else if r.Count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(r.Count)/1000)
	}
	return fmt.Sprintf("%d", r.Count)
}

func (r *RequestsCard) GetTitle() string {
	return "Requests"
}

func (r *RequestsCard) Update(count int, rate float64) {
	r.Count = count
	r.Rate = rate
}

// UsersCard displays active user count
type UsersCard struct {
	ActiveUsers int
	TotalUsers  int
}

func NewUsersCard(active, total int) *UsersCard {
	return &UsersCard{
		ActiveUsers: active,
		TotalUsers:  total,
	}
}

func (u *UsersCard) RenderContent(width, height int) string {
	activeStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("46")).
		Bold(true)

	totalStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241"))

	lines := []string{
		"",
		activeStyle.Render(u.formatUsers(u.ActiveUsers)),
		totalStyle.Render(fmt.Sprintf("of %s", u.formatUsers(u.TotalUsers))),
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

func (u *UsersCard) formatUsers(count int) string {
	if count >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(count)/1000000)
	} else if count >= 1000 {
		return fmt.Sprintf("%.1fK", float64(count)/1000)
	}
	return fmt.Sprintf("%d", count)
}

func (u *UsersCard) GetTitle() string {
	return "Users"
}

func (u *UsersCard) Update(active, total int) {
	u.ActiveUsers = active
	u.TotalUsers = total
}
