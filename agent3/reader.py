import pandas as pd

df = pd.read_csv('agent3/data/merged_dataset.csv')

print("avg_defect_rate statistics:")
print(df['avg_defect_rate'].describe())
print(f"\nMax value: {df['avg_defect_rate'].max()}")
print(f"Min value: {df['avg_defect_rate'].min()}")
print(f"Values > 0: {(df['avg_defect_rate'] > 0).sum()}")
print(f"Values > 0.5: {(df['avg_defect_rate'] > 0.5).sum()}")
print(f"Values > 1: {(df['avg_defect_rate'] > 1).sum()}")
print(f"Values > 2: {(df['avg_defect_rate'] > 2).sum()}")
print(f"Values > 5: {(df['avg_defect_rate'] > 5).sum()}")

print(f"\nSample data:")
print(df[['avg_defect_rate', 'defect_incident']].head(20))