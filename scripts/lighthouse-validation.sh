#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-all}"
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

case "$MODE" in
  local)
    ENVIRONMENTS=("local")
    ;;
  prod)
    ENVIRONMENTS=("prod")
    ;;
  all)
    ENVIRONMENTS=("local" "prod")
    ;;
  *)
    echo "Usage: bash scripts/lighthouse-validation.sh [local|prod|all]"
    exit 1
    ;;
esac

for environment in "${ENVIRONMENTS[@]}"; do
  if [[ "$environment" == "local" ]]; then
    BASE_URL="http://localhost:4321"
  else
    BASE_URL="https://pascal-kuiper.nl"
  fi

  mkdir -p "${OUTPUT_DIR}/${environment}"

  echo ""
  echo "Environment: ${environment}"
  echo "URL: ${BASE_URL}"
  echo ""

  printf "%-8s %-18s %12s %15s %15s %8s\n" \
    "DEVICE" "PAGE" "PERFORMANCE" "ACCESSIBILITY" "BEST PRACTICES" "SEO"

  printf '%s\n' "--------------------------------------------------------------------------------"

  for device in mobile desktop; do
    for entry in "${PAGES[@]}"; do
      name="${entry%%:*}"
      path="${entry#*:}"
      report="${OUTPUT_DIR}/${environment}/${device}-${name}"

      FLAGS=()

      if [[ "$device" == "desktop" ]]; then
        FLAGS+=(--preset=desktop)
      fi

      npx --no-install lighthouse "${BASE_URL}${path}" \
        "${FLAGS[@]}" \
        --only-categories=performance,accessibility,best-practices,seo \
        --output=json \
        --output=html \
        --output-path="./${report}" \
        --chrome-flags="--headless --disable-extensions" \
        --quiet

      node - "${report}.report.json" "$device" "$name" <<'NODE'
const fs = require("fs");

const [file, device, name] = process.argv.slice(2);
const report = JSON.parse(fs.readFileSync(file, "utf8"));

const score = (category) =>
  Math.round(report.categories[category].score * 100);

console.log(
  [
    device.padEnd(8),
    name.padEnd(18),
    String(score("performance")).padStart(12),
    String(score("accessibility")).padStart(15),
    String(score("best-practices")).padStart(15),
    String(score("seo")).padStart(8),
  ].join(" ")
);
NODE
    done
  done
done

echo ""
echo "Lighthouse audits completed."
echo "Reports saved to: ${OUTPUT_DIR}"
