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
	RenderFunc func(*DashboardGrid, int) string
}

// DashboardGrid manages a collection of cards in a custom layout with sidebar.
type DashboardGrid struct {
	// Basic grid properties
	Rows          int
	Cols          int
	TerminalWidth int
	ActiveCard    int

	// Card collections
	mainGridCards   []*cards.Card
	activityCard    *cards.Card
	endpointsCard   *cards.Card
	versionCard     *cards.Card
	centerPairCards []*cards.Card
	systemCards     []*cards.Card
	footerCards     []*cards.Card

	// Unified navigation
	allCards []Card
}

// Card represents a card with its position for navigation
type Card struct {
	Card     *cards.Card
	Position CardPosition
}

// NewDashboardGrid creates a new dashboard grid with sensible defaults.
func NewDashboardGrid(rows, cols, terminalWidth int) *DashboardGrid {
	return &DashboardGrid{
		Rows:            rows,
		Cols:            cols,
		TerminalWidth:   terminalWidth,
		ActiveCard:      0,
		mainGridCards:   make([]*cards.Card, 0, rows*cols),
		centerPairCards: make([]*cards.Card, 0, 2),
		systemCards:     make([]*cards.Card, 0, 4),
		footerCards:     make([]*cards.Card, 0, 2),
		allCards:        make([]Card, 0),
	}
}

// Card addition methods with improved error handling and consistency

// AddMiniCard adds a card to the main grid.
func (d *DashboardGrid) AddMiniCard(card *cards.Card) error {
	if card == nil {
		return ErrNilCard
	}
	if len(d.mainGridCards) >= d.Rows*d.Cols {
		return ErrMaxCardsExceeded
	}

	d.mainGridCards = append(d.mainGridCards, card)
	d.addToAllCards(card, PositionMainGrid)
	return nil
}

// AddActivityCard sets the card to be displayed in the sidebar.
func (d *DashboardGrid) AddActivityCard(card *cards.Card) error {
	if card == nil {
		return ErrNilCard
	}
	if d.activityCard != nil {
		return ErrCardAlreadyExists
	}

	d.activityCard = card
	d.addToAllCards(card, PositionSidebar)
	return nil
}

// AddEndpointsCard sets the card to be displayed below the main grid.
func (d *DashboardGrid) AddEndpointsCard(card *cards.Card) error {
	if card == nil {
		return ErrNilCard
	}
	if d.endpointsCard != nil {
		return ErrCardAlreadyExists
	}

	d.endpointsCard = card
	d.addToAllCards(card, PositionEndpoints)
	return nil
}

// AddVersionCard sets the card to be displayed below the endpoints card.
func (d *DashboardGrid) AddVersionCard(card *cards.Card) error {
	if card == nil {
		return ErrNilCard
	}
	if d.versionCard != nil {
		return ErrCardAlreadyExists
	}

	d.versionCard = card
	d.addToAllCards(card, PositionVersion)
	return nil
}

// AddCenterPairCard adds a card to the center pair section (max 2 cards).
func (d *DashboardGrid) AddCenterPairCard(card *cards.Card) error {
	if card == nil {
		return ErrNilCard
	}
	if len(d.centerPairCards) >= 2 {
		return ErrMaxCardsExceeded
	}

	d.centerPairCards = append(d.centerPairCards, card)
	d.addToAllCards(card, PositionCenterPair)
	return nil
}

// AddSystemCard adds a card to the system section (max 4 cards).
func (d *DashboardGrid) AddSystemCard(card *cards.Card) error {
	if card == nil {
		return ErrNilCard
	}
	if len(d.systemCards) >= 4 {
		return ErrMaxCardsExceeded
	}

	d.systemCards = append(d.systemCards, card)
	d.addToAllCards(card, PositionSystem)
	return nil
}

// AddFooterCard adds a card to the footer section (max 2 cards).
func (d *DashboardGrid) AddFooterCard(card *cards.Card) error {
	if card == nil {
		return ErrNilCard
	}
	if len(d.footerCards) >= 2 {
		return ErrMaxCardsExceeded
	}

	d.footerCards = append(d.footerCards, card)
	d.addToAllCards(card, PositionFooter)
	return nil
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

// RenderGrid renders the complete dashboard layout.
func (d *DashboardGrid) RenderGrid() string {
	if len(d.allCards) == 0 {
		return ""
	}

	leftColumn := d.buildLeftColumn()
	rightColumn := d.buildRightColumn(lipgloss.Width(leftColumn))

	if rightColumn == "" {
		return leftColumn
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, leftColumn, rightColumn)
}

// buildLeftColumn constructs the left column of the layout.
func (d *DashboardGrid) buildLeftColumn() string {
	var parts []string

	if mainGrid := d.renderMainGrid(); mainGrid != "" {
		parts = append(parts, mainGrid)
	}

	mainGridWidth := 0
	if len(parts) > 0 {
		mainGridWidth = lipgloss.Width(parts[0])
	}

	if endpoints := d.renderSingleCard(d.endpointsCard, mainGridWidth, DefaultEndpointsHeight); endpoints != "" {
		parts = append(parts, endpoints)
	}

	if version := d.renderSingleCard(d.versionCard, mainGridWidth, DefaultVersionHeight); version != "" {
		parts = append(parts, version)
	}

	if len(parts) == 0 {
		return ""
	}

	return lipgloss.JoinVertical(lipgloss.Left, parts...)
}

// buildRightColumn constructs the right column (sidebar area) of the layout.
func (d *DashboardGrid) buildRightColumn(leftColumnWidth int) string {
	if d.activityCard == nil {
		return ""
	}

	mainContentWidth := max(d.TerminalWidth-leftColumnWidth-CardSpacing, 0)
	var parts []string

	// Main sidebar card
	if sidebar := d.renderSingleCard(d.activityCard, mainContentWidth+2, DefaultSidebarHeight); sidebar != "" {
		parts = append(parts, sidebar)
	}

	// Additional sidebar sections
	if centerPair := d.renderCenterPairCards(mainContentWidth); centerPair != "" {
		parts = append(parts, centerPair)
	}

	if system := d.renderSystemCards(mainContentWidth); system != "" {
		parts = append(parts, system)
	}

	if footer := d.renderFooterCards(mainContentWidth); footer != "" {
		parts = append(parts, footer)
	}

	if len(parts) == 0 {
		return ""
	}

	return lipgloss.JoinVertical(lipgloss.Left, parts...)
}

// Card rendering methods

// renderMainGrid renders the main grid in the top-left.
func (d *DashboardGrid) renderMainGrid() string {
	if len(d.mainGridCards) == 0 || d.Rows == 0 || d.Cols == 0 {
		return ""
	}

	var rows []string
	for r := range d.Rows {
		var rowCards []string
		for c := range d.Cols {
			cardIndex := r*d.Cols + c
			if cardIndex < len(d.mainGridCards) {
				rowCards = append(rowCards, d.mainGridCards[cardIndex].Render())
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
func (d *DashboardGrid) renderSingleCard(card *cards.Card, targetWidth, defaultHeight int) string {
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
func (d *DashboardGrid) renderCenterPairCards(sidebarWidth int) string {
	return d.renderHorizontalCardPair(d.centerPairCards, sidebarWidth, DefaultCenterPairHeight)
}

// renderFooterCards renders the footer cards section.
func (d *DashboardGrid) renderFooterCards(sidebarWidth int) string {
	if len(d.footerCards) == 0 {
		return ""
	}

	var renderedCards []string
	for i, card := range d.footerCards {
		cardWidth := d.calculateCardWidth(sidebarWidth, len(d.footerCards), i)

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
func (d *DashboardGrid) renderSystemCards(sidebarWidth int) string {
	if len(d.systemCards) == 0 {
		return ""
	}

	availableWidth := sidebarWidth - CardSpacing
	leftCardWidth := (availableWidth + 1) / 2
	rightCardWidth := availableWidth / 2

	var rows []string
	for row := 0; row < 3 && row*2 < len(d.systemCards); row++ {
		var rowCards []string
		for col := range 2 {
			cardIndex := row*2 + col
			if cardIndex >= len(d.systemCards) {
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

			d.systemCards[cardIndex].SetSize(cardWidth, cardHeight)
			rowCards = append(rowCards, d.systemCards[cardIndex].Render())
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
func (d *DashboardGrid) renderHorizontalCardPair(cardSlice []*cards.Card, totalWidth, cardHeight int) string {
	if len(cardSlice) == 0 {
		return ""
	}

	var renderedCards []string
	for i, card := range cardSlice {
		cardWidth := d.calculateCardWidth(totalWidth, len(cardSlice), i)
		card.SetSize(cardWidth, cardHeight)
		renderedCards = append(renderedCards, card.Render())
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, renderedCards...)
}

// calculateCardWidth calculates the width for a card in a horizontal layout.
func (d *DashboardGrid) calculateCardWidth(totalWidth, numCards, cardIndex int) int {
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
