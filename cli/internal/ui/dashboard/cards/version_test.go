package cards

import (
	"testing"
	"time"

	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
)

// TestVersionCard_SelectMode tests entering and exiting select mode
func TestVersionCard_SelectMode(t *testing.T) {
	card := NewVersionCard(nil, period.Period{})

	// Initially not in select mode
	if card.IsInSelectMode() {
		t.Error("Card should not be in select mode initially")
	}

	// Enter select mode
	card.EnterSelectMode()
	if !card.IsInSelectMode() {
		t.Error("Card should be in select mode after EnterSelectMode()")
	}

	// Selected index should be 0
	if card.selectedIndex != 0 {
		t.Errorf("Selected index should be 0, got %d", card.selectedIndex)
	}

	// Exit select mode
	card.ExitSelectMode()
	if card.IsInSelectMode() {
		t.Error("Card should not be in select mode after ExitSelectMode()")
	}
}

// TestVersionCard_Navigation tests navigation within the card
func TestVersionCard_Navigation(t *testing.T) {
	// Create test data with multiple versions
	now := time.Now()
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v1/posts", Timestamp: &now},
		{Path: "/api/v2/items", Timestamp: &now},
		{Path: "/api/v3/products", Timestamp: &now},
	}

	card := NewVersionCard(logs, period.Period{})
	card.EnterSelectMode()

	// Initial position should be 0
	if card.selectedIndex != 0 {
		t.Errorf("Initial selectedIndex should be 0, got %d", card.selectedIndex)
	}

	// Navigate down
	card.SelectDown()
	if card.selectedIndex != 1 {
		t.Errorf("After SelectDown(), selectedIndex should be 1, got %d", card.selectedIndex)
	}

	// Navigate down again
	card.SelectDown()
	if card.selectedIndex != 2 {
		t.Errorf("After second SelectDown(), selectedIndex should be 2, got %d", card.selectedIndex)
	}

	// Navigate up
	card.SelectUp()
	if card.selectedIndex != 1 {
		t.Errorf("After SelectUp(), selectedIndex should be 1, got %d", card.selectedIndex)
	}

	// Navigate up to 0
	card.SelectUp()
	if card.selectedIndex != 0 {
		t.Errorf("After second SelectUp(), selectedIndex should be 0, got %d", card.selectedIndex)
	}

	// Try to navigate up beyond 0 (should stay at 0)
	card.SelectUp()
	if card.selectedIndex != 0 {
		t.Errorf("SelectUp() at index 0 should stay at 0, got %d", card.selectedIndex)
	}

	// Navigate to last item
	maxIndex := min(len(card.versions), maxVersions) - 1
	for i := 0; i < maxIndex; i++ {
		card.SelectDown()
	}
	if card.selectedIndex != maxIndex {
		t.Errorf("After navigating to end, selectedIndex should be %d, got %d", maxIndex, card.selectedIndex)
	}

	// Try to navigate down beyond max (should stay at max)
	card.SelectDown()
	if card.selectedIndex != maxIndex {
		t.Errorf("SelectDown() at max index should stay at max, got %d", card.selectedIndex)
	}
}

// TestVersionCard_LeftRightNavigation tests that left/right are no-ops
func TestVersionCard_LeftRightNavigation(t *testing.T) {
	now := time.Now()
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v2/posts", Timestamp: &now},
	}

	card := NewVersionCard(logs, period.Period{})
	card.EnterSelectMode()

	initialIndex := card.selectedIndex

	// Left and right should be no-ops
	card.SelectLeft()
	if card.selectedIndex != initialIndex {
		t.Error("SelectLeft() should be a no-op for VersionCard")
	}

	card.SelectRight()
	if card.selectedIndex != initialIndex {
		t.Error("SelectRight() should be a no-op for VersionCard")
	}
}

// TestVersionCard_HasSelection tests the HasSelection method
func TestVersionCard_HasSelection(t *testing.T) {
	now := time.Now()
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v2/posts", Timestamp: &now},
	}

	card := NewVersionCard(logs, period.Period{})

	// No selection when not in select mode
	if card.HasSelection() {
		t.Error("HasSelection() should return false when not in select mode")
	}

	// Has selection when in select mode
	card.EnterSelectMode()
	if !card.HasSelection() {
		t.Error("HasSelection() should return true when in select mode")
	}

	// No selection after exiting select mode
	card.ExitSelectMode()
	if card.HasSelection() {
		t.Error("HasSelection() should return false after exiting select mode")
	}
}

// TestVersionCard_GetSelectedVersion tests retrieving the selected version
func TestVersionCard_GetSelectedVersion(t *testing.T) {
	now := time.Now()
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v1/posts", Timestamp: &now},
		{Path: "/api/v1/items", Timestamp: &now},
		{Path: "/api/v2/products", Timestamp: &now},
		{Path: "/api/v3/orders", Timestamp: &now},
	}

	card := NewVersionCard(logs, period.Period{})

	// No selection when not in select mode
	filter := card.GetSelectedVersion()
	if filter != nil {
		t.Error("GetSelectedVersion() should return nil when not in select mode")
	}

	// Enter select mode and check first selection (should be v1 with count 3)
	card.EnterSelectMode()
	filter = card.GetSelectedVersion()
	if filter == nil {
		t.Fatal("GetSelectedVersion() should not return nil when in select mode")
	}
	if filter.Version != "v1" {
		t.Errorf("First selected version should be v1, got %s", filter.Version)
	}

	// Navigate down and check second selection (should be v2 with count 1)
	card.SelectDown()
	filter = card.GetSelectedVersion()
	if filter == nil {
		t.Fatal("GetSelectedVersion() should not return nil after navigation")
	}
	if filter.Version != "v2" {
		t.Errorf("Second selected version should be v2, got %s", filter.Version)
	}

	// Navigate down and check third selection (should be v3 with count 1)
	card.SelectDown()
	filter = card.GetSelectedVersion()
	if filter == nil {
		t.Fatal("GetSelectedVersion() should not return nil after second navigation")
	}
	if filter.Version != "v3" {
		t.Errorf("Third selected version should be v3, got %s", filter.Version)
	}
}

// TestVersionCard_ClearSelection tests clearing the selection
func TestVersionCard_ClearSelection(t *testing.T) {
	now := time.Now()
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v2/posts", Timestamp: &now},
	}

	card := NewVersionCard(logs, period.Period{})
	card.EnterSelectMode()
	card.SelectDown()

	// Should be in select mode with index 1
	if !card.IsInSelectMode() || card.selectedIndex != 1 {
		t.Fatal("Setup failed: card should be in select mode with index 1")
	}

	// Clear selection
	card.ClearSelection()

	// Should not be in select mode and index should be 0
	if card.IsInSelectMode() {
		t.Error("ClearSelection() should exit select mode")
	}
	if card.selectedIndex != 0 {
		t.Errorf("ClearSelection() should reset selectedIndex to 0, got %d", card.selectedIndex)
	}
}

// TestVersionCard_EmptyData tests behavior with no versions
func TestVersionCard_EmptyData(t *testing.T) {
	card := NewVersionCard(nil, period.Period{})

	// Should not crash with empty data
	card.EnterSelectMode()

	// Should have no selection with empty data
	if card.HasSelection() {
		t.Error("HasSelection() should return false with empty data")
	}

	filter := card.GetSelectedVersion()
	if filter != nil {
		t.Error("GetSelectedVersion() should return nil with empty data")
	}

	// Required height should be minimum
	height := card.GetRequiredHeight(100)
	if height != 3 {
		t.Errorf("GetRequiredHeight() with empty data should be 3, got %d", height)
	}
}

// TestVersionCard_GetVersions tests version counting
func TestVersionCard_GetVersions(t *testing.T) {
	now := time.Now()
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v1/posts", Timestamp: &now},
		{Path: "/api/v2/items", Timestamp: &now},
		{Path: "/api/v1/orders", Timestamp: &now},
		{Path: "/users", Timestamp: &now}, // No version
	}

	card := NewVersionCard(logs, period.Period{})

	// Should have counted versions correctly
	if len(card.versions) != 2 {
		t.Errorf("Should have 2 unique versions, got %d", len(card.versions))
	}

	if card.versions["v1"] != 3 {
		t.Errorf("v1 should have count 3, got %d", card.versions["v1"])
	}

	if card.versions["v2"] != 1 {
		t.Errorf("v2 should have count 1, got %d", card.versions["v2"])
	}
}

// TestVersionCard_GetRequiredHeight tests height calculation
func TestVersionCard_GetRequiredHeight(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name         string
		versionCount int
		expectedMin  int
		expectedMax  int
	}{
		{"No versions", 0, 3, 3},
		{"One version", 1, 1, 1},
		{"Five versions", 5, 5, 5},
		{"Max versions", maxVersions, maxVersions, maxVersions},
		{"Over max", maxVersions + 10, maxVersions, maxVersions},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var logs []nginx.NGINXLog
			for i := 0; i < tt.versionCount; i++ {
				path := "/api/v" + string(rune('0'+i%10)) + "/users"
				logs = append(logs, nginx.NGINXLog{Path: path, Timestamp: &now})
			}

			card := NewVersionCard(logs, period.Period{})
			height := card.GetRequiredHeight(100)

			if height < tt.expectedMin || height > tt.expectedMax {
				t.Errorf("GetRequiredHeight() = %d, expected between %d and %d", height, tt.expectedMin, tt.expectedMax)
			}
		})
	}
}

// TestVersionCard_UpdateCalculated tests updating the card with new data
func TestVersionCard_UpdateCalculated(t *testing.T) {
	now := time.Now()
	initialLogs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
	}

	card := NewVersionCard(initialLogs, period.Period{})

	// Initial state
	if len(card.versions) != 1 {
		t.Fatalf("Initial versions count should be 1, got %d", len(card.versions))
	}

	// Update with new logs
	newLogs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v2/posts", Timestamp: &now},
		{Path: "/api/v3/items", Timestamp: &now},
	}

	card.UpdateCalculated(newLogs, period.Period{})

	// Should have new version counts
	if len(card.versions) != 3 {
		t.Errorf("After update, versions count should be 3, got %d", len(card.versions))
	}

	if card.versions["v1"] != 1 {
		t.Errorf("v1 count should be 1, got %d", card.versions["v1"])
	}

	if card.versions["v2"] != 1 {
		t.Errorf("v2 count should be 1, got %d", card.versions["v2"])
	}

	if card.versions["v3"] != 1 {
		t.Errorf("v3 count should be 1, got %d", card.versions["v3"])
	}
}

// TestVersionCard_RenderContent tests basic rendering (doesn't crash)
func TestVersionCard_RenderContent(t *testing.T) {
	now := time.Now()
	logs := []nginx.NGINXLog{
		{Path: "/api/v1/users", Timestamp: &now},
		{Path: "/api/v2/posts", Timestamp: &now},
	}

	card := NewVersionCard(logs, period.Period{})

	// Should not crash when rendering
	content := card.RenderContent(50, 10)
	if content == "" {
		t.Error("RenderContent() should return non-empty content")
	}

	// Render with selection
	card.EnterSelectMode()
	selectedContent := card.RenderContent(50, 10)
	if selectedContent == "" {
		t.Error("RenderContent() with selection should return non-empty content")
	}

	// Content with and without selection should be different
	if content == selectedContent {
		t.Error("Content should differ when in select mode")
	}
}
