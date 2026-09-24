import { useState, useMemo, useEffect } from "react";
import { HeaderNodeInfo } from "./components/HeaderNodeInfo";
import { GateLogicCards } from "./components/GateLogicCards";
import { TargetSidakTable } from "./components/TargetSidakTable";
import { DroppedSkusSection } from "./components/DroppedSkusSection";
import { RawCsvModal } from "./components/RawCsvModal";
import { JsonOutputModal } from "./components/JsonOutputModal";
import { AiAnalysisModal } from "./components/AiAnalysisModal";
import { GoogleSheetsModal } from "./components/GoogleSheetsModal";
import { TARGET_NODE_INFO, INITIAL_RAW_CSV, INITIAL_SKUS } from "./data/initialData";
import {
  processPhantomInventoryData,
  generateStructuredJsonOutput,
  parseCsvInput,
  parseCsvInputAsync,
} from "./utils/phantomEngine";
import { SidakTargetSku, RawSkuData } from "./types";
import { parseUniversalText } from "./utils/fileParser";
import { CheckCircle, ShieldCheck, FileSpreadsheet, Lock, RefreshCw } from "lucide-react";
import { WEBHOOK_URL } from "./services/api";

export default function App() {
  const [rawCsvText, setRawCsvText] = useState<string>(() => {
    return localStorage.getItem("saved_csv_raw") || INITIAL_RAW_CSV;
  });

  const [rawSkus, setRawSkus] = useState<RawSkuData[]>(() => {
    const saved = localStorage.getItem("saved_csv_raw");
    if (saved) {
      return parseCsvInput(saved);
    }
    return INITIAL_SKUS;
  });

  const [zeroedSkuIds, setZeroedSkuIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("audited_sku_ids");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load audited_sku_ids from localStorage", e);
    }
    return new Set();
  });

  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Sync zeroed SKU IDs to localStorage whenever zeroedSkuIds state changes
  useEffect(() => {
    try {
      localStorage.setItem("audited_sku_ids", JSON.stringify(Array.from(zeroedSkuIds)));
    } catch (e) {
      console.error("Failed to save audited_sku_ids to localStorage", e);
    }
  }, [zeroedSkuIds]);

  // Google Sheets Webhook URL state
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    const saved = localStorage.getItem("alfamart_sheets_webhook_url");
    if (!saved || saved.includes("AKfycbwibO5o1ywJjtCZ3irzJeju3als_tTo2kgzazplmrx9WhJg1dwatronc6") || saved.includes("AKfycbz5buqsFt87Ao8CNxstn14z56673D5T0ASuzdLTFbGFWGPjO1toxBSrnAXMfd4Wt0BnOg")) {
      return WEBHOOK_URL;
    }
    return saved;
  });

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Visibility States
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Save webhook URL to localStorage
  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem("alfamart_sheets_webhook_url", url);
    showToast("URL Webhook Google Sheets berhasil disimpan!");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Process data with 3 Gate Logic
  const { survivingSkus, droppedSkus, totalGmvDailyLossRescued } = useMemo(() => {
    const processed = processPhantomInventoryData(rawSkus, { minAvgSales: 3.0, maxStock: 5 });

    // Apply local zero-out statuses
    const updatedSurviving = processed.survivingSkus.map((sku) => {
      if (zeroedSkuIds.has(sku.sku_id)) {
        return {
          ...sku,
          sidak_status: "STOK_DI_NOLKAN" as const,
        };
      }
      return sku;
    });

    return {
      survivingSkus: updatedSurviving,
      droppedSkus: processed.droppedSkus,
      totalGmvDailyLossRescued: processed.totalGmvDailyLossRescued,
    };
  }, [rawSkus, zeroedSkuIds]);

  // Active pending SKUs (not zeroed yet)
  const activePendingSkus = useMemo(() => {
    return survivingSkus.filter((sku) => !zeroedSkuIds.has(sku.plu || sku.sku_id || ""));
  }, [survivingSkus, zeroedSkuIds]);

  // Active pending count & daily loss for reactive KPI summary cards
  const activePendingTargetCount = activePendingSkus.length;
  const activeDailyLossGmv = useMemo(() => {
    return activePendingSkus.reduce((sum, item) => sum + (item.loss_amount || 0), 0);
  }, [activePendingSkus]);

  // Generate structured JSON output for LaporanPhantomInventory
  const jsonOutput = useMemo(() => {
    return generateStructuredJsonOutput(survivingSkus, TARGET_NODE_INFO.name);
  }, [survivingSkus]);

  // Helper to send webhook log to Google Sheets
  const sendAuditWebhook = async (item: SidakTargetSku) => {
    const plu = item.plu || item.sku_id || "";
    const nama_sku = item.nama_sku || item.nama_barang || "";
    const avg_sales_7hari = item.avg_sales_7hari ?? item.avg_sales_harian ?? 0;
    const sales_kemarin = item.sales_kemarin ?? 0;
    const sales_dua_hari_lalu = item.sales_dua_hari_lalu ?? 0;
    const stok_sistem_onhand = item.stok_sistem_onhand ?? item.stok_sistem ?? 0;
    const harga_satuan = item.harga_satuan ?? 0;
    const status_dc = item.status_dc || "NORMAL";
    const loss_amount = item.loss_amount ?? item.potensi_kerugian_harian ?? (stok_sistem_onhand * harga_satuan);

    const payload = {
      plu,
      nama_sku,
      avg_sales_7hari,
      sales_kemarin,
      sales_dua_hari_lalu,
      stok_sistem_onhand,
      harga_satuan,
      status_dc,
      loss_amount,
      store_location: TARGET_NODE_INFO.name,
      timestamp: new Date().toLocaleString("id-ID"),
    };

    if (!webhookUrl) {
      showToast(`Stok ${plu} dinolkan (Webhook URL belum dikonfigurasi)`);
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      showToast(`Logged to Google Sheets: ${plu} - ${nama_sku}`);
    } catch (err) {
      console.error("Webhook logging error:", err);
      showToast(`Stok ${plu} dinolkan (Gagal mengirim ke Google Sheets)`);
    }
  };

  // Mandatory Individual Audit Action: Sidak & Nolkan Stok
  const handleExecuteZeroStock = (skuId: string) => {
    if (zeroedSkuIds.has(skuId)) return; // Prevent duplicate execution during API transit

    const targetItem = survivingSkus.find((s) => (s.plu || s.sku_id) === skuId);

    // 1. Update state immediately so KPI cards and table state update instantly
    setZeroedSkuIds((prev) => {
      const next = new Set(prev);
      next.add(skuId);
      return next;
    });

    // 2. Trigger Google Sheets webhook asynchronously in background
    if (targetItem) {
      sendAuditWebhook(targetItem);
    }
  };

  // Fungsi Pembatalan Eksekusi (Rollback)
  const handleUndoZeroStock = (skuId: string) => {
    setZeroedSkuIds((prev) => {
      const next = new Set(prev);
      next.delete(skuId); // Mencabut SKU dari status 'NOL'
      return next;
    });
    showToast(`Eksekusi sidak dibatalkan. Stok SKU dikembalikan ke sistem.`);
  };

  // CSV / Universal Data Update (Async & Persistent)
  const handleUpdateCsv = async (newCsv: string) => {
    setRawCsvText(newCsv);
    localStorage.setItem("saved_csv_raw", newCsv);
    setIsParsing(true);
    try {
      const parsed = parseUniversalText(newCsv);
      if (parsed.length > 0) {
        setRawSkus(parsed);
        setZeroedSkuIds(new Set()); // Reset zeroed statuses for new dataset
        localStorage.setItem("audited_sku_ids", JSON.stringify([]));
        showToast(`Dataset baru dimuat: ${parsed.length} SKU terurai.`);
      } else {
        showToast("Format CSV/Data tidak valid atau kosong.");
      }
    } catch (err) {
      console.error("Error parsing CSV/Data:", err);
      showToast("Gagal menguraikan data CSV.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-900 pb-12 relative">
      {/* Async Parsing Overlay / Floating Banner */}
      {isParsing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-950/90 border border-amber-500 text-amber-200 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono font-bold backdrop-blur-md animate-pulse">
          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
          <span>Memproses & mengevaluasi dataset CSV (3000+ SKU) secara asinkron...</span>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900/90 border border-emerald-600 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-xs font-semibold backdrop-blur-md">
          <FileSpreadsheet className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Node & Operational Header */}
      <HeaderNodeInfo
        nodeInfo={TARGET_NODE_INFO}
        survivingSkus={survivingSkus}
        totalRaw={rawSkus.length}
        dailyRescuedGmv={activeDailyLossGmv}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
      />

      {/* Main Operational Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 space-y-6">
        {/* Node Location Lock Banner */}
        <div id="node-lock-banner" className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                Geospatial Isolation Active
              </p>
              <p className="text-sm font-semibold text-slate-200">
                Target Node: Enterprise Alfamidi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {webhookUrl ? (
              <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-700/80 text-xs font-mono px-3 py-1 rounded-lg flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Google Sheets Logging Active
              </span>
            ) : (
              <button
                onClick={() => setIsSheetsModalOpen(true)}
                className="bg-amber-950/80 text-amber-300 border border-amber-700/80 text-xs font-mono px-3 py-1 rounded-lg flex items-center gap-1.5 font-semibold hover:bg-amber-900/80 transition-colors"
              >
                ⚠️ Google Sheets Webhook Belum Diset
              </button>
            )}

            <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-3 py-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Data Masking Active: AI only reads numeric codes.</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Deterministic Engine v1.0</span>
            </div>
          </div>
        </div>

        {/* 3 Gate Logic Visualizer */}
        <GateLogicCards minAvgSales={3.0} maxStock={5} />

        {/* Surviving SKUs - Priority Target Table */}
        <TargetSidakTable
          survivingSkus={survivingSkus}
          onExecuteZeroStock={handleExecuteZeroStock}
          onUndoZeroStock={handleUndoZeroStock}
          webhookUrl={webhookUrl}
        />

        {/* Dropped SKUs - Failure Reasons Accordion */}
        <DroppedSkusSection droppedSkus={droppedSkus} />

        {/* Footer Summary / Verification status */}
        <footer className="text-center py-6 text-xs text-slate-500 space-y-1 border-t border-slate-900">
          <p className="font-mono">
            Node: Enterprise Alfamidi | Sistem Audit Internal
          </p>
          <p className="flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" />
            Phantom Inventory Auto-Replenishment & Google Sheets Audit Engine &copy; 2026
          </p>
        </footer>
      </main>

      {/* Modals */}
      <RawCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        rawCsvText={rawCsvText}
        onUpdateCsv={handleUpdateCsv}
        rawSkus={rawSkus}
      />

      <JsonOutputModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        jsonData={jsonOutput}
      />

      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        nodeInfo={TARGET_NODE_INFO}
        filteredSkus={survivingSkus}
      />

      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        webhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
      />
    </div>
  );
}
