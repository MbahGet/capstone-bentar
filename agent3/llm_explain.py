import json
import pandas as pd
import requests
from pathlib import Path


class LLMExplainer:
    """
    Generate narasi fishbone RCA menggunakan Ollama LLM
    Input: SHAP ranking dari SHAP analysis
    Output: Narasi yang bisa dibaca manusia + rekomendasi tindakan
    """

    def __init__(
        self,
        shap_ranking_path,
        ollama_base_url="http://host.docker.internal:11434",
        model="llama3.2:3b",
    ):
        self.shap_ranking_path = shap_ranking_path
        self.ollama_base_url = ollama_base_url
        self.model = model
        self.shap_ranking = None
        self.explanation = None

        print(f"[LLM] Initialized with:")
        print(f"  - Base URL: {self.ollama_base_url}")
        print(f"  - Model: {self.model}")

    def load_shap_ranking(self):
        """Load SHAP ranking dari JSON"""
        print("Loading SHAP ranking...")

        with open(self.shap_ranking_path, "r") as f:
            data = json.load(f)

        self.shap_ranking = data["ranking"]

        print(f"✓ Loaded {len(self.shap_ranking)} ranked features")
        print("\nTop 5 root causes:")
        for i, item in enumerate(self.shap_ranking[:5], 1):
            print(f"  {i}. {item['feature']}: {item['mean_abs_shap']:.4f}")

        return self.shap_ranking

    def build_prompt(self):
        """
        Build prompt untuk LLM
        Format: konteks industri + ranking root cause + request untuk fishbone
        """
        print("\nBuilding prompt for LLM...")

        # Format ranking untuk prompt
        ranking_text = "\n".join(
            [
                f"{i+1}. {item['feature']} (importance score: {item['mean_abs_shap']:.4f})"
                for i, item in enumerate(self.shap_ranking[:10])
            ]
        )

        prompt = f"""Kamu adalah seorang ahli Root Cause Analysis (RCA) di bidang manufaktur dan maintenance industri.

Saya memiliki data analisis dari sistem produksi yang menunjukkan defect incidents. 
Berikut adalah ranking dari faktor-faktor yang paling berpengaruh terhadap terjadinya defect, 
berdasarkan analisis machine learning (SHAP values):

ROOT CAUSES RANKING (by importance):
{ranking_text}

Berdasarkan ranking ini, kamu diminta untuk:

1. IDENTIFIKASI PENYEBAB UTAMA
   - Sebutkan 3 penyebab utama berdasarkan ranking di atas
   - Jelaskan mengapa faktor-faktor ini paling berpengaruh

2. ANALISIS FISHBONE (Ishikawa Diagram)
   Kategorisasi penyebab ke dalam kategori tradisional:
   - Man (Manusia): masalah operator, training, error manusia
   - Machine (Mesin): kondisi mesin, maintenance, wear & tear
   - Material (Material): kualitas material, spesifikasi
   - Method (Metode): prosedur, SOP, sistem
   - Environment (Lingkungan): kondisi tempat kerja, suhu, kelembaban
   - Measurement (Pengukuran): akurasi sensor, kalibrasi

3. REKOMENDASI TINDAKAN
   - Berikan 3-5 rekomendasi tindakan konkret
   - Prioritaskan berdasarkan impact dan feasibility
   - Sertakan timeline implementasi

4. FORMAT OUTPUT
   Gunakan format yang jelas dan mudah dipahami untuk laporan industri.

Berikan analisis yang profesional, data-driven, dan actionable."""

        return prompt

    def generate_explanation(self):
        """
        Call Ollama LLM untuk generate narasi menggunakan requests
        """
        print("\nCalling Ollama LLM for explanation generation...")
        print(f"Model: {self.model}")
        print("This may take a moment...")

        prompt = self.build_prompt()

        try:
            # Use Ollama's /api/generate endpoint
            url = f"{self.ollama_base_url}/api/generate"

            payload = {"model": self.model, "prompt": prompt, "stream": False}

            print(f"Sending request to: {url}")
            print(f"Prompt length: {len(prompt)} chars")
            response = requests.post(url, json=payload, timeout=300)

            if response.status_code != 200:
                print(f"ERROR: Ollama returned {response.status_code}")
                print(f"Response: {response.text[:300]}")
                raise Exception(
                    f"Ollama error {response.status_code}: {response.text[:100]}"
                )

            result = response.json()
            self.explanation = result.get("response", "")

            print("✓ Explanation generated successfully")
            return self.explanation

        except requests.exceptions.ConnectionError:
            print("❌ Cannot connect to Ollama server!")
            print("Make sure Ollama is running:")
            print("  Command: ollama serve")
            print(f"  Expected at: {self.ollama_base_url}")
            raise
        except Exception as e:
            print(f"❌ Error calling Ollama: {e}")
            print(f"Error type: {type(e).__name__}")
            raise

    def print_explanation(self):
        """Print narasi ke console"""
        if self.explanation is None:
            print("Error: Explanation belum di-generate!")
            return

        print("\n" + "=" * 60)
        print("ROOT CAUSE ANALYSIS - FISHBONE REPORT")
        print("=" * 60)
        print(self.explanation)
        print("=" * 60)

    def save_explanation(self, output_path="data/rca_explanation.txt"):
        """Save narasi ke file text"""
        if self.explanation is None:
            print("Error: Explanation belum di-generate!")
            return

        output_file = Path(output_path)
        output_file.parent.mkdir(exist_ok=True)

        with open(output_file, "w", encoding="utf-8") as f:
            f.write("ROOT CAUSE ANALYSIS - FISHBONE REPORT\n")
            f.write("=" * 60 + "\n\n")
            f.write(self.explanation)
            f.write("\n\n" + "=" * 60 + "\n")
            f.write("Generated by: RCA Agent (SHAP + Ollama LLM)\n")

        print(f"\n✓ Explanation saved to {output_file}")
        return output_file

    def create_summary_json(self, output_path="data/rca_result.json"):
        """
        Create structured output JSON
        """
        if self.explanation is None:
            print("Error: Explanation belum di-generate!")
            return

        output_file = Path(output_path)
        output_file.parent.mkdir(exist_ok=True)

        result = {
            "analysis_type": "Root Cause Analysis (RCA)",
            "method": "SHAP-based ML + LLM Reasoning",
            "top_root_causes": [
                {
                    "rank": i + 1,
                    "feature": item["feature"],
                    "importance_score": item["mean_abs_shap"],
                }
                for i, item in enumerate(self.shap_ranking[:5])
            ],
            "full_explanation": self.explanation,
            "status": "complete",
        }

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"✓ Results saved to {output_file}")
        return output_file

    def analyze(self):
        """
        Run complete LLM explanation pipeline
        """
        print("=" * 60)
        print("STARTING LLM EXPLANATION GENERATION")
        print("=" * 60)

        # Load SHAP ranking
        self.load_shap_ranking()

        # Generate explanation
        self.generate_explanation()

        # Print
        self.print_explanation()

        # Save
        self.save_explanation()
        self.create_summary_json()

        print("\n" + "=" * 60)
        print("LLM EXPLANATION COMPLETE")
        print("=" * 60)

        return self.explanation


# Test
if __name__ == "__main__":
    current_dir = Path(__file__).parent
    data_dir = current_dir / "data"
    ranking_path = data_dir / "shap_ranking.json"

    print("Starting RCA Agent - LLM Explanation Module\n")

    explainer = LLMExplainer(str(ranking_path))
    explanation = explainer.analyze()
