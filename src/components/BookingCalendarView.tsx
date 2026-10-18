import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Printer,
  X,
  LayoutGrid,
  Columns,
  Eye,
  CreditCard,
  LogIn as CheckInIcon,
  LogOut as CheckOutIcon,
} from 'lucide-react';
import { DonDatPhong, Phong, KhachHang, TrangThaiDon } from '../types';
import { formatDate, formatVND, useLockScroll } from '../utils/helpers';

interface BookingCalendarViewProps {
  bookings: DonDatPhong[];
  rooms: Phong[];
  customers: KhachHang[];
  onOpenBookingDetail: (maDon: string) => void;
  onOpenCreateBookingModal: (initialData?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    roomCode?: string;
  }) => void;
  onOpenUpdateModal?: (booking: DonDatPhong) => void;
  onOpenDepositModal?: (booking: DonDatPhong) => void;
  onOpenCheckInModal?: (booking: DonDatPhong) => void;
  onOpenCheckOutModal?: (booking: DonDatPhong) => void;
  onPrintInvoice?: (maDon: string) => void;
}

export const BookingCalendarView: React.FC<BookingCalendarViewProps> = ({
  bookings,
  rooms,
  customers,
  onOpenBookingDetail,
  onOpenCreateBookingModal,
  onOpenUpdateModal,
  onOpenDepositModal,
  onOpenCheckInModal,
  onOpenCheckOutModal,
  onPrintInvoice,
}) => {
  const [calendarMode, setCalendarMode] = useState<'week' | 'month-timeline' | 'month-grid'>('week');
  const [currentAnchorDate, setCurrentAnchorDate] = useState<Date>(() => new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');

  const [selectedBookingForMenu, setSelectedBookingForMenu] = useState<DonDatPhong | null>(null);

  useLockScroll(Boolean(selectedBookingForMenu));

  const formatDateToYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateToYMD(new Date());

  // Week calculation (Monday -> Sunday)
  const weekDays = useMemo(() => {
    const d = new Date(currentAnchorDate);
    const day = d.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const days: { date: Date; dateStr: string; dayName: string; isToday: boolean; isWeekend: boolean }[] = [];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const str = formatDateToYMD(cur);
      days.push({
        date: cur,
        dateStr: str,
        dayName: dayNames[i],
        isToday: str === todayStr,
        isWeekend: i >= 5,
      });
    }
    return days;
  }, [currentAnchorDate, todayStr]);

  // Month days calculation
  const monthDays = useMemo(() => {
    const year = currentAnchorDate.getFullYear();
    const month = currentAnchorDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    const days: { date: Date; dateStr: string; dayNum: number; dayName: string; isToday: boolean; isWeekend: boolean }[] = [];
    const shortDayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 1; i <= totalDays; i++) {
      const cur = new Date(year, month, i);
      const str = formatDateToYMD(cur);
      const dayOfWeek = cur.getDay();
      days.push({
        date: cur,
        dateStr: str,
        dayNum: i,
        dayName: shortDayNames[dayOfWeek],
        isToday: str === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    return days;
  }, [currentAnchorDate, todayStr]);

  // Calendar Grid Matrix
  const monthGridCells = useMemo(() => {
    const year = currentAnchorDate.getFullYear();
    const month = currentAnchorDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const cells: {
      date: Date;
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
    }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const str = formatDateToYMD(d);
      cells.push({
        date: d,
        dateStr: str,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: str === todayStr,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      const str = formatDateToYMD(d);
      cells.push({
        date: d,
        dateStr: str,
        dayNum: i,
        isCurrentMonth: true,
        isToday: str === todayStr,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        const str = formatDateToYMD(d);
        cells.push({
          date: d,
          dateStr: str,
          dayNum: i,
          isCurrentMonth: false,
          isToday: str === todayStr,
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        });
      }
    }

    return cells;
  }, [currentAnchorDate, todayStr]);

  const handlePrev = () => {
    setCurrentAnchorDate((prev) => {
      const next = new Date(prev);
      if (calendarMode === 'week') {
        next.setDate(prev.getDate() - 7);
      } else {
        next.setMonth(prev.getMonth() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentAnchorDate((prev) => {
      const next = new Date(prev);
      if (calendarMode === 'week') {
        next.setDate(prev.getDate() + 7);
      } else {
        next.setMonth(prev.getMonth() + 1);
      }
      return next;
    });
  };

  const handleGoToday = () => {
    setCurrentAnchorDate(new Date());
  };

  const handleJumpDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      setCurrentAnchorDate(new Date(y, m - 1, d));
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.TrangThaiDon !== statusFilter) return false;
      if (roomFilter !== 'ALL' && b.MaPhong !== roomFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const customer = customers.find((c) => c.MaKH === b.MaKH);
        const matchCode = b.MaDon.toLowerCase().includes(q);
        const matchRoom = b.MaPhong.toLowerCase().includes(q);
        const matchName = customer?.HoTen.toLowerCase().includes(q);
        const matchPhone = customer?.SoDienThoai.includes(q);
        if (!matchCode && !matchRoom && !matchName && !matchPhone) return false;
      }

      return true;
    });
  }, [bookings, customers, statusFilter, roomFilter, searchQuery]);

  const getStatusStyles = (status: TrangThaiDon) => {
    switch (status) {
      case 'Chờ đặt cọc':
        return {
          bg: 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300',
          dot: '#f59e0b',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Chờ cọc',
        };
      case 'Đã xác nhận':
        return {
          bg: 'bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300',
          dot: '#3b82f6',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Đã xác nhận',
        };
      case 'Đã check-in':
        return {
          bg: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300 font-semibold',
          dot: '#059669',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'Đang lưu trú',
        };
      case 'Đã hoàn thành':
        return {
          bg: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300',
          dot: '#64748b',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Hoàn thành',
        };
      case 'Đã hủy':
        return {
          bg: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 line-through opacity-70',
          dot: '#f43f5e',
          badge: 'bg-rose-100 text-rose-700 border-rose-200',
          label: 'Đã hủy',
        };
      case 'No-show':
        return {
          bg: 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-300',
          dot: '#ea580c',
          badge: 'bg-orange-100 text-orange-800 border-orange-200',
          label: 'No-show',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: '#94a3b8',
          badge: 'bg-slate-100 text-slate-800 border-slate-200',
          label: status,
        };
    }
  };

  const getBookingForRoomAndDate = (roomCode: string, dateStr: string) => {
    return filteredBookings.find((b) => {
      if (b.MaPhong !== roomCode) return false;
      const checkIn = b.NgayNhanPhong.slice(0, 10);
      const checkOut = b.NgayTraPhong.slice(0, 10);
      return dateStr >= checkIn && dateStr < checkOut;
    });
  };

  const currentRangeBounds = useMemo(() => {
    if (calendarMode === 'week') {
      return {
        start: weekDays[0].dateStr,
        end: weekDays[6].dateStr,
        label: `Tuần: ${formatDate(weekDays[0].dateStr)} – ${formatDate(weekDays[6].dateStr)}`,
      };
    }
    const year = currentAnchorDate.getFullYear();
    const month = currentAnchorDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      end: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      label: `Tháng ${month + 1}/${year}`,
    };
  }, [calendarMode, weekDays, currentAnchorDate]);

  const kpis = useMemo(() => {
    const activeInPeriod = filteredBookings.filter((b) => {
      const inStr = b.NgayNhanPhong.slice(0, 10);
      const outStr = b.NgayTraPhong.slice(0, 10);
      return inStr <= currentRangeBounds.end && outStr >= currentRangeBounds.start && b.TrangThaiDon !== 'Đã hủy';
    });

    const checkInsToday = bookings.filter(
      (b) => b.NgayNhanPhong.slice(0, 10) === todayStr && b.TrangThaiDon !== 'Đã hủy'
    ).length;

    const checkOutsToday = bookings.filter(
      (b) => b.NgayTraPhong.slice(0, 10) === todayStr && b.TrangThaiDon !== 'Đã hủy'
    ).length;

    return {
      totalBookings: activeInPeriod.length,
      checkInsToday,
      checkOutsToday,
    };
  }, [filteredBookings, bookings, currentRangeBounds, todayStr]);

  const handleCellClick = (roomCode: string, dateStr: string) => {
    const nextDate = new Date(dateStr);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = formatDateToYMD(nextDate);

    onOpenCreateBookingModal({
      roomCode,
      checkIn: dateStr,
      checkOut: nextDateStr,
      guests: 2,
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                calendarMode === 'week'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Xem theo Tuần (7 ngày)</span>
            </button>

            <button
              onClick={() => setCalendarMode('month-timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                calendarMode === 'month-timeline'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Sơ đồ Phòng theo Tháng</span>
            </button>

            <button
              onClick={() => setCalendarMode('month-grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                calendarMode === 'month-grid'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Lưới Lịch Tháng</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Trước đó"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-extrabold text-slate-900 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
              {currentRangeBounds.label}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={formatDateToYMD(currentAnchorDate)}
                onChange={handleJumpDate}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white text-slate-700 shadow-2xs cursor-pointer"
                title="Nhảy đến ngày bất kỳ"
              />
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo Mã đơn (DP...), Tên khách, SĐT hoặc Phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:border-blue-500 outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả các phòng (12 phòng)</option>
              {rooms.map((r) => (
                <option key={r.MaPhong} value={r.MaPhong}>
                  {r.MaPhong} - {r.TenPhong} ({r.LoaiPhong})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:border-blue-500 outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái đơn</option>
              <option value="Chờ đặt cọc">Chờ đặt cọc</option>
              <option value="Đã xác nhận">Đã xác nhận</option>
              <option value="Đã check-in">Đang lưu trú (Đã check-in)</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
              <option value="No-show">No-show</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Chú giải:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-700">Chờ đặt cọc</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-700">Đã xác nhận</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="text-slate-700 font-semibold">Đang lưu trú</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-slate-700">Đã hoàn thành</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-700">Đã hủy</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span>
              Tổng số đơn: <strong className="text-slate-900">{kpis.totalBookings}</strong>
            </span>
            <span>
              Check-in hôm nay: <strong className="text-blue-700">{kpis.checkInsToday}</strong>
            </span>
            <span>
              Check-out hôm nay: <strong className="text-purple-700">{kpis.checkOutsToday}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Week View */}
      {calendarMode === 'week' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs select-none">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-3 text-left font-bold text-slate-800 uppercase tracking-wide border-r border-slate-200 w-52 min-w-52 sticky left-0 bg-slate-50 z-10 shadow-2xs">
                    PHÒNG / HẠNG PHÒNG
                  </th>
                  {weekDays.map((wd) => (
                    <th
                      key={wd.dateStr}
                      className={`py-2 px-2 text-center border-r border-slate-200 min-w-36 transition-colors ${
                        wd.isToday
                          ? 'bg-blue-50/80 font-bold text-blue-900'
                          : wd.isWeekend
                          ? 'bg-slate-100/60 font-semibold text-slate-800'
                          : 'font-semibold text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{wd.dayName}</div>
                      <div className="text-sm font-extrabold flex items-center justify-center gap-1 mt-0.5">
                        <span>{wd.date.getDate()}/{wd.date.getMonth() + 1}</span>
                        {wd.isToday && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-bold tracking-tight">
                            Hôm nay
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rooms
                  .filter((r) => roomFilter === 'ALL' || r.MaPhong === roomFilter)
                  .map((room) => (
                    <tr key={room.MaPhong} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 border-r border-slate-200 sticky left-0 bg-white z-10 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 text-sm">{room.MaPhong}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                            {room.LoaiPhong}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5" title={room.TenPhong}>
                          {room.TenPhong} · {room.SucChua} khách
                        </div>
                      </td>

                      {weekDays.map((wd) => {
                        const booking = getBookingForRoomAndDate(room.MaPhong, wd.dateStr);

                        if (!booking) {
                          return (
                            <td
                              key={wd.dateStr}
                              onClick={() => handleCellClick(room.MaPhong, wd.dateStr)}
                              className={`p-1.5 border-r border-slate-200 text-center transition-colors group cursor-pointer relative ${
                                wd.isToday ? 'bg-blue-50/20' : wd.isWeekend ? 'bg-slate-50/40' : ''
                              } hover:bg-blue-50/60`}
                              title={`Bấm vào đây để tạo đơn đặt phòng mới: ${room.MaPhong} ngày ${formatDate(wd.dateStr)}`}
                            >
                              <div className="h-14 rounded-lg flex items-center justify-center border border-dashed border-transparent group-hover:border-blue-300 transition-all">
                                <span className="text-[11px] font-medium text-slate-400 group-hover:text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="w-3.5 h-3.5" /> Đặt phòng
                                </span>
                              </div>
                            </td>
                          );
                        }

                        const style = getStatusStyles(booking.TrangThaiDon);
                        const isCheckInDay = booking.NgayNhanPhong.slice(0, 10) === wd.dateStr;
                        const isCheckOutDay = booking.NgayTraPhong.slice(0, 10) === wd.dateStr;
                        const customer = customers.find((c) => c.MaKH === booking.MaKH);

                        return (
                          <td
                            key={wd.dateStr}
                            onClick={() => setSelectedBookingForMenu(booking)}
                            className={`p-1 border-r border-slate-200 cursor-pointer ${
                              wd.isToday ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            <div
                              className={`h-14 p-1.5 rounded-lg border flex flex-col justify-between shadow-2xs transition-all hover:scale-[1.02] ${style.bg}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-[11px] tracking-tight">{booking.MaDon}</span>
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: style.dot }} />
                              </div>

                              <div className="truncate font-semibold text-[11px] text-slate-900" title={customer?.HoTen || 'Khách lẻ'}>
                                {customer?.HoTen || 'Khách lẻ'}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-600">
                                <span>{booking.SoKhach}K · {booking.SoDem}Đ</span>
                                {isCheckInDay ? (
                                  <span className="font-bold text-blue-700">➔ Nhận</span>
                                ) : isCheckOutDay ? (
                                  <span className="font-bold text-purple-700">Trả ➔</span>
                                ) : (
                                  <span className="truncate">{style.label}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Month Timeline */}
      {calendarMode === 'month-timeline' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs select-none">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-3 text-left font-bold text-slate-800 uppercase tracking-wide border-r border-slate-200 w-44 min-w-44 sticky left-0 bg-slate-50 z-10 shadow-2xs">
                    PHÒNG ({monthDays.length} ngày)
                  </th>
                  {monthDays.map((md) => (
                    <th
                      key={md.dateStr}
                      className={`py-2 px-1 text-center border-r border-slate-200 min-w-10 max-w-12 transition-colors ${
                        md.isToday
                          ? 'bg-blue-50 font-bold text-blue-900 ring-1 ring-blue-500 ring-inset'
                          : md.isWeekend
                          ? 'bg-slate-100/70 text-slate-700'
                          : 'text-slate-600'
                      }`}
                      title={`${md.dayName}, ngày ${md.dayNum}/${currentAnchorDate.getMonth() + 1}`}
                    >
                      <div className="text-[10px] text-slate-400 leading-none">{md.dayName}</div>
                      <div className="text-xs font-black mt-0.5">{md.dayNum}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rooms
                  .filter((r) => roomFilter === 'ALL' || r.MaPhong === roomFilter)
                  .map((room) => (
                    <tr key={room.MaPhong} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2.5 border-r border-slate-200 sticky left-0 bg-white z-10 shadow-2xs">
                        <div className="font-extrabold text-slate-900 text-xs">{room.MaPhong}</div>
                        <div className="text-[10px] text-slate-500 truncate" title={room.TenPhong}>
                          {room.LoaiPhong}
                        </div>
                      </td>

                      {monthDays.map((md) => {
                        const booking = getBookingForRoomAndDate(room.MaPhong, md.dateStr);

                        if (!booking) {
                          return (
                            <td
                              key={md.dateStr}
                              onClick={() => handleCellClick(room.MaPhong, md.dateStr)}
                              className={`p-0.5 border-r border-slate-200 text-center transition-colors hover:bg-blue-100/50 cursor-pointer ${
                                md.isToday ? 'bg-blue-50/20' : md.isWeekend ? 'bg-slate-50/40' : ''
                              }`}
                              title={`Phòng ${room.MaPhong} còn trống ngày ${formatDate(md.dateStr)}. Bấm để đặt phòng.`}
                            >
                              <div className="h-9 rounded-sm flex items-center justify-center text-[9px] text-slate-300 hover:text-blue-600 font-bold">
                                ·
                              </div>
                            </td>
                          );
                        }

                        const style = getStatusStyles(booking.TrangThaiDon);
                        const isCheckInDay = booking.NgayNhanPhong.slice(0, 10) === md.dateStr;

                        return (
                          <td
                            key={md.dateStr}
                            onClick={() => setSelectedBookingForMenu(booking)}
                            className="p-0.5 border-r border-slate-200 cursor-pointer"
                          >
                            <div
                              className={`h-9 rounded-sm border p-0.5 flex flex-col justify-center items-center text-[9px] font-bold shadow-2xs transition-all hover:scale-105 ${style.bg}`}
                            >
                              <span className="truncate w-full text-center leading-tight">
                                {isCheckInDay ? '➔' : ''} {booking.MaDon.slice(-4)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Month Grid */}
      {calendarMode === 'month-grid' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-3">
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-700 text-xs uppercase tracking-wider py-2 bg-slate-50 rounded-lg mb-2 border border-slate-200">
            <div>Thứ 2</div>
            <div>Thứ 3</div>
            <div>Thứ 4</div>
            <div>Thứ 5</div>
            <div>Thứ 6</div>
            <div className="text-amber-700">Thứ 7</div>
            <div className="text-rose-700">Chủ Nhật</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthGridCells.map((cell) => {
              const activeOnThisDate = filteredBookings.filter((b) => {
                const inStr = b.NgayNhanPhong.slice(0, 10);
                const outStr = b.NgayTraPhong.slice(0, 10);
                return cell.dateStr >= inStr && cell.dateStr < outStr && b.TrangThaiDon !== 'Đã hủy';
              });

              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    cell.isToday
                      ? 'border-blue-500 bg-blue-50/30 shadow-2xs'
                      : cell.isCurrentMonth
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black ${
                        cell.isToday
                          ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {activeOnThisDate.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                        {activeOnThisDate.length} đơn
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 my-1 overflow-y-auto max-h-20">
                    {activeOnThisDate.slice(0, 3).map((b) => {
                      const style = getStatusStyles(b.TrangThaiDon);
                      const customer = customers.find((c) => c.MaKH === b.MaKH);
                      return (
                        <div
                          key={b.MaDon}
                          onClick={() => setSelectedBookingForMenu(b)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate cursor-pointer transition-transform hover:scale-[1.02] ${style.bg}`}
                          title={`${b.MaDon} - Phòng ${b.MaPhong} - ${customer?.HoTen}`}
                        >
                          <strong>{b.MaPhong}</strong>: {customer?.HoTen?.split(' ').slice(-1)[0] || b.MaDon}
                        </div>
                      );
                    })}
                    {activeOnThisDate.length > 3 && (
                      <div className="text-[10px] text-blue-600 font-bold text-center">
                        +{activeOnThisDate.length - 3} đơn khác...
                      </div>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenCreateBookingModal({
                          checkIn: cell.dateStr,
                          checkOut: formatDateToYMD(new Date(new Date(cell.dateStr).getTime() + 86400000)),
                          guests: 2,
                        })
                      }
                      className="text-slate-400 hover:text-blue-600 flex items-center gap-0.5 cursor-pointer"
                      title={`Tạo đơn nhận phòng ngày ${formatDate(cell.dateStr)}`}
                    >
                      <Plus className="w-3 h-3" /> Tạo đơn
                    </button>
                    <span>{formatDate(cell.dateStr)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick modal when booking clicked */}
      {selectedBookingForMenu && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
            <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    ĐƠN ĐẶT PHÒNG {selectedBookingForMenu.MaDon}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Phòng {selectedBookingForMenu.MaPhong} · {formatDate(selectedBookingForMenu.NgayNhanPhong)} → {formatDate(selectedBookingForMenu.NgayTraPhong)} ({selectedBookingForMenu.SoDem} đêm)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForMenu(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain text-xs">
              {(() => {
                const cust = customers.find((c) => c.MaKH === selectedBookingForMenu.MaKH);
                const room = rooms.find((r) => r.MaPhong === selectedBookingForMenu.MaPhong);
                const style = getStatusStyles(selectedBookingForMenu.TrangThaiDon);

                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Khách hàng</span>
                        <strong className="text-slate-900 text-sm">{cust?.HoTen || 'Khách lẻ'}</strong>
                        <div className="text-slate-600 mt-0.5">SĐT: {cust?.SoDienThoai}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Phòng & Trạng thái</span>
                        <strong className="text-slate-900 text-sm">{selectedBookingForMenu.MaPhong} - {room?.TenPhong}</strong>
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badge}`}>
                            {selectedBookingForMenu.TrangThaiDon}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Tiền phòng</span>
                        <strong className="text-slate-800">{formatVND(selectedBookingForMenu.TienPhong)}</strong>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Đã thu</span>
                        <strong className="text-emerald-700">{formatVND(selectedBookingForMenu.DaThu)}</strong>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Còn lại</span>
                        <strong className="text-rose-600">{formatVND(selectedBookingForMenu.ConLai)}</strong>
                      </div>
                    </div>

                    {selectedBookingForMenu.YeuCauDacBiet && (
                      <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                        <strong>Yêu cầu:</strong> {selectedBookingForMenu.YeuCauDacBiet}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                        Thao tác quản lý đơn:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const ma = selectedBookingForMenu.MaDon;
                            setSelectedBookingForMenu(null);
                            onOpenBookingDetail(ma);
                          }}
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                        </button>

                        {(selectedBookingForMenu.TrangThaiDon === 'Chờ đặt cọc' ||
                          selectedBookingForMenu.TrangThaiDon === 'Đã xác nhận' ||
                          selectedBookingForMenu.TrangThaiDon === 'Đã check-in') &&
                          onOpenUpdateModal && (
                            <button
                              type="button"
                              onClick={() => {
                                const b = selectedBookingForMenu;
                                setSelectedBookingForMenu(null);
                                onOpenUpdateModal(b);
                              }}
                              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Cập nhật đơn
                            </button>
                          )}

                        {selectedBookingForMenu.TrangThaiDon === 'Chờ đặt cọc' && onOpenDepositModal && (
                          <button
                            type="button"
                            onClick={() => {
                              const b = selectedBookingForMenu;
                              setSelectedBookingForMenu(null);
                              onOpenDepositModal(b);
                            }}
                            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Thu cọc 30%
                          </button>
                        )}

                        {selectedBookingForMenu.TrangThaiDon === 'Đã xác nhận' && onOpenCheckInModal && (
                          <button
                            type="button"
                            onClick={() => {
                              const b = selectedBookingForMenu;
                              setSelectedBookingForMenu(null);
                              onOpenCheckInModal(b);
                            }}
                            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <CheckInIcon className="w-3.5 h-3.5" /> Check-in
                          </button>
                        )}

                        {selectedBookingForMenu.TrangThaiDon === 'Đã check-in' && onOpenCheckOutModal && (
                          <button
                            type="button"
                            onClick={() => {
                              const b = selectedBookingForMenu;
                              setSelectedBookingForMenu(null);
                              onOpenCheckOutModal(b);
                            }}
                            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <CheckOutIcon className="w-3.5 h-3.5" /> Check-out
                          </button>
                        )}

                        {selectedBookingForMenu.TrangThaiDon === 'Đã hoàn thành' && onPrintInvoice && (
                          <button
                            type="button"
                            onClick={() => {
                              const ma = selectedBookingForMenu.MaDon;
                              setSelectedBookingForMenu(null);
                              onPrintInvoice(ma);
                            }}
                            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5" /> Xem hóa đơn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end z-20">
              <button
                type="button"
                onClick={() => setSelectedBookingForMenu(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
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
