package cards

import (
	"fmt"
	"strings"
	"testing"

	"github.com/tom-draper/nginx-analytics/tui/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/tui/internal/logs/period"
)

func TestEndpointsCardScrollsSelectionBeyondVisibleHeight(t *testing.T) {
	logs := make([]nginx.NGINXLog, 0, 12)
	for i := 0; i < 12; i++ {
		status := 200
		logs = append(logs, nginx.NGINXLog{
			Method: "GET",
			Path:   fmt.Sprintf("/endpoint-%02d", i),
			Status: &status,
		})
	}

	card := NewEndpointsCard(logs, period.Period30Days)
	card.EnterSelectMode()

	for range 7 {
		card.SelectDown()
	}

	rendered := card.RenderContent(40, 5)

	if !strings.Contains(rendered, "/endpoint-07") {
		t.Fatalf("expected selected endpoint to be visible after scrolling, got:\n%s", rendered)
	}
	if strings.Contains(rendered, "/endpoint-00") {
		t.Fatalf("expected initial endpoint to scroll out of view, got:\n%s", rendered)
	}
	if card.scrollOffset == 0 {
		t.Fatalf("expected scroll offset to advance, got %d", card.scrollOffset)
	}
}

func TestEndpointsCardDoesNotTruncateAllEndpointsForSelection(t *testing.T) {
	logs := make([]nginx.NGINXLog, 0, 60)
	for i := 0; i < 60; i++ {
		status := 200
		logs = append(logs, nginx.NGINXLog{
			Method: "GET",
			Path:   fmt.Sprintf("/endpoint-%02d", i),
			Status: &status,
		})
	}

	card := NewEndpointsCard(logs, period.Period30Days)
	card.EnterSelectMode()

	for range 59 {
		card.SelectDown()
	}

	selected := card.GetSelectedEndpoint()
	if selected == nil {
		t.Fatal("expected a selected endpoint at the end of the list")
	}
	if selected.Path != "/endpoint-59" {
		t.Fatalf("expected last endpoint to be selectable, got %q", selected.Path)
	}
}
