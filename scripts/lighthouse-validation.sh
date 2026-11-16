
#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:4321"
OUTPUT_DIR="lighthouse-reports"

PAGES=(
  "home:/"
  "about:/about/"
  "contact:/contact/"
  "work:/projects/"
  "dingdong:/projects/dingdong/"
  "flightcompanion:/projects/flightcompanion/"
  "vrcafe:/projects/vrcafe/"
)

mkdir -p "$OUTPUT_DIR"

for device in mobile desktop; do
  for entry in "${PAGES[@]}"; do
    name="${entry%%:*}"
    path="${entry#*:}"

    echo "Running Lighthouse: $device / $name"

    if [[ "$device" == "desktop" ]]; then
      lighthouse "${BASE_URL}${path}" \
        --preset=desktop \
        --only-categories=performance,accessibility,best-practices,seo \
        --output=json \
        --output=html \
        --output-path="./${OUTPUT_DIR}/${device}-${name}" \
        --chrome-flags="--headless" \
        --quiet
    else
      lighthouse "${BASE_URL}${path}" \
        --only-categories=performance,accessibility,best-practices,seo \
        --output=json \
        --output=html \
        --output-path="./${OUTPUT_DIR}/${device}-${name}" \
        --chrome-flags="--headless" \
        --quiet
    fi
  done
done

echo "All 14 Lighthouse audits completed."
