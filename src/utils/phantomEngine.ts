import { AlfamidiItem, GateEvaluation, LaporanPhantomInventoryJson, NodeEvaluationResult, RawSkuData, SidakTargetSku } from "../types";

export interface GateThresholds {
  minAvgSales: number; // default 3.0
  maxStock: number; // default 5 (exclusive, system_stock < 5)
}

export interface StrippedSkuForAi {
  plu: string;
  stok_sistem_onhand: number;
  avg_sales_7hari: number;
}

/**
 * Evaluates node state using the dual evaluation algorithm:
 * 1. Phantom Inventory (Data Anomaly) evaluation
 * 2. Temporal Capital Decay / Spoilage Risk (Fresh/Dairy) evaluation
 */
export function evaluateNodeState(item: AlfamidiItem): NodeEvaluationResult {
  let phantomRisk = false;
  let spoilageRisk = false;
  let projectedWasteValue = 0;

  // Evaluasi Phantom Inventory (Anomali Data)
  if (item.avgSales7D >= 3.0 && item.salesKemarin === 0 && item.stokOnHand > 0) {
    phantomRisk = true;
  }

  // Evaluasi Peluruhan Modal Temporal (Khusus Kategori Fresh/Dairy)
  const projectedDemand = item.avgSales7D * item.daysToExpire;

  if (item.daysToExpire <= 3 && item.stokOnHand > projectedDemand) {
    spoilageRisk = true;

    // Kalkulasi eksak modal yang diproyeksikan hangus menjadi sampah
    const deadUnits = Math.ceil(item.stokOnHand - projectedDemand);
    projectedWasteValue = deadUnits * item.hargaSatuan;
  }

  return { phantomRisk, spoilageRisk, projectedWasteValue };
}

/**
 * Normalizes any RawSkuData into a strict AlfamidiItem representation
 */
export function toAlfamidiItem(sku: RawSkuData | SidakTargetSku): AlfamidiItem {
  const plu = sku.plu || sku.sku_id || "";
  const namaSKU = sku.nama_sku || sku.nama_barang || sku.namaSKU || "";
  const avgSales7D = sku.avg_sales_7hari ?? sku.avg_sales_harian ?? 0;
  const salesKemarin = sku.sales_kemarin ?? 0;
  const stokOnHand = sku.stok_sistem_onhand ?? sku.stok_sistem ?? 0;
  const hargaSatuan = sku.harga_satuan ?? 0;

  let kategori = (sku.kategori || "").trim();
  if (!kategori) {
    const isFresh = /susu|roti|daging|yogurt|keju|cheese|ayam|telur|fresh|dairy|sayur|buah|tahu|tempe|sosis/i.test(namaSKU);
    kategori = isFresh ? "Fresh/Dairy" : "Grocery";
  }

  let daysToExpire =
    sku.days_to_expire ??
    sku.daysToExpire ??
    (kategori.toLowerCase().includes("fresh") || kategori.toLowerCase().includes("dairy") ? 2 : 30);

  return {
    plu,
    namaSKU,
    kategori,
    avgSales7D,
    salesKemarin,
    stokOnHand,
    daysToExpire,
    hargaSatuan,
  };
}

/**
 * Strips raw SKU dataset to anonymous numeric objects before passing to AI evaluation engine.
 * Ensures strict Data Privacy: NO product names (nama_sku) or prices (harga_satuan) touch the AI.
 */
export function stripSkuDataForAi(skus: RawSkuData[] | SidakTargetSku[]): StrippedSkuForAi[] {
  return skus.map((sku) => {
    const plu = sku.plu || sku.sku_id || "";
    const stok_sistem_onhand = sku.stok_sistem_onhand ?? sku.stok_sistem ?? 0;
    const avg_sales_7hari = sku.avg_sales_7hari ?? sku.avg_sales_harian ?? 0;
    return {
      plu,
      stok_sistem_onhand,
      avg_sales_7hari,
    };
  });
}

/**
 * Re-maps anonymous target SKU IDs back to the complete local state dataset in browser memory.
 * Retrieves real Product Names, Prices, and Loss Values for UI display and Google Sheets Webhook.
 */
export function remapSkusFromLocalState(
  targetSkuIds: string[],
  localStateSkus: RawSkuData[]
): SidakTargetSku[] {
  const localMap = new Map<string, RawSkuData>();
  localStateSkus.forEach((sku) => {
    const id = sku.plu || sku.sku_id || "";
    localMap.set(id, sku);
  });

  const remapped: SidakTargetSku[] = [];
  targetSkuIds.forEach((id) => {
    const raw = localMap.get(id);
    if (raw) {
      const evaluation = evaluateSku(raw);
      const alfamidiItem = toAlfamidiItem(raw);
      const nodeEval = evaluateNodeState(alfamidiItem);
      const projectedDemand = alfamidiItem.avgSales7D * alfamidiItem.daysToExpire;
      const deadUnits = Math.max(0, Math.ceil(alfamidiItem.stokOnHand - projectedDemand));

      const loss_amount = Math.round((raw.stok_sistem_onhand ?? raw.stok_sistem ?? 0) * (raw.harga_satuan ?? 0));
      const sales2D = raw.sales_dua_hari_lalu ?? 0;
      const statusDc = raw.status_dc || "NORMAL";
      const velocity_mismatch =
        (raw.stok_sistem_onhand ?? raw.stok_sistem ?? 0) > 0 &&
        (raw.avg_sales_7hari ?? raw.avg_sales_harian ?? 0) > 0 &&
        (raw.sales_kemarin ?? 0) === 0 &&
        sales2D === 0;

      remapped.push({
        ...raw,
        kategori: alfamidiItem.kategori,
        days_to_expire: alfamidiItem.daysToExpire,
        sales_dua_hari_lalu: sales2D,
        status_dc: statusDc,
        loss_amount,
        velocity_mismatch,
        evaluation,
        nodeEvaluation: nodeEval,
        phantomRisk: nodeEval.phantomRisk,
        spoilageRisk: nodeEval.spoilageRisk,
        projectedDemand,
        deadUnits,
        projectedWasteValue: nodeEval.projectedWasteValue,
        action: "SIDAK_FISIK_DAN_NOLKAN_STOK",
        sidak_status: "PENDING",
        // Aliases
        sku_id: raw.plu,
        nama_barang: raw.nama_sku,
        avg_sales_harian: raw.avg_sales_7hari,
        stok_sistem: raw.stok_sistem_onhand,
        potensi_kerugian_harian: loss_amount,
      });
    }
  });

  return remapped;
}

export function evaluateSku(
  sku: RawSkuData,
  thresholds?: GateThresholds
): GateEvaluation {
  const avgSales = sku.avg_sales_7hari ?? sku.avg_sales_harian ?? 0;
  const salesKemarin = sku.sales_kemarin ?? 0;
  const salesDuaHariLalu = sku.sales_dua_hari_lalu ?? 0;
  const stokOnHand = sku.stok_sistem_onhand ?? sku.stok_sistem ?? 0;
  const hargaSatuan = sku.harga_satuan ?? 0;
  const statusDc = (sku.status_dc || "NORMAL").trim().toUpperCase();

  // PRE-FILTER (DC Check): Pass if status_dc is NOT OOS, EMPTY, or OUT_OF_STOCK
  const isDcOos =
    statusDc === "OOS" ||
    statusDc === "EMPTY" ||
    statusDc === "OUT_OF_STOCK" ||
    statusDc.includes("OOS") ||
    statusDc.includes("EMPTY");
  const preFilter_dcCheck = !isDcOos;

  // GATE 1 (Velocity OR High-Value):
  // Pass if (Avg_Sales_7Hari >= 3.0) OR (Harga_Satuan >= 50000 AND Avg_Sales_7Hari >= 1.0)
  const gate1_avgSales =
    avgSales >= 3.0 || (hargaSatuan >= 50000 && avgSales >= 1.0);

  // GATE 2 (Closed 2-Day Freeze):
  // Pass if (Sales_Kemarin === 0) AND (Sales_Dua_Hari_Lalu === 0)
  const gate2_salesZero = salesKemarin === 0 && salesDuaHariLalu === 0;

  // GATE 3 (Dynamic Days-Of-Supply):
  // dynamicThreshold = Math.max(3, Avg_Sales_7Hari * 0.3)
  // Pass if (Stok_Sistem_OnHand > 0) AND (Stok_Sistem_OnHand <= dynamicThreshold)
  const dynamicThreshold = Math.max(3, avgSales * 0.3);
  const gate3_lowStock = stokOnHand > 0 && stokOnHand <= dynamicThreshold;

  const failedGates: string[] = [];
  if (!preFilter_dcCheck) {
    failedGates.push(`DC Out of Stock (${statusDc})`);
  }
  if (!gate1_avgSales) {
    if (hargaSatuan >= 50000) {
      failedGates.push(`Gate 1 Fail: High-Value SKU Avg Sales (${avgSales}) < 1.0`);
    } else {
      failedGates.push(`Gate 1 Fail: Avg Sales (${avgSales}) < 3.0`);
    }
  }
  if (!gate2_salesZero) {
    failedGates.push(
      `Gate 2 Fail: Sales Yesterday (${salesKemarin}) or 2D Ago (${salesDuaHariLalu}) > 0`
    );
  }
  if (!gate3_lowStock) {
    failedGates.push(
      `Gate 3 Fail: Stock (${stokOnHand}) not in (0, ${dynamicThreshold.toFixed(1)}]`
    );
  }

  const isPassed =
    preFilter_dcCheck && gate1_avgSales && gate2_salesZero && gate3_lowStock;

  return {
    preFilter_dcCheck,
    gate1_avgSales,
    gate2_salesZero,
    gate3_lowStock,
    dynamicThreshold,
    isPassed,
    failedGates,
  };
}

export function processPhantomInventoryData(
  skus: RawSkuData[],
  thresholds?: GateThresholds
): {
  survivingSkus: SidakTargetSku[];
  droppedSkus: SidakTargetSku[];
  totalGmvDailyLossRescued: number;
  totalProjectedWasteRescued: number;
  totalPhantomCount: number;
  totalSpoilageCount: number;
} {
  const processed: SidakTargetSku[] = skus.map((sku) => {
    const evaluation = evaluateSku(sku, thresholds);
    const alfamidiItem = toAlfamidiItem(sku);
    const nodeEval = evaluateNodeState(alfamidiItem);
    const projectedDemand = alfamidiItem.avgSales7D * alfamidiItem.daysToExpire;
    const deadUnits = Math.max(0, Math.ceil(alfamidiItem.stokOnHand - projectedDemand));

    const stokOnHand = sku.stok_sistem_onhand ?? sku.stok_sistem ?? 0;
    const avgSales = sku.avg_sales_7hari ?? sku.avg_sales_harian ?? 0;
    const salesKemarin = sku.sales_kemarin ?? 0;
    const sales2D = sku.sales_dua_hari_lalu ?? 0;
    const statusDc = sku.status_dc || "NORMAL";
    const hargaSatuan = sku.harga_satuan ?? 0;
    const loss_amount = Math.round(stokOnHand * hargaSatuan);
    const velocity_mismatch =
      stokOnHand > 0 && avgSales > 0 && salesKemarin === 0 && sales2D === 0;

    return {
      ...sku,
      plu: sku.plu || sku.sku_id || "",
      nama_sku: sku.nama_sku || sku.nama_barang || "",
      kategori: alfamidiItem.kategori,
      days_to_expire: alfamidiItem.daysToExpire,
      avg_sales_7hari: avgSales,
      sales_kemarin: salesKemarin,
      sales_dua_hari_lalu: sales2D,
      stok_sistem_onhand: stokOnHand,
      harga_satuan: hargaSatuan,
      status_dc: statusDc,
      loss_amount,
      velocity_mismatch,
      evaluation,
      nodeEvaluation: nodeEval,
      phantomRisk: nodeEval.phantomRisk,
      spoilageRisk: nodeEval.spoilageRisk,
      projectedDemand,
      deadUnits,
      projectedWasteValue: nodeEval.projectedWasteValue,
      action: "SIDAK_FISIK_DAN_NOLKAN_STOK",
      sidak_status: "PENDING",
      // Backwards aliases
      sku_id: sku.plu || sku.sku_id || "",
      nama_barang: sku.nama_sku || sku.nama_barang || "",
      avg_sales_harian: avgSales,
      stok_sistem: stokOnHand,
      potensi_kerugian_harian: loss_amount,
    };
  });

  // Target SKUs are those passing gate checks OR triggering Phantom Risk OR triggering Spoilage Risk
  const surviving = processed.filter(
    (item) => item.evaluation.isPassed || item.phantomRisk || item.spoilageRisk
  );
  const dropped = processed.filter(
    (item) => !item.evaluation.isPassed && !item.phantomRisk && !item.spoilageRisk
  );

  // Sort target SKUs by total financial exposure (Loss Amount + Projected Waste Value) descending
  surviving.sort((a, b) => (b.loss_amount + b.projectedWasteValue) - (a.loss_amount + a.projectedWasteValue));

  const totalGmvDailyLossRescued = surviving.reduce((acc, item) => acc + item.loss_amount, 0);
  const totalProjectedWasteRescued = surviving.reduce((acc, item) => acc + item.projectedWasteValue, 0);
  const totalPhantomCount = surviving.filter((item) => item.phantomRisk).length;
  const totalSpoilageCount = surviving.filter((item) => item.spoilageRisk).length;

  return {
    survivingSkus: surviving,
    droppedSkus: dropped,
    totalGmvDailyLossRescued,
    totalProjectedWasteRescued,
    totalPhantomCount,
    totalSpoilageCount,
  };
}

export function generateStructuredJsonOutput(
  survivingSkus: SidakTargetSku[],
  nodeName: string = "Alfamidi"
): LaporanPhantomInventoryJson {
  const phantomCount = survivingSkus.filter((s) => s.phantomRisk).length;
  const spoilageCount = survivingSkus.filter((s) => s.spoilageRisk).length;
  const totalWasteVal = survivingSkus.reduce((acc, s) => acc + s.projectedWasteValue, 0);

  const jejak_penalaran_logika = `Evaluasi Pak Djoko Dual Node Matrix pada node ${nodeName}: [Phantom Risk: Avg_Sales_7D >= 3.0 & Sales_Kemarin == 0 & Stok > 0] AND [Spoilage Risk (Peluruhan Modal Temporal): Days_To_Expire <= 3 & Stok > (Avg_Sales * Days_To_Expire)]. Teridentifikasi ${phantomCount} SKU Phantom Risk dan ${spoilageCount} SKU Spoilage Risk (Total Proyeksi Nilai Sampah: Rp ${totalWasteVal.toLocaleString("id-ID")}).`;

  const target_operasi_fisik = survivingSkus.map((sku) => ({
    plu: sku.plu,
    nama_sku: sku.nama_sku,
    kategori: sku.kategori,
    days_to_expire: sku.days_to_expire,
    stok_sistem_onhand: sku.stok_sistem_onhand,
    loss_amount: sku.loss_amount,
    phantom_risk: sku.phantomRisk,
    spoilage_risk: sku.spoilageRisk,
    projected_waste_value: sku.projectedWasteValue,
  }));

  return {
    jejak_penalaran_logika,
    ringkasan_evaluasi_node: {
      total_target_phantom: phantomCount,
      total_target_spoilage: spoilageCount,
      total_projected_waste_value: totalWasteVal,
    },
    target_operasi_fisik,
  };
}

/**
 * Sanitizes numeric inputs containing currency symbols (e.g., "Rp", "RP", "$"),
 * spaces, and thousand separators ("3.100", "56.500", "85,000", "85.000,00").
 * Returns 0 if input is empty, null, or completely non-numeric.
 */
export function sanitizeNumber(
  val: string | number | null | undefined,
  isInteger: boolean = false
): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }

  let str = String(val).trim();
  if (!str) return 0;

  // Remove quotes if present
  str = str.replace(/^["']|["']$/g, "").trim();

  // Strip currency prefixes, symbols, and non-numeric characters (keep digits, dot, comma, minus)
  str = str.replace(/[^0-9.,-]/g, "");
  if (!str) return 0;

  const hasDot = str.includes(".");
  const hasComma = str.includes(",");

  if (hasDot && hasComma) {
    const lastDot = str.lastIndexOf(".");
    const lastComma = str.lastIndexOf(",");
    if (lastDot > lastComma) {
      // e.g., "1,250,000.50" -> remove commas
      str = str.replace(/,/g, "");
    } else {
      // e.g., "1.250.000,50" or "85.000,00" -> remove dots, replace comma with dot
      str = str.replace(/\./g, "").replace(",", ".");
    }
  } else if (hasDot && !hasComma) {
    const dotParts = str.split(".");
    if (dotParts.length > 2) {
      // Multiple dots -> e.g. "1.250.000" -> "1250000"
      str = str.replace(/\./g, "");
    } else if (dotParts.length === 2) {
      const [whole, decimal] = dotParts;
      // If forced integer, or if decimal part has exactly 3 digits (e.g. "3.100", "56.500", "85.000"), treat dot as thousand separator
      if (isInteger || decimal.length === 3) {
        str = whole + decimal;
      }
    }
  } else if (hasComma && !hasDot) {
    const commaParts = str.split(",");
    if (commaParts.length > 2) {
      // Multiple commas -> e.g. "1,250,000" -> "1250000"
      str = str.replace(/,/g, "");
    } else if (commaParts.length === 2) {
      const [whole, decimal] = commaParts;
      if (isInteger || decimal.length === 3) {
        // e.g. "85,000" or "3,100" -> "85000"
        str = whole + decimal;
      } else {
        // e.g. "3,5" -> "3.5" (Indonesian decimal separator)
        str = `${whole}.${decimal}`;
      }
    }
  }

  const parsed = isInteger ? parseInt(str, 10) : parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

interface HeaderMap {
  colPlu: number;
  colNama: number;
  colKategori: number;
  colDaysToExpire: number;
  colAvgSales: number;
  colSalesKemarin: number;
  colSalesDuaHariLalu: number;
  colStok: number;
  colHarga: number;
  colStatusDc: number;
}

function detectHeaderMap(headerParts: string[]): HeaderMap | null {
  const lower = headerParts.map((p) => p.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  
  const colPlu = lower.findIndex((p) => p.includes("plu") || p.includes("sku_id") || p.includes("code"));
  const colNama = lower.findIndex((p) => p.includes("nama") || p.includes("desc"));
  const colKategori = lower.findIndex((p) => p.includes("kategori") || p.includes("category") || p.includes("kat"));
  const colDaysToExpire = lower.findIndex((p) => p.includes("days_to_expire") || p.includes("daystoexpire") || p.includes("expire") || p.includes("kadaluarsa"));
  const colAvgSales = lower.findIndex((p) => p.includes("avg_sales") || p.includes("avgsales"));
  const colSalesKemarin = lower.findIndex((p) => p.includes("sales_kemarin") || p.includes("yesterday"));
  const colSalesDuaHariLalu = lower.findIndex((p) => p.includes("dua_hari_lalu") || p.includes("2_hari_lalu") || p.includes("2d_ago") || p.includes("2days"));
  const colStok = lower.findIndex((p) => p.includes("stok") || p.includes("stock"));
  const colHarga = lower.findIndex((p) => p.includes("harga") || p.includes("price"));
  const colStatusDc = lower.findIndex((p) => p.includes("status_dc") || p.includes("dc_status") || p.includes("dc"));

  if (colPlu === -1 && colNama === -1 && colAvgSales === -1) {
    return null; // Not a recognized header
  }

  return {
    colPlu: colPlu !== -1 ? colPlu : 0,
    colNama: colNama !== -1 ? colNama : 1,
    colKategori,
    colDaysToExpire,
    colAvgSales: colAvgSales !== -1 ? colAvgSales : 2,
    colSalesKemarin: colSalesKemarin !== -1 ? colSalesKemarin : 3,
    colSalesDuaHariLalu,
    colStok: colStok !== -1 ? colStok : (headerParts.length >= 8 ? 5 : 4),
    colHarga: colHarga !== -1 ? colHarga : (headerParts.length >= 8 ? 6 : 5),
    colStatusDc: colStatusDc !== -1 ? colStatusDc : (headerParts.length >= 8 ? 7 : -1),
  };
}

function parseRowParts(
  parts: string[],
  seenIds: Set<string>,
  headerMap?: HeaderMap | null
): RawSkuData | null {
  if (parts.length < 5) return null;

  let plu_raw = "";
  let nama_sku = "";
  let kategoriStr = "";
  let daysToExpireStr = "";
  let avgSalesStr = "0";
  let salesKemarinStr = "0";
  let sales2DStr = "0";
  let stokSistemStr = "0";
  let hargaSatuanStr = "0";
  let statusDcStr = "NORMAL";

  if (headerMap) {
    plu_raw = parts[headerMap.colPlu] ?? "";
    nama_sku = parts[headerMap.colNama] ?? "";
    kategoriStr = headerMap.colKategori >= 0 ? parts[headerMap.colKategori] ?? "" : "";
    daysToExpireStr = headerMap.colDaysToExpire >= 0 ? parts[headerMap.colDaysToExpire] ?? "" : "";
    avgSalesStr = parts[headerMap.colAvgSales] ?? "0";
    salesKemarinStr = parts[headerMap.colSalesKemarin] ?? "0";
    sales2DStr = headerMap.colSalesDuaHariLalu >= 0 ? parts[headerMap.colSalesDuaHariLalu] ?? "0" : "0";
    stokSistemStr = parts[headerMap.colStok] ?? "0";
    hargaSatuanStr = parts[headerMap.colHarga] ?? "0";
    statusDcStr = headerMap.colStatusDc >= 0 ? parts[headerMap.colStatusDc] ?? "NORMAL" : "NORMAL";
  } else if (parts.length >= 10) {
    [plu_raw, nama_sku, kategoriStr, daysToExpireStr, avgSalesStr, salesKemarinStr, sales2DStr, stokSistemStr, hargaSatuanStr, statusDcStr] = parts;
  } else if (parts.length >= 8) {
    [plu_raw, nama_sku, avgSalesStr, salesKemarinStr, sales2DStr, stokSistemStr, hargaSatuanStr, statusDcStr] = parts;
  } else if (parts.length === 7) {
    [plu_raw, nama_sku, avgSalesStr, salesKemarinStr, sales2DStr, stokSistemStr, hargaSatuanStr] = parts;
  } else {
    [plu_raw, nama_sku, avgSalesStr, salesKemarinStr, stokSistemStr, hargaSatuanStr] = parts;
  }

  let plu = plu_raw.replace(/^["']|["']$/g, "").trim();
  if (!plu) return null;

  if (seenIds.has(plu)) {
    let count = 2;
    while (seenIds.has(`${plu}_${count}`)) {
      count++;
    }
    plu = `${plu}_${count}`;
  }
  seenIds.add(plu);

  const avg_sales_7hari = sanitizeNumber(avgSalesStr, false);
  const sales_kemarin = Math.round(sanitizeNumber(salesKemarinStr, true));
  const sales_dua_hari_lalu = Math.round(sanitizeNumber(sales2DStr, true));
  const stok_sistem_onhand = Math.round(sanitizeNumber(stokSistemStr, true));
  const harga_satuan = Math.round(sanitizeNumber(hargaSatuanStr, true));
  const cleanNamaSku = nama_sku.replace(/^["']|["']$/g, "").trim();
  const cleanStatusDc = (statusDcStr || "NORMAL").replace(/^["']|["']$/g, "").trim().toUpperCase() || "NORMAL";
  const cleanKategori = kategoriStr.replace(/^["']|["']$/g, "").trim();
  const days_to_expire = daysToExpireStr ? Math.round(sanitizeNumber(daysToExpireStr, true)) : undefined;

  return {
    plu,
    nama_sku: cleanNamaSku,
    kategori: cleanKategori || undefined,
    days_to_expire: days_to_expire,
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
  };
}

export function parseCsvInput(csvString: string): RawSkuData[] {
  const lines = csvString.trim().split("\n");
  if (lines.length < 2) return [];

  const skus: RawSkuData[] = [];
  const seenIds = new Set<string>();

  let headerMap: HeaderMap | null = null;
  const firstLineParts = splitCsvLine(lines[0].trim());
  headerMap = detectHeaderMap(firstLineParts);

  const startIdx = headerMap ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = splitCsvLine(line);
    const parsed = parseRowParts(parts, seenIds, headerMap);
    if (parsed) {
      skus.push(parsed);
    }
  }

  return skus;
}

/**
 * Asynchronously parses large CSV text in chunked microtasks so the UI main thread does not freeze when loading 3000+ rows.
 */
export function parseCsvInputAsync(csvString: string): Promise<RawSkuData[]> {
  return new Promise((resolve) => {
    const lines = csvString.trim().split("\n");
    if (lines.length < 2) {
      resolve([]);
      return;
    }

    const skus: RawSkuData[] = [];
    const seenIds = new Set<string>();

    const firstLineParts = splitCsvLine(lines[0].trim());
    const headerMap = detectHeaderMap(firstLineParts);
    let i = headerMap ? 1 : 0;

    const CHUNK_SIZE = 500;

    function processChunk() {
      const end = Math.min(i + CHUNK_SIZE, lines.length);
      for (; i < end; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = splitCsvLine(line);
        const parsed = parseRowParts(parts, seenIds, headerMap);
        if (parsed) {
          skus.push(parsed);
        }
      }

      if (i < lines.length) {
        setTimeout(processChunk, 0);
      } else {
        resolve(skus);
      }
    }

    setTimeout(processChunk, 0);
  });
}

export function skusToCsv(skus: RawSkuData[]): string {
  const header = "PLU,Nama_SKU,Kategori,Days_To_Expire,Avg_Sales_7Hari,Sales_Kemarin,Sales_Dua_Hari_Lalu,Stok_Sistem_OnHand,Harga_Satuan,Status_DC";
  const rows = skus.map(
    (s) => {
      const kat = s.kategori || (/susu|roti|daging|yogurt|keju|cheese|ayam|telur|fresh|dairy/i.test(s.nama_sku || s.nama_barang || "") ? "Fresh/Dairy" : "Grocery");
      const dte = s.days_to_expire ?? s.daysToExpire ?? (kat.toLowerCase().includes("fresh") || kat.toLowerCase().includes("dairy") ? 2 : 30);
      return `${s.plu || s.sku_id},"${(s.nama_sku || s.nama_barang || "").replace(/"/g, '""')}",${kat},${dte},${s.avg_sales_7hari ?? s.avg_sales_harian ?? 0},${s.sales_kemarin ?? 0},${s.sales_dua_hari_lalu ?? 0},${s.stok_sistem_onhand ?? s.stok_sistem ?? 0},${s.harga_satuan ?? 0},${s.status_dc || "NORMAL"}`;
    }
  );
  return [header, ...rows].join("\n");
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
