# EmoGo Backend Testing Script for Windows PowerShell
# Usage: .\test-backend.ps1 https://your-backend.onrender.com

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://fastapi-xkp4.onrender.com"
)

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    Write-Host "Usage: .\test-backend.ps1 <backend-url>"
    Write-Host "Example: .\test-backend.ps1 https://emogo-backend.onrender.com"
    exit 1
}

# Color codes
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "EmoGo Backend Testing Suite" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[TEST 1] Health Check" -ForegroundColor $Yellow
Write-Host "GET $BaseUrl/health"
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method Get -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ PASS (HTTP 200)" -ForegroundColor $Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "Response: $($content | ConvertTo-Json)"
    } else {
        Write-Host "✗ FAIL (HTTP $($response.StatusCode))" -ForegroundColor $Red
    }
} catch {
    Write-Host "✗ FAIL - Connection Error" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Test 2: Get all records
Write-Host "[TEST 2] Get All Records" -ForegroundColor $Yellow
Write-Host "GET $BaseUrl/records"
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/records" -Method Get -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ PASS (HTTP 200)" -ForegroundColor $Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "Records found: $($content.count)"
    } else {
        Write-Host "✗ FAIL (HTTP $($response.StatusCode))" -ForegroundColor $Red
    }
} catch {
    Write-Host "✗ FAIL - Connection Error" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Test 3: Create test record
Write-Host "[TEST 3] Create Test Record" -ForegroundColor $Yellow
$TestId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$Payload = @{
    exportDate = $Timestamp
    recordCount = 1
    records = @(
        @{
            id = $TestId
            sentiment = "很好"
            sentimentValue = 4
            latitude = 25.0
            longitude = 121.5
            timestamp = $Timestamp
            videoBase64 = $null
        }
    )
} | ConvertTo-Json

Write-Host "POST $BaseUrl/records"
Write-Host "Record ID: $TestId"
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/records" -Method Post `
        -ContentType "application/json" `
        -Body $Payload `
        -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ PASS (HTTP 200)" -ForegroundColor $Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "Message: $($content.message)"
        if ($content.record) {
            Write-Host "Record ID: $($content.record._id)"
        }
    } else {
        Write-Host "✗ FAIL (HTTP $($response.StatusCode))" -ForegroundColor $Red
        Write-Host "Response: $($response.Content)"
    }
} catch {
    Write-Host "✗ FAIL - Connection Error" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Test 4: Export as JSON
Write-Host "[TEST 4] Export as JSON" -ForegroundColor $Yellow
Write-Host "GET $BaseUrl/export?format=json"
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/export?format=json" -Method Get -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ PASS (HTTP 200)" -ForegroundColor $Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "Export record count: $($content.recordCount)"
        if ($content.records -and $content.records.Count -gt 0) {
            Write-Host "First record ID: $($content.records[0].id)"
            Write-Host "First record sentiment: $($content.records[0].sentiment)"
        }
    } else {
        Write-Host "✗ FAIL (HTTP $($response.StatusCode))" -ForegroundColor $Red
    }
} catch {
    Write-Host "✗ FAIL - Connection Error" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Test 5: Export as CSV
Write-Host "[TEST 5] Export as CSV" -ForegroundColor $Yellow
Write-Host "GET $BaseUrl/export?format=csv"
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/export?format=csv" -Method Get -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ PASS (HTTP 200)" -ForegroundColor $Green
        $lines = ($response.Content -split "`n").Count
        Write-Host "CSV lines: $lines"
        $header = ($response.Content -split "`n")[0]
        Write-Host "Header: $header"
    } else {
        Write-Host "✗ FAIL (HTTP $($response.StatusCode))" -ForegroundColor $Red
    }
} catch {
    Write-Host "✗ FAIL - Connection Error" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Test 6: Get videos list
Write-Host "[TEST 6] Get Videos List" -ForegroundColor $Yellow
Write-Host "GET $BaseUrl/export/videos"
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/export/videos" -Method Get -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ PASS (HTTP 200)" -ForegroundColor $Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "Videos found: $($content.count)"
    } else {
        Write-Host "✗ FAIL (HTTP $($response.StatusCode))" -ForegroundColor $Red
    }
} catch {
    Write-Host "✗ FAIL - Connection Error" -ForegroundColor $Red
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host ""

# Summary
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Testing Complete" -ForegroundColor $Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Yellow
Write-Host "1. Record a video in the app"
Write-Host "2. Click 'Sync to Cloud'"
Write-Host "3. Check backend logs for upload progress"
Write-Host "4. Run this test again to verify video upload"
Write-Host ""
Write-Host "Useful PowerShell commands:" -ForegroundColor $Yellow
Write-Host ""
Write-Host "# Get all records:"
Write-Host "`$url = '$BaseUrl/records'"
Write-Host "`$response = Invoke-WebRequest -Uri `$url"
Write-Host "`$response.Content | ConvertFrom-Json | ConvertTo-Json"
Write-Host ""
Write-Host "# Download export as JSON:"
Write-Host "Invoke-WebRequest -Uri '$BaseUrl/export?format=json' -OutFile 'export.json'"
Write-Host ""
Write-Host "# Download export as CSV:"
Write-Host "Invoke-WebRequest -Uri '$BaseUrl/export?format=csv' -OutFile 'export.csv'"
Write-Host ""
