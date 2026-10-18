export type TrangThaiPhong = 'Sẵn sàng' | 'Tạm giữ' | 'Đã được đặt' | 'Đang sử dụng' | 'Chờ dọn phòng';

export type TrangThaiDon = 'Chờ đặt cọc' | 'Đã xác nhận' | 'Đã check-in' | 'Đã hoàn thành' | 'Đã hủy' | 'No-show';

export type TrangThaiThanhToan = 'Chưa thanh toán' | 'Đã đặt cọc' | 'Đã thanh toán' | 'Đã hoàn tiền';

export type PhuongThucThanhToan = 'VietQR' | 'Tiền mặt';

export type LoaiPhieu = 'Cọc' | 'Tất toán' | 'Hoàn cọc' | 'Hóa đơn tổng hợp';

export type ThoiDiemApDung = 'Cả hai' | 'Chỉ Pre-stay' | 'Chỉ In-house';

export type NhomDichVu = 
  | 'Ăn uống & Tiện ích'
  | 'Ăn uống & Trải nghiệm'
  | 'Di chuyển & Phương tiện'
  | 'Tiện ích & Vệ sinh'
  | 'Tiện nghi phòng'
  | 'Phụ thu thời gian'
  | 'Trải nghiệm theo Vibe'
  | 'Giải trí tại phòng'
  | 'Minibar';

export interface Phong {
  MaPhong: string; // P101, P102...
  TenPhong: string;
  LoaiPhong: string;
  GiaPhong: number;
  SucChua: number;
  TrangThaiPhong: TrangThaiPhong;
  MoTa?: string;
}

export interface NguoiDung {
  MaND: string;
  HoTen: string;
  Email: string;
  VaiTro: 'Quản lý' | 'Admin';
  MatKhau: string;
}

export interface KhachHang {
  MaKH: string; // KH001, KH002...
  HoTen: string;
  SoDienThoai: string;
  Email?: string;
  CCCD?: string;
  DiaChi?: string;
  GhiChu?: string;
}

export interface DichVu {
  MaDV: string; // D001, D008...
  TenDichVu: string;
  NhomDichVu: NhomDichVu;
  DonViTinh: string;
  DonGia: number;
  ThoiDiemApDung: ThoiDiemApDung;
  TrangThai: 'Đang hoạt động' | 'Ngừng hoạt động';
}

export interface ChiTietDichVu {
  id: string; // internal unique key
  MaChiTiet?: string;
  MaDon: string;
  MaDV: string;
  TenDichVu: string;
  SoLuong: number;
  DonGiaTaiThoiDiem: number;
  ThanhTien: number;
  ThoiDiemThem: string; // ISO datetime
  GhiChu?: string;
  GiaiDoan?: 'Pre-stay' | 'In-house' | 'Cả hai';
}

export interface LichSuThayDoiDon {
  id: string;
  thoiGian: string; // ISO datetime
  nguoiThucHien: string; // HoTen / MaND
  noiDungThayDoi: string;
}

export interface DonDatPhong {
  MaDon: string; // DP2025xxxx / DP2026xxxx
  MaND: string;
  MaKH: string;
  MaPhong: string;
  NgayNhanPhong: string; // YYYY-MM-DD
  NgayTraPhong: string; // YYYY-MM-DD
  SoKhach: number;
  SoDem: number;
  TienPhong: number;
  TienCocYeuCau: number; // 30% of TienPhong rounded to 1,000 VND
  TienDichVu: number;
  TongTien: number; // TienPhong + TienDichVu
  DaThu: number;
  ConLai: number; // TongTien - DaThu
  TrangThaiDon: TrangThaiDon;
  TrangThaiThanhToan: TrangThaiThanhToan;
  ThoiGianTaoDon: string; // ISO datetime
  ThoiGianCheckInThucTe?: string;
  ThoiGianCheckOutThucTe?: string;
  YeuCauDacBiet?: string;
  lichSuThayDoi?: LichSuThayDoiDon[];
  // Computed / expanded helper fields
  tenKhachHang?: string;
  soDienThoai?: string;
  tenPhong?: string;
  loaiPhong?: string;
  dichVuList?: ChiTietDichVu[];
}

export interface PhieuThanhToan {
  MaPhieu: string; // PT00001
  MaDon: string;
  LoaiPhieu: LoaiPhieu;
  SoTien: number;
  PhuongThuc: PhuongThucThanhToan;
  MaGiaoDichNganHang?: string;
  TrangThaiThanhToan: TrangThaiThanhToan;
  NgayLap: string;
  NguoiLap: string;
  GhiChu?: string;
  // Expanded for display
  tenKhachHang?: string;
  tenPhong?: string;
}

export interface HoaDon {
  MaHoaDon: string; // HD2025xxxx / HD2026xxxx
  MaDon: string;
  TienPhong: number;
  TienDichVu: number;
  TienCocDaTra: number;
  TienThanhToanKhiCheckOut: number;
  TongTienDaThanhToan: number;
  PhuongThuc: PhuongThucThanhToan;
  NgayXuat: string;
  NguoiXuat: string;
  GhiChu?: string;
  // Expanded
  tenKhachHang?: string;
  soDienThoai?: string;
  tenPhong?: string;
  ngayNhanPhong?: string;
  ngayTraPhong?: string;
  soDem?: number;
  chiTietDichVu?: ChiTietDichVu[];
}

export interface BankConfig {
  bankName: string;
  accountNo: string;
  accountName: string;
  bankCode: string; // BIN or code for VietQR (e.g. 'ICB' for VietinBank, 'MB' for MBBank, 'VCB' for Vietcombank)
}
