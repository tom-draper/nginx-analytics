package cards

import "strings"
// VersionCard shows a simple placeholder
type VersionCard struct {
	message string
}

func NewVersionCard(message string) *VersionCard {
	return &VersionCard{message: message}
}

func (p *VersionCard) RenderContent(width, height int) string {
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

