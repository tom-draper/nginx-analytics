package cards

import "strings"

// PlaceholderCard shows a simple placeholder
type DeviceCard struct {
	message string
}

func NewDeviceCard(message string) *DeviceCard {
	return &DeviceCard{message: message}
}

func (p *DeviceCard) RenderContent(width, height int) string {
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
