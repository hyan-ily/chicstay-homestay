import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  FileText,
  CheckCircle2,
  Receipt,
  Clock,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { formatVND, formatDateTime, useLockScroll } from '../utils/helpers';

export interface CancelServiceTarget {
  id: string;
  MaDon: string;
  TenDichVu: string;
  SoLuong: number;
  DonGiaTaiThoiDiem: number;
  DonViTinh?: string;
  tenPhong?: string;
  TrangThaiThucHien?: string;
}

export interface CancelServiceSuccessData {
  MaDon: string;
  tenPhong: string;
  TenDichVu: string;
  SoLuong: number;
  phiHuy: number;
  lyDo: string;
  thoiDiem: string;
}

interface CancelServiceModalProps {
  isOpen: boolean;
  target: CancelServiceTarget | null;
  onClose: () => void;
  onConfirm: (
    itemId: string,
    lyDo: string
  ) => { success: boolean; message: string; phiHuy?: number; lyDoHuy?: string };
}

const QUICK_REASONS = [
  'Khách đổi lịch trình / Đi tour khác',
  'Khách đổi ý không muốn sử dụng',
  'Thời tiết không thuận lợi',
  'Khách bận việc đột xuất',
  'Homestay hỗ trợ theo yêu cầu khách',
];

export const CancelServiceModal: React.FC<CancelServiceModalProps> = ({
  isOpen,
  target,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<CancelServiceSuccessData | null>(null);

  // Khóa cuộn trang chính khi modal đang mở
  useLockScroll(isOpen);

  // Lắng nghe phím Escape để đóng nhanh
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset form when target changes
  useEffect(() => {
    if (isOpen && target) {
      setReason('');
      setErrorMsg('');
      setSuccessData(null);
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const originalTotal = target.DonGiaTaiThoiDiem * target.SoLuong;
  const phiHuy = Math.round(originalTotal * 0.3);

  const handleExecuteCancel = () => {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setErrorMsg('Vui lòng nhập lý do hủy dịch vụ để lưu hồ sơ kế toán & hóa đơn.');
      return;
    }

    const res = onConfirm(target.id, cleanReason);
    if (res.success) {
      setSuccessData({
        MaDon: target.MaDon,
        tenPhong: target.tenPhong || target.MaDon,
        TenDichVu: target.TenDichVu,
        SoLuong: target.SoLuong,
        phiHuy: res.phiHuy ?? phiHuy,
        lyDo: cleanReason,
        thoiDiem: formatDateTime(new Date().toISOString()),
      });
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleCloseAll = () => {
    setSuccessData(null);
    setReason('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overscroll-contain animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseAll();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* NẾU ĐÃ HỦY THÀNH CÔNG: HIỂN THỊ POP-UP THÔNG BÁO HỦY DỊCH VỤ THÀNH CÔNG (GỌN GÀNG TRONG MÀN HÌNH, CÓ THANH CUỘN BÊN) */}
      {successData ? (
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden relative isolate animate-in zoom-in-95 duration-200 my-auto">
          {/* Header Pop-up Thông báo - cố định, phong cách ERP trang nhã */}
          <div className="bg-white px-6 py-4.5 border-b border-slate-200 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  THÔNG BÁO HỦY DỊCH VỤ THÀNH CÔNG
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Hệ thống đã cập nhật trạng thái & tính phí bồi hoàn 30%
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseAll}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Phiếu xác nhận hủy - cuộn nội bộ nếu dài */}
          <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
            <div className="p-3.5 bg-slate-50 border border-slate-200 border-l-4 border-l-amber-500 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[13px]">
                  Đã ghi nhận phí hủy dịch vụ (30%):
                </span>
                <span className="text-base font-black text-rose-700">
                  {formatVND(successData.phiHuy)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Phí này tương đương 30% đơn giá dịch vụ và được tự động ghi nhận vào hóa đơn tất toán của đơn đặt phòng.
              </p>
            </div>

            {/* Chi tiết thông tin */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 text-slate-700 font-medium">
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500">Mã đơn đặt phòng:</span>
                <span className="font-mono font-bold text-blue-700">{successData.MaDon}</span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500">Phòng lưu trú:</span>
                <span className="font-bold text-slate-900">{successData.tenPhong}</span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500">Dịch vụ đã hủy:</span>
                <span className="font-bold text-slate-900">
                  {successData.TenDichVu} (SL: {successData.SoLuong})
                </span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500">Trạng thái mới:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                  Đã hủy (Thu phí 30%)
                </span>
              </div>
              <div className="p-3 flex justify-between items-start gap-3">
                <span className="text-slate-500 shrink-0">Lý do hủy:</span>
                <span className="font-semibold text-slate-900 text-right">{successData.lyDo}</span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500">Thời điểm hủy:</span>
                <span className="text-slate-600">{successData.thoiDiem}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-slate-600 text-[11px]">
              <Receipt className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                Hóa đơn và bảng kê dịch vụ của đơn đặt phòng đã được đồng bộ lại. Khi in hóa đơn hoặc làm thủ tục Check-out, dòng dịch vụ này sẽ hiển thị kèm chú thích phí hủy 30%.
              </div>
            </div>
          </div>

          {/* Footer Pop-up - cố định */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end shrink-0 z-10">
            <button
              type="button"
              onClick={handleCloseAll}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : (
        /* HỘP THOẠI Ở GIỮA MÀN HÌNH YÊU CẦU NHẬP LÝ DO HỦY KHI ĐANG THỰC HIỆN */
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden relative isolate animate-in zoom-in-95 duration-200 my-auto">
          {/* Header - cố định, phong cách ERP trang nhã */}
          <div className="bg-white px-6 py-4.5 border-b border-slate-200 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700 shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  XÁC NHẬN HỦY DỊCH VỤ ĐANG THỰC HIỆN
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Đơn {target.MaDon} {target.tenPhong ? `· ${target.tenPhong}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseAll}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - cuộn nội bộ nếu danh sách gợi ý hoặc nội dung dài */}
          <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
            {/* Box cảnh báo chính sách thu phí 30% - tông màu trang nhã, không màu mè AI */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 border-l-4 border-l-amber-500 rounded-xl space-y-2 text-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
                <span>CHÍNH SÁCH THU PHÍ 30% KHI HỦY</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Dịch vụ <strong>&quot;{target.TenDichVu}&quot;</strong> đang trong tiến trình phục vụ khách. Theo quy định quản lý homestay, khi khách hủy tại bước này sẽ tính <strong>30% giá dịch vụ</strong> và ghi chú chi tiết trên hóa đơn thanh toán.
              </p>
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Giá trị dịch vụ ban đầu:</span>
                  <span className="font-semibold text-slate-800">{formatVND(originalTotal)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Số tiền thu khi hủy (30%):</span>
                  <span className="text-sm font-black text-rose-700">{formatVND(phiHuy)}</span>
                </div>
              </div>
            </div>

            {/* Chi tiết dịch vụ */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tên dịch vụ:</span>
                <span className="font-bold text-slate-900">{target.TenDichVu}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số lượng:</span>
                <span className="font-semibold text-slate-800">
                  {target.SoLuong} {target.DonViTinh || 'lần'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Đơn giá:</span>
                <span className="font-medium text-slate-800">{formatVND(target.DonGiaTaiThoiDiem)}</span>
              </div>
            </div>

            {/* Nhập lý do hủy */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-800 text-xs">
                  Lý do hủy dịch vụ <span className="text-rose-600">*</span>:
                </label>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Bắt buộc để lưu hồ sơ kế toán & hóa đơn)
                </span>
              </div>

              {/* Gợi ý chọn nhanh */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_REASONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setReason(item);
                      setErrorMsg('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                      reason === item
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setErrorMsg('');
                }}
                placeholder="Nhập lý do khách hủy dịch vụ (ví dụ: Khách đổi lịch trình tham quan, khách mệt không dùng...)"
                className="w-full p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:border-slate-500 text-xs text-slate-800 resize-none"
                autoFocus
              />

              {errorMsg && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {errorMsg}
                </p>
              )}
            </div>
          </div>

          {/* Footer - cố định */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 z-10">
            <button
              type="button"
              onClick={handleCloseAll}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 cursor-pointer transition-colors shadow-2xs"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={handleExecuteCancel}
              className="px-4.5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs shadow-xs hover:shadow-md cursor-pointer transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>XÁC NHẬN HỦY (THU PHÍ 30%)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
