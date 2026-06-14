import pandas as pd
import numpy as np

def load_integrated_csv(file_path: str) -> pd.DataFrame:
    """
    Membaca file CSV tunggal terintegrasi (Event-Driven / Time-Series).
    """
    df = pd.read_csv(file_path)
    
    # Standarisasi kolom waktu ke datetime
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    elif 'date' in df.columns:
        df['timestamp'] = pd.to_datetime(df['date'])
    else:
        raise ValueError("CSV harus memiliki kolom 'timestamp' atau 'date'.")
        
    return df


def generate_agent2_df(df_integrated: pd.DataFrame) -> pd.DataFrame:
    """
    Ekstrak data untuk Agent 2 (Production Decision Support).
    Mengagregasi data time-series (jam/menit) menjadi data harian (date).
    """
    df = df_integrated.copy()
    
    # Agent 2 (kpi_engine.py) membutuhkan format tanggal harian YYYY-MM-DD
    df['date'] = df['timestamp'].dt.strftime('%Y-%m-%d')
    
    # Beri default 'machine_id' jika tidak ada di log
    if 'machine_id' not in df.columns:
        df['machine_id'] = 'Line-1'
        
    # Skema kolom yang wajib ada untuk Agent 2
    agg_dict = {
        'planned_production_time_min': 'sum',
        'operating_time_min': 'sum',
        'total_units': 'sum',
        'defect_units': 'sum',
        'ideal_cycle_time_min': 'mean' # Target cycle time cocok menggunakan rata-rata
    }
    
    # Mekanisme defensif: isi dengan nilai default apabila log belum komplit
    for col in agg_dict.keys():
        if col not in df.columns:
            if col == 'planned_production_time_min':
                df[col] = 60.0 # Misal per baris event = 1 jam
            elif col == 'ideal_cycle_time_min':
                df[col] = 1.0
            else:
                df[col] = 0.0

    # Lakukan agregasi GroupBy Date dan Machine ID
    df_agent2 = df.groupby(['date', 'machine_id']).agg(agg_dict).reset_index()
    return df_agent2


def generate_agent3_dfs(df_integrated: pd.DataFrame) -> tuple:
    """
    Ekstrak data untuk Agent 3 (Root Cause Analysis / XAI).
    Memecah single log menjadi 3 DataFrame (df_prod, df_defect, df_down) 
    agar kompatibel dengan `preprocessing.py` bawaan Agent 3.
    """
    df = df_integrated.copy()
    
    # 1. df_prod (Production Log)
    # Ekspektasi: timestamp, temperature, vibration, dll.
    df_prod = df.copy()
    # Format khusus agar cocok dengan pd.to_datetime '%m/%d/%Y %H:%M' di Agent 3
    df_prod['timestamp'] = df_prod['timestamp'].dt.strftime('%m/%d/%Y %H:%M')
    
    # 2. df_defect (Defect Data)
    # Ekspektasi: Timestamp, Defect Rate (%), Production Output (Units)
    df_defect = pd.DataFrame()
    # Format Timestamp standar 'YYYY-MM-DD HH:MM:SS'
    df_defect['Timestamp'] = df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
    
    if 'total_units' in df.columns:
        df_defect['Production Output (Units)'] = df['total_units']
    else:
        df_defect['Production Output (Units)'] = 100
        
    if 'defect_units' in df.columns and 'total_units' in df.columns:
        safe_output = np.where(df['total_units'] == 0, 1, df['total_units'])
        df_defect['Defect Rate (%)'] = (df['defect_units'] / safe_output) * 100
    elif 'defect_rate' in df.columns:
        df_defect['Defect Rate (%)'] = df['defect_rate']
    else:
        df_defect['Defect Rate (%)'] = 0.0
        
    # 3. df_down (Downtime Log)
    # Ekspektasi: timestamp, duration_minutes
    df_down = pd.DataFrame()
    df_down['timestamp'] = df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
    
    if 'downtime_duration_minutes' in df.columns:
        df_down['duration_minutes'] = df['downtime_duration_minutes']
    elif 'planned_production_time_min' in df.columns and 'operating_time_min' in df.columns:
        df_down['duration_minutes'] = (df['planned_production_time_min'] - df['operating_time_min']).clip(lower=0)
    else:
        df_down['duration_minutes'] = 0.0
        
    # Filter hanya menampilkan event yang downtime-nya > 0 (mirip format log downtime asli)
    df_down = df_down[df_down['duration_minutes'] > 0].reset_index(drop=True)

    return df_prod, df_defect, df_down
