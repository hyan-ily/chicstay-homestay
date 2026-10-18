import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Phong,
  NguoiDung,
  KhachHang,
  DichVu,
  DonDatPhong,
  PhieuThanhToan,
  ChiTietDichVu,
  HoaDon,
  BankConfig,
  PhuongThucThanhToan,
  LichSuThayDoiDon,
} from '../types';
import {
  INITIAL_ROOMS,
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_SERVICES,
  INITIAL_BOOKINGS,
  INITIAL_PAYMENT_RECEIPTS,
  INITIAL_SERVICE_ITEMS,
  INITIAL_INVOICES,
  INITIAL_BANK_CONFIG,
} from '../data/initialData';
import {
  calculateNights,
  calculateDeposit,
  isEligibleForRefund48Hours,
  generateMaDon,
  generateMaPhieu,
  generateMaHoaDon,
  generateMaKH,
  canEditBookingServices,
  getServiceLockReason,
  isServiceAllowedAtStatus,
  sumServiceAmount,
  formatVND,
  formatDate,
  getServiceRemainingQuantity,
  getServiceLimitDescription,
  validateServicesWithinNewBookingLimits,
  validateMoneyAmount,
  validateCustomerFull,
  normalizePhoneNumber,
  MIN_SERVICE_PRICE,
  MAX_SERVICE_PRICE,
} from '../utils/helpers';

interface HomestayContextType {
  currentUser: NguoiDung | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  register: (hoTen: string, email: string, matKhau: string, vaiTro?: 'Quản lý' | 'Admin') => boolean;
  switchUser: (maND: string) => void;
  users: NguoiDung[];

  rooms: Phong[];
  customers: KhachHang[];
  services: DichVu[];
  bookings: DonDatPhong[];
  serviceItems: ChiTietDichVu[];
  paymentReceipts: PhieuThanhToan[];
  invoices: HoaDon[];
  bankConfig: BankConfig;
  updateBankConfig: (config: BankConfig) => void;

  // Bookings actions
  createBooking: (data: {
    maPhong: string;
    maKH?: string;
    newCustomer?: { hoTen: string; soDienThoai: string; cccd: string; email: string; diaChi: string; ghiChu?: string };
    ngayNhanPhong: string;
    ngayTraPhong: string;
    soKhach: number;
    yeuCauDacBiet?: string;
  }) => { success: boolean; message: string; maDon?: string };

  confirmDeposit: (
    maDon: string,
    phuongThuc: PhuongThucThanhToan,
    soTien: number,
    maGiaoDich?: string,
    ghiChu?: string
  ) => { success: boolean; message: string; receipt?: PhieuThanhToan };

  updateBooking: (
    maDon: string,
    data: {
      maPhong?: string;
      ngayNhanPhong?: string;
      ngayTraPhong?: string;
      soKhach?: number;
      yeuCauDacBiet?: string;
    }
  ) => { success: boolean; message: string };

  cancelBooking: (maDon: string, lyDo?: string) => { success: boolean; message: string; eligibleForRefund?: boolean };

  processRefund: (
    maDon: string,
    maGiaoDichHoan?: string,
    ghiChu?: string
  ) => { success: boolean; message: string; receipt?: PhieuThanhToan };

  checkInBooking: (
    maDon: string,
    applyEarlyFee?: boolean
  ) => { success: boolean; message: string };

  noShowBooking: (maDon: string) => { success: boolean; message: string };

  checkOutBooking: (
    maDon: string,
    phuongThuc: PhuongThucThanhToan,
    maGiaoDich?: string,
    applyLateFee?: boolean,
    settlementAmount?: number,
    ghiChu?: string
  ) => { success: boolean; message: string; invoice?: HoaDon };

  cleanRoom: (maPhong: string) => { success: boolean; message: string };

  // Services actions
  createService: (data: Omit<DichVu, 'MaDV'> & { MaDV: string }) => { success: boolean; message: string };
  updateService: (maDV: string, data: Partial<DichVu>) => { success: boolean; message: string };
  toggleServiceStatus: (maDV: string) => { success: boolean; message: string };
  addServiceToBooking: (
    maDon: string,
    maDV: string,
    soLuong: number,
    ghiChu?: string
  ) => { success: boolean; message: string };
  updateServiceItemQuantity: (id: string, soLuong: number) => { success: boolean; message: string };
  removeServiceFromBooking: (id: string) => { success: boolean; message: string };
  recalcBookingTotals: (maDon: string, items?: ChiTietDichVu[]) => void;

  // Customer actions
  createCustomer: (data: Omit<KhachHang, 'MaKH'>) => { success: boolean; message: string; maKH?: string };
  updateCustomer: (maKH: string, data: Partial<KhachHang>) => { success: boolean; message: string };

  // Database actions
  resetDatabase: () => void;
  getRawSQL: () => string;

  // View helpers
  checkRoomAvailability: (maPhong: string, checkIn: string, checkOut: string, excludeMaDon?: string) => boolean;
  getAvailableRoomsForDates: (checkIn: string, checkOut: string, capacity?: number, excludeMaDon?: string) => Phong[];
  getBookingDetails: (maDon: string) => DonDatPhong | undefined;
}

const HomestayContext = createContext<HomestayContextType | null>(null);

const STORAGE_PREFIX = 'chicstay_seed2025_';

export const HomestayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistence state
  const [users, setUsers] = useState<NguoiDung[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}users`);
    if (saved) {
      try {
        const parsed: NguoiDung[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 1 && parsed[0].MaND === 'ND001') {
          return parsed;
        }
      } catch {}
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<NguoiDung | null>(() => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    } catch {}

    const session = sessionStorage.getItem(`${STORAGE_PREFIX}current_user`);
    if (session && session !== 'null') {
      try {
        const parsed = JSON.parse(session);
        if (parsed && parsed.MaND) {
          return parsed;
        }
      } catch {}
    }
    return null;
  });

  const [rooms, setRooms] = useState<Phong[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}rooms`);
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });

  const [customers, setCustomers] = useState<KhachHang[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}customers`);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [services, setServices] = useState<DichVu[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}services`);
    if (saved) {
      try {
        const parsed: DichVu[] = JSON.parse(saved);
        return parsed.map((s) => {
          if (s.MaDV === 'D001') {
            const donVi = s.DonViTinh === 'cân' || s.DonViTinh === 'Bộ' || s.DonViTinh === 'bộ' ? 'Cân' : s.DonViTinh;
            return { ...s, DonGia: 20000, DonViTinh: donVi };
          }
          if (s.MaDV === 'D008' || s.MaDV === 'D009') {
            return { ...s, DonViTinh: 'Lượt' };
          }
          if (s.DonViTinh === 'cân') {
            return { ...s, DonViTinh: 'Cân' };
          }
          return s;
        });
      } catch {}
    }
    return INITIAL_SERVICES;
  });

  const [bookings, setBookings] = useState<DonDatPhong[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}bookings`);
    if (saved) {
      try {
        const parsed: DonDatPhong[] = JSON.parse(saved);
        return parsed.map((b) => (b.MaND !== 'ND001' ? { ...b, MaND: 'ND001' } : b));
      } catch {}
    }
    return INITIAL_BOOKINGS;
  });

  const serviceItemsRef = useRef<ChiTietDichVu[]>([]);
  const [serviceItems, setServiceItems] = useState<ChiTietDichVu[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}service_items`);
    if (saved) {
      try {
        const parsed: ChiTietDichVu[] = JSON.parse(saved);
        return parsed.map((it) => {
          let updated = it;
          if (it.MaChiTiet === 'CT00011' || it.id === 'CT00011') {
            updated = { ...updated, ThanhTien: 300000 };
          }
          if (it.MaDV === 'D008') {
            updated = { ...updated, GiaiDoan: 'Pre-stay' };
          }
          return updated;
        });
      } catch {}
    }
    return INITIAL_SERVICE_ITEMS;
  });
  serviceItemsRef.current = serviceItems;

  const [paymentReceipts, setPaymentReceipts] = useState<PhieuThanhToan[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}payment_receipts`);
    if (saved) {
      try {
        const parsed: PhieuThanhToan[] = JSON.parse(saved);
        return parsed.map((p) => (p.NguoiLap !== 'ND001' ? { ...p, NguoiLap: 'ND001' } : p));
      } catch {}
    }
    return INITIAL_PAYMENT_RECEIPTS;
  });

  const [invoices, setInvoices] = useState<HoaDon[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}invoices`);
    if (saved) {
      try {
        const parsed: HoaDon[] = JSON.parse(saved);
        return parsed.map((h) => (h.NguoiXuat !== 'ND001' ? { ...h, NguoiXuat: 'ND001' } : h));
      } catch {}
    }
    return INITIAL_INVOICES;
  });

  const [bankConfig, setBankConfig] = useState<BankConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}bank_config`);
    return saved ? JSON.parse(saved) : INITIAL_BANK_CONFIG;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    }
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    } catch {}
  }, [currentUser]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}rooms`, JSON.stringify(rooms));
  }, [rooms]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}customers`, JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}services`, JSON.stringify(services));
  }, [services]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}bookings`, JSON.stringify(bookings));
  }, [bookings]);
  useEffect(() => {
    serviceItemsRef.current = serviceItems;
    localStorage.setItem(`${STORAGE_PREFIX}service_items`, JSON.stringify(serviceItems));
  }, [serviceItems]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}payment_receipts`, JSON.stringify(paymentReceipts));
  }, [paymentReceipts]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}invoices`, JSON.stringify(invoices));
  }, [invoices]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}bank_config`, JSON.stringify(bankConfig));
  }, [bankConfig]);

  // Auth methods
  const login = (email: string, pass: string): boolean => {
    const user = users.find((u) => u.Email.toLowerCase() === email.trim().toLowerCase() && u.MatKhau === pass);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    } catch {}
  };

  const register = (hoTen: string, email: string, matKhau: string, vaiTro: 'Quản lý' | 'Admin' = 'Quản lý'): boolean => {
    const exists = users.some((u) => u.Email.toLowerCase() === email.trim().toLowerCase());
    if (exists) return false;
    const nextMaND = `ND${(users.length + 1).toString().padStart(3, '0')}`;
    const newUser: NguoiDung = {
      MaND: nextMaND,
      HoTen: hoTen.trim(),
      Email: email.trim(),
      VaiTro: vaiTro,
      MatKhau: matKhau,
    };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    setCurrentUser(newUser);
    return true;
  };

  const switchUser = (maND: string) => {
    const u = users.find((x) => x.MaND === maND);
    if (u) setCurrentUser(u);
  };

  const updateBankConfig = (config: BankConfig) => {
    setBankConfig(config);
  };

  // Check Room Availability
  const checkRoomAvailability = (maPhong: string, checkIn: string, checkOut: string, excludeMaDon?: string): boolean => {
    const targetStart = new Date(checkIn).getTime();
    const targetEnd = new Date(checkOut).getTime();

    for (const b of bookings) {
      if (b.MaPhong !== maPhong) continue;
      if (excludeMaDon && b.MaDon === excludeMaDon) continue;
      if (b.TrangThaiDon === 'Đã hủy' || b.TrangThaiDon === 'No-show') continue;

      const bStart = new Date(b.NgayNhanPhong).getTime();
      const bEnd = new Date(b.NgayTraPhong).getTime();

      if (targetStart < bEnd && targetEnd > bStart) {
        return false;
      }
    }
    return true;
  };

  const getAvailableRoomsForDates = (checkIn: string, checkOut: string, capacity?: number, excludeMaDon?: string): Phong[] => {
    if (!checkIn || !checkOut) return rooms;
    return rooms.filter((r) => {
      if (capacity && r.SucChua < capacity) return false;
      return checkRoomAvailability(r.MaPhong, checkIn, checkOut, excludeMaDon);
    });
  };

  const getBookingDetails = (maDon: string): DonDatPhong | undefined => {
    const b = bookings.find((x) => x.MaDon === maDon);
    if (!b) return undefined;
    const kh = customers.find((c) => c.MaKH === b.MaKH);
    const p = rooms.find((r) => r.MaPhong === b.MaPhong);
    const dv = serviceItems.filter((s) => s.MaDon === b.MaDon);
    return {
      ...b,
      tenKhachHang: kh?.HoTen,
      soDienThoai: kh?.SoDienThoai,
      tenPhong: p?.TenPhong,
      loaiPhong: p?.LoaiPhong,
      dichVuList: dv,
    };
  };

  // UC-1.1: Tạo đơn đặt phòng
  const createBooking = (data: {
    maPhong: string;
    maKH?: string;
    newCustomer?: { hoTen: string; soDienThoai: string; cccd: string; email: string; diaChi: string; ghiChu?: string };
    ngayNhanPhong: string;
    ngayTraPhong: string;
    soKhach: number;
    yeuCauDacBiet?: string;
  }): { success: boolean; message: string; maDon?: string } => {
    // 1. Kiểm tra và chuẩn hóa thông tin khách hàng mới
    if (data.newCustomer) {
      const customer = data.newCustomer;
      const val = validateCustomerFull({
        HoTen: customer.hoTen,
        SoDienThoai: customer.soDienThoai,
        CCCD: customer.cccd,
        Email: customer.email,
        DiaChi: customer.diaChi,
      });

      if (!val.valid) {
        const firstEntry = Object.entries(val.errors)[0];
        const fieldLabels: Record<string, string> = {
          HoTen: 'Họ và tên',
          SoDienThoai: 'Số điện thoại',
          CCCD: 'CCCD',
          Email: 'Email',
          DiaChi: 'Địa chỉ',
        };
        const fieldName = fieldLabels[firstEntry[0]] || firstEntry[0];
        return {
          success: false,
          message: `${fieldName}: ${firstEntry[1]}`,
        };
      }

      data = {
        ...data,
        newCustomer: {
          ...customer,
          hoTen: customer.hoTen.trim(),
          soDienThoai: val.normalizedPhone,
          cccd: customer.cccd.trim(),
          email: customer.email.trim(),
          diaChi: customer.diaChi.trim(),
        },
      };
    }

    // 2. Verify availability
    const isAvail = checkRoomAvailability(data.maPhong, data.ngayNhanPhong, data.ngayTraPhong);
    if (!isAvail) {
      return { success: false, message: 'Phòng đã có đơn đặt trong khoảng thời gian này. Vui lòng chọn phòng hoặc ngày khác!' };
    }

    const room = rooms.find((r) => r.MaPhong === data.maPhong);
    if (!room) return { success: false, message: 'Không tìm thấy thông tin phòng đã chọn.' };

    // 3. Handle customer
    let targetMaKH = data.maKH;

    if (!targetMaKH && data.newCustomer) {
      const customer = data.newCustomer;

      if (customers.some((c) => (c.CCCD || '').trim() === customer.cccd)) {
        return {
          success: false,
          message: 'CCCD đã tồn tại trên hệ thống. Vui lòng chọn khách hàng có sẵn.',
        };
      }

      const newCode = generateMaKH(customers.map((c) => c.MaKH));

      const newCust: KhachHang = {
        MaKH: newCode,
        HoTen: customer.hoTen,
        SoDienThoai: customer.soDienThoai,
        CCCD: customer.cccd,
        Email: customer.email,
        DiaChi: customer.diaChi,
        GhiChu: customer.ghiChu,
      };

      setCustomers((prev) => [...prev, newCust]);
      targetMaKH = newCode;
    }

    if (!targetMaKH) {
      return {
        success: false,
        message: 'Vui lòng chọn hoặc nhập thông tin khách hàng.',
      };
    }

    // 4. Calculate finances
    const nights = calculateNights(data.ngayNhanPhong, data.ngayTraPhong);
    const tienPhong = room.GiaPhong * nights;
    const tienCocYeuCau = calculateDeposit(tienPhong, 0.3);
    const tongTien = tienPhong;
    const conLai = tongTien;

    const maDon = generateMaDon(bookings.map((b) => b.MaDon));
    const newBooking: DonDatPhong = {
      MaDon: maDon,
      MaND: currentUser?.MaND || 'ND001',
      MaKH: targetMaKH,
      MaPhong: data.maPhong,
      NgayNhanPhong: data.ngayNhanPhong,
      NgayTraPhong: data.ngayTraPhong,
      SoKhach: data.soKhach,
      SoDem: nights,
      TienPhong: tienPhong,
      TienCocYeuCau: tienCocYeuCau,
      TienDichVu: 0,
      TongTien: tongTien,
      DaThu: 0,
      ConLai: conLai,
      TrangThaiDon: 'Chờ đặt cọc',
      TrangThaiThanhToan: 'Chưa thanh toán',
      ThoiGianTaoDon: new Date().toISOString(),
      YeuCauDacBiet: data.yeuCauDacBiet,
    };

    setRooms((prev) =>
      prev.map((r) => (r.MaPhong === data.maPhong ? { ...r, TrangThaiPhong: 'Tạm giữ' } : r))
    );

    setBookings((prev) => [newBooking, ...prev]);

    return {
      success: true,
      message: `Tạo đơn đặt phòng ${maDon} thành công! Số tiền cọc cần thu: ${tienCocYeuCau.toLocaleString('vi-VN')} ₫ (30%).`,
      maDon: maDon,
    };
  };

  // UC-1.2 & UC-3.1: Ghi nhận đặt cọc
  const confirmDeposit = (
    maDon: string,
    phuongThuc: PhuongThucThanhToan,
    soTien: number,
    maGiaoDich?: string,
    ghiChu?: string
  ): { success: boolean; message: string; receipt?: PhieuThanhToan } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    if (booking.TrangThaiDon !== 'Chờ đặt cọc') {
      return { success: false, message: `Đơn đặt phòng đang ở trạng thái "${booking.TrangThaiDon}", không thể thu cọc.` };
    }

    const minDeposit = Math.max(0, booking.TienCocYeuCau - booking.DaThu);
    const maxDeposit = Math.max(0, booking.TongTien - booking.DaThu);

    const check = validateMoneyAmount(soTien, {
      min: minDeposit,
      max: maxDeposit,
      allowZero: minDeposit === 0,
      fieldName: 'Số tiền cọc thực nhận',
    });

    if (!check.valid) {
      return { success: false, message: check.error! };
    }

    const validatedAmount = check.amount;

    let receipt: PhieuThanhToan | undefined;
    if (validatedAmount > 0) {
      const maPhieu = generateMaPhieu(paymentReceipts.map((p) => p.MaPhieu));
      receipt = {
        MaPhieu: maPhieu,
        MaDon: maDon,
        LoaiPhieu: 'Cọc',
        SoTien: validatedAmount,
        PhuongThuc: phuongThuc,
        MaGiaoDichNganHang: maGiaoDich,
        TrangThaiThanhToan: 'Đã đặt cọc',
        NgayLap: new Date().toISOString(),
        NguoiLap: currentUser?.MaND || 'ND001',
        GhiChu: ghiChu || `Ghi nhận đặt cọc qua ${phuongThuc}`,
      };
      setPaymentReceipts((prev) => [receipt!, ...prev]);
    }

    const newDaThu = booking.DaThu + validatedAmount;
    const newConLai = Math.max(0, booking.TongTien - newDaThu);

    setBookings((prev) =>
      prev.map((b) =>
        b.MaDon === maDon
          ? {
              ...b,
              DaThu: newDaThu,
              ConLai: newConLai,
              TrangThaiDon: 'Đã xác nhận',
              TrangThaiThanhToan: 'Đã đặt cọc',
            }
          : b
      )
    );

    setRooms((prev) =>
      prev.map((r) => (r.MaPhong === booking.MaPhong ? { ...r, TrangThaiPhong: 'Đã được đặt' } : r))
    );

    const message = validatedAmount > 0
      ? `Xác nhận đặt cọc thành công! Đã lập phiếu ${receipt?.MaPhieu}. Đơn chuyển sang "Đã xác nhận".`
      : `Đơn đã đủ cọc, đã xác nhận đơn ${maDon} thành công mà không cần thu thêm tiền cọc. Đơn chuyển sang "Đã xác nhận".`;

    return {
      success: true,
      message,
      receipt,
    };
  };

  // UC-1.3: Cập nhật đơn đặt phòng (Hỗ trợ Chờ đặt cọc, Đã xác nhận, và Đã check-in khi chỉ đổi dịch vụ)
  const updateBooking = (
    maDon: string,
    data: {
      maPhong?: string;
      ngayNhanPhong?: string;
      ngayTraPhong?: string;
      soKhach?: number;
      yeuCauDacBiet?: string;
    }
  ): { success: boolean; message: string } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    if (
      booking.TrangThaiDon !== 'Chờ đặt cọc' &&
      booking.TrangThaiDon !== 'Đã xác nhận' &&
      booking.TrangThaiDon !== 'Đã check-in'
    ) {
      return {
        success: false,
        message: 'Chỉ cho phép cập nhật đơn đặt phòng ở trạng thái "Chờ đặt cọc", "Đã xác nhận" hoặc "Đã check-in".',
      };
    }

    const newPhong = data.maPhong || booking.MaPhong;
    const newNhan = data.ngayNhanPhong || booking.NgayNhanPhong;
    const newTra = data.ngayTraPhong || booking.NgayTraPhong;
    const newKhach = data.soKhach !== undefined ? data.soKhach : booking.SoKhach;

    const isRoomChanged = newPhong !== booking.MaPhong;
    const isNhanChanged = newNhan !== booking.NgayNhanPhong;
    const isTraChanged = newTra !== booking.NgayTraPhong;
    const isKhachChanged = newKhach !== booking.SoKhach;
    const isReqChanged = (data.yeuCauDacBiet ?? '') !== (booking.YeuCauDacBiet ?? '');

    // Nếu là đơn "Đã check-in": từ chối nếu sửa phòng, ngày nhận/trả hoặc số khách!
    if (booking.TrangThaiDon === 'Đã check-in') {
      if (isRoomChanged || isNhanChanged || isTraChanged || isKhachChanged) {
        return {
          success: false,
          message: 'Đơn đã check-in không được phép thay đổi phòng, ngày hoặc số khách! Chỉ cho phép cập nhật dịch vụ.',
        };
      }
      // Nếu chỉ cập nhật yêu cầu đặc biệt hoặc dịch vụ
      if (isReqChanged) {
        const historyRecord: LichSuThayDoiDon = {
          id: `LS_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          thoiGian: new Date().toISOString(),
          nguoiThucHien: currentUser ? `${currentUser.HoTen} (${currentUser.VaiTro})` : 'Quản lý Homestay',
          noiDungThayDoi: `Cập nhật yêu cầu đặc biệt: "${data.yeuCauDacBiet || 'Không có'}"`,
        };
        setBookings((prev) =>
          prev.map((b) =>
            b.MaDon === maDon
              ? {
                  ...b,
                  YeuCauDacBiet: data.yeuCauDacBiet,
                  lichSuThayDoi: [historyRecord, ...(b.lichSuThayDoi || [])],
                }
              : b
          )
        );
        return {
          success: true,
          message: `Cập nhật ghi chú đơn ${maDon} thành công!`,
        };
      }
      // Nếu không có thay đổi trường nào của booking, hàm này báo không đổi (dịch vụ đã được xử lý riêng nếu có)
      return { success: false, message: 'Không có thay đổi để cập nhật' };
    }

    // Với đơn Chờ đặt cọc hoặc Đã xác nhận:
    if (newNhan >= newTra) {
      return {
        success: false,
        message: 'Không đủ điều kiện thay đổi: Ngày nhận phòng phải trước ngày trả phòng ít nhất 1 đêm.',
      };
    }

    if (newKhach < 1) {
      return {
        success: false,
        message: 'Không đủ điều kiện thay đổi: Số lượng khách phải tối thiểu là 1 người.',
      };
    }

    const room = rooms.find((r) => r.MaPhong === newPhong);
    if (!room) {
      return { success: false, message: `Không đủ điều kiện thay đổi: Không tìm thấy phòng ${newPhong}.` };
    }

    // 1. Kiểm tra sức chứa
    if (newKhach > room.SucChua) {
      return {
        success: false,
        message: `Không đủ điều kiện thay đổi: Phòng ${room.TenPhong} (${newPhong}) có sức chứa tối đa ${room.SucChua} khách, không đủ cho ${newKhach} khách.`,
      };
    }

    // 2. Kiểm tra tính khả dụng phòng
    if (isRoomChanged || isNhanChanged || isTraChanged) {
      const isAvail = checkRoomAvailability(newPhong, newNhan, newTra, maDon);
      if (!isAvail) {
        return {
          success: false,
          message: `Không đủ điều kiện thay đổi: Phòng ${room.TenPhong} (${newPhong}) không còn trống trong khoảng thời gian từ ${formatDate(newNhan)} đến ${formatDate(newTra)}!`,
        };
      }
    }

    const nights = calculateNights(newNhan, newTra);

    // 3. Kiểm tra các dịch vụ đã thêm có bị vượt hạn mức mới không
    const serviceValidation = validateServicesWithinNewBookingLimits(
      { MaDon: maDon, soKhach: newKhach, soDem: nights },
      serviceItemsRef.current
    );
    if (!serviceValidation.valid) {
      return {
        success: false,
        message: `Không đủ điều kiện thay đổi: Dịch vụ "${serviceValidation.exceededService}" trong đơn (${serviceValidation.current}) vượt quá giới hạn tối đa (${serviceValidation.max}) theo lịch trình mới. Vui lòng điều chỉnh số lượng dịch vụ trước.`,
      };
    }

    // 4. Kiểm tra có sự thay đổi nào không
    if (!isRoomChanged && !isNhanChanged && !isTraChanged && !isKhachChanged && !isReqChanged) {
      return { success: false, message: 'Không có thay đổi để cập nhật' };
    }

    // 5. Ghi nhận nội dung thay đổi chi tiết
    const changeLogs: string[] = [];
    if (isRoomChanged) changeLogs.push(`Phòng: ${booking.MaPhong} ➔ ${newPhong} (${room.TenPhong})`);
    if (isNhanChanged || isTraChanged) changeLogs.push(`Thời gian: ${formatDate(booking.NgayNhanPhong)} - ${formatDate(booking.NgayTraPhong)} ➔ ${formatDate(newNhan)} - ${formatDate(newTra)} (${nights} đêm)`);
    if (isKhachChanged) changeLogs.push(`Số khách: ${booking.SoKhach} ➔ ${newKhach} khách`);
    if (isReqChanged) changeLogs.push(`Yêu cầu đặc biệt: "${data.yeuCauDacBiet || 'Không có'}"`);

    const roomPrice = room.GiaPhong * nights;
    const newDepositReq = calculateDeposit(roomPrice, 0.3);
    const newTongTien = roomPrice + booking.TienDichVu;
    const newConLai = Math.max(0, newTongTien - booking.DaThu);

    if (roomPrice !== booking.TienPhong) {
      changeLogs.push(`Tiền phòng: ${formatVND(booking.TienPhong)} ➔ ${formatVND(roomPrice)} (Tổng cộng: ${formatVND(newTongTien)})`);
    }

    const historyRecord: LichSuThayDoiDon = {
      id: `LS_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      thoiGian: new Date().toISOString(),
      nguoiThucHien: currentUser ? `${currentUser.HoTen} (${currentUser.VaiTro})` : 'Quản lý Homestay',
      noiDungThayDoi: changeLogs.join('; '),
    };

    if (isRoomChanged) {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.MaPhong === booking.MaPhong) return { ...r, TrangThaiPhong: 'Sẵn sàng' };
          if (r.MaPhong === newPhong)
            return {
              ...r,
              TrangThaiPhong: booking.TrangThaiDon === 'Đã xác nhận' ? 'Đã được đặt' : 'Tạm giữ',
            };
          return r;
        })
      );
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.MaDon === maDon
          ? {
              ...b,
              MaPhong: newPhong,
              NgayNhanPhong: newNhan,
              NgayTraPhong: newTra,
              SoKhach: newKhach,
              SoDem: nights,
              TienPhong: roomPrice,
              TienCocYeuCau: newDepositReq,
              TongTien: newTongTien,
              ConLai: newConLai,
              YeuCauDacBiet: data.yeuCauDacBiet !== undefined ? data.yeuCauDacBiet : b.YeuCauDacBiet,
              lichSuThayDoi: [historyRecord, ...(b.lichSuThayDoi || [])],
            }
          : b
      )
    );

    return {
      success: true,
      message: `Cập nhật đơn đặt phòng ${maDon} thành công! (${changeLogs.join(' | ')})`,
    };
  };

  // UC-1.4: Hủy đơn đặt phòng
  const cancelBooking = (maDon: string, lyDo?: string): { success: boolean; message: string; eligibleForRefund?: boolean } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    if (booking.TrangThaiDon === 'Đã check-in') {
      return { success: false, message: 'Đơn đã check-in không được phép hủy! Phải tiếp tục quy trình Check-out.' };
    }
    if (booking.TrangThaiDon === 'Đã hoàn thành' || booking.TrangThaiDon === 'Đã hủy') {
      return { success: false, message: 'Đơn đã kết thúc hoặc đã hủy trước đó.' };
    }

    if (booking.TrangThaiDon === 'Chờ đặt cọc' || booking.DaThu === 0) {
      setBookings((prev) =>
        prev.map((b) =>
          b.MaDon === maDon
            ? { ...b, TrangThaiDon: 'Đã hủy', YeuCauDacBiet: `${b.YeuCauDacBiet || ''} [Hủy: ${lyDo || 'Khách hủy hoặc quá hạn cọc'}]` }
            : b
        )
      );
      setRooms((prev) =>
        prev.map((r) => (r.MaPhong === booking.MaPhong ? { ...r, TrangThaiPhong: 'Sẵn sàng' } : r))
      );
      return { success: true, message: `Đã hủy đơn ${maDon}. Phòng được giải phóng. Không phát sinh hoàn cọc.`, eligibleForRefund: false };
    }

    const eligible = isEligibleForRefund48Hours(booking.NgayNhanPhong);

    setBookings((prev) =>
      prev.map((b) =>
        b.MaDon === maDon
          ? {
              ...b,
              TrangThaiDon: 'Đã hủy',
              YeuCauDacBiet: `${b.YeuCauDacBiet || ''} [Hủy: ${lyDo || 'Theo yêu cầu khách'}. ${eligible ? 'Đủ điều kiện hoàn cọc' : 'Không hoàn cọc (< 48h)'}]`,
            }
          : b
      )
    );

    setRooms((prev) =>
      prev.map((r) =>
        r.MaPhong === booking.MaPhong
          ? { ...r, TrangThaiPhong: eligible ? 'Sẵn sàng' : 'Chờ dọn phòng' }
          : r
      )
    );

    if (eligible) {
      return {
        success: true,
        message: `Đã hủy đơn ${maDon}. Đơn đủ điều kiện HOÀN CỌC (hủy trước >= 48 giờ). Vui lòng chuyển khoản hoàn tiền và xác nhận ở chức năng Xử lý hoàn cọc.`,
        eligibleForRefund: true,
      };
    } else {
      return {
        success: true,
        message: `Đã hủy đơn ${maDon}. Hủy dưới 48 giờ trước giờ check-in: KHÔNG HOÀN CỌC theo chính sách. Homestay giữ lại khoản cọc.`,
        eligibleForRefund: false,
      };
    }
  };

  // UC-3.3: Xử lý hoàn cọc
  const processRefund = (
    maDon: string,
    maGiaoDichHoan?: string,
    ghiChu?: string
  ): { success: boolean; message: string; receipt?: PhieuThanhToan } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    if (booking.TrangThaiDon !== 'Đã hủy') {
      return { success: false, message: 'Chỉ có thể xử lý hoàn cọc cho đơn ở trạng thái Đã hủy.' };
    }
    if (booking.TrangThaiThanhToan === 'Đã hoàn tiền') {
      return { success: false, message: 'Đơn này đã được lập phiếu hoàn cọc trước đó!' };
    }
    if (booking.DaThu <= 0) {
      return { success: false, message: 'Đơn chưa có khoản tiền cọc nào được ghi nhận.' };
    }

    const maPhieu = generateMaPhieu(paymentReceipts.map((p) => p.MaPhieu));
    const refundReceipt: PhieuThanhToan = {
      MaPhieu: maPhieu,
      MaDon: maDon,
      LoaiPhieu: 'Hoàn cọc',
      SoTien: booking.DaThu,
      PhuongThuc: 'VietQR',
      MaGiaoDichNganHang: maGiaoDichHoan,
      TrangThaiThanhToan: 'Đã hoàn tiền',
      NgayLap: new Date().toISOString(),
      NguoiLap: currentUser?.MaND || 'ND001',
      GhiChu: ghiChu || `Hoàn cọc theo chính sách hủy trước >= 48h`,
    };

    setPaymentReceipts((prev) => [refundReceipt, ...prev]);

    setBookings((prev) =>
      prev.map((b) =>
        b.MaDon === maDon
          ? {
              ...b,
              TrangThaiThanhToan: 'Đã hoàn tiền',
            }
          : b
      )
    );

    return {
      success: true,
      message: `Đã lập phiếu Hoàn cọc ${maPhieu} (${booking.DaThu.toLocaleString('vi-VN')} ₫). Trạng thái thanh toán: Đã hoàn tiền.`,
      receipt: refundReceipt,
    };
  };

  // UC-1.5: Check-in
  const checkInBooking = (
    maDon: string,
    applyEarlyFee = false
  ): { success: boolean; message: string } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    if (booking.TrangThaiDon !== 'Đã xác nhận') {
      return { success: false, message: 'Chỉ có thể check-in đối với đơn ở trạng thái "Đã xác nhận".' };
    }

    let extraServiceFee = 0;
    const alreadyHasD008 = serviceItemsRef.current.some(
      (it) => it.MaDon === maDon && it.MaDV === 'D008' && it.SoLuong > 0
    );
    if (applyEarlyFee && !alreadyHasD008) {
      const d008 = services.find((s) => s.MaDV === 'D008') || {
        MaDV: 'D008',
        TenDichVu: 'Phụ thu nhận phòng sớm',
        DonGia: 150000,
      };
      extraServiceFee = d008.DonGia;
      const newServiceItem: ChiTietDichVu = {
        id: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        MaDon: maDon,
        MaDV: 'D008',
        TenDichVu: d008.TenDichVu,
        SoLuong: 1,
        DonGiaTaiThoiDiem: d008.DonGia,
        ThanhTien: d008.DonGia,
        ThoiDiemThem: new Date().toISOString(),
        GhiChu: 'Phụ thu check-in sớm trước 14:00',
        GiaiDoan: 'Pre-stay',
      };
      commitServiceItems((prev) => [...prev, newServiceItem]);
    }

    const newTienDichVu = booking.TienDichVu + extraServiceFee;
    const newTongTien = booking.TienPhong + newTienDichVu;
    const newConLai = Math.max(0, newTongTien - booking.DaThu);

    setBookings((prev) =>
      prev.map((b) =>
        b.MaDon === maDon
          ? {
              ...b,
              TrangThaiDon: 'Đã check-in',
              ThoiGianCheckInThucTe: new Date().toISOString(),
              TienDichVu: newTienDichVu,
              TongTien: newTongTien,
              ConLai: newConLai,
            }
          : b
      )
    );

    setRooms((prev) =>
      prev.map((r) => (r.MaPhong === booking.MaPhong ? { ...r, TrangThaiPhong: 'Đang sử dụng' } : r))
    );

    return {
      success: true,
      message: `Check-in thành công cho đơn ${maDon}! Phòng chuyển sang "Đang sử dụng".${applyEarlyFee && extraServiceFee > 0 ? ' (Đã áp dụng phụ thu D008: 150.000 ₫)' : ''}`,
    };
  };

  const noShowBooking = (maDon: string): { success: boolean; message: string } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    setBookings((prev) =>
      prev.map((b) =>
        b.MaDon === maDon
          ? {
              ...b,
              TrangThaiDon: 'No-show',
              YeuCauDacBiet: `${b.YeuCauDacBiet || ''} [Khách không đến nhận phòng, giữ cọc theo quy định]`,
            }
          : b
      )
    );

    setRooms((prev) =>
      prev.map((r) => (r.MaPhong === booking.MaPhong ? { ...r, TrangThaiPhong: 'Chờ dọn phòng' } : r))
    );

    return {
      success: true,
      message: `Đã xác nhận đơn ${maDon} là No-show. Phòng chuyển sang "Chờ dọn phòng". Tiền cọc được giữ lại.`,
    };
  };

  // UC-1.6 & UC-3.2: Check-out và Tất toán
  const checkOutBooking = (
    maDon: string,
    phuongThuc: PhuongThucThanhToan,
    maGiaoDich?: string,
    applyLateFee = false,
    settlementAmount?: number,
    ghiChu?: string
  ): { success: boolean; message: string; invoice?: HoaDon } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    if (booking.TrangThaiDon !== 'Đã check-in') {
      return { success: false, message: 'Chỉ có thể check-out cho đơn đang ở trạng thái "Đã check-in".' };
    }

    let extraServiceFee = 0;
    let lateItem: ChiTietDichVu | null = null;
    const alreadyHasD009 = serviceItemsRef.current.some(
      (it) => it.MaDon === maDon && it.MaDV === 'D009' && it.SoLuong > 0
    );

    if (applyLateFee && !alreadyHasD009) {
      const d009 = services.find((s) => s.MaDV === 'D009') || {
        MaDV: 'D009',
        TenDichVu: 'Phụ thu trả phòng muộn (sau 12:00)',
        DonGia: 150000,
      };
      extraServiceFee = d009.DonGia;
      lateItem = {
        id: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        MaDon: maDon,
        MaDV: 'D009',
        TenDichVu: d009.TenDichVu,
        SoLuong: 1,
        DonGiaTaiThoiDiem: d009.DonGia,
        ThanhTien: d009.DonGia,
        ThoiDiemThem: new Date().toISOString(),
        GhiChu: 'Phụ thu trả phòng muộn sau 12:00',
        GiaiDoan: 'In-house',
      };
      commitServiceItems((prev) => [...prev, lateItem!]);
    }

    const finalTienDichVu = booking.TienDichVu + extraServiceFee;
    const finalTongTien = booking.TienPhong + finalTienDichVu;
    const soConPhaiThu = Math.max(0, finalTongTien - booking.DaThu);

    let receipt: PhieuThanhToan | undefined;

    if (soConPhaiThu > 0) {
      if (settlementAmount === undefined) {
        return { success: false, message: 'Vui lòng nhập số tiền thu tất toán.' };
      }
      const check = validateMoneyAmount(settlementAmount, {
        min: soConPhaiThu,
        max: soConPhaiThu,
        fieldName: 'Số tiền thu tất toán',
      });
      if (!check.valid) {
        return {
          success: false,
          message: `Số tiền nhập phải bằng đúng số còn phải thu (${formatVND(soConPhaiThu)}) để hoàn tất tất toán.`,
        };
      }
      const maPhieu = generateMaPhieu(paymentReceipts.map((p) => p.MaPhieu));
      receipt = {
        MaPhieu: maPhieu,
        MaDon: maDon,
        LoaiPhieu: 'Tất toán',
        SoTien: soConPhaiThu,
        PhuongThuc: phuongThuc,
        MaGiaoDichNganHang: maGiaoDich,
        TrangThaiThanhToan: 'Đã thanh toán',
        NgayLap: new Date().toISOString(),
        NguoiLap: currentUser?.MaND || 'ND001',
        GhiChu: ghiChu || `Tất toán check-out qua ${phuongThuc}`,
      };
      setPaymentReceipts((prev) => [receipt!, ...prev]);
    } else {
      if (settlementAmount !== undefined && settlementAmount > 0) {
        return {
          success: false,
          message: 'Đơn đặt phòng không còn nợ, không ghi nhận thu vượt số còn nợ.',
        };
      }
    }

    const maHoaDon = generateMaHoaDon(invoices.map((h) => h.MaHoaDon));
    const invoice: HoaDon = {
      MaHoaDon: maHoaDon,
      MaDon: maDon,
      TienPhong: booking.TienPhong,
      TienDichVu: finalTienDichVu,
      TienCocDaTra: booking.DaThu,
      TienThanhToanKhiCheckOut: soConPhaiThu,
      TongTienDaThanhToan: finalTongTien,
      PhuongThuc: phuongThuc,
      NgayXuat: new Date().toISOString(),
      NguoiXuat: currentUser?.MaND || 'ND001',
      GhiChu: ghiChu || `Hóa đơn tất toán check-out đơn ${maDon}`,
    };
    setInvoices((prev) => [invoice, ...prev]);

    setBookings((prev) =>
      prev.map((b) =>
        b.MaDon === maDon
          ? {
              ...b,
              TrangThaiDon: 'Đã hoàn thành',
              TrangThaiThanhToan: 'Đã thanh toán',
              ThoiGianCheckOutThucTe: new Date().toISOString(),
              TienDichVu: finalTienDichVu,
              TongTien: finalTongTien,
              DaThu: finalTongTien,
              ConLai: 0,
            }
          : b
      )
    );

    setRooms((prev) =>
      prev.map((r) => (r.MaPhong === booking.MaPhong ? { ...r, TrangThaiPhong: 'Chờ dọn phòng' } : r))
    );

    return {
      success: true,
      message: `Tất toán và Check-out thành công!${receipt ? ` Đã lập phiếu tất toán ${receipt.MaPhieu}.` : ''} Đã lập hóa đơn ${maHoaDon}. Phòng chuyển sang "Chờ dọn phòng".`,
      invoice,
    };
  };

  const cleanRoom = (maPhong: string): { success: boolean; message: string } => {
    setRooms((prev) =>
      prev.map((r) => (r.MaPhong === maPhong ? { ...r, TrangThaiPhong: 'Sẵn sàng' } : r))
    );
    return { success: true, message: `Phòng ${maPhong} đã được dọn sạch và chuyển về trạng thái "Sẵn sàng"!` };
  };

  // Quản lý Dịch vụ
  const createService = (data: Omit<DichVu, 'MaDV'> & { MaDV: string }): { success: boolean; message: string } => {
    const maDV = (data.MaDV || '').trim().toUpperCase();
    if (!maDV) {
      return { success: false, message: 'Vui lòng nhập mã dịch vụ.' };
    }
    if (services.some((s) => s.MaDV.toUpperCase() === maDV)) {
      return { success: false, message: `Mã dịch vụ "${maDV}" đã tồn tại trên hệ thống. Vui lòng nhập mã khác.` };
    }
    if (!data.TenDichVu?.trim()) {
      return { success: false, message: 'Vui lòng nhập tên dịch vụ.' };
    }
    if (!data.DonViTinh?.trim()) {
      return { success: false, message: 'Vui lòng nhập đơn vị tính.' };
    }
    const priceCheck = validateMoneyAmount(data.DonGia, {
      min: MIN_SERVICE_PRICE,
      max: MAX_SERVICE_PRICE,
      fieldName: 'Đơn giá dịch vụ',
    });
    if (!priceCheck.valid) {
      return { success: false, message: priceCheck.error! };
    }
    const newService: DichVu = {
      ...data,
      MaDV: maDV,
      TenDichVu: data.TenDichVu.trim(),
      DonViTinh: data.DonViTinh.trim(),
      DonGia: priceCheck.amount,
      TrangThai: 'Đang hoạt động',
    };
    setServices((prev) => [...prev, newService]);
    return { success: true, message: `Đã thêm mới dịch vụ ${newService.TenDichVu} (Mã: ${maDV}).` };
  };

  const updateService = (maDV: string, data: Partial<DichVu>): { success: boolean; message: string } => {
    if (data.TenDichVu !== undefined) {
      if (!data.TenDichVu.trim()) {
        return { success: false, message: 'Tên dịch vụ không được để trống.' };
      }
    }
    if (data.DonViTinh !== undefined) {
      if (!data.DonViTinh.trim()) {
        return { success: false, message: 'Đơn vị tính không được để trống.' };
      }
    }
    if (data.DonGia !== undefined) {
      const priceCheck = validateMoneyAmount(data.DonGia, {
        min: MIN_SERVICE_PRICE,
        max: MAX_SERVICE_PRICE,
        fieldName: 'Đơn giá dịch vụ',
      });
      if (!priceCheck.valid) {
        return { success: false, message: priceCheck.error! };
      }
    }
    setServices((prev) =>
      prev.map((s) =>
        s.MaDV === maDV
          ? {
              ...s,
              ...data,
              TenDichVu: data.TenDichVu !== undefined ? data.TenDichVu.trim() : s.TenDichVu,
              DonViTinh: data.DonViTinh !== undefined ? data.DonViTinh.trim() : s.DonViTinh,
            }
          : s
      )
    );
    return { success: true, message: `Cập nhật dịch vụ ${maDV} thành công!` };
  };

  const toggleServiceStatus = (maDV: string): { success: boolean; message: string } => {
    let nextStatus: 'Đang hoạt động' | 'Ngừng hoạt động' = 'Đang hoạt động';
    setServices((prev) =>
      prev.map((s) => {
        if (s.MaDV === maDV) {
          nextStatus = s.TrangThai === 'Đang hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động';
          return { ...s, TrangThai: nextStatus };
        }
        return s;
      })
    );
    return {
      success: true,
      message: `Dịch vụ ${maDV} đã chuyển sang trạng thái "${nextStatus}".`,
    };
  };

  // ===== QUẢN LÝ DỊCH VỤ TRONG ĐƠN =====
  const commitServiceItems = (updater: (prev: ChiTietDichVu[]) => ChiTietDichVu[]): ChiTietDichVu[] => {
    const next = updater(serviceItemsRef.current);
    serviceItemsRef.current = next;
    setServiceItems(next);
    return next;
  };

  const recalcBookingTotals = (maDon: string, items?: ChiTietDichVu[]) => {
    const activeItems = items || serviceItemsRef.current;
    const tienDichVu = sumServiceAmount(activeItems, maDon);
    setBookings((prev) =>
      prev.map((b) => {
        if (b.MaDon !== maDon) return b;
        const tongTien = b.TienPhong + tienDichVu;
        return { ...b, TienDichVu: tienDichVu, TongTien: tongTien, ConLai: Math.max(0, tongTien - b.DaThu) };
      })
    );
  };

  // UC-2.4: Thêm dịch vụ vào đơn
  const addServiceToBooking = (
    maDon: string,
    maDV: string,
    soLuong: number,
    ghiChu?: string
  ): { success: boolean; message: string } => {
    const booking = bookings.find((b) => b.MaDon === maDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };

    if (!canEditBookingServices(booking.TrangThaiDon)) {
      return { success: false, message: getServiceLockReason(booking.TrangThaiDon)! };
    }

    const service = services.find((s) => s.MaDV === maDV);
    if (!service) return { success: false, message: 'Không tìm thấy dịch vụ đã chọn.' };
    if (service.TrangThai !== 'Đang hoạt động') {
      return { success: false, message: 'Dịch vụ đã ngừng hoạt động, không thể thêm vào đơn.' };
    }
    if (!Number.isInteger(soLuong) || soLuong < 1) {
      return { success: false, message: 'Số lượng phải là số nguyên từ 1 trở lên.' };
    }
    if (!isServiceAllowedAtStatus(service.ThoiDiemApDung, booking.TrangThaiDon)) {
      return {
        success: false,
        message:
          booking.TrangThaiDon === 'Đã check-in'
            ? 'Dịch vụ này chỉ được thêm trước khi check-in (Chỉ Pre-stay).'
            : 'Dịch vụ này chỉ được thêm khi khách đã check-in (Chỉ In-house).',
      };
    }

    const remaining = getServiceRemainingQuantity(
      maDV,
      { MaDon: maDon, soKhach: booking.SoKhach, soDem: booking.SoDem },
      serviceItemsRef.current
    );
    if (soLuong > remaining) {
      const limitDesc = getServiceLimitDescription(maDV, { soKhach: booking.SoKhach, soDem: booking.SoDem });
      return {
        success: false,
        message: `Vượt quá giới hạn! Dịch vụ này chỉ được thêm tối đa còn lại ${remaining} ${service.DonViTinh} trên đơn (${limitDesc}).`,
      };
    }

    const newItem: ChiTietDichVu = {
      id: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      MaDon: maDon,
      MaDV: maDV,
      TenDichVu: service.TenDichVu,
      SoLuong: soLuong,
      DonGiaTaiThoiDiem: service.DonGia,
      ThanhTien: service.DonGia * soLuong,
      ThoiDiemThem: new Date().toISOString(),
      GhiChu: ghiChu?.trim() || undefined,
      GiaiDoan: booking.TrangThaiDon === 'Đã xác nhận' ? 'Pre-stay' : 'In-house',
    };

    const next = commitServiceItems((prev) => [...prev, newItem]);
    recalcBookingTotals(maDon, next);

    return {
      success: true,
      message: `Đã thêm dịch vụ "${service.TenDichVu}" (${soLuong} ${service.DonViTinh}) vào đơn ${maDon}.`,
    };
  };

  // UC-2.5: Điều chỉnh số lượng dịch vụ
  const updateServiceItemQuantity = (id: string, soLuong: number): { success: boolean; message: string } => {
    const item = serviceItemsRef.current.find((x) => x.id === id);
    if (!item) return { success: false, message: 'Không tìm thấy dòng dịch vụ.' };

    const booking = bookings.find((b) => b.MaDon === item.MaDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };
    if (!canEditBookingServices(booking.TrangThaiDon)) {
      return { success: false, message: getServiceLockReason(booking.TrangThaiDon)! };
    }
    if (!Number.isInteger(soLuong) || soLuong < 1) {
      return { success: false, message: 'Số lượng tối thiểu là 1. Dùng nút Xóa để bỏ dịch vụ khỏi đơn.' };
    }

    const remaining = getServiceRemainingQuantity(
      item.MaDV,
      { MaDon: item.MaDon, soKhach: booking.SoKhach, soDem: booking.SoDem },
      serviceItemsRef.current,
      item.id
    );
    if (soLuong > remaining) {
      return {
        success: false,
        message: `Số lượng ${soLuong} vượt quá giới hạn tối đa cho phép (tối đa còn lại ${remaining} ${item.TenDichVu}).`,
      };
    }

    const next = commitServiceItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, SoLuong: soLuong, ThanhTien: soLuong * x.DonGiaTaiThoiDiem } : x))
    );
    recalcBookingTotals(item.MaDon, next);
    return { success: true, message: `Đã cập nhật số lượng "${item.TenDichVu}" thành ${soLuong}.` };
  };

  // UC-2.5: XÓA dịch vụ khỏi đơn
  const removeServiceFromBooking = (id: string): { success: boolean; message: string } => {
    const item = serviceItemsRef.current.find((x) => x.id === id);
    if (!item) return { success: false, message: 'Không tìm thấy dòng dịch vụ (có thể đã được xóa).' };

    const booking = bookings.find((b) => b.MaDon === item.MaDon);
    if (!booking) return { success: false, message: 'Không tìm thấy đơn đặt phòng.' };
    if (!canEditBookingServices(booking.TrangThaiDon)) {
      return { success: false, message: getServiceLockReason(booking.TrangThaiDon)! };
    }

    const next = commitServiceItems((prev) => prev.filter((x) => x.id !== id));
    recalcBookingTotals(item.MaDon, next);
    return { success: true, message: `Đã xóa dịch vụ "${item.TenDichVu}" khỏi đơn ${item.MaDon}. Tổng tiền đã được tính lại.` };
  };

  // Quản lý Khách hàng - Ràng buộc CCCD, Email, DiaChi bắt buộc (*)
  const createCustomer = (data: Omit<KhachHang, 'MaKH'>): { success: boolean; message: string; maKH?: string } => {
    const val = validateCustomerFull({
      HoTen: data.HoTen,
      SoDienThoai: data.SoDienThoai,
      CCCD: data.CCCD,
      Email: data.Email,
      DiaChi: data.DiaChi,
    });
    if (!val.valid) {
      const firstEntry = Object.entries(val.errors)[0];
      const fieldLabels: Record<string, string> = {
        HoTen: 'Họ và tên',
        SoDienThoai: 'Số điện thoại',
        CCCD: 'CCCD',
        Email: 'Email',
        DiaChi: 'Địa chỉ',
      };
      const fieldName = fieldLabels[firstEntry[0]] || firstEntry[0];
      return { success: false, message: `${fieldName}: ${firstEntry[1]}` };
    }

    const cccdTrimmed = (data.CCCD || '').trim();
    if (cccdTrimmed) {
      const dup = customers.find((c) => (c.CCCD || '').trim() === cccdTrimmed);
      if (dup) {
        return {
          success: false,
          message: `CCCD: Số CCCD "${cccdTrimmed}" đã tồn tại trên hệ thống (Khách hàng: ${dup.MaKH} - ${dup.HoTen}).`,
          maKH: dup.MaKH,
        };
      }
    }

    const maKH = generateMaKH(customers.map((c) => c.MaKH));
    const newCustomer: KhachHang = {
      ...data,
      MaKH: maKH,
      HoTen: data.HoTen.trim(),
      SoDienThoai: val.normalizedPhone,
      CCCD: cccdTrimmed,
      Email: (data.Email || '').trim(),
      DiaChi: (data.DiaChi || '').trim(),
      GhiChu: (data.GhiChu || '').trim() || undefined,
    };

    setCustomers((prev) => [...prev, newCustomer]);
    return { success: true, message: `Tạo hồ sơ khách hàng ${newCustomer.HoTen} (${maKH}) thành công!`, maKH };
  };

  const updateCustomer = (maKH: string, data: Partial<KhachHang>): { success: boolean; message: string } => {
    const existing = customers.find((c) => c.MaKH === maKH);
    if (!existing) {
      return { success: false, message: `Không tìm thấy khách hàng ${maKH} trên hệ thống.` };
    }

    const nextData = {
      HoTen: data.HoTen !== undefined ? data.HoTen : existing.HoTen,
      SoDienThoai: data.SoDienThoai !== undefined ? data.SoDienThoai : existing.SoDienThoai,
      CCCD: data.CCCD !== undefined ? data.CCCD : existing.CCCD,
      Email: data.Email !== undefined ? data.Email : existing.Email,
      DiaChi: data.DiaChi !== undefined ? data.DiaChi : existing.DiaChi,
      GhiChu: data.GhiChu !== undefined ? data.GhiChu : existing.GhiChu,
    };

    const val = validateCustomerFull({
      HoTen: nextData.HoTen,
      SoDienThoai: nextData.SoDienThoai,
      CCCD: nextData.CCCD,
      Email: nextData.Email,
      DiaChi: nextData.DiaChi,
    });
    if (!val.valid) {
      const firstEntry = Object.entries(val.errors)[0];
      const fieldLabels: Record<string, string> = {
        HoTen: 'Họ và tên',
        SoDienThoai: 'Số điện thoại',
        CCCD: 'CCCD',
        Email: 'Email',
        DiaChi: 'Địa chỉ',
      };
      const fieldName = fieldLabels[firstEntry[0]] || firstEntry[0];
      return { success: false, message: `${fieldName}: ${firstEntry[1]}` };
    }

    const isNameSame = (nextData.HoTen || '').trim() === (existing.HoTen || '').trim();
    const isPhoneSame = normalizePhoneNumber(nextData.SoDienThoai) === normalizePhoneNumber(existing.SoDienThoai);
    const isCccdSame = (nextData.CCCD || '').trim() === (existing.CCCD || '').trim();
    const isEmailSame = (nextData.Email || '').trim() === (existing.Email || '').trim();
    const isAddressSame = (nextData.DiaChi || '').trim() === (existing.DiaChi || '').trim();
    const isNoteSame = (nextData.GhiChu || '').trim() === (existing.GhiChu || '').trim();

    if (isNameSame && isPhoneSame && isCccdSame && isEmailSame && isAddressSame && isNoteSame) {
      return { success: false, message: 'Không có thay đổi để cập nhật' };
    }

    const newCccdTrimmed = (nextData.CCCD || '').trim();
    if (newCccdTrimmed) {
      const dup = customers.find((c) => c.MaKH !== maKH && (c.CCCD || '').trim() === newCccdTrimmed);
      if (dup) {
        return {
          success: false,
          message: `CCCD: Số CCCD "${newCccdTrimmed}" đã trùng với khách hàng ${dup.MaKH} (${dup.HoTen}).`,
        };
      }
    }

    const updatedCustomer: KhachHang = {
      ...existing,
      HoTen: nextData.HoTen.trim(),
      SoDienThoai: val.normalizedPhone,
      CCCD: newCccdTrimmed,
      Email: (nextData.Email || '').trim(),
      DiaChi: (nextData.DiaChi || '').trim(),
      GhiChu: (nextData.GhiChu || '').trim() || undefined,
    };

    setCustomers((prev) => prev.map((c) => (c.MaKH === maKH ? updatedCustomer : c)));
    return { success: true, message: `Cập nhật thông tin khách hàng ${maKH} thành công!` };
  };

  // Reset database
  const resetDatabase = () => {
    localStorage.removeItem(`${STORAGE_PREFIX}rooms`);
    localStorage.removeItem(`${STORAGE_PREFIX}users`);
    localStorage.removeItem(`${STORAGE_PREFIX}customers`);
    localStorage.removeItem(`${STORAGE_PREFIX}services`);
    localStorage.removeItem(`${STORAGE_PREFIX}bookings`);
    localStorage.removeItem(`${STORAGE_PREFIX}service_items`);
    localStorage.removeItem(`${STORAGE_PREFIX}payment_receipts`);
    localStorage.removeItem(`${STORAGE_PREFIX}invoices`);
    localStorage.removeItem(`${STORAGE_PREFIX}bank_config`);

    setRooms(INITIAL_ROOMS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setCustomers(INITIAL_CUSTOMERS);
    setServices(INITIAL_SERVICES);
    setBookings(INITIAL_BOOKINGS);
    setServiceItems(INITIAL_SERVICE_ITEMS);
    setPaymentReceipts(INITIAL_PAYMENT_RECEIPTS);
    setInvoices(INITIAL_INVOICES);
    setBankConfig(INITIAL_BANK_CONFIG);
  };

  // Build raw SQL string for real-time download
  const getRawSQL = (): string => {
    const escStr = (str?: string | null): string => {
      if (str === null || str === undefined) return 'NULL';
      return `N'${str.replace(/'/g, "''")}'`;
    };
    const escDate = (d?: string | null): string => {
      if (!d) return 'NULL';
      return `'${d.slice(0, 10)}'`;
    };
    const escDateTime = (dt?: string | null): string => {
      if (!dt) return 'NULL';
      const clean = dt.replace('Z', '').split('.')[0].replace(' ', 'T');
      return `'${clean}'`;
    };

    let sql = `-- ====================================================================\n`;
    sql += `-- CHICSTAY HOMESTAY MANAGEMENT SYSTEM - Microsoft SQL Server (T-SQL)\n`;
    sql += `-- CSDL Microsoft SQL Server (T-SQL) chuan hoa ACID. Chay trong SSMS: Ctrl+A roi Execute (F5).\n`;
    sql += `-- Xuat ban tu he thong Chicstay PMS luc: ${new Date().toISOString()}\n`;
    sql += `-- ====================================================================\n\n`;

    sql += `SET NOCOUNT ON;\n`;
    sql += `IF DB_ID(N'CHICSTAY') IS NULL CREATE DATABASE CHICSTAY;\n`;
    sql += `GO\n`;
    sql += `USE CHICSTAY;\n`;
    sql += `GO\n\n`;

    sql += `-- ------------------------------------------------------------\n`;
    sql += `-- XOA CAC BANG THEO THU TU RANG BUOC KHOA NGOAI\n`;
    sql += `-- ------------------------------------------------------------\n`;
    sql += `IF OBJECT_ID(N'dbo.HOADON', N'U') IS NOT NULL DROP TABLE dbo.HOADON;\n`;
    sql += `IF OBJECT_ID(N'dbo.CHITIETDICHVU', N'U') IS NOT NULL DROP TABLE dbo.CHITIETDICHVU;\n`;
    sql += `IF OBJECT_ID(N'dbo.PHIEUTHANHTOAN', N'U') IS NOT NULL DROP TABLE dbo.PHIEUTHANHTOAN;\n`;
    sql += `IF OBJECT_ID(N'dbo.DONDATPHONG', N'U') IS NOT NULL DROP TABLE dbo.DONDATPHONG;\n`;
    sql += `IF OBJECT_ID(N'dbo.DICHVU', N'U') IS NOT NULL DROP TABLE dbo.DICHVU;\n`;
    sql += `IF OBJECT_ID(N'dbo.KHACHHANG', N'U') IS NOT NULL DROP TABLE dbo.KHACHHANG;\n`;
    sql += `IF OBJECT_ID(N'dbo.NGUOIDUNG', N'U') IS NOT NULL DROP TABLE dbo.NGUOIDUNG;\n`;
    sql += `IF OBJECT_ID(N'dbo.PHONG', N'U') IS NOT NULL DROP TABLE dbo.PHONG;\n`;
    sql += `GO\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: PHONG\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.PHONG (\n`;
    sql += `  MaPhong VARCHAR(10) NOT NULL,\n`;
    sql += `  TenPhong NVARCHAR(100) NOT NULL,\n`;
    sql += `  LoaiPhong NVARCHAR(50) NOT NULL,\n`;
    sql += `  GiaPhong DECIMAL(18,0) NOT NULL,\n`;
    sql += `  SucChua INT NOT NULL,\n`;
    sql += `  TrangThaiPhong NVARCHAR(50) NOT NULL DEFAULT N'Sẵn sàng',\n`;
    sql += `  MoTa NVARCHAR(500) NULL,\n`;
    sql += `  PRIMARY KEY (MaPhong)\n`;
    sql += `);\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: NGUOIDUNG\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.NGUOIDUNG (\n`;
    sql += `  MaND VARCHAR(10) NOT NULL,\n`;
    sql += `  HoTen NVARCHAR(100) NOT NULL,\n`;
    sql += `  Email VARCHAR(100) NOT NULL,\n`;
    sql += `  VaiTro NVARCHAR(50) NOT NULL,\n`;
    sql += `  MatKhau VARCHAR(255) NOT NULL,\n`;
    sql += `  PRIMARY KEY (MaND)\n`;
    sql += `);\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: KHACHHANG\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.KHACHHANG (\n`;
    sql += `  MaKH VARCHAR(10) NOT NULL,\n`;
    sql += `  HoTen NVARCHAR(100) NOT NULL,\n`;
    sql += `  SoDienThoai VARCHAR(15) NOT NULL,\n`;
    sql += `  Email VARCHAR(100) NOT NULL,\n`;
    sql += `  CCCD VARCHAR(20) NOT NULL,\n`;
    sql += `  DiaChi NVARCHAR(255) NOT NULL,\n`;
    sql += `  GhiChu NVARCHAR(500) NULL,\n`;
    sql += `  PRIMARY KEY (MaKH),\n`;
    sql += `  CONSTRAINT CHK_KH_HoTen CHECK (LEN(HoTen) > 0 AND HoTen = LTRIM(RTRIM(HoTen))),\n`;
    sql += `  CONSTRAINT CHK_KH_SoDienThoai CHECK (SoDienThoai LIKE '0[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),\n`;
    sql += `  CONSTRAINT CHK_KH_Email CHECK (Email LIKE '_%@_%._%' AND Email NOT LIKE '% %'),\n`;
    sql += `  CONSTRAINT CHK_KH_CCCD CHECK (LEN(CCCD) = 12 AND CCCD NOT LIKE '%[^0-9]%'),\n`;
    sql += `  CONSTRAINT CHK_KH_DiaChi CHECK (LEN(LTRIM(RTRIM(DiaChi))) > 0)\n`;
    sql += `);\n`;
    sql += `CREATE UNIQUE INDEX UQ_KHACHHANG_CCCD ON dbo.KHACHHANG(CCCD);\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: DICHVU\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.DICHVU (\n`;
    sql += `  MaDV VARCHAR(10) NOT NULL,\n`;
    sql += `  TenDichVu NVARCHAR(100) NOT NULL,\n`;
    sql += `  NhomDichVu NVARCHAR(50) NOT NULL,\n`;
    sql += `  DonViTinh NVARCHAR(20) NOT NULL,\n`;
    sql += `  DonGia DECIMAL(18,0) NOT NULL,\n`;
    sql += `  ThoiDiemApDung NVARCHAR(20) NOT NULL,\n`;
    sql += `  TrangThai NVARCHAR(30) NOT NULL DEFAULT N'Đang hoạt động',\n`;
    sql += `  PRIMARY KEY (MaDV)\n`;
    sql += `);\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: DONDATPHONG\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.DONDATPHONG (\n`;
    sql += `  MaDon VARCHAR(15) NOT NULL,\n`;
    sql += `  MaND VARCHAR(10) NOT NULL,\n`;
    sql += `  MaKH VARCHAR(10) NOT NULL,\n`;
    sql += `  MaPhong VARCHAR(10) NOT NULL,\n`;
    sql += `  NgayNhanPhong DATE NOT NULL,\n`;
    sql += `  NgayTraPhong DATE NOT NULL,\n`;
    sql += `  SoKhach INT NOT NULL,\n`;
    sql += `  SoDem INT NOT NULL,\n`;
    sql += `  TienPhong DECIMAL(18,0) NOT NULL,\n`;
    sql += `  TienCocYeuCau DECIMAL(18,0) NOT NULL,\n`;
    sql += `  TienDichVu DECIMAL(18,0) NOT NULL DEFAULT 0,\n`;
    sql += `  TongTien DECIMAL(18,0) NOT NULL,\n`;
    sql += `  DaThu DECIMAL(18,0) NOT NULL DEFAULT 0,\n`;
    sql += `  ConLai DECIMAL(18,0) NOT NULL DEFAULT 0,\n`;
    sql += `  TrangThaiDon NVARCHAR(30) NOT NULL,\n`;
    sql += `  ThoiGianTaoDon DATETIME NOT NULL,\n`;
    sql += `  ThoiGianCheckInThucTe DATETIME NULL,\n`;
    sql += `  ThoiGianCheckOutThucTe DATETIME NULL,\n`;
    sql += `  YeuCauDacBiet NVARCHAR(500) NULL,\n`;
    sql += `  PRIMARY KEY (MaDon),\n`;
    sql += `  CONSTRAINT FK_Don_NguoiDung FOREIGN KEY (MaND) REFERENCES dbo.NGUOIDUNG (MaND),\n`;
    sql += `  CONSTRAINT FK_Don_KhachHang FOREIGN KEY (MaKH) REFERENCES dbo.KHACHHANG (MaKH),\n`;
    sql += `  CONSTRAINT FK_Don_Phong FOREIGN KEY (MaPhong) REFERENCES dbo.PHONG (MaPhong)\n`;
    sql += `);\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: PHIEUTHANHTOAN\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.PHIEUTHANHTOAN (\n`;
    sql += `  MaPhieu VARCHAR(15) NOT NULL,\n`;
    sql += `  MaDon VARCHAR(15) NOT NULL,\n`;
    sql += `  LoaiPhieu NVARCHAR(20) NOT NULL,\n`;
    sql += `  SoTien DECIMAL(18,0) NOT NULL,\n`;
    sql += `  PhuongThuc NVARCHAR(20) NOT NULL,\n`;
    sql += `  MaGiaoDichNganHang VARCHAR(50) NULL,\n`;
    sql += `  TrangThaiThanhToan NVARCHAR(30) NOT NULL,\n`;
    sql += `  NgayLap DATETIME NOT NULL,\n`;
    sql += `  NguoiLap VARCHAR(10) NOT NULL,\n`;
    sql += `  GhiChu NVARCHAR(255) NULL,\n`;
    sql += `  PRIMARY KEY (MaPhieu),\n`;
    sql += `  CONSTRAINT FK_Phieu_Don FOREIGN KEY (MaDon) REFERENCES dbo.DONDATPHONG (MaDon),\n`;
    sql += `  CONSTRAINT FK_Phieu_NguoiDung FOREIGN KEY (NguoiLap) REFERENCES dbo.NGUOIDUNG (MaND)\n`;
    sql += `);\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: CHITIETDICHVU\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.CHITIETDICHVU (\n`;
    sql += `  MaChiTiet VARCHAR(15) NOT NULL,\n`;
    sql += `  MaDon VARCHAR(15) NOT NULL,\n`;
    sql += `  MaDV VARCHAR(10) NOT NULL,\n`;
    sql += `  SoLuong INT NOT NULL,\n`;
    sql += `  DonGiaTaiThoiDiem DECIMAL(18,0) NOT NULL,\n`;
    sql += `  ThanhTien DECIMAL(18,0) NOT NULL,\n`;
    sql += `  GiaiDoan NVARCHAR(20) NOT NULL DEFAULT N'In-house',\n`;
    sql += `  ThoiDiemThem DATETIME NOT NULL,\n`;
    sql += `  GhiChu NVARCHAR(255) NULL,\n`;
    sql += `  PRIMARY KEY (MaChiTiet),\n`;
    sql += `  CONSTRAINT FK_CTDV_Don FOREIGN KEY (MaDon) REFERENCES dbo.DONDATPHONG (MaDon),\n`;
    sql += `  CONSTRAINT FK_CTDV_DichVu FOREIGN KEY (MaDV) REFERENCES dbo.DICHVU (MaDV)\n`;
    sql += `);\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- TABLE: HOADON\n`;
    sql += `-- ----------------------------\n`;
    sql += `CREATE TABLE dbo.HOADON (\n`;
    sql += `  MaHoaDon VARCHAR(15) NOT NULL,\n`;
    sql += `  MaDon VARCHAR(15) NOT NULL,\n`;
    sql += `  TienPhong DECIMAL(18,0) NOT NULL,\n`;
    sql += `  TienDichVu DECIMAL(18,0) NOT NULL DEFAULT 0,\n`;
    sql += `  TienCocDaTra DECIMAL(18,0) NOT NULL,\n`;
    sql += `  TienThanhToanKhiCheckOut DECIMAL(18,0) NOT NULL,\n`;
    sql += `  TongTienDaThanhToan DECIMAL(18,0) NOT NULL,\n`;
    sql += `  PhuongThuc NVARCHAR(20) NOT NULL,\n`;
    sql += `  NgayXuat DATETIME NOT NULL,\n`;
    sql += `  NguoiXuat VARCHAR(10) NOT NULL,\n`;
    sql += `  GhiChu NVARCHAR(255) NULL,\n`;
    sql += `  PRIMARY KEY (MaHoaDon),\n`;
    sql += `  CONSTRAINT UK_HoaDon_Don UNIQUE (MaDon),\n`;
    sql += `  CONSTRAINT FK_HoaDon_Don FOREIGN KEY (MaDon) REFERENCES dbo.DONDATPHONG (MaDon),\n`;
    sql += `  CONSTRAINT FK_HoaDon_NguoiDung FOREIGN KEY (NguoiXuat) REFERENCES dbo.NGUOIDUNG (MaND)\n`;
    sql += `);\n`;
    sql += `GO\n\n`;

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: PHONG (${rooms.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += rooms
      .map(
        (r) =>
          `INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'${r.MaPhong}', ${escStr(r.TenPhong)}, N'${r.LoaiPhong}', ${r.GiaPhong}, ${r.SucChua}, N'${r.TrangThaiPhong}', ${escStr(r.MoTa)});`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: NGUOIDUNG (${users.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += users
      .map(
        (u) =>
          `INSERT INTO dbo.NGUOIDUNG (MaND, HoTen, Email, VaiTro, MatKhau) VALUES (N'${u.MaND}', ${escStr(u.HoTen)}, '${u.Email}', N'${u.VaiTro}', '${u.MatKhau}');`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: KHACHHANG (${customers.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += customers
      .map(
        (c) =>
          `INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'${c.MaKH}', ${escStr(c.HoTen)}, '${c.SoDienThoai}', ${c.Email ? `'${c.Email}'` : 'NULL'}, ${c.CCCD ? `'${c.CCCD}'` : 'NULL'}, ${escStr(c.DiaChi)}, ${escStr(c.GhiChu)});`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: DICHVU (${services.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += services
      .map(
        (s) =>
          `INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'${s.MaDV}', ${escStr(s.TenDichVu)}, N'${s.NhomDichVu}', N'${s.DonViTinh}', ${s.DonGia}, N'${s.ThoiDiemApDung}', N'${s.TrangThai}');`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: DONDATPHONG (${bookings.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += bookings
      .map(
        (b) =>
          `INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'${b.MaDon}', N'${b.MaND}', N'${b.MaKH}', N'${b.MaPhong}', ${escDate(b.NgayNhanPhong)}, ${escDate(b.NgayTraPhong)}, ${b.SoKhach}, ${b.SoDem}, ${b.TienPhong}, ${b.TienCocYeuCau}, ${b.TienDichVu}, ${b.TongTien}, ${b.DaThu}, ${b.ConLai}, N'${b.TrangThaiDon}', ${escDateTime(b.ThoiGianTaoDon)}, ${escDateTime(b.ThoiGianCheckInThucTe)}, ${escDateTime(b.ThoiGianCheckOutThucTe)}, ${escStr(b.YeuCauDacBiet)});`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: PHIEUTHANHTOAN (${paymentReceipts.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += paymentReceipts
      .map(
        (p) =>
          `INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'${p.MaPhieu}', N'${p.MaDon}', N'${p.LoaiPhieu}', ${p.SoTien}, N'${p.PhuongThuc}', ${p.MaGiaoDichNganHang ? `'${p.MaGiaoDichNganHang}'` : 'NULL'}, N'${p.TrangThaiThanhToan}', ${escDateTime(p.NgayLap)}, N'${p.NguoiLap}', ${escStr(p.GhiChu)});`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: CHITIETDICHVU (${serviceItems.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += serviceItems
      .map(
        (si) =>
          `INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'${si.MaChiTiet || si.id}', N'${si.MaDon}', N'${si.MaDV}', ${si.SoLuong}, ${si.DonGiaTaiThoiDiem}, ${si.ThanhTien}, N'${si.GiaiDoan || 'In-house'}', ${escDateTime(si.ThoiDiemThem)}, ${escStr(si.GhiChu)});`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- INSERT: HOADON (${invoices.length} records)\n`;
    sql += `-- ----------------------------\n`;
    sql += invoices
      .map(
        (h) =>
          `INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'${h.MaHoaDon}', N'${h.MaDon}', ${h.TienPhong}, ${h.TienDichVu}, ${h.TienCocDaTra}, ${h.TienThanhToanKhiCheckOut}, ${h.TongTienDaThanhToan}, N'${h.PhuongThuc}', ${escDateTime(h.NgayXuat)}, N'${h.NguoiXuat}', ${escStr(h.GhiChu)});`
      )
      .join('\n') + '\nGO\n\n';

    sql += `-- ----------------------------\n`;
    sql += `-- KIEM TRA TOAN VEN KET QUA KHOI TAO CSDL\n`;
    sql += `-- ----------------------------\n`;
    sql += `SELECT name AS TenBang FROM sys.tables ORDER BY name;\n`;
    sql += `SELECT \n`;
    sql += `  (SELECT COUNT(*) FROM dbo.PHONG) AS SoPhong,\n`;
    sql += `  (SELECT COUNT(*) FROM dbo.DICHVU) AS SoDichVu,\n`;
    sql += `  (SELECT COUNT(*) FROM dbo.KHACHHANG) AS SoKhach,\n`;
    sql += `  (SELECT COUNT(*) FROM dbo.DONDATPHONG) AS SoDon,\n`;
    sql += `  (SELECT COUNT(*) FROM dbo.PHIEUTHANHTOAN) AS SoPhieuThu,\n`;
    sql += `  (SELECT COUNT(*) FROM dbo.CHITIETDICHVU) AS SoChiTietDV,\n`;
    sql += `  (SELECT COUNT(*) FROM dbo.HOADON) AS SoHoaDon;\n`;
    sql += `GO\n`;

    return sql;
  };

  return (
    <HomestayContext.Provider
      value={{
        currentUser,
        login,
        logout,
        register,
        switchUser,
        users,
        rooms,
        customers,
        services,
        bookings,
        serviceItems,
        paymentReceipts,
        invoices,
        bankConfig,
        updateBankConfig,
        createBooking,
        confirmDeposit,
        updateBooking,
        cancelBooking,
        processRefund,
        checkInBooking,
        noShowBooking,
        checkOutBooking,
        cleanRoom,
        createService,
        updateService,
        toggleServiceStatus,
        addServiceToBooking,
        updateServiceItemQuantity,
        removeServiceFromBooking,
        recalcBookingTotals,
        createCustomer,
        updateCustomer,
        resetDatabase,
        getRawSQL,
        checkRoomAvailability,
        getAvailableRoomsForDates,
        getBookingDetails,
      }}
    >
      {children}
    </HomestayContext.Provider>
  );
};

export const useHomestay = (): HomestayContextType => {
  const ctx = useContext(HomestayContext);
  if (!ctx) throw new Error('useHomestay must be used within HomestayProvider');
  return ctx;
};
