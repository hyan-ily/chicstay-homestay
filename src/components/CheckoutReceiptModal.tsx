import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, CheckCheck } from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { PhuongThucThanhToan } from '../types';
import { formatVND, formatDate, useLockScroll, normalizeDiscountRate, generateVietQRUrl } from '../utils/helpers';
import { generatePrintableDocHtml } from '../utils/printHelpers';

interface CheckoutReceiptModalProps {
  maDon: string;
  checkoutData?: {
    applyLateCheckOutFee?: boolean;
    paymentAmount?: number;
    method?: PhuongThucThanhToan;
    txnCode?: string;
  };
  onClose: () => void;
}

export const CheckoutReceiptModal: React.FC<CheckoutReceiptModalProps> = ({
  maDon,
  checkoutData,
  onClose,
}) => {
  const { services, bookings, customers, rooms, serviceItems, invoices, paymentReceipts, bankConfig } = useHomestay();

  const booking = bookings.find((b) => b.MaDon === maDon);
  const customer = customers.find((c) => c.MaKH === booking?.MaKH);
  const room = rooms.find((r) => r.MaPhong === booking?.MaPhong);
  const invoice = invoices.find((h) => h.MaDon === maDon);

  const existingReceipt = paymentReceipts.find(
    (p) => p.MaDon === maDon && p.LoaiPhieu === 'Tất toán'
  );

  const rawItems = serviceItems.filter(
    (s) => s.MaDon === maDon && (s.TrangThaiThucHien !== 'Đã hủy' || (s.TyLeThuHuy && s.TyLeThuHuy > 0))
  );

  useLockScroll(Boolean(booking));

  const maHD = invoice?.MaHoaDon || existingReceipt?.MaPhieu || `HD2025-${booking ? booking.MaDon.replace('DP', '') : ''}`;

  // Kiểm tra phụ thu trả muộn D009
  const hasExistingD009 = rawItems.some((s) => s.MaDV === 'D009');
  const addLateFee = !hasExistingD009 && Boolean(checkoutData?.applyLateCheckOutFee);
  const lateFeeAmount = addLateFee ? 150000 : 0;

  const totalServicesAmount = booking ? booking.TienDichVu + lateFeeAmount : 0;
  const grandTotal = booking ? booking.TongTien + lateFeeAmount : 0;
  const depositPaid = invoice ? invoice.TienCocDaTra : (booking?.DaThu ?? 0);
  const defaultRemaining = Math.max(0, grandTotal - depositPaid);
  const checkoutPaymentAmount = checkoutData?.paymentAmount !== undefined
    ? checkoutData.paymentAmount
    : (invoice ? invoice.TienThanhToanKhiCheckOut : (booking?.ConLai ?? defaultRemaining));
  const paymentMethod = checkoutData?.method || invoice?.PhuongThuc || existingReceipt?.PhuongThuc || 'VietQR';

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
        const el = document.getElementById('chicstay-printable-checkout');
        if (el) {
          const fullHtml = generatePrintableDocHtml('Hóa đơn tất toán', maHD, el.innerHTML);
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
  }, [maHD]);

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
    checkoutPaymentAmount > 0 ? checkoutPaymentAmount : grandTotal,
    `${booking?.MaDon || 'DP'} CHECKOUT`
  );

  if (!booking) return null;

  const hasDiscount = Boolean((booking.TienUuDai && booking.TienUuDai > 0) || (invoice?.TienUuDai && invoice.TienUuDai > 0));
  const tierName = booking.HangThanhVienApDung || invoice?.HangThanhVienApDung;
  const rawDiscountRate = booking.TyLeUuDaiApDung ?? invoice?.TyLeUuDaiApDung ?? 0;
  const { ratePercent: discountRate } = normalizeDiscountRate(rawDiscountRate);
  const discountAmount = booking.TienUuDai ?? invoice?.TienUuDai ?? 0;
  const rawRoomPrice = booking.TienPhongGoc ?? invoice?.TienPhongGoc ?? (hasDiscount ? booking.TienPhong + discountAmount : booking.TienPhong);

  return createPortal(
    <div
      id="chicstay-checkout-modal-root"
      className="invoice-modal-root fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 print:p-0 print:bg-white overscroll-contain"
    >
      <div className="invoice-modal-dialog bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate print:max-h-none print:overflow-visible print:shadow-none print:m-0 print:w-full print:max-w-none print:rounded-none">
        {/* Header Modal */}
        <div className="invoice-modal-header flex-shrink-0 bg-white px-6 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                HÓA ĐƠN TẤT TOÁN
              </h2>
              <span className="text-[11px] text-slate-500 block">
                Mã hóa đơn: <strong className="text-blue-700">{maHD}</strong> · Đơn: <strong className="text-slate-900">{booking.MaDon}</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors active:scale-95"
              title="Mở hộp thoại in hóa đơn tất toán hoặc lưu thành tệp PDF"
            >
              <Printer className="w-4 h-4" />
              <span>In Hóa Đơn</span>
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

        {/* Bản trình bày Hóa Đơn Tổng Hợp / Tất Toán chuẩn xác theo mẫu ảnh faffe958.png */}
        <div
          id="chicstay-printable-checkout"
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
                Email: booking@chicstay.vn · Website: chicstay.vn
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900 block uppercase">
                HÓA ĐƠN TỔNG HỢP
              </span>
              <div className="text-xs font-semibold text-slate-700 mt-0.5">
                Mã : <strong className="text-blue-600 font-mono">{maHD}</strong>
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
                Địa chỉ: {customer?.DiaChi || 'Đà Nẵng'}
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

          {/* Bảng Kê Chi Tiết Tiền Phòng & Dịch Vụ */}
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-2.5 px-3">NỘI DUNG THANH TOÁN</th>
                <th className="py-2.5 px-3 text-center">ĐVT</th>
                <th className="py-2.5 px-3 text-center">SL</th>
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

              {/* Dịch vụ phụ thu check-out muộn D009 nếu có */}
              {addLateFee && (
                <tr className="bg-purple-50/60">
                  <td className="py-2.5 px-3">
                    <strong className="text-purple-950 block">Phụ thu Trả phòng muộn (Check-out sau 12:00)</strong>
                    <span className="text-[11px] text-purple-700">
                      Mã dịch vụ: D009 · Áp dụng khi khách trả phòng sau mốc 12:00
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium">Lượt</td>
                  <td className="py-2.5 px-3 text-center font-bold text-purple-900">1</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatVND(150000)}</td>
                  <td className="py-2.5 px-3 text-right font-black tabular-nums text-purple-950">{formatVND(150000)}</td>
                </tr>
              )}

              {/* Các dịch vụ phát sinh */}
              {rawItems.map((it, idx) => {
                const sDef = services.find((s) => s.MaDV === it.MaDV);
                const donViTinh = it.DonViTinh || sDef?.DonViTinh || 'Lượt';
                const isCancelledWithFee = it.TrangThaiThucHien === 'Đã hủy' && (it.TyLeThuHuy ?? 0) > 0;

                return (
                  <tr key={idx} className={isCancelledWithFee ? 'bg-amber-50/50' : ''}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-slate-900">{it.TenDichVu}</strong>
                        {isCancelledWithFee && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-bold border border-amber-300">
                            Phí hủy 30%
                          </span>
                        )}
                      </div>
                      {isCancelledWithFee ? (
                        <span className="block text-[11px] text-amber-800 font-medium mt-0.5">
                          * Chú thích: Khách hủy khi đang thực hiện (Thu phí 30%: {formatVND(it.ThanhTien)})
                        </span>
                      ) : it.GhiChu ? (
                        <span className="block text-[10px] text-slate-400">{it.GhiChu}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-700">{donViTinh}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{it.SoLuong}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatVND(it.DonGiaTaiThoiDiem)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black tabular-nums text-slate-900">
                      {formatVND(it.ThanhTien)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PHẦN SIDE-BY-SIDE: Mã VietQR bên TRÁI & Tóm tắt số tiền bên PHẢI (chuẩn theo ảnh faffe958.png) */}
          <div className="grid grid-cols-12 gap-3.5 items-stretch pt-2">
            {/* Cột trái: Khối VietQR Tất Toán bo viền xanh nhạt với ô QR to rõ ràng dễ quét */}
            <div className="col-span-7 p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl flex items-center gap-3.5">
              <div className="bg-white p-1.5 rounded-xl border border-blue-200 shrink-0 shadow-xs flex items-center justify-center">
                <img
                  src={qrImageUrl}
                  alt="VietQR Tất Toán Check-out"
                  className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
                />
              </div>
              <div className="text-xs space-y-1 text-slate-800 leading-snug min-w-0 flex-1">
                <div className="font-extrabold text-blue-900 uppercase text-[11px] tracking-wide">
                  MÃ VIETQR TẤT TOÁN CHECK-OUT
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
                  Số tiền: <strong className="text-blue-700 text-xs">{formatVND(checkoutPaymentAmount > 0 ? checkoutPaymentAmount : grandTotal)}</strong>
                </div>
                <div className="pt-0.5">
                  Nội dung: <span className="bg-blue-100 text-blue-900 font-extrabold px-1.5 py-0.5 rounded font-mono text-[10.5px] border border-blue-200">{booking.MaDon} CHECKOUT</span>
                </div>
              </div>
            </div>

            {/* Cột phải: Bảng Tóm Tắt Quyết Toán Số Tiền */}
            <div className="col-span-5 space-y-1.5 text-xs text-slate-800 flex flex-col justify-between py-0.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền phòng:</span>
                  <span className="tabular-nums font-semibold">{formatVND(booking.TienPhong)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tiền dịch vụ phát sinh:</span>
                  <span className="tabular-nums font-semibold">{formatVND(totalServicesAmount)}</span>
                </div>
                <div className="border-t-2 border-slate-900 pt-1 flex justify-between font-bold text-slate-900">
                  <span>Tổng giá trị đơn:</span>
                  <span className="tabular-nums">{formatVND(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Tiền cọc đã trả trước (30%):</span>
                  <span className="tabular-nums">-{formatVND(depositPaid)}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-bold">
                  <span>Số tiền cần thanh toán:</span>
                  <span className="tabular-nums">{formatVND(checkoutPaymentAmount)}</span>
                </div>
              </div>
              <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between font-black text-sm text-emerald-700">
                <span className="uppercase">TỔNG CỘNG ĐÃ TẤT TOÁN:</span>
                <span className="tabular-nums text-base">{formatVND(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Chữ Ký Xác Nhận 2 Bên (chuẩn theo ảnh faffe958.png) */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
            <div>
              <span className="font-bold text-slate-800 block uppercase">KHÁCH HÀNG</span>
              <span className="text-[10px] text-slate-400 italic block mt-0.5">(Ký và ghi rõ họ tên)</span>
              <div className="h-16 flex items-end justify-center font-bold text-slate-900">
                {customer?.HoTen}
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block uppercase">ĐẠI DIỆN HOMESTAY CHICSTAY</span>
              <span className="text-[10px] text-slate-400 italic block mt-0.5">(Xác nhận đã tất toán 100%)</span>
              <div className="h-16 flex items-end justify-center font-bold text-blue-700">
                Quản lý Chicstay (Đã duyệt)
              </div>
            </div>
          </div>

          {/* Lời Cảm Ơn Cuối Trang */}
          <div className="text-center text-[11px] text-slate-400 pt-6">
            Cảm ơn quý khách đã tin tưởng và lựa chọn Chicstay Homestay. Hẹn gặp lại quý khách!
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
