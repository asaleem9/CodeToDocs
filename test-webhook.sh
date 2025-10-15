#!/bin/bash

# Test script for GitHub webhook
# Simulates a PR merge event

API_URL="http://localhost:3001/api/webhook/github"

# Sample GitHub PR merged webhook payload
PAYLOAD='{
  "action": "closed",
  "pull_request": {
    "number": 123,
    "title": "Add new feature",
    "merged": true,
    "merged_at": "2025-01-15T10:30:00Z",
    "user": {
      "login": "testuser"
    },
    "head": {
      "ref": "feature/new-feature"
    }
  },
  "repository": {
    "full_name": "testorg/test-repo",
    "name": "test-repo",
    "owner": {
      "login": "testorg"
    }
  }
}'

echo "Testing webhook endpoint: $API_URL"
echo ""
echo "Sending PR merge event..."
echo ""

# Send POST request
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "User-Agent: GitHub-Hookshot/test" \
  -d "$PAYLOAD" \
  -v

echo ""
echo ""
echo "Test complete!"
echo ""
echo "Check webhook status at: http://localhost:3001/api/webhook/status"
echo "Check queue at: http://localhost:3001/api/webhook/queue"
