import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      node: "Alfamidi General Node",
      location: "Indonesia"
    });
  });

  // API endpoint for Gemini retail analytics / sidak recommendations
  app.post("/api/analyze-inventory", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured in server environment" });
      }

      const ai = new GoogleGenAI({ apiKey });

      const { nodeInfo, filteredSkus } = req.body;

      // Privacy Guard: Heavily strip any payload to strictly 3 numeric variables: sku_id, stok_sistem, avg_sales
      const sanitizedSkus = Array.isArray(filteredSkus)
        ? filteredSkus.map((s: any) => ({
            sku_id: String(s.sku_id || ""),
            stok_sistem: Number(s.stok_sistem || 0),
            avg_sales: Number(s.avg_sales || s.avg_sales_harian || 0),
          }))
        : [];

      const systemInstruction = `Identitas: Retail Data Architect untuk sistem jaringan Alfamidi.
Objektif: Analisis Phantom Inventory berbasis data masked 3 variabel numerik (sku_id, stok_sistem, avg_sales).
Aturan Privasi Data: Data produk telah di-masking secara otomatis. Tidak ada nama barang atau harga yang dikirim ke AI.
Tugas: Berikan analisis taktis sidak fisik berdasarkan kode SKU ID dan pola numerik sisa stok vs rata-rata penjualan.`;

      const prompt = `Node Toko: ${nodeInfo?.name || "Alfamidi"} (${nodeInfo?.nodeId || "GLOBAL-NODE"})

Daftar SKU Target Sidak (Masked Data - 3 Variabel Numerik: sku_id, stok_sistem, avg_sales):
${JSON.stringify(sanitizedSkus, null, 2)}

Mohon berikan laporan taktis singkat:
1. Evaluasi Pola Anomali Stok vs Rata-rata Penjualan
2. Rekomendasi Langkah Sidak Fisik Prioritas (Lokasi Rak vs Gudang Belakang vs Cek Kasir)
3. Instruksi Auto-Replenishment (Prosedur Eksekusi Nolkan Stok di POS/ERP)`;

      const is503Error = (err: any): boolean => {
        if (!err) return false;
        const status = err.status || err.statusCode || err.code;
        if (status === 503 || status === "503" || status === "UNAVAILABLE") return true;
        const msg = (err.message || String(err)).toLowerCase();
        return (
          msg.includes("503") ||
          msg.includes("unavailable") ||
          msg.includes("service unavailable") ||
          msg.includes("high demand")
        );
      };

      const primaryModel = "gemini-3.5-flash-lite";
      const fallbackModel = "gemini-3.5-flash";
      const delays = [2000, 4000, 8000]; // ~2s, 4s, 8s
      let response: any = null;
      let lastError: any = null;

      // Primary model with up to 3 retries (total 4 attempts) for 503 errors
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: primaryModel,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });
          break;
        } catch (err: any) {
          lastError = err;
          if (!is503Error(err)) {
            // Fail immediately on non-503 errors (e.g. 400, 403)
            throw err;
          }
          if (attempt < delays.length) {
            await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
          }
        }
      }

      // If primary model failed all retries, try fallback model once
      if (!response) {
        try {
          response = await ai.models.generateContent({
            model: fallbackModel,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });
        } catch (fallbackErr: any) {
          throw fallbackErr || lastError;
        }
      }

      return res.json({ analysis: response.text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate AI analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
