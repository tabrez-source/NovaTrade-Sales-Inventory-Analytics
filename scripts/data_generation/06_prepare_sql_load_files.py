import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
raw_dir = BASE_DIR / "data" / "raw"
load_dir = BASE_DIR / "data" / "sql_load"

load_dir.mkdir(parents=True, exist_ok=True)

files = [
    "product_categories",
    "products",
    "branches",
    "godowns",
    "sales_heads",
    "distributors",
    "product_price_history",
    "price_lists",
    "price_list_items",
    "schemes",
    "scheme_slabs",
    "sales_orders",
    "sales_order_items",
    "dispatches",
    "stock_inward",
    "stock_outward",
    "inventory_snapshot"
]

for file in files:
    input_file = raw_dir / f"{file}.csv"
    output_file = load_dir / f"{file}.tsv"

    df = pd.read_csv(input_file, dtype=str)
    df = df.fillna("")
    df.to_csv(output_file, sep="\t", index=False, encoding="utf-8", lineterminator="\n")

    print(f"Created: {output_file}")

print("Done.")