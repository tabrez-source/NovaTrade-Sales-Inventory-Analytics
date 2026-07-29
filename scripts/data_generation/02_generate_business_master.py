import random
import pandas as pd
from pathlib import Path

random.seed(42)

BASE_DIR = Path(__file__).resolve().parents[2]
output_dir = BASE_DIR / "data" / "raw"
output_dir.mkdir(parents=True, exist_ok=True)

# -------------------------
# Branches
# -------------------------
branches = pd.DataFrame([
    [1, "Mumbai Head Branch", "Mumbai", "Maharashtra", "West", 1, 1],
    [2, "Chennai Branch", "Chennai", "Tamil Nadu", "South", 0, 1],
    [3, "Delhi Branch", "Delhi", "Delhi", "North", 0, 1],
    [4, "Kolkata Branch", "Kolkata", "West Bengal", "East", 0, 1],
], columns=[
    "BranchID", "BranchName", "City", "State", "Region", "IsHeadBranch", "IsActive"
])

# -------------------------
# Godowns
# -------------------------
godowns = pd.DataFrame([
    [1, 1, "Bhiwandi Main Godown", "Bhiwandi", "Maharashtra", 1, 1],
    [2, 1, "Mumbai City Godown", "Mumbai", "Maharashtra", 0, 1],
    [3, 2, "Chennai Main Godown", "Chennai", "Tamil Nadu", 0, 1],
    [4, 2, "Chennai Outer Godown", "Sriperumbudur", "Tamil Nadu", 0, 1],
    [5, 3, "Delhi Main Godown", "Delhi", "Delhi", 0, 1],
    [6, 4, "Kolkata Main Godown", "Kolkata", "West Bengal", 0, 1],
    [7, 4, "Howrah Overflow Godown", "Howrah", "West Bengal", 0, 1],
], columns=[
    "GodownID", "BranchID", "GodownName", "City", "State", "IsMainGodown", "IsActive"
])

# -------------------------
# Sales Heads
# 1 per branch = 4 sales heads
# -------------------------
sales_heads_data = [
    [1, "Kabir Sales Mumbai", 1, "West", 1],
    
    [2, "Vikram Sales Chennai", 2, "South", 1],
    
    [3, "Ravindra Sales Delhi", 3, "North", 1],

    [4, "Debashis Sales Kolkata", 4, "East", 1],
]

sales_heads = pd.DataFrame(sales_heads_data, columns=[
    "SalesHeadID", "SalesHeadName", "HomeBranchID", "Region", "IsActive"
])

# -------------------------
# Distributors
# 200 realistic fake distributors
# -------------------------
prefixes = [
    "Shree", "Bharat", "Metro", "National", "Galaxy", "Sai", "Royal",
    "Prime", "Eastern", "Western", "Capital", "Sunrise", "Milan",
    "Apex", "Janta", "Classic", "United", "New India", "Mahalaxmi",
    "Star", "Bright", "Excel", "Om", "Super"
]

suffixes = [
    "Electricals", "Light Traders", "Power House", "Distributors",
    "Agencies", "Trading Co.", "Electronics", "Light Centre",
    "Supply Co.", "Enterprises", "Sales Corporation"
]

cities_by_branch = {
    1: [
        ("Mumbai", "Maharashtra"), ("Pune", "Maharashtra"),
        ("Nashik", "Maharashtra"), ("Nagpur", "Maharashtra"),
        ("Surat", "Gujarat"), ("Ahmedabad", "Gujarat"),
        ("Indore", "Madhya Pradesh")
    ],
    2: [
        ("Chennai", "Tamil Nadu"), ("Coimbatore", "Tamil Nadu"),
        ("Madurai", "Tamil Nadu"), ("Bengaluru", "Karnataka"),
        ("Hyderabad", "Telangana"), ("Vijayawada", "Andhra Pradesh"),
        ("Kochi", "Kerala")
    ],
    3: [
        ("Delhi", "Delhi"), ("Jaipur", "Rajasthan"),
        ("Lucknow", "Uttar Pradesh"), ("Kanpur", "Uttar Pradesh"),
        ("Ludhiana", "Punjab"), ("Chandigarh", "Chandigarh"),
        ("Gurugram", "Haryana")
    ],
    4: [
        ("Kolkata", "West Bengal"), ("Howrah", "West Bengal"),
        ("Patna", "Bihar"), ("Ranchi", "Jharkhand"),
        ("Bhubaneswar", "Odisha"), ("Guwahati", "Assam"),
        ("Siliguri", "West Bengal")
    ]
}

branch_weights = [0.32, 0.32, 0.18, 0.18]

distributors = []
used_names = set()

for distributor_id in range(1, 201):
    branch_id = random.choices([1, 2, 3, 4], weights=branch_weights, k=1)[0]
    city, state = random.choice(cities_by_branch[branch_id])

    # Create unique realistic fake name
    while True:
        name = f"{random.choice(prefixes)} {random.choice(suffixes)}"
        if name not in used_names:
            used_names.add(name)
            break
        name = f"{random.choice(prefixes)} {random.choice(suffixes)} {distributor_id}"
        if name not in used_names:
            used_names.add(name)
            break

    # 50% active/regular, others occasional/dormant
    activity_tier = random.choices(
        ["Top", "Regular", "Occasional", "Dormant"],
        weights=[12, 38, 35, 15],
        k=1
    )[0]

    credit_limit = random.choices(
        [500000, 1000000, 2000000, 5000000, 7500000],
        weights=[28, 35, 22, 12, 3],
        k=1
    )[0]

    possible_sales_heads = sales_heads[sales_heads["HomeBranchID"] == branch_id]
    assigned_sales_head_id = int(possible_sales_heads.sample(1, random_state=random.randint(1, 99999))["SalesHeadID"].iloc[0])

    distributors.append([
        distributor_id,
        name,
        city,
        state,
        branch_id,
        assigned_sales_head_id,
        credit_limit,
        activity_tier,
        1 if activity_tier != "Dormant" else 0
    ])

distributors = pd.DataFrame(distributors, columns=[
    "DistributorID",
    "DistributorName",
    "City",
    "State",
    "RegionBranchID",
    "AssignedSalesHeadID",
    "CreditLimit",
    "ActivityTier",
    "IsActive"
])

# Save CSVs
branches.to_csv(output_dir / "branches.csv", index=False)
godowns.to_csv(output_dir / "godowns.csv", index=False)
sales_heads.to_csv(output_dir / "sales_heads.csv", index=False)
distributors.to_csv(output_dir / "distributors.csv", index=False)

print("✅ Business master data generated successfully!")
print(f"Branches: {len(branches)}")
print(f"Godowns: {len(godowns)}")
print(f"Sales Heads: {len(sales_heads)}")
print(f"Distributors: {len(distributors)}")
