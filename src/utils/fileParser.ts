import * as XLSX from "xlsx";
import Papa from "papaparse";
import { RawSkuData } from "../types";
import { sanitizeNumber } from "./phantomEngine";

/**
 * Normalizes array of parsed row objects (from PapaParse, SheetJS, or array rows)
 * into standard RawSkuData schema with sanitized numbers and cleaned strings.
 */
export function normalizeParsedRows(rawRows: any[]): RawSkuData[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  const skus: RawSkuData[] = [];
  const seenIds = new Set<string>();

  for (const row of rawRows) {
    if (!row || typeof row !== "object") continue;

    let pluRaw = "";
    let namaRaw = "";
    let avgSalesRaw: any = 0;
    let salesKemarinRaw: any = 0;
    let sales2DRaw: any = 0;
    let stokRaw: any = 0;
    let hargaRaw: any = 0;
    let statusDcRaw: any = "NORMAL";

    if (Array.isArray(row)) {
      if (row.length < 2) continue;
      pluRaw = String(row[0] ?? "");
      namaRaw = String(row[1] ?? "");
      avgSalesRaw = row[2] ?? 0;
      salesKemarinRaw = row[3] ?? 0;
      sales2DRaw = row.length >= 8 ? row[4] : 0;
      stokRaw = row.length >= 8 ? row[5] : row[4] ?? 0;
      hargaRaw = row.length >= 8 ? row[6] : row[5] ?? 0;
      statusDcRaw = row.length >= 8 ? row[7] : "NORMAL";
    } else {
      // Object from PapaParse or SheetJS
      const keys = Object.keys(row);
      if (keys.length === 0) continue;

      // Map keys case-insensitively
      const keyMap: { [cleanedKey: string]: string } = {};
      keys.forEach((k) => {
        const cleaned = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        keyMap[cleaned] = k;
      });

      const findValue = (candidates: string[]): any => {
        for (const cand of candidates) {
          for (const cleanedKey of Object.keys(keyMap)) {
            if (cleanedKey.includes(cand)) {
              return row[keyMap[cleanedKey]];
            }
          }
        }
        return undefined;
      };

      pluRaw =
        findValue(["plu", "skuid", "sku", "kode", "code", "itemid", "plucode"]) ??
        row[keys[0]] ??
        "";

      namaRaw =
        findValue(["namasku", "namabarang", "nama", "description", "desc", "product", "item"]) ??
        row[keys[1]] ??
        "";

      avgSalesRaw =
        findValue(["avgsales7hari", "avgsalesharian", "avgsales", "sales7d", "avg7d", "avg"]) ??
        row[keys[2]] ??
        0;

      salesKemarinRaw =
        findValue(["saleskemarin", "salesyesterday", "yesterday", "h1"]) ??
        row[keys[3]] ??
        0;

      sales2DRaw =
        findValue(["salesduaharilalu", "sales2dago", "sales2d", "2dago", "duaharilalu", "2hari", "h2"]) ??
        0;

      stokRaw =
        findValue(["stoksistemonhand", "stoksistem", "stok", "stock", "onhand"]) ??
        row[keys[keys.length >= 7 ? 5 : 4]] ??
        0;

      hargaRaw =
        findValue(["hargasatuan", "harga", "price", "unitprice"]) ??
        row[keys[keys.length >= 7 ? 6 : 5]] ??
        0;

      statusDcRaw =
        findValue(["statusdc", "dcstatus", "dc"]) ??
        row[keys[keys.length >= 8 ? 7 : -1]] ??
        "NORMAL";
    }

    let plu = String(pluRaw || "").replace(/^["']|["']$/g, "").trim();
    if (!plu) continue;

    // Deduplicate PLU if necessary
    if (seenIds.has(plu)) {
      let count = 2;
      while (seenIds.has(`${plu}_${count}`)) {
        count++;
      }
      plu = `${plu}_${count}`;
    }
    seenIds.add(plu);

    const avg_sales_7hari = sanitizeNumber(avgSalesRaw, false);
    const sales_kemarin = Math.round(sanitizeNumber(salesKemarinRaw, true));
    const sales_dua_hari_lalu = Math.round(sanitizeNumber(sales2DRaw, true));
    const stok_sistem_onhand = Math.round(sanitizeNumber(stokRaw, true));
    const harga_satuan = Math.round(sanitizeNumber(hargaRaw, true));
    const cleanNamaSku = String(namaRaw || "").replace(/^["']|["']$/g, "").trim() || `SKU ${plu}`;
    const cleanStatusDc =
      String(statusDcRaw || "NORMAL")
        .replace(/^["']|["']$/g, "")
        .trim()
        .toUpperCase() || "NORMAL";

    skus.push({
      plu,
      nama_sku: cleanNamaSku,
      avg_sales_7hari,
      sales_kemarin,
      sales_dua_hari_lalu,
      stok_sistem_onhand,
      harga_satuan,
      status_dc: cleanStatusDc,
      // Aliases
      sku_id: plu,
      nama_barang: cleanNamaSku,
      avg_sales_harian: avg_sales_7hari,
      stok_sistem: stok_sistem_onhand,
    });
  }

  return skus;
}

/**
 * Parses binary or text file (.xlsx, .xls, .csv, .tsv) using SheetJS or PapaParse
 */
export async function parseUniversalFile(file: File): Promise<RawSkuData[]> {
  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

  if (isExcel) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          // Use bundled XLSX or fallback to window.XLSX
          const xlsxLib = XLSX || (window as any).XLSX;
          if (!xlsxLib) {
            throw new Error("Library SheetJS (XLSX) belum dimuat.");
          }
          const workbook = xlsxLib.read(buffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = xlsxLib.utils.sheet_to_json(worksheet, { defval: "" });
          const normalized = normalizeParsedRows(jsonRows);
          resolve(normalized);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  } else {
    // CSV, TSV, or TXT
    return new Promise((resolve, reject) => {
      const papaLib = Papa || (window as any).Papa;
      if (papaLib) {
        papaLib.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (results: Papa.ParseResult<any>) => {
            try {
              const normalized = normalizeParsedRows(results.data);
              resolve(normalized);
            } catch (err) {
              reject(err);
            }
          },
          error: (err: any) => reject(err),
        });
      } else {
        // Fallback text reader
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const normalized = parseUniversalText(text);
            resolve(normalized);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      }
    });
  }
}

/**
 * Smart Raw Text Parser (for pasted text from Excel/Google Sheets, TSV, CSV)
 * PapaParse automatically detects whether the delimiter is comma (,), tab (\t), or semicolon (;)
 */
export function parseUniversalText(rawText: string): RawSkuData[] {
  if (!rawText || !rawText.trim()) return [];

  const papaLib = Papa || (window as any).Papa;
  if (papaLib) {
    const results = papaLib.parse(rawText.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (results.data && results.data.length > 0) {
      const normalized = normalizeParsedRows(results.data);
      if (normalized.length > 0) return normalized;
    }
  }

  // Fallback if header: true didn't yield columns (e.g. raw lines without header)
  const lines = rawText.trim().split("\n");
  const rawRows: string[][] = lines.map((line) => {
    if (line.includes("\t")) {
      return line.split("\t").map((cell) => cell.trim());
    }
    return line.split(",").map((cell) => cell.trim());
  });

  return normalizeParsedRows(rawRows);
}
