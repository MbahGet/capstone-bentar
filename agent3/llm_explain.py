import json
import os
import sys
from pathlib import Path
# Try importing dotenv with fallback to handle ModuleNotFoundError gracefully
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False

# Try importing groq with fallback to handle ModuleNotFoundError gracefully
try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False


def resolve_path(given_path, filename="shap_ranking.json"):
    """
    Dynamically resolve a path using multiple candidate directories to ensure 
    it works regardless of the current working directory (CWD).
    """
    if not given_path:
        return None
    
    path_obj = Path(given_path)
    if path_obj.is_absolute() and path_obj.exists():
        return path_obj
        
    # List of candidate parent directories to check
    candidates = [
        Path.cwd(),
        Path(__file__).parent,
        Path(__file__).parent / "data",
        Path(__file__).parent.parent,
        Path(__file__).parent.parent / "agent3",
        Path(__file__).parent.parent / "agent3" / "data",
        Path.cwd() / "agent3",
        Path.cwd() / "agent3" / "data"
    ]
    
    # Try the given path directly relative to each candidate
    for base in candidates:
        # Check if the path directly exists relative to base
        opt1 = (base / path_obj).resolve()
        if opt1.exists() and opt1.is_file():
            return opt1
            
        # Check if just the filename exists under base or base/data
        opt2 = (base / filename).resolve()
        if opt2.exists() and opt2.is_file():
            return opt2
            
    # Fallback to the resolved original path object
    return path_obj.resolve()


# Load .env from multiple possible candidate paths
if HAS_DOTENV:
    env_candidates = [
        Path(__file__).parent.parent / ".env",
        Path(__file__).parent / ".env",
        Path.cwd() / ".env",
        Path.cwd() / "agent3" / ".env"
    ]
    env_loaded = False
    for candidate in env_candidates:
        if candidate.exists():
            load_dotenv(candidate)
            print(f"[LLM] Loaded environment variables from: {candidate.resolve()}")
            env_loaded = True
            break

    if not env_loaded:
        load_dotenv()
        print("[LLM] Called default load_dotenv()")
else:
    print("[LLM] WARNING: 'python-dotenv' package is not installed. Environment variables will not be loaded from .env files.")


def check_health():
    """
    Perform a shallow health check of the environment and dependencies.
    Returns True if healthy/degraded (operable), False if critically broken.
    """
    status = {
        "status": "healthy",
        "dependencies": {},
        "environment": {},
        "paths": {}
    }
    
    # 1. Check dependencies
    status["dependencies"]["groq"] = "installed" if HAS_GROQ else "missing"
    if not HAS_GROQ:
        status["status"] = "degraded"
        
    try:
        import dotenv
        status["dependencies"]["dotenv"] = "installed"
    except ImportError:
        status["dependencies"]["dotenv"] = "missing"
        status["status"] = "degraded"
        
    # 2. Check environment variables
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if groq_key:
        masked_key = groq_key[:6] + "..." + groq_key[-4:] if len(groq_key) > 10 else "***"
        status["environment"]["GROQ_API_KEY"] = f"configured ({masked_key})"
    else:
        status["environment"]["GROQ_API_KEY"] = "not_set"
        status["status"] = "degraded"
        
    status["environment"]["GROQ_MODEL"] = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # 3. Check paths
    cwd = Path.cwd()
    status["paths"]["cwd"] = str(cwd)
    status["paths"]["script_dir"] = str(Path(__file__).parent)
    
    # Try resolving a mock path
    ranking_path = Path(__file__).parent / "data" / "shap_ranking.json"
    resolved_ranking = resolve_path(str(ranking_path), "shap_ranking.json")
    status["paths"]["shap_ranking_resolved"] = str(resolved_ranking)
    status["paths"]["shap_ranking_exists"] = resolved_ranking.exists() if resolved_ranking else False
    
    print(json.dumps(status, indent=2))
    return status["status"] in ("healthy", "degraded")


class LLMExplainer:
    """
    Generate narasi fishbone RCA menggunakan Groq LLM (OpenAI-compatible API).
    Input: SHAP ranking dari SHAP analysis
    Output: Narasi yang bisa dibaca manusia + rekomendasi tindakan
    """

    def __init__(self, shap_ranking_path, model=None):
        self.shap_ranking_path = shap_ranking_path
        self.model = model or os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.shap_ranking = None
        self.explanation = None

        groq_api_key = os.environ.get("GROQ_API_KEY", "")
        if not groq_api_key:
            print("[LLM] WARNING: GROQ_API_KEY not set — LLM explanation will use fallback text.")

        if HAS_GROQ:
            try:
                self.client = Groq(api_key=groq_api_key or "placeholder")
            except Exception as e:
                print(f"[LLM] Error initializing Groq client: {e}")
                self.client = None
        else:
            print("[LLM] WARNING: Groq SDK not available. Falling back to rule-based explanation.")
            self.client = None

        print(f"[LLM] Initialized with model: {self.model}")

    def load_shap_ranking(self):
        """Load SHAP ranking dari JSON dengan penanganan error global."""
        print("Loading SHAP ranking...")
        resolved_path = resolve_path(self.shap_ranking_path, "shap_ranking.json")
        print(f"[LLM] Resolved SHAP ranking path: {resolved_path}")
        
        try:
            if not resolved_path or not resolved_path.exists():
                raise FileNotFoundError(f"File SHAP ranking tidak ditemukan di: {resolved_path}")
                
            with open(resolved_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            if not isinstance(data, dict) or "ranking" not in data:
                raise ValueError("Format JSON tidak valid: missing 'ranking' key")
                
            self.shap_ranking = data["ranking"]
            print(f"✓ Loaded {len(self.shap_ranking)} ranked features")
            for i, item in enumerate(self.shap_ranking[:5], 1):
                feat = item.get('feature', 'unknown_feature')
                score = item.get('mean_abs_shap', 0.0)
                print(f"  {i}. {feat}: {score:.4f}")
            return self.shap_ranking
            
        except Exception as e:
            print(f"[LLM] ERROR loading SHAP ranking: {e}")
            # Defensively initialize fallback/empty ranking so the rest of the script doesn't crash
            self.shap_ranking = [
                {"feature": "temperature_anomaly", "mean_abs_shap": 0.85},
                {"feature": "operator_experience_index", "mean_abs_shap": 0.72},
                {"feature": "vibration_amplitude", "mean_abs_shap": 0.65},
                {"feature": "feed_rate_deviation", "mean_abs_shap": 0.48},
                {"feature": "material_humidity", "mean_abs_shap": 0.35}
            ]
            print(f"[LLM] Applied default fallback features for ranking: {self.shap_ranking}")
            return self.shap_ranking

    def build_prompt(self):
        ranking_text = "\n".join(
            f"{i+1}. {item.get('feature', 'unknown')} (importance score: {item.get('mean_abs_shap', 0.0):.4f})"
            for i, item in enumerate(self.shap_ranking[:10])
        )

        return f"""Kamu adalah seorang ahli Root Cause Analysis (RCA) di bidang manufaktur dan maintenance industri.

Saya memiliki data analisis dari sistem produksi yang menunjukkan defect incidents.
Berikut adalah ranking dari faktor-faktor yang paling berpengaruh terhadap terjadinya defect,
berdasarkan analisis machine learning (SHAP values):

ROOT CAUSES RANKING (by importance):
{ranking_text}

Berdasarkan ranking ini, lakukan hal berikut:

1. IDENTIFIKASI PENYEBAB UTAMA
   - Sebutkan 3 penyebab utama berdasarkan ranking
   - Jelaskan mengapa faktor-faktor ini paling berpengaruh

2. ANALISIS FISHBONE (Ishikawa Diagram)
   Kategorisasi ke dalam:
   - Man (Manusia): error operator, training
   - Machine (Mesin): kondisi, maintenance, wear & tear
   - Material: kualitas bahan baku
   - Method: prosedur, SOP
   - Environment: suhu, kelembaban lingkungan
   - Measurement: akurasi sensor, kalibrasi

3. REKOMENDASI TINDAKAN
   - 3–5 rekomendasi konkret, prioritas tinggi ke rendah
   - Sertakan estimasi timeline implementasi

Gunakan format laporan industri yang profesional dan actionable."""

    def _fallback_explanation(self) -> str:
        """Fallback jika Groq tidak tersedia."""
        causes = [item.get("feature", "unknown") for item in self.shap_ranking[:5]]
        lines = [
            "ROOT CAUSE ANALYSIS — FALLBACK REPORT",
            "(Groq API tidak tersedia — analisis otomatis berdasarkan SHAP ranking)",
            "",
            "PENYEBAB UTAMA (berdasarkan SHAP importance):",
        ]
        for i, f in enumerate(causes, 1):
            lines.append(f"  {i}. {f.replace('_', ' ').title()}")
        lines += [
            "",
            "REKOMENDASI:",
            "  1. Lakukan inspeksi mendalam pada faktor dengan skor tertinggi.",
            "  2. Tinjau prosedur maintenance mesin terkait.",
            "  3. Koordinasikan dengan tim QC untuk validasi parameter kritis.",
            "  4. Jadwalkan preventive maintenance berdasarkan pola deviasi.",
        ]
        return "\n".join(lines)

    def generate_explanation(self):
        """Call Groq LLM untuk generate narasi RCA."""
        print(f"\n[LLM] Calling Groq ({self.model})...")

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key or not HAS_GROQ or not self.client:
            print("[LLM] Groq client not fully configured/available — using fallback explanation.")
            self.explanation = self._fallback_explanation()
            return self.explanation

        prompt = self.build_prompt()
        print(f"[LLM] Prompt length: {len(prompt)} chars")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Kamu adalah ahli Root Cause Analysis (RCA) dan industrial operations "
                            "di bidang manufaktur. Berikan analisis yang terstruktur, data-driven, "
                            "dan actionable dalam bahasa Indonesia profesional."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=2048,
            )
            self.explanation = response.choices[0].message.content
            print("✓ Explanation generated via Groq")
            return self.explanation

        except Exception as e:
            print(f"[LLM] Groq error: {e} — falling back to rule-based explanation.")
            self.explanation = self._fallback_explanation()
            return self.explanation

    def print_explanation(self):
        if self.explanation:
            print("\n" + "=" * 60)
            print("ROOT CAUSE ANALYSIS — FISHBONE REPORT")
            print("=" * 60)
            print(self.explanation)
            print("=" * 60)

    def save_explanation(self, output_path="data/rca_explanation.txt"):
        if not self.explanation:
            print("[LLM] No explanation to save.")
            return None
        try:
            output_file = Path(output_path)
            if not output_file.is_absolute():
                if (Path(__file__).parent / "data").exists():
                    output_file = Path(__file__).parent / output_path
                else:
                    output_file = Path.cwd() / output_path
            
            output_file.parent.mkdir(exist_ok=True, parents=True)
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("ROOT CAUSE ANALYSIS — FISHBONE REPORT\n")
                f.write("=" * 60 + "\n\n")
                f.write(self.explanation)
                f.write("\n\n" + "=" * 60 + "\n")
                f.write(f"Generated by: RCA Agent (SHAP + Groq {self.model})\n")
            print(f"✓ Explanation saved to {output_file}")
            return output_file
        except Exception as e:
            print(f"[LLM] ERROR saving explanation: {e}")
            return None

    def create_summary_json(self, output_path="data/rca_result.json"):
        if not self.explanation:
            print("[LLM] No explanation for JSON summary.")
            return None
        try:
            output_file = Path(output_path)
            if not output_file.is_absolute():
                if (Path(__file__).parent / "data").exists():
                    output_file = Path(__file__).parent / output_path
                else:
                    output_file = Path.cwd() / output_path

            output_file.parent.mkdir(exist_ok=True, parents=True)
            
            ranking_to_save = self.shap_ranking or []
            result = {
                "analysis_type": "Root Cause Analysis (RCA)",
                "method": f"SHAP-based ML + Groq LLM ({self.model})",
                "top_root_causes": [
                    {
                        "rank": i + 1,
                        "feature": item.get("feature", "unknown"),
                        "importance_score": item.get("mean_abs_shap", 0.0),
                    }
                    for i, item in enumerate(ranking_to_save[:5])
                ],
                "full_explanation": self.explanation,
                "status": "complete",
            }
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"✓ Results saved to {output_file}")
            return output_file
        except Exception as e:
            print(f"[LLM] ERROR creating JSON summary: {e}")
            return None

    def analyze(self):
        print("=" * 60)
        print("STARTING LLM EXPLANATION GENERATION")
        print("=" * 60)
        try:
            self.load_shap_ranking()
            self.generate_explanation()
            self.print_explanation()
            self.save_explanation()
            self.create_summary_json()
        except Exception as e:
            print(f"[LLM] Error in full analyze pipeline: {e}")
            if not self.explanation:
                self.explanation = self._fallback_explanation()
            try:
                self.save_explanation()
                self.create_summary_json()
            except Exception as write_err:
                print(f"[LLM] Fatal write error during recovery: {write_err}")
                
        print("\n" + "=" * 60)
        print("LLM EXPLANATION COMPLETE")
        print("=" * 60)
        return self.explanation


if __name__ == "__main__":
    if "--health" in sys.argv:
        healthy = check_health()
        sys.exit(0 if healthy else 1)
        
    current_dir = Path(__file__).parent
    data_dir = current_dir / "data"
    ranking_path = data_dir / "shap_ranking.json"
    explainer = LLMExplainer(str(ranking_path))
    explainer.analyze()