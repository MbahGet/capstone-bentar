import json
import os
from pathlib import Path
from openai import OpenAI


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

        self.client = OpenAI(
            api_key=groq_api_key or "placeholder",
            base_url="https://api.groq.com/openai/v1",
        )

        print(f"[LLM] Initialized with model: {self.model}")

    def load_shap_ranking(self):
        """Load SHAP ranking dari JSON"""
        print("Loading SHAP ranking...")
        with open(self.shap_ranking_path, "r") as f:
            data = json.load(f)
        self.shap_ranking = data["ranking"]
        print(f"✓ Loaded {len(self.shap_ranking)} ranked features")
        for i, item in enumerate(self.shap_ranking[:5], 1):
            print(f"  {i}. {item['feature']}: {item['mean_abs_shap']:.4f}")
        return self.shap_ranking

    def build_prompt(self):
        ranking_text = "\n".join(
            f"{i+1}. {item['feature']} (importance score: {item['mean_abs_shap']:.4f})"
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
        causes = [item["feature"] for item in self.shap_ranking[:5]]
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
        if not api_key:
            print("[LLM] No GROQ_API_KEY — using fallback explanation.")
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
            return
        output_file = Path(output_path)
        output_file.parent.mkdir(exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("ROOT CAUSE ANALYSIS — FISHBONE REPORT\n")
            f.write("=" * 60 + "\n\n")
            f.write(self.explanation)
            f.write("\n\n" + "=" * 60 + "\n")
            f.write(f"Generated by: RCA Agent (SHAP + Groq {self.model})\n")
        print(f"✓ Explanation saved to {output_file}")
        return output_file

    def create_summary_json(self, output_path="data/rca_result.json"):
        if not self.explanation:
            return
        output_file = Path(output_path)
        output_file.parent.mkdir(exist_ok=True)
        result = {
            "analysis_type": "Root Cause Analysis (RCA)",
            "method": f"SHAP-based ML + Groq LLM ({self.model})",
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
        print("=" * 60)
        print("STARTING LLM EXPLANATION GENERATION")
        print("=" * 60)
        self.load_shap_ranking()
        self.generate_explanation()
        self.print_explanation()
        self.save_explanation()
        self.create_summary_json()
        print("\n" + "=" * 60)
        print("LLM EXPLANATION COMPLETE")
        print("=" * 60)
        return self.explanation


if __name__ == "__main__":
    current_dir = Path(__file__).parent
    data_dir = current_dir / "data"
    ranking_path = data_dir / "shap_ranking.json"
    explainer = LLMExplainer(str(ranking_path))
    explainer.analyze()
