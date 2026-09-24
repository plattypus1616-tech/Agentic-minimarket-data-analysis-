import React, { useState } from "react";
import { X, Sparkles, RefreshCw, AlertCircle, ShieldCheck, Lock } from "lucide-react";
import { NodeInfo, SidakTargetSku } from "../types";
import { stripSkuDataForAi } from "../utils/phantomEngine";

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeInfo: NodeInfo;
  filteredSkus: SidakTargetSku[];
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  nodeInfo,
  filteredSkus,
}) => {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const fetchAiAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // Data Masking & Token Efficiency: Send ONLY 3 numeric variables (sku_id, stok_sistem, avg_sales)
      // Absolutely NO product names or prices are sent to AI
      const maskedSkus = stripSkuDataForAi(filteredSkus);

      const res = await fetch("/api/analyze-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeInfo,
          filteredSkus: maskedSkus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil analisa AI");
      }

      setAnalysisText(data.analysis);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghubungi AI Studio server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="modal-ai-overlay" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div id="modal-ai-content" className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-100">
              Analisa Retail Data Architect (Gemini AI)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-950 border border-emerald-800 text-emerald-300 font-medium">
              <Lock className="w-3 h-3 text-emerald-400" />
              Data Masking Active: AI only reads numeric codes.
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security / Privacy Banner */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-200 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Perlindungan Privasi Otomatis:</strong> Sebelum dikirim ke AI, dataset dipotong menjadi 3 variabel numerik (<code className="text-white font-bold">sku_id</code>, <code className="text-white font-bold">stok_sistem</code>, <code className="text-white font-bold">avg_sales</code>). Nama barang &amp; harga tetap aman di memori lokal peramban.
          </span>
        </div>

        {!analysisText && !loading && !error && (
          <div className="text-center py-8 space-y-3">
            <Sparkles className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
            <h4 className="text-sm font-bold text-slate-200">
              Hasilkan Instruksi Takhtis Sidak Fisik Otomatis
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Sistem akan menganalisa {filteredSkus.length} SKU target sidak di {nodeInfo.name} menggunakan model Gemini AI untuk menghasilkan rekomendasi sidak fisik dan pencegahan kerugian.
            </p>
            <button
              onClick={fetchAiAnalysis}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Jalankan Analisa AI Sekarang
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 mx-auto animate-spin" />
            <p className="text-xs text-slate-300 font-mono">
              Mengeksekusi Inferensi AI Studio... (Gemini Engine)
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800/80 rounded-xl p-4 text-xs text-red-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal Membuat Analisa AI:</p>
              <p className="text-slate-400 mt-1">{error}</p>
              <button
                onClick={fetchAiAnalysis}
                className="mt-2 text-indigo-400 underline font-semibold hover:text-indigo-300"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {analysisText && (
          <div className="space-y-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-sans text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {analysisText}
            </div>
            <div className="flex justify-end">
              <button
                onClick={fetchAiAnalysis}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerasi Analisa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
