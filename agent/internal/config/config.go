package config

import (
	"log"

	"github.com/tom-draper/nginx-analytics/agent/internal/args"
	"github.com/tom-draper/nginx-analytics/agent/internal/env"
)

const (
	defaultPort             = "5000"
	defaultAccessPath       = "/var/log/nginx"
	defaultErrorPath        = "/var/log/nginx"
	defaultSystemMonitoring = false
)

type Config struct {
	Port             string
	AccessPath       string
	ErrorPath        string
	SystemMonitoring bool
	AuthToken        string
}

var DefaultConfig = Config{
	Port:             defaultPort,
	AccessPath:       defaultAccessPath,
	ErrorPath:        defaultErrorPath,
	SystemMonitoring: defaultSystemMonitoring,
	AuthToken:        "",
}

func LoadConfig() Config {
	env := env.LoadEnv()
	args := args.Parse(args.Arguments(DefaultConfig))

	final := Config{
		Port:             resolveValue(args.Port, env.Port, defaultPort),
		AccessPath:       resolveValue(args.AccessPath, env.AccessPath, defaultAccessPath),
		ErrorPath:        resolveValue(args.ErrorPath, env.ErrorPath, defaultErrorPath),
		SystemMonitoring: resolveBool(args.SystemMonitoring, env.SystemMonitoring, defaultSystemMonitoring),
		AuthToken:        resolveValue(args.AuthToken, env.AuthToken, ""),
	}

	logConfig(final)
	return final
}

func resolveValue(argVal, envVal, defaultVal string) string {
	if argVal != "" {
		return argVal
	}
	if envVal != "" {
		return envVal
	}
	return defaultVal
}

func resolveBool(argVal, envVal, defaultVal bool) bool {
	if argVal {
		return true
	}
	if envVal {
		return true
	}
	return defaultVal
}

func logConfig(cfg Config) {
	if cfg.AuthToken == "" {
		log.Println("Auth token not set in environment or command line argument. Access may be insecure.")
	}
	log.Println("Using Nginx access log path:", cfg.AccessPath)
	log.Println("Using Nginx error log path:", cfg.ErrorPath)

	if cfg.SystemMonitoring {
		log.Println("System monitoring enabled")
	} else {
		log.Println("System monitoring disabled")
	}
}
