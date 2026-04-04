import csv
import json
import sys
from datetime import datetime
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: python convert.py <input.json> [output.csv]")
    sys.exit(1)

input_file = Path(sys.argv[1])
output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else input_file.with_suffix(".csv")

with open(input_file, "r") as f:
    data = json.load(f)

# Map accountId -> account name
account_map = {acc["id"]: acc["name"] for acc in data.get("accounts", [])}

with open(output_file, "w", newline="") as csvfile:
    writer = csv.writer(csvfile)

    writer.writerow(
        [
            "type",
            "symbol",
            "date",
            "quantity",
            "currency",
            "unitPrice",
            "fee",
            "nraTax",
            "account",
        ]
    )

    for activity in data.get("activities", []):
        date_iso = activity.get("date")
        date = datetime.fromisoformat(date_iso.replace("Z", "+00:00")).date()

        writer.writerow(
            [
                activity.get("type"),
                activity.get("symbol"),
                date,
                activity.get("quantity"),
                activity.get("currency"),  # <-- added here
                activity.get("unitPrice"),
                activity.get("fee"),
                "",  # nraTax
                account_map.get(activity.get("accountId"), ""),
            ]
        )

print(f"CSV file written to {output_file}")
