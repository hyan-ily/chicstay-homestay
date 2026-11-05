import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { PhuongThucThanhToan } from '../types';
import { formatVND, formatDate, useLockScroll, normalizeDiscountRate, generateVietQRUrl } from '../utils/helpers';
import { generatePrintableDocHtml } from '../utils/printHelpers';

interface DepositReceiptModalProps {
  maDon: string;
  depositData?: {
    amount: number;
    method: PhuongThucThanhToan;
    txnCode?: string;
  };
  onClose: () => void;
}

export const DepositReceiptModal: React.FC<DepositReceiptModalProps> = ({
  maDon,
  depositData,
  onClose,
}) => {
  const { bookings, customers, rooms, bankConfig, paymentReceipts } = useHomestay();

  const booking = bookings.find((b) => b.MaDon === maDon);
  const customer = customers.find((c) => c.MaKH === booking?.MaKH);
  const room = rooms.find((r) => r.MaPhong === booking?.MaPhong);

  const existingReceipt = paymentReceipts.find(
    (p) => p.MaDon === maDon && p.LoaiPhieu === 'Cọc'
  );

  useLockScroll(Boolean(booking));

  const maPhieu = existingReceipt?.MaPhieu || `PT-COC-${booking ? booking.MaDon.replace('DP', '') : ''}`;
  const actualAmount = depositData?.amount !== undefined
    ? depositData.amount
    : (booking?.DaThu && booking.DaThu > 0 ? booking.DaThu : (booking?.TienCocYeuCau ?? 0));
  const paymentMethod = depositData?.method || existingReceipt?.PhuongThuc || 'VietQR';

  // Đánh dấu lớp in trên body khi modal mở
  useEffect(() => {
    if (!booking) return;
    document.body.classList.add('has-print-modal');
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, [booking]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Lỗi gọi window.print(), chuyển sang in dự phòng qua Blob:', err);
      try {
        const el = document.getElementById('chicstay-printable-deposit');
        if (el) {
          const fullHtml = generatePrintableDocHtml('Phiếu thu đặt cọc', maPhieu, el.innerHTML);
          const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          const win = window.open(blobUrl, '_blank');
          if (win) win.focus();
        }
      } catch (e) {
        console.warn('Lỗi in dự phòng:', e);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maPhieu]);

  if (!booking) return null;

  const hasDiscount = Boolean(booking.TienUuDai && booking.TienUuDai > 0);
  const tierName = booking.HangThanhVienApDung;
  const rawDiscountRate = booking.TyLeUuDaiApDung ?? 0;
  const { ratePercent: discountRate } = normalizeDiscountRate(rawDiscountRate);
  const discountAmount = booking.TienUuDai ?? 0;
  const rawRoomPrice = booking.TienPhongGoc ?? (hasDiscount ? booking.TienPhong + discountAmount : booking.TienPhong);

  const todayStr = (() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  })();

  const qrImageUrl = generateVietQRUrl(
    bankConfig.bankCode,
    bankConfig.accountNo,
    bankConfig.accountName,
    actualAmount,
    `${booking.MaDon} COC`
  );

  return createPortal(
    <div
      id="chicstay-deposit-modal-root"
      className="invoice-modal-root fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 print:p-0 print:bg-white overscroll-contain"
    >
      <div className="invoice-modal-dialog bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate print:max-h-none print:overflow-visible print:shadow-none print:m-0 print:w-full print:max-w-none print:rounded-none">
        {/* Header Modal */}
        <div className="invoice-modal-header flex-shrink-0 bg-white px-6 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                PHIẾU THU ĐẶT CỌC
              </h2>
              <span className="text-[11px] text-slate-500 block">
                Mã phiếu: <strong className="text-blue-700">{maPhieu}</strong> · Đơn: <strong className="text-slate-900">{booking.MaDon}</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors active:scale-95"
              title="Mở hộp thoại in phiếu thu đặt cọc hoặc lưu thành tệp PDF"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu cọc</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bản trình bày Phiếu Thu Đặt Cọc chuẩn xác theo ảnh mẫu 377edf8f.png */}
        <div
          id="chicstay-printable-deposit"
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 text-slate-800 text-xs overscroll-contain print:overflow-visible print:p-0 bg-white"
        >
          {/* Header Thông Tin Homestay & Tiêu Đề */}
          <div className="flex items-start justify-between pb-3 border-b-2 border-slate-900">
            <div>
              <div className="text-2xl font-black tracking-tight text-blue-600 uppercase">
                CHICSTAY HOMESTAY
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Địa chỉ: Số 18 Đường Mây Ngàn, P.3, TP. Đà Lạt - Hotline: 0988.123.456
              </p>
              <p className="text-[11px] text-slate-500">
                Email: booking@chicstay.vn - Website: chicstay.vn
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900 block uppercase">
                PHIẾU THU ĐẶT CỌC
              </span>
              <div className="text-xs font-semibold text-slate-700 mt-0.5">
                Mã : <strong className="text-blue-600 font-mono">{maPhieu}</strong>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Ngày: {todayStr}
              </div>
            </div>
          </div>

          {/* Khung Thông Tin Khách Hàng & Thông Tin Lưu Trú (Grid 2 cột trong 1 khung bo góc như ảnh) */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-white rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                KHÁCH HÀNG:
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <strong className="text-sm font-black text-slate-900">
                  {customer?.HoTen || 'Khách vãng lai'}
                </strong>
                {tierName && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {tierName}
                  </span>
                )}
              </div>
              <div className="text-slate-600 text-xs mt-0.5">
                Số ĐT: {customer?.SoDienThoai || '--'} · CCCD: {customer?.CCCD || '--'}
              </div>
              <div className="text-slate-600 text-xs mt-0.5">
                Địa chỉ: {customer?.DiaChi || 'Quảng Ninh'}
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                THÔNG TIN LƯU TRÚ:
              </span>
              <strong className="text-sm font-black text-slate-900 block mt-0.5">
                Phòng {booking.MaPhong} ({room?.TenPhong || `Phòng ${booking.MaPhong.slice(1)}`})
              </strong>
              <div className="text-slate-600 text-xs mt-0.5">
                Nhận: {formatDate(booking.NgayNhanPhong)} → Trả: {formatDate(booking.NgayTraPhong)} ({booking.SoDem} đêm)
              </div>
              <div className="text-slate-600 text-xs mt-0.5">
                Số lượng: {booking.SoKhach} khách · Mã đơn: <span className="font-mono font-semibold">{booking.MaDon}</span>
              </div>
            </div>
          </div>

          {/* Bảng Khoản Mục Đặt Cọc */}
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-2.5 px-3">KHOẢN MỤC ĐẶT CỌC</th>
                <th className="py-2.5 px-3 text-center">ĐVT</th>
                <th className="py-2.5 px-3 text-center">SỐ LƯỢNG</th>
                <th className="py-2.5 px-3 text-right">ĐƠN GIÁ</th>
                <th className="py-2.5 px-3 text-right">THÀNH TIỀN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2.5 px-3">
                  <strong className="text-slate-900">Tiền phòng {booking.MaPhong}</strong>
                  <span className="block text-[11px] text-slate-500">
                    Từ {formatDate(booking.NgayNhanPhong)} đến {formatDate(booking.NgayTraPhong)} ({booking.SoDem} đêm)
                  </span>
                  {hasDiscount && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Ưu đãi {tierName} (-{discountRate}%): Giảm {formatVND(discountAmount)}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">Đêm</td>
                <td className="py-2.5 px-3 text-center font-bold">{booking.SoDem}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {formatVND(room ? room.GiaPhong : rawRoomPrice / booking.SoDem)}
                </td>
                <td className="py-2.5 px-3 text-right font-black tabular-nums text-slate-900">
                  {formatVND(booking.TienPhong)}
                </td>
              </tr>

              {/* Dòng highlight màu vàng nhạt như ảnh */}
              <tr className="bg-amber-50/70">
                <td className="py-2.5 px-3">
                  <strong className="text-slate-900 block">Tỷ lệ tiền cọc yêu cầu giữ chỗ: 30% tiền phòng</strong>
                  <span className="text-[11px] text-slate-600 italic">
                    (Tính trên tiền phòng thực tế, làm tròn theo quy định)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-medium">%</td>
                <td className="py-2.5 px-3 text-center font-bold text-amber-900">30%</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">30%</td>
                <td className="py-2.5 px-3 text-right font-black tabular-nums text-amber-900">
                  {formatVND(actualAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* PHẦN SIDE-BY-SIDE: Mã VietQR bên TRÁI & Tóm tắt số tiền bên PHẢI (như ảnh 377edf8f.png) */}
          <div className="grid grid-cols-12 gap-3.5 items-stretch pt-2">
            {/* Cột trái: Khối VietQR Box bo viền vàng nhạt với ô QR to rõ ràng dễ quét */}
            <div className="col-span-7 p-3.5 bg-amber-50/60 border border-amber-300 rounded-xl flex items-center gap-3.5">
              <div className="bg-white p-1.5 rounded-xl border border-amber-300 shrink-0 shadow-xs flex items-center justify-center">
                <img
                  src={qrImageUrl}
                  alt="VietQR Chuyển Khoản Cọc"
                  className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
                />
              </div>
              <div className="text-xs space-y-1 text-slate-800 leading-snug min-w-0 flex-1">
                <div className="font-extrabold text-amber-900 uppercase text-[11px] tracking-wide">
                  MÃ VIETQR CHUYỂN KHOẢN CỌC
                </div>
                <div className="text-[11px]">
                  Ngân hàng: <strong>{bankConfig.bankName}</strong>
                </div>
                <div className="text-[11px]">
                  STK: <strong className="font-mono text-slate-900 text-xs">{bankConfig.accountNo}</strong>
                </div>
                <div className="text-[11px]">
                  Chủ TK: <strong className="uppercase">{bankConfig.accountName}</strong>
                </div>
                <div className="text-[11px]">
                  Số tiền: <strong className="text-amber-900 text-xs">{formatVND(actualAmount)}</strong>
                </div>
                <div className="pt-0.5">
                  Nội dung: <span className="bg-amber-200/90 text-amber-950 font-extrabold px-1.5 py-0.5 rounded font-mono text-[10.5px] border border-amber-300">{booking.MaDon} COC</span>
                </div>
              </div>
            </div>

            {/* Cột phải: Bảng Tóm Tắt Số Tiền căn phải */}
            <div className="col-span-5 space-y-1 text-xs flex flex-col justify-between py-0.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền phòng:</span>
                  <span className="tabular-nums font-semibold">{formatVND(booking.TienPhong)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tiền cọc yêu cầu (30%):</span>
                  <span className="tabular-nums font-semibold">{formatVND(booking.TienCocYeuCau)}</span>
                </div>
                <div className="flex justify-between text-slate-950 font-black text-sm border-t border-slate-200 pt-1.5">
                  <span>SỐ CỌC CẦN THU (30%):</span>
                  <span className="tabular-nums text-base text-slate-950">{formatVND(actualAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-[11px] pt-0.5">
                  <span className="shrink-0 mr-1">Hình thức:</span>
                  <span className="font-semibold text-right">
                    {paymentMethod === 'VietQR' ? `VietQR (${bankConfig.bankName})` : 'Tiền mặt tại quầy'}
                  </span>
                </div>
              </div>
              <p className="text-[9.5px] text-slate-400 italic pt-1 text-left leading-tight">
                * Lưu ý: Tiền phòng còn lại cùng các chi phí dịch vụ phát sinh thực tế sẽ được tổng hợp và tất toán tại thời điểm check-out.
              </p>
            </div>
          </div>

          {/* Khung Chính Sách Lưu Ý Khi Đặt Cọc (như ảnh 377edf8f.png) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
            <div className="font-bold text-slate-900 uppercase text-[11px]">
              CHÍNH SÁCH LƯU Ý KHI ĐẶT CỌC:
            </div>
            <div>
              • <strong>Giờ nhận &amp; trả phòng:</strong> Nhận từ 14:00 ngày {formatDate(booking.NgayNhanPhong)}; Trả trước 12:00 ngày {formatDate(booking.NgayTraPhong)}.
            </div>
            <div>
              • <strong>Chính sách hoàn tiền cọc (Quy tắc 48 giờ):</strong> Hủy phòng trước 14:00 ngày nhận phòng ít nhất 48 giờ được hoàn lại 100% tiền cọc ({formatVND(actualAmount)}). Trường hợp hủy sau 48 giờ hoặc No-show, tiền cọc sẽ không được hoàn trả.
            </div>
            <div>
              • <strong>Giấy tờ tùy thân:</strong> Quý khách vui lòng xuất trình CCCD hoặc hộ chiếu bản gốc khi nhận phòng.
            </div>
          </div>

          {/* Chữ Ký Xác Nhận 2 Bên (như ảnh 377edf8f.png) */}
          <div className="pt-5 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
            <div>
              <span className="font-bold text-slate-800 block uppercase">KHÁCH HÀNG</span>
              <span className="text-[10px] text-slate-400 italic block mt-0.5">(Ký và ghi rõ họ tên)</span>
              <div className="h-12 flex items-end justify-center font-bold text-slate-900">
                {customer?.HoTen}
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block uppercase">ĐẠI DIỆN HOMESTAY CHICSTAY</span>
              <span className="text-[10px] text-slate-400 italic block mt-0.5">(Xác nhận đã nhận cọc 30%)</span>
              <div className="h-12 flex items-end justify-center font-bold text-blue-700">
                Quản lý Chicstay (Đã duyệt)
              </div>
            </div>
          </div>

          {/* Lời Cảm Ơn Cuối Trang */}
          <div className="text-center text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            Cảm ơn quý khách đã tin tưởng và lựa chọn Chicstay Homestay. Hẹn gặp lại quý khách!
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
