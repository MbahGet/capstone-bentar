import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_integrated_dummy_data(output_path='integrated_production_log.csv', days=30):
    np.random.seed(42)
    
    # 1. Generate Timestamps (Hourly)
    end_time = datetime.now().replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=days)
    
    timestamps = pd.date_range(start=start_time, end=end_time, freq='h')
    n_rows = len(timestamps)
    
    # 2. Base Data
    df = pd.DataFrame({'timestamp': timestamps})
    df['machine_id'] = 'Line-1'
    df['operator_id'] = np.random.choice(['OP-A', 'OP-B', 'OP-C'], size=n_rows)
    
    # Time metrics
    df['planned_production_time_min'] = 60.0
    
    # Sensors (Normal operating conditions)
    df['temperature'] = np.random.normal(loc=75.0, scale=2.0, size=n_rows)
    df['vibration'] = np.random.normal(loc=1.2, scale=0.1, size=n_rows)
    df['feed_rate_deviation'] = np.random.normal(loc=0.0, scale=0.5, size=n_rows)
    df['pressure'] = np.random.normal(loc=100.0, scale=5.0, size=n_rows)
    
    # Production Output
    df['ideal_cycle_time_min'] = 1.0 # Asumsi 1 unit per menit
    df['operating_time_min'] = 60.0
    
    # units roughly equal to operating_time_min under normal conditions
    df['total_units'] = np.floor(df['operating_time_min'] * np.random.uniform(0.9, 1.0, size=n_rows)).astype(int)
    
    # Defect metrics (normally very low)
    df['defect_units'] = np.floor(df['total_units'] * np.random.uniform(0.01, 0.03, size=n_rows)).astype(int)
    df['Defect_Type'] = np.random.choice(['None', 'Scratch', 'Dent', 'Alignment'], size=n_rows, p=[0.8, 0.1, 0.05, 0.05])
    
    # Downtime metrics
    df['downtime_duration_minutes'] = df['planned_production_time_min'] - df['operating_time_min']
    df['Is_Downtime'] = (df['downtime_duration_minutes'] > 5).astype(int)
    df['Downtime_Reason'] = np.where(df['Is_Downtime'] == 1, 
                                     np.random.choice(['Mechanical Failure', 'Setup', 'Idle', 'Maintenance'], size=n_rows), 
                                     'None')

    # 3. Inject Anomalies
    
    # Anomaly 1: Severe Mechanical Failure causing high downtime
    anomaly1_indices = np.random.choice(n_rows, size=3, replace=False)
    for idx in anomaly1_indices:
        df.loc[idx, 'vibration'] = np.random.uniform(3.0, 5.0) # High vibration
        df.loc[idx, 'temperature'] = np.random.uniform(90.0, 110.0) # Overheating
        df.loc[idx, 'operating_time_min'] = np.random.uniform(10, 20) # Low operating time
        df.loc[idx, 'downtime_duration_minutes'] = 60.0 - df.loc[idx, 'operating_time_min']
        df.loc[idx, 'Is_Downtime'] = 1
        df.loc[idx, 'Downtime_Reason'] = 'Mechanical Failure'
        df.loc[idx, 'total_units'] = int(df.loc[idx, 'operating_time_min'] * 0.8)
        df.loc[idx, 'defect_units'] = int(df.loc[idx, 'total_units'] * 0.4) # High defect rate during failure
        df.loc[idx, 'Defect_Type'] = 'Dent'

    # Anomaly 2: Quality issue (High defects without necessarily stopping the machine)
    anomaly2_indices = np.random.choice([i for i in range(n_rows) if i not in anomaly1_indices], size=5, replace=False)
    for idx in anomaly2_indices:
        df.loc[idx, 'feed_rate_deviation'] = np.random.uniform(2.5, 4.0) # High deviation
        df.loc[idx, 'defect_units'] = int(df.loc[idx, 'total_units'] * np.random.uniform(0.15, 0.25)) # 15-25% defects
        df.loc[idx, 'Defect_Type'] = 'Alignment'
        
    # 4. Optional / Mature KPIs (Defensive columns for Agent 2)
    # OEE = Availability * Performance * Quality
    availability = df['operating_time_min'] / df['planned_production_time_min']
    performance = (df['total_units'] * df['ideal_cycle_time_min']) / df['operating_time_min']
    performance = performance.replace([np.inf, -np.inf], 0).fillna(0).clip(upper=1.0) # Cap at 100%
    
    safe_total = np.where(df['total_units'] == 0, 1, df['total_units'])
    quality = (df['total_units'] - df['defect_units']) / safe_total
    
    df['OEE_Percentage'] = (availability * performance * quality) * 100
    df['Downtime_Rate'] = (df['downtime_duration_minutes'] / df['planned_production_time_min']) * 100
    df['Defect_Rate'] = (df['defect_units'] / safe_total) * 100

    # Clean formatting
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].round(2)
    
    # 5. Save to CSV
    df.to_csv(output_path, index=False)
    print(f"Berhasil membuat {output_path} dengan {n_rows} baris.")
    print("\nPreview 5 baris pertama:")
    print(df.head().to_string())
    
    return df

if __name__ == "__main__":
    generate_integrated_dummy_data('integrated_production_log.csv', days=30)
