package dashboard

import (
	"github.com/charmbracelet/lipgloss"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/dashboard/cards"
)

// Layout constants for better maintainability
const (
	DefaultSidebarHeight    = 20
	DefaultEndpointsHeight  = 30
	DefaultVersionHeight    = 9
	DefaultCenterPairHeight = 9
	DefaultFooterHeight     = 10
	DefaultSystemCardHeight = 8
	SmallSystemCardHeight   = 2
	CardSpacing             = 2
	BorderPadding           = 2
)

// CardPosition represents different card positions in the layout
type CardPosition int

const (
	PositionMainGrid CardPosition = iota
	PositionSidebar
	PositionEndpoints
	PositionVersion
	PositionCenterPair
	PositionSystem
	PositionFooter
)

// LayoutSection represents a section of the dashboard layout
type LayoutSection struct {
	Cards      []*cards.Card
	MaxCards   int
	RenderFunc func(*Layout, int) string
}

// Layout manages the layout of the dashboard.
type Layout struct {
	grid *DashboardGrid
}

// NewLayout creates a new layout with the given grid.
func NewLayout(grid *DashboardGrid) *Layout {
	return &Layout{grid: grid}
}

// DashboardGrid manages a collection of cards in a custom layout with sidebar.
type DashboardGrid struct {
	// Basic grid properties
	Rows          int
	Cols          int
	TerminalWidth int
	ActiveCard    int

	// Card collections
	cardsByPosition map[CardPosition][]*cards.Card

	// Unified navigation
	allCards []Card

	// Layout
	layout *Layout
}

// Card represents a card with its position for navigation
type Card struct {
	Card     *cards.Card
	Position CardPosition
}

// NewDashboardGrid creates a new dashboard grid with sensible defaults.
func NewDashboardGrid(rows, cols, terminalWidth int) *DashboardGrid {
	d := &DashboardGrid{
		Rows:            rows,
		Cols:            cols,
		TerminalWidth:   terminalWidth,
		ActiveCard:      0,
		cardsByPosition: make(map[CardPosition][]*cards.Card),
		allCards:        make([]Card, 0),
	}
	d.layout = NewLayout(d)
	return d
}

// AddCard adds a card to the specified position in the grid.
func (d *DashboardGrid) AddCard(card *cards.Card, position CardPosition) error {
	if card == nil {
		return ErrNilCard
	}

	// Check if the card already exists at the specified position
	if _, ok := d.cardsByPosition[position]; ok {
		// Check if the card already exists in the slice
		for _, c := range d.cardsByPosition[position] {
			if c == card {
				return ErrCardAlreadyExists
			}
		}
	}

	d.cardsByPosition[position] = append(d.cardsByPosition[position], card)
	d.addToAllCards(card, position)
	return nil
}

func (d DashboardGrid) GetAllCards() []Card {
	return d.allCards
}

// Navigation and utility methods

// SetActiveCard sets the currently active card across all cards.
func (d *DashboardGrid) SetActiveCard(index int) error {
	if index < 0 || index >= len(d.allCards) {
		return ErrInvalidCardIndex
	}

	// Deactivate current active card
	if d.ActiveCard >= 0 && d.ActiveCard < len(d.allCards) {
		d.allCards[d.ActiveCard].Card.SetActive(false)
	}

	// Activate new card
	d.ActiveCard = index
	d.allCards[d.ActiveCard].Card.SetActive(true)
	return nil
}

// SetTerminalWidth updates the terminal width.
func (d *DashboardGrid) SetTerminalWidth(width int) {
	if width > 0 {
		d.TerminalWidth = width
	}
}

// GetTotalCardCount returns the total number of cards.
func (d *DashboardGrid) GetTotalCardCount() int {
	return len(d.allCards)
}

// GetActiveCard returns the currently active card.
func (d *DashboardGrid) GetActiveCard() *cards.Card {
	if d.ActiveCard >= 0 && d.ActiveCard < len(d.allCards) {
		return d.allCards[d.ActiveCard].Card
	}
	return nil
}

// Private helper methods

// addToAllCards adds a card to the unified navigation list.
func (d *DashboardGrid) addToAllCards(card *cards.Card, position CardPosition) {
	d.allCards = append(d.allCards, Card{
		Card:     card,
		Position: position,
	})
}

// Main rendering method

func (d *DashboardGrid) RenderGrid() string {
	return d.layout.RenderGrid()
}

func (l *Layout) RenderGrid() string {
	if len(l.grid.allCards) == 0 {
		return ""
	}

	leftColumn := l.buildLeftColumn()
	rightColumn := l.buildRightColumn(lipgloss.Width(leftColumn))

	if rightColumn == "" {
		return leftColumn
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, leftColumn, rightColumn)
}

// buildLeftColumn constructs the left column of the layout.
func (l *Layout) buildLeftColumn() string {
	var parts []string

	if mainGrid := l.renderMainGrid(); mainGrid != "" {
		parts = append(parts, mainGrid)
	}

	mainGridWidth := 0
	if len(parts) > 0 {
		mainGridWidth = lipgloss.Width(parts[0])
	}

	if endpoints := l.renderSingleCard(l.grid.cardsByPosition[PositionEndpoints][0], mainGridWidth, DefaultEndpointsHeight); endpoints != "" {
		parts = append(parts, endpoints)
	}

	if version := l.renderSingleCard(l.grid.cardsByPosition[PositionVersion][0], mainGridWidth, DefaultVersionHeight); version != "" {
		parts = append(parts, version)
	}

	if len(parts) == 0 {
		return ""
	}

	return lipgloss.JoinVertical(lipgloss.Left, parts...)
}

// buildRightColumn constructs the right column (sidebar area) of the layout.
func (l *Layout) buildRightColumn(leftColumnWidth int) string {
	if len(l.grid.cardsByPosition[PositionSidebar]) == 0 {
		return ""
	}

	mainContentWidth := max(l.grid.TerminalWidth-leftColumnWidth-CardSpacing, 0)
	var parts []string

	// Main sidebar card
	if sidebar := l.renderSingleCard(l.grid.cardsByPosition[PositionSidebar][0], mainContentWidth+2, DefaultSidebarHeight); sidebar != "" {
		parts = append(parts, sidebar)
	}

	// Additional sidebar sections
	if centerPair := l.renderCenterPairCards(mainContentWidth); centerPair != "" {
		parts = append(parts, centerPair)
	}

	if system := l.renderSystemCards(mainContentWidth); system != "" {
		parts = append(parts, system)
	}

	if footer := l.renderFooterCards(mainContentWidth); footer != "" {
		parts = append(parts, footer)
	}

	if len(parts) == 0 {
		return ""
	}

	return lipgloss.JoinVertical(lipgloss.Left, parts...)
}

// Card rendering methods

// renderMainGrid renders the main grid in the top-left.
func (l *Layout) renderMainGrid() string {
	if len(l.grid.cardsByPosition[PositionMainGrid]) == 0 || l.grid.Rows == 0 || l.grid.Cols == 0 {
		return ""
	}

	var rows []string
	for r := range l.grid.Rows {
		var rowCards []string
		for c := range l.grid.Cols {
			cardIndex := r*l.grid.Cols + c
			if cardIndex < len(l.grid.cardsByPosition[PositionMainGrid]) {
				rowCards = append(rowCards, l.grid.cardsByPosition[PositionMainGrid][cardIndex].Render())
			}
		}
		if len(rowCards) > 0 {
			rows = append(rows, lipgloss.JoinHorizontal(lipgloss.Top, rowCards...))
		}
	}

	if len(rows) == 0 {
		return ""
	}

	return lipgloss.JoinVertical(lipgloss.Left, rows...)
}

// renderSingleCard renders a single card with dynamic height support.
func (l *Layout) renderSingleCard(card *cards.Card, targetWidth, defaultHeight int) string {
	if card == nil {
		return ""
	}

	height := defaultHeight
	adjustedWidth := targetWidth - BorderPadding

	// Check for dynamic height support
	if dynamicRenderer, ok := card.Renderer.(cards.DynamicHeightCard); ok {
		height = dynamicRenderer.GetRequiredHeight(adjustedWidth)
	}

	card.SetSize(adjustedWidth, height)
	return card.Render()
}

// renderCenterPairCards renders the center pair cards section.
func (l *Layout) renderCenterPairCards(sidebarWidth int) string {
	return l.renderHorizontalCardPair(l.grid.cardsByPosition[PositionCenterPair], sidebarWidth, DefaultCenterPairHeight)
}

// renderFooterCards renders the footer cards section.
func (l *Layout) renderFooterCards(sidebarWidth int) string {
	if len(l.grid.cardsByPosition[PositionFooter]) == 0 {
		return ""
	}

	var renderedCards []string
	for i, card := range l.grid.cardsByPosition[PositionFooter] {
		cardWidth := l.calculateCardWidth(sidebarWidth, len(l.grid.cardsByPosition[PositionFooter]), i)

		height := DefaultFooterHeight
		if dynamicRenderer, ok := card.Renderer.(cards.DynamicHeightCard); ok {
			height = dynamicRenderer.GetRequiredHeight(cardWidth - BorderPadding)
		}

		card.SetSize(cardWidth, height)
		renderedCards = append(renderedCards, card.Render())
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, renderedCards...)
}

// renderSystemCards renders the system cards in a 2x2 grid layout.
func (l *Layout) renderSystemCards(sidebarWidth int) string {
	if len(l.grid.cardsByPosition[PositionSystem]) == 0 {
		return ""
	}

	availableWidth := sidebarWidth - CardSpacing
	leftCardWidth := (availableWidth + 1) / 2
	rightCardWidth := availableWidth / 2

	var rows []string
	for row := 0; row < 3 && row*2 < len(l.grid.cardsByPosition[PositionSystem]); row++ {
		var rowCards []string
		for col := range 2 {
			cardIndex := row*2 + col
			if cardIndex >= len(l.grid.cardsByPosition[PositionSystem]) {
				break
			}

			cardWidth := leftCardWidth
			if col == 1 {
				cardWidth = rightCardWidth
			}

			cardHeight := DefaultSystemCardHeight
			if row == 1 || row == 2 {
				cardHeight = SmallSystemCardHeight
			}

			l.grid.cardsByPosition[PositionSystem][cardIndex].SetSize(cardWidth, cardHeight)
			rowCards = append(rowCards, l.grid.cardsByPosition[PositionSystem][cardIndex].Render())
		}

		if len(rowCards) > 0 {
			rows = append(rows, lipgloss.JoinHorizontal(lipgloss.Top, rowCards...))
		}
	}

	if len(rows) == 0 {
		return ""
	}

	return lipgloss.JoinVertical(lipgloss.Left, rows...)
}

// renderHorizontalCardPair renders a pair of cards horizontally.
func (l *Layout) renderHorizontalCardPair(cardSlice []*cards.Card, totalWidth, cardHeight int) string {
	if len(cardSlice) == 0 {
		return ""
	}

	var renderedCards []string
	for i, card := range cardSlice {
		cardWidth := l.calculateCardWidth(totalWidth, len(cardSlice), i)
		card.SetSize(cardWidth, cardHeight)
		renderedCards = append(renderedCards, card.Render())
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, renderedCards...)
}

// calculateCardWidth calculates the width for a card in a horizontal layout.
func (l *Layout) calculateCardWidth(totalWidth, numCards, cardIndex int) int {
	if numCards == 1 {
		return totalWidth
	}

	availableWidth := totalWidth - CardSpacing
	baseWidth := availableWidth / numCards

	// Distribute extra pixels to left cards for odd widths
	extraPixels := availableWidth % numCards
	if cardIndex < extraPixels {
		return baseWidth + 1
	}

	return baseWidth
}

// Error definitions for better error handling
type DashboardError string

func (e DashboardError) Error() string {
	return string(e)
}

const (
	ErrNilCard           DashboardError = "card cannot be nil"
	ErrMaxCardsExceeded  DashboardError = "maximum number of cards exceeded for this section"
	ErrCardAlreadyExists DashboardError = "card already exists in this section"
	ErrInvalidCardIndex  DashboardError = "invalid card index"
)
