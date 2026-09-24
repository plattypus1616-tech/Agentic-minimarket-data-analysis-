import { SidakPayload, AppsScriptResponse } from '../types';

// URL Google Apps Script Webhook Terbaru
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxNYPbO11Ft5uQpuxpLjc4-nvMHCRUGHXF6XGvt2lVjOPR3eQCyZ0VDtad1ylIP43dn_g/exec";
export const WEBHOOK_URL = APPS_SCRIPT_URL;

// Variabel global untuk menyimpan nomor baris terakhir
export let lastInsertedRow: number | null = null; 

// Fungsi dasar pengiriman data ke Google Sheets (Bypass CORS preflight dengan text/plain)
export async function sendDataToGoogleSheets(payload: any, customUrl?: string): Promise<any> {
  try {
    const targetUrl = (customUrl && customUrl.trim()) ? customUrl.trim() : APPS_SCRIPT_URL;
    const response = await fetch(targetUrl, {
      method: "POST",
      // BYPASS CORS PREFLIGHT: Gunakan text/plain
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.status === "error") {
      console.error("Apps Script Error:", result.message);
      return null;
    }
    return result;
  } catch (error) {
    console.error("Network / CORS Blocked:", error);
    return null;
  }
}

// Fungsi utama komunikasi ke Google Sheets terstandarisasi untuk antarmuka Sidak
export async function sendSidakToSheets(payload: SidakPayload, customUrl?: string): Promise<AppsScriptResponse> {
  try {
    const result = await sendDataToGoogleSheets(payload, customUrl);
    if (!result) {
      return { status: 'error', message: 'Gagal terhubung atau Apps Script Error' };
    }

    const rowNum = result.row_number ?? result.rowNumber ?? result.row ?? null;

    if (payload.action === 'insert' && rowNum) {
      lastInsertedRow = rowNum;
      console.log('Data masuk di baris:', lastInsertedRow);
    } else if (payload.action === 'cancel') {
      console.log('Baris', payload.row_number, 'berhasil dianulir di Sheets.');
      if (lastInsertedRow === payload.row_number) {
        lastInsertedRow = null; // Reset memori jika baris sama
      }
    }

    return {
      status: result.status || (rowNum ? 'success' : 'success'),
      message: result.message || 'OK',
      row_number: rowNum,
    };
  } catch (error) {
    console.error('API Error:', error);
    return { status: 'error', message: 'Gagal terhubung ke Google Sheets' };
  }
}

// Fungsi 1: Dipanggil saat menekan "Sidak"
export async function triggerSidak(skuData: any, customUrl?: string): Promise<AppsScriptResponse> {
  const payload: SidakPayload = {
    action: 'insert',
    sku_id: skuData.sku_id || skuData.plu || '',
    nama_sku: skuData.nama_sku || skuData.nama_barang || '',
    kategori: skuData.kategori || 'General',
    avg_sales_7d: Number(skuData.avg_sales_7d ?? skuData.avg_sales_7hari ?? skuData.avg_sales_harian ?? 0),
    sales_kemarin: Number(skuData.sales_kemarin ?? 0),
    stok_onhand: Number(skuData.stok_onhand ?? skuData.stok_sistem_onhand ?? skuData.stok_sistem ?? 0),
    days_to_expire: Number(skuData.days_to_expire ?? 30),
    harga_satuan: Number(skuData.harga_satuan ?? 0),
    // Backward compatibility aliases
    stok_sistem: Number(skuData.stok_onhand ?? skuData.stok_sistem_onhand ?? skuData.stok_sistem ?? 0),
    harga: Number(skuData.harga_satuan ?? 0),
    potensi_rugi: skuData.loss_amount ?? ((skuData.stok_onhand ?? skuData.stok_sistem_onhand ?? 0) * (skuData.harga_satuan ?? 0)),
  };

  return await sendSidakToSheets(payload, customUrl);
}

// Fungsi 2: Dipanggil saat menekan "Batal/Undo"
export async function triggerBatal(rowNumberToCancel?: number | null, customUrl?: string): Promise<AppsScriptResponse | null> {
  const targetRow = rowNumberToCancel ?? lastInsertedRow;
  if (!targetRow) return null;

  const payload: SidakPayload = {
    action: 'cancel',
    row_number: targetRow,
  };

  return await sendSidakToSheets(payload, customUrl);
}

