package args

import (
	"flag"
	"fmt"
)

type Arguments struct {
	Port             string
	AccessPath       string
	ErrorPath        string
	SystemMonitoring bool
	AuthToken        string
}

func Parse(defaults Arguments) Arguments {
	// Define command-line flags
	cmdAuthToken := flag.String("auth-token", "", "Authentication token (recommended)")
	cmdPort := flag.String("port", defaults.Port, fmt.Sprintf("Port to run the server on (default %s)", defaults.Port))
	cmdAccessPath := flag.String("nginx-access-path", "", "Path to the Nginx access log file or parent directory")
	cmdErrorPath := flag.String("nginx-error-path", "", "Path to the Nginx error log file or parent directory")
	cmdSystemMonitoring := flag.Bool("system-monitoring", defaults.SystemMonitoring, fmt.Sprintf("System resource monitoring toggle (default %t)", defaults.SystemMonitoring))
	flag.Parse()

	return Arguments{
		Port:             *cmdPort,
		AuthToken:        *cmdAuthToken,
		AccessPath:       *cmdAccessPath,
		ErrorPath:        *cmdErrorPath,
		SystemMonitoring: *cmdSystemMonitoring,
	}
}
