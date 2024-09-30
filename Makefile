# Makefile to manage the React web application

# Install dependencies
install:
	npm install

# Run the web application
run:
	npm start

# Add a default target to show help
.PHONY: install run help

help:
	@echo "Available commands:"
	@echo "  make install  - Installs any dependencies required for the project."
	@echo "  make run      - Runs the web application locally on http://localhost:3000."
