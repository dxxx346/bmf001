#!/bin/bash

# OWASP ZAP Security Testing Script
# This script runs automated security tests against the application

set -e

# Configuration
TARGET_URL=${1:-"http://localhost:3000"}
REPORT_DIR="./test-results/security"
ZAP_REPORT="$REPORT_DIR/zap-baseline-report.html"
ZAP_JSON="$REPORT_DIR/zap-baseline-report.json"
ZAP_XML="$REPORT_DIR/zap-baseline-report.xml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting OWASP ZAP Security Testing${NC}"
echo "Target URL: $TARGET_URL"
echo "Report Directory: $REPORT_DIR"

# Create report directory
mkdir -p "$REPORT_DIR"

# Check if target is reachable
echo -e "${YELLOW}Checking if target is reachable...${NC}"
if ! curl -s --connect-timeout 10 "$TARGET_URL" > /dev/null; then
    echo -e "${RED}Error: Cannot reach target URL: $TARGET_URL${NC}"
    echo "Please make sure the application is running"
    exit 1
fi

echo -e "${GREEN}Target is reachable. Starting security tests...${NC}"

# Run ZAP baseline scan
echo -e "${YELLOW}Running OWASP ZAP Baseline Scan...${NC}"
docker run -t --rm \
    -v "$(pwd)/$REPORT_DIR":/zap/wrk/:rw \
    owasp/zap2docker-stable:latest \
    zap-baseline.py \
    -t "$TARGET_URL" \
    -g gen.conf \
    -r zap-baseline-report.html \
    -J zap-baseline-report.json \
    -x zap-baseline-report.xml \
    -a \
    -d \
    -P \
    -c zap-baseline.conf \
    || true  # Don't fail on findings

# Check if reports were generated
if [[ -f "$ZAP_REPORT" ]]; then
    echo -e "${GREEN}HTML Report generated: $ZAP_REPORT${NC}"
fi

if [[ -f "$ZAP_JSON" ]]; then
    echo -e "${GREEN}JSON Report generated: $ZAP_JSON${NC}"
fi

if [[ -f "$ZAP_XML" ]]; then
    echo -e "${GREEN}XML Report generated: $ZAP_XML${NC}"
fi

# Parse results and display summary
if [[ -f "$ZAP_JSON" ]]; then
    echo -e "\n${YELLOW}Security Scan Summary:${NC}"
    
    # Count findings by risk level (basic parsing without jq dependency)
    HIGH=$(grep -o '"riskcode":"3"' "$ZAP_JSON" | wc -l || echo "0")
    MEDIUM=$(grep -o '"riskcode":"2"' "$ZAP_JSON" | wc -l || echo "0")
    LOW=$(grep -o '"riskcode":"1"' "$ZAP_JSON" | wc -l || echo "0")
    INFO=$(grep -o '"riskcode":"0"' "$ZAP_JSON" | wc -l || echo "0")
    
    echo "High Risk Issues:   $HIGH"
    echo "Medium Risk Issues: $MEDIUM"
    echo "Low Risk Issues:    $LOW"
    echo "Informational:      $INFO"
    
    # Color code the output based on findings
    if [[ $HIGH -gt 0 ]]; then
        echo -e "${RED}❌ High risk security issues found!${NC}"
        exit_code=2
    elif [[ $MEDIUM -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Medium risk security issues found${NC}"
        exit_code=1
    else
        echo -e "${GREEN}✅ No high or medium risk issues found${NC}"
        exit_code=0
    fi
else
    echo -e "${RED}Could not parse security scan results${NC}"
    exit_code=1
fi

echo -e "\n${GREEN}Security testing completed!${NC}"
echo "Check the detailed reports in: $REPORT_DIR"

exit $exit_code
