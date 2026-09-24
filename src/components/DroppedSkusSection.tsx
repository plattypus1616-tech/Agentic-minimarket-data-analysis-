import React, { useState } from "react";
import { SidakTargetSku } from "../types";
import { formatRupiah } from "../utils/phantomEngine";
import { XCircle, ChevronDown, ChevronUp, Info } from "lucide-react";

interface DroppedSkusSectionProps {
  droppedSkus: SidakTargetSku[];
}

export const DroppedSkusSection: React.FC<DroppedSkusSectionProps> = ({ droppedSkus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const filteredDropped = droppedSkus.filter(
    (sku) =>
      (sku.plu || sku.sku_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sku.nama_sku || sku.nama_barang || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDropped.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filteredDropped.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  return (
    <div id="dropped-skus-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
      <button
        id="btn-toggle-dropped"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-slate-500" />
          <h3 className="text-base font-bold text-slate-300">
            Daftar SKU Gugur Gate ({droppedSkus.length} SKU Dropped)
          </h3>
          <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-0.5 rounded-full border border-slate-700">
            Normal / Non-Phantom
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>{isOpen ? "Sembunyikan" : "Tampilkan SKU Gugur"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-400">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                SKU di bawah ini tidak memenuhi salah satu atau lebih Gate Logika (Pre-Filter DC Status != OOS, Gate 1: Velocity / High-Value Target, Gate 2: Sales 2 Hari == 0, atau Gate 3: Dynamic Days-of-Supply). Paginated max 25 per halaman.
              </p>
            </div>

            {/* Quick Search inside dropped list */}
            <input
              type="text"
              placeholder="Cari SKU Gugur..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="px-3 py-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-slate-500 w-full sm:w-44 shrink-0"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-400 font-mono">
              <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">PLU</th>
                  <th className="py-2.5 px-3">Nama SKU</th>
                  <th className="py-2.5 px-3 text-right">Avg Sales (7D)</th>
                  <th className="py-2.5 px-3 text-center">Sales Kemarin</th>
                  <th className="py-2.5 px-3 text-center">Stok On-Hand</th>
                  <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                  <th className="py-2.5 px-3">Alasan Gugur Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredDropped.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Tidak ada SKU gugur yang sesuai pencarian "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  paginated.map((sku, index) => {
                    const idKey = sku.plu || sku.sku_id || `dropped-${index}`;
                    return (
                      <tr key={`dropped-${idKey}-${startIndex + index}`} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{sku.plu || sku.sku_id}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-medium">{sku.nama_sku || sku.nama_barang}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{sku.avg_sales_7hari ?? sku.avg_sales_harian}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{sku.sales_kemarin}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{sku.stok_sistem_onhand ?? sku.stok_sistem}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatRupiah(sku.harga_satuan)}</td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            {sku.evaluation.failedGates.map((fail, idx) => (
                              <span
                                key={`fail-${idKey}-${startIndex + index}-${idx}`}
                                className="inline-block bg-red-950/60 text-red-400 border border-red-800/60 text-[10px] font-mono px-2 py-0.5 rounded mr-1"
                              >
                                {fail}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredDropped.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-1 text-xs text-slate-400">
              <div>
                Menampilkan <span className="font-mono text-slate-200 font-bold">{startIndex + 1}</span> - <span className="font-mono text-slate-200 font-bold">{Math.min(startIndex + pageSize, filteredDropped.length)}</span> dari <span className="font-mono text-slate-300 font-bold">{filteredDropped.length}</span> SKU Gugur
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 font-mono">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded border border-slate-700 font-semibold transition-colors"
                  >
                    &laquo; Prev
                  </button>

                  <span className="px-3 py-1 bg-slate-950 text-slate-300 rounded border border-slate-800">
                    Hal <strong className="text-slate-200">{currentPage}</strong> / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded border border-slate-700 font-semibold transition-colors"
                  >
                    Next &raquo;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
