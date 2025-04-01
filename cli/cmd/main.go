package main

import (
	"fmt"
	"log"

	"github.com/tom-draper/nginx-analytics/cli/internal/ui"
)

func main() {
	fmt.Println("Starting TUI app...")

	if err := ui.Run(); err != nil {
		log.Fatal(err)
	}
}

