import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument(
    "environment",
    choices=["local", "prod"],
    default="local",
    nargs="?",
)

args = parser.parse_args()

report_dir = Path("lighthouse-reports") / args.environment

categories = [
    ("performance", "Perf"),
    ("accessibility", "A11y"),
    ("best-practices", "Best"),
    ("seo", "SEO"),
]

pages = [
    "home",
    "about",
    "contact",
    "work",
    "dingdong",
    "flightcompanion",
    "vrcafe",
]

print(f"\nEnvironment: {args.environment}\n")
print(f"{'Device':<9} {'Page':<18} {'Perf':>6} {'A11y':>6} {'Best':>6} {'SEO':>6}")
print("-" * 59)

for device in ("mobile", "desktop"):
    for page in pages:
        file = report_dir / f"{device}-{page}.report.json"

        if not file.exists():
            print(f"{device:<9} {page:<18} MISSING")
            continue

        data = json.loads(file.read_text(encoding="utf-8"))

        scores = []

        for key, _ in categories:
            score = data.get("categories", {}).get(key, {}).get("score")

            scores.append(
                f"{round(score * 100):>6}"
                if score is not None
                else f"{'N/A':>6}"
            )

        print(f"{device:<9} {page:<18} {''.join(scores)}")
