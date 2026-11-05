import React, { useEffect } from 'react';
import { FileText, X, AlertCircle, Receipt, ArrowRight, Clock, Building, Tag } from 'lucide-react';
import { formatVND, useLockScroll } from '../utils/helpers';
import { ChiTietDichVu } from '../types';

export interface CanceledServiceDetailModalProps {
  isOpen: boolean;
  item: ChiTietDichVu | null;
  tenPhong?: string;
  onClose: () => void;
}

export const CanceledServiceDetailModal: React.FC<CanceledServiceDetailModalProps> = ({
  isOpen,
  item,
  tenPhong,
  onClose,
}) => {
  useLockScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const originalTotal = item.DonGiaTaiThoiDiem * item.SoLuong;
  const phiHuy = item.TyLeThuHuy ? item.ThanhTien : 0;
  const displayReason = item.LyDoHuy || (item.GhiChuHuy?.split('Lý do: ')[1] || item.GhiChuHuy || item.GhiChu || 'Khách yêu cầu hủy khi dịch vụ đang thực hiện');

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overscroll-contain animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden relative isolate animate-in zoom-in-95 duration-150 my-auto">
        {/* Header - Nền trắng trang nhã, chuẩn phong cách ERP */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight tracking-tight">
                CHI TIẾT LÝ DO HỦY DỊCH VỤ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Đơn {item.MaDon} {tenPhong ? `· ${tenPhong}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Cuộn nội bộ nếu dài */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700 overscroll-contain">
          {/* Card lý do hủy chính - Làm nổi bật nội dung người dùng nhập */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px] uppercase tracking-wide">
              <span>Lý do hủy</span>
              <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Thu phí 30%
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200/90 rounded-lg text-slate-900 text-sm font-semibold leading-relaxed shadow-2xs whitespace-pre-wrap">
              &ldquo;{displayReason}&rdquo;
            </div>
          </div>

          {/* Bảng chi tiết dịch vụ & tài chính */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200/80 font-medium">
            <div className="p-3 flex justify-between items-center">
              <span className="text-slate-500">Mã đơn đặt phòng:</span>
              <span className="font-mono font-bold text-blue-700">{item.MaDon}</span>
            </div>
            {tenPhong && (
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500">Phòng lưu trú:</span>
                <span className="font-bold text-slate-900">{tenPhong}</span>
              </div>
            )}
            <div className="p-3 flex justify-between items-center">
              <span className="text-slate-500">Tên dịch vụ:</span>
              <span className="font-bold text-slate-900">{item.TenDichVu}</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className="text-slate-500">Số lượng:</span>
              <span className="font-semibold text-slate-800">
                {item.SoLuong} {item.DonViTinh || 'Lượt'}
              </span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className="text-slate-500">Đơn giá ban đầu:</span>
              <span className="text-slate-800">{formatVND(item.DonGiaTaiThoiDiem)}</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className="text-slate-500">Giá trị dịch vụ ban đầu:</span>
              <span className="text-slate-600 line-through">{formatVND(originalTotal)}</span>
            </div>
            <div className="p-3 flex justify-between items-center bg-amber-50/40">
              <span className="text-amber-900 font-bold">Số tiền thu hủy (30%):</span>
              <span className="text-sm font-black text-rose-700">{formatVND(phiHuy || Math.round(originalTotal * 0.3))}</span>
            </div>
            <div className="p-3 flex justify-between items-center">
              <span className="text-slate-500">Trạng thái dịch vụ:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                Đã hủy (Thu phí 30%)
              </span>
            </div>
          </div>

          {/* Ghi chú hạch toán */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-slate-600 text-[11px]">
            <Receipt className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              Khoản phí bồi hoàn 30% này đã được đồng bộ vào hóa đơn tất toán của đơn đặt phòng và ghi nhận trong nhật ký thay đổi đơn.
            </div>
          </div>
        </div>

        {/* Footer - Cố định */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
