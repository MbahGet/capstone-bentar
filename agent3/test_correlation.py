from pathlib import Path
import pandas as pd

# Test 1: Check if file exists
current_dir = Path(__file__).parent
data_dir = current_dir / 'data'
merged_path = data_dir / 'merged_dataset.csv'

print(f"Current dir: {current_dir}")
print(f"Data dir: {data_dir}")
print(f"Merged path: {merged_path}")
print(f"File exists: {merged_path.exists()}")

# Test 2: Try to load
if merged_path.exists():
    df = pd.read_csv(merged_path)
    print(f"✓ Loaded data: {df.shape}")
    print(f"Columns: {list(df.columns)}")
else:
    print("❌ File not found!")