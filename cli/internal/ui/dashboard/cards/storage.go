package cards

import (
	"errors"
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	sys "github.com/tom-draper/nginx-analytics/agent/pkg/system"
	"github.com/tom-draper/nginx-analytics/cli/internal/ui/styles"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
)

// StorageCard shows storage usage with ASCII bar chart
type StorageCard struct {
	used  uint64
	total uint64
}

func NewStorageCard(sysInfo sys.SystemInfo) *StorageCard {
	card := &StorageCard{}
	card.UpdateSystem(sysInfo)
	return card
}

func (p *StorageCard) RenderContent(width, height int) string {
	lines := []string{}
	
	if p.total == 0 {
		// No data available
		lines = append(lines, strings.Repeat("░", width)) // Gray bar for no data
		rateStyle := lipgloss.NewStyle().
			Foreground(styles.LightGray)
		lines = append(lines, rateStyle.Render(centerText("No storage data", width)))
	} else {
		// Calculate usage percentage
		usagePercent := float64(p.used) / float64(p.total) * 100
		
		// Create horizontal bar - first row
		usedChars := min(int(float64(width) * usagePercent / 100), width)

		usedStyle := lipgloss.NewStyle().Foreground(styles.Green)
		freeStyle := lipgloss.NewStyle().Foreground(styles.DarkGray)
		
		// Green for used space, gray for free space
		// bar := "\033[32m" + strings.Repeat("█", usedChars) + "\033[0m" // Green used portion
		bar := usedStyle.Render(strings.Repeat("█", usedChars))
		bar += freeStyle.Render(strings.Repeat("█", width-usedChars))
		// bar += "\033[90m" + strings.Repeat("█", width-usedChars) + "\033[0m" // Gray free portion
		
		lines = append(lines, bar)
		
		// Storage info - second row (now centered)
		usedStr := formatBytes(p.used)
		totalStr := formatBytes(p.total)
		faintStyle := lipgloss.NewStyle().Foreground(styles.LightGray)
		usageText := fmt.Sprintf("%s / %s (%.1f%%)", usedStr, totalStr, usagePercent)
		usageInfo := faintStyle.Render(centerText(usageText, width))
		lines = append(lines, usageInfo)
	}

	// Fill to height
	for len(lines) < height {
		lines = append(lines, "")
	}

	return strings.Join(lines[:height], "\n")
}

func (p *StorageCard) UpdateSystem(sysInfo sys.SystemInfo) {
	disk, err := getPrimaryDisk(sysInfo.Disk)
	if err == nil {
		p.used = disk.Used
		p.total = disk.Size
	} else {
		logger.Log.Printf("Error getting primary disk: %v", err)
	}
}

func getPrimaryDisk(disks []sys.DiskInfo) (sys.DiskInfo, error) {
	for _, disk := range disks {
		if disk.MountedOn == "/" || disk.MountedOn == "/mnt/c" || disk.MountedOn == "/System/Volumes/Data" {
			return disk, nil
		}
	}
	return sys.DiskInfo{}, errors.New("failed to find primary disk")
}

// Helper function to center text
func centerText(text string, width int) string {
	if len(text) >= width {
		return text
	}
	padding := (width - len(text)) / 2
	return strings.Repeat(" ", padding) + text
}

// Helper function to format bytes in human readable format
func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := uint64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}