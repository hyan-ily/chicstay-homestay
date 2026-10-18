import React, { useState, useRef } from 'react';
import {
  CalendarCheck2,
  Search,
  Plus,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  LogOut as CheckOutIcon,
  LogIn as CheckInIcon,
  CreditCard,
  QrCode,
  AlertTriangle,
  User,
  BedDouble,
  DollarSign,
  FileText,
  Trash2,
  Edit2,
  Calendar,
  X,
  Phone,
  Printer,
  RotateCcw,
  Table as TableIcon,
  AlertCircle
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { useToast } from '../context/ToastContext';
import { DonDatPhong, TrangThaiDon, PhuongThucThanhToan } from '../types';
import { ModalShell } from './ModalShell';
import { BookingCalendarView } from './BookingCalendarView';
import {
  formatVND,
  formatDate,
  formatDateTime,
  calculateNights,
  calculateDeposit,
  isBookingOverdue12Hours,
  isEligibleForRefund48Hours,
  generateVietQRUrl,
  canEditBookingServices,
  getServiceLockReason,
  isServiceAllowedAtStatus,
  getServiceMaxQuantity,
  getServiceRemainingQuantity,
  getServiceLimitDescription,
  validateMoneyAmount,
  removeVietnameseTones,
  useLockScroll,
} from '../utils/helpers';

interface BookingsViewProps {
  initialStatusFilter?: string;
  initialActiveBookingId?: string | null;
  onClearActiveBooking?: () => void;
  onOpenCreateBookingModal: (initialData?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    roomCode?: string;
  }) => void;
  onOpenBookingDetail: (maDon: string) => void;
  onPrintInvoice: (maDon: string) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  initialStatusFilter,
  initialActiveBookingId,
  onClearActiveBooking,
  onOpenCreateBookingModal,
  onOpenBookingDetail,
  onPrintInvoice,
}) => {
  const {
    bookings,
    rooms,
    customers,
    services,
    serviceItems,
    bankConfig,
    confirmDeposit,
    updateBooking,
    cancelBooking,
    processRefund,
    checkInBooking,
    noShowBooking,
    checkOutBooking,
    addServiceToBooking,
    updateServiceItemQuantity,
    removeServiceFromBooking,
    recalcBookingTotals,
    checkRoomAvailability,
  } = useHomestay();
  const { showToast } = useToast();

  const [mainViewMode, setMainViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');

  // Active Modals
  const [activeBookingId, setActiveBookingId] = useState<string | null>(initialActiveBookingId || null);

  React.useEffect(() => {
    if (initialActiveBookingId) {
      setActiveBookingId(initialActiveBookingId);
    }
  }, [initialActiveBookingId]);

  const activeBookingForDetail: DonDatPhong | null = activeBookingId
    ? bookings.find((b) => b.MaDon === activeBookingId) ?? null
    : null;
  const setActiveBookingForDetail = (b: DonDatPhong | null) => {
    setActiveBookingId(b ? b.MaDon : null);
    if (!b && onClearActiveBooking) {
      onClearActiveBooking();
    }
  };

  // Cập nhật đơn đặt phòng (Hỗ trợ Chờ đặt cọc / Đã xác nhận / Đã check-in)
  const [updateModalBooking, setUpdateModalBooking] = useState<DonDatPhong | null>(null);
  const [updateRoomCode, setUpdateRoomCode] = useState('');
  const [updateCheckIn, setUpdateCheckIn] = useState('');
  const [updateCheckOut, setUpdateCheckOut] = useState('');
  const [updateGuests, setUpdateGuests] = useState(1);
  const [updateSpecialReq, setUpdateSpecialReq] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [showAddServiceInUpdate, setShowAddServiceInUpdate] = useState(false);
  const [updateServiceCode, setUpdateServiceCode] = useState('');
  const [updateServiceQty, setUpdateServiceQty] = useState(1);
  const [updateServiceNote, setUpdateServiceNote] = useState('');

  // Track service changes in update modal session
  const initialServicesSnapshot = useRef<{ id: string; soLuong: number; maDV: string }[]>([]);
  const hasServiceChangedRef = useRef(false);

  const handleOpenUpdateModal = (b: DonDatPhong) => {
    setUpdateModalBooking(b);
    setUpdateRoomCode(b.MaPhong);
    setUpdateCheckIn(b.NgayNhanPhong.slice(0, 10));
    setUpdateCheckOut(b.NgayTraPhong.slice(0, 10));
    setUpdateGuests(b.SoKhach);
    setUpdateSpecialReq(b.YeuCauDacBiet || '');
    setUpdateError('');
    setShowAddServiceInUpdate(false);
    setUpdateServiceCode('');
    setUpdateServiceQty(1);
    setUpdateServiceNote('');

    // Snapshot services for comparison
    initialServicesSnapshot.current = serviceItems
      .filter((it) => it.MaDon === b.MaDon)
      .map((it) => ({ id: it.id, soLuong: it.SoLuong, maDV: it.MaDV }));
    hasServiceChangedRef.current = false;
  };

  const [depositModalBooking, setDepositModalBooking] = useState<DonDatPhong | null>(null);
  const [depositMethod, setDepositMethod] = useState<PhuongThucThanhToan>('VietQR');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositTxnCode, setDepositTxnCode] = useState('');
  const [depositError, setDepositError] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Check-in modal
  const [checkInModalBooking, setCheckInModalBooking] = useState<DonDatPhong | null>(null);
  const [applyEarlyCheckInFee, setApplyEarlyCheckInFee] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  // Check-out modal
  const [checkOutModalBooking, setCheckOutModalBooking] = useState<DonDatPhong | null>(null);
  const [applyLateCheckOutFee, setApplyLateCheckOutFee] = useState(false);
  const [checkOutPaymentAmount, setCheckOutPaymentAmount] = useState<number>(0);
  const [checkOutMethod, setCheckOutMethod] = useState<PhuongThucThanhToan>('VietQR');
  const [checkOutTxnCode, setCheckOutTxnCode] = useState('');
  const [checkOutError, setCheckOutError] = useState('');
  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);

  // Cancel modal
  const [cancelModalBooking, setCancelModalBooking] = useState<DonDatPhong | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Refund modal
  const [refundModalBooking, setRefundModalBooking] = useState<DonDatPhong | null>(null);
  const [refundTxnCode, setRefundTxnCode] = useState('');

  // Add Service Modal (from detail modal)
  const [addServiceModalBooking, setAddServiceModalBooking] = useState<DonDatPhong | null>(null);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>('');
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);
  const [serviceNote, setServiceNote] = useState('');

  // Action status notification banner
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setActionAlert({ type, message });
    setTimeout(() => setActionAlert(null), 6000);
  };

  const isAnyModalOpenInBookings = Boolean(
    activeBookingId ||
    updateModalBooking ||
    depositModalBooking ||
    checkInModalBooking ||
    checkOutModalBooking ||
    cancelModalBooking ||
    refundModalBooking ||
    addServiceModalBooking
  );

  useLockScroll(isAnyModalOpenInBookings);

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.TrangThaiDon !== statusFilter) return false;
    if (selectedRoomFilter !== 'ALL' && b.MaPhong !== selectedRoomFilter) return false;

    if (searchQuery.trim()) {
      const q = removeVietnameseTones(searchQuery);
      const customer = customers.find((c) => c.MaKH === b.MaKH);
      const matchId = removeVietnameseTones(b.MaDon).includes(q);
      const matchRoom = removeVietnameseTones(b.MaPhong).includes(q);
      const matchName = customer ? removeVietnameseTones(customer.HoTen).includes(q) : false;
      const matchPhone = customer?.SoDienThoai ? customer.SoDienThoai.includes(searchQuery.trim()) : false;
      if (!matchId && !matchRoom && !matchName && !matchPhone) return false;
    }

    return true;
  });

  // Open Deposit Modal with proper defaults
  const handleOpenDepositModal = (booking: DonDatPhong) => {
    setDepositModalBooking(booking);
    const min = Math.max(0, booking.TienCocYeuCau - booking.DaThu);
    setDepositAmount(min);
    setDepositMethod('VietQR');
    setDepositTxnCode('');
    setDepositError('');
  };

  const handleConfirmDeposit = () => {
    if (!depositModalBooking || isSubmittingDeposit) return;
    const min = Math.max(0, depositModalBooking.TienCocYeuCau - depositModalBooking.DaThu);
    const max = Math.max(0, depositModalBooking.TongTien - depositModalBooking.DaThu);

    const check = validateMoneyAmount(depositAmount, {
      min,
      max,
      allowZero: min === 0,
      fieldName: 'Số tiền cọc thực nhận',
    });

    if (!check.valid) {
      setDepositError(check.error!);
      return;
    }

    setDepositError('');
    setIsSubmittingDeposit(true);
    const res = confirmDeposit(
      depositModalBooking.MaDon,
      depositMethod,
      check.amount,
      depositTxnCode
    );
    setIsSubmittingDeposit(false);

    if (res.success) {
      showAlert('success', res.message);
      setDepositModalBooking(null);
      if (activeBookingForDetail?.MaDon === depositModalBooking.MaDon) {
        setActiveBookingForDetail(null);
      }
    } else {
      setDepositError(res.message);
      showAlert('error', res.message);
    }
  };

  // Open Check-in Modal
  const handleOpenCheckInModal = (booking: DonDatPhong) => {
    setCheckInModalBooking(booking);
    setApplyEarlyCheckInFee(false);
  };

  // Check-in
  const handleConfirmCheckIn = () => {
    if (!checkInModalBooking || isSubmittingCheckIn) return;
    setIsSubmittingCheckIn(true);
    const res = checkInBooking(checkInModalBooking.MaDon, applyEarlyCheckInFee);
    setIsSubmittingCheckIn(false);
    if (res.success) {
      showAlert('success', res.message);
      setCheckInModalBooking(null);
      setActiveBookingForDetail(null);
    } else {
      showAlert('error', res.message);
    }
  };

  const handleConfirmNoShow = (maDon: string) => {
    if (!window.confirm('Xác nhận khách không đến nhận phòng (No-show)? Tiền cọc sẽ được giữ lại theo chính sách homestay.')) {
      return;
    }
    const res = noShowBooking(maDon);
    if (res.success) {
      showAlert('success', res.message);
      setCheckInModalBooking(null);
      setActiveBookingForDetail(null);
    } else {
      showAlert('error', res.message);
    }
  };

  // Open Check-out Modal
  const handleOpenCheckOutModal = (booking: DonDatPhong) => {
    setCheckOutModalBooking(booking);
    setApplyLateCheckOutFee(false);
    const rem = Math.max(0, booking.TongTien - booking.DaThu);
    setCheckOutPaymentAmount(rem);
    setCheckOutMethod('VietQR');
    setCheckOutTxnCode('');
    setCheckOutError('');
  };

  const handleToggleLateCheckOut = (checked: boolean) => {
    setApplyLateCheckOutFee(checked);
    if (checkOutModalBooking) {
      const alreadyHasD009 = serviceItems.some(
        (it) => it.MaDon === checkOutModalBooking.MaDon && it.MaDV === 'D009' && it.SoLuong > 0
      );
      const extra = !alreadyHasD009 && checked ? 150000 : 0;
      const nextRemaining = Math.max(0, checkOutModalBooking.TongTien + extra - checkOutModalBooking.DaThu);
      setCheckOutPaymentAmount(nextRemaining);
      setCheckOutError('');
    }
  };

  // Check-out
  const handleConfirmCheckOut = () => {
    if (!checkOutModalBooking || isSubmittingCheckOut) return;
    const alreadyHasD009 = serviceItems.some(
      (it) => it.MaDon === checkOutModalBooking.MaDon && it.MaDV === 'D009' && it.SoLuong > 0
    );
    const extra = !alreadyHasD009 && applyLateCheckOutFee ? 150000 : 0;
    const soConPhaiThu = Math.max(0, checkOutModalBooking.TongTien + extra - checkOutModalBooking.DaThu);

    if (soConPhaiThu > 0) {
      const check = validateMoneyAmount(checkOutPaymentAmount, {
        min: soConPhaiThu,
        max: soConPhaiThu,
        fieldName: 'Số tiền thu tất toán',
      });
      if (!check.valid) {
        setCheckOutError(`Số tiền nhập phải bằng đúng số còn phải thu (${formatVND(soConPhaiThu)}) để hoàn tất.`);
        return;
      }
    } else {
      if (checkOutPaymentAmount > 0) {
        setCheckOutError('Đơn đặt phòng không còn nợ, không ghi nhận thu vượt số còn nợ.');
        return;
      }
    }

    setCheckOutError('');
    setIsSubmittingCheckOut(true);
    const res = checkOutBooking(
      checkOutModalBooking.MaDon,
      checkOutMethod,
      checkOutTxnCode,
      !alreadyHasD009 && applyLateCheckOutFee,
      soConPhaiThu > 0 ? Number(checkOutPaymentAmount) : 0
    );
    setIsSubmittingCheckOut(false);

    if (res.success) {
      showAlert('success', res.message);
      setCheckOutModalBooking(null);
      setActiveBookingForDetail(null);
      if (res.invoice) {
        onPrintInvoice(res.invoice.MaDon);
      }
    } else {
      setCheckOutError(res.message);
      showAlert('error', res.message);
    }
  };

  // Cancel
  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;
    const res = cancelBooking(cancelModalBooking.MaDon, cancelReason);
    if (res.success) {
      showAlert('success', res.message);
      setCancelModalBooking(null);
      setActiveBookingForDetail(null);
    } else {
      showAlert('error', res.message);
    }
  };

  // Refund
  const handleConfirmRefund = () => {
    if (!refundModalBooking) return;
    const res = processRefund(refundModalBooking.MaDon, refundTxnCode);
    if (res.success) {
      showAlert('success', res.message);
      setRefundModalBooking(null);
      setActiveBookingForDetail(null);
    } else {
      showAlert('error', res.message);
    }
  };

  // Xóa dịch vụ khỏi đơn: thông báo thành công mỗi lần bấm
  const handleRemoveService = (itemId: string, tenDichVu: string) => {
    if (!window.confirm(`Xóa dịch vụ "${tenDichVu}" khỏi đơn? Tổng tiền đơn sẽ được tính lại.`)) return;
    const res = removeServiceFromBooking(itemId);
    if (res.success) {
      hasServiceChangedRef.current = true;
      showToast(`Đã xóa dịch vụ "${tenDichVu}" khỏi đơn thành công!`, 'success');
      showAlert('success', res.message);
    } else {
      showToast(res.message, 'error');
      showAlert('error', res.message);
    }
  };

  // Điều chỉnh số lượng dịch vụ (+/-): thông báo thành công mỗi lần bấm
  const handleChangeServiceQty = (itemId: string, qty: number, tenDichVu = 'Dịch vụ') => {
    const res = updateServiceItemQuantity(itemId, qty);
    if (res.success) {
      hasServiceChangedRef.current = true;
      showToast(`Đã cập nhật số lượng "${tenDichVu}" thành ${qty} thành công!`, 'success');
    } else {
      showToast(res.message, 'error');
      showAlert('error', res.message);
    }
  };

  // Nút Xác nhận thêm dịch vụ: giữ nguyên, thêm dịch vụ và báo thành công
  const handleAddServiceInUpdate = (maDon: string) => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking || (booking.TrangThaiDon !== 'Đã xác nhận' && booking.TrangThaiDon !== 'Đã check-in')) {
      showToast('Khi cập nhật đơn ở trạng thái Chờ đặt cọc, không cho phép thêm dịch vụ! Chỉ cho phép khi đơn ở trạng thái Đã xác nhận hoặc Đã check-in.', 'error');
      return;
    }
    if (!updateServiceCode) {
      showToast('Vui lòng chọn một dịch vụ từ danh sách!', 'error');
      return;
    }
    const res = addServiceToBooking(
      maDon,
      updateServiceCode,
      updateServiceQty,
      updateServiceNote
    );
    if (res.success) {
      hasServiceChangedRef.current = true;
      showToast(res.message, 'success');
      showAlert('success', res.message);
      setUpdateServiceCode('');
      setUpdateServiceQty(1);
      setUpdateServiceNote('');
      setShowAddServiceInUpdate(false);
    } else {
      showToast(res.message, 'error');
      showAlert('error', res.message);
    }
  };

  // Nút “Lưu thay đổi đơn”: dùng được cho dịch vụ
  // - Nếu ô thêm dịch vụ đang mở và đã chọn dịch vụ nhưng chưa bấm “Xác nhận thêm dịch vụ”, nút Lưu sẽ thêm luôn dịch vụ đó.
  // - Nếu bạn đã đổi số lượng bằng +/-, hoặc thêm hay xóa dịch vụ, nút hiện thông báo thành công, tính lại tổng tiền rồi đóng modal.
  // - Chỉ báo “Không có thay đổi để cập nhật” khi thật sự không có gì đổi.
  // - Đơn Đã check-in: nút Lưu không còn báo lỗi khi chỉ đổi dịch vụ. Nếu sửa phòng, ngày hoặc số khách ở đơn Đã check-in, hệ thống vẫn từ chối như cũ.
  const handleConfirmUpdateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateModalBooking) return;
    setUpdateError('');

    const currentBooking = bookings.find((b) => b.MaDon === updateModalBooking.MaDon) || updateModalBooking;
    let pendingServiceAdded = false;

    // 1. Tự động thêm dịch vụ nếu ô thêm dịch vụ đang mở và đã chọn dịch vụ
    if (showAddServiceInUpdate && updateServiceCode) {
      const addRes = addServiceToBooking(
        currentBooking.MaDon,
        updateServiceCode,
        updateServiceQty,
        updateServiceNote
      );
      if (!addRes.success) {
        setUpdateError(addRes.message);
        showToast(addRes.message, 'error');
        return;
      }
      pendingServiceAdded = true;
      hasServiceChangedRef.current = true;
      setUpdateServiceCode('');
      setUpdateServiceQty(1);
      setUpdateServiceNote('');
      setShowAddServiceInUpdate(false);
    }

    // 2. Kiểm tra thay đổi các trường đặt phòng
    const isRoomChanged = updateRoomCode !== currentBooking.MaPhong;
    const isCheckInChanged = updateCheckIn !== currentBooking.NgayNhanPhong.slice(0, 10);
    const isCheckOutChanged = updateCheckOut !== currentBooking.NgayTraPhong.slice(0, 10);
    const isGuestsChanged = updateGuests !== currentBooking.SoKhach;
    const isReqChanged = (updateSpecialReq ?? '') !== (currentBooking.YeuCauDacBiet ?? '');

    // Kiểm tra xem dịch vụ có thực sự thay đổi so với lúc mở modal không
    const currentServicesNow = serviceItems
      .filter((it) => it.MaDon === currentBooking.MaDon)
      .map((it) => ({ id: it.id, soLuong: it.SoLuong, maDV: it.MaDV }));

    const isServicesDiffFromInitial =
      pendingServiceAdded ||
      hasServiceChangedRef.current ||
      currentServicesNow.length !== initialServicesSnapshot.current.length ||
      currentServicesNow.some((item) => {
        const init = initialServicesSnapshot.current.find((s) => s.id === item.id);
        return !init || init.soLuong !== item.soLuong;
      });

    // 3. Xử lý theo từng trạng thái đơn:
    // Đơn ĐÃ CHECK-IN:
    if (currentBooking.TrangThaiDon === 'Đã check-in') {
      if (isRoomChanged || isCheckInChanged || isCheckOutChanged || isGuestsChanged) {
        const msg = 'Đơn đã check-in không được phép thay đổi phòng, ngày hoặc số khách! Chỉ cho phép cập nhật dịch vụ.';
        setUpdateError(msg);
        showToast(msg, 'error');
        return;
      }

      if (isServicesDiffFromInitial || isReqChanged) {
        recalcBookingTotals(currentBooking.MaDon);
        if (isReqChanged) {
          updateBooking(currentBooking.MaDon, { yeuCauDacBiet: updateSpecialReq });
        }
        showToast('Lưu thay đổi đơn thành công!', 'success');
        showAlert('success', 'Lưu thay đổi đơn thành công!');
        setUpdateModalBooking(null);
        return;
      }

      // Thật sự không có gì đổi
      showToast('Không có thay đổi để cập nhật', 'info');
      return;
    }

    // Đơn CHỜ ĐẶT CỌC hoặc ĐÃ XÁC NHẬN:
    const isBookingFieldsChanged = isRoomChanged || isCheckInChanged || isCheckOutChanged || isGuestsChanged || isReqChanged;

    if (isBookingFieldsChanged) {
      if (updateCheckIn >= updateCheckOut) {
        const msg = 'Không đủ điều kiện thay đổi: Ngày nhận phòng phải trước ngày trả phòng ít nhất 1 đêm.';
        setUpdateError(msg);
        showToast(msg, 'error');
        return;
      }

      if (updateGuests < 1) {
        const msg = 'Không đủ điều kiện thay đổi: Số lượng khách phải tối thiểu là 1 người.';
        setUpdateError(msg);
        showToast(msg, 'error');
        return;
      }

      const room = rooms.find((r) => r.MaPhong === updateRoomCode);
      if (!room) {
        const msg = `Không đủ điều kiện thay đổi: Không tìm thấy phòng ${updateRoomCode}.`;
        setUpdateError(msg);
        showToast(msg, 'error');
        return;
      }

      if (updateGuests > room.SucChua) {
        const msg = `Không đủ điều kiện thay đổi: Phòng ${room.TenPhong} (${updateRoomCode}) có sức chứa tối đa ${room.SucChua} khách, không đủ cho ${updateGuests} khách.`;
        setUpdateError(msg);
        showToast(msg, 'error');
        return;
      }

      if (isRoomChanged || isCheckInChanged || isCheckOutChanged) {
        const isAvail = checkRoomAvailability(updateRoomCode, updateCheckIn, updateCheckOut, currentBooking.MaDon);
        if (!isAvail) {
          const msg = `Không đủ điều kiện thay đổi: Phòng ${room.TenPhong} (${updateRoomCode}) không còn trống trong khoảng thời gian từ ${formatDate(updateCheckIn)} đến ${formatDate(updateCheckOut)}!`;
          setUpdateError(msg);
          showToast(msg, 'error');
          return;
        }
      }

      const res = updateBooking(currentBooking.MaDon, {
        maPhong: updateRoomCode,
        ngayNhanPhong: updateCheckIn,
        ngayTraPhong: updateCheckOut,
        soKhach: updateGuests,
        yeuCauDacBiet: updateSpecialReq,
      });

      if (res.success) {
        recalcBookingTotals(currentBooking.MaDon);
        showToast('Lưu thay đổi đơn thành công!', 'success');
        showAlert('success', res.message);
        setUpdateModalBooking(null);
      } else {
        setUpdateError(res.message);
        showToast(res.message, 'error');
      }
    } else if (isServicesDiffFromInitial) {
      recalcBookingTotals(currentBooking.MaDon);
      showToast('Lưu thay đổi dịch vụ trong đơn thành công!', 'success');
      showAlert('success', 'Đã cập nhật dịch vụ và tính lại tổng tiền đơn thành công!');
      setUpdateModalBooking(null);
    } else {
      showToast('Không có thay đổi để cập nhật', 'info');
    }
  };

  // Add Service (from detail modal)
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addServiceModalBooking || !selectedServiceCode) return;
    const res = addServiceToBooking(
      addServiceModalBooking.MaDon,
      selectedServiceCode,
      serviceQuantity,
      serviceNote
    );
    if (res.success) {
      showToast(res.message, 'success');
      showAlert('success', res.message);
      setAddServiceModalBooking(null);
      setSelectedServiceCode('');
      setServiceQuantity(1);
      setServiceNote('');
    } else {
      showToast(res.message, 'error');
      showAlert('error', res.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Notification Alert */}
      {actionAlert && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xs transition-all ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5 leading-tight">
            <CalendarCheck2 className="w-7 h-7 text-blue-600 shrink-0" />
            <span>QUẢN LÝ ĐƠN ĐẶT PHÒNG</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi vòng đời đơn lưu trú: Chờ đặt cọc → Đã xác nhận → Đã check-in → Đã hoàn thành / Hủy
          </p>
        </div>

        <div className="flex flex-row items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => {
              const eligible = bookings.filter(
                (b) =>
                  b.TrangThaiDon === 'Chờ đặt cọc' ||
                  b.TrangThaiDon === 'Đã xác nhận' ||
                  b.TrangThaiDon === 'Đã check-in'
              );
              if (eligible.length > 0) {
                handleOpenUpdateModal(eligible[0]);
              } else {
                showToast('Không có đơn nào phù hợp để chỉnh sửa.', 'info');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs tracking-wide shadow-xs flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
            title="Mở bảng cập nhật thông tin đơn đặt phòng và dịch vụ"
          >
            <Edit2 className="w-4 h-4 shrink-0" />
            <span>CẬP NHẬT ĐƠN ĐẶT PHÒNG</span>
          </button>

          <button
            onClick={() => onOpenCreateBookingModal()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs tracking-wide shadow-xs flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>TẠO ĐƠN ĐẶT PHÒNG MỚI</span>
          </button>
        </div>
      </div>

      {/* View Switcher: Table List vs Calendar Schedule */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setMainViewMode('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainViewMode === 'list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>DANH SÁCH BẢNG ({bookings.length})</span>
          </button>
          <button
            onClick={() => setMainViewMode('calendar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainViewMode === 'calendar'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>LỊCH ĐẶT PHÒNG (TUẦN / THÁNG)</span>
          </button>
        </div>

        <div className="text-xs text-slate-500">
          {mainViewMode === 'calendar' ? (
            <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
              <CalendarCheck2 className="w-4 h-4 text-blue-600" />
              Chế độ Lịch: Sơ đồ phòng trực quan, xem theo tuần & tháng
            </span>
          ) : (
            <span className="text-slate-500">
              Chế độ Bảng: Danh sách chi tiết chuẩn quản trị ERP
            </span>
          )}
        </div>
      </div>

      {mainViewMode === 'calendar' ? (
        <BookingCalendarView
          bookings={bookings}
          rooms={rooms}
          customers={customers}
          onOpenBookingDetail={(maDon) => setActiveBookingId(maDon)}
          onOpenCreateBookingModal={onOpenCreateBookingModal}
          onOpenUpdateModal={handleOpenUpdateModal}
          onOpenDepositModal={handleOpenDepositModal}
          onOpenCheckInModal={handleOpenCheckInModal}
          onOpenCheckOutModal={handleOpenCheckOutModal}
          onPrintInvoice={onPrintInvoice}
        />
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            {[
              { key: 'ALL', label: 'Tất cả đơn', count: bookings.length },
              { key: 'Chờ đặt cọc', label: 'Chờ đặt cọc', count: bookings.filter((b) => b.TrangThaiDon === 'Chờ đặt cọc').length },
              { key: 'Đã xác nhận', label: 'Đã xác nhận', count: bookings.filter((b) => b.TrangThaiDon === 'Đã xác nhận').length },
              { key: 'Đã check-in', label: 'Đã check-in', count: bookings.filter((b) => b.TrangThaiDon === 'Đã check-in').length },
              { key: 'Đã hoàn thành', label: 'Đã hoàn thành', count: bookings.filter((b) => b.TrangThaiDon === 'Đã hoàn thành').length },
              { key: 'Đã hủy', label: 'Đã hủy', count: bookings.filter((b) => b.TrangThaiDon === 'Đã hủy').length },
              { key: 'No-show', label: 'No-show', count: bookings.filter((b) => b.TrangThaiDon === 'No-show').length },
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

          {/* Search Bar & Room Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm theo Mã đơn (DP...), Tên khách, Số điện thoại hoặc Số phòng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white shadow-xs outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:border-blue-500 outline-hidden cursor-pointer"
              >
                <option value="ALL">Lọc theo tất cả các phòng</option>
                {rooms.map((r) => (
                  <option key={r.MaPhong} value={r.MaPhong}>
                    {r.MaPhong} - {r.TenPhong}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">MÃ ĐƠN</th>
                    <th className="py-3 px-4">KHÁCH HÀNG</th>
                    <th className="py-3 px-4">PHÒNG</th>
                    <th className="py-3 px-4">LƯU TRÚ</th>
                    <th className="py-3 px-4 text-right">TIỀN PHÒNG</th>
                    <th className="py-3 px-4 text-right">DỊCH VỤ</th>
                    <th className="py-3 px-4 text-right">TỔNG TIỀN</th>
                    <th className="py-3 px-4 text-right">ĐÃ THU / CÒN LẠI</th>
                    <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                    <th className="py-3 px-4 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <CalendarCheck2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Không tìm thấy đơn đặt phòng nào phù hợp điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const customer = customers.find((c) => c.MaKH === b.MaKH);
                      const room = rooms.find((r) => r.MaPhong === b.MaPhong);
                      const isOverdue = b.TrangThaiDon === 'Chờ đặt cọc' && isBookingOverdue12Hours(b.ThoiGianTaoDon);
                      const refundEligible = b.TrangThaiDon === 'Đã hủy' && isEligibleForRefund48Hours(b.NgayNhanPhong) && b.DaThu > 0;

                      let statusBadge = 'bg-slate-100 text-slate-700';
                      if (b.TrangThaiDon === 'Chờ đặt cọc') {
                        statusBadge = isOverdue
                          ? 'bg-rose-100 text-rose-800 font-bold'
                          : 'bg-amber-100 text-amber-800 font-bold';
                      } else if (b.TrangThaiDon === 'Đã xác nhận') {
                        statusBadge = 'bg-blue-100 text-blue-800 font-bold';
                      } else if (b.TrangThaiDon === 'Đã check-in') {
                        statusBadge = 'bg-purple-100 text-purple-800 font-bold';
                      } else if (b.TrangThaiDon === 'Đã hoàn thành') {
                        statusBadge = 'bg-emerald-100 text-emerald-800 font-bold';
                      } else if (b.TrangThaiDon === 'Đã hủy') {
                        statusBadge = 'bg-rose-100 text-rose-800 font-bold';
                      } else if (b.TrangThaiDon === 'No-show') {
                        statusBadge = 'bg-slate-200 text-slate-800 font-bold';
                      }

                      return (
                        <tr
                          key={b.MaDon}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => setActiveBookingForDetail(b)}
                        >
                          {/* Mã Đơn */}
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">
                            {b.MaDon}
                            {isOverdue && (
                              <span className="block text-[10px] text-red-600 font-sans font-bold">
                                ⚠ Quá hạn cọc 12h
                              </span>
                            )}
                          </td>

                          {/* Khách hàng */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{customer?.HoTen || 'Khách lẻ'}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 inline" /> {customer?.SoDienThoai || '--'}
                            </div>
                          </td>

                          {/* Phòng */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-sm">
                              {b.MaPhong}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]">
                              {room?.LoaiPhong}
                            </div>
                          </td>

                          {/* Lưu trú */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">
                              {formatDate(b.NgayNhanPhong)} → {formatDate(b.NgayTraPhong)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {b.SoDem} đêm · {b.SoKhach} khách
                            </div>
                          </td>

                          {/* Tiền phòng */}
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700 font-medium">
                            {formatVND(b.TienPhong)}
                          </td>

                          {/* Dịch vụ */}
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700 font-medium">
                            {formatVND(b.TienDichVu)}
                          </td>

                          {/* Tổng tiền */}
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                            {formatVND(b.TongTien)}
                          </td>

                          {/* Đã thu / Còn lại */}
                          <td className="py-3 px-4 text-right tabular-nums">
                            <div className="text-emerald-700 font-bold">{formatVND(b.DaThu)}</div>
                            <div className="text-[11px] text-slate-400">
                              Còn lại: <strong className="text-rose-600">{formatVND(b.ConLai)}</strong>
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] ${statusBadge}`}>
                              {b.TrangThaiDon}
                            </span>
                            {b.TrangThaiThanhToan && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {b.TrangThaiThanhToan}
                              </div>
                            )}
                          </td>

                          {/* Contextual Action Buttons */}
                          <td
                            className="py-3 px-4 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              {(b.TrangThaiDon === 'Chờ đặt cọc' ||
                                b.TrangThaiDon === 'Đã xác nhận' ||
                                b.TrangThaiDon === 'Đã check-in') && (
                                <button
                                  onClick={() => handleOpenUpdateModal(b)}
                                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Cập nhật thông tin đơn đặt phòng và dịch vụ"
                                >
                                  <Edit2 className="w-3 h-3 text-blue-600" /> Cập nhật
                                </button>
                              )}

                              {b.TrangThaiDon === 'Chờ đặt cọc' && (
                                <button
                                  onClick={() => handleOpenDepositModal(b)}
                                  className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Ghi nhận đặt cọc 30%"
                                >
                                  <CreditCard className="w-3 h-3" /> Thu cọc
                                </button>
                              )}

                              {b.TrangThaiDon === 'Đã xác nhận' && (
                                <button
                                  onClick={() => handleOpenCheckInModal(b)}
                                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Nhận phòng cho khách"
                                >
                                  <CheckInIcon className="w-3 h-3" /> Check-in
                                </button>
                              )}

                              {b.TrangThaiDon === 'Đã check-in' && (
                                <button
                                  onClick={() => handleOpenCheckOutModal(b)}
                                  className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Tất toán và trả phòng"
                                >
                                  <CheckOutIcon className="w-3 h-3" /> Check-out
                                </button>
                              )}

                              {refundEligible && b.TrangThaiThanhToan !== 'Đã hoàn tiền' && (
                                <button
                                  onClick={() => setRefundModalBooking(b)}
                                  className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Xử lý hoàn cọc theo chính sách"
                                >
                                  <RotateCcw className="w-3 h-3" /> Hoàn cọc
                                </button>
                              )}

                              {b.TrangThaiDon === 'Đã hoàn thành' && (
                                <button
                                  onClick={() => onPrintInvoice(b.MaDon)}
                                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Xem và in hóa đơn"
                                >
                                  <Printer className="w-3 h-3" /> Hóa đơn
                                </button>
                              )}

                              <button
                                onClick={() => setActiveBookingForDetail(b)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="Xem chi tiết đơn"
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
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CHI TIẾT ĐƠN ĐẶT PHÒNG */}
      {/* ============================================================== */}
      {activeBookingForDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
            <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    CHI TIẾT ĐƠN {activeBookingForDetail.MaDon}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {activeBookingForDetail.TrangThaiDon}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo lúc: {formatDateTime(activeBookingForDetail.ThoiGianTaoDon)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveBookingForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 overscroll-contain">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">Khách hàng lưu trú</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {customers.find((c) => c.MaKH === activeBookingForDetail.MaKH)?.HoTen || 'Khách lẻ'}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    SĐT: {customers.find((c) => c.MaKH === activeBookingForDetail.MaKH)?.SoDienThoai} · CCCD: {customers.find((c) => c.MaKH === activeBookingForDetail.MaKH)?.CCCD || '--'}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Địa chỉ: {customers.find((c) => c.MaKH === activeBookingForDetail.MaKH)?.DiaChi || 'Chưa cập nhật'}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">Thông tin phòng & thời gian</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    Phòng {activeBookingForDetail.MaPhong} - {rooms.find((r) => r.MaPhong === activeBookingForDetail.MaPhong)?.TenPhong}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {formatDate(activeBookingForDetail.NgayNhanPhong)} → {formatDate(activeBookingForDetail.NgayTraPhong)} ({activeBookingForDetail.SoDem} đêm, {activeBookingForDetail.SoKhach} khách)
                  </div>
                  {activeBookingForDetail.ThoiGianCheckInThucTe && (
                    <div className="text-purple-700 font-medium mt-0.5">
                      Check-in thực tế: {formatDateTime(activeBookingForDetail.ThoiGianCheckInThucTe)}
                    </div>
                  )}
                  {activeBookingForDetail.ThoiGianCheckOutThucTe && (
                    <div className="text-emerald-700 font-medium mt-0.5">
                      Check-out thực tế: {formatDateTime(activeBookingForDetail.ThoiGianCheckOutThucTe)}
                    </div>
                  )}
                </div>
              </div>

              {activeBookingForDetail.YeuCauDacBiet && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                  <strong>Ghi chú & Yêu cầu:</strong> {activeBookingForDetail.YeuCauDacBiet}
                </div>
              )}

              {/* Quản lý dịch vụ trong đơn */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Quản lý dịch vụ
                  </h3>
                  {canEditBookingServices(activeBookingForDetail.TrangThaiDon) && (
                    <button
                      onClick={() => setAddServiceModalBooking(activeBookingForDetail)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm dịch vụ
                    </button>
                  )}
                </div>

                {getServiceLockReason(activeBookingForDetail.TrangThaiDon) && (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                    {getServiceLockReason(activeBookingForDetail.TrangThaiDon)}
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">TÊN DỊCH VỤ</th>
                        <th className="py-2.5 px-3">GIAI ĐOẠN</th>
                        <th className="py-2.5 px-3 text-center">SỐ LƯỢNG</th>
                        <th className="py-2.5 px-3 text-right">ĐƠN GIÁ CHỐT</th>
                        <th className="py-2.5 px-3 text-right">THÀNH TIỀN</th>
                        {canEditBookingServices(activeBookingForDetail.TrangThaiDon) && (
                          <th className="py-2.5 px-3 text-center">XÓA</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {serviceItems.filter((s) => s.MaDon === activeBookingForDetail.MaDon).length === 0 ? (
                        <tr>
                          <td colSpan={canEditBookingServices(activeBookingForDetail.TrangThaiDon) ? 6 : 5} className="py-4 text-center text-slate-400">
                            Chưa có dịch vụ phát sinh nào trong đơn.
                          </td>
                        </tr>
                      ) : (
                        serviceItems
                          .filter((s) => s.MaDon === activeBookingForDetail.MaDon)
                          .map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {item.TenDichVu}
                                {item.GhiChu && <span className="block text-[10px] text-slate-400">{item.GhiChu}</span>}
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                  {item.GiaiDoan}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {!canEditBookingServices(activeBookingForDetail.TrangThaiDon) ? (
                                  item.SoLuong
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => handleChangeServiceQty(item.id, item.SoLuong - 1, item.TenDichVu)}
                                      disabled={item.SoLuong <= 1}
                                      className="w-5 h-5 rounded-sm bg-slate-200 hover:bg-slate-300 font-bold flex items-center justify-center text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold px-2">{item.SoLuong}</span>
                                    <button
                                      onClick={() => handleChangeServiceQty(item.id, item.SoLuong + 1, item.TenDichVu)}
                                      className="w-5 h-5 rounded-sm bg-slate-200 hover:bg-slate-300 font-bold flex items-center justify-center text-slate-700 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums">{formatVND(item.DonGiaTaiThoiDiem)}</td>
                              <td className="py-2 px-3 text-right font-bold tabular-nums text-slate-900">{formatVND(item.ThanhTien)}</td>
                              {canEditBookingServices(activeBookingForDetail.TrangThaiDon) && (
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() => handleRemoveService(item.id, item.TenDichVu)}
                                    className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                                    title="Xóa dịch vụ này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lịch sử thay đổi đơn */}
              {activeBookingForDetail.lichSuThayDoi && activeBookingForDetail.lichSuThayDoi.length > 0 && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-amber-950 uppercase tracking-wide block text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    LỊCH SỬ THAY ĐỔI ĐƠN ({activeBookingForDetail.lichSuThayDoi.length} lần cập nhật)
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {activeBookingForDetail.lichSuThayDoi.map((log) => (
                      <div key={log.id} className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-800">{log.nguoiThucHien}</span>
                          <span>{formatDateTime(log.thoiGian)}</span>
                        </div>
                        <div className="text-slate-700 font-medium">{log.noiDungThayDoi}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền phòng ({activeBookingForDetail.SoDem} đêm):</span>
                  <span className="font-semibold tabular-nums">{formatVND(activeBookingForDetail.TienPhong)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tiền dịch vụ phát sinh:</span>
                  <span className="font-semibold tabular-nums">{formatVND(activeBookingForDetail.TienDichVu)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Tổng chi phí đơn hàng:</span>
                  <span className="tabular-nums">{formatVND(activeBookingForDetail.TongTien)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                  <span>Tiền cọc đã thu trước:</span>
                  <span className="tabular-nums">{formatVND(activeBookingForDetail.DaThu)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Số tiền còn lại cần thanh toán:</span>
                  <span className="tabular-nums">{formatVND(activeBookingForDetail.ConLai)}</span>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 z-20">
              <div className="flex items-center gap-2">
                {activeBookingForDetail.TrangThaiDon === 'Đã hoàn thành' && (
                  <button
                    onClick={() => onPrintInvoice(activeBookingForDetail.MaDon)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Xuất & In hóa đơn
                  </button>
                )}

                {(activeBookingForDetail.TrangThaiDon === 'Chờ đặt cọc' ||
                  activeBookingForDetail.TrangThaiDon === 'Đã xác nhận' ||
                  activeBookingForDetail.TrangThaiDon === 'Đã check-in') && (
                  <button
                    onClick={() => handleOpenUpdateModal(activeBookingForDetail)}
                    className="px-3.5 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Cập nhật đơn đặt phòng và dịch vụ"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Cập nhật đơn
                  </button>
                )}

                {(activeBookingForDetail.TrangThaiDon === 'Chờ đặt cọc' || activeBookingForDetail.TrangThaiDon === 'Đã xác nhận') && (
                  <button
                    onClick={() => setCancelModalBooking(activeBookingForDetail)}
                    className="px-3.5 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Hủy đơn này
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeBookingForDetail.TrangThaiDon === 'Chờ đặt cọc' && (
                  <button
                    onClick={() => handleOpenDepositModal(activeBookingForDetail)}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CreditCard className="w-4 h-4" /> Thu tiền cọc (30%)
                  </button>
                )}

                {activeBookingForDetail.TrangThaiDon === 'Đã xác nhận' && (
                  <button
                    onClick={() => handleOpenCheckInModal(activeBookingForDetail)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckInIcon className="w-4 h-4" /> Thực hiện Check-in
                  </button>
                )}

                {activeBookingForDetail.TrangThaiDon === 'Đã check-in' && (
                  <button
                    onClick={() => handleOpenCheckOutModal(activeBookingForDetail)}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckOutIcon className="w-4 h-4" /> Check-out & Tất toán
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveBookingForDetail(null)}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: GHI NHẬN ĐẶT CỌC & VIETQR */}
      {/* ============================================================== */}
      {depositModalBooking && (() => {
        const minDeposit = Math.max(0, depositModalBooking.TienCocYeuCau - depositModalBooking.DaThu);
        const maxDeposit = Math.max(0, depositModalBooking.TongTien - depositModalBooking.DaThu);

        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
              <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    XÁC NHẬN ĐẶT CỌC ({depositModalBooking.MaDon})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDepositModalBooking(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
                <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền phòng ({depositModalBooking.SoDem} đêm):</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatVND(depositModalBooking.TienPhong)}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>Tiền cọc yêu cầu (30% tiền phòng làm tròn):</span>
                    <span className="tabular-nums">
                      {formatVND(depositModalBooking.TienCocYeuCau)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Số tiền đã thu trước:</span>
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      {formatVND(depositModalBooking.DaThu)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1 text-[11px]">
                    <span>Giới hạn thu cọc hợp lệ:</span>
                    <span className="tabular-nums text-blue-700">
                      Tối thiểu: {formatVND(minDeposit)} · Tối đa: {formatVND(maxDeposit)}
                    </span>
                  </div>
                </div>

                {minDeposit === 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    ✓ Đơn đã thu đủ số tiền cọc yêu cầu ({formatVND(depositModalBooking.DaThu)} / {formatVND(depositModalBooking.TienCocYeuCau)}). Cho phép xác nhận đơn với 0 ₫ mà không thu thêm.
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Phương thức nhận tiền cọc:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositMethod('VietQR')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        depositMethod === 'VietQR'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Chuyển khoản VietQR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositMethod('Tiền mặt')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        depositMethod === 'Tiền mặt'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Tiền mặt trực tiếp</span>
                    </button>
                  </div>
                </div>

                {depositMethod === 'VietQR' && Number(depositAmount) > 0 && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-center space-y-2">
                    <span className="text-[11px] font-bold text-blue-900 block">
                      MÃ VIETQR CHUYỂN KHOẢN TỰ ĐỘNG
                    </span>
                    <div className="flex justify-center">
                      <img
                        src={generateVietQRUrl(
                          bankConfig.bankCode,
                          bankConfig.accountNo,
                          bankConfig.accountName,
                          Number(depositAmount),
                          `${depositModalBooking.MaDon} COC`
                        )}
                        alt="VietQR Code"
                        className="w-44 h-44 object-contain rounded-lg border border-white shadow-xs bg-white p-1"
                      />
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>{bankConfig.bankName}</strong> <br />
                      Số TK: <strong className="text-blue-700 font-mono">{bankConfig.accountNo}</strong> · Chủ TK: <strong>{bankConfig.accountName}</strong>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-700">
                        Số tiền cọc thực nhận (VND):
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Min: {formatVND(minDeposit)} · Max: {formatVND(maxDeposit)}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => {
                        setDepositAmount(Number(e.target.value));
                        setDepositError('');
                      }}
                      onBlur={() => {
                        const check = validateMoneyAmount(depositAmount, {
                          min: minDeposit,
                          max: maxDeposit,
                          allowZero: minDeposit === 0,
                          fieldName: 'Số tiền cọc thực nhận',
                        });
                        if (!check.valid) {
                          setDepositError(check.error!);
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-bold text-slate-800 ${
                        depositError ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                      }`}
                    />
                    {depositError && (
                      <p className="text-rose-600 text-xs mt-1 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{depositError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Mã giao dịch ngân hàng / biên nhận (nếu có):
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: FT2610110091..."
                      value={depositTxnCode}
                      onChange={(e) => setDepositTxnCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
                <button
                  type="button"
                  onClick={() => setDepositModalBooking(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeposit}
                  disabled={isSubmittingDeposit}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  {isSubmittingDeposit
                    ? 'Đang xử lý...'
                    : minDeposit === 0 && Number(depositAmount) === 0
                    ? 'Xác nhận đơn (Không thu thêm)'
                    : 'Xác nhận thu cọc'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* MODAL 3: CHECK-IN & PHỤ THU D008 */}
      {/* ============================================================== */}
      {checkInModalBooking && (() => {
        const hasD008 = serviceItems.some(
          (it) => it.MaDon === checkInModalBooking.MaDon && it.MaDV === 'D008' && it.SoLuong > 0
        );

        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
              <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
                <div className="flex items-center gap-2">
                  <CheckInIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    CHECK-IN ({checkInModalBooking.MaDon})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckInModalBooking(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain text-xs text-slate-600">
                <p>
                  Xác nhận khách đã có mặt tại homestay và nhận phòng{' '}
                  <strong className="text-slate-900">
                    {checkInModalBooking.MaPhong}
                  </strong>
                  .
                </p>

                {hasD008 ? (
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-600 text-xs">
                    ℹ Đơn đã có phụ thu Check-in sớm (D008) với số lượng &gt; 0.
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyEarlyCheckInFee}
                        onChange={(e) => setApplyEarlyCheckInFee(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600"
                      />
                      <div className="text-xs">
                        <strong className="text-amber-950 block">
                          Áp dụng phụ thu Check-in sớm (D008)
                        </strong>
                        <span className="text-amber-800 text-[11px]">
                          Khách nhận phòng trước 14:00 (+150.000 ₫ / Lượt cộng vào chi phí đơn)
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2 z-20">
                <button
                  type="button"
                  onClick={() => handleConfirmNoShow(checkInModalBooking.MaDon)}
                  className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Khách không đến (No-show)?
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckInModalBooking(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCheckIn}
                    disabled={isSubmittingCheckIn}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    {isSubmittingCheckIn ? 'Đang xử lý...' : 'Xác nhận Check-in'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* MODAL 4: CHECK-OUT, TẤT TOÁN & PHỤ THU D009 */}
      {/* ============================================================== */}
      {checkOutModalBooking && (() => {
        const hasD009 = serviceItems.some(
          (it) => it.MaDon === checkOutModalBooking.MaDon && it.MaDV === 'D009' && it.SoLuong > 0
        );
        const extraFee = !hasD009 && applyLateCheckOutFee ? 150000 : 0;
        const tongChiPhi = checkOutModalBooking.TongTien + extraFee;
        const soConPhaiThu = Math.max(0, tongChiPhi - checkOutModalBooking.DaThu);

        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
              <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
                <div className="flex items-center gap-2">
                  <CheckOutIcon className="w-5 h-5 text-purple-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    TẤT TOÁN & CHECK-OUT ({checkOutModalBooking.MaDon})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckOutModalBooking(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
                {hasD009 ? (
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-600 text-xs">
                    ℹ Đơn đã có phụ thu Trả phòng muộn (D009) với số lượng &gt; 0.
                  </div>
                ) : (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyLateCheckOutFee}
                        onChange={(e) => handleToggleLateCheckOut(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600"
                      />
                      <div className="text-xs">
                        <strong className="text-purple-950 block">
                          Áp dụng phụ thu Trả phòng muộn (D009)
                        </strong>
                        <span className="text-purple-800 text-[11px]">
                          Khách trả phòng sau 12:00 (+150.000 ₫ / Lượt cộng vào hóa đơn tất toán)
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền phòng:</span>
                    <span className="font-semibold tabular-nums">{formatVND(checkOutModalBooking.TienPhong)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền dịch vụ hiện tại:</span>
                    <span className="font-semibold tabular-nums">{formatVND(checkOutModalBooking.TienDichVu)}</span>
                  </div>
                  {!hasD009 && applyLateCheckOutFee && (
                    <div className="flex justify-between text-purple-700 font-semibold">
                      <span>Phụ thu trả muộn D009 (1 Lượt):</span>
                      <span className="tabular-nums">+150.000 ₫</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                    <span>Tổng chi phí cần thanh toán:</span>
                    <span className="tabular-nums">{formatVND(tongChiPhi)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Đã thanh toán trước (Tiền cọc):</span>
                    <span className="tabular-nums">-{formatVND(checkOutModalBooking.DaThu)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-extrabold text-sm border-t border-slate-200 pt-1">
                    <span>Số tiền còn lại phải thu:</span>
                    <span className="tabular-nums">{formatVND(soConPhaiThu)}</span>
                  </div>
                </div>

                {soConPhaiThu > 0 ? (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Số tiền thu tất toán (*):
                        </label>
                        <span className="text-[11px] text-rose-600 font-semibold">
                          Bắt buộc nhập đúng: {formatVND(soConPhaiThu)}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={checkOutPaymentAmount}
                        onChange={(e) => {
                          setCheckOutPaymentAmount(Number(e.target.value));
                          setCheckOutError('');
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-bold text-slate-800 ${
                          checkOutError ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                      {checkOutError && (
                        <p className="text-rose-600 text-xs mt-1 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{checkOutError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Hình thức thanh toán nốt:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCheckOutMethod('VietQR')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            checkOutMethod === 'VietQR'
                              ? 'border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          <span>VietQR QR Code</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckOutMethod('Tiền mặt')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            checkOutMethod === 'Tiền mặt'
                              ? 'border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Tiền mặt</span>
                        </button>
                      </div>
                    </div>

                    {checkOutMethod === 'VietQR' && (
                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-center space-y-2">
                        <span className="text-[11px] font-bold text-purple-900 block">
                          QUÉT QR ĐỂ TẤT TOÁN CHECK-OUT
                        </span>
                        <div className="flex justify-center">
                          <img
                            src={generateVietQRUrl(
                              bankConfig.bankCode,
                              bankConfig.accountNo,
                              bankConfig.accountName,
                              soConPhaiThu,
                              `${checkOutModalBooking.MaDon} TAT TOAN`
                            )}
                            alt="VietQR Check-out"
                            className="w-44 h-44 object-contain rounded-lg border border-white shadow-xs bg-white p-1"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Mã giao dịch ngân hàng (nếu có):
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: MB2610091..."
                        value={checkOutTxnCode}
                        onChange={(e) => setCheckOutTxnCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs">
                    ✓ <strong>Đơn đã thanh toán đủ (Số còn nợ: 0 ₫).</strong> Không yêu cầu nhập khoản thu mới. Bạn có thể bấm xác nhận để hoàn tất check-out và xuất hóa đơn.
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
                <button
                  type="button"
                  onClick={() => setCheckOutModalBooking(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckOut}
                  disabled={isSubmittingCheckOut}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  {isSubmittingCheckOut
                    ? 'Đang xử lý...'
                    : soConPhaiThu > 0
                    ? 'Xác nhận đã thu đủ & Hoàn tất'
                    : 'Hoàn tất Check-out'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* MODAL 5: HỦY ĐƠN ĐẶT PHÒNG */}
      {/* ============================================================== */}
      {cancelModalBooking && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
            <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  HỦY ĐƠN {cancelModalBooking.MaDon}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 overscroll-contain text-xs">
              {cancelModalBooking.DaThu > 0 ? (
                isEligibleForRefund48Hours(cancelModalBooking.NgayNhanPhong) ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                    <strong className="block mb-0.5">✓ ĐỦ ĐIỀU KIỆN HOÀN 100% CỌC</strong>
                    Yêu cầu hủy trước 14:00 ngày check-in ít nhất 48 giờ. Số tiền cần hoàn cho khách: <strong>{formatVND(cancelModalBooking.DaThu)}</strong>.
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                    <strong className="block mb-0.5">✕ KHÔNG HOÀN CỌC THEO CHÍNH SÁCH</strong>
                    Hủy dưới 48 giờ so với mốc check-in 14:00. Homestay giữ lại khoản cọc <strong>{formatVND(cancelModalBooking.DaThu)}</strong>.
                  </div>
                )
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                  Đơn chưa thu cọc. Hủy đơn sẽ giải phóng phòng về trạng thái &quot;Sẵn sàng&quot; ngay lập tức.
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lý do hủy đơn:
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Khách thay đổi lịch trình, quá hạn cọc 12h..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Không hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Xác nhận Hủy Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: XỬ LÝ HOÀN CỌC */}
      {/* ============================================================== */}
      {refundModalBooking && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
            <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  XỬ LÝ HOÀN CỌC ({refundModalBooking.MaDon})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 overscroll-contain text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                <p>
                  Đơn đã hủy trước ít nhất 48 giờ. Quản lý thực hiện chuyển khoản hoàn tiền thủ công cho khách ngoài hệ thống:
                </p>
                <div className="text-base font-extrabold text-emerald-900 mt-1">
                  Số tiền hoàn: {formatVND(refundModalBooking.DaThu)}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã giao dịch hoàn tiền (nếu có):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: REF26101100..."
                  value={refundTxnCode}
                  onChange={(e) => setRefundTxnCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
              <button
                type="button"
                onClick={() => setRefundModalBooking(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Xác nhận &quot;Đã hoàn&quot;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: THÊM DỊCH VỤ VÀO ĐƠN */}
      {/* ============================================================== */}
      {addServiceModalBooking && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
            <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
              <h3 className="text-base font-extrabold text-slate-900">
                THÊM DỊCH VỤ VÀO ĐƠN ({addServiceModalBooking.MaDon})
              </h3>
              <button
                type="button"
                onClick={() => setAddServiceModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 overscroll-contain text-xs">
              <form id="add-service-form" onSubmit={handleAddService} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Chọn dịch vụ đang hoạt động:
                  </label>
                  <select
                    value={selectedServiceCode}
                    onChange={(e) => setSelectedServiceCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white cursor-pointer"
                  >
                    <option value="">-- Chọn dịch vụ --</option>
                    {services
                      .filter((s) => s.TrangThai === 'Đang hoạt động' && isServiceAllowedAtStatus(s.ThoiDiemApDung, addServiceModalBooking.TrangThaiDon))
                      .map((s) => (
                        <option key={s.MaDV} value={s.MaDV}>
                          {s.TenDichVu} ({formatVND(s.DonGia)} / {s.DonViTinh}) [{s.ThoiDiemApDung}]
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Số lượng (nguyên &gt; 0):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={serviceQuantity}
                    onChange={(e) => setServiceQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ghi chú yêu cầu dịch vụ (nếu có):
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Giặt đồ tối, xe giao lúc 8h..."
                    value={serviceNote}
                    onChange={(e) => setServiceNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div className="p-2.5 bg-blue-50 rounded-lg text-[11px] text-blue-800">
                  ℹ Đơn giá chốt cứng tại thời điểm thêm. Tiền dịch vụ không tính vào khoản cọc 30% và được cộng vào tổng tiền khi check-out.
                </div>
              </form>
            </div>

            <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
              <button
                type="button"
                onClick={() => setAddServiceModalBooking(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="add-service-form"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Lưu Dịch Vụ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 8: CẬP NHẬT ĐƠN ĐẶT PHÒNG & DỊCH VỤ */}
      {/* ============================================================== */}
      {updateModalBooking && (() => {
        const eligibleBookings = bookings.filter(
          (b) =>
            b.TrangThaiDon === 'Chờ đặt cọc' ||
            b.TrangThaiDon === 'Đã xác nhận' ||
            b.TrangThaiDon === 'Đã check-in'
        );
        const currentBooking = bookings.find((b) => b.MaDon === updateModalBooking.MaDon) || updateModalBooking;
        const currentCust = customers.find((c) => c.MaKH === currentBooking.MaKH);
        const selectedRoom = rooms.find((r) => r.MaPhong === updateRoomCode);
        const nights = calculateNights(updateCheckIn, updateCheckOut);
        const newRoomCost = selectedRoom ? selectedRoom.GiaPhong * nights : 0;
        const currentBookingServices = serviceItems.filter((it) => it.MaDon === currentBooking.MaDon);
        const currentServicesTotal = currentBookingServices.reduce((sum, it) => sum + it.ThanhTien, 0);
        const newTongTien = newRoomCost + currentServicesTotal;
        const newConLai = Math.max(0, newTongTien - currentBooking.DaThu);
        const newDeposit30 = calculateDeposit(newRoomCost, 0.3);

        const isCheckedIn = currentBooking.TrangThaiDon === 'Đã check-in';

        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
              <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
                <div className="flex items-center gap-2.5">
                  <Edit2 className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                      CẬP NHẬT ĐƠN ĐẶT PHÒNG ({currentBooking.MaDon})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Khách hàng: <strong className="text-slate-800">{currentCust?.HoTen || currentBooking.MaKH}</strong> · Trạng thái: <span className="font-semibold text-blue-600">{currentBooking.TrangThaiDon}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUpdateModalBooking(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
                {updateError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span className="font-medium">{updateError}</span>
                  </div>
                )}

                {/* Dropdown chọn đơn cần chỉnh sửa */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
                  <label className="font-bold text-amber-950 block">
                    Chọn đơn đặt phòng cần chỉnh sửa (Chờ cọc / Đã xác nhận / Đã check-in):
                  </label>
                  <select
                    value={currentBooking.MaDon}
                    onChange={(e) => {
                      const found = bookings.find((b) => b.MaDon === e.target.value);
                      if (found) {
                        handleOpenUpdateModal(found);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-800 cursor-pointer shadow-2xs"
                  >
                    {eligibleBookings.map((b) => {
                      const cust = customers.find((c) => c.MaKH === b.MaKH);
                      return (
                        <option key={b.MaDon} value={b.MaDon}>
                          {b.MaDon} - Phòng {b.MaPhong} ({cust?.HoTen || b.MaKH}) [{b.TrangThaiDon}] - {formatDate(b.NgayNhanPhong)} → {formatDate(b.NgayTraPhong)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <form id="update-booking-form" onSubmit={handleConfirmUpdateBooking} className="space-y-4 text-xs">
                  {/* 1. Phòng & Thời gian */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wide block text-[11px]">
                        1. Điều Chỉnh Phòng & Lịch Trình Lưu Trú
                      </span>
                      {isCheckedIn && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                          Đơn Đã check-in: Cố định phòng & lịch trình
                        </span>
                      )}
                    </div>

                    {isCheckedIn && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                        ℹ Khách đang lưu trú tại phòng. Hệ thống không cho phép đổi phòng, ngày hoặc số khách. Bạn có thể cập nhật dịch vụ và ghi chú bên dưới.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Phòng lưu trú (*):
                        </label>
                        <select
                          value={updateRoomCode}
                          disabled={isCheckedIn}
                          onChange={(e) => {
                            setUpdateRoomCode(e.target.value);
                            setUpdateError('');
                          }}
                          className={`w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium ${
                            isCheckedIn ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                          }`}
                        >
                          {rooms.map((r) => {
                            const isCur = r.MaPhong === currentBooking.MaPhong;
                            const avail = checkRoomAvailability(r.MaPhong, updateCheckIn, updateCheckOut, currentBooking.MaDon);
                            return (
                              <option key={r.MaPhong} value={r.MaPhong}>
                                Phòng {r.MaPhong} ({r.TenPhong} - {r.LoaiPhong}, {r.SucChua} người, {formatVND(r.GiaPhong)}/đêm)
                                {isCur ? ' [Đang chọn]' : avail ? ' [Còn trống]' : ' [Đã kín lịch]'}
                              </option>
                            );
                          })}
                        </select>
                        {!isCheckedIn && selectedRoom && updateGuests > selectedRoom.SucChua && (
                          <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                            ⚠ Số khách ({updateGuests}) vượt quá sức chứa tối đa ({selectedRoom.SucChua} khách) của phòng {selectedRoom.TenPhong}!
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Số lượng khách (*):
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          disabled={isCheckedIn}
                          value={updateGuests}
                          onChange={(e) => {
                            setUpdateGuests(Math.max(1, parseInt(e.target.value, 10) || 1));
                            setUpdateError('');
                          }}
                          className={`w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold ${
                            isCheckedIn ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                          }`}
                        />
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          Sức chứa tối đa phòng: {selectedRoom?.SucChua || 2} khách
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Ngày nhận phòng (*):
                        </label>
                        <input
                          type="date"
                          disabled={isCheckedIn}
                          value={updateCheckIn}
                          onChange={(e) => {
                            setUpdateCheckIn(e.target.value);
                            setUpdateError('');
                          }}
                          className={`w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium ${
                            isCheckedIn ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Ngày trả phòng (*):
                        </label>
                        <input
                          type="date"
                          disabled={isCheckedIn}
                          value={updateCheckOut}
                          onChange={(e) => {
                            setUpdateCheckOut(e.target.value);
                            setUpdateError('');
                          }}
                          className={`w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium ${
                            isCheckedIn ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-blue-700 bg-blue-50/70 p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                      <span>Thời gian lưu trú dự kiến: <strong>{nights} đêm</strong> ({formatDate(updateCheckIn)} ➔ {formatDate(updateCheckOut)})</span>
                      <span className="font-bold tabular-nums">Tiền phòng: {formatVND(newRoomCost)}</span>
                    </div>
                  </div>

                  {/* 2. Dịch vụ đi kèm: Đã xác nhận / Đã check-in đều cho phép cập nhật */}
                  {currentBooking.TrangThaiDon === 'Đã xác nhận' || currentBooking.TrangThaiDon === 'Đã check-in' ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                          2. Dịch Vụ Đã Thêm Trong Đơn ({currentBookingServices.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddServiceInUpdate((prev) => !prev)}
                          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" /> {showAddServiceInUpdate ? 'Đóng chọn dịch vụ' : 'Thêm dịch vụ mới'}
                        </button>
                      </div>

                      {/* Form chọn và thêm dịch vụ mới trực tiếp vào đơn */}
                      {showAddServiceInUpdate && (
                        <div className="p-3 bg-white border border-blue-200 rounded-lg space-y-2.5 shadow-2xs">
                          <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5 text-blue-700">
                            <Plus className="w-3.5 h-3.5" /> Thêm dịch vụ mới vào đơn đặt phòng:
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 block">
                              Chọn dịch vụ đang hoạt động (*):
                            </label>
                            <select
                              value={updateServiceCode}
                              onChange={(e) => setUpdateServiceCode(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium cursor-pointer"
                            >
                              <option value="">-- Bấm vào đây để chọn dịch vụ --</option>
                              {services
                                .filter(
                                  (s) =>
                                    s.TrangThai === 'Đang hoạt động' &&
                                    isServiceAllowedAtStatus(s.ThoiDiemApDung, currentBooking.TrangThaiDon)
                                )
                                .map((s) => (
                                  <option key={s.MaDV} value={s.MaDV}>
                                    {s.TenDichVu} ({formatVND(s.DonGia)} / {s.DonViTinh}) [{s.ThoiDiemApDung}]
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block">
                                Số lượng (*):
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={updateServiceQty}
                                onChange={(e) => setUpdateServiceQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block">
                                Ghi chú (nếu có):
                              </label>
                              <input
                                type="text"
                                placeholder="Giờ dùng, giao phòng..."
                                value={updateServiceNote}
                                onChange={(e) => setUpdateServiceNote(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddServiceInUpdate(false);
                                setUpdateServiceCode('');
                                setUpdateServiceNote('');
                              }}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddServiceInUpdate(currentBooking.MaDon)}
                              disabled={!updateServiceCode}
                              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3 h-3" /> Xác nhận thêm dịch vụ
                            </button>
                          </div>
                        </div>
                      )}

                      {currentBookingServices.length === 0 ? (
                        <div className="text-center py-3 text-slate-400 bg-white rounded-lg border border-dashed border-slate-200 text-xs space-y-1.5">
                          <div>Chưa có dịch vụ nào trong đơn đặt phòng này.</div>
                          {!showAddServiceInUpdate && (
                            <button
                              type="button"
                              onClick={() => setShowAddServiceInUpdate(true)}
                              className="text-blue-600 hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Bấm vào đây để chọn thêm dịch vụ mới
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {currentBookingServices.map((it) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                            >
                              <div>
                                <strong className="text-slate-800">{it.TenDichVu}</strong>
                                <span className="text-slate-500 text-[11px] block">
                                  {formatVND(it.DonGiaTaiThoiDiem)} / {it.GiaiDoan} · Thành tiền: <strong className="text-slate-900">{formatVND(it.ThanhTien)}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleChangeServiceQty(it.id, Math.max(1, it.SoLuong - 1), it.TenDichVu)}
                                  disabled={it.SoLuong <= 1}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                  title="Giảm số lượng"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center font-bold text-slate-900">{it.SoLuong}</span>
                                <button
                                  type="button"
                                  onClick={() => handleChangeServiceQty(it.id, it.SoLuong + 1, it.TenDichVu)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                  title="Tăng số lượng"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveService(it.id, it.TenDichVu)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer ml-1 transition-colors"
                                  title="Xóa dịch vụ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-900">
                          Mục Quản lý dịch vụ bị khóa ({currentBooking.TrangThaiDon})
                        </div>
                        <div className="text-[11px] text-amber-800 mt-0.5">
                          Khi cập nhật đơn ở trạng thái <strong>Chờ đặt cọc</strong>, không cho phép thêm dịch vụ. Mục Quản lý dịch vụ chỉ xuất hiện và cho phép cập nhật khi đơn ở trạng thái <strong>Đã xác nhận</strong> hoặc <strong>Đã check-in</strong>.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Yêu cầu đặc biệt */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Yêu cầu đặc biệt / Ghi chú:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Khách yêu cầu kê nệm phụ, phòng tầng cao, view núi..."
                      value={updateSpecialReq}
                      onChange={(e) => setUpdateSpecialReq(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  {/* 4. Tổng chi phí tính lại (Live preview) */}
                  <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5">
                    <span className="font-bold text-blue-950 uppercase tracking-wide block text-[11px]">
                      3. Bảng Tính Lại Chi Phí Tự Động
                    </span>
                    <div className="flex justify-between text-slate-600">
                      <span>Tiền phòng mới ({nights} đêm × {formatVND(selectedRoom?.GiaPhong || 0)}):</span>
                      <strong className="text-slate-900 tabular-nums">{formatVND(newRoomCost)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tiền cọc yêu cầu mới (30% tiền phòng):</span>
                      <span className="font-semibold text-blue-700 tabular-nums">{formatVND(newDeposit30)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tổng tiền dịch vụ:</span>
                      <strong className="text-slate-900 tabular-nums">{formatVND(currentServicesTotal)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold border-t border-blue-200 pt-1 text-xs">
                      <span>Tổng chi phí đơn hàng mới:</span>
                      <strong className="text-blue-900 text-sm tabular-nums">{formatVND(newTongTien)}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Đã thanh toán (Tiền cọc đã thu):</span>
                      <span className="tabular-nums">-{formatVND(currentBooking.DaThu)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-extrabold border-t border-blue-200 pt-1">
                      <span>Số tiền còn lại phải thu khi Check-out:</span>
                      <span className="text-sm tabular-nums">{formatVND(newConLai)}</span>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer Buttons */}
              <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
                <button
                  type="button"
                  onClick={() => setUpdateModalBooking(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  form="update-booking-form"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Lưu Thay Đổi Đơn
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
