export interface AlfamidiItem {
  plu: string;
  namaSKU: string;
  kategori: string;
  avgSales7D: number;
  salesKemarin: number;
  stokOnHand: number;
  daysToExpire: number;
  hargaSatuan: number;
}

export interface NodeEvaluationResult {
  phantomRisk: boolean;
  spoilageRisk: boolean;
  projectedWasteValue: number;
}

export interface RawSkuData {
  plu: string; // Product Code / PLU ID
  nama_sku: string; // Product Description
  kategori?: string; // Product Category (e.g., 'Fresh/Dairy', 'Grocery', etc.)
  days_to_expire?: number; // Days to Expiration (default 30 for grocery, 2-3 for fresh)
  avg_sales_7hari: number; // 7-Day Daily Velocity
  sales_kemarin: number; // Yesterday's Sales
  sales_dua_hari_lalu?: number; // Sales 2 Days Ago (default 0)
  stok_sistem_onhand: number; // System Stock On Hand
  harga_satuan: number; // Unit Price in IDR
  status_dc?: string; // DC Inventory Status ('NORMAL', 'OOS', 'EMPTY' - default 'NORMAL')

  // Backward compatibility aliases
  sku_id?: string;
  nama_barang?: string;
  avg_sales_harian?: number;
  sales_hari_ini?: number;
  stok_sistem?: number;
  daysToExpire?: number;
  namaSKU?: string;
}

export interface GateEvaluation {
  preFilter_dcCheck: boolean; // Status_DC is not OOS / EMPTY
  gate1_avgSales: boolean; // Avg_Sales_7Hari >= 3.0 OR (Harga_Satuan >= 50000 AND Avg_Sales_7Hari >= 1.0)
  gate2_salesZero: boolean; // Closed 2-Day Freeze: Sales_Kemarin == 0 AND Sales_Dua_Hari_Lalu == 0
  gate3_lowStock: boolean; // Stok_Sistem_OnHand > 0 AND Stok_Sistem_OnHand <= Math.max(3, Avg_Sales_7Hari * 0.3)
  dynamicThreshold: number; // Math.max(3, Avg_Sales_7Hari * 0.3)
  isPassed: boolean;
  failedGates: string[];
}

export interface SidakTargetSku extends RawSkuData {
  kategori: string;
  days_to_expire: number;
  sales_dua_hari_lalu: number;
  status_dc: string;
  loss_amount: number; // Stok_Sistem_OnHand * Harga_Satuan
  velocity_mismatch: boolean; // Stok_Sistem_OnHand > 0 && Avg_Sales_7Hari > 0 && Sales_Kemarin === 0 && Sales_Dua_Hari_Lalu === 0
  evaluation: GateEvaluation;

  // Dual Node Evaluation (evaluateNodeState) outputs
  nodeEvaluation: NodeEvaluationResult;
  phantomRisk: boolean;
  spoilageRisk: boolean;
  projectedDemand: number;
  deadUnits: number;
  projectedWasteValue: number;

  sidak_status?: "PENDING" | "PROCESSED" | "STOK_DI_NOLKAN";
  action: "SIDAK_FISIK_DAN_NOLKAN_STOK";
  processedAt?: string;
  notes?: string;

  // Backward compatibility aliases
  potensi_kerugian_harian?: number;
}

export interface NodeInfo {
  nodeId: string;
  name: string;
  address: string;
  district: string;
  regency: string;
  province: string;
  postalCode: string;
  rtRw: string;
  status: "LOCKED" | "ACTIVE";
}

export interface LaporanPhantomInventoryJson {
  jejak_penalaran_logika: string;
  ringkasan_evaluasi_node: {
    total_target_phantom: number;
    total_target_spoilage: number;
    total_projected_waste_value: number;
  };
  target_operasi_fisik: {
    plu: string;
    nama_sku: string;
    kategori: string;
    days_to_expire: number;
    stok_sistem_onhand: number;
    loss_amount: number;
    phantom_risk: boolean;
    spoilage_risk: boolean;
    projected_waste_value: number;
  }[];
}

// 1. Tipe payload yang dikirim ke Google Apps Script
export interface SidakPayload {
  action: 'insert' | 'cancel';
  sku_id?: string;
  nama_sku?: string;
  kategori?: string;
  avg_sales_7d?: number;
  sales_kemarin?: number;
  stok_onhand?: number;
  days_to_expire?: number;
  harga_satuan?: number;
  stok_sistem?: number;
  harga?: number;
  potensi_rugi?: number;
  row_number?: number; // Diperlukan saat action === 'cancel'
}

// 2. Tipe respons balik dari Google Apps Script
export interface AppsScriptResponse {
  status: 'success' | 'error';
  message: string;
  row_number?: number; // Nomor baris di Google Sheets
}

// 3. Status lokal untuk item yang sedang disidak di UI
export interface SidakItemState {
  isProcessing: boolean;
  rowNumber: number | null;
  status: 'IDLE' | 'SAVED' | 'CANCELLED';
}
