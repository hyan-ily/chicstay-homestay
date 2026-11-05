export function generatePrintableDocHtml(title: string, code: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} ${code} - Chicstay Homestay</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 16px;
      line-height: 1.5;
    }
    .print-bar {
      max-width: 780px;
      margin: 0 auto 16px auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      padding: 9px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print:hover { background: #1d4ed8; }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      font-size: 13px;
      padding: 9px 16px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-close:hover { background: #e2e8f0; }
    .invoice-sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 28px 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f8fafc; padding: 8px 10px; text-align: left; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #334155; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .tabular-nums { font-variant-numeric: tabular-nums; }
    
    @media print {
      body { background: #ffffff !important; padding: 0 !important; }
      .print-bar { display: none !important; }
      .invoice-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: none !important;
        width: 100% !important;
      }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      tr, .avoid-page-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div style="font-weight: 700; font-size: 14px; color: #0f172a;">
      📄 ${title}: <span style="color:#2563eb">${code}</span>
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn-print" onclick="window.print()">
        🖨️ ${title.toLowerCase().includes('cọc') ? 'In Phiếu Cọc' : 'In Hóa Đơn'} / Lưu PDF
      </button>
      <button class="btn-close" onclick="window.close()">
        Đóng tab
      </button>
    </div>
  </div>

  <div class="invoice-sheet">
    ${contentHtml}
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {
          console.warn('Lỗi gọi in:', e);
        }
      }, 400);
    });
  </script>
</body>
</html>`;
}
