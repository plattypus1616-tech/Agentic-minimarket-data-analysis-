import React, { useState, useEffect } from "react";
import { X, FileSpreadsheet, Copy, Check, ExternalLink, Save } from "lucide-react";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onSaveWebhookUrl,
}) => {
  const [urlInput, setUrlInput] = useState(webhookUrl);
  const [saved, setSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setUrlInput(webhookUrl);
  }, [webhookUrl]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWebhookUrl(urlInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const targetSpreadsheetUrl = "https://docs.google.com/spreadsheets/d/1HLFwoHlZdculXEiLHUXmeAFEtrxTDzUf980DVSa9XoI/edit?usp=drivesdk";

  const appsScriptCode = `function doPost(e) {
  var spreadsheetId = "1HLFwoHlZdculXEiLHUXmeAFEtrxTDzUf980DVSa9XoI";
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Action: cancel -> Batalkan baris berdasarkan nomor baris (row_number)
    if (data.action === "cancel" && data.row_number) {
      var rowToCancel = Number(data.row_number);
      if (rowToCancel > 1 && rowToCancel <= sheet.getLastRow()) {
        sheet.getRange(rowToCancel, 1, 1, sheet.getLastColumn()).setBackground("#fef2f2");
        sheet.getRange(rowToCancel, 10).setValue("CANCELLED / BATAL");
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Baris " + data.row_number + " berhasil dibatalkan",
        row_number: data.row_number
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Action: insert -> Masukkan data sidak baru
    sheet.appendRow([
      new Date(),
      data.sku_id || data.plu || "",
      data.nama_sku || "",
      data.kategori || "General",
      data.avg_sales_7d || data.avg_sales_7hari || 0,
      data.sales_kemarin || 0,
      data.stok_onhand || data.stok_sistem_onhand || 0,
      data.days_to_expire || 0,
      data.harga_satuan || 0,
      "STOK_NOL_SIDAK"
    ]);
    
    var lastRow = sheet.getLastRow();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data berhasil disimpan di baris " + lastRow,
      row_number: lastRow
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div id="modal-sheets-overlay" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div id="modal-sheets-content" className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 text-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">
              Konfigurasi Google Sheets Webhook Audit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Webhook URL Config */}
        <form onSubmit={handleSave} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Google Apps Script Web App URL (Webhook Endpoint)
          </label>
          <div className="flex gap-2">
            <input
              id="input-webhook-url"
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all shrink-0"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Tersimpan!" : "Simpan URL"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Setiap kali tombol <span className="text-slate-300 font-semibold">"Sidak & Nolkan Stok"</span> diklik pada SKU, data audit akan otomatis dikirim ke Google Sheet Anda secara real-time.
          </p>
        </form>

        {/* Setup Guide */}
        <div className="border-t border-slate-800 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              Panduan Instalasi Google Apps Script
            </h4>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? "Kode Disalin!" : "Salin Kode Script"}
            </button>
          </div>

          <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
            <li>Buka Spreadsheet Target: <a href="https://docs.google.com/spreadsheets/d/1HLFwoHlZdculXEiLHUXmeAFEtrxTDzUf980DVSa9XoI/edit?usp=drivesdk" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Buka Google Sheet Audit Log</a> (pastikan ada sheet bernama <code className="text-slate-200">Sheet1</code>).</li>
            <li>Di menu atas, klik <span className="text-slate-200 font-semibold">Extensions</span> &gt; <span className="text-slate-200 font-semibold">Apps Script</span>.</li>
            <li>Hapus semua kode bawaan, lalu paste <span className="text-slate-200 font-semibold">Kode Script</span> di bawah ini (sudah dikonfigurasi hardcode Spreadsheet ID).</li>
            <li>Klik tombol <span className="text-slate-200 font-semibold">Deploy</span> di pojok kanan atas &gt; <span className="text-slate-200 font-semibold">New deployment</span>.</li>
            <li>Pilih Type: <span className="text-slate-200 font-semibold">Web app</span>. Set "Execute as": <span className="text-slate-200 font-semibold">Me</span>, and "Who has access": <span className="text-slate-200 font-semibold">Anyone</span>.</li>
            <li>Salin <span className="text-slate-200 font-semibold">Web app URL</span> yang dihasilkan dan paste ke kolom input di atas.</li>
          </ol>

          <div className="relative">
            <pre className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
              {appsScriptCode}
            </pre>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
          >
            Tutup Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};
