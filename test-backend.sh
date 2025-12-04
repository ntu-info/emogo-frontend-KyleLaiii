#!/bin/bash
# Quick testing script for EmoGo Backend
# Usage: ./test-backend.sh https://your-backend.onrender.com

if [ -z "$1" ]; then
    echo "Usage: ./test-backend.sh <backend-url>"
    echo "Example: ./test-backend.sh https://emogo-backend.onrender.com"
    exit 1
fi

BASE_URL=$1
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "EmoGo Backend Testing Suite"
echo "Base URL: $BASE_URL"
echo "================================================"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[TEST 1] Health Check${NC}"
echo "GET $BASE_URL/health"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Get all records
echo -e "${YELLOW}[TEST 2] Get All Records${NC}"
echo "GET $BASE_URL/records"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/records")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    COUNT=$(echo "$BODY" | grep -o '"count":[0-9]*' | cut -d: -f2)
    echo "Records found: $COUNT"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Create test record
echo -e "${YELLOW}[TEST 3] Create Test Record${NC}"
TEST_ID="test-$(date +%s)"
PAYLOAD=$(cat <<EOF
{
  "exportDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "recordCount": 1,
  "records": [
    {
      "id": "$TEST_ID",
      "sentiment": "很好",
      "sentimentValue": 4,
      "latitude": 25.0,
      "longitude": 121.5,
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "videoBase64": null
    }
  ]
}
EOF
)

echo "POST $BASE_URL/records"
echo "Record ID: $TEST_ID"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE_URL/records" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    echo "Response: $BODY" | jq '.' 2>/dev/null || echo "Response: $BODY"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi
echo ""

# Test 4: Get updated record count
echo -e "${YELLOW}[TEST 4] Verify Record Created${NC}"
echo "GET $BASE_URL/records"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/records")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    COUNT=$(echo "$BODY" | grep -o '"count":[0-9]*' | cut -d: -f2)
    echo "Total records now: $COUNT"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
fi
echo ""

# Test 5: Export as JSON
echo -e "${YELLOW}[TEST 5] Export as JSON${NC}"
echo "GET $BASE_URL/export?format=json"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/export?format=json")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    RECORD_COUNT=$(echo "$BODY" | grep -o '"recordCount":[0-9]*' | cut -d: -f2)
    echo "Export record count: $RECORD_COUNT"
    echo "Sample: $(echo "$BODY" | jq '.records[0]' 2>/dev/null | head -n 5 || echo "...")"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
fi
echo ""

# Test 6: Export as CSV
echo -e "${YELLOW}[TEST 6] Export as CSV${NC}"
echo "GET $BASE_URL/export?format=csv"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/export?format=csv")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    LINES=$(echo "$BODY" | wc -l)
    echo "CSV lines: $LINES"
    echo "Sample header:"
    echo "$BODY" | head -n 1
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
fi
echo ""

# Test 7: Get videos list
echo -e "${YELLOW}[TEST 7] Get Videos List${NC}"
echo "GET $BASE_URL/export/videos"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/export/videos")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    VIDEO_COUNT=$(echo "$BODY" | grep -o '"count":[0-9]*' | cut -d: -f2)
    echo "Videos found: $VIDEO_COUNT"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    echo "Note: This is OK if no videos have been uploaded yet"
fi
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}Testing Complete${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Record a video in the app"
echo "2. Click 'Sync to Cloud'"
echo "3. Check backend logs for upload progress"
echo "4. Run this test again to verify video upload"
echo ""
echo "Useful curl commands:"
echo ""
echo "# Get all records with videos:"
echo "curl $BASE_URL/records | jq '.records[] | select(.videoUrl != null)'"
echo ""
echo "# Download export:"
echo "curl $BASE_URL/export?format=json > export.json"
echo "curl $BASE_URL/export?format=csv > export.csv"
echo ""
echo "# Download specific video:"
echo "curl -O $BASE_URL/export/download/<record-id>"
echo ""
