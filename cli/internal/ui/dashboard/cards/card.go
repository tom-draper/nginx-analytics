package cards

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/ansi"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// CardRenderer defines the interface for rendering card content
type CardRenderer interface {
	RenderContent(width, height int) string
	GetTitle() string
}

// Card provides the generic card structure and rendering
type Card struct {
	Title    string
	Width    int
	Height   int
	IsActive bool
	renderer CardRenderer
}

// NewBaseCard creates a new base card with a renderer
func NewCard(title string, renderer CardRenderer) *Card {
	return &Card{
		Title:    title,
		Width:    20, // Default small size
		Height:   6,  // Default small size
		IsActive: false,
		renderer: renderer,
	}
}

// Render renders the complete card with border and title
func (c *Card) Render() string {
	// Choose border style based on active state
	borderColor := lipgloss.Color("238") // Gray
	if c.IsActive {
		borderColor = styles.Green
	}

	// Calculate content dimensions
	contentWidth := c.Width   // Account for border + padding
	contentHeight := c.Height // Account for border + padding (less because title overlay)

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
		Height(c.Height)

	// Render the card
	card := cardStyle.Render(content)

	// Add title overlay
	return c.addTitleOverlay(card, borderColor)
}

// SetActive sets the active state of the card
func (c *Card) SetActive(active bool) {
	c.IsActive = active
}

// SetSize sets the card dimensions
func (c *Card) SetSize(width, height int) {
	c.Width = width
	c.Height = height
}

func (c *Card) addTitleOverlay(card string, borderColor lipgloss.Color) string {
	lines := strings.Split(card, "\n")

	if len(lines) == 0 || c.Title == "" {
		return card
	}

	titleStyle := lipgloss.NewStyle().
		Bold(true).
		Foreground(borderColor)

	titleStart := 2 // Visual column where the title should start

	if len(lines) > 0 {
		originalTopLine := lines[0]
		rawTopLine := ansi.StripANSI(originalTopLine)
		rawTopLineRunes := []rune(rawTopLine)

		styledTitleContent := " " + c.Title + " "
		renderedTitle := styledTitleContent
		renderedTitleVisualWidth := lipgloss.Width(titleStyle.Render(renderedTitle))

		prefixVisualLength := min(titleStart, len(rawTopLineRunes))
		titleEndInRaw := titleStart + renderedTitleVisualWidth

		var suffixRawRunes []rune
		if titleEndInRaw < len(rawTopLineRunes) {
			suffixRawRunes = rawTopLineRunes[titleEndInRaw:]
		}

		// Assemble the full raw line and apply style once
		fullLineRaw := string(rawTopLineRunes[:prefixVisualLength]) + renderedTitle + string(suffixRawRunes)
		newTopLine := titleStyle.Render(fullLineRaw)

		lines[0] = newTopLine
	}

	return strings.Join(lines, "\n")
}
