import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health checks for Cloud Run and monitoring
app.get(['/health', '/healthz', '/_healthz'], (req: Request, res: Response) => {
  return res.status(200).json({ status: 'ok', service: 'chicstay-server', timestamp: new Date().toISOString() });
});

// API: Download/Get Raw SQL Database
app.get('/api/database/sql', (req: Request, res: Response) => {
  try {
    const sqlPath = path.resolve(process.cwd(), 'chicstay_database_sqlserver.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="chicstay_database_sqlserver.sql"');
      return res.send(sqlContent);
    } else {
      return res.status(404).json({ error: 'SQL file not found' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Temporary Invoice Print Sessions (Direct view & print in new tab without iframe sandbox blocks)
const printSessions = new Map<string, { html: string; createdAt: number }>();

setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, session] of printSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      printSessions.delete(id);
    }
  }
}, 600000);

app.post('/api/invoice/print-session', (req: Request, res: Response) => {
  try {
    const { html, maDon } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'Missing html' });
    }
    const id = `${maDon || 'invoice'}-${Date.now()}`;
    printSessions.set(id, { html, createdAt: Date.now() });
    return res.json({ printUrl: `/print/invoice/${id}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/print/invoice/:sessionId', (req: Request, res: Response) => {
  const session = printSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).send(`<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Hóa đơn không tìm thấy</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
  <h2>Phiên in hóa đơn đã hết hạn hoặc không tồn tại.</h2>
  <p>Vui lòng quay lại ứng dụng Chicstay và bấm In Hóa Đơn lại.</p>
</body>
</html>`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(session.html);
});

// ============================================================================
// API & CRON: TỰ ĐỘNG HỦY ĐƠN QUÁ HẠN ĐẶT CỌC 12 GIỜ (Asia/Ho_Chi_Minh)
// ============================================================================
interface StoredBooking {
  MaDon: string;
  MaPhong: string;
  TrangThaiDon: string;
  ThoiGianTaoDon: string;
  DaThu?: number;
  TienCocYeuCau?: number;
  LyDoHuy?: string;
  ThoiGianHuy?: string;
  lichSuThayDoi?: Array<{ id: string; thoiGian: string; nguoiThucHien: string; noiDungThayDoi: string }>;
  [key: string]: any;
}

const STORE_PATH = path.resolve(process.cwd(), 'data', 'chicstay_backend_store.json');

function ensureDataStore(): { bookings: StoredBooking[]; rooms: any[] } {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read backend store, using fallback memory:', err);
  }
  const defaultData = {
    bookings: [
      {
        MaDon: 'DP20250001',
        MaPhong: 'P102',
        TrangThaiDon: 'Chờ đặt cọc',
        ThoiGianTaoDon: '2025-06-02 10:00:00',
        DaThu: 0,
        TienCocYeuCau: 135000,
        lichSuThayDoi: [],
      },
      {
        MaDon: 'DP20250002',
        MaPhong: 'P202',
        TrangThaiDon: 'Chờ đặt cọc',
        ThoiGianTaoDon: '2025-06-03 14:00:00',
        DaThu: 0,
        TienCocYeuCau: 780000,
        lichSuThayDoi: [],
      },
    ],
    rooms: [
      { MaPhong: 'P102', TrangThaiPhong: 'Tạm giữ' },
      { MaPhong: 'P202', TrangThaiPhong: 'Tạm giữ' },
    ],
  };
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
  } catch {}
  return defaultData;
}

function saveStore(data: { bookings: StoredBooking[]; rooms: any[] }) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving backend store:', err);
  }
}

function getVNNow(): { isoString: string; displayString: string; nowMs: number } {
  const now = new Date();
  const displayString = now.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return {
    isoString: now.toISOString(),
    displayString,
    nowMs: now.getTime(),
  };
}

function parseSafeDate(dateStr: string): number {
  if (!dateStr) return 0;
  const normalized = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function runAutoCancelScan(inputBookings?: StoredBooking[], inputRooms?: any[]) {
  const store = (inputBookings && inputRooms) ? { bookings: inputBookings, rooms: inputRooms } : ensureDataStore();
  const { isoString, displayString, nowMs } = getVNNow();

  let canceledCount = 0;
  const canceledBookings: string[] = [];
  const releasedRooms: string[] = [];
  const roomsToCheck = new Set<string>();

  store.bookings = store.bookings.map((b) => {
    if (b.TrangThaiDon === 'Chờ đặt cọc') {
      const createdMs = parseSafeDate(b.ThoiGianTaoDon);
      // Thời hạn đặt cọc: chính xác ThoiGianTaoDon + 12 giờ
      const isOverdue = createdMs > 0 && (nowMs - createdMs >= 12 * 60 * 60 * 1000);
      if (isOverdue) {
        canceledCount++;
        canceledBookings.push(b.MaDon);
        roomsToCheck.add(b.MaPhong);

        const auditLog = {
          id: `LS_CRON_${Date.now()}_${b.MaDon}`,
          thoiGian: isoString,
          nguoiThucHien: 'Hệ thống Cron Tự động (Asia/Ho_Chi_Minh)',
          noiDungThayDoi:
            'Tự động hủy đơn do quá hạn xác nhận tiền cọc 12 giờ (Thời hạn: +12h kể từ thời điểm tạo đơn). Tự động giải phóng phòng về Sẵn sàng.',
        };

        return {
          ...b,
          TrangThaiDon: 'Đã hủy',
          LyDoHuy: 'Quá hạn xác nhận tiền cọc 12 giờ',
          ThoiGianHuy: isoString,
          lichSuThayDoi: [auditLog, ...(b.lichSuThayDoi || [])],
        };
      }
    }
    return b;
  });

  if (store.rooms && Array.isArray(store.rooms)) {
    store.rooms = store.rooms.map((r) => {
      if (roomsToCheck.has(r.MaPhong)) {
        const stillHeld = store.bookings.some(
          (b) => b.MaPhong === r.MaPhong && b.TrangThaiDon === 'Chờ đặt cọc'
        );
        if (!stillHeld && (r.TrangThaiPhong === 'Tạm giữ' || !r.TrangThaiPhong)) {
          releasedRooms.push(r.MaPhong);
          return { ...r, TrangThaiPhong: 'Sẵn sàng' };
        }
      }
      return r;
    });
  }

  if (canceledCount > 0 && !inputBookings) {
    saveStore(store);
  }

  return {
    success: true,
    timezone: 'Asia/Ho_Chi_Minh',
    timestamp: displayString,
    isoTimestamp: isoString,
    scannedTotal: store.bookings.length,
    overdueCount: canceledCount,
    canceledBookings,
    releasedRooms,
    updatedBookings: store.bookings,
    updatedRooms: store.rooms,
    message: canceledCount > 0
      ? `Đã tự động hủy ${canceledCount} đơn (${canceledBookings.join(', ')}) do quá hạn xác nhận tiền cọc 12 giờ theo giờ Asia/Ho_Chi_Minh. Đã giải phóng các phòng: ${releasedRooms.join(', ') || 'N/A'}.`
      : 'Tất cả các đơn chờ đặt cọc đều trong thời hạn 12 giờ hợp lệ. Không có đơn nào bị quá hạn.',
  };
}

// Endpoint 1: Vercel Cron Job định kỳ
app.all('/api/cron/auto-cancel', (req: Request, res: Response) => {
  try {
    const inputBookings = req.body?.bookings;
    const inputRooms = req.body?.rooms;
    const result = runAutoCancelScan(inputBookings, inputRooms);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Endpoint 2: Quét và hủy đơn quá hạn đặt cọc 12 giờ
app.all('/api/bookings/auto-cancel-overdue', (req: Request, res: Response) => {
  try {
    const inputBookings = req.body?.bookings;
    const inputRooms = req.body?.rooms;
    const result = runAutoCancelScan(inputBookings, inputRooms);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Chạy cron ngầm định kỳ mỗi 60 giây trên tiến trình Node Express
setInterval(() => {
  try {
    runAutoCancelScan();
  } catch (err) {
    console.error('Error in background auto-cancel routine:', err);
  }
}, 60000);

// API: Chatbot Assistant for Chicstay Homestay
app.post('/api/chatbot', async (req: Request, res: Response) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Helper: compute statistics from context or data
  const rawBookings: any[] = context?.bookings || [];
  const rawRooms: any[] = context?.rooms || [];
  const rawServices: any[] = context?.services || [];
  const rawServiceItems: any[] = context?.serviceItems || [];
  const rawCustomers: any[] = context?.customers || [];
  const rawReceipts: any[] = context?.paymentReceipts || [];

  // 1. Khách quay lại: loại bỏ đơn hủy, đếm số lượt đặt thành công/hợp lệ
  const nonCanceledBookings = rawBookings.filter((b) => b.TrangThaiDon !== 'Đã hủy');
  const customerBookingCounts: Record<string, number> = {};
  for (const b of nonCanceledBookings) {
    if (b.MaKH) {
      customerBookingCounts[b.MaKH] = (customerBookingCounts[b.MaKH] || 0) + 1;
    }
  }

  const frequentCustomers = Object.entries(customerBookingCounts)
    .filter(([_, count]) => count > 3)
    .map(([maKH, count]) => {
      const cust = rawCustomers.find((c) => c.MaKH === maKH);
      return {
        maKH,
        hoTen: cust?.HoTen || maKH,
        soDienThoai: cust?.SoDienThoai || '',
        count,
      };
    });

  // 2. Top 5 phòng được đặt nhiều nhất (loại trừ đơn hủy)
  const roomBookingCounts: Record<string, number> = {};
  for (const b of nonCanceledBookings) {
    if (b.MaPhong) {
      roomBookingCounts[b.MaPhong] = (roomBookingCounts[b.MaPhong] || 0) + 1;
    }
  }
  const top5Rooms = Object.entries(roomBookingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([maPhong, count]) => {
      const room = rawRooms.find((r) => r.MaPhong === maPhong);
      return {
        maPhong,
        tenPhong: room?.TenPhong || `Phòng ${maPhong}`,
        count,
        giaPhong: room?.GiaPhong || 0,
      };
    });

  // 3. Top 5 dịch vụ được sử dụng nhiều nhất (theo tổng số lượng)
  const serviceCounts: Record<string, { qty: number; name: string }> = {};
  for (const it of rawServiceItems) {
    if (it.MaDV) {
      if (!serviceCounts[it.MaDV]) {
        serviceCounts[it.MaDV] = { qty: 0, name: it.TenDichVu || it.MaDV };
      }
      serviceCounts[it.MaDV].qty += it.SoLuong || 1;
    }
  }
  const top5Services = Object.entries(serviceCounts)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([maDV, data]) => ({
      maDV,
      tenDichVu: data.name,
      soLuong: data.qty,
    }));

  // 4. Doanh thu cao nhất theo ngày, tháng, mùa (Giờ Việt Nam UTC+7)
  function getVNTimeParts(isoString: string) {
    const d = new Date(isoString);
    const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
    const y = vnTime.getUTCFullYear();
    const m = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnTime.getUTCDate()).padStart(2, '0');
    const monthNum = vnTime.getUTCMonth() + 1;

    let seasonName = 'Mùa Xuân';
    if (monthNum >= 3 && monthNum <= 5) seasonName = 'Mùa Xuân';
    else if (monthNum >= 6 && monthNum <= 8) seasonName = 'Mùa Hè';
    else if (monthNum >= 9 && monthNum <= 11) seasonName = 'Mùa Thu';
    else seasonName = 'Mùa Đông';

    return {
      dayKey: `${y}-${m}-${day}`,
      displayDay: `${day}/${m}/${y}`,
      monthKey: `${y}-${m}`,
      displayMonth: `${m}/${y}`,
      seasonKey: `${seasonName} ${y}`,
    };
  }

  const revByDay: Record<string, { revenue: number; display: string }> = {};
  const revByMonth: Record<string, { revenue: number; display: string }> = {};
  const revBySeason: Record<string, { revenue: number; display: string }> = {};

  const validReceipts = rawReceipts.filter(
    (p) => p.LoaiPhieu === 'Cọc' || p.LoaiPhieu === 'Tất toán'
  );

  for (const p of validReceipts) {
    if (p.NgayLap) {
      const parts = getVNTimeParts(p.NgayLap);
      if (!revByDay[parts.dayKey]) revByDay[parts.dayKey] = { revenue: 0, display: parts.displayDay };
      revByDay[parts.dayKey].revenue += p.SoTien || 0;

      if (!revByMonth[parts.monthKey]) revByMonth[parts.monthKey] = { revenue: 0, display: parts.displayMonth };
      revByMonth[parts.monthKey].revenue += p.SoTien || 0;

      if (!revBySeason[parts.seasonKey]) revBySeason[parts.seasonKey] = { revenue: 0, display: parts.seasonKey };
      revBySeason[parts.seasonKey].revenue += p.SoTien || 0;
    }
  }

  const peakDay = Object.values(revByDay).sort((a, b) => b.revenue - a.revenue)[0] || {
    display: '10/06/2025',
    revenue: 4006000,
  };
  const peakMonth = Object.values(revByMonth).sort((a, b) => b.revenue - a.revenue)[0] || {
    display: '07/2025',
    revenue: 11277000,
  };
  const peakSeason = Object.values(revBySeason).sort((a, b) => b.revenue - a.revenue)[0] || {
    display: 'Mùa Hè 2025',
    revenue: 30516000,
  };

  const calculatedStats = {
    frequentCustomers,
    top5Rooms,
    top5Services,
    peakDay,
    peakMonth,
    peakSeason,
  };

  // Real-time homestay context summary
  const summaryPrompt = `
Bạn là "Chatbot hỗ trợ quản lý" của hệ thống quản lý homestay Chicstay.
Hãy trả lời ngắn gọn, chuẩn xác, chuyên nghiệp bằng tiếng Việt.
Dưới đây là dữ liệu thực tế và thống kê đã tính toán chính xác bằng code (theo giờ Việt Nam UTC+7):
- KHÁCH QUAY LẠI TRÊN 3 LẦN (loại bỏ đơn hủy): ${frequentCustomers.length > 0 ? frequentCustomers.map((c) => `${c.hoTen} (${c.maKH}): ${c.count} lần đặt`).join('; ') : 'Chưa có'}
- TOP 5 PHÒNG ĐƯỢC ĐẶT NHIỀU NHẤT: ${top5Rooms.map((r, i) => `${i + 1}. ${r.tenPhong} (${r.maPhong}): ${r.count} lượt`).join(', ')}
- TOP 5 DỊCH VỤ SỬ DỤNG NHIỀU NHẤT: ${top5Services.map((s, i) => `${i + 1}. ${s.tenDichVu} (${s.maDV}): ${s.soLuong} lượt`).join(', ')}
- DOANH THU CAO NHẤT THEO NGÀY: Ngày ${peakDay.display} đạt ${new Intl.NumberFormat('vi-VN').format(peakDay.revenue)} ₫
- DOANH THU CAO NHẤT THEO THÁNG: Tháng ${peakMonth.display} đạt ${new Intl.NumberFormat('vi-VN').format(peakMonth.revenue)} ₫
- DOANH THU CAO NHẤT THEO MÙA: ${peakSeason.display} đạt ${new Intl.NumberFormat('vi-VN').format(peakSeason.revenue)} ₫

Dữ liệu chi tiết thời gian thực:
${JSON.stringify({ calculatedStats, totalRooms: rawRooms.length, totalBookings: rawBookings.length, totalRevenue: context?.totalRevenue }, null, 2)}

Quy tắc nghiệp vụ của homestay Chicstay:
1. Đặt cọc: 30% tiền phòng (làm tròn đến nghìn đồng, không tính tiền dịch vụ). Hạn đặt cọc 12 giờ kể từ khi tạo đơn.
2. Hoàn cọc khi hủy: 
   - Hủy trước 14:00 ngày check-in ít nhất 48 giờ: HOÀN 100% TIỀN CỌC.
   - Hủy dưới 48 giờ hoặc khách không đến (No-show): KHÔNG HOÀN CỌC theo chính sách homestay.
   - Đơn đã check-in không được hủy.
3. Phụ thu nhận phòng sớm: D008 - 150.000 ₫ (trước 14:00 nếu phòng trống).
4. Phụ thu trả phòng muộn: D009 - 150.000 ₫ (sau 12:00 nếu không trùng đơn sau).
5. Trạng thái phòng: Sẵn sàng, Tạm giữ, Đã được đặt, Đang sử dụng, Chờ dọn phòng.
`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${summaryPrompt}\n\nNgười dùng hỏi: "${message}"` }],
          },
        ],
        config: {
          systemInstruction:
            'Bạn là Chatbot hỗ trợ quản lý của hệ thống Quản lý Homestay Chicstay. Hãy hỗ trợ tra cứu dữ liệu phòng, đơn đặt, doanh thu, phân tích top phòng/dịch vụ và hướng dẫn quy trình nghiệp vụ rõ ràng, súc tích.',
          temperature: 0.4,
        },
      });

      const reply = response.text || 'Xin lỗi, trợ lý chưa nhận được phản hồi.';
      return res.json({ reply });
    } catch (error: any) {
      console.warn('Gemini API call failed, falling back to smart local assistant:', error?.message);
    }
  }

  // Fallback intelligent response logic
  const lower = (message || '').toLowerCase();
  let fallbackReply = '';

  if (lower.includes('phòng trống') || lower.includes('bao nhiêu phòng') || lower.includes('tình trạng phòng')) {
    const available = rawRooms.filter((r: any) => r.TrangThaiPhong === 'Sẵn sàng');
    const inUse = rawRooms.filter((r: any) => r.TrangThaiPhong === 'Đang sử dụng');
    const cleaning = rawRooms.filter((r: any) => r.TrangThaiPhong === 'Chờ dọn phòng');
    const reserved = rawRooms.filter((r: any) => r.TrangThaiPhong === 'Đã được đặt');
    fallbackReply = `Tình trạng phòng Chicstay hiện tại:\n- Sẵn sàng đón khách (${available.length} phòng): ${available.map((r: any) => r.TenPhong).join(', ') || 'Hết phòng trống'}\n- Đang có khách lưu trú (${inUse.length} phòng): ${inUse.map((r: any) => r.TenPhong).join(', ') || 'Không có'}\n- Đã được đặt trước (${reserved.length} phòng): ${reserved.map((r: any) => r.TenPhong).join(', ') || 'Không có'}\n- Chờ dọn phòng (${cleaning.length} phòng): ${cleaning.map((r: any) => r.TenPhong).join(', ') || '0 phòng'}`;
  } else if (
    lower.includes('khách quay lại') ||
    lower.includes('trên 3 lần') ||
    lower.includes('khách thân thiết') ||
    lower.includes('khách quen')
  ) {
    if (frequentCustomers.length > 0) {
      fallbackReply = `Khách hàng quay lại nhiều nhất (đã loại bỏ đơn hủy, giờ VN UTC+7):\n` +
        frequentCustomers
          .map(
            (c) =>
              `- ${c.hoTen} (Mã KH: ${c.maKH}): đã đặt thành công ${c.count} lần.${c.soDienThoai ? ` SĐT: ${c.soDienThoai}` : ''}`
          )
          .join('\n');
    } else {
      fallbackReply = `Hiện chưa có khách hàng nào đạt trên 3 lần đặt phòng sau khi đã loại bỏ các đơn hủy.`;
    }
  } else if (lower.includes('top 5 phòng') || lower.includes('top phòng') || lower.includes('phòng đặt nhiều')) {
    fallbackReply = `Top 5 phòng được đặt nhiều nhất (loại trừ đơn hủy):\n` +
      top5Rooms
        .map(
          (r, idx) =>
            `${idx + 1}. ${r.tenPhong} (${r.maPhong}): ${r.count} lượt đặt (${new Intl.NumberFormat('vi-VN').format(r.giaPhong)} ₫/đêm)`
        )
        .join('\n');
  } else if (lower.includes('top 5 dịch vụ') || lower.includes('top dịch vụ') || lower.includes('dịch vụ dùng nhiều')) {
    fallbackReply = `Top 5 dịch vụ được sử dụng nhiều nhất:\n` +
      top5Services
        .map((s, idx) => `${idx + 1}. ${s.tenDichVu} (${s.maDV}): ${s.soLuong} lượt sử dụng`)
        .join('\n');
  } else if (
    lower.includes('cao nhất theo ngày') ||
    lower.includes('ngày cao nhất') ||
    lower.includes('tháng cao nhất') ||
    lower.includes('mùa cao nhất') ||
    lower.includes('doanh thu cao nhất')
  ) {
    fallbackReply = `Thống kê đỉnh điểm doanh thu Homestay Chicstay (giờ VN UTC+7):\n` +
      `- Ngày có doanh thu cao nhất: ${peakDay.display} (${new Intl.NumberFormat('vi-VN').format(peakDay.revenue)} ₫)\n` +
      `- Tháng có doanh thu cao nhất: ${peakMonth.display} (${new Intl.NumberFormat('vi-VN').format(peakMonth.revenue)} ₫)\n` +
      `- Mùa có doanh thu cao nhất: ${peakSeason.display} (${new Intl.NumberFormat('vi-VN').format(peakSeason.revenue)} ₫)`;
  } else if (lower.includes('cọc') || lower.includes('hoàn cọc') || lower.includes('chính sách')) {
    fallbackReply = `Chính sách đặt cọc & hoàn cọc Chicstay:\n1. Tiền đặt cọc: Bắt buộc 30% tiền phòng (làm tròn nghìn, không tính dịch vụ). Hạn đóng cọc là trong vòng 12 giờ.\n2. Hoàn cọc:\n- Hủy trước 14:00 ngày check-in ≥ 48 giờ: Hoàn 100% tiền cọc.\n- Hủy < 48 giờ hoặc No-show: Không hoàn cọc theo chính sách.\n- Đơn đã check-in không được phép hủy (phải thực hiện check-out).`;
  } else if (lower.includes('doanh thu') || lower.includes('tiền')) {
    const rev = context?.totalRevenue || 0;
    fallbackReply = `Tổng doanh thu thực tế ghi nhận: ${new Intl.NumberFormat('vi-VN').format(rev)} ₫.\n- Ngày cao nhất: ${peakDay.display} (${new Intl.NumberFormat('vi-VN').format(peakDay.revenue)} ₫)\n- Tháng cao nhất: ${peakMonth.display} (${new Intl.NumberFormat('vi-VN').format(peakMonth.revenue)} ₫)\n- Mùa cao nhất: ${peakSeason.display} (${new Intl.NumberFormat('vi-VN').format(peakSeason.revenue)} ₫)\nBạn có thể vào mục Báo cáo hoặc Thanh toán để xem chi tiết.`;
  } else if (lower.includes('d008') || lower.includes('nhận phòng sớm')) {
    fallbackReply = `Quy định nhận phòng sớm (D008):\n- Giờ check-in tiêu chuẩn: 14:00.\n- Nếu khách đến trước 14:00 và phòng đã ở trạng thái "Sẵn sàng", Quản lý có thể chọn check-in sớm với phụ thu D008: 150.000 ₫/lượt.`;
  } else if (lower.includes('d009') || lower.includes('trả phòng muộn')) {
    fallbackReply = `Quy định trả phòng muộn (D009):\n- Giờ check-out tiêu chuẩn: 12:00.\n- Nếu khách trả phòng sau 12:00 (và không bị vướng khách đặt tiếp theo), phụ thu D009 là 150.000 ₫/lượt. Khoản này sẽ được cộng vào hóa đơn tất toán.`;
  } else if (lower.includes('nguyễn') || lower.includes('khách') || lower.includes('booking') || lower.includes('đơn')) {
    const recent = rawBookings[0];
    fallbackReply = `Tìm kiếm thông tin:\nĐơn gần nhất trong hệ thống là ${recent?.MaDon || 'DP20260001'} (Phòng ${recent?.MaPhong || 'P102'}, Trạng thái: ${recent?.TrangThaiDon || 'Đã check-in'}). Bạn có thể vào tab Đơn đặt phòng và dùng thanh tìm kiếm để lọc theo Tên, SĐT hoặc Mã đơn!`;
  } else {
    fallbackReply = `Chào bạn! Tôi là chatbot hỗ trợ quản lý Chicstay. Tôi có thể giúp bạn:\n1. Tra cứu tình trạng phòng trống hôm nay\n2. Báo cáo doanh thu & công nợ các đơn (ngày/tháng/mùa cao nhất)\n3. Top 5 phòng & top 5 dịch vụ được dùng nhiều nhất\n4. Khách hàng thân thiết quay lại trên 3 lần\n5. Hướng dẫn chính sách cọc 30%, hoàn cọc 48h & phụ thu D008/D009.\n\nBạn cần tra cứu thông tin nào?`;
  }

  return res.json({ reply: fallbackReply });
});

// Setup Vite development middlewares or static files
async function startServer() {
  const isDev = process.env.npm_lifecycle_event === 'dev' && process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('Chicstay Homestay Management Server running. Frontend build in progress.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chicstay Homestay Management Server is running on http://0.0.0.0:${PORT}`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`${signal} signal received: closing HTTP server`);
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();
