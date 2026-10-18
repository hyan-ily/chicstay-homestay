-- ====================================================================
-- CHICSTAY HOMESTAY MANAGEMENT SYSTEM - MICROSOFT SQL SERVER (T-SQL)
-- Tuong thich: Microsoft SQL Server 2017+, Azure SQL, SQL Server Management Studio (SSMS)
-- Huong dan thuc thi trong SSMS: Nhan Ctrl+A roi nhan F5 (Execute) de chay toan bo script.
-- ====================================================================

SET NOCOUNT ON;
IF DB_ID(N'CHICSTAY') IS NULL
BEGIN
    CREATE DATABASE CHICSTAY;
END;
GO

USE CHICSTAY;
GO

-- ------------------------------------------------------------
-- XOA CAC BANG THEO DUNG THU TU RANG BUOC KHOA NGOAI (DROP FK ORDER)
-- ------------------------------------------------------------
IF OBJECT_ID(N'dbo.HOADON', N'U') IS NOT NULL DROP TABLE dbo.HOADON;
IF OBJECT_ID(N'dbo.CHITIETDICHVU', N'U') IS NOT NULL DROP TABLE dbo.CHITIETDICHVU;
IF OBJECT_ID(N'dbo.PHIEUTHANHTOAN', N'U') IS NOT NULL DROP TABLE dbo.PHIEUTHANHTOAN;
IF OBJECT_ID(N'dbo.DONDATPHONG', N'U') IS NOT NULL DROP TABLE dbo.DONDATPHONG;
IF OBJECT_ID(N'dbo.DICHVU', N'U') IS NOT NULL DROP TABLE dbo.DICHVU;
IF OBJECT_ID(N'dbo.KHACHHANG', N'U') IS NOT NULL DROP TABLE dbo.KHACHHANG;
IF OBJECT_ID(N'dbo.NGUOIDUNG', N'U') IS NOT NULL DROP TABLE dbo.NGUOIDUNG;
IF OBJECT_ID(N'dbo.PHONG', N'U') IS NOT NULL DROP TABLE dbo.PHONG;
GO

-- ------------------------------------------------------------
-- TABLE: dbo.PHONG (Quan ly 12 phong/Bungalow theo kien truc he thong)
-- ------------------------------------------------------------
CREATE TABLE dbo.PHONG (
  MaPhong VARCHAR(10) NOT NULL,
  TenPhong NVARCHAR(100) NOT NULL,
  LoaiPhong NVARCHAR(50) NOT NULL,
  GiaPhong DECIMAL(18,0) NOT NULL,
  SucChua INT NOT NULL,
  TrangThaiPhong NVARCHAR(50) NOT NULL CONSTRAINT DF_PHONG_TrangThai DEFAULT N'Sẵn sàng',
  MoTa NVARCHAR(500) NULL,
  CONSTRAINT PK_PHONG PRIMARY KEY CLUSTERED (MaPhong)
);
GO

-- ------------------------------------------------------------
-- TABLE: dbo.NGUOIDUNG (Quan ly tai khoan nhan su & quan ly homestay)
-- ------------------------------------------------------------
CREATE TABLE dbo.NGUOIDUNG (
  MaND VARCHAR(10) NOT NULL,
  HoTen NVARCHAR(100) NOT NULL,
  Email VARCHAR(100) NOT NULL,
  VaiTro NVARCHAR(50) NOT NULL,
  MatKhau VARCHAR(255) NOT NULL,
  CONSTRAINT PK_NGUOIDUNG PRIMARY KEY CLUSTERED (MaND)
);
GO

-- ------------------------------------------------------------
-- TABLE: dbo.KHACHHANG (Ho so khach hang voi cac CHECK constraint nghiem ngat)
-- ------------------------------------------------------------
CREATE TABLE dbo.KHACHHANG (
  MaKH VARCHAR(10) NOT NULL,
  HoTen NVARCHAR(100) NOT NULL,
  SoDienThoai VARCHAR(15) NOT NULL,
  Email VARCHAR(100) NOT NULL,
  CCCD VARCHAR(20) NOT NULL,
  DiaChi NVARCHAR(255) NOT NULL,
  GhiChu NVARCHAR(500) NULL,
  CONSTRAINT PK_KHACHHANG PRIMARY KEY CLUSTERED (MaKH),
  CONSTRAINT CHK_KH_HoTen CHECK (LEN(HoTen) > 0 AND HoTen = LTRIM(RTRIM(HoTen))),
  CONSTRAINT CHK_KH_SoDienThoai CHECK (SoDienThoai LIKE '0[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  CONSTRAINT CHK_KH_Email CHECK (Email LIKE '_%@_%._%' AND Email NOT LIKE '% %'),
  CONSTRAINT CHK_KH_CCCD CHECK (LEN(CCCD) = 12 AND CCCD NOT LIKE '%[^0-9]%'),
  CONSTRAINT CHK_KH_DiaChi CHECK (LEN(LTRIM(RTRIM(DiaChi))) > 0)
);
GO
CREATE UNIQUE NONCLUSTERED INDEX UQ_KHACHHANG_CCCD ON dbo.KHACHHANG (CCCD);
GO

-- ------------------------------------------------------------
-- TABLE: dbo.DICHVU (Danh muc 12 dich vu homestay - D008 & D009 co DonViTinh = 'Lượt')
-- ------------------------------------------------------------
CREATE TABLE dbo.DICHVU (
  MaDV VARCHAR(10) NOT NULL,
  TenDichVu NVARCHAR(100) NOT NULL,
  NhomDichVu NVARCHAR(50) NOT NULL,
  DonViTinh NVARCHAR(20) NOT NULL,
  DonGia DECIMAL(18,0) NOT NULL,
  ThoiDiemApDung NVARCHAR(20) NOT NULL,
  TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_DICHVU_TrangThai DEFAULT N'Đang hoạt động',
  CONSTRAINT PK_DICHVU PRIMARY KEY CLUSTERED (MaDV)
);
GO

-- ------------------------------------------------------------
-- TABLE: dbo.DONDATPHONG (Don dat phong, chu ky trang thai & tong hop tai chinh)
-- ------------------------------------------------------------
CREATE TABLE dbo.DONDATPHONG (
  MaDon VARCHAR(15) NOT NULL,
  MaND VARCHAR(10) NOT NULL,
  MaKH VARCHAR(10) NOT NULL,
  MaPhong VARCHAR(10) NOT NULL,
  NgayNhanPhong DATE NOT NULL,
  NgayTraPhong DATE NOT NULL,
  SoKhach INT NOT NULL,
  SoDem INT NOT NULL,
  TienPhong DECIMAL(18,0) NOT NULL,
  TienCocYeuCau DECIMAL(18,0) NOT NULL,
  TienDichVu DECIMAL(18,0) NOT NULL CONSTRAINT DF_DONDATPHONG_TienDichVu DEFAULT 0,
  TongTien DECIMAL(18,0) NOT NULL,
  DaThu DECIMAL(18,0) NOT NULL CONSTRAINT DF_DONDATPHONG_DaThu DEFAULT 0,
  ConLai DECIMAL(18,0) NOT NULL CONSTRAINT DF_DONDATPHONG_ConLai DEFAULT 0,
  TrangThaiDon NVARCHAR(30) NOT NULL,
  ThoiGianTaoDon DATETIME NOT NULL,
  ThoiGianCheckInThucTe DATETIME NULL,
  ThoiGianCheckOutThucTe DATETIME NULL,
  YeuCauDacBiet NVARCHAR(500) NULL,
  CONSTRAINT PK_DONDATPHONG PRIMARY KEY CLUSTERED (MaDon),
  CONSTRAINT FK_Don_NguoiDung FOREIGN KEY (MaND) REFERENCES dbo.NGUOIDUNG (MaND),
  CONSTRAINT FK_Don_KhachHang FOREIGN KEY (MaKH) REFERENCES dbo.KHACHHANG (MaKH),
  CONSTRAINT FK_Don_Phong FOREIGN KEY (MaPhong) REFERENCES dbo.PHONG (MaPhong)
);
GO

-- ------------------------------------------------------------
-- TABLE: dbo.PHIEUTHANHTOAN (Phieu thu tien coc, tat toan, hoan coc)
-- ------------------------------------------------------------
CREATE TABLE dbo.PHIEUTHANHTOAN (
  MaPhieu VARCHAR(15) NOT NULL,
  MaDon VARCHAR(15) NOT NULL,
  LoaiPhieu NVARCHAR(20) NOT NULL,
  SoTien DECIMAL(18,0) NOT NULL,
  PhuongThuc NVARCHAR(20) NOT NULL,
  MaGiaoDichNganHang VARCHAR(50) NULL,
  TrangThaiThanhToan NVARCHAR(30) NOT NULL,
  NgayLap DATETIME NOT NULL,
  NguoiLap VARCHAR(10) NOT NULL,
  GhiChu NVARCHAR(255) NULL,
  CONSTRAINT PK_PHIEUTHANHTOAN PRIMARY KEY CLUSTERED (MaPhieu),
  CONSTRAINT FK_Phieu_Don FOREIGN KEY (MaDon) REFERENCES dbo.DONDATPHONG (MaDon),
  CONSTRAINT FK_Phieu_NguoiDung FOREIGN KEY (NguoiLap) REFERENCES dbo.NGUOIDUNG (MaND)
);
GO

-- ------------------------------------------------------------
-- TABLE: dbo.CHITIETDICHVU (Chi tiet su dung dich vu, bao gom cot GiaiDoan)
-- ------------------------------------------------------------
CREATE TABLE dbo.CHITIETDICHVU (
  MaChiTiet VARCHAR(15) NOT NULL,
  MaDon VARCHAR(15) NOT NULL,
  MaDV VARCHAR(10) NOT NULL,
  SoLuong INT NOT NULL,
  DonGiaTaiThoiDiem DECIMAL(18,0) NOT NULL,
  ThanhTien DECIMAL(18,0) NOT NULL,
  GiaiDoan NVARCHAR(20) NOT NULL CONSTRAINT DF_CHITIETDICHVU_GiaiDoan DEFAULT N'In-house',
  ThoiDiemThem DATETIME NOT NULL,
  GhiChu NVARCHAR(255) NULL,
  CONSTRAINT PK_CHITIETDICHVU PRIMARY KEY CLUSTERED (MaChiTiet),
  CONSTRAINT FK_CTDV_Don FOREIGN KEY (MaDon) REFERENCES dbo.DONDATPHONG (MaDon),
  CONSTRAINT FK_CTDV_DichVu FOREIGN KEY (MaDV) REFERENCES dbo.DICHVU (MaDV)
);
GO

-- ------------------------------------------------------------
-- TABLE: dbo.HOADON (Hoa don tong hop xuat khi check-out thanh cong)
-- ------------------------------------------------------------
CREATE TABLE dbo.HOADON (
  MaHoaDon VARCHAR(15) NOT NULL,
  MaDon VARCHAR(15) NOT NULL,
  TienPhong DECIMAL(18,0) NOT NULL,
  TienDichVu DECIMAL(18,0) NOT NULL CONSTRAINT DF_HOADON_TienDichVu DEFAULT 0,
  TienCocDaTra DECIMAL(18,0) NOT NULL,
  TienThanhToanKhiCheckOut DECIMAL(18,0) NOT NULL,
  TongTienDaThanhToan DECIMAL(18,0) NOT NULL,
  PhuongThuc NVARCHAR(20) NOT NULL,
  NgayXuat DATETIME NOT NULL,
  NguoiXuat VARCHAR(10) NOT NULL,
  GhiChu NVARCHAR(255) NULL,
  CONSTRAINT PK_HOADON PRIMARY KEY CLUSTERED (MaHoaDon),
  CONSTRAINT UK_HoaDon_Don UNIQUE (MaDon),
  CONSTRAINT FK_HoaDon_Don FOREIGN KEY (MaDon) REFERENCES dbo.DONDATPHONG (MaDon),
  CONSTRAINT FK_HoaDon_NguoiDung FOREIGN KEY (NguoiXuat) REFERENCES dbo.NGUOIDUNG (MaND)
);
GO

-- ============================================================
-- PHAN THEM DU LIEU KHOI TAO (SEED DATA)
-- ============================================================

-- ----------------------------
-- 1. INSERT: dbo.PHONG (12 records)
-- ----------------------------
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P101', N'Phòng 101', N'Standard', 450000, 2, N'Sẵn sàng', N'Phòng Standard tầng 1, phù hợp cặp đôi / công tác');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P102', N'Phòng 102', N'Standard', 450000, 2, N'Sẵn sàng', N'Phòng Standard tầng 1, gần sảnh');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P103', N'Phòng 103', N'Standard', 480000, 2, N'Sẵn sàng', N'Phòng Standard có cửa sổ lớn');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P104', N'Phòng 104', N'Standard', 480000, 2, N'Sẵn sàng', N'Phòng Standard yên tĩnh');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P201', N'Phòng 201', N'Deluxe', 650000, 2, N'Sẵn sàng', N'Phòng Deluxe có ban công, view đẹp');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P202', N'Phòng 202', N'Deluxe', 650000, 2, N'Sẵn sàng', N'Phòng Deluxe tầng 2');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P203', N'Phòng 203', N'Deluxe', 680000, 2, N'Sẵn sàng', N'Phòng Deluxe tầng cao, yên tĩnh');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P204', N'Phòng 204', N'Deluxe', 700000, 2, N'Sẵn sàng', N'Phòng Deluxe góc, view toàn cảnh');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P301', N'Phòng 301', N'Family', 850000, 4, N'Sẵn sàng', N'Phòng Family 2 giường, phù hợp gia đình');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P302', N'Phòng 302', N'Family', 880000, 4, N'Sẵn sàng', N'Phòng Family rộng, có ghế sofa');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P303', N'Phòng 303', N'Family', 900000, 4, N'Sẵn sàng', N'Phòng Family tầng cao, view đẹp');
INSERT INTO dbo.PHONG (MaPhong, TenPhong, LoaiPhong, GiaPhong, SucChua, TrangThaiPhong, MoTa) VALUES (N'P401', N'Bungalow 01', N'Bungalow', 950000, 3, N'Sẵn sàng', N'Bungalow riêng biệt, có sân BBQ, không gian riêng');
GO

-- ----------------------------
-- 2. INSERT: dbo.NGUOIDUNG (1 records)
-- ----------------------------
INSERT INTO dbo.NGUOIDUNG (MaND, HoTen, Email, VaiTro, MatKhau) VALUES (N'ND001', N'Nguyễn Minh Châu', 'minh.quanly@chicstay.com', N'Quản lý', '1234567');
GO

-- ----------------------------
-- 3. INSERT: dbo.KHACHHANG (45 records)
-- ----------------------------
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH001', N'Bùi Thị An', '0946913810', 'bùi.thị.an18@gmail.com', '034832269481', N'Đà Lạt', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH002', N'Đặng Quốc Bình', '0913999315', 'dang.binh@gmail.com', '034050052120', N'Quảng Ninh', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH003', N'Võ Thanh Hương', '0966306997', 'võ.thanh.hương76@gmail.com', '034253050256', N'Hà Nội', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH004', N'Hồ Minh Tâm', '0955667651', 'hồ.minh.tâm28@gmail.com', '034629821539', N'Nha Trang', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH005', N'Trần Quốc Dũng', '0958181396', 'trần.quốc.dũng78@gmail.com', '034899371430', N'Hà Nội', N'Khách quen');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH006', N'Vũ Thị Hồng Dũng', '0960806024', 'vu.hongdung@gmail.com', '034304820142', N'Nha Trang', N'Dị ứng hải sản');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH007', N'Phạm Thị Bình', '0998753260', 'phạm.thị.bình38@gmail.com', '034130840140', N'Hải Phòng', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH008', N'Trần Quốc Nam', '0970855700', 'trần.quốc.nam47@gmail.com', '034425519849', N'Nha Trang', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH009', N'Bùi Hữu Cường', '0991756179', 'bùi.hữu.cường69@gmail.com', '034419548116', N'Đà Nẵng', N'Yêu cầu giường đôi');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH010', N'Phan Hữu Hương', '0939476249', 'phan.hữu.hương99@gmail.com', '034462436409', N'Hải Phòng', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH011', N'Nguyễn Đức Sơn', '0945935572', 'nguyen.ducson@gmail.com', '034680801999', N'Hải Phòng', N'Khách quen');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH012', N'Vũ Quốc Uyên', '0929175900', 'vũ.quốc.uyên32@gmail.com', '034380026649', N'Đà Lạt', N'Có trẻ nhỏ');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH013', N'Đỗ Thị Lan Tâm', '0988320463', 'đỗ.thị.lan.tâm29@gmail.com', '034939878788', N'Vũng Tàu', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH014', N'Hồ Văn Dũng', '0930514014', 'hồ.văn.dũng88@gmail.com', '034648192232', N'TP. Hồ Chí Minh', N'Yêu cầu giường đôi');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH015', N'Phan Thị Lan Uyên', '0981016525', 'phan.thị.lan.uyên71@gmail.com', '034373620112', N'TP. Hồ Chí Minh', N'Khách quen');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH016', N'Dương Thị Hồng Nam', '0996028436', 'dương.thị.hồng.nam38@gmail.com', '034665994394', N'Vũng Tàu', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH017', N'Đỗ Hữu Yến', '0933978249', 'đỗ.hữu.yến14@gmail.com', '034933616150', N'Cần Thơ', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH018', N'Bùi Thị Hồng Trang', '0936697396', 'bui.hongtrang@gmail.com', '034368618081', N'Đà Lạt', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH019', N'Dương Thị Hồng An', '0990388981', 'dương.thị.hồng.an3@gmail.com', '034472520493', N'Hải Phòng', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH020', N'Phạm Thị Lan Cường', '0921496211', 'phạm.thị.lan.cường9@gmail.com', '034424066816', N'Đà Lạt', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH021', N'Lê Minh Vân', '0983793389', 'le.minhvan@gmail.com', '034461768998', N'Hải Phòng', N'Dị ứng hải sản');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH022', N'Hồ Thanh Oanh', '0963551839', 'hồ.thanh.oanh84@gmail.com', '034640166001', N'Đà Lạt', N'Yêu cầu giường đôi');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH023', N'Trần Thanh Mai', '0918593410', 'trần.thanh.mai76@gmail.com', '034487177987', N'Quảng Ninh', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH024', N'Nguyễn Thị Bình', '0940728046', 'nguyen.thibinh@gmail.com', '034728590908', N'Đà Lạt', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH025', N'Hoàng Anh Lan', '0982374753', 'hoang.anhlan@gmail.com', '034812803930', N'Vũng Tàu', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH026', N'Hồ Anh Tâm', '0935556386', 'ho.anhtam@gmail.com', '034276711930', N'Nha Trang', N'Yêu cầu giường đôi');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH027', N'Phan Anh Bình', '0997705310', 'phan.anh.bình13@gmail.com', '034641960943', N'Nha Trang', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH028', N'Ngô Thị Mai', '0935714784', 'ngo.thimai@gmail.com', '034250635901', N'Huế', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH029', N'Hoàng Anh Mai', '0920117988', 'hoàng.anh.mai71@gmail.com', '034960122341', N'Đà Lạt', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH030', N'Nguyễn Thị Mai', '0932321899', 'nguyễn.thị.mai62@gmail.com', '034640463568', N'Huế', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH031', N'Phan Hữu Uyên', '0948285503', 'phan.hữu.uyên94@gmail.com', '034268767101', N'Đà Lạt', N'Khách quen');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH032', N'Đỗ Anh Hà', '0935487660', 'đỗ.anh.hà8@gmail.com', '034941412032', N'Đà Lạt', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH033', N'Đỗ Đức Bình', '0916729990', 'đỗ.đức.bình65@gmail.com', '034079861243', N'Hà Nội', N'Dị ứng hải sản');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH034', N'Trần Minh Cường', '0989864260', 'tran.minhcuong@gmail.com', '034399523052', N'Huế', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH035', N'Dương Thị Lan Mai', '0987701200', 'dương.thị.lan.mai80@gmail.com', '034913616724', N'Quảng Ninh', N'Dị ứng hải sản');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH036', N'Võ Đức Nam', '0937415205', 'võ.đức.nam41@gmail.com', '034787957213', N'Huế', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH037', N'Bùi Hữu Uyên', '0952436584', 'bùi.hữu.uyên10@gmail.com', '034551183219', N'Quảng Ninh', N'Dị ứng hải sản');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH038', N'Trần Thị Hương', '0938609087', 'trần.thị.hương17@gmail.com', '034260407870', N'TP. Hồ Chí Minh', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH039', N'Huỳnh Hữu Hùng', '0968812137', 'huỳnh.hữu.hùng91@gmail.com', '034314199398', N'Đà Lạt', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH040', N'Bùi Thị Hồng Oanh', '0999038526', 'bui.hongoanh@gmail.com', '034800414661', N'Cần Thơ', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH041', N'Dương Thị Hương', '0930863865', 'dương.thị.hương78@gmail.com', '034883662637', N'Nha Trang', N'Thích phòng yên tĩnh');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH042', N'Bùi Hữu Yến', '0975569635', 'bùi.hữu.yến7@gmail.com', '034181120841', N'Huế', NULL);
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH043', N'Hoàng Văn An', '0954769200', 'hoàng.văn.an82@gmail.com', '034971008994', N'Đà Nẵng', N'Khách quen');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH044', N'Vũ Thị Hồng Tâm', '0985283645', 'vu.hongtam@gmail.com', '034707157168', N'Đà Nẵng', N'Dị ứng hải sản');
INSERT INTO dbo.KHACHHANG (MaKH, HoTen, SoDienThoai, Email, CCCD, DiaChi, GhiChu) VALUES (N'KH045', N'Nguyễn Đức Linh', '0984158663', 'nguyen.duclinh@gmail.com', '034497047298', N'Cần Thơ', N'Có trẻ nhỏ');
GO

-- ----------------------------
-- 4. INSERT: dbo.DICHVU (12 records)
-- ----------------------------
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D001', N'Dịch vụ giặt ủi', N'Tiện ích & Vệ sinh', N'Cân', 20000, N'Chỉ In-house', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D002', N'Đưa đón sân bay Liên Khương', N'Di chuyển & Phương tiện', N'Lượt', 350000, N'Cả hai', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D003', N'Đưa đón bến xe Đà Lạt', N'Di chuyển & Phương tiện', N'Lượt', 150000, N'Cả hai', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D004', N'Ăn sáng tại phòng', N'Ăn uống & Tiện ích', N'Suất', 80000, N'Cả hai', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D005', N'Thuê xe máy (xe số/Tay ga)', N'Di chuyển & Phương tiện', N'Ngày', 150000, N'Cả hai', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D006', N'Giường phụ (Extra Bed)', N'Tiện nghi phòng', N'Đêm', 150000, N'Cả hai', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D007', N'Set BBQ ngoài trời', N'Ăn uống & Trải nghiệm', N'Set', 450000, N'Cả hai', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D008', N'Phụ thu nhận phòng sớm', N'Phụ thu thời gian', N'Lượt', 150000, N'Chỉ Pre-stay', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D009', N'Phụ thu trả phòng muộn', N'Phụ thu thời gian', N'Lượt', 150000, N'Chỉ In-house', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D010', N'Set up Romantic Date', N'Trải nghiệm theo Vibe', N'Gói', 350000, N'Chỉ Pre-stay', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D011', N'Thuê máy chiếu HD / Galaxy Chill', N'Giải trí tại phòng', N'Lượt', 100000, N'Cả hai', N'Đang hoạt động');
INSERT INTO dbo.DICHVU (MaDV, TenDichVu, NhomDichVu, DonViTinh, DonGia, ThoiDiemApDung, TrangThai) VALUES (N'D012', N'Minibar (Nước ngọt + Đồ ăn nhẹ)', N'Minibar', N'Set', 30000, N'Chỉ In-house', N'Đang hoạt động');
GO

-- ----------------------------
-- 5. INSERT: dbo.DONDATPHONG (50 records)
-- ----------------------------
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250001', N'ND001', N'KH023', N'P102', '2025-07-02', '2025-07-03', 2, 1, 450000, 135000, 0, 450000, 0, 450000, N'Chờ đặt cọc', '2025-06-02T10:00:00', NULL, NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250002', N'ND001', N'KH010', N'P202', '2025-07-01', '2025-07-05', 1, 4, 2600000, 780000, 0, 2600000, 0, 2600000, N'Đã hủy', '2025-06-29T14:00:00', NULL, NULL, NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250003', N'ND001', N'KH016', N'P102', '2025-09-09', '2025-09-11', 2, 2, 900000, 270000, 0, 900000, 270000, 630000, N'Đã hủy', '2025-08-11T09:00:00', NULL, NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250004', N'ND001', N'KH002', N'P301', '2025-07-22', '2025-07-25', 3, 3, 2850000, 855000, 0, 2850000, 0, 2850000, N'Đã hủy', '2025-06-26T12:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250005', N'ND001', N'KH002', N'P201', '2025-07-04', '2025-07-05', 2, 1, 650000, 195000, 30000, 680000, 680000, 0, N'Đã hoàn thành', '2025-06-13T10:00:00', '2025-07-04T14:40:00', '2025-07-05T11:27:00', N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250006', N'ND001', N'KH043', N'P301', '2025-08-19', '2025-08-23', 1, 4, 3800000, 1140000, 0, 3800000, 1140000, 2660000, N'Đã check-in', '2025-08-08T08:00:00', '2025-08-19T15:25:00', NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250007', N'ND001', N'KH009', N'P302', '2025-08-25', '2025-08-26', 2, 1, 980000, 294000, 0, 980000, 294000, 686000, N'Đã check-in', '2025-08-14T10:00:00', '2025-08-25T15:46:00', NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250008', N'ND001', N'KH038', N'P401', '2025-07-12', '2025-07-15', 4, 3, 2550000, 765000, 0, 2550000, 765000, 1785000, N'Đã xác nhận', '2025-07-04T08:00:00', NULL, NULL, N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250009', N'ND001', N'KH041', N'P202', '2025-06-12', '2025-06-15', 3, 3, 1950000, 585000, 0, 1950000, 1950000, 0, N'Đã hoàn thành', '2025-05-16T13:00:00', '2025-06-12T14:03:00', '2025-06-15T11:02:00', N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250010', N'ND001', N'KH037', N'P302', '2025-08-29', '2025-08-30', 4, 1, 980000, 294000, 30000, 1010000, 1010000, 0, N'Đã hoàn thành', '2025-08-23T06:00:00', '2025-08-29T14:00:00', '2025-08-30T11:57:00', NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250011', N'ND001', N'KH043', N'P204', '2025-08-11', '2025-08-13', 2, 2, 1400000, 420000, 0, 1400000, 420000, 980000, N'No-show', '2025-07-12T09:00:00', NULL, NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250012', N'ND001', N'KH031', N'P202', '2025-09-05', '2025-09-07', 3, 2, 1300000, 390000, 0, 1300000, 1300000, 0, N'Đã hoàn thành', '2025-08-10T08:00:00', '2025-09-05T15:20:00', '2025-09-07T11:15:00', N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250013', N'ND001', N'KH006', N'P302', '2025-06-30', '2025-07-01', 2, 1, 980000, 294000, 0, 980000, 294000, 686000, N'Đã check-in', '2025-06-26T10:00:00', '2025-06-30T14:42:00', NULL, N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250014', N'ND001', N'KH038', N'P204', '2025-06-03', '2025-06-07', 2, 4, 2800000, 840000, 0, 2800000, 840000, 1960000, N'Đã xác nhận', '2025-05-21T12:00:00', NULL, NULL, N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250015', N'ND001', N'KH015', N'P302', '2025-07-05', '2025-07-07', 4, 2, 1960000, 588000, 0, 1960000, 1960000, 0, N'Đã hoàn thành', '2025-06-23T06:00:00', '2025-07-05T14:51:00', '2025-07-07T11:46:00', NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250016', N'ND001', N'KH043', N'P401', '2025-08-22', '2025-08-23', 2, 1, 850000, 255000, 0, 850000, 255000, 595000, N'Đã hủy', '2025-08-15T16:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250017', N'ND001', N'KH027', N'P103', '2025-06-11', '2025-06-13', 1, 2, 960000, 288000, 0, 960000, 0, 960000, N'Chờ đặt cọc', '2025-06-08T11:00:00', NULL, NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250018', N'ND001', N'KH005', N'P101', '2025-08-23', '2025-08-26', 1, 3, 1350000, 405000, 0, 1350000, 405000, 945000, N'No-show', '2025-08-15T16:00:00', NULL, NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250019', N'ND001', N'KH008', N'P401', '2025-06-28', '2025-06-30', 3, 2, 1700000, 510000, 0, 1700000, 0, 1700000, N'Chờ đặt cọc', '2025-06-21T07:00:00', NULL, NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250020', N'ND001', N'KH008', N'P203', '2025-06-21', '2025-06-24', 1, 3, 2040000, 612000, 0, 2040000, 612000, 1428000, N'Đã xác nhận', '2025-05-21T12:00:00', NULL, NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250021', N'ND001', N'KH038', N'P202', '2025-08-20', '2025-08-23', 1, 3, 1950000, 585000, 0, 1950000, 585000, 1365000, N'Đã check-in', '2025-08-09T06:00:00', '2025-08-20T15:43:00', NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250022', N'ND001', N'KH035', N'P102', '2025-07-18', '2025-07-20', 2, 2, 900000, 270000, 310000, 1210000, 1210000, 0, N'Đã hoàn thành', '2025-07-03T09:00:00', '2025-07-18T14:55:00', '2025-07-20T11:23:00', NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250023', N'ND001', N'KH006', N'P202', '2025-07-28', '2025-07-30', 2, 2, 1300000, 390000, 0, 1300000, 390000, 910000, N'Đã xác nhận', '2025-07-05T10:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250024', N'ND001', N'KH014', N'P203', '2025-07-04', '2025-07-06', 2, 2, 1360000, 408000, 0, 1360000, 408000, 952000, N'Đã hủy', '2025-06-10T12:00:00', NULL, NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250025', N'ND001', N'KH036', N'P103', '2025-08-28', '2025-08-31', 2, 3, 1440000, 432000, 0, 1440000, 432000, 1008000, N'Đã xác nhận', '2025-08-26T15:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250026', N'ND001', N'KH038', N'P103', '2025-08-10', '2025-08-12', 2, 2, 960000, 288000, 0, 960000, 288000, 672000, N'Đã xác nhận', '2025-07-16T08:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250027', N'ND001', N'KH015', N'P301', '2025-06-25', '2025-06-26', 1, 1, 950000, 285000, 0, 950000, 0, 950000, N'Chờ đặt cọc', '2025-05-30T05:00:00', NULL, NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250028', N'ND001', N'KH014', N'P204', '2025-07-06', '2025-07-09', 3, 3, 2100000, 630000, 0, 2100000, 2100000, 0, N'Đã hoàn thành', '2025-07-01T13:00:00', '2025-07-06T14:29:00', '2025-07-09T11:23:00', N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250029', N'ND001', N'KH045', N'P302', '2025-08-21', '2025-08-25', 1, 4, 3920000, 1176000, 0, 3920000, 1176000, 2744000, N'Đã hủy', '2025-08-01T12:00:00', NULL, NULL, N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250030', N'ND001', N'KH031', N'P302', '2025-06-09', '2025-06-10', 4, 1, 980000, 294000, 410000, 1390000, 1390000, 0, N'Đã hoàn thành', '2025-05-18T06:00:00', '2025-06-09T14:19:00', '2025-06-10T11:09:00', NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250031', N'ND001', N'KH028', N'P101', '2025-08-19', '2025-08-21', 1, 2, 900000, 270000, 0, 900000, 270000, 630000, N'No-show', '2025-08-11T06:00:00', NULL, NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250032', N'ND001', N'KH036', N'P302', '2025-06-01', '2025-06-02', 4, 1, 980000, 294000, 0, 980000, 294000, 686000, N'Đã check-in', '2025-05-15T12:00:00', '2025-06-01T14:29:00', NULL, NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250033', N'ND001', N'KH044', N'P204', '2025-07-04', '2025-07-05', 3, 1, 700000, 210000, 0, 700000, 210000, 490000, N'Đã xác nhận', '2025-06-07T13:00:00', NULL, NULL, N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250034', N'ND001', N'KH010', N'P301', '2025-06-22', '2025-06-23', 3, 1, 950000, 285000, 0, 950000, 285000, 665000, N'Đã xác nhận', '2025-06-06T05:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250035', N'ND001', N'KH029', N'P302', '2025-06-06', '2025-06-07', 3, 1, 980000, 294000, 0, 980000, 294000, 686000, N'Đã check-in', '2025-06-04T15:00:00', '2025-06-06T15:26:00', NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250036', N'ND001', N'KH003', N'P204', '2025-06-23', '2025-06-26', 3, 3, 2100000, 630000, 0, 2100000, 630000, 1470000, N'Đã check-in', '2025-05-23T12:00:00', '2025-06-23T15:14:00', NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250037', N'ND001', N'KH023', N'P102', '2025-07-12', '2025-07-14', 1, 2, 900000, 270000, 150000, 1050000, 1050000, 0, N'Đã hoàn thành', '2025-06-18T09:00:00', '2025-07-12T15:24:00', '2025-07-14T12:00:00', N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250038', N'ND001', N'KH027', N'P301', '2025-08-06', '2025-08-07', 4, 1, 950000, 285000, 0, 950000, 285000, 665000, N'Đã check-in', '2025-07-11T16:00:00', '2025-08-06T14:34:00', NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250039', N'ND001', N'KH002', N'P201', '2025-08-17', '2025-08-22', 1, 5, 3250000, 975000, 150000, 3400000, 3400000, 0, N'Đã hoàn thành', '2025-08-15T08:00:00', '2025-08-17T14:11:00', '2025-08-22T11:14:00', N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250040', N'ND001', N'KH031', N'P201', '2025-08-10', '2025-08-11', 2, 1, 650000, 195000, 0, 650000, 650000, 0, N'Đã hoàn thành', '2025-07-20T08:00:00', '2025-08-10T14:17:00', '2025-08-11T11:55:00', NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250041', N'ND001', N'KH020', N'P401', '2025-08-14', '2025-08-17', 2, 3, 2550000, 765000, 0, 2550000, 765000, 1785000, N'Đã xác nhận', '2025-07-28T11:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250042', N'ND001', N'KH016', N'P103', '2025-06-30', '2025-07-02', 1, 2, 960000, 288000, 150000, 1110000, 1110000, 0, N'Đã hoàn thành', '2025-06-13T05:00:00', '2025-06-30T14:49:00', '2025-07-02T11:42:00', N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250043', N'ND001', N'KH010', N'P202', '2025-08-23', '2025-08-25', 1, 2, 1300000, 390000, 0, 1300000, 390000, 910000, N'Đã xác nhận', '2025-08-13T11:00:00', NULL, NULL, N'Có mang theo thú cưng nhỏ');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250044', N'ND001', N'KH035', N'P204', '2025-07-11', '2025-07-13', 3, 2, 1400000, 420000, 0, 1400000, 1400000, 0, N'Đã hoàn thành', '2025-07-07T13:00:00', '2025-07-11T15:27:00', '2025-07-13T11:58:00', NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250045', N'ND001', N'KH020', N'P301', '2025-06-06', '2025-06-10', 1, 4, 3800000, 1140000, 250000, 4050000, 4050000, 0, N'Đã hoàn thành', '2025-05-24T10:00:00', '2025-06-06T14:31:00', '2025-06-10T11:33:00', N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250046', N'ND001', N'KH017', N'P102', '2025-08-25', '2025-08-27', 2, 2, 900000, 270000, 0, 900000, 270000, 630000, N'Đã hủy', '2025-08-02T08:00:00', NULL, NULL, N'Muốn phòng tầng cao');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250047', N'ND001', N'KH017', N'P202', '2025-07-09', '2025-07-11', 2, 2, 1300000, 390000, 0, 1300000, 0, 1300000, N'Đã hủy', '2025-07-04T13:00:00', NULL, NULL, N'Đón sớm nếu được');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250048', N'ND001', N'KH019', N'P302', '2025-09-15', '2025-09-16', 3, 1, 980000, 294000, 380000, 1360000, 1360000, 0, N'Đã hoàn thành', '2025-08-17T06:00:00', '2025-09-15T14:06:00', '2025-09-16T11:58:00', NULL);
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250049', N'ND001', N'KH020', N'P203', '2025-06-05', '2025-06-08', 2, 3, 2040000, 612000, 0, 2040000, 0, 2040000, N'Chờ đặt cọc', '2025-06-01T12:00:00', NULL, NULL, N'Cần thêm gối');
INSERT INTO dbo.DONDATPHONG (MaDon, MaND, MaKH, MaPhong, NgayNhanPhong, NgayTraPhong, SoKhach, SoDem, TienPhong, TienCocYeuCau, TienDichVu, TongTien, DaThu, ConLai, TrangThaiDon, ThoiGianTaoDon, ThoiGianCheckInThucTe, ThoiGianCheckOutThucTe, YeuCauDacBiet) VALUES (N'DP20250050', N'ND001', N'KH027', N'P103', '2025-06-17', '2025-06-18', 2, 1, 480000, 144000, 0, 480000, 144000, 336000, N'Đã xác nhận', '2025-05-17T12:00:00', NULL, NULL, N'Muốn phòng tầng cao');
GO

-- ----------------------------
-- 6. INSERT: dbo.PHIEUTHANHTOAN (60 records)
-- ----------------------------
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00001', N'DP20250002', N'Hoàn cọc', 780000, N'VietQR', 'HOAN920391', N'Đã hoàn tiền', '2025-07-03T14:00:00', N'ND001', N'Hoàn cọc do hủy trước 48 giờ');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00002', N'DP20250003', N'Cọc', 270000, N'VietQR', NULL, N'Đã đặt cọc', '2025-08-11T13:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00003', N'DP20250004', N'Hoàn cọc', 855000, N'VietQR', 'HOAN519093', N'Đã hoàn tiền', '2025-07-01T12:00:00', N'ND001', N'Hoàn cọc do hủy trước 48 giờ');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00004', N'DP20250005', N'Cọc', 195000, N'Tiền mặt', 'VQR101773', N'Đã đặt cọc', '2025-06-13T19:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00005', N'DP20250005', N'Tất toán', 485000, N'Tiền mặt', NULL, N'Đã thanh toán', '2025-07-05T11:27:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00006', N'DP20250006', N'Cọc', 1140000, N'VietQR', NULL, N'Đã đặt cọc', '2025-08-08T13:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00007', N'DP20250007', N'Cọc', 294000, N'Tiền mặt', NULL, N'Đã đặt cọc', '2025-08-14T14:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00008', N'DP20250008', N'Cọc', 765000, N'Tiền mặt', 'VQR397571', N'Đã đặt cọc', '2025-07-04T17:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00009', N'DP20250009', N'Cọc', 585000, N'VietQR', 'VQR905819', N'Đã đặt cọc', '2025-05-16T15:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00010', N'DP20250009', N'Tất toán', 1365000, N'VietQR', NULL, N'Đã thanh toán', '2025-06-15T11:02:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00011', N'DP20250010', N'Cọc', 294000, N'VietQR', NULL, N'Đã đặt cọc', '2025-08-23T10:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00012', N'DP20250010', N'Tất toán', 716000, N'Tiền mặt', NULL, N'Đã thanh toán', '2025-08-30T11:57:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00013', N'DP20250011', N'Cọc', 420000, N'VietQR', 'VQR674485', N'Đã đặt cọc', '2025-07-12T17:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00014', N'DP20250012', N'Cọc', 390000, N'Tiền mặt', 'VQR345884', N'Đã đặt cọc', '2025-08-10T13:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00015', N'DP20250012', N'Tất toán', 910000, N'VietQR', NULL, N'Đã thanh toán', '2025-09-07T11:15:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00016', N'DP20250013', N'Cọc', 294000, N'VietQR', 'VQR316881', N'Đã đặt cọc', '2025-06-26T17:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00017', N'DP20250014', N'Cọc', 840000, N'VietQR', 'VQR870319', N'Đã đặt cọc', '2025-05-21T21:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00018', N'DP20250015', N'Cọc', 588000, N'VietQR', 'VQR752483', N'Đã đặt cọc', '2025-06-23T15:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00019', N'DP20250015', N'Tất toán', 1372000, N'Tiền mặt', 'VQR720644', N'Đã thanh toán', '2025-07-07T11:46:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00020', N'DP20250016', N'Cọc', 255000, N'Tiền mặt', 'VQR453894', N'Đã đặt cọc', '2025-08-15T23:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00021', N'DP20250018', N'Cọc', 405000, N'Tiền mặt', NULL, N'Đã đặt cọc', '2025-08-16T00:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00022', N'DP20250020', N'Cọc', 612000, N'VietQR', NULL, N'Đã đặt cọc', '2025-05-21T16:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00023', N'DP20250021', N'Cọc', 585000, N'Tiền mặt', 'VQR693423', N'Đã đặt cọc', '2025-08-09T07:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00024', N'DP20250022', N'Cọc', 270000, N'VietQR', 'VQR965845', N'Đã đặt cọc', '2025-07-03T19:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00025', N'DP20250022', N'Tất toán', 940000, N'VietQR', NULL, N'Đã thanh toán', '2025-07-20T11:23:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00026', N'DP20250023', N'Cọc', 390000, N'Tiền mặt', 'VQR440802', N'Đã đặt cọc', '2025-07-05T13:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00027', N'DP20250024', N'Cọc', 408000, N'Tiền mặt', NULL, N'Đã đặt cọc', '2025-06-10T19:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00028', N'DP20250025', N'Cọc', 432000, N'Tiền mặt', 'VQR355123', N'Đã đặt cọc', '2025-08-26T20:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00029', N'DP20250026', N'Cọc', 288000, N'VietQR', 'VQR384076', N'Đã đặt cọc', '2025-07-16T13:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00030', N'DP20250028', N'Cọc', 630000, N'Tiền mặt', 'VQR232731', N'Đã đặt cọc', '2025-07-01T18:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00031', N'DP20250028', N'Tất toán', 1470000, N'Tiền mặt', 'VQR680238', N'Đã thanh toán', '2025-07-09T11:23:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00032', N'DP20250029', N'Cọc', 1176000, N'VietQR', NULL, N'Đã đặt cọc', '2025-08-01T13:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00033', N'DP20250030', N'Cọc', 294000, N'Tiền mặt', 'VQR498855', N'Đã đặt cọc', '2025-05-18T14:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00034', N'DP20250030', N'Tất toán', 1096000, N'VietQR', NULL, N'Đã thanh toán', '2025-06-10T11:09:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00035', N'DP20250031', N'Cọc', 270000, N'VietQR', 'VQR264686', N'Đã đặt cọc', '2025-08-11T10:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00036', N'DP20250032', N'Cọc', 294000, N'VietQR', 'VQR837135', N'Đã đặt cọc', '2025-05-15T20:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00037', N'DP20250033', N'Cọc', 210000, N'Tiền mặt', 'VQR779094', N'Đã đặt cọc', '2025-06-07T16:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00038', N'DP20250034', N'Cọc', 285000, N'VietQR', 'VQR624783', N'Đã đặt cọc', '2025-06-06T14:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00039', N'DP20250035', N'Cọc', 294000, N'Tiền mặt', 'VQR804938', N'Đã đặt cọc', '2025-06-04T20:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00040', N'DP20250036', N'Cọc', 630000, N'VietQR', 'VQR615611', N'Đã đặt cọc', '2025-05-23T14:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00041', N'DP20250037', N'Cọc', 270000, N'VietQR', NULL, N'Đã đặt cọc', '2025-06-18T16:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00042', N'DP20250037', N'Tất toán', 780000, N'Tiền mặt', 'VQR668950', N'Đã thanh toán', '2025-07-14T12:00:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00043', N'DP20250038', N'Cọc', 285000, N'Tiền mặt', 'VQR559398', N'Đã đặt cọc', '2025-07-12T00:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00044', N'DP20250039', N'Cọc', 975000, N'VietQR', 'VQR406039', N'Đã đặt cọc', '2025-08-15T17:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00045', N'DP20250039', N'Tất toán', 2425000, N'VietQR', NULL, N'Đã thanh toán', '2025-08-22T11:14:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00046', N'DP20250040', N'Cọc', 195000, N'VietQR', NULL, N'Đã đặt cọc', '2025-07-20T17:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00047', N'DP20250040', N'Tất toán', 455000, N'VietQR', 'VQR396578', N'Đã thanh toán', '2025-08-11T11:55:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00048', N'DP20250041', N'Cọc', 765000, N'VietQR', 'VQR437408', N'Đã đặt cọc', '2025-07-28T15:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00049', N'DP20250042', N'Cọc', 288000, N'VietQR', 'VQR986088', N'Đã đặt cọc', '2025-06-13T13:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00050', N'DP20250042', N'Tất toán', 822000, N'Tiền mặt', 'VQR579123', N'Đã thanh toán', '2025-07-02T11:42:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00051', N'DP20250043', N'Cọc', 390000, N'VietQR', 'VQR993140', N'Đã đặt cọc', '2025-08-13T17:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00052', N'DP20250044', N'Cọc', 420000, N'Tiền mặt', 'VQR555052', N'Đã đặt cọc', '2025-07-07T15:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00053', N'DP20250044', N'Tất toán', 980000, N'Tiền mặt', NULL, N'Đã thanh toán', '2025-07-13T11:58:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00054', N'DP20250045', N'Cọc', 1140000, N'VietQR', 'VQR352528', N'Đã đặt cọc', '2025-05-24T18:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00055', N'DP20250045', N'Tất toán', 2910000, N'Tiền mặt', NULL, N'Đã thanh toán', '2025-06-10T11:33:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00056', N'DP20250046', N'Cọc', 270000, N'VietQR', 'VQR413685', N'Đã đặt cọc', '2025-08-02T15:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00057', N'DP20250047', N'Hoàn cọc', 390000, N'VietQR', 'HOAN702733', N'Đã hoàn tiền', '2025-07-07T13:00:00', N'ND001', N'Hoàn cọc do hủy trước 48 giờ');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00058', N'DP20250048', N'Cọc', 294000, N'VietQR', 'VQR855948', N'Đã đặt cọc', '2025-08-17T09:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00059', N'DP20250048', N'Tất toán', 1066000, N'Tiền mặt', 'VQR777737', N'Đã thanh toán', '2025-09-16T11:58:00', N'ND001', N'Tất toán khi check-out');
INSERT INTO dbo.PHIEUTHANHTOAN (MaPhieu, MaDon, LoaiPhieu, SoTien, PhuongThuc, MaGiaoDichNganHang, TrangThaiThanhToan, NgayLap, NguoiLap, GhiChu) VALUES (N'PT00060', N'DP20250050', N'Cọc', 144000, N'VietQR', 'VQR605254', N'Đã đặt cọc', '2025-05-17T17:00:00', N'ND001', N'Đặt cọc 30% tiền phòng');
GO

-- ----------------------------
-- 7. INSERT: dbo.CHITIETDICHVU (12 records)
-- ----------------------------
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00001', N'DP20250005', N'D007', 1, 30000, 30000, N'In-house', '2025-07-04T23:40:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00002', N'DP20250010', N'D007', 1, 30000, 30000, N'In-house', '2025-08-29T20:00:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00003', N'DP20250022', N'D003', 1, 250000, 250000, N'In-house', '2025-07-19T07:55:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00004', N'DP20250022', N'D007', 2, 30000, 60000, N'In-house', '2025-07-19T10:55:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00005', N'DP20250030', N'D002', 1, 250000, 250000, N'In-house', '2025-06-10T08:19:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00006', N'DP20250030', N'D004', 2, 80000, 160000, N'In-house', '2025-06-10T10:19:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00007', N'DP20250037', N'D008', 1, 150000, 150000, N'Pre-stay', '2025-07-13T02:24:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00008', N'DP20250039', N'D008', 1, 150000, 150000, N'Pre-stay', '2025-08-17T19:11:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00009', N'DP20250042', N'D008', 1, 150000, 150000, N'Pre-stay', '2025-06-30T19:49:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00010', N'DP20250045', N'D003', 1, 250000, 250000, N'In-house', '2025-06-06T17:31:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00011', N'DP20250048', N'D005', 2, 150000, 300000, N'In-house', '2025-09-15T22:06:00', NULL);
INSERT INTO dbo.CHITIETDICHVU (MaChiTiet, MaDon, MaDV, SoLuong, DonGiaTaiThoiDiem, ThanhTien, GiaiDoan, ThoiDiemThem, GhiChu) VALUES (N'CT00012', N'DP20250048', N'D004', 1, 80000, 80000, N'In-house', '2025-09-16T10:06:00', NULL);
GO

-- ----------------------------
-- 8. INSERT: dbo.HOADON (15 records)
-- ----------------------------
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250001', N'DP20250003', 1300000, 100000, 390000, 1010000, 1400000, N'VietQR', '2025-06-18T11:30:00', N'ND001', N'Hóa đơn check-out');
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250002', N'DP20250007', 900000, 0, 270000, 630000, 900000, N'Tiền mặt', '2025-06-22T11:15:00', N'ND001', NULL);
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250003', N'DP20250011', 1950000, 250000, 585000, 1615000, 2200000, N'VietQR', '2025-07-05T12:00:00', N'ND001', N'Có dịch vụ đón sân bay');
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250004', N'DP20250014', 1350000, 80000, 405000, 1025000, 1430000, N'Tiền mặt', '2025-07-12T11:45:00', N'ND001', NULL);
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250005', N'DP20250018', 650000, 0, 195000, 455000, 650000, N'VietQR', '2025-07-19T11:20:00', N'ND001', NULL);
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250006', N'DP20250022', 2600000, 350000, 780000, 2170000, 2950000, N'VietQR', '2025-07-28T12:10:00', N'ND001', N'Spa');
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250007', N'DP20250025', 900000, 150000, 270000, 780000, 1050000, N'Tiền mặt', '2025-08-03T11:00:00', N'ND001', N'Phụ thu trả muộn');
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250008', N'DP20250029', 1360000, 0, 408000, 952000, 1360000, N'VietQR', '2025-08-11T11:40:00', N'ND001', NULL);
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250009', N'DP20250033', 1900000, 200000, 570000, 1530000, 2100000, N'Tiền mặt', '2025-08-20T12:05:00', N'ND001', N'Family + trang trí set romantic');
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250010', N'DP20250036', 700000, 50000, 210000, 540000, 750000, N'VietQR', '2025-08-27T11:25:00', N'ND001', NULL);
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250011', N'DP20250039', 2700000, 0, 810000, 1890000, 2700000, N'VietQR', '2025-09-04T11:50:00', N'ND001', N'Bungalow 3 đêm');
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250012', N'DP20250042', 1300000, 300000, 390000, 1210000, 1600000, N'Tiền mặt', '2025-09-12T12:15:00', N'ND001', N'Có đón + tiễn sân bay');
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250013', N'DP20250045', 980000, 0, 294000, 686000, 980000, N'VietQR', '2025-09-18T11:10:00', N'ND001', NULL);
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250014', N'DP20250048', 1750000, 150000, 525000, 1375000, 1900000, N'Tiền mặt', '2025-09-25T11:55:00', N'ND001', NULL);
INSERT INTO dbo.HOADON (MaHoaDon, MaDon, TienPhong, TienDichVu, TienCocDaTra, TienThanhToanKhiCheckOut, TongTienDaThanhToan, PhuongThuc, NgayXuat, NguoiXuat, GhiChu) VALUES (N'HD20250015', N'DP20250050', 900000, 80000, 270000, 710000, 980000, N'VietQR', '2025-10-02T11:35:00', N'ND001', N'Có bữa sáng');
GO

-- ----------------------------
-- KIEM TRA TOAN VEN KET QUA KHOI TAO CSDL
-- ----------------------------
SELECT name AS TenBang FROM sys.tables ORDER BY name;
SELECT 
  (SELECT COUNT(*) FROM dbo.PHONG) AS SoPhong,
  (SELECT COUNT(*) FROM dbo.DICHVU) AS SoDichVu,
  (SELECT COUNT(*) FROM dbo.KHACHHANG) AS SoKhach,
  (SELECT COUNT(*) FROM dbo.DONDATPHONG) AS SoDon,
  (SELECT COUNT(*) FROM dbo.PHIEUTHANHTOAN) AS SoPhieuThu,
  (SELECT COUNT(*) FROM dbo.CHITIETDICHVU) AS SoChiTietDV,
  (SELECT COUNT(*) FROM dbo.HOADON) AS SoHoaDon;
GO
