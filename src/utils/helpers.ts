import { useEffect } from 'react';
import type { TrangThaiDon, ThoiDiemApDung, ChiTietDichVu, NhomDichVu } from '../types';

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

// Kiểm tra quá hạn đặt cọc 12 giờ
export const isBookingOverdue12Hours = (createdAt: string): boolean => {
  const created = new Date(createdAt).getTime();
  const now = new Date().getTime();
  const diffHours = (now - created) / (1000 * 60 * 60);
  return diffHours >= 12;
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

export const sumServiceAmount = (items: ChiTietDichVu[], maDon: string): number =>
  items.filter((x) => x.MaDon === maDon).reduce((sum, x) => sum + x.ThanhTien, 0);

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
    .filter((item) => item.MaDon === booking.MaDon && item.MaDV === maDV && item.id !== currentItemIdToExclude)
    .reduce((sum, item) => sum + item.SoLuong, 0);

  return Math.max(0, max - currentTotal);
};

// Kiểm tra xem danh sách dịch vụ hiện có có bị vượt trần khi đơn thay đổi ngày/khách không
export const validateServicesWithinNewBookingLimits = (
  newBooking: { soKhach: number; soDem: number; MaDon: string },
  currentItems: ChiTietDichVu[]
): { valid: boolean; exceededService?: string; max?: number; current?: number } => {
  const bookingItems = currentItems.filter((it) => it.MaDon === newBooking.MaDon);
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
