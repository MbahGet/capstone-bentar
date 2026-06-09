import pandas as pd
import numpy as np
import xgboost as xgb
import shap
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from pathlib import Path
import matplotlib.pyplot as plt
import json

class SHAPAnalyzer:
    """
    Train XGBoost model dan hitung SHAP values untuk feature importance ranking
    """
    
    def __init__(self, merged_data_path):
        self.merged_data_path = merged_data_path
        self.df = None
        self.X = None
        self.y = None
        self.model = None
        self.shap_values = None
        self.explainer = None
    
    def load_and_prepare_data(self):
        """Load data dan prepare features"""
        print("Loading data...")
        self.df = pd.read_csv(self.merged_data_path)
        print(f"Loaded: {self.df.shape}")
        
        # Exclude non-numeric dan target columns
        exclude_cols = ['timestamp', 'defect_incident']
        
        numeric_cols = [
            col for col in self.df.select_dtypes(include=[np.number]).columns
            if col not in exclude_cols
        ]
        
        print(f"Using {len(numeric_cols)} numeric features")
        
        # Prepare X dan y
        self.X = self.df[numeric_cols].copy()
        self.y = self.df['defect_incident'].copy()
        
        # Handle any remaining NaN
        self.X = self.X.fillna(self.X.mean())
        
        print(f"Features shape: {self.X.shape}")
        print(f"Target distribution:\n{self.y.value_counts()}")
        
        return self.X, self.y
    
    def train_xgboost(self, test_size=0.2, random_state=42):
        """
        Train XGBoost classifier
        """
        print("\nTraining XGBoost model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            self.X, self.y,
            test_size=test_size,
            random_state=random_state,
            stratify=self.y
        )
        
        print(f"Train set: {X_train.shape}")
        print(f"Test set: {X_test.shape}")
        
        # Train model
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=random_state,
            verbose=0
        )
        
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False
        )
        
        print("Model trained")
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        print(f"\nModel Performance:")
        print(f"Classification Report:\n{classification_report(y_test, y_pred)}")
        
        try:
            auc_score = roc_auc_score(y_test, y_pred_proba)
            print(f"ROC-AUC Score: {auc_score:.4f}")
        except:
            print("Could not calculate ROC-AUC")
        
        return self.model
    
    def calculate_shap_values(self):
        """
        Calculate SHAP values menggunakan TreeExplainer
        """
        print("\nCalculating SHAP values...")
        
        if self.model is None:
            raise ValueError("Model belum di-train! Jalankan train_xgboost() dulu.")
        
        # Create explainer
        self.explainer = shap.TreeExplainer(self.model)
        
        # Calculate SHAP values
        self.shap_values = self.explainer.shap_values(self.X)
        
        print("SHAP values calculated")
        print(f"  Shape: {np.array(self.shap_values).shape}")
        
        return self.shap_values
    
    def rank_features_by_shap(self):
        """
        Rank features berdasarkan mean absolute SHAP values
        """
        print("\nRanking features by SHAP importance...")
        
        if self.shap_values is None:
            raise ValueError("SHAP values belum dihitung!")
        
        # Handle binary classification (shap_values might be list)
        if isinstance(self.shap_values, list):
            # Untuk binary classification, ambil SHAP values untuk class 1
            shap_vals = self.shap_values[1]
        else:
            shap_vals = self.shap_values
        
        # Calculate mean absolute SHAP value per feature
        mean_abs_shap = np.abs(shap_vals).mean(axis=0)
        
        # Create ranking dataframe
        feature_importance = pd.DataFrame({
            'feature': self.X.columns,
            'mean_abs_shap': mean_abs_shap
        }).sort_values('mean_abs_shap', ascending=False)
        
        print("\nTop 10 features by SHAP importance:")
        print(feature_importance.head(10).to_string(index=False))
        
        return feature_importance
    
    def create_shap_visualizations(self, output_dir='data'):
        """
        Create SHAP visualization plots
        """
        print("\nCreating SHAP visualizations...")
        
        if self.shap_values is None:
            raise ValueError("SHAP values belum dihitung!")
        
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Handle binary classification
        if isinstance(self.shap_values, list):
            shap_vals = self.shap_values[1]
        else:
            shap_vals = self.shap_values
        
        # 1. Summary plot (bar)
        try:
            plt.figure(figsize=(10, 8))
            shap.summary_plot(shap_vals, self.X, plot_type="bar", show=False)
            plt.tight_layout()
            plt.savefig(output_path / 'shap_summary_bar.png', dpi=100, bbox_inches='tight')
            print("Saved shap_summary_bar.png")
            plt.close()
        except Exception as e:
            print(f"! Could not create summary bar plot: {e}")
        
        # 2. Summary plot (beeswarm) - hanya top 10 features
        try:
            # Get top 10 features
            mean_abs_shap = np.abs(shap_vals).mean(axis=0)
            top_10_idx = np.argsort(mean_abs_shap)[-10:][::-1]
            
            plt.figure(figsize=(10, 8))
            shap.summary_plot(
                shap_vals[:, top_10_idx],
                self.X.iloc[:, top_10_idx],
                plot_type="dot",
                show=False
            )
            plt.tight_layout()
            plt.savefig(output_path / 'shap_summary_dot.png', dpi=100, bbox_inches='tight')
            print("Saved shap_summary_dot.png")
            plt.close()
        except Exception as e:
            print(f"! Could not create summary dot plot: {e}")
        
        # 3. Force plot untuk sample pertama
        try:
            plt.figure(figsize=(14, 3))
            shap.force_plot(
                self.explainer.expected_value,
                shap_vals[0],
                self.X.iloc[0],
                show=False
            )
            plt.tight_layout()
            plt.savefig(output_path / 'shap_force_plot.png', dpi=100, bbox_inches='tight')
            print("Saved shap_force_plot.png")
            plt.close()
        except Exception as e:
            print(f"! Could not create force plot: {e}")
    
    def save_results(self, feature_importance, output_dir='data'):
        """
        Save SHAP analysis results
        """
        print(f"\nSaving results to {output_dir}/...")
        
        output_path = Path(output_dir)
        
        # Save feature importance
        importance_path = output_path / 'shap_feature_importance.csv'
        feature_importance.to_csv(importance_path, index=False)
        print(f"Saved {importance_path}")
        
        # Save ranking as JSON
        ranking_path = output_path / 'shap_ranking.json'
        ranking_dict = {
            'ranking': feature_importance[['feature', 'mean_abs_shap']].to_dict('records')
        }
        with open(ranking_path, 'w') as f:
            json.dump(ranking_dict, f, indent=2)
        print(f"Saved {ranking_path}")
        
        # Save model
        model_path = output_path / 'xgboost_model.json'
        self.model.get_booster().save_model(str(model_path))
        print(f"Saved {model_path}")
    
    def analyze(self):
        """
        Run complete SHAP analysis pipeline
        """
        print("=" * 60)
        print("STARTING SHAP ANALYSIS")
        print("=" * 60)
        
        # Load dan prepare
        self.load_and_prepare_data()
        
        # Train model
        self.train_xgboost()
        
        # Calculate SHAP
        self.calculate_shap_values()
        
        # Rank features
        feature_importance = self.rank_features_by_shap()
        
        # Visualize
        self.create_shap_visualizations()
        
        # Save
        self.save_results(feature_importance)
        
        print("\n" + "=" * 60)
        print("SHAP ANALYSIS COMPLETE")
        print("=" * 60)
        
        return feature_importance


# Test
if __name__ == "__main__":
    current_dir = Path(__file__).parent
    data_dir = current_dir / 'data'
    merged_path = data_dir / 'merged_dataset.csv'
    
    analyzer = SHAPAnalyzer(str(merged_path))
    feature_importance = analyzer.analyze()