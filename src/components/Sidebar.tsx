import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  Package,
  Receipt,
  Users,
  BedDouble,
  BarChart3,
  Database,
  Settings,
  X
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';

export type TabKey =
  | 'dashboard'
  | 'bookings'
  | 'services'
  | 'payments'
  | 'customers'
  | 'rooms'
  | 'reports'
  | 'database'
  | 'settings';

interface SidebarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { bookings, rooms } = useHomestay();

  const pendingBookingsCount = bookings.filter((b) => b.TrangThaiDon === 'Chờ đặt cọc').length;
  const inUseRoomsCount = rooms.filter((r) => r.TrangThaiPhong === 'Đang sử dụng').length;
  const cleaningRoomsCount = rooms.filter((r) => r.TrangThaiPhong === 'Chờ dọn phòng').length;

  // 4 phân hệ cốt lõi
  const coreModules = [
    {
      key: 'bookings' as TabKey,
      label: 'Quản lý đơn đặt phòng',
      icon: CalendarCheck2,
      badge: pendingBookingsCount > 0 ? `${pendingBookingsCount}` : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      key: 'services' as TabKey,
      label: 'Quản lý dịch vụ',
      icon: Package,
      badge: null,
    },
    {
      key: 'payments' as TabKey,
      label: 'Thanh toán & Hóa đơn',
      icon: Receipt,
      badge: null,
    },
    {
      key: 'customers' as TabKey,
      label: 'Quản lý hồ sơ khách hàng',
      icon: Users,
      badge: null,
    },
  ];

  // Các màn hình hỗ trợ vận hành
  const supportModules = [
    {
      key: 'dashboard' as TabKey,
      label: 'Tổng quan kinh doanh',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      key: 'rooms' as TabKey,
      label: 'Tình trạng phòng',
      icon: BedDouble,
      badge: cleaningRoomsCount > 0 ? `Dọn ${cleaningRoomsCount}` : null,
      badgeColor: 'bg-orange-500 text-white',
    },
    {
      key: 'reports' as TabKey,
      label: 'Báo cáo doanh thu',
      icon: BarChart3,
      badge: null,
    },
    {
      key: 'database' as TabKey,
      label: 'Cơ sở dữ liệu (CSDL)',
      icon: Database,
      badge: 'SQL',
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      key: 'settings' as TabKey,
      label: 'Cài đặt hệ thống',
      icon: Settings,
      badge: null,
    },
  ];

  const renderItem = (item: {
    key: TabKey;
    label: string;
    icon: any;
    badge?: string | null;
    badgeColor?: string;
  }) => {
    const Icon = item.icon;
    const isActive = currentTab === item.key;
    return (
      <button
        key={item.key}
        onClick={() => {
          onSelectTab(item.key);
          onClose();
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
          isActive
            ? 'bg-blue-600 text-white font-bold shadow-xs'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              item.badgeColor || 'bg-slate-700 text-slate-200'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111c2e] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 h-full shrink-0 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="md:hidden h-14 flex items-center justify-between px-5 border-b border-slate-800 bg-[#0d1624] shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh Mục Quản Lý</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#142136] text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Khách lưu trú: <strong className="text-emerald-400">{inUseRoomsCount} phòng</strong></span>
          <span>Chờ dọn: <strong className="text-orange-400">{cleaningRoomsCount}</strong></span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Phân Hệ Nghiệp Vụ Cốt Lõi
            </div>
            <div className="space-y-1">
              {coreModules.map(renderItem)}
            </div>
          </div>

          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Hỗ Trợ Vận Hành & Báo Cáo
            </div>
            <div className="space-y-1">
              {supportModules.map(renderItem)}
            </div>
          </div>
        </nav>

        <div className="p-3.5 border-t border-slate-800 bg-[#0d1624] text-[11px] text-slate-400 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Chicstay Homestay</span>
            <span className="text-emerald-400 font-semibold text-[10px]">Trực tuyến</span>
          </div>
          <span className="text-[10px] text-slate-500">Phiên bản ERP 2.6.4</span>
        </div>
      </aside>
    </>
  );
};
