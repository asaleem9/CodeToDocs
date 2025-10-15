#!/bin/bash

# Test script for GitHub webhook with real user lookup
# Uses 'torvalds' (Linus Torvalds) as a test user - GitHub user ID: 1024025

API_URL="http://localhost:3001/api/webhook/github"

# Sample GitHub PR merged webhook payload using a real GitHub user
PAYLOAD='{
  "action": "closed",
  "pull_request": {
    "number": 456,
    "title": "Test PR for webhook user ID lookup",
    "merged": true,
    "merged_at": "2025-01-15T12:00:00Z",
    "user": {
      "login": "contributor123"
    },
    "head": {
      "ref": "feature/test-webhook"
    }
  },
  "repository": {
    "full_name": "torvalds/test-repo",
    "name": "test-repo",
    "owner": {
      "login": "torvalds"
    }
  }
}'

echo "=========================================="
echo "Testing webhook with user ID lookup"
echo "=========================================="
echo ""
echo "Repository owner: torvalds (expected GitHub user ID: 1024025)"
echo "API endpoint: $API_URL"
echo ""
echo "Note: This requires GITHUB_TOKEN to be set in backend .env file"
echo ""
echo "Sending PR merge event..."
echo ""

# Send POST request
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "User-Agent: GitHub-Hookshot/test" \
  -d "$PAYLOAD" \
  -s -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "=========================================="
echo "Test complete!"
echo "=========================================="
echo ""
echo "Check logs in backend terminal to verify:"
echo "  - 'Fetching GitHub user ID for repository owner: torvalds...'"
echo "  - 'Using userId 1024025 for storing documentation'"
echo ""
echo "Check webhook status: http://localhost:3001/api/webhook/status"
echo "Check queue: http://localhost:3001/api/webhook/queue"
