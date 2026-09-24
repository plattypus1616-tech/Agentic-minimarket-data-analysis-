import React from "react";
import { Filter, AlertTriangle, ArrowDownRight, Layers, ShieldCheck } from "lucide-react";

interface GateLogicCardsProps {
  minAvgSales?: number;
  maxStock?: number;
}

export const GateLogicCards: React.FC<GateLogicCardsProps> = () => {
  return (
    <div id="gate-logic-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
            Matriks Gate Logika Deterministik Pak Djoko
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Pre-Filter DC Active
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            Enterprise Matrix Protocol
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gate 1 */}
        <div id="card-gate-1" className="bg-slate-800/60 border border-indigo-500/30 rounded-xl p-4 relative overflow-hidden group hover:border-indigo-500/60 transition-all">
          <div className="absolute top-0 right-0 bg-indigo-600/20 text-indigo-300 font-mono text-[10px] font-extrabold px-3 py-1 rounded-bl-lg border-b border-l border-indigo-500/30">
            GATE 1
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200">Velocity &amp; High-Value Target</h3>
          </div>
          <p className="font-mono text-xs font-bold text-indigo-300 my-1 leading-snug">
            (Avg_Sales_7D &ge; 3.0) <br />
            <span className="text-amber-300 font-semibold">
              OR (Harga &ge; Rp 50.000 AND Avg_Sales_7D &ge; 1.0)
            </span>
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
            Menyaring SKU fast-moving &amp; barang bernilai tinggi (loss prevention) di toko Karawang.
          </p>
        </div>

        {/* Gate 2 */}
        <div id="card-gate-2" className="bg-slate-800/60 border border-amber-500/30 rounded-xl p-4 relative overflow-hidden group hover:border-amber-500/60 transition-all">
          <div className="absolute top-0 right-0 bg-amber-600/20 text-amber-300 font-mono text-[10px] font-extrabold px-3 py-1 rounded-bl-lg border-b border-l border-amber-500/30">
            GATE 2
          </div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Pembekuan Penjualan 2 Hari</h3>
          </div>
          <p className="font-mono text-xs font-bold text-amber-400 my-1 leading-snug">
            Sales_Kemarin (H-1) = 0 <br />
            <span className="text-slate-300 font-semibold">
              AND Sales_Dua_Hari_Lalu (H-2) = 0
            </span>
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
            Pembekuan riil: Barang laku tapi nol penjualan selama 2 hari berturut-turut (Closed 2-Day Freeze H-1 &amp; H-2).
          </p>
        </div>

        {/* Gate 3 */}
        <div id="card-gate-3" className="bg-slate-800/60 border border-red-500/30 rounded-xl p-4 relative overflow-hidden group hover:border-red-500/60 transition-all">
          <div className="absolute top-0 right-0 bg-red-600/20 text-red-300 font-mono text-[10px] font-extrabold px-3 py-1 rounded-bl-lg border-b border-l border-red-500/30">
            GATE 3
          </div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-slate-200">Batas Stok Kritis Dinamis</h3>
          </div>
          <p className="font-mono text-xs font-bold text-red-400 my-1 leading-snug">
            Stok_Sistem &le; Max(3, Avg_Sales_7D * 0.3)
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
            Ekspektasi stok semu berbanding lurus dengan velocity barang, memicu auto-replenishment dari DC.
          </p>
        </div>
      </div>
    </div>
  );
};
