package logger

import (
	"log"
	"os"
)

var Log *log.Logger

func init() {
	f, err := os.OpenFile("debug.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("Failed to open log file: %v", err)
	}
	Log = log.New(f, "DEBUG: ", log.Ldate|log.Ltime|log.Lshortfile)
}
