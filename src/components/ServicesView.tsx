import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  BarChart2,
  Layers,
  AlertCircle,
  ExternalLink,
  PlayCircle,
  Lock,
  ClipboardList,
  Ban,
  Trash2,
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { useToast } from '../context/ToastContext';
import { DichVu, NhomDichVu, ThoiDiemApDung, TrangThaiThucHienDV } from '../types';
import {
  formatVND,
  formatDateTime,
  getServiceGroupBadge,
  removeVietnameseTones,
  canEditBookingServices,
  getServiceLockReason,
  getServiceExecStatus,
  getServiceExecStatusBadge,
  getNextServiceExecStatuses,
  isServiceBillable,
  canCancelService,
  getServiceCancelTitle,
  SERVICE_EXEC_STATUSES,
} from '../utils/helpers';
import { ModalShell } from './ModalShell';
import { CancelServiceModal, CancelServiceTarget } from './CancelServiceModal';
import { CanceledServiceDetailModal } from './CanceledServiceDetailModal';

interface ServicesViewProps {
  onNavigateToBooking?: (maDon: string) => void;
}


// ====================================================================
// COMPONENT DÙNG CHUNG: Badge + điều khiển trạng thái thực hiện dịch vụ
// ====================================================================
export const ServiceStatusBadge: React.FC<{ status?: TrangThaiThucHienDV; className?: string }> = ({
  status,
  className = '',
}) => {
  const st = status || 'Đã yêu cầu';
  const b = getServiceExecStatusBadge(st);
  const Icon = b.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${b.bg} ${b.text} ${b.border} ${className}`}
    >
      <Icon className={`w-3 h-3 ${b.iconClass}`} />
      {st}
    </span>
  );
};

// Dropdown chuyển trạng thái (dùng trong modal đơn đặt phòng)
export const ServiceStatusDropdown: React.FC<{
  status?: TrangThaiThucHienDV;
  disabled?: boolean;
  onChange: (next: TrangThaiThucHienDV) => void;
}> = ({ status, disabled, onChange }) => {
  const current = status || 'Đã yêu cầu';
  const nexts = getNextServiceExecStatuses(current);
  if (disabled || nexts.length === 0) return null;
  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value as TrangThaiThucHienDV);
      }}
      className="text-[10px] font-semibold border border-slate-300 rounded-md px-1.5 py-1 bg-white text-slate-700 cursor-pointer hover:border-blue-400 focus:outline-hidden focus:ring-1 focus:ring-blue-400"
      title="Chuyển trạng thái thực hiện"
    >
      <option value="">Chuyển trạng thái...</option>
      {nexts.map((n) => (
        <option key={n} value={n}>
          {n === 'Đang thực hiện' ? 'Bắt đầu thực hiện' : 'Hoàn thành'}
        </option>
      ))}
    </select>
  );
};

// ====================================================================
// SERVICE EXECUTION BOARD: Theo dõi thực hiện dịch vụ
// ====================================================================
const ServiceExecutionBoard: React.FC<{ onNavigateToBooking?: (maDon: string) => void }> = ({ onNavigateToBooking }) => {
  const { serviceItems, bookings, rooms, updateServiceItemStatus, removeServiceFromBooking } = useHomestay();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'ALL' | TrangThaiThucHienDV>('ALL');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return serviceItems
      .map((it) => {
        const booking = bookings.find((b) => b.MaDon === it.MaDon);
        const room = booking ? rooms.find((r) => r.MaPhong === booking.MaPhong) : undefined;
        return { it, booking, tenPhong: room?.TenPhong || booking?.MaPhong || '--', status: getServiceExecStatus(it) };
      })
      .sort((a, b) => new Date(b.it.ThoiDiemThem).getTime() - new Date(a.it.ThoiDiemThem).getTime());
  }, [serviceItems, bookings, rooms]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const st of SERVICE_EXEC_STATUSES) c[st] = rows.filter((r) => r.status === st).length;
    return c;
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (query.trim()) {
      const q = removeVietnameseTones(query);
      return (
        removeVietnameseTones(r.it.MaDon).includes(q) ||
        removeVietnameseTones(r.tenPhong).includes(q) ||
        removeVietnameseTones(r.it.TenDichVu).includes(q)
      );
    }
    return true;
  });

  const handleChange = (id: string, name: string, next: TrangThaiThucHienDV) => {
    const res = updateServiceItemStatus(id, next);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const [cancelTarget, setCancelTarget] = useState<CancelServiceTarget | null>(null);
  const [selectedCanceledDetail, setSelectedCanceledDetail] = useState<{ it: any; tenPhong: string } | null>(null);

  const handleCancelService = (id: string, name: string, status: string, item: any, tenPhong: string) => {
    // Nếu dịch vụ ở trạng thái 'Đang thực hiện': Mở hộp thoại ở giữa màn hình yêu cầu nhập lý do hủy
    if (status === 'Đang thực hiện') {
      setCancelTarget({
        id: item.id,
        MaDon: item.MaDon,
        TenDichVu: item.TenDichVu,
        SoLuong: item.SoLuong,
        DonGiaTaiThoiDiem: item.DonGiaTaiThoiDiem,
        DonViTinh: item.DonViTinh,
        tenPhong,
        TrangThaiThucHien: status,
      });
      return;
    }

    // Nếu dịch vụ ở trạng thái 'Đã yêu cầu': Cho hủy trực tiếp không cần lý do vì không ảnh hưởng đến tiền
    const res = removeServiceFromBooking(id);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const filterTabs: { key: 'ALL' | TrangThaiThucHienDV; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'Đã yêu cầu', label: 'Đã yêu cầu' },
    { key: 'Đang thực hiện', label: 'Đang thực hiện' },
    { key: 'Đã hoàn thành', label: 'Đã hoàn thành' },
    { key: 'Đã hủy', label: 'Đã hủy' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SERVICE_EXEC_STATUSES.map((st) => {
          const b = getServiceExecStatusBadge(st);
          const Icon = b.Icon;
          return (
            <div key={st} className={`p-3.5 rounded-xl border flex items-center gap-3 ${b.bg} ${b.border}`}>
              <Icon className={`w-5 h-5 ${b.text} ${b.iconClass}`} />
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wide block ${b.text}`}>{st}</span>
                <span className="text-lg font-black text-slate-900">{counts[st]}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white border border-slate-200/80 rounded-xl">
        <div className="flex flex-wrap gap-1.5">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                statusFilter === t.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã đơn, phòng, dịch vụ..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">MÃ ĐƠN</th>
                <th className="py-3 px-3">PHÒNG</th>
                <th className="py-3 px-3">DỊCH VỤ</th>
                <th className="py-3 px-3 text-center">SL</th>
                <th className="py-3 px-3">THỜI ĐIỂM THÊM</th>
                <th className="py-3 px-3">TRẠNG THÁI</th>
                <th className="py-3 px-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không có dịch vụ nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map(({ it, booking, tenPhong, status }) => {
                  const b = getServiceExecStatusBadge(status);
                  const isBookingClosed = Boolean(
                    booking && (booking.TrangThaiDon === 'Đã hoàn thành' || booking.TrangThaiDon === 'Đã hủy' || booking.TrangThaiDon === 'No-show')
                  );
                  const nexts = !isBookingClosed ? getNextServiceExecStatuses(status) : [];
                  const canCancel = !isBookingClosed && canCancelService(it);
                  const statusNote = isBookingClosed
                    ? (booking?.TrangThaiDon === 'Đã hoàn thành' ? 'Đơn đã hoàn thành' : `Đơn ${booking?.TrangThaiDon}`)
                    : status === 'Đã hoàn thành'
                      ? 'Đã hoàn thành'
                      : status === 'Đã hủy'
                        ? 'Đã hủy'
                        : null;
                  return (
                    <tr key={it.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {onNavigateToBooking ? (
                          <button onClick={() => onNavigateToBooking(it.MaDon)} className="hover:underline flex items-center gap-1 cursor-pointer">
                            {it.MaDon}
                            <ExternalLink className="w-3 h-3 text-blue-500" />
                          </button>
                        ) : (
                          it.MaDon
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{tenPhong}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${b.strike ? (it.TyLeThuHuy ? 'text-amber-800' : 'line-through text-slate-400') : 'text-slate-800'}`}>
                          {it.TenDichVu}
                        </span>
                        {it.TrangThaiThucHien === 'Đã hủy' && it.TyLeThuHuy === 30 ? (
                          <span className="block text-[10px] text-amber-800 font-medium">
                            Khách hủy khi đang làm (Thu 30%: {formatVND(it.ThanhTien)})
                            <span className="ml-1">
                              — Lý do:{' '}
                              <strong className="text-slate-800 font-semibold">
                                {it.LyDoHuy || (it.GhiChuHuy?.split('Lý do: ')[1] || 'Khách yêu cầu hủy')}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedCanceledDetail({ it, tenPhong })}
                              className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer text-[10px] ml-1.5 inline-flex items-center"
                              title="Bấm để xem pop-up chi tiết lý do hủy"
                            >
                              [Chi tiết]
                            </button>
                          </span>
                        ) : (
                          <span className={`block text-[10px] ${isServiceBillable(it) ? 'text-slate-500' : 'text-slate-400 line-through'}`}>
                            {isServiceBillable(it) ? formatVND(it.ThanhTien) : 'Không tính tiền (0 ₫)'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{it.SoLuong}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500">{formatDateTime(it.ThoiDiemThem)}</td>
                      <td className="py-2.5 px-3">
                        <ServiceStatusBadge status={status} />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {nexts.includes('Đang thực hiện') && (
                            <button
                              onClick={() => handleChange(it.id, it.TenDichVu, 'Đang thực hiện')}
                              className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <PlayCircle className="w-3 h-3" /> Bắt đầu thực hiện
                            </button>
                          )}
                          {nexts.includes('Đã hoàn thành') && (
                            <button
                              onClick={() => handleChange(it.id, it.TenDichVu, 'Đã hoàn thành')}
                              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancelService(it.id, it.TenDichVu, status, it, tenPhong)}
                              className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              title={getServiceCancelTitle(it)}
                            >
                              <Trash2 className="w-3 h-3" />
                              {status === 'Đang thực hiện' ? 'Hủy (phí 30%)' : 'Xóa / Hủy'}
                            </button>
                          )}
                          {nexts.length === 0 && !canCancel && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                              <Lock className="w-3 h-3 text-slate-400" />
                              {statusNote || 'Chỉ xem'}
                            </span>
                          )}
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

      {/* MODAL HỦY DỊCH VỤ ĐANG THỰC HIỆN & THÔNG BÁO THÀNH CÔNG */}
      <CancelServiceModal
        isOpen={Boolean(cancelTarget)}
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(itemId, lyDo) => {
          const res = removeServiceFromBooking(itemId, lyDo);
          if (res.success) {
            showToast(res.message, 'success');
          }
          return res;
        }}
      />

      {/* POP-UP Ở CHÍNH GIỮA MÀN HÌNH XEM CHI TIẾT LÝ DO HỦY DỊCH VỤ */}
      <CanceledServiceDetailModal
        isOpen={Boolean(selectedCanceledDetail)}
        item={selectedCanceledDetail?.it || null}
        tenPhong={selectedCanceledDetail?.tenPhong}
        onClose={() => setSelectedCanceledDetail(null)}
      />
    </div>
  );
};

export const ServicesView: React.FC<ServicesViewProps> = ({ onNavigateToBooking }) => {
  const { services, serviceItems, bookings, customers, createService, updateService, toggleServiceStatus } = useHomestay();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'catalog' | 'execution'>('catalog');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTiming, setSelectedTiming] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DichVu | null>(null);
  const [confirmToggleService, setConfirmToggleService] = useState<DichVu | null>(null);
  const [viewStatsService, setViewStatsService] = useState<DichVu | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState<NhomDichVu>('Ăn uống & Tiện ích');
  const [formUnit, setFormUnit] = useState('Lần');
  const [formPrice, setFormPrice] = useState<number>(50000);
  const [formTiming, setFormTiming] = useState<ThoiDiemApDung>('Cả hai');
  const [errorMsg, setErrorMsg] = useState('');

  const groups: NhomDichVu[] = [
    'Ăn uống & Tiện ích',
    'Ăn uống & Trải nghiệm',
    'Di chuyển & Phương tiện',
    'Tiện ích & Vệ sinh',
    'Tiện nghi phòng',
    'Phụ thu thời gian',
    'Trải nghiệm theo Vibe',
    'Giải trí tại phòng',
    'Minibar',
  ];

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    const totalServices = services.length;
    const activeServices = services.filter((s) => s.TrangThai === 'Đang hoạt động').length;
    const inactiveServices = totalServices - activeServices;
    const billableItems = serviceItems.filter(isServiceBillable);
    const totalOrdersCount = billableItems.length;
    const totalRevenue = billableItems.reduce((sum, item) => sum + item.ThanhTien, 0);

    const usageMap: Record<string, { count: number; qty: number; revenue: number }> = {};
    for (const item of billableItems) {
      if (!usageMap[item.MaDV]) {
        usageMap[item.MaDV] = { count: 0, qty: 0, revenue: 0 };
      }
      usageMap[item.MaDV].count += 1;
      usageMap[item.MaDV].qty += item.SoLuong;
      usageMap[item.MaDV].revenue += item.ThanhTien;
    }

    let topService: { name: string; qty: number; code: string } | null = null;
    let maxQty = 0;
    for (const [code, val] of Object.entries(usageMap)) {
      if (val.qty > maxQty) {
        maxQty = val.qty;
        const svc = services.find((s) => s.MaDV === code);
        topService = {
          code,
          name: svc ? svc.TenDichVu : code,
          qty: val.qty,
        };
      }
    }

    return {
      totalServices,
      activeServices,
      inactiveServices,
      totalOrdersCount,
      totalRevenue,
      usageMap,
      topService,
    };
  }, [services, serviceItems]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (selectedGroup !== 'ALL' && s.NhomDichVu !== selectedGroup) return false;
      if (selectedStatus !== 'ALL' && s.TrangThai !== selectedStatus) return false;
      if (selectedTiming !== 'ALL' && s.ThoiDiemApDung !== selectedTiming) return false;
      if (searchQuery.trim()) {
        const q = removeVietnameseTones(searchQuery);
        return (
          removeVietnameseTones(s.TenDichVu).includes(q) ||
          removeVietnameseTones(s.MaDV).includes(q) ||
          removeVietnameseTones(s.NhomDichVu).includes(q) ||
          removeVietnameseTones(s.DonViTinh).includes(q)
        );
      }
      return true;
    });
  }, [services, selectedGroup, selectedStatus, selectedTiming, searchQuery]);

  const handleOpenAddModal = () => {
    setFormCode('');
    setFormName('');
    setFormGroup('Ăn uống & Tiện ích');
    setFormUnit('Lần');
    setFormPrice(50000);
    setFormTiming('Cả hai');
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (service: DichVu) => {
    setEditingService(service);
    setFormName(service.TenDichVu);
    setFormGroup(service.NhomDichVu);
    setFormUnit(service.DonViTinh);
    setFormPrice(service.DonGia);
    setFormTiming(service.ThoiDiemApDung);
    setErrorMsg('');
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const code = formCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Vui lòng nhập mã dịch vụ.');
      showToast('Vui lòng nhập mã dịch vụ.', 'warning');
      return;
    }
    if (services.some((s) => s.MaDV.toUpperCase() === code)) {
      setErrorMsg(`Mã dịch vụ "${code}" đã tồn tại trên hệ thống.`);
      showToast(`Mã dịch vụ "${code}" đã tồn tại!`, 'error');
      return;
    }
    if (!formName.trim()) {
      setErrorMsg('Vui lòng nhập tên dịch vụ.');
      showToast('Vui lòng nhập tên dịch vụ.', 'warning');
      return;
    }
    if (!formUnit.trim()) {
      setErrorMsg('Vui lòng nhập đơn vị tính.');
      showToast('Vui lòng nhập đơn vị tính.', 'warning');
      return;
    }
    if (formPrice <= 0 || formPrice > 10000000) {
      setErrorMsg('Đơn giá dịch vụ phải lớn hơn 0 và không vượt quá 10.000.000 ₫.');
      showToast('Đơn giá không hợp lệ (1.000 ₫ - 10.000.000 ₫).', 'error');
      return;
    }

    const res = createService({
      MaDV: code,
      TenDichVu: formName.trim(),
      NhomDichVu: formGroup,
      DonViTinh: formUnit.trim(),
      DonGia: formPrice,
      ThoiDiemApDung: formTiming,
      TrangThai: 'Đang hoạt động',
    });

    if (res.success) {
      showToast(res.message, 'success');
      setIsAddModalOpen(false);
    } else {
      setErrorMsg(res.message);
      showToast(res.message, 'error');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    if (!formName.trim()) {
      setErrorMsg('Vui lòng nhập tên dịch vụ.');
      showToast('Vui lòng nhập tên dịch vụ.', 'warning');
      return;
    }
    if (!formUnit.trim()) {
      setErrorMsg('Vui lòng nhập đơn vị tính.');
      showToast('Vui lòng nhập đơn vị tính.', 'warning');
      return;
    }
    if (formPrice <= 0 || formPrice > 10000000) {
      setErrorMsg('Đơn giá dịch vụ phải lớn hơn 0 và không vượt quá 10.000.000 ₫.');
      showToast('Đơn giá không hợp lệ (1.000 ₫ - 10.000.000 ₫).', 'error');
      return;
    }

    const res = updateService(editingService.MaDV, {
      TenDichVu: formName.trim(),
      NhomDichVu: formGroup,
      DonViTinh: formUnit.trim(),
      DonGia: formPrice,
      ThoiDiemApDung: formTiming,
    });

    if (res.success) {
      showToast(res.message, 'success');
      setEditingService(null);
    } else {
      setErrorMsg(res.message);
      showToast(res.message, 'error');
    }
  };

  const handleConfirmToggle = () => {
    if (!confirmToggleService) return;
    const res = toggleServiceStatus(confirmToggleService.MaDV);
    showToast(res.message, 'success');
    setConfirmToggleService(null);
  };

  const currentServiceUsages = useMemo(() => {
    if (!viewStatsService) return [];
    return serviceItems
      .filter((it) => it.MaDV === viewStatsService.MaDV)
      .map((it) => {
        const booking = bookings.find((b) => b.MaDon === it.MaDon);
        const customer = booking ? customers.find((c) => c.MaKH === booking.MaKH) : null;
        return {
          ...it,
          booking,
          customer,
        };
      })
      .sort((a, b) => new Date(b.ThoiDiemThem).getTime() - new Date(a.ThoiDiemThem).getTime());
  }, [viewStatsService, serviceItems, bookings, customers]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight flex items-center gap-2.5 leading-tight">
            <Package className="w-7 h-7 text-blue-600 shrink-0" />
            QUẢN LÝ DỊCH VỤ
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Danh mục dịch vụ lưu trú, tiện ích gia tăng, phụ thu và trải nghiệm homestay Chicstay
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>THÊM MỚI DỊCH VỤ</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-slate-200">
        {([
          { key: 'catalog', label: 'Danh mục dịch vụ', Icon: Package },
          { key: 'execution', label: 'Theo dõi thực hiện dịch vụ', Icon: ClipboardList },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 -mb-px cursor-pointer transition-colors ${
              activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'execution' && <ServiceExecutionBoard onNavigateToBooking={onNavigateToBooking} />}

      {activeTab === 'catalog' && (<>
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Tổng dịch vụ
            </span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {stats.totalServices}{' '}
              <span className="text-xs font-semibold text-emerald-600">
                ({stats.activeServices} hoạt động)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Doanh thu dịch vụ
            </span>
            <div className="text-lg font-black text-emerald-700 mt-0.5 tabular-nums">
              {formatVND(stats.totalRevenue)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Lượt phát sinh
            </span>
            <div className="text-lg font-black text-purple-900 mt-0.5 tabular-nums">
              {stats.totalOrdersCount}{' '}
              <span className="text-xs font-semibold text-slate-500">lần đặt</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Đặt nhiều nhất
            </span>
            <div className="text-xs font-bold text-slate-900 mt-0.5 truncate" title={stats.topService?.name}>
              {stats.topService ? (
                <>
                  <span className="text-amber-800">{stats.topService.name}</span>
                  <span className="block text-[10px] text-slate-500 font-normal">
                    {stats.topService.qty} lượt sử dụng
                  </span>
                </>
              ) : (
                'Chưa có dữ liệu'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
        <button
          onClick={() => setSelectedGroup('ALL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            selectedGroup === 'ALL'
              ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Tất cả nhóm ({services.length})
        </button>
        {groups.map((grp) => {
          const count = services.filter((s) => s.NhomDichVu === grp).length;
          const isSelected = selectedGroup === grp;
          return (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>{grp}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tra cứu tên dịch vụ, mã DV (D001, D008...), nhóm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:border-blue-500 bg-white shadow-2xs outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:border-blue-500 outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đang hoạt động">Đang hoạt động</option>
            <option value="Ngừng hoạt động">Ngừng hoạt động</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedTiming}
            onChange={(e) => setSelectedTiming(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:border-blue-500 outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả thời điểm áp dụng</option>
            <option value="Cả hai">Cả hai (Pre-stay & In-house)</option>
            <option value="Chỉ Pre-stay">Chỉ Pre-stay (Trước lưu trú)</option>
            <option value="Chỉ In-house">Chỉ In-house (Khi đang ở)</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">MÃ DV</th>
                <th className="py-3 px-4">TÊN DỊCH VỤ</th>
                <th className="py-3 px-4">NHÓM DỊCH VỤ</th>
                <th className="py-3 px-4 text-center">ĐVT</th>
                <th className="py-3 px-4 text-right">ĐƠN GIÁ HIỆN HÀNH</th>
                <th className="py-3 px-4 text-center">THỜI ĐIỂM ÁP DỤNG</th>
                <th className="py-3 px-4 text-center">LƯỢT ĐẶT / DOANH THU</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Không tìm thấy dịch vụ nào phù hợp điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredServices.map((s) => {
                  const isActive = s.TrangThai === 'Đang hoạt động';
                  const usage = stats.usageMap[s.MaDV] || { count: 0, qty: 0, revenue: 0 };
                  const groupStyle = getServiceGroupBadge(s.NhomDichVu);

                  return (
                    <tr key={s.MaDV} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">
                          {s.MaDV}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.TenDichVu}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md border font-semibold text-[11px] ${groupStyle.bg} ${groupStyle.text} ${groupStyle.border}`}
                        >
                          {s.NhomDichVu}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {s.DonViTinh}
                      </td>

                      <td className="py-3 px-4 text-right font-black tabular-nums text-slate-900 text-sm">
                        {formatVND(s.DonGia)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.ThoiDiemApDung === 'Cả hai'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : s.ThoiDiemApDung === 'Chỉ Pre-stay'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {s.ThoiDiemApDung}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="font-bold text-slate-800 tabular-nums">
                          {usage.qty} {s.DonViTinh}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-700 tabular-nums">
                          {formatVND(usage.revenue)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setConfirmToggleService(s)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title="Bấm để đổi trạng thái hoạt động"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          <span>{s.TrangThai}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewStatsService(s)}
                            className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem lịch sử sử dụng dịch vụ trong các đơn"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Cập nhật thông tin dịch vụ"
                          >
                            <Edit2 className="w-4 h-4" />
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

      </>)}

      {/* Modal 1: Thêm dịch vụ mới */}
      <ModalShell
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="THÊM MỚI DỊCH VỤ VÀO DANH MỤC"
        subtitle="Nhập thông tin dịch vụ và biểu phí vào hệ thống homestay"
        icon={<Plus className="w-5 h-5 text-blue-600" />}
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSaveAdd}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
            >
              Lưu Dịch Vụ Mới
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Mã dịch vụ (*):
              </label>
              <input
                type="text"
                required
                placeholder="VD: D013, DV01..."
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs uppercase focus:border-blue-500 outline-hidden"
              />
            </div>

            <div className="col-span-2">
              <label className="font-bold text-slate-800 block mb-1">
                Tên dịch vụ (*):
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Set nướng BBQ sân vườn, Thuê xe máy..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Nhóm dịch vụ:
              </label>
              <select
                value={formGroup}
                onChange={(e) => setFormGroup(e.target.value as NhomDichVu)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white cursor-pointer focus:border-blue-500 outline-hidden"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Đơn vị tính (*):
              </label>
              <input
                type="text"
                required
                placeholder="Lần, Ngày, Suất, Lon, Kg..."
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Đơn giá hiện hành (1.000 ₫ - 10.000.000 ₫) (*):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1000}
                  max={10000000}
                  step={1000}
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:border-blue-500 outline-hidden"
                />
              </div>
              <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                Xem trước: {formatVND(formPrice)} / {formUnit || 'đơn vị'}
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Thời điểm áp dụng:
              </label>
              <select
                value={formTiming}
                onChange={(e) => setFormTiming(e.target.value as ThoiDiemApDung)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white cursor-pointer focus:border-blue-500 outline-hidden"
              >
                <option value="Cả hai">Cả hai giai đoạn (Pre-stay & In-house)</option>
                <option value="Chỉ Pre-stay">Chỉ Pre-stay (Trước lưu trú)</option>
                <option value="Chỉ In-house">Chỉ In-house (Khi đang lưu trú)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 space-y-1">
            <strong className="block font-bold">ℹ Lưu ý quản trị:</strong>
            <p>
              Mã dịch vụ là mã định danh duy nhất (không trùng lặp). Trạng thái khởi tạo mặc định là &quot;Đang hoạt động&quot;. Đơn giá này sẽ được cố định khi thêm vào đơn đặt phòng của khách.
            </p>
          </div>
        </form>
      </ModalShell>

      {/* Modal 2: Cập nhật dịch vụ */}
      {editingService && (
        <ModalShell
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          title={`CẬP NHẬT THÔNG TIN DỊCH VỤ (${editingService.MaDV})`}
          subtitle="Chỉnh sửa thông tin định danh và cập nhật biểu phí mới"
          icon={<Edit2 className="w-5 h-5 text-blue-600" />}
          maxWidth="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
              >
                Lưu Thay Đổi
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã dịch vụ (Khóa):
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editingService.MaDV}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono font-bold text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-slate-800 block mb-1">
                  Tên dịch vụ:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Nhóm dịch vụ:
                </label>
                <select
                  value={formGroup}
                  onChange={(e) => setFormGroup(e.target.value as NhomDichVu)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white cursor-pointer focus:border-blue-500 outline-hidden"
                >
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Đơn vị tính:
                </label>
                <input
                  type="text"
                  required
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Đơn giá mới (&gt; 0):
                </label>
                <input
                  type="number"
                  min={1000}
                  max={10000000}
                  step={1000}
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:border-blue-500 outline-hidden"
                />
                <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                  Xem trước: {formatVND(formPrice)} / {formUnit}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Thời điểm áp dụng:
                </label>
                <select
                  value={formTiming}
                  onChange={(e) => setFormTiming(e.target.value as ThoiDiemApDung)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white cursor-pointer focus:border-blue-500 outline-hidden"
                >
                  <option value="Cả hai">Cả hai</option>
                  <option value="Chỉ Pre-stay">Chỉ Pre-stay</option>
                  <option value="Chỉ In-house">Chỉ In-house</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong>⚠ Lưu ý toàn vẹn dữ liệu:</strong> Thay đổi đơn giá chỉ áp dụng cho các lần phát sinh dịch vụ về sau. Các đơn đã ghi nhận dịch vụ này trước đây giữ nguyên đơn giá chốt cứng tại thời điểm thêm.
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal 3: Xác nhận đổi trạng thái */}
      {confirmToggleService && (
        <ModalShell
          isOpen={!!confirmToggleService}
          onClose={() => setConfirmToggleService(null)}
          title="XÁC NHẬN CHUYỂN TRẠNG THÁI"
          subtitle={`Dịch vụ ${confirmToggleService.MaDV} - ${confirmToggleService.TenDichVu}`}
          icon={
            confirmToggleService.TrangThai === 'Đang hoạt động' ? (
              <XCircle className="w-5 h-5 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )
          }
          maxWidth="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirmToggleService(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer transition-all ${
                  confirmToggleService.TrangThai === 'Đang hoạt động'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Xác nhận chuyển sang{' '}
                {confirmToggleService.TrangThai === 'Đang hoạt động'
                  ? 'Ngừng hoạt động'
                  : 'Đang hoạt động'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed">
              Bạn có chắc chắn muốn chuyển trạng thái dịch vụ{' '}
              <strong className="text-slate-900">{confirmToggleService.TenDichVu}</strong> sang{' '}
              <strong
                className={
                  confirmToggleService.TrangThai === 'Đang hoạt động'
                    ? 'text-rose-600 font-bold'
                    : 'text-emerald-600 font-bold'
                }
              >
                {confirmToggleService.TrangThai === 'Đang hoạt động'
                  ? 'Ngừng hoạt động'
                  : 'Đang hoạt động'}
              </strong>
              ?
            </p>

            {confirmToggleService.TrangThai === 'Đang hoạt động' ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                Khi &quot;Ngừng hoạt động&quot;, nhân viên sẽ <strong>không thể thêm dịch vụ này vào bất kỳ đơn đặt phòng mới nào</strong>. Các đơn cũ đã ghi nhận dịch vụ này vẫn được lưu giữ trọn vẹn.
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                Khi &quot;Đang hoạt động&quot;, dịch vụ sẽ hiển thị ngay trong danh sách lựa chọn khi thêm dịch vụ cho khách.
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* Modal 4: Lịch sử sử dụng dịch vụ */}
      {viewStatsService && (
        <ModalShell
          isOpen={!!viewStatsService}
          onClose={() => setViewStatsService(null)}
          title={`LỊCH SỬ SỬ DỤNG - ${viewStatsService.TenDichVu}`}
          subtitle={`Mã: ${viewStatsService.MaDV} · Nhóm: ${viewStatsService.NhomDichVu} · Biểu phí hiện hành: ${formatVND(viewStatsService.DonGia)}/${viewStatsService.DonViTinh}`}
          icon={<BarChart2 className="w-5 h-5 text-purple-600" />}
          maxWidth="2xl"
          footer={
            <button
              type="button"
              onClick={() => setViewStatsService(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
            >
              Đóng cửa sổ
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng lượt gọi</span>
                <span className="text-base font-black text-slate-900">{currentServiceUsages.length} đơn</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng số lượng</span>
                <span className="text-base font-black text-purple-700">
                  {currentServiceUsages.filter(isServiceBillable).reduce((s, it) => s + it.SoLuong, 0)} {viewStatsService.DonViTinh}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng doanh thu</span>
                <span className="text-base font-black text-emerald-700 tabular-nums">
                  {formatVND(currentServiceUsages.filter(isServiceBillable).reduce((s, it) => s + it.ThanhTien, 0))}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Danh sách các đơn đã sử dụng dịch vụ này:
              </h4>

              {currentServiceUsages.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có đơn đặt phòng nào phát sinh dịch vụ này.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">MÃ ĐƠN</th>
                        <th className="py-2.5 px-3">KHÁCH HÀNG / PHÒNG</th>
                        <th className="py-2.5 px-3 text-center">SỐ LƯỢNG</th>
                        <th className="py-2.5 px-3 text-right">ĐƠN GIÁ CHỐT</th>
                        <th className="py-2.5 px-3 text-right">THÀNH TIỀN</th>
                        <th className="py-2.5 px-3 text-center">THỜI ĐIỂM GHI NHẬN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentServiceUsages.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                            {onNavigateToBooking ? (
                              <button
                                onClick={() => {
                                  setViewStatsService(null);
                                  onNavigateToBooking(it.MaDon);
                                }}
                                className="hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {it.MaDon}
                                <ExternalLink className="w-3 h-3 text-blue-500" />
                              </button>
                            ) : (
                              it.MaDon
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">
                              {it.customer?.HoTen || 'Khách lẻ'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Phòng {it.booking?.MaPhong || '--'} · {it.booking?.TrangThaiDon}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {it.SoLuong} {viewStatsService.DonViTinh}
                            <div className="mt-1"><ServiceStatusBadge status={it.TrangThaiThucHien} /></div>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                            {formatVND(it.DonGiaTaiThoiDiem)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black tabular-nums text-slate-900">
                            {formatVND(it.ThanhTien)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-[10px] text-slate-500">
                            {formatDateTime(it.ThoiDiemThem)}
                            <span className="block text-slate-400">({it.GiaiDoan || 'In-house'})</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
