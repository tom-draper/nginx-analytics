package config

import (
	"github.com/tom-draper/nginx-analytics/agent/internal/args"
	"github.com/tom-draper/nginx-analytics/agent/internal/env"
)

const (
	defaultPort             = "5000"
	defaultAccessPath       = "/var/log/nginx"
	defaultErrorPath        = "/var/log/nginx"
	defaultSystemMonitoring = false
	// Default log format for NGINX access logs, for reference
	defaultLogFormat = "$remote_addr - $remote_user [$time_local] \"$request\" $status $body_bytes_sent \"$http_referer\" \"$http_user_agent\""
)

type Config struct {
	Port             string
	AccessPath       string
	ErrorPath        string
	SystemMonitoring bool
	AuthToken        string
	LogFormat        string
}

var DefaultConfig = Config{
	Port:             defaultPort,
	AccessPath:       defaultAccessPath,
	ErrorPath:        defaultErrorPath,
	SystemMonitoring: defaultSystemMonitoring,
	AuthToken:        "",
	LogFormat:        defaultLogFormat,
}

func LoadConfig() Config {
	env := env.LoadEnv()
	args := args.Parse(args.Arguments(DefaultConfig))

	accessPath := resolveValue(args.AccessPath, env.AccessPath, defaultAccessPath)
	// If an access path provided, use as default error path
	_defaultErrorPath := defaultErrorPath
	if accessPath != defaultAccessPath {
		_defaultErrorPath = accessPath 
	}

	return Config{
		Port:             resolveValue(args.Port, env.Port, defaultPort),
		AccessPath:       accessPath,
		ErrorPath:        resolveValue(args.ErrorPath, env.ErrorPath, _defaultErrorPath),
		SystemMonitoring: resolveBool(args.SystemMonitoring, env.SystemMonitoring, defaultSystemMonitoring),
		AuthToken:        resolveValue(args.AuthToken, env.AuthToken, ""),
		LogFormat:        resolveValue(args.LogFormat, env.LogFormat, defaultLogFormat),
	}
}

func resolveValue(argVal, envVal, defaultVal string) string {
	if argVal != "" && argVal != defaultVal {
		return argVal
	}
	if envVal != "" && envVal != defaultVal {
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
