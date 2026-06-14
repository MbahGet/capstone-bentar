from scipy.stats import pearsonr
import pandas as pd
import numpy as np

df = pd.read_csv('data/merged_dataset.csv')

print("Target variable (defect_incident):")
print(df['defect_incident'].describe())
print(f"Unique values: {df['defect_incident'].unique()}")

# Test pearson dengan satu feature
feature = 'temperature'
print(f"\nTesting Pearson with '{feature}':")
print(f"  Data type: {df[feature].dtype}")
print(f"  Missing values: {df[feature].isna().sum()}")

print(f"  Values sample: {df[feature].head()}")

# Calculate
valid_mask = df[feature].notna()
print(f"  Valid rows: {valid_mask.sum()}")

if valid_mask.sum() > 1:
    corr, p_value = pearsonr(df.loc[valid_mask, feature], df.loc[valid_mask, 'defect_incident'])
    print(f"  Correlation: {corr}")
    print(f"  P-value: {p_value}")