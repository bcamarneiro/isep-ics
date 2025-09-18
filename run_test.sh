#!/bin/bash

# ISEP ICS Bridge - E2E Test Runner
# This script runs the end-to-end test for the ISEP ICS Bridge service

set -e

echo "🚀 Starting ISEP ICS Bridge E2E Test"
echo "=================================="

# Check if docker-compose is running
if ! docker compose ps | grep -q "isep-ics.*running"; then
    echo "❌ Service is not running. Starting it now..."
    docker compose up -d --build
    echo "⏳ Waiting for service to start..."
    sleep 10
else
    echo "✅ Service is already running"
fi

# Install test dependencies
echo "📦 Installing test dependencies..."
pip install -r test_requirements.txt

# Run the test
echo "🧪 Running E2E test..."
python test_e2e.py

echo "✅ Test completed!"
