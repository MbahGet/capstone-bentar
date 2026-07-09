import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import os


class DataPreprocessor:
    """
    Preprocess production log, defect data, dan downtime log
    menjadi satu dataset yang siap untuk correlation analysis dan SHAP
    """
    
    def __init__(self, prod_path, defect_path, downtime_path):
        self.prod_path = prod_path
        self.defect_path = defect_path
        self.downtime_path = downtime_path
        self.merged_df = None
    
    def load_data(self):
        """Load ketiga CSV file"""
        print("Loading data...")
        
        # Load production log
        self.df_prod = pd.read_csv(self.prod_path)
        print(f"✓ Production log loaded: {len(self.df_prod)} rows")
        
        # Load defect data
        self.df_defect = pd.read_csv(self.defect_path)
        print(f"✓ Defect data loaded: {len(self.df_defect)} rows")
        
        # Load downtime log
        self.df_downtime = pd.read_csv(self.downtime_path)
        print(f"✓ Downtime log loaded: {len(self.df_downtime)} rows")
    
    def parse_timestamps(self):
        """Parse timestamp ke format yang konsisten"""
        print("\nParsing timestamps...")
        
        # Production log: format "1/1/2024 0:00" with fallback to generic format
        try:
            self.df_prod['timestamp'] = pd.to_datetime(
                self.df_prod['timestamp'], 
                format='%m/%d/%Y %H:%M'
            )
        except Exception:
            self.df_prod['timestamp'] = pd.to_datetime(self.df_prod['timestamp'])
        
        # Defect data: format "2025-05-01 08:00:00"
        self.df_defect['Timestamp'] = pd.to_datetime(self.df_defect['Timestamp'])
        
        # Downtime log: format "2024-01-01 02:00:00"
        self.df_downtime['timestamp'] = pd.to_datetime(self.df_downtime['timestamp'])
        
        print("✓ All timestamps parsed to datetime")
    
    def aggregate_defects(self):
        """
        Aggregate defect data per timestamp
        Karena defect data punya banyak records per waktu yang sama
        """
        print("\nAggregating defect data...")
        
        # Round timestamp ke jam terdekat untuk merge yang lebih clean
        self.df_defect['timestamp_rounded'] = self.df_defect['Timestamp'].dt.floor('h')
        
        # Aggregate: total defect rate per jam
        defect_agg = self.df_defect.groupby('timestamp_rounded').agg({
            'Defect Rate (%)': 'mean',
            'Production Output (Units)': 'sum'
        }).reset_index()
        
        defect_agg.columns = ['timestamp', 'avg_defect_rate', 'total_output']
        
        print(f"✓ Aggregated to {len(defect_agg)} unique hours")
        return defect_agg
    
    def aggregate_downtime(self):
        """
        Aggregate downtime data per timestamp
        """
        print("\nAggregating downtime data...")
        
        # Round timestamp ke jam terdekat
        self.df_downtime['timestamp_rounded'] = self.df_downtime['timestamp'].dt.floor('h')
        
        # Aggregate: total downtime per jam
        downtime_agg = self.df_downtime.groupby('timestamp_rounded').agg({
            'duration_minutes': 'sum'
        }).reset_index()
        
        downtime_agg.columns = ['timestamp', 'total_downtime_minutes']
        
        # Tambah binary flag: apakah ada downtime
        downtime_agg['has_downtime'] = (downtime_agg['total_downtime_minutes'] > 0).astype(int)
        
        print(f"✓ Aggregated to {len(downtime_agg)} unique hours with downtime")
        return downtime_agg
    
    def merge_data(self, defect_agg, downtime_agg):
        """
        Merge ketiga dataset berdasarkan timestamp
        """
        print("\nMerging datasets...")
        
        # Mulai dari production log (base)
        merged = self.df_prod.copy()
        
        # Merge dengan defect data (left join, karena tidak semua jam ada defect)
        merged = merged.merge(
            defect_agg,
            on='timestamp',
            how='left'
        )
        
        # Merge dengan downtime data (left join)
        merged = merged.merge(
            downtime_agg,
            on='timestamp',
            how='left'
        )
        
        print(f"✓ Merged dataset shape: {merged.shape}")
        return merged
    
    def handle_missing_values(self, df):
        """
        Handle missing values:
        - Numeric: fill dengan 0 atau mean
        - Categorical: fill dengan 'None'
        """
        print("\nHandling missing values...")
        
        missing_before = df.isnull().sum().sum()
        
        # Fill defect rate dengan 0 (jika tidak ada defect info, anggap 0%)
        df['avg_defect_rate'] = df['avg_defect_rate'].fillna(0)
        df['total_output'] = df['total_output'].fillna(0)
        
        # Fill downtime dengan 0 (jika tidak ada downtime info, anggap 0 menit)
        df['total_downtime_minutes'] = df['total_downtime_minutes'].fillna(0)
        df['has_downtime'] = df['has_downtime'].fillna(0).astype(int)
        
        missing_after = df.isnull().sum().sum()
        print(f"✓ Missing values: {missing_before} → {missing_after}")
        
        return df
    
    def normalize_numeric(self, df):
        """
        Normalize numeric columns ke range [0, 1]
        Menggunakan Min-Max scaling
        """
        print("\nNormalizing numeric columns...")
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if col not in ['machine_failure', 'has_downtime']:  # Skip binary columns
                min_val = df[col].min()
                max_val = df[col].max()
                
                if max_val > min_val:
                    df[f'{col}_normalized'] = (df[col] - min_val) / (max_val - min_val)
                else:
                    df[f'{col}_normalized'] = 0
        
        print(f"✓ Normalized {len(numeric_cols)} numeric columns")
        return df
    
    def create_target_variable(self, df):
        """
        Create target variable untuk SHAP analysis
        Synthetic: defect incident = kombinasi kondisi sensor yang abnormal
        """
        print("\nCreating target variable...")
        
        # Logika: jika temperature tinggi AND vibration tinggi, ada defect
        # Atau jika downtime terjadi, kemungkinan ada masalah
        df['defect_incident'] = (
            ((df['temperature'] > df['temperature'].quantile(0.75)) & 
            (df['vibration'] > df['vibration'].quantile(0.75))) |
            (df['has_downtime'] == 1)
        ).astype(int)
        
        num_incidents = df['defect_incident'].sum()
        pct_incidents = (num_incidents / len(df)) * 100
        print(f"✓ Target variable created: {num_incidents} defect incidents ({pct_incidents:.1f}%) out of {len(df)} records")
        
        return df
    
    def preprocess(self):
        """
        Main preprocessing pipeline
        """
        print("=" * 60)
        print("STARTING PREPROCESSING")
        print("=" * 60)
        
        # Load
        self.load_data()
        
        # Parse timestamps
        self.parse_timestamps()
        
        # Aggregate
        defect_agg = self.aggregate_defects()
        downtime_agg = self.aggregate_downtime()
        
        # Merge
        merged = self.merge_data(defect_agg, downtime_agg)
        
        # Clean
        merged = self.handle_missing_values(merged)
        
        # Normalize
        merged = self.normalize_numeric(merged)
        
        # Create target
        merged = self.create_target_variable(merged)
        
        # Store
        self.merged_df = merged
        
        print("\n" + "=" * 60)
        print("PREPROCESSING COMPLETE")
        print("=" * 60)
        print(f"Final dataset shape: {merged.shape}")
        print(f"\nColumns: {list(merged.columns)}")
        print(f"\nFirst few rows:\n{merged.head()}")
        
        return merged
    
    def save_processed_data(self, output_path='data/merged_dataset.csv'):
        """Save preprocessed data"""
        if self.merged_df is not None:
            self.merged_df.to_csv(output_path, index=False)
            print(f"\n✓ Processed data saved to {output_path}")
        else:
            print("Error: Run preprocess() first!")


# Test
if __name__ == "__main__":
    # Get current directory
    current_dir = Path(__file__).parent
    data_dir = current_dir / 'data'
    
    # --- Integrasi dengan Data Gateway ---
    import sys
    root_dir = current_dir.parent
    if str(root_dir) not in sys.path:
        sys.path.insert(0, str(root_dir))
        
    try:
        from data_gateway import load_integrated_csv, generate_agent3_dfs
        integrated_path = data_dir / 'integrated_production_log.csv'
        
        if integrated_path.exists():
            print("Mengekstrak file CSV terintegrasi menjadi file terpisah untuk Agent 3...")
            df_int = load_integrated_csv(str(integrated_path))
            df_prod, df_defect, df_down = generate_agent3_dfs(df_int)
            
            # Save hasil pecahan agar DataPreprocessor bisa membacanya tanpa modifikasi
            df_prod.to_csv(data_dir / 'production_log.csv', index=False)
            df_defect.to_csv(data_dir / 'defect_data.csv', index=False)
            df_down.to_csv(data_dir / 'downtime_log.csv', index=False)
    except Exception as e:
        print(f"Tidak dapat menggunakan Data Gateway: {e}")
    # -------------------------------------
    
    print(f"Current directory: {current_dir}")
    print(f"Data directory: {data_dir}")
    print(f"Files in data dir: {list(data_dir.glob('*.csv'))}")
    
    preprocessor = DataPreprocessor(
        prod_path=str(data_dir / 'production_log.csv'),
        defect_path=str(data_dir / 'defect_data.csv'),
        downtime_path=str(data_dir / 'downtime_log.csv')
    )
    
    merged_data = preprocessor.preprocess()
    preprocessor.save_processed_data(str(data_dir / 'merged_dataset.csv'))
    
    # Print summary statistics
    print("\n" + "=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)
    print(merged_data.describe())