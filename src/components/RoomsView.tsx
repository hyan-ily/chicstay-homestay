import React, { useState } from 'react';
import {
  BedDouble,
  CheckCircle2,
  Plus,
  Search,
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { formatVND } from '../utils/helpers';

interface RoomsViewProps {
  onOpenCreateBookingModal: (initialData?: { roomCode?: string }) => void;
  onOpenBookingDetail: (maDon: string) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
  onOpenCreateBookingModal,
  onOpenBookingDetail,
}) => {
  const { rooms, bookings, cleanRoom } = useHomestay();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter((r) => {
    if (statusFilter !== 'ALL' && r.TrangThaiPhong !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.MaPhong.toLowerCase().includes(q) ||
        r.TenPhong.toLowerCase().includes(q) ||
        r.LoaiPhong.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5 leading-tight">
            <BedDouble className="w-7 h-7 text-blue-600" />
            TÌNH TRẠNG PHÒNG & BUỒNG PHÒNG
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý trạng thái vật lý của 12 phòng nghỉ: Sẵn sàng, Đang sử dụng, Đã được đặt, Tạm giữ, Chờ dọn phòng
          </p>
        </div>

        {rooms.some((r) => r.TrangThaiPhong === 'Chờ dọn phòng') && (
          <div className="px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-800 flex items-center gap-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>
              {rooms.filter((r) => r.TrangThaiPhong === 'Chờ dọn phòng').length} phòng đang chờ buồng phòng dọn dẹp
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
        {[
          { key: 'ALL', label: 'Tất cả phòng', count: rooms.length },
          { key: 'Sẵn sàng', label: 'Sẵn sàng', count: rooms.filter((r) => r.TrangThaiPhong === 'Sẵn sàng').length },
          { key: 'Đang sử dụng', label: 'Đang sử dụng', count: rooms.filter((r) => r.TrangThaiPhong === 'Đang sử dụng').length },
          { key: 'Đã được đặt', label: 'Đã được đặt', count: rooms.filter((r) => r.TrangThaiPhong === 'Đã được đặt').length },
          { key: 'Tạm giữ', label: 'Tạm giữ (Chờ cọc)', count: rooms.filter((r) => r.TrangThaiPhong === 'Tạm giữ').length },
          { key: 'Chờ dọn phòng', label: 'Chờ dọn phòng', count: rooms.filter((r) => r.TrangThaiPhong === 'Chờ dọn phòng').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === tab.key
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.key ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Tìm phòng theo số phòng (P101, P201...), tên phòng hoặc hạng phòng..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white shadow-xs outline-hidden"
        />
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          let borderStyle = 'border-emerald-200 bg-white';
          let badgeStyle = 'bg-emerald-100 text-emerald-800';

          if (room.TrangThaiPhong === 'Đang sử dụng') {
            borderStyle = 'border-purple-200 bg-purple-50/20';
            badgeStyle = 'bg-purple-100 text-purple-800';
          } else if (room.TrangThaiPhong === 'Đã được đặt') {
            borderStyle = 'border-blue-200 bg-blue-50/20';
            badgeStyle = 'bg-blue-100 text-blue-800';
          } else if (room.TrangThaiPhong === 'Tạm giữ') {
            borderStyle = 'border-amber-200 bg-amber-50/20';
            badgeStyle = 'bg-amber-100 text-amber-800';
          } else if (room.TrangThaiPhong === 'Chờ dọn phòng') {
            borderStyle = 'border-orange-200 bg-orange-50/20';
            badgeStyle = 'bg-orange-100 text-orange-800';
          }

          const activeBooking = bookings.find(
            (b) =>
              b.MaPhong === room.MaPhong &&
              (b.TrangThaiDon === 'Đã check-in' ||
                b.TrangThaiDon === 'Đã xác nhận' ||
                b.TrangThaiDon === 'Chờ đặt cọc')
          );

          return (
            <div
              key={room.MaPhong}
              className={`rounded-lg border ${borderStyle} p-4.5 shadow-xs transition-all flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {room.MaPhong}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {room.LoaiPhong}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeStyle}`}>
                    {room.TrangThaiPhong}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-3">{room.TenPhong}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{room.MoTa}</p>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Giá phòng theo đêm</span>
                    <strong className="text-sm font-extrabold text-blue-700 tabular-nums">
                      {formatVND(room.GiaPhong)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Sức chứa tối đa</span>
                    <strong className="text-slate-800">{room.SucChua} người</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                {room.TrangThaiPhong === 'Chờ dọn phòng' ? (
                  <button
                    onClick={() => cleanRoom(room.MaPhong)}
                    className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs tracking-wide shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HOÀN TẤT DỌN PHÒNG → SẴN SÀNG</span>
                  </button>
                ) : activeBooking ? (
                  <button
                    onClick={() => onOpenBookingDetail(activeBooking.MaDon)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 truncate cursor-pointer transition-colors"
                  >
                    <span>Xem đơn {activeBooking.MaDon} ({activeBooking.TrangThaiDon})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenCreateBookingModal({ roomCode: room.MaPhong })}
                    className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Đơn Đặt Phòng Nhanh</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
