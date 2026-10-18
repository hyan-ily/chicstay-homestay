import React, { useState } from 'react';
import {
  Receipt,
  FileText,
  Search,
  Filter,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  Building,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { useToast } from '../context/ToastContext';
import { PhieuThanhToan, BankConfig } from '../types';
import { formatVND, formatDateTime } from '../utils/helpers';

interface PaymentsViewProps {
  onPrintInvoice: (maDon: string) => void;
  onOpenBookingDetail?: (maDon: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onPrintInvoice, onOpenBookingDetail }) => {
  const { paymentReceipts, invoices, bankConfig, updateBankConfig } = useHomestay();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'receipts' | 'invoices' | 'bank'>('receipts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Bank config editing state
  const [editingBank, setEditingBank] = useState<BankConfig>({ ...bankConfig });
  const [bankSuccessMsg, setBankSuccessMsg] = useState('');

  // Selected receipt detail modal
  const [selectedReceipt, setSelectedReceipt] = useState<PhieuThanhToan | null>(null);

  // Filter receipts
  const filteredReceipts = paymentReceipts.filter((p) => {
    if (filterType !== 'ALL' && p.LoaiPhieu !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = p.MaPhieu.toLowerCase().includes(q);
      const matchDon = p.MaDon.toLowerCase().includes(q);
      const matchTxn = p.MaGiaoDichNganHang?.toLowerCase().includes(q);
      if (!matchCode && !matchDon && !matchTxn) return false;
    }
    return true;
  });

  // Filter invoices
  const filteredInvoices = invoices.filter((h) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = h.MaHoaDon.toLowerCase().includes(q);
      const matchDon = h.MaDon.toLowerCase().includes(q);
      if (!matchCode && !matchDon) return false;
    }
    return true;
  });

  const handleSaveBankConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateBankConfig(editingBank);
    setBankSuccessMsg('Đã cập nhật thông tin tài khoản ngân hàng VietQR thành công!');
    showToast('Đã cập nhật thông tin tài khoản ngân hàng VietQR thành công!', 'success');
    setTimeout(() => setBankSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5 leading-tight">
            <Receipt className="w-7 h-7 text-blue-600" />
            THANH TOÁN & HÓA ĐƠN
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý phiếu cọc 30%, phiếu tất toán check-out, phiếu hoàn tiền và hóa đơn dịch vụ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            Tổng đã thu:{' '}
            <span className="tabular-nums">
              {formatVND(
                paymentReceipts
                  .filter((p) => p.LoaiPhieu === 'Cọc' || p.LoaiPhieu === 'Tất toán')
                  .reduce((sum, p) => sum + p.SoTien, 0)
              )}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            Tổng đã hoàn:{' '}
            <span className="tabular-nums">
              {formatVND(
                paymentReceipts
                  .filter((p) => p.LoaiPhieu === 'Hoàn cọc')
                  .reduce((sum, p) => sum + p.SoTien, 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('receipts')}
          className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'receipts'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Phiếu Thu & Hoàn Cọc (PTxxxxx)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
            {paymentReceipts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Hóa Đơn Tổng Hợp (HD2025xxxx)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-bold">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'bank'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Cấu hình VietQR Homestay</span>
        </button>
      </div>

      {/* SUB-VIEW 1: PHIẾU THANH TOÁN */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm mã phiếu (PT...), mã đơn (DP...), mã giao dịch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white shadow-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white cursor-pointer"
              >
                <option value="ALL">Tất cả loại phiếu</option>
                <option value="Cọc">Phiếu Cọc (30%)</option>
                <option value="Tất toán">Phiếu Tất toán (Check-out)</option>
                <option value="Hoàn cọc">Phiếu Hoàn cọc</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">MÃ PHIẾU</th>
                    <th className="py-3 px-4">MÃ ĐƠN</th>
                    <th className="py-3 px-4">LOẠI PHIẾU</th>
                    <th className="py-3 px-4 text-right">SỐ TIỀN</th>
                    <th className="py-3 px-4 text-center">HÌNH THỨC</th>
                    <th className="py-3 px-4">MÃ GIAO DỊCH</th>
                    <th className="py-3 px-4">THỜI ĐIỂM LẬP</th>
                    <th className="py-3 px-4">NGƯỜI LẬP</th>
                    <th className="py-3 px-4 text-center">CHI TIẾT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        Chưa có phiếu thanh toán nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((p) => {
                      let typeBadge = 'bg-slate-100 text-slate-700';
                      if (p.LoaiPhieu === 'Cọc') typeBadge = 'bg-amber-100 text-amber-800';
                      if (p.LoaiPhieu === 'Tất toán') typeBadge = 'bg-purple-100 text-purple-800';
                      if (p.LoaiPhieu === 'Hoàn cọc') typeBadge = 'bg-rose-100 text-rose-800';

                      return (
                        <tr key={p.MaPhieu} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.MaPhieu}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                            <button
                              type="button"
                              onClick={() => onOpenBookingDetail?.(p.MaDon)}
                              className="hover:underline cursor-pointer"
                              title="Xem chi tiết đơn"
                            >
                              {p.MaDon}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeBadge}`}>
                              {p.LoaiPhieu}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold tabular-nums text-slate-900">
                            {formatVND(p.SoTien)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              {p.PhuongThuc === 'VietQR' ? (
                                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              {p.PhuongThuc}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.MaGiaoDichNganHang || '--'}</td>
                          <td className="py-3 px-4 text-slate-600">{formatDateTime(p.NgayLap)}</td>
                          <td className="py-3 px-4 text-slate-600">{p.NguoiLap}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onOpenBookingDetail?.(p.MaDon)}
                                className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] cursor-pointer"
                                title="Xem đơn đặt phòng"
                              >
                                Xem đơn
                              </button>
                              <button
                                onClick={() => setSelectedReceipt(p)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded-md cursor-pointer"
                                title="Xem chi tiết chứng từ"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: HÓA ĐƠN TỔNG HỢP */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo Mã hóa đơn (HD...) hoặc Mã đơn (DP...)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white shadow-xs"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">MÃ HÓA ĐƠN</th>
                    <th className="py-3 px-4">MÃ ĐƠN</th>
                    <th className="py-3 px-4 text-right">TIỀN PHÒNG</th>
                    <th className="py-3 px-4 text-right">TIỀN DỊCH VỤ</th>
                    <th className="py-3 px-4 text-right">CỌC ĐÃ TRẢ</th>
                    <th className="py-3 px-4 text-right">THU KHI CHECK-OUT</th>
                    <th className="py-3 px-4 text-right">TỔNG ĐÃ TẤT TOÁN</th>
                    <th className="py-3 px-4 text-center">HÌNH THỨC</th>
                    <th className="py-3 px-4">NGÀY XUẤT</th>
                    <th className="py-3 px-4 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">
                        Chưa có hóa đơn tổng hợp nào được lập. Hóa đơn được tự động lập khi hoàn tất Check-out và tất toán.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((h) => (
                      <tr key={h.MaHoaDon} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{h.MaHoaDon}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          <button
                            type="button"
                            onClick={() => onOpenBookingDetail?.(h.MaDon)}
                            className="hover:underline font-bold text-blue-700 cursor-pointer"
                            title="Xem chi tiết đơn"
                          >
                            {h.MaDon}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-700">{formatVND(h.TienPhong)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-700">{formatVND(h.TienDichVu)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-emerald-700 font-semibold">{formatVND(h.TienCocDaTra)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-purple-700 font-semibold">{formatVND(h.TienThanhToanKhiCheckOut)}</td>
                        <td className="py-3 px-4 text-right font-extrabold tabular-nums text-slate-900">{formatVND(h.TongTienDaThanhToan)}</td>
                        <td className="py-3 px-4 text-center font-medium">{h.PhuongThuc}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDateTime(h.NgayXuat)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onOpenBookingDetail?.(h.MaDon)}
                              className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs cursor-pointer flex items-center gap-1"
                              title="Xem đơn đặt phòng"
                            >
                              <Eye className="w-3.5 h-3.5" /> Xem đơn
                            </button>
                            <button
                              onClick={() => onPrintInvoice(h.MaDon)}
                              className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1 text-xs cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> In hóa đơn
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: CẤU HÌNH NGÂN HÀNG VIETQR */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              CẤU HÌNH TÀI KHOẢN VIETQR THỤ HƯỞNG
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Thông tin dùng để tự động sinh mã VietQR chuẩn khi gửi khách cọc 30% và tất toán check-out
            </p>
          </div>

          {bankSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{bankSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveBankConfig} className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tên ngân hàng:
              </label>
              <input
                type="text"
                required
                value={editingBank.bankName}
                onChange={(e) => setEditingBank({ ...editingBank, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã ngân hàng (VietQR BIN code):
                </label>
                <select
                  value={editingBank.bankCode}
                  onChange={(e) => setEditingBank({ ...editingBank, bankCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white cursor-pointer"
                >
                  <option value="ICB">VietinBank (ICB)</option>
                  <option value="VCB">Vietcombank (VCB)</option>
                  <option value="MB">MBBank (MB)</option>
                  <option value="TCB">Techcombank (TCB)</option>
                  <option value="BIDV">BIDV</option>
                  <option value="ACB">ACB</option>
                  <option value="VPB">VPBank</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số tài khoản nhận tiền:
                </label>
                <input
                  type="text"
                  required
                  value={editingBank.accountNo}
                  onChange={(e) => setEditingBank({ ...editingBank, accountNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tên chủ tài khoản (Viết in hoa không dấu):
              </label>
              <input
                type="text"
                required
                value={editingBank.accountName}
                onChange={(e) => setEditingBank({ ...editingBank, accountName: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold uppercase"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Lưu Cấu Hình Ngân Hàng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal for Selected Receipt */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="sticky top-0 z-10 bg-white -mx-6 -mt-6 px-6 pt-6 flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                CHI TIẾT CHỨNG TỪ {selectedReceipt.MaPhieu}
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn đặt phòng:</span>
                <span className="font-bold text-blue-700 font-mono">{selectedReceipt.MaDon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loại phiếu:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.LoaiPhieu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền:</span>
                <span className="font-extrabold text-base text-slate-900 tabular-nums">
                  {formatVND(selectedReceipt.SoTien)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hình thức thanh toán:</span>
                <span className="font-bold text-slate-800">{selectedReceipt.PhuongThuc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mã giao dịch ngân hàng:</span>
                <span className="font-mono text-slate-700">{selectedReceipt.MaGiaoDichNganHang || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời điểm lập:</span>
                <span className="text-slate-700">{formatDateTime(selectedReceipt.NgayLap)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Người lập phiếu:</span>
                <span className="text-slate-700 font-semibold">{selectedReceipt.NguoiLap}</span>
              </div>
              {selectedReceipt.GhiChu && (
                <div className="pt-2 border-t border-slate-200 text-slate-600">
                  <strong>Ghi chú:</strong> {selectedReceipt.GhiChu}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  onOpenBookingDetail?.(selectedReceipt.MaDon);
                  setSelectedReceipt(null);
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                Xem đơn {selectedReceipt.MaDon}
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
