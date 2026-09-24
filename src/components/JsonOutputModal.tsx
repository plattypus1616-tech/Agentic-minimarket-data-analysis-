import React, { useState } from "react";
import { X, Copy, Check, Download, Code } from "lucide-react";
import { LaporanPhantomInventoryJson } from "../types";

interface JsonOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: LaporanPhantomInventoryJson;
}

export const JsonOutputModal: React.FC<JsonOutputModalProps> = ({
  isOpen,
  onClose,
  jsonData,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(jsonData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Laporan_Phantom_Inventory_X3XQ_HG2.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="modal-json-overlay" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div id="modal-json-content" className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">
              Output JSON Deterministik (LaporanPhantomInventory)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Output terstruktur sesuai skema Pydantic / Native Structured Output JSON model untuk node Alfamart Tanjung Bungin:
        </p>

        <pre className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96 leading-relaxed">
          {jsonString}
        </pre>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Tersalin ke Clipboard" : "Salin Format JSON"}
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Download File JSON
          </button>
        </div>
      </div>
    </div>
  );
};
