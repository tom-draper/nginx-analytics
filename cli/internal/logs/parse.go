package logs

import (
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/tom-draper/nginx-analytics/cli/internal/logs/nginx"
)

// ---------------------------------------------------------------------------
// Default compiled regex (handles standard combined + NPM vcombined prefix)
// ---------------------------------------------------------------------------

var (
	nginxLogRegex    = regexp.MustCompile(`^(?:\S+ )?(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+) "([^"]*)" "([^"]*)"`)
	dateColonRegex   = regexp.MustCompile(`^([^:]+):`)
	monthRegex       = regexp.MustCompile(`([A-Za-z]{3})`)
	timestampPattern = regexp.MustCompile(`^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})`)
	levelPattern     = regexp.MustCompile(`\[(debug|info|notice|warn|error|crit|alert|emerg)\]`)
	pidPattern       = regexp.MustCompile(`(\d+)#(\d+)`)
	cidPattern       = regexp.MustCompile(`\*(\d+)`)
	clientPattern    = regexp.MustCompile(`client: (\d+\.\d+\.\d+\.\d+)`)
	serverPattern    = regexp.MustCompile(`server: (\S+)`)
	requestPattern   = regexp.MustCompile(`request: "([^"]+)"`)
	referrerPattern  = regexp.MustCompile(`referrer: "([^"]+)"`)
	hostPattern      = regexp.MustCompile(`host: "([^"]+)"`)
)

type fieldMapping struct {
	IPAddress    int
	Timestamp    int
	Method       int
	Path         int
	HTTPVersion  int
	Status       int
	ResponseSize int
	Referrer     int
	UserAgent    int
}

var defaultFieldMapping = fieldMapping{
	IPAddress: 1, Timestamp: 2, Method: 3, Path: 4,
	HTTPVersion: 5, Status: 6, ResponseSize: 7, Referrer: 8, UserAgent: 9,
}

type compiledFormat struct {
	regex  *regexp.Regexp
	fields fieldMapping
}

var defaultCompiled = &compiledFormat{regex: nginxLogRegex, fields: defaultFieldMapping}

// ---------------------------------------------------------------------------
// Log format → regex conversion
// ---------------------------------------------------------------------------

type varInfo struct {
	pattern string
	// fieldIndices maps each capture group offset (0-based within this variable)
	// to the corresponding fieldMapping field pointer index (see setField below).
	fieldIndices []int
}

const (
	fIPAddress    = iota // 0
	fTimestamp           // 1
	fMethod              // 2
	fPath                // 3
	fHTTPVersion         // 4
	fStatus              // 5
	fResponseSize        // 6
	fReferrer            // 7
	fUserAgent           // 8
)

var capturedVars = map[string]varInfo{
	"remote_addr":      {`(\S+)`, []int{fIPAddress}},
	"time_local":       {`([^\]]+)`, []int{fTimestamp}},
	"time_iso8601":     {`(\S+)`, []int{fTimestamp}},
	"request":          {`(\S+) (\S+) (\S+)`, []int{fMethod, fPath, fHTTPVersion}},
	"request_method":   {`(\S+)`, []int{fMethod}},
	"request_uri":      {`(\S+)`, []int{fPath}},
	"uri":              {`(\S+)`, []int{fPath}},
	"server_protocol":  {`(\S+)`, []int{fHTTPVersion}},
	"status":           {`(\d{3})`, []int{fStatus}},
	"body_bytes_sent":  {`(\d+)`, []int{fResponseSize}},
	"bytes_sent":       {`(\d+)`, []int{fResponseSize}},
	"http_referer":     {`([^"]*)`, []int{fReferrer}},
	"http_user_agent":  {`([^"]*)`, []int{fUserAgent}},
}

var uncapturedVars = map[string]string{
	"remote_user":            `\S+`,
	"host":                   `\S+`,
	"server_name":            `\S+`,
	"server_port":            `\d+`,
	"scheme":                 `\S+`,
	"upstream_addr":          `\S+`,
	"upstream_cache_status":  `\S+`,
	"upstream_status":        `\d+`,
	"request_time":           `[\d.]+`,
	"upstream_response_time": `[\d.-]+`,
	"upstream_connect_time":  `[\d.-]+`,
	"upstream_header_time":   `[\d.-]+`,
	"gzip_ratio":             `[\d.]+`,
	"connection":             `\d+`,
	"connection_requests":    `\d+`,
	"pipe":                   `\S+`,
	"http_x_forwarded_for":   `[^"]*`,
	"http_cookie":            `[^"]*`,
	"msec":                   `[\d.]+`,
	"request_length":         `\d+`,
	"ssl_protocol":           `\S+`,
	"ssl_cipher":             `\S+`,
}

func setField(fm *fieldMapping, fieldConst int, groupIdx int) {
	switch fieldConst {
	case fIPAddress:
		fm.IPAddress = groupIdx
	case fTimestamp:
		fm.Timestamp = groupIdx
	case fMethod:
		fm.Method = groupIdx
	case fPath:
		fm.Path = groupIdx
	case fHTTPVersion:
		fm.HTTPVersion = groupIdx
	case fStatus:
		fm.Status = groupIdx
	case fResponseSize:
		fm.ResponseSize = groupIdx
	case fReferrer:
		fm.Referrer = groupIdx
	case fUserAgent:
		fm.UserAgent = groupIdx
	}
}

func isWordChar(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
		(c >= '0' && c <= '9') || c == '_'
}

func buildLogRegex(format string) (*compiledFormat, error) {
	var sb strings.Builder
	sb.WriteString("^")
	groupIndex := 0
	var fields fieldMapping

	i := 0
	for i < len(format) {
		if format[i] == '$' {
			j := i + 1
			for j < len(format) && isWordChar(format[j]) {
				j++
			}
			varName := format[i+1 : j]

			if info, ok := capturedVars[varName]; ok {
				for idx, f := range info.fieldIndices {
					setField(&fields, f, groupIndex+1+idx)
				}
				groupIndex += len(info.fieldIndices)
				sb.WriteString(info.pattern)
			} else if pat, ok := uncapturedVars[varName]; ok {
				sb.WriteString(pat)
			} else {
				sb.WriteString(`\S+`)
			}
			i = j
		} else {
			sb.WriteString(regexp.QuoteMeta(string(format[i])))
			i++
		}
	}

	re, err := regexp.Compile(sb.String())
	if err != nil {
		return nil, err
	}
	return &compiledFormat{regex: re, fields: fields}, nil
}

// Simple cache: one slot (the format never changes at runtime)
var (
	cachedFormatStr string
	cachedFormat    *compiledFormat
	cacheMu         sync.Mutex
)

func getCompiledFormat(logFormat string) *compiledFormat {
	if logFormat == "" {
		return defaultCompiled
	}
	cacheMu.Lock()
	defer cacheMu.Unlock()
	if logFormat == cachedFormatStr && cachedFormat != nil {
		return cachedFormat
	}
	cf, err := buildLogRegex(logFormat)
	if err != nil {
		return defaultCompiled
	}
	cachedFormatStr = logFormat
	cachedFormat = cf
	return cf
}

// ---------------------------------------------------------------------------
// Access log parsing
// ---------------------------------------------------------------------------

func ParseNginxLogs(logs []string, logFormat string) []nginx.NGINXLog {
	cf := getCompiledFormat(logFormat)
	var data []nginx.NGINXLog

	get := func(matches []string, idx int) string {
		if idx > 0 && idx < len(matches) {
			return matches[idx]
		}
		return ""
	}

	for _, row := range logs {
		matches := cf.regex.FindStringSubmatch(row)
		if len(matches) == 0 {
			continue
		}

		logData := nginx.NGINXLog{
			IPAddress:    get(matches, cf.fields.IPAddress),
			Timestamp:    parseDate(get(matches, cf.fields.Timestamp)),
			Method:       get(matches, cf.fields.Method),
			Path:         get(matches, cf.fields.Path),
			HTTPVersion:  get(matches, cf.fields.HTTPVersion),
			Status:       parseIntPtr(get(matches, cf.fields.Status)),
			ResponseSize: parseIntPtr(get(matches, cf.fields.ResponseSize)),
			Referrer:     get(matches, cf.fields.Referrer),
			UserAgent:    get(matches, cf.fields.UserAgent),
		}

		if logData.IPAddress != "" {
			data = append(data, logData)
		}
	}

	return data
}

func parseDate(dateStr string) *time.Time {
	if dateStr == "" {
		return nil
	}

	// Replace first colon with space and capitalize month abbreviation
	dateStr = dateColonRegex.ReplaceAllString(dateStr, "$1 ")

	// Capitalize month abbreviation
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

func parseIntPtr(s string) *int {
	if s == "" {
		return nil
	}
	if val, err := strconv.Atoi(s); err == nil {
		return &val
	}
	return nil
}

// ---------------------------------------------------------------------------
// Error log parsing
// ---------------------------------------------------------------------------

func ParseNginxErrors(logLines []string) []nginx.NGINXError {
	var errors []nginx.NGINXError

	for _, line := range logLines {
		line = strings.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		errorEntry := nginx.NGINXError{}

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
