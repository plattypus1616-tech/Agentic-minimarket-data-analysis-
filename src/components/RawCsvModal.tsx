import React, { useState, useRef, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Upload,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Download,
  FileText,
  AlertCircle,
  RefreshCw,
  Table,
  ShieldCheck,
} from "lucide-react";
import { RawSkuData } from "../types";
import { parseCsvInputAsync, skusToCsv, sanitizeNumber } from "../utils/phantomEngine";
import { parseUniversalFile, parseUniversalText } from "../utils/fileParser";
import { INITIAL_RAW_CSV } from "../data/initialData";

interface RawCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawCsvText: string;
  onUpdateCsv: (newCsv: string) => void;
  rawSkus: RawSkuData[];
}

export const RawCsvModal: React.FC<RawCsvModalProps> = ({
  isOpen,
  onClose,
  rawCsvText,
  onUpdateCsv,
  rawSkus,
}) => {
  const [dataset, setDataset] = useState<RawSkuData[]>(rawSkus);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");
  const [rawTextEdit, setRawTextEdit] = useState(rawCsvText);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 20;

  // Sync state when modal opens or rawSkus changes
  useEffect(() => {
    setDataset(rawSkus);
    setRawTextEdit(rawCsvText);
  }, [rawSkus, rawCsvText, isOpen]);

  if (!isOpen) return null;

  // Handle Automatic Parsing from Universal File (.xlsx, .xls, .csv, .tsv)
  const handleFile = async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setStatusMsg(`Membaca file "${file.name}"...`);

    try {
      const parsed = await parseUniversalFile(file);
      if (parsed.length > 0) {
        setDataset(parsed);
        const csvStr = skusToCsv(parsed);
        setRawTextEdit(csvStr);
        // Automatic update into parent app state (No copy-paste or manual submit needed!)
        onUpdateCsv(csvStr);
        setStatusMsg(`✅ Berhasil! ${parsed.length} SKU otomatis terurai & dievaluasi dari "${file.name}".`);
      } else {
        setStatusMsg("❌ File kosong atau format data tidak dapat dikenali.");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("❌ Gagal menguraikan file. Pastikan format .xlsx, .csv, atau .tsv valid.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Cell Edit Handlers
  const handleCellChange = (indexInDataset: number, field: keyof RawSkuData, value: string | number) => {
    const next = [...dataset];
    const target = { ...next[indexInDataset] };

    if (field === "plu" || field === "nama_sku" || field === "sku_id" || field === "nama_barang") {
      target[field] = value as string;
      if (field === "plu") target.sku_id = value as string;
      if (field === "nama_sku") target.nama_barang = value as string;
    } else {
      const isInt = field === "harga_satuan" || field === "sales_kemarin" || field === "stok_sistem_onhand" || field === "stok_sistem";
      const numVal = sanitizeNumber(value, isInt);
      target[field] = numVal as never;
      if (field === "avg_sales_7hari") target.avg_sales_harian = numVal;
      if (field === "stok_sistem_onhand") target.stok_sistem = numVal;
    }

    next[indexInDataset] = target;
    setDataset(next);

    // Auto update parent app state
    const newCsv = skusToCsv(next);
    setRawTextEdit(newCsv);
    onUpdateCsv(newCsv);
  };

  const handleAddRow = () => {
    const pluNew = `${Date.now().toString().slice(-6)}`;
    const newSku: RawSkuData = {
      plu: pluNew,
      nama_sku: "Barang Baru (Audit)",
      avg_sales_7hari: 5.0,
      sales_kemarin: 0,
      sales_dua_hari_lalu: 0,
      stok_sistem_onhand: 1,
      harga_satuan: 10000,
      status_dc: "NORMAL",
      sku_id: pluNew,
      nama_barang: "Barang Baru (Audit)",
      avg_sales_harian: 5.0,
      stok_sistem: 1,
    };
    const next = [newSku, ...dataset];
    setDataset(next);
    const newCsv = skusToCsv(next);
    setRawTextEdit(newCsv);
    onUpdateCsv(newCsv);
    setStatusMsg("SKU baru berhasil ditambahkan.");
  };

  const handleDeleteRow = (plu: string) => {
    const next = dataset.filter((s) => (s.plu || s.sku_id) !== plu);
    setDataset(next);
    const newCsv = skusToCsv(next);
    setRawTextEdit(newCsv);
    onUpdateCsv(newCsv);
    setStatusMsg(`PLU ${plu} telah dihapus.`);
  };

  const handleReset = () => {
    onUpdateCsv(INITIAL_RAW_CSV);
    setStatusMsg("Dataset berhasil di-reset ke data awal.");
  };

  const handleCopy = () => {
    const currentCsv = skusToCsv(dataset);
    navigator.clipboard.writeText(currentCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const currentCsv = skusToCsv(dataset);
    const blob = new Blob([currentCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Data_Audit_Phantom_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Pagination logic
  const filtered = dataset.filter(
    (s) =>
      s.sku_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nama_barang.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div
      id="modal-csv-overlay"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6"
    >
      <div
        id="modal-csv-content"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Kelola & Upload Dataset CSV Audit
              </h3>
              <p className="text-xs text-slate-400">
                Pilih file CSV dari komputer Anda. Data diuraikan & di-filter otomatis tanpa perlu copy-paste.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMsg && (
          <div className="bg-slate-800/80 border-b border-slate-700/60 px-6 py-2.5 text-xs text-amber-300 font-medium flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              {statusMsg}
            </span>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-mono"
            >
              tutup
            </button>
          </div>
        )}

        {/* Modal Main Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Native Drag and Drop Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
                : "border-slate-700/80 bg-slate-950/60 hover:border-amber-500/60 hover:bg-slate-800/40"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv, .tsv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-100">
                Tarik &amp; Lepaskan File <span className="text-amber-400">.XLSX, .CSV, atau .TSV</span> di sini, atau klik tombol di bawah
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Format: PLU, Nama_SKU, Avg_Sales_7Hari, Sales_Kemarin, Sales_Dua_Hari_Lalu, Stok_Sistem_OnHand, Harga_Satuan, Status_DC
              </p>
            </div>

            <button
              type="button"
              className="mt-1 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Menguraikan File...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Pilih File Data Audit (.XLSX / .CSV / .TSV)
                </>
              )}
            </button>

            {/* UI TRUST BADGE */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-800/80 shadow-sm mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              100% Local Processing. Supports Excel (.xlsx), CSV, and TSV.
            </div>
          </div>

          {/* Interactive Mode Toolbar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  viewMode === "table"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Table className="w-4 h-4" /> Tabel Data Interaktif
              </button>

              <button
                onClick={() => setViewMode("raw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  viewMode === "raw"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-4 h-4" /> Teks Raw CSV
              </button>

              <span className="text-xs text-slate-500 font-mono border-l border-slate-800 pl-3 hidden md:inline">
                Total: <strong className="text-slate-200">{dataset.length}</strong> SKU Parsed
              </span>
            </div>

            {viewMode === "table" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari SKU / Barang..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg focus:outline-none focus:border-amber-500 w-full sm:w-48"
                  />
                </div>

                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 shadow"
                >
                  <Plus className="w-4 h-4" /> SKU Baru
                </button>
              </div>
            )}
          </div>

          {/* Interactive Data Table View */}
          {viewMode === "table" ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">PLU</th>
                      <th className="py-2.5 px-3">Nama SKU</th>
                      <th className="py-2.5 px-3 text-right">Avg Sales (7D)</th>
                      <th className="py-2.5 px-3 text-center">Sales Kemarin</th>
                      <th className="py-2.5 px-3 text-center">Sales 2D Ago</th>
                      <th className="py-2.5 px-3 text-center">Stok On-Hand</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-center">Status DC</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500">
                          Tidak ada data SKU ditemukan.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row) => {
                        const pluKey = row.plu || row.sku_id;
                        const originalIndex = dataset.findIndex((d) => (d.plu || d.sku_id) === pluKey);
                        const stokVal = row.stok_sistem_onhand ?? row.stok_sistem ?? 0;
                        const avgSalesVal = row.avg_sales_7hari ?? row.avg_sales_harian ?? 0;

                        return (
                          <tr key={pluKey} className="hover:bg-slate-800/40">
                            {/* PLU */}
                            <td className="py-2 px-3 font-mono font-bold text-amber-400 w-28">
                              <input
                                type="text"
                                value={row.plu || row.sku_id}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "plu", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1.5 py-1 text-xs font-mono font-bold text-amber-400"
                              />
                            </td>

                            {/* Nama SKU */}
                            <td className="py-2 px-3 text-slate-200">
                              <input
                                type="text"
                                value={row.nama_sku || row.nama_barang}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "nama_sku", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-xs text-slate-200"
                              />
                            </td>

                            {/* Avg Sales 7Hari */}
                            <td className="py-2 px-3 text-right w-20">
                              <input
                                type="number"
                                step="0.1"
                                value={avgSalesVal}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "avg_sales_7hari", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1.5 py-1 text-xs text-right font-mono text-slate-300"
                              />
                            </td>

                            {/* Sales Kemarin */}
                            <td className="py-2 px-3 text-center w-20">
                              <input
                                type="number"
                                value={row.sales_kemarin}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "sales_kemarin", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1.5 py-1 text-xs text-center font-mono text-slate-300"
                                title="Sales Kemarin"
                              />
                            </td>

                            {/* Sales 2D Ago */}
                            <td className="py-2 px-3 text-center w-20">
                              <input
                                type="number"
                                value={row.sales_dua_hari_lalu ?? 0}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "sales_dua_hari_lalu", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1.5 py-1 text-xs text-center font-mono text-slate-300"
                                title="Sales 2 Hari Lalu"
                              />
                            </td>

                            {/* Stok On-Hand */}
                            <td className="py-2 px-3 w-20 text-center">
                              <input
                                type="number"
                                value={stokVal}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "stok_sistem_onhand", e.target.value)
                                }
                                className={`w-full bg-slate-900 border rounded px-1.5 py-1 text-xs text-center font-mono font-bold ${
                                  stokVal < 5
                                    ? "border-red-500/80 text-red-400 bg-red-950/30"
                                    : "border-slate-800 text-slate-300"
                                } focus:border-amber-500`}
                              />
                            </td>

                            {/* Harga Satuan */}
                            <td className="py-2 px-3 text-right w-24">
                              <input
                                type="number"
                                value={row.harga_satuan}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "harga_satuan", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1.5 py-1 text-xs text-right font-mono text-slate-300"
                              />
                            </td>

                            {/* Status DC */}
                            <td className="py-2 px-3 text-center w-24">
                              <select
                                value={row.status_dc || "NORMAL"}
                                onChange={(e) =>
                                  handleCellChange(originalIndex, "status_dc", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1 py-1 text-[11px] text-center font-mono text-emerald-400"
                              >
                                <option value="NORMAL">NORMAL</option>
                                <option value="OOS">OOS</option>
                                <option value="EMPTY">EMPTY</option>
                              </select>
                            </td>

                            {/* Delete Action */}
                            <td className="py-2 px-3 text-center w-12">
                              <button
                                onClick={() => handleDeleteRow(pluKey)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                title="Hapus SKU"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                  <div>
                    Menampilkan <strong className="text-slate-200">{startIndex + 1}</strong> -{" "}
                    <strong className="text-slate-200">
                      {Math.min(startIndex + pageSize, filtered.length)}
                    </strong>{" "}
                    dari <strong className="text-amber-400">{filtered.length}</strong> SKU
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded border border-slate-700"
                      >
                        &laquo; Prev
                      </button>

                      <span className="px-3 py-1 bg-slate-950 text-slate-300 rounded border border-slate-800">
                        Hal <strong className="text-amber-400">{currentPage}</strong> / {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded border border-slate-700"
                      >
                        Next &raquo;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Raw Text Area View - Smart Universal Parsing (CSV, TSV, Google Sheets Paste) */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Tempel / Ketik Teks Raw (Mendukung Tab-Separated Google Sheets / Excel / CSV):</span>
                <span className="text-[11px] text-amber-400">Pasti terurai otomatis (Comma / Tab)</span>
              </div>
              <textarea
                value={rawTextEdit}
                onChange={(e) => {
                  const val = e.target.value;
                  setRawTextEdit(val);
                  const parsed = parseUniversalText(val);
                  if (parsed.length > 0) {
                    setDataset(parsed);
                    const newCsv = skusToCsv(parsed);
                    onUpdateCsv(newCsv);
                  } else {
                    onUpdateCsv(val);
                  }
                }}
                placeholder="Paste data dari Google Sheets / Excel / CSV / TSV di sini..."
                rows={14}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 bg-slate-900 border-t border-slate-800 shrink-0">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" /> Reset ke Dataset Default
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Tersalin!" : "Salin CSV"}
            </button>

            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" /> Export CSV
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Selesai &amp; Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
