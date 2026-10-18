import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CalendarCheck2, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  BedDouble, 
  MessageSquare,
  CheckCheck
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { formatVND } from '../utils/helpers';
import { TabKey } from './Sidebar';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBookingDetail?: (maDon: string) => void;
  onNavigateToTab?: (tab: TabKey) => void;
}

export type NotificationCategory = 'all' | 'deposit' | 'cleaning' | 'checkin';

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  onOpenBookingDetail,
  onNavigateToTab,
}) => {
  const { bookings, rooms, customers, cleanRoom } = useHomestay();
  const [filter, setFilter] = useState<NotificationCategory>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pendingDepositBookings = bookings.filter((b) => b.TrangThaiDon === 'Chờ đặt cọc');
  const cleaningRooms = rooms.filter((r) => r.TrangThaiPhong === 'Chờ dọn phòng');
  const upcomingCheckInBookings = bookings.filter((b) => b.TrangThaiDon === 'Đã xác nhận');
  const inHouseBookings = bookings.filter((b) => b.TrangThaiDon === 'Đã check-in');

  interface NotificationItem {
    id: string;
    category: 'deposit' | 'cleaning' | 'checkin';
    typeBadge: string;
    badgeColor: string;
    title: string;
    desc: string;
    timeText: string;
    maDon?: string;
    maPhong?: string;
    urgent?: boolean;
    hasSpecialRequest?: boolean;
  }

  const items: NotificationItem[] = [];

  // 1. Pending Deposit
  pendingDepositBookings.forEach((b) => {
    const kh = customers.find((c) => c.MaKH === b.MaKH);
    items.push({
      id: `deposit_${b.MaDon}`,
      category: 'deposit',
      typeBadge: 'CẦN DUYỆT CỌC',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: `Đơn ${b.MaDon} chờ đặt cọc ${formatVND(b.TienCocYeuCau)}`,
      desc: `Khách ${kh?.HoTen || 'Khách hàng'} đặt phòng ${b.MaPhong} (${b.NgayNhanPhong} → ${b.NgayTraPhong}). Thời hạn giữ phòng: tối đa 12 giờ.`,
      timeText: 'Chờ thanh toán',
      maDon: b.MaDon,
      urgent: true,
      hasSpecialRequest: !!b.YeuCauDacBiet,
    });
  });

  // 2. Cleaning Rooms
  cleaningRooms.forEach((r) => {
    items.push({
      id: `cleaning_${r.MaPhong}`,
      category: 'cleaning',
      typeBadge: 'BUỒNG PHÒNG',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
      title: `${r.TenPhong} đang chờ dọn vệ sinh`,
      desc: `Phòng cần được vệ sinh, thay ga gối sạch sẽ trước giờ nhận phòng tiếp theo (14:00).`,
      timeText: 'Cần dọn ngay',
      maPhong: r.MaPhong,
      urgent: true,
    });
  });

  // 3. Upcoming Check-ins
  upcomingCheckInBookings.slice(0, 5).forEach((b) => {
    const kh = customers.find((c) => c.MaKH === b.MaKH);
    items.push({
      id: `checkin_${b.MaDon}`,
      category: 'checkin',
      typeBadge: 'SẮP CHECK-IN',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      title: `Đơn ${b.MaDon} đã xác nhận cọc - Sẵn sàng đón khách`,
      desc: `Khách ${kh?.HoTen || 'Khách hàng'} sẽ nhận phòng ${b.MaPhong} ngày ${b.NgayNhanPhong}. Cần bàn giao chìa khóa & hướng dẫn quy chế.`,
      timeText: b.NgayNhanPhong,
      maDon: b.MaDon,
      urgent: false,
      hasSpecialRequest: !!b.YeuCauDacBiet,
    });
  });

  // 4. In-house Checkouts
  inHouseBookings.slice(0, 3).forEach((b) => {
    const kh = customers.find((c) => c.MaKH === b.MaKH);
    items.push({
      id: `inhouse_${b.MaDon}`,
      category: 'checkin',
      typeBadge: 'ĐANG LƯU TRÚ',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: `Đơn ${b.MaDon} đang ở phòng ${b.MaPhong}`,
      desc: `Khách ${kh?.HoTen || 'Khách'} dự kiến trả phòng ${b.NgayTraPhong} (12:00). Chuẩn bị kiểm tra minibar, dịch vụ phát sinh & xuất hóa đơn.`,
      timeText: `Trả phòng ${b.NgayTraPhong}`,
      maDon: b.MaDon,
      urgent: false,
    });
  });

  const filteredItems = items.filter((item) => {
    if (dismissedIds.has(item.id)) return false;
    if (filter === 'all') return true;
    return item.category === filter;
  });

  const handleMarkAllRead = () => {
    const allIds = new Set(items.map((i) => i.id));
    setDismissedIds(allIds);
  };

  const handleItemClick = (item: NotificationItem) => {
    if (item.maDon && onOpenBookingDetail) {
      onOpenBookingDetail(item.maDon);
      onClose();
    } else if (item.maPhong && onNavigateToTab) {
      onNavigateToTab('rooms');
      onClose();
    }
  };

  const handleCleanRoomQuick = (e: React.MouseEvent, maPhong: string) => {
    e.stopPropagation();
    cleanRoom(maPhong);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[390px] sm:w-[440px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
      style={{ maxHeight: 'min(580px, calc(100vh - 80px))' }}
    >
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/30">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white uppercase tracking-wider block" style={{ color: '#ffffff' }}>
                VIỆC CẦN XỬ LÝ & THÔNG BÁO
              </span>
              {filteredItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-xs">
                  {filteredItems.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 font-normal mt-0.5" style={{ color: '#cbd5e1' }}>
              Nhắc việc vận hành, duyệt cọc & buồng phòng Homestay
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Đóng thông báo"
        >
          <X className="w-5 h-5 text-slate-300 hover:text-white" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1 overflow-x-auto text-[11px] shrink-0 font-medium">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              filter === 'all'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({items.length})
          </button>
          <button
            onClick={() => setFilter('deposit')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              filter === 'deposit'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Duyệt cọc ({pendingDepositBookings.length})
          </button>
          <button
            onClick={() => setFilter('cleaning')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              filter === 'cleaning'
                ? 'bg-orange-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dọn phòng ({cleaningRooms.length})
          </button>
        </div>

        {filteredItems.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold whitespace-nowrap flex items-center gap-1 cursor-pointer"
            title="Đánh dấu tất cả đã đọc"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đã đọc hết</span>
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-700">Tất cả việc đã hoàn thành!</p>
            <p className="text-[11px] text-slate-400">
              Không có đơn nào cần duyệt gấp hoặc phòng đang chờ dọn vệ sinh.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-3 rounded-xl transition-all cursor-pointer hover:bg-slate-50 border ${
                item.urgent ? 'border-amber-200/80 bg-amber-50/20' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                >
                  {item.typeBadge}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.timeText}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {item.desc}
              </p>

              <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-100">
                {item.maPhong && item.category === 'cleaning' ? (
                  <button
                    type="button"
                    onClick={(e) => handleCleanRoomQuick(e, item.maPhong!)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Xác nhận đã dọn xong</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:underline">
                    <span>Xem chi tiết & xử lý</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                )}

                {item.hasSpecialRequest && (
                  <span className="text-[10px] text-purple-700 font-semibold flex items-center gap-1 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                    <MessageSquare className="w-2.5 h-2.5" />
                    Có yêu cầu đặc biệt
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 shrink-0">
        Bấm vào từng mục để xem chi tiết đơn đặt phòng hoặc cập nhật buồng phòng
      </div>
    </div>
  );
};
