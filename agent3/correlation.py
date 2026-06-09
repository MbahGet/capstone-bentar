import pandas as pd
import numpy as np
from scipy.stats import pearsonr, spearmanr, chi2_contingency
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import json

class CorrelationAnalyzer:
    """
    Analyze correlation antara features dan target variable (defect_incident)
    Menggunakan Pearson (numeric), Spearman (ordinal), dan chi-square (categorical)
    """
    
    def __init__(self, merged_data_path):
        self.merged_data_path = merged_data_path
        self.df = None
        self.correlation_results = {}
        self.feature_importance = None
    
    def load_data(self):
        """Load merged dataset"""
        print("Loading merged dataset...")
        self.df = pd.read_csv(self.merged_data_path)
        print(f"Loaded: {self.df.shape}")
        print(f"Columns: {list(self.df.columns)}")
    
    def identify_feature_types(self):
        """Identify numeric vs categorical features"""
        print("\nIdentifying feature types...")
        
        # Exclude timestamp dan target variable
        exclude_cols = ['timestamp', 'defect_incident']
        
        # Numeric features
        self.numeric_features = [
            col for col in self.df.select_dtypes(include=[np.number]).columns
            if col not in exclude_cols
        ]
        
        # Categorical features (jika ada)
        self.categorical_features = [
            col for col in self.df.select_dtypes(include=['object']).columns
            if col not in exclude_cols
        ]
        
        print(f"Numeric features ({len(self.numeric_features)}): {self.numeric_features[:5]}...")
        print(f"Categorical features ({len(self.categorical_features)}): {self.categorical_features}")
    
    def calculate_pearson_correlation(self):
        """
        Calculate Pearson correlation untuk numeric features
        Pearson: measures linear relationship, values between -1 and 1
        """
        print("\nCalculating Pearson correlation...")
        
        target = self.df['defect_incident']
        pearson_results = {}
        
        for feature in self.numeric_features:
            # Skip jika ada missing values
            valid_mask = self.df[feature].notna()
            
            if valid_mask.sum() > 1:  # Minimal 2 data points
                corr, p_value = pearsonr(
                    self.df.loc[valid_mask, feature],
                    target[valid_mask]
                )
                
                pearson_results[feature] = {
                    'correlation': corr,
                    'p_value': p_value,
                    'significance': 'significant' if p_value < 0.05 else 'not significant'
                }
        
        # Sort by absolute correlation value
        pearson_sorted = sorted(
            pearson_results.items(),
            key=lambda x: abs(x[1]['correlation']),
            reverse=True
        )
        
        print(f"Calculated Pearson for {len(pearson_results)} features")
        print("\nTop 5 Pearson correlations:")
        for feature, stats in pearson_sorted[:5]:
            print(f"  {feature}: {stats['correlation']:.4f} (p={stats['p_value']:.4f})")
        
        self.correlation_results['pearson'] = pearson_results
        return pearson_results
    
    def calculate_spearman_correlation(self):
        """
        Calculate Spearman correlation untuk numeric features
        Spearman: measures monotonic relationship (tidak harus linear)
        """
        print("\nCalculating Spearman correlation...")
        
        target = self.df['defect_incident']
        spearman_results = {}
        
        for feature in self.numeric_features:
            # Skip jika ada missing values
            valid_mask = self.df[feature].notna()
            
            if valid_mask.sum() > 1:
                corr, p_value = spearmanr(
                    self.df.loc[valid_mask, feature],
                    target[valid_mask]
                )
                
                spearman_results[feature] = {
                    'correlation': corr,
                    'p_value': p_value,
                    'significance': 'significant' if p_value < 0.05 else 'not significant'
                }
        
        # Sort by absolute correlation value
        spearman_sorted = sorted(
            spearman_results.items(),
            key=lambda x: abs(x[1]['correlation']),
            reverse=True
        )
        
        print(f"Calculated Spearman for {len(spearman_results)} features")
        print("\nTop 5 Spearman correlations:")
        for feature, stats in spearman_sorted[:5]:
            print(f"  {feature}: {stats['correlation']:.4f} (p={stats['p_value']:.4f})")
        
        self.correlation_results['spearman'] = spearman_results
        return spearman_results
    
    def calculate_chi_square(self):
        """
        Calculate chi-square test untuk categorical features
        Chi-square: tests independence between categorical variables
        """
        print("\nCalculating Chi-square test...")
        
        chi_square_results = {}
        
        for feature in self.categorical_features:
            try:
                # Create contingency table
                contingency = pd.crosstab(
                    self.df[feature],
                    self.df['defect_incident']
                )
                
                # Calculate chi-square
                chi2, p_value, dof, expected = chi2_contingency(contingency)
                
                chi_square_results[feature] = {
                    'chi2_statistic': chi2,
                    'p_value': p_value,
                    'degrees_of_freedom': dof,
                    'significance': 'significant' if p_value < 0.05 else 'not significant'
                }
            except Exception as e:
                print(f"  ! Skipped {feature}: {str(e)}")
        
        print(f"Calculated chi-square for {len(chi_square_results)} features")
        if chi_square_results:
            print("\nChi-square results:")
            for feature, stats in chi_square_results.items():
                print(f"  {feature}: χ²={stats['chi2_statistic']:.4f} (p={stats['p_value']:.4f})")
        
        self.correlation_results['chi_square'] = chi_square_results
        return chi_square_results
    
    def rank_features_by_correlation(self):
        """
        Create ranking dari semua features berdasarkan correlation strength
        """
        print("\nRanking features by correlation strength...")
        
        feature_scores = {}
        
        # Score dari Pearson (gunakan absolute value)
        for feature, stats in self.correlation_results['pearson'].items():
            corr_value = stats['correlation']
            # Handle NaN
            if pd.notna(corr_value):
                feature_scores[feature] = abs(corr_value)
            else:
                feature_scores[feature] = 0
        
        # Sort by score
        ranked_features = sorted(
            feature_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        self.feature_importance = pd.DataFrame(
            ranked_features,
            columns=['feature', 'correlation_score']
        )
        
        print("\nFeature ranking:")
        print(self.feature_importance.to_string(index=False))
        
        return self.feature_importance
    
    def filter_significant_features(self, threshold=0.3):
        """
        Filter features yang punya correlation > threshold
        Threshold default 0.3 (weak correlation)
        """
        print(f"\nFiltering features with correlation > {threshold}...")
        
        if self.feature_importance is None:
            self.rank_features_by_correlation()
        
        significant = self.feature_importance[
            self.feature_importance['correlation_score'] > threshold
        ]
        
        print(f"Found {len(significant)} significant features")
        print(significant.to_string(index=False))
        
        return significant
    
    def create_correlation_matrix(self):
        """
        Create correlation matrix visualization
        """
        print("\nCreating correlation matrix...")
        
        # Select numeric columns untuk correlation matrix
        numeric_cols = self.numeric_features + ['defect_incident']
        corr_matrix = self.df[numeric_cols].corr()
        
        # Buat heatmap
        plt.figure(figsize=(12, 10))
        sns.heatmap(
            corr_matrix,
            annot=True,
            fmt='.2f',
            cmap='coolwarm',
            center=0,
            square=True
        )
        plt.title('Correlation Matrix - Production Data')
        plt.tight_layout()
        
        # Save
        output_path = Path(self.merged_data_path).parent / 'correlation_heatmap.png'
        plt.savefig(output_path, dpi=100)
        print(f"Heatmap saved to {output_path}")
        plt.close()
        
        return corr_matrix
    
    def save_results(self, output_dir='data'):
        """
        Save correlation results ke JSON
        """
        print(f"\nSaving results to {output_dir}/...")
        
        output_path = Path(output_dir) / 'correlation_results.json'
        
        # Prepare data untuk JSON (convert numpy types)
        results_to_save = {
            'pearson': {
                k: {
                    'correlation': float(v['correlation']),
                    'p_value': float(v['p_value']),
                    'significance': v['significance']
                }
                for k, v in self.correlation_results['pearson'].items()
            },
            'spearman': {
                k: {
                    'correlation': float(v['correlation']),
                    'p_value': float(v['p_value']),
                    'significance': v['significance']
                }
                for k, v in self.correlation_results['spearman'].items()
            },
            'chi_square': {
                k: {
                    'chi2_statistic': float(v['chi2_statistic']),
                    'p_value': float(v['p_value']),
                    'degrees_of_freedom': int(v['degrees_of_freedom']),
                    'significance': v['significance']
                }
                for k, v in self.correlation_results['chi_square'].items()
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(results_to_save, f, indent=2)
        
        print(f"Results saved to {output_path}")
        
        # Save feature importance
        importance_path = Path(output_dir) / 'feature_importance.csv'
        if self.feature_importance is not None:
            self.feature_importance.to_csv(importance_path, index=False)
            print(f"Feature importance saved to {importance_path}")
    
    def analyze(self):
        """
        Run complete correlation analysis pipeline
        """
        print("=" * 60)
        print("STARTING CORRELATION ANALYSIS")
        print("=" * 60)
        
        # Load
        self.load_data()
        
        # Identify features
        self.identify_feature_types()
        
        # Calculate correlations
        self.calculate_pearson_correlation()
        self.calculate_spearman_correlation()
        self.calculate_chi_square()
        
        # Rank
        self.rank_features_by_correlation()
        
        # Filter
        significant = self.filter_significant_features(threshold=0.2)
        
        # Visualize
        self.create_correlation_matrix()
        
        # Save
        self.save_results()
        
        print("\n" + "=" * 60)
        print("CORRELATION ANALYSIS COMPLETE")
        print("=" * 60)
        
        return self.feature_importance, significant


# Test
if __name__ == "__main__":
    from pathlib import Path
    
    print("Starting correlation analysis...")
    
    # Get data path
    current_dir = Path(__file__).parent
    data_dir = current_dir / 'data'
    merged_path = data_dir / 'merged_dataset.csv'
    
    print(f"Merged path: {merged_path}")
    print(f"File exists: {merged_path.exists()}")
    
    # Run analysis
    try:
        analyzer = CorrelationAnalyzer(str(merged_path))
        feature_importance, significant = analyzer.analyze()
        print("Analysis complete!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()