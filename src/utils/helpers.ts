import { useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  TrangThaiDon,
  ThoiDiemApDung,
  ChiTietDichVu,
  NhomDichVu,
  TrangThaiThucHienDV,
  DonDatPhong,
  HangThanhVien,
} from '../types';

export const formatVND = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const calculateNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
};

// Làm tròn đến nghìn đồng: cọcYêuCầu = làm_tròn_1000(tỷLệCọc × tiềnPhòng)
export const calculateDeposit = (roomPrice: number, rate = 0.3): number => {
  const raw = roomPrice * rate;
  return Math.round(raw / 1000) * 1000;
};

// Parse an ISO or 'YYYY-MM-DD HH:mm:ss' string safely across all browsers/locales
export const parseDateTimeSafe = (dateTimeStr: string): Date => {
  if (!dateTimeStr) return new Date();
  const normalized = dateTimeStr.includes(' ') && !dateTimeStr.includes('T')
    ? dateTimeStr.replace(' ', 'T')
    : dateTimeStr;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
};

// Xác định chính xác mốc thời hạn đặt cọc: ThoiGianTaoDon + 12 giờ
export const getBookingDepositDeadline = (createdAt: string): Date => {
  const created = parseDateTimeSafe(createdAt).getTime();
  return new Date(created + 12 * 60 * 60 * 1000);
};

// Kiểm tra quá hạn đặt cọc 12 giờ (chính xác từng giây)
export const isBookingOverdue12Hours = (createdAt: string): boolean => {
  if (!createdAt) return false;
  const deadline = getBookingDepositDeadline(createdAt).getTime();
  const now = Date.now();
  return now >= deadline;
};

// Lấy thông tin chi tiết về hạn đặt cọc 12 giờ (phục vụ hiển thị countdown / thông báo cảnh báo)
export const getBookingDepositDeadlineInfo = (createdAt: string) => {
  const deadline = getBookingDepositDeadline(createdAt);
  const deadlineMs = deadline.getTime();
  const nowMs = Date.now();
  const diffMs = deadlineMs - nowMs;

  if (diffMs <= 0) {
    const overdueMs = Math.abs(diffMs);
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      isOverdue: true,
      deadlineDate: deadline,
      deadlineFormatted: formatDateTime(deadline.toISOString()),
      overdueText: overdueHours > 0 ? `Quá hạn ${overdueHours} giờ ${overdueMins} phút` : `Quá hạn ${overdueMins} phút`,
      remainingText: 'Đã hết hạn xác nhận tiền cọc (12 giờ)',
    };
  }

  const remHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    isOverdue: false,
    deadlineDate: deadline,
    deadlineFormatted: formatDateTime(deadline.toISOString()),
    overdueText: '',
    remainingText: remHours > 0 ? `Còn lại ${remHours} giờ ${remMins} phút` : `Còn lại ${remMins} phút`,
  };
};

// Tự động kiểm tra tính hợp lệ của ngày lưu trú so với ngày hiện tại (Asia/Ho_Chi_Minh)
// Nếu ngày của đơn cũ ở trong quá khứ, tự động điều chỉnh về ngày hiện tại và bảo lưu số đêm
export const shiftDatesIfInPast = (
  checkIn: string,
  checkOut: string
): {
  adjustedCheckIn: string;
  adjustedCheckOut: string;
  wasAdjusted: boolean;
  nights: number;
  notice: string;
} => {
  const originalNights = calculateNights(checkIn, checkOut);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const cleanCheckIn = checkIn.slice(0, 10);
  const cleanCheckOut = checkOut.slice(0, 10);

  if (cleanCheckIn < todayStr) {
    const nextCheckoutDate = new Date(today);
    nextCheckoutDate.setDate(today.getDate() + (originalNights > 0 ? originalNights : 1));
    const ny = nextCheckoutDate.getFullYear();
    const nm = String(nextCheckoutDate.getMonth() + 1).padStart(2, '0');
    const nd = String(nextCheckoutDate.getDate()).padStart(2, '0');
    const adjustedCheckOutStr = `${ny}-${nm}-${nd}`;

    return {
      adjustedCheckIn: todayStr,
      adjustedCheckOut: adjustedCheckOutStr,
      wasAdjusted: true,
      nights: originalNights > 0 ? originalNights : 1,
      notice: `Ngày lưu trú của đơn cũ (${formatDate(cleanCheckIn)} → ${formatDate(cleanCheckOut)}) đã nằm trong quá khứ so với ngày hiện tại (${formatDate(todayStr)}). Hệ thống đã tự động điều chỉnh ngày nhận phòng sang hôm nay (${formatDate(todayStr)}) và ngày trả phòng sang ${formatDate(adjustedCheckOutStr)} (${originalNights} đêm) để đảm bảo tính hợp lệ.`,
    };
  }

  return {
    adjustedCheckIn: cleanCheckIn,
    adjustedCheckOut: cleanCheckOut,
    wasAdjusted: false,
    nights: originalNights,
    notice: '',
  };
};

// Kiểm tra hủy >= 48 giờ trước 14:00 ngày check-in
export const isEligibleForRefund48Hours = (checkInDate: string): boolean => {
  // Mốc là 14:00 của ngày check-in
  const checkInTarget = new Date(`${checkInDate}T14:00:00`).getTime();
  const now = new Date().getTime();
  const diffHours = (checkInTarget - now) / (1000 * 60 * 60);
  return diffHours >= 48;
};

// Sinh mã khóa chính theo quy chuẩn
export const generateMaDon = (existingCodes: string[]): string => {
  const year = new Date().getFullYear();
  const prefix = `DP${year}`;
  let maxNum = 0;
  for (const code of existingCodes) {
    if (code.startsWith(prefix)) {
      const numPart = parseInt(code.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    } else if (code.startsWith('DP2025')) {
      const numPart = parseInt(code.slice(6), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

export const generateMaPhieu = (existingCodes: string[]): string => {
  const prefix = 'PT';
  let maxNum = 0;
  for (const code of existingCodes) {
    if (code.startsWith(prefix)) {
      const numPart = parseInt(code.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(5, '0');
  return `${prefix}${nextNum}`;
};

export const generateMaHoaDon = (existingCodes: string[]): string => {
  const year = new Date().getFullYear();
  const prefix = `HD${year}`;
  let maxNum = 0;
  for (const code of existingCodes) {
    if (code.startsWith(prefix)) {
      const numPart = parseInt(code.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    } else if (code.startsWith('HD2025')) {
      const numPart = parseInt(code.slice(6), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

export const generateMaKH = (existingCodes: string[]): string => {
  const prefix = 'KH';
  let maxNum = 0;
  for (const code of existingCodes) {
    if (code.startsWith(prefix)) {
      const numPart = parseInt(code.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(3, '0');
  return `${prefix}${nextNum}`;
};

export const generateMaDV = (existingCodes: string[]): string => {
  const prefix = 'D';
  let maxNum = 0;
  for (const code of existingCodes) {
    if (code.startsWith(prefix)) {
      const numPart = parseInt(code.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(3, '0');
  return `${prefix}${nextNum}`;
};

// Sinh URL VietQR chuẩn
export const generateVietQRUrl = (
  bankCode = 'ICB', // VietinBank
  accountNo = '108876543210',
  accountName = 'CHICSTAY HOMESTAY',
  amount = 0,
  description = ''
): string => {
  const encodedAccountName = encodeURIComponent(accountName);
  const encodedDescription = encodeURIComponent(description);
  return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedDescription}&accountName=${encodedAccountName}`;
};

// ===== QUẢN LÝ DỊCH VỤ: ràng buộc trạng thái đơn (Business Rules) =====
// Chỉ khi đơn "Đã xác nhận" hoặc "Đã check-in" mới được thêm / sửa số lượng / xóa dịch vụ.
// Trạng thái "Chờ đặt cọc" và các trạng thái kết thúc (Đã hoàn thành, Đã hủy, No-show) đều bị khóa.
export const SERVICE_EDITABLE_STATUSES: TrangThaiDon[] = ['Đã xác nhận', 'Đã check-in'];

export const canEditBookingServices = (status: TrangThaiDon): boolean =>
  SERVICE_EDITABLE_STATUSES.includes(status);

export const getServiceLockReason = (status: TrangThaiDon): string | null => {
  if (canEditBookingServices(status)) return null;
  if (status === 'Chờ đặt cọc') {
    return 'Đơn đang ở trạng thái "Chờ đặt cọc": không cho phép thêm hay sửa dịch vụ. Mục Quản lý dịch vụ chỉ xuất hiện và cho phép cập nhật khi đơn ở trạng thái "Đã xác nhận" (đã thu cọc) hoặc "Đã check-in".';
  }
  if (status === 'Đã hoàn thành') {
    return 'Đơn đã hoàn thành: dữ liệu dịch vụ đã bị khóa để bảo toàn lịch sử giao dịch.';
  }
  return `Đơn ở trạng thái "${status}": không thể thêm, sửa hoặc xóa dịch vụ.`;
};

// "Chỉ Pre-stay" -> khi Đã xác nhận; "Chỉ In-house" -> khi Đã check-in; "Cả hai" -> cả hai.
// Tuyệt đối không cho phép thêm khi đang ở trạng thái "Chờ đặt cọc".
export const isServiceAllowedAtStatus = (when: ThoiDiemApDung, status: TrangThaiDon): boolean => {
  if (status === 'Đã xác nhận') return when === 'Chỉ Pre-stay' || when === 'Cả hai';
  if (status === 'Đã check-in') return when === 'Chỉ In-house' || when === 'Cả hai';
  return false;
};

// ===== TRẠNG THÁI THỰC HIỆN DỊCH VỤ (Service Execution Lifecycle) =====
export const SERVICE_EXEC_STATUSES: TrangThaiThucHienDV[] = ['Đã yêu cầu', 'Đang thực hiện', 'Đã hoàn thành', 'Đã hủy'];

// Dòng cũ chưa có trường => mặc định 'Đã yêu cầu'
export const getServiceExecStatus = (item: Pick<ChiTietDichVu, 'TrangThaiThucHien'>): TrangThaiThucHienDV =>
  item.TrangThaiThucHien || 'Đã yêu cầu';

// Dịch vụ tính tiền: các dịch vụ không ở trạng thái 'Đã hủy', hoặc đã hủy nhưng có thu phí hủy 30% (TyLeThuHuy > 0)
export const isServiceBillable = (item: Pick<ChiTietDichVu, 'TrangThaiThucHien' | 'TyLeThuHuy'>): boolean => {
  const st = getServiceExecStatus(item);
  if (st === 'Đã hủy') {
    return Boolean(item.TyLeThuHuy && item.TyLeThuHuy > 0);
  }
  return true;
};

// Đã hoàn thành / Đã hủy / Đang thực hiện => khóa sửa số lượng
export const isServiceItemLocked = (item: Pick<ChiTietDichVu, 'TrangThaiThucHien'>): boolean => {
  const st = getServiceExecStatus(item);
  return st === 'Đã hoàn thành' || st === 'Đã hủy' || st === 'Đang thực hiện';
};

// Dịch vụ cho phép xóa/hủy: Chỉ 'Đã yêu cầu' (hủy 0%) và 'Đang thực hiện' (hủy tính phí 30%)
export const canCancelService = (item: Pick<ChiTietDichVu, 'TrangThaiThucHien'>): boolean => {
  const st = getServiceExecStatus(item);
  return st === 'Đã yêu cầu' || st === 'Đang thực hiện';
};

export const getServiceCancelTitle = (item: Pick<ChiTietDichVu, 'TrangThaiThucHien'>): string => {
  const st = getServiceExecStatus(item);
  if (st === 'Đã hoàn thành') return 'Dịch vụ đã hoàn thành: không thể xóa hoặc hủy';
  if (st === 'Đã hủy') return 'Dịch vụ này đã hủy';
  if (st === 'Đang thực hiện') return 'Hủy dịch vụ (đang thực hiện: tính 30% phí dịch vụ)';
  return 'Xóa/Hủy dịch vụ này (chuyển sang Đã hủy, miễn phí 100%)';
};

// Luồng chuyển trạng thái hợp lệ trong dropdown (bỏ "Đã hủy" theo yêu cầu, việc hủy thực hiện qua nút xóa)
export const getNextServiceExecStatuses = (current: TrangThaiThucHienDV): TrangThaiThucHienDV[] => {
  switch (current) {
    case 'Đã yêu cầu':
      return ['Đang thực hiện', 'Đã hoàn thành'];
    case 'Đang thực hiện':
      return ['Đã hoàn thành'];
    default:
      return [];
  }
};

export const getServiceExecStatusBadge = (
  status: TrangThaiThucHienDV | undefined
): { bg: string; text: string; border: string; dot: string; Icon: LucideIcon; iconClass: string; strike: boolean } => {
  switch (status || 'Đã yêu cầu') {
    case 'Đang thực hiện':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-indigo-500', Icon: Clock, iconClass: 'animate-pulse', strike: false };
    case 'Đã hoàn thành':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', Icon: CheckCircle, iconClass: '', strike: false };
    case 'Đã hủy':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', Icon: XCircle, iconClass: '', strike: true };
    default:
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', Icon: ClipboardList, iconClass: '', strike: false };
  }
};

// Tính tổng tiền dịch vụ của đơn: bao gồm dịch vụ bình thường và dịch vụ hủy có thu phí 30%
export const sumServiceAmount = (items: ChiTietDichVu[], maDon: string): number =>
  items
    .filter((x) => x.MaDon === maDon && isServiceBillable(x))
    .reduce((sum, x) => sum + x.ThanhTien, 0);

// Tổng tiền dịch vụ tính tiền của một danh sách bất kỳ (dùng cho báo cáo / thống kê)
export const sumBillableAmount = (items: ChiTietDichVu[]): number =>
  items.filter(isServiceBillable).reduce((sum, x) => sum + x.ThanhTien, 0);

export const getServiceGroupBadge = (group: NhomDichVu): { bg: string; text: string; border: string } => {
  switch (group) {
    case 'Ăn uống & Tiện ích':
    case 'Ăn uống & Trải nghiệm':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
    case 'Di chuyển & Phương tiện':
      return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' };
    case 'Tiện ích & Vệ sinh':
      return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' };
    case 'Tiện nghi phòng':
      return { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' };
    case 'Phụ thu thời gian':
      return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' };
    case 'Trải nghiệm theo Vibe':
      return { bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-200' };
    case 'Giải trí tại phòng':
      return { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' };
    case 'Minibar':
      return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' };
  }
};

// ===== BẢNG QUY TẮC GIỚI HẠN DỊCH VỤ TRONG ĐƠN (D001 -> D012 & D013+) =====
export const getServiceMaxQuantity = (
  maDV: string,
  booking: { soKhach: number; soDem: number }
): number => {
  const guests = Math.max(1, booking.soKhach || 1);
  const nights = Math.max(1, booking.soDem || 1);

  switch (maDV) {
    case 'D001': // Giặt ủi
      return 20;
    case 'D002': // Đưa đón sân bay
      return 4;
    case 'D003': // Đưa đón bến xe
      return 4;
    case 'D004': // Ăn sáng tại phòng (tối đa khách x đêm)
      return guests * nights;
    case 'D005': // Thuê xe máy (tối đa đêm x 4 xe)
      return nights * 4;
    case 'D006': // Giường phụ (Extra Bed)
      return 2;
    case 'D007': // Set BBQ ngoài trời
      return 3;
    case 'D008': // Phụ thu nhận phòng sớm
      return 1;
    case 'D009': // Phụ thu trả phòng muộn
      return 1;
    case 'D010': // Set up Romantic Date
      return 1;
    case 'D011': // Thuê máy chiếu HD
      return 2;
    case 'D012': // Minibar
      return 10;
    default:
      // Dịch vụ tự thêm (D013 trở đi): chặn mặc định 50 mỗi đơn
      return 50;
  }
};

export const getServiceLimitDescription = (
  maDV: string,
  booking: { soKhach: number; soDem: number }
): string => {
  const max = getServiceMaxQuantity(maDV, booking);
  switch (maDV) {
    case 'D004':
      return `Tối đa ${max} suất (${booking.soKhach} khách × ${booking.soDem} đêm)`;
    case 'D005':
      return `Tối đa ${max} ngày/xe (${booking.soDem} đêm × 4 xe)`;
    case 'D008':
    case 'D009':
      return `Tối đa 1 lượt/đơn`;
    case 'D010':
      return `Tối đa 1 gói/đơn`;
    case 'D006':
      return `Tối đa 2 giường phụ/đơn`;
    case 'D007':
      return `Tối đa 3 set BBQ/đơn`;
    case 'D011':
      return `Tối đa 2 lượt/đơn`;
    default:
      return `Tối đa ${max} lượt/đơn`;
  }
};

export const getServiceRemainingQuantity = (
  maDV: string,
  booking: { soKhach: number; soDem: number; MaDon: string },
  currentItems: ChiTietDichVu[],
  currentItemIdToExclude?: string
): number => {
  const max = getServiceMaxQuantity(maDV, booking);
  const currentTotal = currentItems
    .filter((item) => item.MaDon === booking.MaDon && item.MaDV === maDV && item.id !== currentItemIdToExclude && item.TrangThaiThucHien !== 'Đã hủy')
    .reduce((sum, item) => sum + item.SoLuong, 0);

  return Math.max(0, max - currentTotal);
};

// Kiểm tra xem danh sách dịch vụ hiện có có bị vượt trần khi đơn thay đổi ngày/khách không
export const validateServicesWithinNewBookingLimits = (
  newBooking: { soKhach: number; soDem: number; MaDon: string },
  currentItems: ChiTietDichVu[]
): { valid: boolean; exceededService?: string; max?: number; current?: number } => {
  const bookingItems = currentItems.filter((it) => it.MaDon === newBooking.MaDon && it.TrangThaiThucHien !== 'Đã hủy');
  // Group by MaDV
  const qtyByDV: Record<string, { qty: number; name: string }> = {};
  for (const it of bookingItems) {
    if (!qtyByDV[it.MaDV]) {
      qtyByDV[it.MaDV] = { qty: 0, name: it.TenDichVu };
    }
    qtyByDV[it.MaDV].qty += it.SoLuong;
  }

  for (const [maDV, data] of Object.entries(qtyByDV)) {
    const max = getServiceMaxQuantity(maDV, newBooking);
    if (data.qty > max) {
      return {
        valid: false,
        exceededService: data.name,
        max,
        current: data.qty,
      };
    }
  }

  return { valid: true };
};

// ====================================================================
// HẰNG SỐ CẤU HÌNH & KIỂM TRA SỐ TIỀN (ACID & ERP CONSTRAINTS)
// ====================================================================
export const MIN_SERVICE_PRICE = 1; // 1 VND
export const MAX_SERVICE_PRICE = 10_000_000; // 10.000.000 VND
export const MAX_SYSTEM_AMOUNT = 1_000_000_000; // 1.000.000.000 VND (1 tỷ)

export interface MoneyValidationOptions {
  min?: number;
  max?: number;
  allowZero?: boolean;
  fieldName?: string;
}

export interface MoneyValidationResult {
  valid: boolean;
  error?: string;
  amount: number;
}

/**
 * Kiểm tra tính hợp lệ của số tiền VND:
 * - Hữu hạn, số nguyên (không chấp nhận số thập phân).
 * - Không chấp nhận số âm hoặc chuỗi rỗng / NaN.
 * - Kiểm tra ngưỡng min/max và chặn giá trị quá lớn (> 1 tỷ).
 */
export const validateMoneyAmount = (
  value: unknown,
  options: MoneyValidationOptions = {}
): MoneyValidationResult => {
  const { min, max, allowZero = false, fieldName = 'Số tiền' } = options;

  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      error: `${fieldName} không được để trống.`,
      amount: 0,
    };
  }

  // Convert to string and test for invalid decimal symbols or non-numeric
  const strVal = String(value).trim();
  if (/[.,]/.test(strVal)) {
    return {
      valid: false,
      error: `${fieldName} VND phải là số nguyên, không chấp nhận số thập phân.`,
      amount: 0,
    };
  }

  const num = Number(strVal);

  if (!Number.isFinite(num) || isNaN(num)) {
    return {
      valid: false,
      error: `${fieldName} phải là giá trị số hữu hạn hợp lệ.`,
      amount: 0,
    };
  }

  if (!Number.isInteger(num)) {
    return {
      valid: false,
      error: `${fieldName} VND phải là số nguyên, không chấp nhận số thập phân.`,
      amount: num,
    };
  }

  if (num < 0) {
    return {
      valid: false,
      error: `${fieldName} không được là số âm.`,
      amount: num,
    };
  }

  if (num === 0 && !allowZero) {
    return {
      valid: false,
      error: `${fieldName} phải lớn hơn 0 ₫.`,
      amount: 0,
    };
  }

  if (num > MAX_SYSTEM_AMOUNT) {
    return {
      valid: false,
      error: `${fieldName} quá lớn, vượt quá hạn mức hệ thống (${formatVND(MAX_SYSTEM_AMOUNT)}).`,
      amount: num,
    };
  }

  if (min !== undefined && num < min) {
    return {
      valid: false,
      error: `${fieldName} tối thiểu là ${formatVND(min)}.`,
      amount: num,
    };
  }

  if (max !== undefined && num > max) {
    return {
      valid: false,
      error: `${fieldName} tối đa là ${formatVND(max)}.`,
      amount: num,
    };
  }

  return { valid: true, amount: num };
};

// ====================================================================
// QUY TẮC KIỂM TRA THÔNG TIN KHÁCH HÀNG THỐNG NHẤT
// ====================================================================

/**
 * Chuẩn hóa số điện thoại:
 * Cắt khoảng trắng đầu cuối, thay thế tiền tố '+84' thành '0'.
 */
export const normalizePhoneNumber = (phone: string | undefined | null): string => {
  if (!phone) return '';
  return phone.trim().replace(/^\+84/, '0');
};

/**
 * Kiểm tra họ tên khách hàng:
 * Bắt buộc (*), có ít nhất một chữ cái, tối đa 100 ký tự.
 */
export const validateCustomerName = (name: string | undefined | null): { valid: boolean; error?: string } => {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Họ và tên bắt buộc phải nhập.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Họ và tên tối đa 100 ký tự.' };
  }
  if (!/\p{L}/u.test(trimmed)) {
    return { valid: false, error: 'Họ và tên phải chứa ít nhất một chữ cái.' };
  }
  return { valid: true };
};

/**
 * Kiểm tra số điện thoại:
 * Bắt buộc (*), chuẩn hóa +84 thành 0 rồi kiểm tra đúng 10 chữ số bắt đầu bằng 0.
 */
export const validateCustomerPhone = (
  phone: string | undefined | null
): { valid: boolean; error?: string; normalized: string } => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return { valid: false, error: 'Số điện thoại bắt buộc phải nhập.', normalized: '' };
  }
  if (!/^0[0-9]{9}$/.test(normalized)) {
    return {
      valid: false,
      error: 'Số điện thoại phải gồm đúng 10 chữ số, bắt đầu bằng số 0 (có thể nhập +84).',
      normalized,
    };
  }
  return { valid: true, normalized };
};

/**
 * Kiểm tra CCCD:
 * BẮT BUỘC (*), đúng 12 chữ số.
 */
export const validateCustomerCccd = (cccd: string | undefined | null): { valid: boolean; error?: string } => {
  const trimmed = (cccd ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: 'CCCD là bắt buộc và phải gồm đúng 12 chữ số.' };
  }
  if (!/^[0-9]{12}$/.test(trimmed)) {
    return { valid: false, error: 'CCCD phải gồm đúng 12 chữ số.' };
  }
  return { valid: true };
};

/**
 * Kiểm tra email:
 * BẮT BUỘC (*), đúng định dạng email, tối đa 100 ký tự.
 */
export const validateCustomerEmail = (email: string | undefined | null): { valid: boolean; error?: string } => {
  const trimmed = (email ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Email là bắt buộc, vui lòng nhập email.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Email không được vượt quá 100 ký tự.' };
  }

  // Basic email pattern supporting international/Unicode local parts (e.g. võ.đức.nam41@gmail.com)
  const basicEmailRegex = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u;
  if (!basicEmailRegex.test(trimmed)) {
    return { valid: false, error: 'Email không đúng định dạng (VD: example@gmail.com).' };
  }

  return { valid: true };
};

/**
 * Kiểm tra địa chỉ:
 * BẮT BUỘC (*), tối đa 255 ký tự.
 */
export const validateCustomerAddress = (address: string | undefined | null): { valid: boolean; error?: string } => {
  const trimmed = (address ?? '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Địa chỉ là bắt buộc, vui lòng nhập địa chỉ khách hàng.' };
  }
  if (trimmed.length > 255) {
    return { valid: false, error: 'Địa chỉ tối đa 255 ký tự.' };
  }
  return { valid: true };
};

/**
 * Bộ kiểm tra khách hàng tổng hợp:
 * Cả HoTen, SoDienThoai, CCCD, Email, DiaChi đều bắt buộc (*) theo yêu cầu.
 */
export const validateCustomerFull = (data: {
  HoTen: string;
  SoDienThoai: string;
  CCCD?: string | null;
  Email?: string | null;
  DiaChi?: string | null;
}): {
  valid: boolean;
  errors: { HoTen?: string; SoDienThoai?: string; CCCD?: string; Email?: string; DiaChi?: string };
  normalizedPhone: string;
} => {
  const errors: { HoTen?: string; SoDienThoai?: string; CCCD?: string; Email?: string; DiaChi?: string } = {};

  const nameRes = validateCustomerName(data.HoTen);
  if (!nameRes.valid) errors.HoTen = nameRes.error;

  const phoneRes = validateCustomerPhone(data.SoDienThoai);
  if (!phoneRes.valid) errors.SoDienThoai = phoneRes.error;

  const cccdRes = validateCustomerCccd(data.CCCD);
  if (!cccdRes.valid) errors.CCCD = cccdRes.error;

  const emailRes = validateCustomerEmail(data.Email);
  if (!emailRes.valid) errors.Email = emailRes.error;

  const addressRes = validateCustomerAddress(data.DiaChi);
  if (!addressRes.valid) errors.DiaChi = addressRes.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone: phoneRes.normalized,
  };
};

/**
 * Xóa dấu tiếng Việt phục vụ tìm kiếm không phân biệt dấu (BR-1: "xe may" tìm ra "xe máy")
 */
export const removeVietnameseTones = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

/**
 * Hook khóa thanh cuộn toàn trang (body, html, main) khi mở modal để triệt tiêu hiện tượng chữ nền lộ đằng sau
 */
export const useLockScroll = (isOpen = true) => {
  useEffect(() => {
    if (!isOpen) return;
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    const mainEl = document.querySelector('main');
    const originalMain = mainEl ? mainEl.style.overflow : '';

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (mainEl) mainEl.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBody;
      document.documentElement.style.overflow = originalHtml;
      if (mainEl) mainEl.style.overflow = originalMain;
    };
  }, [isOpen]);
};

// ====================================================================
// CHÍNH SÁCH KHÁCH HÀNG THÂN THIẾT & PHÂN HẠNG TỰ ĐỘNG
// ====================================================================

export interface TierConfig {
  name: HangThanhVien;
  minStays: number;
  minRevenue: number;
  discountRate: number; // 0, 0.05, 0.08, 0.12
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
}

export const MEMBERSHIP_TIERS: TierConfig[] = [
  {
    name: 'Thành viên',
    minStays: 0,
    minRevenue: 0,
    discountRate: 0,
    badgeColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      dot: 'bg-slate-400',
    },
  },
  {
    name: 'Bạc',
    minStays: 5,
    minRevenue: 5_000_000,
    discountRate: 0.05,
    badgeColor: {
      bg: 'bg-slate-200/90',
      text: 'text-slate-800',
      border: 'border-slate-400',
      dot: 'bg-slate-500',
    },
  },
  {
    name: 'Vàng',
    minStays: 10,
    minRevenue: 15_000_000,
    discountRate: 0.10,
    badgeColor: {
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      border: 'border-amber-300',
      dot: 'bg-amber-500',
    },
  },
  {
    name: 'Kim cương',
    minStays: 15,
    minRevenue: 30_000_000,
    discountRate: 0.15,
    badgeColor: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-900',
      border: 'border-cyan-400',
      dot: 'bg-cyan-500',
    },
  },
];

/**
 * Lấy danh sách các đơn đặt phòng hợp lệ của khách hàng để tính tích lũy.
 * Điều kiện nghiêm ngặt:
 * - TrangThaiDon = 'Đã hoàn thành'
 * - TrangThaiThanhToan = 'Đã thanh toán'
 * Mỗi đơn chỉ được tính một lần.
 * Loại trừ đơn Chờ cọc, Đã xác nhận, Đã check-in, Đã hủy, No-show.
 */
export const getValidCustomerCompletedBookings = (
  bookings: DonDatPhong[],
  maKH: string
): DonDatPhong[] => {
  if (!maKH || !Array.isArray(bookings)) return [];
  return bookings.filter(
    (b) =>
      b.MaKH === maKH &&
      b.TrangThaiDon === 'Đã hoàn thành' &&
      b.TrangThaiThanhToan === 'Đã thanh toán'
  );
};

/**
 * Tính số lượt lưu trú đã hoàn thành hợp lệ
 */
export const getCustomerCompletedStaysCount = (
  bookings: DonDatPhong[],
  maKH: string
): number => {
  return getValidCustomerCompletedBookings(bookings, maKH).length;
};

/**
 * Tính tổng doanh thu tích lũy hợp lệ từ các đơn đã hoàn thành.
 * Doanh thu tính theo tiền thực thu hợp lệ (TongTien / DaThu của đơn hoàn thành),
 * không cộng trùng giữa phiếu cọc và phiếu tất toán.
 */
export const getCustomerValidRevenue = (
  bookings: DonDatPhong[],
  maKH: string
): number => {
  const completed = getValidCustomerCompletedBookings(bookings, maKH);
  return completed.reduce((sum, b) => sum + (b.TongTien ?? b.DaThu ?? 0), 0);
};

/**
 * Xác định hạng khách hàng chỉ dựa trên số lượt lưu trú hoàn thành
 */
export const getCustomerTierByStays = (staysCount: number): TierConfig => {
  for (let i = MEMBERSHIP_TIERS.length - 1; i >= 0; i--) {
    if (staysCount >= MEMBERSHIP_TIERS[i].minStays) {
      return MEMBERSHIP_TIERS[i];
    }
  }
  return MEMBERSHIP_TIERS[0];
};

/**
 * Xác định hạng khách hàng chỉ dựa trên doanh thu tích lũy hợp lệ
 */
export const getCustomerTierByRevenue = (revenue: number): TierConfig => {
  for (let i = MEMBERSHIP_TIERS.length - 1; i >= 0; i--) {
    if (revenue >= MEMBERSHIP_TIERS[i].minRevenue) {
      return MEMBERSHIP_TIERS[i];
    }
  }
  return MEMBERSHIP_TIERS[0];
};

/**
 * Xác định hạng thành viên theo quy tắc hai tiêu chí độc lập:
 * 1. Tính hạng theo số lượt lưu trú.
 * 2. Tính hạng theo doanh thu tích lũy.
 * 3. So sánh hai kết quả.
 * 4. Chọn hạng cao hơn làm hạng thành viên hiện tại.
 * Khách hàng chỉ cần đạt 1 trong 2 điều kiện là được công nhận hạng đó.
 */
export const getCustomerTier = (
  bookings: DonDatPhong[],
  maKH: string
): TierConfig => {
  const stays = getCustomerCompletedStaysCount(bookings, maKH);
  const revenue = getCustomerValidRevenue(bookings, maKH);

  const tierByStays = getCustomerTierByStays(stays);
  const tierByRevenue = getCustomerTierByRevenue(revenue);

  const staysTierIndex = MEMBERSHIP_TIERS.findIndex((t) => t.name === tierByStays.name);
  const revenueTierIndex = MEMBERSHIP_TIERS.findIndex((t) => t.name === tierByRevenue.name);

  return staysTierIndex >= revenueTierIndex ? tierByStays : tierByRevenue;
};

export interface CriterionProgress {
  current: number;
  achievedTier: TierConfig;
  targetTier: TierConfig | null;
  targetValue: number;
  needed: number;
  percent: number; // 0 - 100
  isMax: boolean;
  meetsCurrentOverallTier: boolean;
  neededForCurrentOverallTier: number;
}

export interface TierProgress {
  currentTier: TierConfig;
  tierByStays: TierConfig;
  tierByRevenue: TierConfig;
  staysCount: number;
  validRevenue: number;
  isMaxTier: boolean;
  nextTier: TierConfig | null;
  qualifyingReason: 'cả hai tiêu chí' | 'lượt lưu trú' | 'doanh thu tích lũy' | 'mặc định';

  // Tiến trình độc lập theo 2 tiêu chí
  staysProgress: CriterionProgress;
  revenueProgress: CriterionProgress;

  // Thuộc tính tương thích ngược
  staysNeeded: number;
  revenueNeeded: number;
  staysPercent: number;
  revenuePercent: number;
  overallPercent?: number;
}

/**
 * Tính toán tiến trình nâng hạng độc lập theo 2 tiêu chí:
 * A. Theo lượt lưu trú
 * B. Theo doanh thu tích lũy
 */
export const getCustomerTierProgress = (
  bookings: DonDatPhong[],
  maKH: string
): TierProgress => {
  const staysCount = getCustomerCompletedStaysCount(bookings, maKH);
  const validRevenue = getCustomerValidRevenue(bookings, maKH);

  const tierByStays = getCustomerTierByStays(staysCount);
  const tierByRevenue = getCustomerTierByRevenue(validRevenue);

  const staysTierIndex = MEMBERSHIP_TIERS.findIndex((t) => t.name === tierByStays.name);
  const revenueTierIndex = MEMBERSHIP_TIERS.findIndex((t) => t.name === tierByRevenue.name);

  const currentTier = staysTierIndex >= revenueTierIndex ? tierByStays : tierByRevenue;
  const currentTierIndex = Math.max(staysTierIndex, revenueTierIndex);

  const isMaxTier = currentTierIndex === MEMBERSHIP_TIERS.length - 1;
  const nextTier = !isMaxTier ? MEMBERSHIP_TIERS[currentTierIndex + 1] : null;

  let qualifyingReason: 'cả hai tiêu chí' | 'lượt lưu trú' | 'doanh thu tích lũy' | 'mặc định' = 'mặc định';
  if (currentTierIndex > 0) {
    if (staysTierIndex === revenueTierIndex) {
      qualifyingReason = 'cả hai tiêu chí';
    } else if (staysTierIndex > revenueTierIndex) {
      qualifyingReason = 'lượt lưu trú';
    } else {
      qualifyingReason = 'doanh thu tích lũy';
    }
  }

  // --- Tiêu chí 1: Lượt lưu trú ---
  const isStaysMax = staysTierIndex === MEMBERSHIP_TIERS.length - 1;
  const meetsCurrentOverallTierStays = staysTierIndex >= currentTierIndex;
  const neededForCurrentOverallTierStays = Math.max(0, currentTier.minStays - staysCount);

  // Mốc số lượt hướng tới cho hạng kế tiếp (chỉ cần đạt 1 trong 2 tiêu chí là được lên nextTier)
  const targetStays = nextTier ? nextTier.minStays : currentTier.minStays;
  const staysNeeded = nextTier ? Math.max(0, nextTier.minStays - staysCount) : 0;
  const staysPercent = targetStays > 0 ? Math.min(100, Math.round((staysCount / targetStays) * 100)) : 100;

  const staysProgress: CriterionProgress = {
    current: staysCount,
    achievedTier: tierByStays,
    targetTier: nextTier,
    targetValue: targetStays,
    needed: staysNeeded,
    percent: staysPercent,
    isMax: isStaysMax,
    meetsCurrentOverallTier: meetsCurrentOverallTierStays,
    neededForCurrentOverallTier: neededForCurrentOverallTierStays,
  };

  // --- Tiêu chí 2: Doanh thu tích lũy ---
  const isRevenueMax = revenueTierIndex === MEMBERSHIP_TIERS.length - 1;
  const meetsCurrentOverallTierRevenue = revenueTierIndex >= currentTierIndex;
  const neededForCurrentOverallTierRevenue = Math.max(0, currentTier.minRevenue - validRevenue);

  // Mốc doanh thu hướng tới cho hạng kế tiếp
  const targetRevenue = nextTier ? nextTier.minRevenue : currentTier.minRevenue;
  const revenueNeeded = nextTier ? Math.max(0, nextTier.minRevenue - validRevenue) : 0;
  const revenuePercent = targetRevenue > 0 ? Math.min(100, Math.round((validRevenue / targetRevenue) * 100)) : 100;

  const revenueProgress: CriterionProgress = {
    current: validRevenue,
    achievedTier: tierByRevenue,
    targetTier: nextTier,
    targetValue: targetRevenue,
    needed: revenueNeeded,
    percent: revenuePercent,
    isMax: isRevenueMax,
    meetsCurrentOverallTier: meetsCurrentOverallTierRevenue,
    neededForCurrentOverallTier: neededForCurrentOverallTierRevenue,
  };

  return {
    currentTier,
    tierByStays,
    tierByRevenue,
    staysCount,
    validRevenue,
    isMaxTier,
    nextTier,
    qualifyingReason,
    staysProgress,
    revenueProgress,
    staysNeeded,
    revenueNeeded,
    staysPercent,
    revenuePercent,
    overallPercent: Math.max(staysPercent, revenuePercent),
  };
};

/**
 * Chuẩn hóa tỷ lệ ưu đãi:
 * - Hỗ trợ cả định dạng số thập phân (e.g. 0.05, 0.10, 0.15)
 * - Hỗ trợ cả định dạng số phần trăm nguyên (e.g. 5, 10, 15)
 * Trả về:
 * - ratePercent: phần trăm nguyên (e.g. 5, 10, 15) dùng để hiển thị text "%"
 * - rateDecimal: số thập phân (e.g. 0.05, 0.10, 0.15) dùng để nhân tính tiền
 */
export const normalizeDiscountRate = (
  rate: number | undefined | null
): { ratePercent: number; rateDecimal: number } => {
  if (!rate || rate <= 0) return { ratePercent: 0, rateDecimal: 0 };
  if (rate <= 1) {
    return {
      ratePercent: Math.round(rate * 100),
      rateDecimal: rate,
    };
  }
  return {
    ratePercent: Math.round(rate),
    rateDecimal: rate / 100,
  };
};

/**
 * Tính toán số tiền ưu đãi theo hạng và tiền phòng sau giảm.
 * Ưu đãi chỉ áp dụng cho tiền phòng, không áp dụng cho dịch vụ.
 * Tự động chuẩn hóa tỷ lệ dù truyền vào dạng 0.05 hay 5.
 */
export const calculateTierDiscount = (
  roomPrice: number,
  discountRate: number
): { discountAmount: number; roomPriceAfterDiscount: number; ratePercent: number } => {
  if (!roomPrice || roomPrice <= 0 || !discountRate || discountRate <= 0) {
    return { discountAmount: 0, roomPriceAfterDiscount: roomPrice || 0, ratePercent: 0 };
  }
  const { ratePercent, rateDecimal } = normalizeDiscountRate(discountRate);
  const discountAmount = Math.round(roomPrice * rateDecimal);
  const roomPriceAfterDiscount = Math.max(0, roomPrice - discountAmount);
  return { discountAmount, roomPriceAfterDiscount, ratePercent };
};
