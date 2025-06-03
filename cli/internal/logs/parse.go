package logs

import (
	"regexp"
	"strconv"
	"strings"
	"time"
	n "github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
)

// ParseNginxLogs parses nginx access log entries
func ParseNginxLogs(logs []string) []n.NGINXLog {
	// Regex pattern for common nginx access log format
	regex := regexp.MustCompile(`^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+) "([^"]+)" "([^"]+)"`)

	var data []n.NGINXLog

	for _, row := range logs {
		matches := regex.FindStringSubmatch(row)

		if len(matches) >= 10 {
			logData := n.NGINXLog{
				IPAddress:    matches[1],
				Timestamp:    parseDate(matches[2]),
				Method:       matches[3],
				Path:         matches[4],
				HTTPVersion:  matches[5],
				Status:       parseIntPtr(matches[6]),
				ResponseSize: parseIntPtr(matches[7]),
				Referrer:     matches[8],
				UserAgent:    matches[9],
			}
			data = append(data, logData)
		}
	}

	return data
}

// parseDate parses nginx timestamp format
func parseDate(dateStr string) *time.Time {
	if dateStr == "" {
		return nil
	}

	// Replace first colon with space and capitalize month abbreviation
	dateStr = regexp.MustCompile(`^([^:]+):`).ReplaceAllString(dateStr, "$1 ")

	// Capitalize month abbreviation
	monthRegex := regexp.MustCompile(`([A-Za-z]{3})`)
	dateStr = monthRegex.ReplaceAllStringFunc(dateStr, func(match string) string {
		return strings.ToUpper(match[:1]) + strings.ToLower(match[1:])
	})

	// Parse the date
	layouts := []string{
		"02/Jan/2006 15:04:05 -0700",
		"02/Jan/2006:15:04:05 -0700",
		time.RFC3339,
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, dateStr); err == nil {
			return &t
		}
	}

	return nil
}

// parseIntPtr safely parses string to int pointer
func parseIntPtr(s string) *int {
	if s == "" {
		return nil
	}
	if val, err := strconv.Atoi(s); err == nil {
		return &val
	}
	return nil
}

// ParseNginxErrors parses nginx error log entries
func ParseNginxErrors(logLines []string) []n.NGINXError {
	var errors []n.NGINXError

	// Compile regex patterns once
	timestampPattern := regexp.MustCompile(`^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})`)
	levelPattern := regexp.MustCompile(`\[(debug|info|notice|warn|error|crit|alert|emerg)\]`)
	pidPattern := regexp.MustCompile(`(\d+)#(\d+)`)
	cidPattern := regexp.MustCompile(`\*(\d+)`)
	clientPattern := regexp.MustCompile(`client: (\d+\.\d+\.\d+\.\d+)`)
	serverPattern := regexp.MustCompile(`server: (\S+)`)
	requestPattern := regexp.MustCompile(`request: "([^"]+)"`)
	referrerPattern := regexp.MustCompile(`referrer: "([^"]+)"`)
	hostPattern := regexp.MustCompile(`host: "([^"]+)"`)

	for _, line := range logLines {
		line = strings.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		errorEntry := n.NGINXError{}

		// Extract timestamp
		if timestampMatch := timestampPattern.FindStringSubmatch(line); len(timestampMatch) > 1 {
			if t, err := time.Parse("2006/01/02 15:04:05", timestampMatch[1]); err == nil {
				errorEntry.Timestamp = t
			} else {
				errorEntry.Timestamp = time.Now()
			}
		} else {
			errorEntry.Timestamp = time.Now()
		}

		// Extract log level
		if levelMatch := levelPattern.FindStringSubmatch(line); len(levelMatch) > 1 {
			errorEntry.Level = strings.ToLower(levelMatch[1])
		} else {
			errorEntry.Level = "unknown"
		}

		// Extract PID and TID
		if pidMatch := pidPattern.FindStringSubmatch(line); len(pidMatch) > 2 {
			if pid, err := strconv.Atoi(pidMatch[1]); err == nil {
				errorEntry.PID = pid
			}
			errorEntry.TID = pidMatch[2]
		} else {
			errorEntry.PID = 0
			errorEntry.TID = "0"
		}

		// Extract connection ID
		if cidMatch := cidPattern.FindStringSubmatch(line); len(cidMatch) > 1 {
			errorEntry.CID = cidMatch[1]
		} else {
			errorEntry.CID = "0"
		}

		// Extract optional fields
		if clientMatch := clientPattern.FindStringSubmatch(line); len(clientMatch) > 1 {
			errorEntry.ClientAddress = &clientMatch[1]
		}

		if serverMatch := serverPattern.FindStringSubmatch(line); len(serverMatch) > 1 {
			errorEntry.ServerAddress = &serverMatch[1]
		}

		if requestMatch := requestPattern.FindStringSubmatch(line); len(requestMatch) > 1 {
			errorEntry.Request = &requestMatch[1]
		}

		if referrerMatch := referrerPattern.FindStringSubmatch(line); len(referrerMatch) > 1 {
			errorEntry.Referrer = &referrerMatch[1]
		}

		if hostMatch := hostPattern.FindStringSubmatch(line); len(hostMatch) > 1 {
			errorEntry.Host = &hostMatch[1]
		}

		// Extract message
		errorEntry.Message = extractMessage(line, errorEntry.CID, errorEntry.Level, errorEntry.PID, errorEntry.TID)

		errors = append(errors, errorEntry)
	}

	return errors
}

// extractMessage extracts the main message from the log line
func extractMessage(line, cid, level string, pid int, tid string) string {
	// Try to extract message after CID
	if cid != "0" {
		cidPattern := "*" + cid
		if cidIndex := strings.Index(line, cidPattern); cidIndex != -1 {
			message := line[cidIndex+len(cidPattern):]
			return strings.TrimSpace(message)
		}
	}

	// Fallback: try to extract message after level and PID
	levelPattern := "[" + level + "]"
	pidPattern := strconv.Itoa(pid) + "#"

	levelIndex := strings.Index(line, levelPattern)
	pidIndex := strings.Index(line, pidPattern)

	if levelIndex != -1 && pidIndex != -1 {
		startIndex := pidIndex + len(pidPattern) + len(tid) + 1
		if startIndex < len(line) {
			return strings.TrimSpace(line[startIndex:])
		}
	}

	return line
}
