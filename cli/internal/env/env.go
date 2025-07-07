package env

import (
	"os"

	"github.com/joho/godotenv"
	"github.com/tom-draper/nginx-analytics/cli/internal/logger"
)

type Env struct {
	ServerURL        string
	AccessPath       string
	ErrorPath        string
	SystemMonitoring bool
	AuthToken        string
	LogFormat        string
}

func LoadEnv() Env {
	// Load .env file if present
	if err := godotenv.Load(); err != nil {
		logger.Log.Println("No .env file found, using system environment variables")
	}

	return Env{
		ServerURL:        os.Getenv("NGINX_ANALYTICS_SERVER_URL"),
		AccessPath:       os.Getenv("NGINX_ANALYTICS_ACCESS_PATH"),
		ErrorPath:        os.Getenv("NGINX_ANALYTICS_ERROR_PATH"),
		SystemMonitoring: os.Getenv("NGINX_ANALYTICS_SYSTEM_MONITORING") == "true",
		AuthToken:        os.Getenv("NGINX_ANALYTICS_AUTH_TOKEN"),
		LogFormat:        os.Getenv("NGINX_ANALYTICS_LOG_FORMAT"),
	}
}
