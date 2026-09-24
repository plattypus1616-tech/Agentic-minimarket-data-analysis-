import React, { useState, useEffect } from "react";
import { SidakTargetSku, SidakItemState } from "../types";
import { sendSidakToSheets } from "../services/api";
import { formatRupiah } from "../utils/phantomEngine";
import { Search, CheckCircle, AlertCircle, ArrowUpDown, ChevronDown, ChevronUp, FileSpreadsheet, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";

interface TargetSidakTableProps {
  survivingSkus: SidakTargetSku[];
  onExecuteZeroStock: (skuId: string) => void;
  onUndoZeroStock: (skuId: string) => void;
  webhookUrl?: string;
}

interface SidakActionCellProps {
  item: SidakTargetSku;
  pluKey: string;
  isZeroed: boolean;
  onExecuteZeroStock: (skuId: string) => void;
  onUndoZeroStock: (skuId: string) => void;
  webhookUrl?: string;
}

export const SidakActionCell: React.FC<SidakActionCellProps> = ({
  item,
  pluKey,
  isZeroed,
  onExecuteZeroStock,
  onUndoZeroStock,
  webhookUrl,
}) => {
  const [sidakState, setSidakState] = useState<SidakItemState>(() => ({
    isProcessing: false,
    rowNumber: null,
    status: isZeroed ? "SAVED" : "IDLE",
  }));

  useEffect(() => {
    if (!isZeroed && sidakState.status === "SAVED") {
      setSidakState({ isProcessing: false, rowNumber: null, status: "IDLE" });
    } else if (isZeroed && sidakState.status === "IDLE") {
      setSidakState((prev) => ({ ...prev, status: "SAVED" }));
    }
  }, [isZeroed]);

  // Eksekusi Sidak (INSERT)
  const handleSidak = async () => {
    setSidakState((prev) => ({ ...prev, isProcessing: true }));

    const res = await sendSidakToSheets(
      {
        action: "insert",
        sku_id: item.plu || item.sku_id || "",
        nama_sku: item.nama_sku || item.nama_barang || "",
        kategori: item.kategori || "General",
        avg_sales_7d: Number(item.avg_sales_7hari ?? item.avg_sales_harian ?? 0),
        sales_kemarin: Number(item.sales_kemarin ?? 0),
        stok_onhand: Number(item.stok_sistem_onhand ?? item.stok_sistem ?? 0),
        days_to_expire: Number(item.days_to_expire ?? 30),
        harga_satuan: Number(item.harga_satuan ?? 0),
        stok_sistem: Number(item.stok_sistem_onhand ?? item.stok_sistem ?? 0),
        harga: Number(item.harga_satuan ?? 0),
        potensi_rugi: item.loss_amount ?? ((item.stok_sistem_onhand ?? item.stok_sistem ?? 0) * (item.harga_satuan ?? 0)),
      },
      webhookUrl
    );

    if (res.status === "success" && res.row_number) {
      setSidakState({
        isProcessing: false,
        rowNumber: res.row_number, // Simpan nomor baris dari Sheets
        status: "SAVED",
      });
      onExecuteZeroStock(pluKey);
    } else {
      onExecuteZeroStock(pluKey);
      setSidakState({
        isProcessing: false,
        rowNumber: res.row_number || null,
        status: "SAVED",
      });
    }
  };

  // Eksekusi Batal (CANCEL/UPDATE)
  const handleCancel = async () => {
    setSidakState((prev) => ({ ...prev, isProcessing: true }));

    if (sidakState.rowNumber) {
      const res = await sendSidakToSheets(
        {
          action: "cancel",
          row_number: sidakState.rowNumber, // Kirim nomor baris yang ingin dianulir
        },
        webhookUrl
      );

      if (res.status === "success") {
        setSidakState({
          isProcessing: false,
          rowNumber: null,
          status: "CANCELLED",
        });
        onUndoZeroStock(pluKey);
      } else {
        setSidakState((prev) => ({ ...prev, isProcessing: false }));
        onUndoZeroStock(pluKey);
      }
    } else {
      onUndoZeroStock(pluKey);
      setSidakState({
        isProcessing: false,
        rowNumber: null,
        status: "CANCELLED",
      });
    }
  };

  return (
    <td className="py-3 px-3 text-center">
      {/* Tampilan Tombol Dinamis Berdasarkan Status */}
      {sidakState.status === "IDLE" && (
        <button
          id={`btn-zero-stock-${pluKey}`}
          onClick={handleSidak}
          disabled={sidakState.isProcessing}
          className="px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 mx-auto bg-red-600 hover:bg-red-500 text-white shadow-sm hover:shadow-red-900/40 cursor-pointer disabled:opacity-50"
        >
          {sidakState.isProcessing ? (
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Proses...
            </span>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" /> Sidak &amp; Nolkan
            </>
          )}
        </button>
      )}

      {sidakState.status === "SAVED" && (
        <div className="flex flex-col items-center gap-1.5">
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-950 border border-emerald-700 text-emerald-400 cursor-default flex items-center justify-center gap-1 mx-auto">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            {sidakState.rowNumber ? `✓ Baris #${sidakState.rowNumber}` : "Stok 0"}
          </span>
          <button
            id={`btn-batal-${pluKey}`}
            onClick={handleCancel}
            disabled={sidakState.isProcessing}
            className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 hover:text-red-100 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {sidakState.isProcessing ? "Membatalkan..." : "Batal / Undo"}
          </button>
        </div>
      )}

      {sidakState.status === "CANCELLED" && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-red-400 text-[11px] font-mono italic">Status: DIBATALKAN</span>
          <button
            onClick={handleSidak}
            disabled={sidakState.isProcessing}
            className="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer disabled:opacity-50"
          >
            [Sidak Ulang]
          </button>
        </div>
      )}
    </td>
  );
};

export const TargetSidakTable: React.FC<TargetSidakTableProps> = ({
  survivingSkus,
  onExecuteZeroStock,
  onUndoZeroStock,
  webhookUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const filtered = survivingSkus.filter(
    (item) =>
      (item.plu || item.sku_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nama_sku || item.nama_barang || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.kategori || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const toggleExpand = (plu: string) => {
    setExpandedSku(expandedSku === plu ? null : plu);
  };

  const pendingCount = survivingSkus.filter((s) => s.sidak_status !== "STOK_DI_NOLKAN").length;

  return (
    <div id="target-sidak-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Table Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Daftar Target Node Matrix (Priority Queue)
            </h2>
            <span className="bg-red-950/80 text-red-400 border border-red-800 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
              {pendingCount} Pending Audit ({survivingSkus.length} Total Target)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluasi Alfamidi Dual Node State: <strong className="text-amber-400">Phantom Inventory</strong> (Anomali Data) &amp; <strong className="text-purple-400">Peluruhan Modal Temporal</strong> (Spoilage Risk Fresh/Dairy).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-search-sku"
              type="text"
              placeholder="Cari PLU / Nama SKU / Kategori..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:border-red-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
            <tr>
              <th className="py-3 px-3 w-10 text-center">Rank</th>
              <th className="py-3 px-3 font-semibold">PLU</th>
              <th className="py-3 px-3 font-semibold">Nama SKU &amp; Kategori</th>
              <th className="py-3 px-3 font-semibold text-center">Evaluasi Risk</th>
              <th className="py-3 px-3 font-semibold text-right">Avg Sales (7D)</th>
              <th className="py-3 px-3 font-semibold text-center">Stok On-Hand</th>
              <th className="py-3 px-3 font-semibold text-right">Harga Satuan</th>
              <th className="py-3 px-3 font-semibold text-right text-red-400 flex items-center justify-end gap-1">
                <span>Loss / Waste Value</span>
                <ArrowUpDown className="w-3 h-3" />
              </th>
              <th className="py-3 px-3 font-semibold text-center">Aksi Sidak Fisik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  Tidak ada SKU target sidak yang sesuai dengan pencarian "{searchTerm}".
                </td>
              </tr>
            ) : (
              paginated.map((sku, index) => {
                const globalRank = startIndex + index + 1;
                const isZeroed = sku.sidak_status === "STOK_DI_NOLKAN";
                const pluKey = sku.plu || sku.sku_id || `PLU-${index}`;
                const isExpanded = expandedSku === pluKey;
                const lossVal = sku.loss_amount ?? (sku.stok_sistem_onhand * sku.harga_satuan);
                const wasteVal = sku.projectedWasteValue || 0;
                const totalExposure = lossVal + wasteVal;

                return (
                  <React.Fragment key={`target-${pluKey}-${startIndex + index}`}>
                    <tr
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isZeroed ? "bg-emerald-950/20" : sku.spoilageRisk ? "bg-purple-950/20" : sku.phantomRisk ? "bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                        #{globalRank}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {sku.plu || sku.sku_id}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-100 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span>{sku.nama_sku || sku.nama_barang}</span>
                            <button
                              onClick={() => toggleExpand(pluKey)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="Detail Evaluasi Node"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-semibold">
                              {sku.kategori || "Grocery"}
                            </span>
                            <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                              Exp: {sku.days_to_expire ?? 30} Hari
                            </span>
                            <span className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                              DC: {sku.status_dc || "NORMAL"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Evaluasi Risk Badges */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1 font-mono text-[10px]">
                          {sku.phantomRisk && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Phantom Risk
                            </span>
                          )}
                          {sku.spoilageRisk && (
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Spoilage Risk
                            </span>
                          )}
                          {!sku.phantomRisk && !sku.spoilageRisk && (
                            <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                              Gate Target
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-400">
                        {(sku.avg_sales_7hari ?? sku.avg_sales_harian ?? 0).toFixed(1)} /hr
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isZeroed
                              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                              : "bg-red-900/60 text-red-300 border border-red-700"
                          }`}
                        >
                          {isZeroed ? "0 (DI-NOLKAN)" : `${sku.stok_sistem_onhand ?? sku.stok_sistem} unit`}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {formatRupiah(sku.harga_satuan)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-extrabold text-red-400 text-sm">
                        <div>{formatRupiah(totalExposure)}</div>
                        {wasteVal > 0 && (
                          <div className="text-[10px] text-purple-300 font-normal">
                            Waste: {formatRupiah(wasteVal)} ({sku.deadUnits} dead units)
                          </div>
                        )}
                      </td>

                      <SidakActionCell
                        item={sku}
                        pluKey={pluKey}
                        isZeroed={isZeroed}
                        onExecuteZeroStock={onExecuteZeroStock}
                        onUndoZeroStock={onUndoZeroStock}
                        webhookUrl={webhookUrl}
                      />
                    </tr>

                    {/* Expanded Math & Evaluasi Node State Details */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800">
                        <td colSpan={9} className="p-3 pl-12">
                          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                            <div className="font-mono text-amber-300 font-semibold flex items-center gap-2">
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              Detail Evaluasi Node State ({pluKey}):
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                              {/* Phantom Risk Logic Box */}
                              <div className="bg-slate-950 p-2.5 rounded border border-amber-900/50 space-y-1">
                                <span className="text-amber-400 font-bold block uppercase tracking-wider">1. Phantom Inventory Check:</span>
                                <p>Avg Sales (7D) = {sku.avg_sales_7hari} (Req: &ge; 3.0)</p>
                                <p>Sales Kemarin = {sku.sales_kemarin} (Req: == 0)</p>
                                <p>Stok On-Hand = {sku.stok_sistem_onhand} (Req: &gt; 0)</p>
                                <p className="pt-1">
                                  Status Phantom Risk:{" "}
                                  <span className={sku.phantomRisk ? "text-amber-400 font-bold" : "text-slate-500"}>
                                    {sku.phantomRisk ? "TRUE (ANOMALI DATA)" : "FALSE"}
                                  </span>
                                </p>
                              </div>

                              {/* Spoilage Risk (Temporal Modal Decay) Box */}
                              <div className="bg-slate-950 p-2.5 rounded border border-purple-900/50 space-y-1">
                                <span className="text-purple-300 font-bold block uppercase tracking-wider">2. Peluruhan Modal Temporal:</span>
                                <p>Kategori = {sku.kategori || "Grocery"}</p>
                                <p>Days to Expire = {sku.days_to_expire ?? 30} Hari (Req: &le; 3)</p>
                                <p>Projected Demand = {sku.avg_sales_7hari} &times; {sku.days_to_expire ?? 30} = {(sku.projectedDemand ?? 0).toFixed(1)} unit</p>
                                <p>Dead Units = Math.ceil({sku.stok_sistem_onhand} - {(sku.projectedDemand ?? 0).toFixed(1)}) = {sku.deadUnits ?? 0} unit</p>
                                <p className="pt-1">
                                  Projected Waste Value = {sku.deadUnits ?? 0} &times; {formatRupiah(sku.harga_satuan)} ={" "}
                                  <span className="text-purple-300 font-bold">{formatRupiah(sku.projectedWasteValue || 0)}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-1 text-xs text-slate-400 border-t border-slate-800">
          <div>
            Menampilkan <span className="font-mono text-slate-200 font-bold">{startIndex + 1}</span> - <span className="font-mono text-slate-200 font-bold">{Math.min(startIndex + pageSize, filtered.length)}</span> dari <span className="font-mono text-amber-400 font-bold">{filtered.length}</span> SKU Target
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
                Hal <strong className="text-amber-400">{currentPage}</strong> / {totalPages}
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
  );
};
