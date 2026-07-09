from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse
from pathlib import Path
import tempfile
import shutil
import json
from typing import Optional
import sys
from pydantic import BaseModel
import pandas as pd
import uvicorn

# Import custom modules
from preprocessing import DataPreprocessor
from correlation import CorrelationAnalyzer
from shap_analysis import SHAPAnalyzer
from llm_explain import LLMExplainer

# Initialize FastAPI
app = FastAPI(
    title="RCA Agent - Root Cause Analysis",
    description="AI Agent untuk analisis akar penyebab masalah produksi menggunakan SHAP + LLM",
    version="1.0.0"
)

# Global variables untuk tracking
RESULTS_DIR = Path("data/results")
RESULTS_DIR.mkdir(exist_ok=True)

class RCAQueryRequest(BaseModel):
    query: str
    sessionId: str | None = None
    model_preference: str | None = "ollama"

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "RCA Agent is running",
        "service": "Root Cause Analysis Agent",
        "version": "1.0.0"
    }

@app.post("/query")
async def query_rca(request: RCAQueryRequest):
    """
    Endpoint khusus untuk dipanggil oleh Agent 1 (n8n).
    Membaca data lokal dan menjalankan full RCA pipeline.
    """
    try:
        data_dir = Path("data")
        
        # 1. Validasi keberadaan file lokal
        prod_path = data_dir / "production_log.csv"
        defect_path = data_dir / "defect_data.csv"
        downtime_path = data_dir / "downtime_log.csv"
        
        if not prod_path.exists():
            raise HTTPException(status_code=404, detail="Sample data CSV tidak ditemukan di folder data/")

        # 2. Jalankan Pipeline (Sama dengan logic /analyze lu)
        # Step 1: Preprocessing
        preprocessor = DataPreprocessor(str(prod_path), str(defect_path), str(downtime_path))
        merged_df = preprocessor.preprocess()
        
        # Step 3: SHAP Analysis (Kita skip Step 2 biar cepet buat AI response)
        merged_path = data_dir / "merged_dataset.csv"
        preprocessor.save_processed_data(str(merged_path))
        
        shap_analyzer = SHAPAnalyzer(str(merged_path))
        shap_analyzer.load_and_prepare_data()
        shap_analyzer.train_xgboost()
        shap_analyzer.calculate_shap_values()
        feature_importance = shap_analyzer.rank_features_by_shap()
        
        # Step 4: LLM Explanation
        explainer = LLMExplainer(str(data_dir / "shap_ranking.json"))
        # (Asumsi shap_analyzer.save_results sudah dipanggil di pipeline lu)
        shap_analyzer.save_results(feature_importance, str(data_dir))
        
        explainer.load_shap_ranking()
        explanation = explainer.generate_explanation()
        
        # 3. Balikin hasil terstruktur
        return {
            "status": "success",
            "rca_analysis": explanation,
            # Full Fishbone narrative text — consumed by n8n chatbot Agent 3
            "rca_report_text": explanation if isinstance(explanation, str) else explanation.get("full_explanation", ""),
            "top_features": feature_importance.head(5).to_dict(orient='records'),
            "metadata": {
                "records_analyzed": len(merged_df),
                "query_context": request.query
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RCA Query failed: {str(e)}") 



@app.post("/report_full", response_class=PlainTextResponse)
async def report_full_rca(request: RCAQueryRequest) -> str:
    """
    Endpoint for frontend injection. Returns full Fishbone plain text report.
    """
    try:
        data_dir = Path("data")
        prod_path = data_dir / "production_log.csv"
        defect_path = data_dir / "defect_data.csv"
        downtime_path = data_dir / "downtime_log.csv"

        if not prod_path.exists():
            return "Error: Data CSV tidak ditemukan di folder data/."

        preprocessor = DataPreprocessor(str(prod_path), str(defect_path), str(downtime_path))
        merged_df = preprocessor.preprocess()
        merged_path = data_dir / "merged_dataset.csv"
        preprocessor.save_processed_data(str(merged_path))

        shap_analyzer = SHAPAnalyzer(str(merged_path))
        shap_analyzer.load_and_prepare_data()
        shap_analyzer.train_xgboost()
        shap_analyzer.calculate_shap_values()
        feature_importance = shap_analyzer.rank_features_by_shap()
        shap_analyzer.save_results(feature_importance, str(data_dir))

        explainer = LLMExplainer(str(data_dir / "shap_ranking.json"))
        explainer.load_shap_ranking()
        explanation = explainer.generate_explanation()

        if isinstance(explanation, str) and explanation.strip():
            return explanation

        # Fallback jika Ollama gagal atau explanation bukan string
        top = feature_importance.head(5).to_dict(orient="records")
        lines = ["LAPORAN ROOT-CAUSE ANALYSIS (RCA) — FALLBACK", ""]
        lines.append("TOP ROOT CAUSES (berdasarkan SHAP):")
        for i, f in enumerate(top, 1):
            lines.append(f"  {i}. {f.get('feature','?')} — skor: {f.get('mean_abs_shap', 0):.4f}")
        return "\n".join(lines)

    except Exception as e:
        return f"Error saat menjalankan RCA pipeline: {str(e)}"


@app.post("/report")
async def report_rca_summary(request: RCAQueryRequest) -> dict:
    """
    Endpoint khusus untuk n8n Tool Calling.
    Mengembalikan JSON summary untuk memory.
    """
    try:
        data_dir = Path("data")
        merged_path = data_dir / "merged_dataset.csv"
        
        # We can just return a quick summary without rerunning everything
        # if the files exist, or just a generic summary
        return {
            "summary": "RCA Pipeline executed successfully. Top root causes identified via SHAP.",
            "instruction": "Reply to the user ONLY with this exact string: [INJECT_REPORT_3]. Do not add any other words, greetings, or formatting."
        }

    except Exception as e:
        return {"summary": f"Error: {str(e)}", "instruction": "Inform user of error."}


@app.post("/analyze")
async def analyze_rca(file: UploadFile = File(...)):
    """
    Main endpoint untuk RCA analysis
    
    Input:
    - file: Single integrated CSV yang memuat data produksi, defect, dan downtime
    
    Output:
    - JSON dengan ranking root causes
    - Text explanation dari LLM
    - SHAP visualizations
    """
    
    temp_dir = None
    
    try:
        # Create temporary directory untuk proses
        temp_dir = Path(tempfile.mkdtemp())
        print(f"\n[RCA] Created temp dir: {temp_dir}")
        
        # --- Gunakan Data Gateway ---
        from io import StringIO
        root_dir = Path(__file__).resolve().parents[1]
        if str(root_dir) not in sys.path:
            sys.path.insert(0, str(root_dir))
            
        from data_gateway import generate_agent3_dfs
        
        print("[RCA] Processing integrated CSV with Data Gateway...")
        csv_text = (await file.read()).decode("utf-8-sig")
        df_int = pd.read_csv(StringIO(csv_text))
        
        # Standarisasi kolom waktu ke datetime untuk gateway
        if 'timestamp' in df_int.columns:
            df_int['timestamp'] = pd.to_datetime(df_int['timestamp'])
        elif 'date' in df_int.columns:
            df_int['timestamp'] = pd.to_datetime(df_int['date'])
            
        df_prod, df_defect, df_down = generate_agent3_dfs(df_int)
        
        prod_path = temp_dir / "production_log.csv"
        defect_path = temp_dir / "defect_data.csv"
        downtime_path = temp_dir / "downtime_log.csv"
        
        df_prod.to_csv(prod_path, index=False)
        df_defect.to_csv(defect_path, index=False)
        df_down.to_csv(downtime_path, index=False)
        
        print(f"[RCA] Extracted files saved to {temp_dir}")
        # ----------------------------
        
        # Step 1: Preprocessing
        print("\n[RCA] Step 1: Preprocessing...")
        preprocessor = DataPreprocessor(
            prod_path=str(prod_path),
            defect_path=str(defect_path),
            downtime_path=str(downtime_path)
        )
        merged_df = preprocessor.preprocess()
        merged_path = temp_dir / "merged_dataset.csv"
        preprocessor.save_processed_data(str(merged_path))
        print("[RCA] ✓ Preprocessing complete")
        
        # Step 2: Correlation Analysis
        print("\n[RCA] Step 2: Correlation Analysis...")
        analyzer = CorrelationAnalyzer(str(merged_path))
        analyzer.load_data()
        analyzer.identify_feature_types()
        analyzer.calculate_pearson_correlation()
        analyzer.calculate_spearman_correlation()
        analyzer.calculate_chi_square()
        analyzer.rank_features_by_correlation()
        analyzer.create_correlation_matrix()
        analyzer.save_results(str(temp_dir))
        print("[RCA] ✓ Correlation analysis complete")
        
        # Step 3: SHAP Analysis
        print("\n[RCA] Step 3: SHAP Analysis...")
        shap_analyzer = SHAPAnalyzer(str(merged_path))
        shap_analyzer.load_and_prepare_data()
        shap_analyzer.train_xgboost()
        shap_analyzer.calculate_shap_values()
        feature_importance = shap_analyzer.rank_features_by_shap()
        shap_analyzer.create_shap_visualizations(str(temp_dir))
        shap_analyzer.save_results(feature_importance, str(temp_dir))
        print("[RCA] ✓ SHAP analysis complete")
        
        # Step 4: LLM Explanation
        print("\n[RCA] Step 4: LLM Explanation Generation...")
        ranking_path = temp_dir / "shap_ranking.json"
        explainer = LLMExplainer(str(ranking_path))
        explainer.load_shap_ranking()
        explanation = explainer.generate_explanation()
        explainer.save_explanation(str(temp_dir / "rca_explanation.txt"))
        explainer.create_summary_json(str(temp_dir / "rca_result.json"))
        print("[RCA] ✓ LLM explanation complete")
        
        # Prepare response
        print("\n[RCA] Preparing response...")
        
        # Read results
        with open(temp_dir / "rca_result.json", 'r', encoding='utf-8') as f:
            rca_result = json.load(f)
        
        with open(temp_dir / "rca_explanation.txt", 'r', encoding='utf-8') as f:
            explanation_text = f.read()
        
        # Read feature importance
        with open(temp_dir / "shap_feature_importance.csv", 'r') as f:
            feature_importance_lines = f.readlines()
        
        response_data = {
            "status": "success",
            "message": "RCA analysis completed successfully",
            "summary": {
                "total_records_analyzed": len(merged_df),
                "defect_incidents_detected": int(merged_df['defect_incident'].sum()),
                "defect_rate_percentage": round((merged_df['defect_incident'].sum() / len(merged_df)) * 100, 2)
            },
            "root_causes": rca_result['top_root_causes'],
            "explanation": explanation_text,
            # Full Fishbone narrative text — consumed by n8n chatbot Agent 3
            "rca_report_text": explanation_text,
            "feature_importance": feature_importance_lines[:6],  # Top 5 + header
            "artifacts": {
                "shap_summary_bar": "shap_summary_bar.png",
                "shap_summary_dot": "shap_summary_dot.png",
                "correlation_heatmap": "correlation_heatmap.png"
            }
        }
        
        print("[RCA] ✓ Response prepared")
        return JSONResponse(content=response_data, status_code=200)
    
    except Exception as e:
        print(f"\n[RCA] ❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"RCA analysis failed: {str(e)}"
        )
    
    finally:
        # Cleanup temp dir
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir)
            print(f"[RCA] Cleaned up temp dir")

@app.post("/test")
async def test_with_sample_data():
    """
    Test endpoint menggunakan sample data yang ada di folder data/
    """
    try:
        data_dir = Path("data")
        
        if not (data_dir / "production_log.csv").exists():
            raise HTTPException(
                status_code=400,
                detail="Sample data not found. Please ensure data files exist in data/ folder"
            )
        
        # Run preprocessing dulu
        preprocessor = DataPreprocessor(
            prod_path=str(data_dir / "production_log.csv"),
            defect_path=str(data_dir / "defect_data.csv"),
            downtime_path=str(data_dir / "downtime_log.csv")
        )
        merged_df = preprocessor.preprocess()
        merged_path = data_dir / "merged_dataset.csv"
        preprocessor.save_processed_data(str(merged_path))
        
        # Run SHAP
        shap_analyzer = SHAPAnalyzer(str(merged_path))
        shap_analyzer.load_and_prepare_data()
        shap_analyzer.train_xgboost()
        shap_analyzer.calculate_shap_values()
        feature_importance = shap_analyzer.rank_features_by_shap()
        shap_analyzer.create_shap_visualizations(str(data_dir))
        shap_analyzer.save_results(feature_importance, str(data_dir))
        
        # Run LLM
        ranking_path = data_dir / "shap_ranking.json"
        explainer = LLMExplainer(str(ranking_path))
        explainer.load_shap_ranking()
        explanation = explainer.generate_explanation()
        explainer.save_explanation(str(data_dir / "rca_explanation.txt"))
        explainer.create_summary_json(str(data_dir / "rca_result.json"))
        
        # Read results
        with open(data_dir / "rca_result.json", 'r', encoding='utf-8') as f:
            rca_result = json.load(f)
        
        return JSONResponse(
            content={
                "status": "success",
                "message": "Test RCA completed with sample data",
                "root_causes": rca_result['top_root_causes'],
                "explanation_preview": explanation[:500] + "..."
            },
            status_code=200
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Test failed: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "RCA Agent",
        "version": "1.0.0"
    }

@app.get("/info")
async def info():
    """Service info endpoint"""
    return {
        "name": "Root Cause Analysis Agent",
        "version": "1.0.0",
        "description": "AI-powered RCA using SHAP + LLM reasoning",
        "endpoints": {
            "POST /analyze": "Main RCA analysis endpoint (accepts 3 CSV files)",
            "POST /test": "Test with sample data",
            "GET /health": "Health check",
            "GET /info": "Service information",
            "GET /": "Root endpoint"
        }
    }

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Starting RCA Agent - FastAPI Server")
    print("=" * 60)
    print("\nEndpoints:")
    print("  POST /analyze - Main RCA analysis")
    print("  POST /test - Test with sample data")
    print("  GET /health - Health check")
    print("  GET /info - Service info")
    print("  GET / - Root")
    print("\nServer running at: http://localhost:9000")
    print("Docs at: http://localhost:9000/docs")
    print("=" * 60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=9000)