import React, { useState } from 'react';
import {
  BedDouble,
  DollarSign,
  Info,
  Sparkles,
  PlusCircle,
  Trash2,
  TrendingUp,
  Package
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { formatVND, formatDate, isBookingOverdue12Hours } from '../utils/helpers';

interface DashboardViewProps {
  onNavigateToBookings: (filterStatus?: string) => void;
  onOpenCreateBookingModal: (initialData?: { checkIn?: string; checkOut?: string; guests?: number; roomCode?: string }) => void;
  onOpenChatbot: () => void;
  onDownloadSQL: () => void;
  onOpenBookingDetail: (maDon: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToBookings,
  onOpenCreateBookingModal,
  onOpenChatbot,
  onDownloadSQL,
  onOpenBookingDetail,
}) => {
  const { bookings, rooms, customers, invoices, paymentReceipts, serviceItems, cleanRoom } = useHomestay();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('today');
  const todayStr = new Date().toISOString().split('T')[0];

  const totalCompletedBookings = bookings.filter((b) => b.TrangThaiDon === 'Đã hoàn thành');
  const totalServiceRevenue = (serviceItems || []).reduce((sum, item) => sum + item.ThanhTien, 0);
  const totalRoomRevenue = bookings.filter((b) => b.TrangThaiDon === 'Đã hoàn thành').reduce((sum, b) => sum + b.TienPhong, 0);
  
  const totalRevenue = paymentReceipts
    .filter((p) => p.LoaiPhieu === 'Cọc' || p.LoaiPhieu === 'Tất toán')
    .reduce((sum, p) => sum + p.SoTien, 0);

  const totalRefunded = paymentReceipts
    .filter((p) => p.LoaiPhieu === 'Hoàn cọc')
    .reduce((sum, p) => sum + p.SoTien, 0);

  const readyRooms = rooms.filter((r) => r.TrangThaiPhong === 'Sẵn sàng');
  const inUseRooms = rooms.filter((r) => r.TrangThaiPhong === 'Đang sử dụng');
  const reservedRooms = rooms.filter((r) => r.TrangThaiPhong === 'Đã được đặt');
  const holdRooms = rooms.filter((r) => r.TrangThaiPhong === 'Tạm giữ');
  const cleaningRooms = rooms.filter((r) => r.TrangThaiPhong === 'Chờ dọn phòng');

  const overdueDepositBookings = bookings.filter(
    (b) => b.TrangThaiDon === 'Chờ đặt cọc' && isBookingOverdue12Hours(b.ThoiGianTaoDon)
  );
  
  const todayCheckIns = bookings.filter(
    (b) => b.NgayNhanPhong === todayStr && (b.TrangThaiDon === 'Đã xác nhận' || b.TrangThaiDon === 'Chờ đặt cọc')
  );
  const todayCheckOuts = bookings.filter(
    (b) => b.NgayTraPhong === todayStr && b.TrangThaiDon === 'Đã check-in'
  );

  const totalInvoicesCount = invoices.length;
  const avgRevenuePerInvoice = totalInvoicesCount > 0 ? totalRevenue / totalInvoicesCount : 0;
  const totalGuestsCount = customers.length;

  const occupancyRate = rooms.length > 0 ? Math.round(((inUseRooms.length + reservedRooms.length) / rooms.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 leading-tight">
            TỔNG QUAN KINH DOANH
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu tổng hợp theo thời gian thực về dòng tiền, buồng phòng và đơn lưu trú Chicstay
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1 text-xs shadow-xs">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-700 px-2 py-1 outline-hidden cursor-pointer"
            >
              <option value="today">Hôm nay ({formatDate(todayStr)})</option>
              <option value="7days">7 ngày qua</option>
              <option value="month">Tháng này</option>
              <option value="all">Toàn bộ thời gian</option>
            </select>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 px-2 font-medium">Đối soát chuẩn ERP</span>
          </div>

          <button
            onClick={() => onNavigateToBookings()}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Xem danh sách đơn"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 1 Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <span>Tiền phòng & DV</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              {formatVND(totalRevenue + totalRefunded)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tổng giá trị đơn</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <Trash2 className="w-4 h-4" />
            </div>
            <span>Hoàn huỷ cọc</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-rose-600 tabular-nums">
              {formatVND(totalRefunded)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Đã hoàn theo chính sách</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <BedDouble className="w-4 h-4" />
            </div>
            <span>Tiền phòng xong</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-800 tabular-nums">
              {formatVND(totalRoomRevenue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{totalCompletedBookings.length} đơn hoàn thành</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Package className="w-4 h-4" />
            </div>
            <span>Doanh thu dịch vụ</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-800 tabular-nums">
              {formatVND(totalServiceRevenue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{(serviceItems || []).length} lượt sử dụng DV</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-white shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span>Doanh thu thực thu</span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-blue-700 tabular-nums">
              {formatVND(totalRevenue)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Đã bao gồm cọc + tất toán
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 Metrics: 4 Striped Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
          <div className="text-xs text-slate-500 font-medium">Số khách hàng</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalGuestsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Đã lưu hồ sơ định danh</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500" />
          <div className="text-xs text-slate-500 font-medium">Số hoá đơn tất toán</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalInvoicesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Mã hóa đơn lưu trữ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
          <div className="text-xs text-slate-500 font-medium">Tỷ lệ lấp đầy phòng</div>
          <div className="text-2xl font-bold text-indigo-700 mt-1 tabular-nums">
            {occupancyRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {inUseRooms.length + reservedRooms.length}/{rooms.length} phòng đang bận
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />
          <div className="text-xs text-slate-500 font-medium">TB doanh thu / hoá đơn</div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatVND(Math.round(avgRevenuePerInvoice))}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Giá trị trung bình mỗi đơn</div>
        </div>
      </div>

      {/* Operational Attention Alerts */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold text-amber-900 tracking-wide uppercase">
              Cảnh Báo Vận Hành & Hoạt Động Cần Chú Ý Hôm Nay
            </h3>
          </div>
          <button
            onClick={onOpenChatbot}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Hỏi chatbot hỗ trợ
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs flex flex-col justify-between">
            <div>
              <span className="font-bold text-amber-800 block">Đơn chờ cọc quá hạn 12h:</span>
              <p className="text-slate-600 mt-1">
                {overdueDepositBookings.length > 0 ? (
                  <strong className="text-red-600">{overdueDepositBookings.length} đơn</strong>
                ) : (
                  <span className="text-emerald-600 font-semibold">0 đơn quá hạn</span>
                )}
              </p>
            </div>
            {overdueDepositBookings.length > 0 && (
              <button
                onClick={() => onNavigateToBookings('Chờ đặt cọc')}
                className="mt-2 text-[12px] font-bold text-red-600 hover:underline block text-left cursor-pointer"
              >
                Xử lý hủy đơn / nhắc cọc
              </button>
            )}
          </div>

          <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs flex flex-col justify-between">
            <div>
              <span className="font-bold text-blue-800 block">Khách check-in hôm nay:</span>
              <p className="text-slate-600 mt-1">
                <strong>{todayCheckIns.length} đơn</strong> cần đón tiếp
              </p>
            </div>
            <button
              onClick={() => onNavigateToBookings('Đã xác nhận')}
              className="mt-2 text-[12px] font-bold text-blue-600 hover:underline block text-left cursor-pointer"
            >
              Xem danh sách check-in
            </button>
          </div>

          <div className="bg-white p-3 rounded-lg border border-purple-200 text-xs flex flex-col justify-between">
            <div>
              <span className="font-bold text-purple-800 block">Khách check-out hôm nay:</span>
              <p className="text-slate-600 mt-1">
                <strong>{todayCheckOuts.length} đơn</strong> đến hạn tất toán
              </p>
            </div>
            <button
              onClick={() => onNavigateToBookings('Đã check-in')}
              className="mt-2 text-[12px] font-bold text-purple-600 hover:underline block text-left cursor-pointer"
            >
              Xem đơn cần check-out
            </button>
          </div>

          <div className="bg-white p-3 rounded-lg border border-orange-200 text-xs flex flex-col justify-between">
            <div>
              <span className="font-bold text-orange-800 block">Phòng chờ dọn dẹp:</span>
              <p className="text-slate-600 mt-1">
                <strong>{cleaningRooms.length} phòng</strong> chưa sẵn sàng
              </p>
            </div>
            {cleaningRooms.length > 0 ? (
              <div className="mt-2 flex gap-1">
                {cleaningRooms.slice(0, 2).map((r) => (
                  <button
                    key={r.MaPhong}
                    onClick={() => cleanRoom(r.MaPhong)}
                    className="px-2 py-0.5 rounded-sm bg-orange-100 text-orange-800 font-bold text-[10px] hover:bg-orange-200 cursor-pointer"
                    title="Bấm để đánh dấu đã dọn xong"
                  >
                    Dọn {r.MaPhong}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-emerald-600 font-semibold mt-2">Buồng phòng sạch sẽ</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Room Status Summary + Recent Active Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[18px] font-bold text-slate-900 tracking-wide flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-blue-600" />
                Sơ Đồ Phòng Chicstay ({rooms.length} phòng)
              </h3>
            </div>
            <button
              onClick={() => onOpenCreateBookingModal()}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Tạo đơn mới
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs mb-4 p-2 bg-slate-50 rounded-lg">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sẵn sàng ({readyRooms.length})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Đang sử dụng ({inUseRooms.length})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Đã đặt ({reservedRooms.length})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Tạm giữ ({holdRooms.length})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Chờ dọn ({cleaningRooms.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rooms.map((room) => {
              let statusBg = 'border-emerald-200 bg-emerald-50/30 text-emerald-700';
              let badgeColor = 'bg-emerald-100 text-emerald-800';
              if (room.TrangThaiPhong === 'Đang sử dụng') {
                statusBg = 'border-purple-200 bg-purple-50/30 text-purple-700';
                badgeColor = 'bg-purple-100 text-purple-800';
              } else if (room.TrangThaiPhong === 'Đã được đặt') {
                statusBg = 'border-blue-200 bg-blue-50/30 text-blue-700';
                badgeColor = 'bg-blue-100 text-blue-800';
              } else if (room.TrangThaiPhong === 'Tạm giữ') {
                statusBg = 'border-amber-200 bg-amber-50/30 text-amber-700';
                badgeColor = 'bg-amber-100 text-amber-800';
              } else if (room.TrangThaiPhong === 'Chờ dọn phòng') {
                statusBg = 'border-orange-200 bg-orange-50/30 text-orange-700';
                badgeColor = 'bg-orange-100 text-orange-800';
              }

              const activeBooking = bookings.find(
                (b) =>
                  b.MaPhong === room.MaPhong &&
                  (b.TrangThaiDon === 'Đã check-in' || b.TrangThaiDon === 'Đã xác nhận' || b.TrangThaiDon === 'Chờ đặt cọc')
              );

              return (
                <div
                  key={room.MaPhong}
                  className={`p-3.5 rounded-xl border ${statusBg} flex flex-col justify-between transition-all hover:shadow-xs`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">{room.MaPhong}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {room.TrangThaiPhong}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1 truncate">
                      {room.TenPhong}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatVND(room.GiaPhong)} / đêm · Tối đa {room.SucChua} khách
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    {room.TrangThaiPhong === 'Chờ dọn phòng' ? (
                      <button
                        onClick={() => cleanRoom(room.MaPhong)}
                        className="w-full py-1 text-center font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors cursor-pointer"
                      >
                        ✓ Hoàn tất dọn phòng
                      </button>
                    ) : activeBooking ? (
                      <button
                        onClick={() => onOpenBookingDetail(activeBooking.MaDon)}
                        className="text-blue-700 hover:underline font-semibold flex items-center gap-1 truncate cursor-pointer"
                      >
                        {activeBooking.MaDon} ({activeBooking.TrangThaiDon})
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenCreateBookingModal({ roomCode: room.MaPhong })}
                        className="text-slate-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        + Đặt phòng này
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 col: Recent Bookings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Đơn Gần Đây ({bookings.length})
              </h3>
              <button
                onClick={() => onNavigateToBookings()}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Xem tất cả
              </button>
            </div>

            <div className="space-y-3">
              {bookings.slice(0, 5).map((b) => {
                let badge = 'bg-slate-100 text-slate-700';
                if (b.TrangThaiDon === 'Chờ đặt cọc') badge = 'bg-amber-100 text-amber-800';
                if (b.TrangThaiDon === 'Đã xác nhận') badge = 'bg-blue-100 text-blue-800';
                if (b.TrangThaiDon === 'Đã check-in') badge = 'bg-purple-100 text-purple-800';
                if (b.TrangThaiDon === 'Đã hoàn thành') badge = 'bg-emerald-100 text-emerald-800';
                if (b.TrangThaiDon === 'Đã hủy') badge = 'bg-rose-100 text-rose-800';

                return (
                  <div
                    key={b.MaDon}
                    onClick={() => onOpenBookingDetail(b.MaDon)}
                    className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-slate-50/70 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{b.MaDon}</span>
                        <span className="text-[11px] font-semibold text-slate-500">Phòng {b.MaPhong}</span>
                      </div>
                      <div className="text-[12px] text-slate-500 mt-0.5">
                        {formatDate(b.NgayNhanPhong)} - {formatDate(b.NgayTraPhong)} ({b.SoDem} đêm)
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
                        {b.TrangThaiDon}
                      </span>
                      <div className="text-xs font-bold text-slate-900 mt-1 tabular-nums">
                        {formatVND(b.TongTien)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
