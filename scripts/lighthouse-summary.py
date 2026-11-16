
import json
from pathlib import Path

report_dir = Path("lighthouse-reports")

categories = [
    ("performance", "Perf"),
    ("accessibility", "A11y"),
    ("best-practices", "Best"),
    ("seo", "SEO"),
]

print(f"{'Device':<9} {'Page':<18} {'Perf':>6} {'A11y':>6} {'Best':>6} {'SEO':>6}")
print("-" * 59)

for device in ("mobile", "desktop"):
    for page in (
        "home",
        "about",
        "contact",
        "work",
        "dingdong",
        "flightcompanion",
        "vrcafe",
    ):
        file = report_dir / f"{device}-{page}.report.json"

        if not file.exists():
            print(f"{device:<9} {page:<18} MISSING")
            continue

        data = json.loads(file.read_text())

        scores = []
        for key, _ in categories:
            category = data.get("categories", {}).get(key, {})
            score = category.get("score")

            scores.append(
                f"{round(score * 100):>6}"
                if score is not None
                else f"{'N/A':>6}"
            )

        print(f"{device:<9} {page:<18} {''.join(scores)}")

