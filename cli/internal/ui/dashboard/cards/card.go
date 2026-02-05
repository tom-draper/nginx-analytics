package cards

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/agent/pkg/system"
	l "github.com/tom-draper/nginx-analytics/cli/internal/logs"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	p "github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
)

// CardRenderer defines the interface for rendering card content
type CardRenderer interface {
	RenderContent(width, height int) string
}

// Card provides the generic card structure and rendering
type Card struct {
	Title      string
	Width      int
	Height     int
	IsActive   bool
	IsFiltered bool
	Renderer   CardRenderer
}

// NewBaseCard creates a new base card with a renderer
func NewCard(title string, renderer CardRenderer) *Card {
	return &Card{
		Title:    title,
		Width:    20, // Default small size
		Height:   6,  // Default small size
		IsActive: false,
		Renderer: renderer,
	}
}

// Render renders the complete card with border and title
func (c *Card) Render() string {
	// Choose border style based on active state
	borderColor := styles.BorderColor
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
	content := c.Renderer.RenderContent(contentWidth, contentHeight)

	// Create card style
	cardStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(borderColor).
		Width(c.Width).
		Height(c.Height)

	// Render the card
	card := cardStyle.Render(content)

	// Add title overlay
	return c.addTitleOverlay(card)
}

// SetActive sets the active state of the card
func (c *Card) SetActive(active bool) {
	c.IsActive = active
}

// SetFiltered sets the filtered state of the card
func (c *Card) SetFiltered(filtered bool) {
	c.IsFiltered = filtered
}

// SetSize sets the card dimensions
func (c *Card) SetSize(width, height int) {
	c.Width = width
	c.Height = height
}

func (c *Card) addTitleOverlay(card string) string {
	lines := strings.Split(card, "\n")

	if len(lines) == 0 || c.Title == "" {
		return card
	}

	borderStyle := lipgloss.NewStyle().
		Foreground(styles.BorderColor)

	titleStyle := lipgloss.NewStyle().
		Bold(true).
		Foreground(styles.TitleColor)

	activeStyle := lipgloss.NewStyle().
		Bold(true).
		Foreground(styles.Green)

	titleStart := 2 // Visual column where the title should start

	if len(lines) > 0 {
		originalTopLine := lines[0]
		rawTopLine := l.StripANSI(originalTopLine)
		rawTopLineRunes := []rune(rawTopLine)

		// Use dynamic title if the renderer supports it
		titleText := c.Title
		if dt, ok := c.Renderer.(DynamicTitleCard); ok {
			titleText = dt.GetTitle()
		}
		if c.IsFiltered {
			titleText = titleText + "*"
		}

		styledTitleContent := " " + titleText + " "
		renderedTitle := styledTitleContent
		renderedTitleVisualWidth := lipgloss.Width(borderStyle.Render(renderedTitle))

		prefixVisualLength := min(titleStart, len(rawTopLineRunes))
		titleEndInRaw := titleStart + renderedTitleVisualWidth

		var suffixRawRunes []rune
		if titleEndInRaw < len(rawTopLineRunes) {
			suffixRawRunes = rawTopLineRunes[titleEndInRaw:]
		}

		// Assemble the full raw line and apply style once
		var newTopLine string
		if c.IsActive {
			newTopLine = activeStyle.Render(string(rawTopLineRunes[:prefixVisualLength]) + renderedTitle + string(suffixRawRunes))
		} else {
			newTopLine = borderStyle.Render(string(rawTopLineRunes[:prefixVisualLength])) + titleStyle.Render(renderedTitle) + borderStyle.Render(string(suffixRawRunes))
		}

		lines[0] = newTopLine
	}

	return strings.Join(lines, "\n")
}

// Add this interface to your cards package
type DynamicHeightCard interface {
	GetRequiredHeight(width int) int
}

type CalculatedCard interface {
	UpdateCalculated(logs []nginx.NGINXLog, period p.Period)
}

type CalculatedSystemCard interface {
	UpdateCalculated(sysInfo system.SystemInfo)
}

// DynamicTitleCard interface for cards whose title changes dynamically
type DynamicTitleCard interface {
	GetTitle() string
}

// DrillableCard interface for cards that support drill-in mode with row selection
type DrillableCard interface {
	EnterDrillMode()
	ExitDrillMode()
	IsInDrillMode() bool
	SelectUp()
	SelectDown()
	HasSelection() bool
	ClearSelection()
}

// EndpointFilter represents a filter for endpoint data
type EndpointFilter struct {
	Path   string
	Method string
	Status int
}

// ReferrerFilter represents a filter for referrer data
type ReferrerFilter struct {
	Referrer string
}

// LocationFilter represents a filter for location data
type LocationFilter struct {
	Location string
}

// DeviceFilter represents a filter for device/client data
type DeviceFilter struct {
	Device string
}

// VersionFilter represents a filter for version data
type VersionFilter struct {
	Version string
}
