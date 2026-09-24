import { NodeInfo, RawSkuData } from "../types";

export const TARGET_NODE_INFO: NodeInfo = {
  nodeId: "GLOBAL-NODE",
  name: "Alfamidi umum",
  address: "General Location",
  district: "general district",
  regency: "general regency",
  province: "Indonesia",
  postalCode: "00000",
  rtRw: "-",
  status: "ACTIVE",
};

export const INITIAL_RAW_CSV = `PLU,Nama_SKU,Kategori,Days_To_Expire,Avg_Sales_7Hari,Sales_Kemarin,Sales_Dua_Hari_Lalu,Stok_Sistem_OnHand,Harga_Satuan,Status_DC
101001,Susu Bubuk Formula 400g,Grocery,180,4.5,0,0,2,85000,NORMAL
101002,Indomie Goreng Spesial 85g,Grocery,240,35.0,0,0,4,3100,NORMAL
101003,Aqua Air Mineral PET 600ml,Grocery,365,48.0,45,40,110,3500,NORMAL
101004,Bear Brand Susu Steril 189ml,Fresh/Dairy,3,18.0,0,0,3,10500,NORMAL
101005,Minyak Goreng Sawit Refill 2L,Grocery,180,15.0,0,0,0,34000,NORMAL
101006,Kapal Api Special Mix 10x25g,Grocery,365,12.5,11,10,50,15500,NORMAL
101007,Sari Roti Tawar Kupas,Fresh/Dairy,2,14.0,0,0,55,16500,NORMAL
101008,Chitato Sapi Panggang 68g,Grocery,120,8.0,0,0,2,11500,NORMAL
101009,Pepsodent White 190g,Grocery,365,5.0,4,5,12,14000,NORMAL
101010,Le Minerale Air Mineral 1500ml,Grocery,365,22.0,0,0,2,6500,NORMAL
101011,Ultra Milk UHT Cokelat 250ml,Fresh/Dairy,2,20.0,18,20,85,7200,NORMAL
101012,Rokok Sampoerna A Mild 16s,Grocery,365,25.0,0,0,5,33500,NORMAL
101013,ABC Kecap Manis Refill 520ml,Grocery,365,4.0,3,4,20,18500,NORMAL
101014,Minyak Telon Lang 100ml,Grocery,365,3.5,0,0,1,32000,NORMAL
101015,Rexona Roll On Ice Cool 50ml,Grocery,365,1.5,1,2,6,21500,NORMAL
101016,Susu Pasteurisasi Fresh 1L,Fresh/Dairy,2,4.0,5,4,20,28000,NORMAL
101017,Yogurt Drink Strawberry 250ml,Fresh/Dairy,1,6.0,4,5,15,11500,NORMAL`;

export const INITIAL_SKUS: RawSkuData[] = [
  { plu: "101001", nama_sku: "Susu Bubuk Formula 400g", kategori: "Grocery", days_to_expire: 180, avg_sales_7hari: 4.5, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 2, harga_satuan: 85000, status_dc: "NORMAL", sku_id: "101001", nama_barang: "Susu Bubuk Formula 400g", avg_sales_harian: 4.5, stok_sistem: 2 },
  { plu: "101002", nama_sku: "Indomie Goreng Spesial 85g", kategori: "Grocery", days_to_expire: 240, avg_sales_7hari: 35.0, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 4, harga_satuan: 3100, status_dc: "NORMAL", sku_id: "101002", nama_barang: "Indomie Goreng Spesial 85g", avg_sales_harian: 35.0, stok_sistem: 4 },
  { plu: "101003", nama_sku: "Aqua Air Mineral PET 600ml", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 48.0, sales_kemarin: 45, sales_dua_hari_lalu: 40, stok_sistem_onhand: 110, harga_satuan: 3500, status_dc: "NORMAL", sku_id: "101003", nama_barang: "Aqua Air Mineral PET 600ml", avg_sales_harian: 48.0, stok_sistem: 110 },
  { plu: "101004", nama_sku: "Bear Brand Susu Steril 189ml", kategori: "Fresh/Dairy", days_to_expire: 3, avg_sales_7hari: 18.0, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 3, harga_satuan: 10500, status_dc: "NORMAL", sku_id: "101004", nama_barang: "Bear Brand Susu Steril 189ml", avg_sales_harian: 18.0, stok_sistem: 3 },
  { plu: "101005", nama_sku: "Minyak Goreng Sawit Refill 2L", kategori: "Grocery", days_to_expire: 180, avg_sales_7hari: 15.0, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 0, harga_satuan: 34000, status_dc: "NORMAL", sku_id: "101005", nama_barang: "Minyak Goreng Sawit Refill 2L", avg_sales_harian: 15.0, stok_sistem: 0 },
  { plu: "101006", nama_sku: "Kapal Api Special Mix 10x25g", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 12.5, sales_kemarin: 11, sales_dua_hari_lalu: 10, stok_sistem_onhand: 50, harga_satuan: 15500, status_dc: "NORMAL", sku_id: "101006", nama_barang: "Kapal Api Special Mix 10x25g", avg_sales_harian: 12.5, stok_sistem: 50 },
  { plu: "101007", nama_sku: "Sari Roti Tawar Kupas", kategori: "Fresh/Dairy", days_to_expire: 2, avg_sales_7hari: 14.0, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 55, harga_satuan: 16500, status_dc: "NORMAL", sku_id: "101007", nama_barang: "Sari Roti Tawar Kupas", avg_sales_harian: 14.0, stok_sistem: 55 },
  { plu: "101008", nama_sku: "Chitato Sapi Panggang 68g", kategori: "Grocery", days_to_expire: 120, avg_sales_7hari: 8.0, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 2, harga_satuan: 11500, status_dc: "NORMAL", sku_id: "101008", nama_barang: "Chitato Sapi Panggang 68g", avg_sales_harian: 8.0, stok_sistem: 2 },
  { plu: "101009", nama_sku: "Pepsodent White 190g", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 5.0, sales_kemarin: 4, sales_dua_hari_lalu: 5, stok_sistem_onhand: 12, harga_satuan: 14000, status_dc: "NORMAL", sku_id: "101009", nama_barang: "Pepsodent White 190g", avg_sales_harian: 5.0, stok_sistem: 12 },
  { plu: "101010", nama_sku: "Le Minerale Air Mineral 1500ml", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 22.0, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 2, harga_satuan: 6500, status_dc: "NORMAL", sku_id: "101010", nama_barang: "Le Minerale Air Mineral 1500ml", avg_sales_harian: 22.0, stok_sistem: 2 },
  { plu: "101011", nama_sku: "Ultra Milk UHT Cokelat 250ml", kategori: "Fresh/Dairy", days_to_expire: 2, avg_sales_7hari: 20.0, sales_kemarin: 18, sales_dua_hari_lalu: 20, stok_sistem_onhand: 85, harga_satuan: 7200, status_dc: "NORMAL", sku_id: "101011", nama_barang: "Ultra Milk UHT Cokelat 250ml", avg_sales_harian: 20.0, stok_sistem: 85 },
  { plu: "101012", nama_sku: "Rokok Sampoerna A Mild 16s", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 25.0, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 5, harga_satuan: 33500, status_dc: "NORMAL", sku_id: "101012", nama_barang: "Rokok Sampoerna A Mild 16s", avg_sales_harian: 25.0, stok_sistem: 5 },
  { plu: "101013", nama_sku: "ABC Kecap Manis Refill 520ml", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 4.0, sales_kemarin: 3, sales_dua_hari_lalu: 4, stok_sistem_onhand: 20, harga_satuan: 18500, status_dc: "NORMAL", sku_id: "101013", nama_barang: "ABC Kecap Manis Refill 520ml", avg_sales_harian: 4.0, stok_sistem: 20 },
  { plu: "101014", nama_sku: "Minyak Telon Lang 100ml", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 3.5, sales_kemarin: 0, sales_dua_hari_lalu: 0, stok_sistem_onhand: 1, harga_satuan: 32000, status_dc: "NORMAL", sku_id: "101014", nama_barang: "Minyak Telon Lang 100ml", avg_sales_harian: 3.5, stok_sistem: 1 },
  { plu: "101015", nama_sku: "Rexona Roll On Ice Cool 50ml", kategori: "Grocery", days_to_expire: 365, avg_sales_7hari: 1.5, sales_kemarin: 1, sales_dua_hari_lalu: 2, stok_sistem_onhand: 6, harga_satuan: 21500, status_dc: "NORMAL", sku_id: "101015", nama_barang: "Rexona Roll On Ice Cool 50ml", avg_sales_harian: 1.5, stok_sistem: 6 },
  { plu: "101016", nama_sku: "Susu Pasteurisasi Fresh 1L", kategori: "Fresh/Dairy", days_to_expire: 2, avg_sales_7hari: 4.0, sales_kemarin: 5, sales_dua_hari_lalu: 4, stok_sistem_onhand: 20, harga_satuan: 28000, status_dc: "NORMAL", sku_id: "101016", nama_barang: "Susu Pasteurisasi Fresh 1L", avg_sales_harian: 4.0, stok_sistem: 20 },
  { plu: "101017", nama_sku: "Yogurt Drink Strawberry 250ml", kategori: "Fresh/Dairy", days_to_expire: 1, avg_sales_7hari: 6.0, sales_kemarin: 4, sales_dua_hari_lalu: 5, stok_sistem_onhand: 15, harga_satuan: 11500, status_dc: "NORMAL", sku_id: "101017", nama_barang: "Yogurt Drink Strawberry 250ml", avg_sales_harian: 6.0, stok_sistem: 15 },
];
