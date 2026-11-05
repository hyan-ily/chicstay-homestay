import React from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Building,
  CreditCard,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { formatVND } from '../utils/helpers';

export const ReportsView: React.FC = () => {
  const { rooms, bookings, paymentReceipts } = useHomestay();

  const totalReceiptsAmount = paymentReceipts
    .filter((p) => p.LoaiPhieu === 'Cọc' || p.LoaiPhieu === 'Tất toán')
    .reduce((sum, p) => sum + p.SoTien, 0);

  const totalRefundAmount = paymentReceipts
    .filter((p) => p.LoaiPhieu === 'Hoàn cọc')
    .reduce((sum, p) => sum + p.SoTien, 0);

  const netRevenue = totalReceiptsAmount - totalRefundAmount;

  // Revenue by room
  const revenueByRoom = rooms.map((r) => {
    const roomBookings = bookings.filter((b) => b.MaPhong === r.MaPhong && b.TrangThaiDon === 'Đã hoàn thành');
    const rev = roomBookings.reduce((sum, b) => sum + b.TienPhong, 0);
    return {
      code: r.MaPhong,
      name: r.TenPhong,
      type: r.LoaiPhong,
      revenue: rev,
      bookingsCount: roomBookings.length,
    };
  });

  // Revenue by payment method
  const vietQrAmount = paymentReceipts
    .filter((p) => p.PhuongThuc === 'VietQR' && (p.LoaiPhieu === 'Cọc' || p.LoaiPhieu === 'Tất toán'))
    .reduce((sum, p) => sum + p.SoTien, 0);
  const cashAmount = paymentReceipts
    .filter((p) => p.PhuongThuc === 'Tiền mặt' && (p.LoaiPhieu === 'Cọc' || p.LoaiPhieu === 'Tất toán'))
    .reduce((sum, p) => sum + p.SoTien, 0);

  // Bookings breakdown
  const completedCount = bookings.filter((b) => b.TrangThaiDon === 'Đã hoàn thành').length;
  const activeCount = bookings.filter((b) => b.TrangThaiDon === 'Đã check-in' || b.TrangThaiDon === 'Đã xác nhận').length;
  const cancelledCount = bookings.filter((b) => b.TrangThaiDon === 'Đã hủy').length;
  const noShowCount = bookings.filter((b) => b.TrangThaiDon === 'No-show').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5 leading-tight">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          BÁO CÁO DOANH THU & VẬN HÀNH
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tổng hợp tài chính thực tế, dòng tiền VietQR / Tiền mặt và hiệu suất buồng phòng Chicstay
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>Tổng thu thực tế (Gross)</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2 tabular-nums">
            {formatVND(totalReceiptsAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Gồm các phiếu Cọc & Tất toán</div>
        </div>

        <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
            <XCircle className="w-4 h-4" />
            <span>Hoàn trả cọc (Refunds)</span>
          </div>
          <div className="text-xl font-black text-rose-600 mt-2 tabular-nums">
            {formatVND(totalRefundAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Đơn hủy hợp lệ trước 48 giờ</div>
        </div>

        <div className="bg-white p-4.5 rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <TrendingUp className="w-4 h-4" />
            <span>Doanh thu thuần (Net)</span>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2 tabular-nums">
            {formatVND(netRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Thực giữ lại sau hoàn hủy</div>
        </div>

        <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đơn hoàn tất check-out</span>
          </div>
          <div className="text-xl font-black text-indigo-700 mt-2 tabular-nums">
            {completedCount} đơn
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Đã xuất hóa đơn tổng hợp</div>
        </div>
      </div>

      {/* Grid: Revenue by Room + Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            Doanh Thu Tiền Phòng Theo Hạng Phòng
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">MÃ PHÒNG</th>
                  <th className="py-2.5 px-3">TÊN PHÒNG</th>
                  <th className="py-2.5 px-3">HẠNG PHÒNG</th>
                  <th className="py-2.5 px-3 text-center">SỐ LƯỢT THUÊ</th>
                  <th className="py-2.5 px-3 text-right">DOANH THU LŨY KẾ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenueByRoom.map((r) => (
                  <tr key={r.code} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{r.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{r.type}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{r.bookingsCount}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                      {formatVND(r.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Hình Thức Thanh Toán
            </h3>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Chuyển khoản VietQR
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatVND(vietQrAmount)}
                  </span>
                </div>
                <div className="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{
                      width: `${totalReceiptsAmount > 0 ? (vietQrAmount / totalReceiptsAmount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    Tiền mặt trực tiếp
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatVND(cashAmount)}
                  </span>
                </div>
                <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{
                      width: `${totalReceiptsAmount > 0 ? (cashAmount / totalReceiptsAmount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">Cơ cấu trạng thái đơn:</span>
            <div className="flex justify-between text-slate-600">
              <span>Đang phục vụ / Đã xác nhận:</span>
              <strong>{activeCount} đơn</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Đã hoàn thành check-out:</span>
              <strong>{completedCount} đơn</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Đã hủy:</span>
              <strong className="text-rose-600">{cancelledCount} đơn</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Khách không đến (No-show):</span>
              <strong className="text-slate-800">{noShowCount} đơn</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
