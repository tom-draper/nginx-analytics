package cards

import (
	"strings"

	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/period"
	"github.com/tom-draper/nginx-analytics/cli/internal/logs/version"
)

type VersionCard struct {
	detector version.InlineVersionDetector
	versions map[string]int
}

func NewVersionCard() *VersionCard {
	return &VersionCard{detector: *version.NewInlineVersionDetector()}
}

func (p *VersionCard) RenderContent(width, height int) string {
	lines := []string{
		"",
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

func (c *VersionCard) UpdateCalculated(logs []nginx.NGINXLog, period period.Period) {
	c.versions = c.getVersions(logs)
}

func (c *VersionCard) getVersions(logs []nginx.NGINXLog) map[string]int {
	versions := make(map[string]int)
	for _, log := range logs {
		v := c.detector.GetVersion(log.Path)
		if v != "" {
			versions[v]++
		}
	}
	return versions
}
