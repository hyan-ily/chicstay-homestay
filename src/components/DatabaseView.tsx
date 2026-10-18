import React, { useState } from 'react';
import {
  Database,
  Download,
  Table,
  Play,
  RotateCcw,
  CheckCircle,
  FileCode,
  Layers,
  Copy,
  Check,
  Code2,
  Terminal,
  Server
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { useToast } from '../context/ToastContext';
import { formatVND, useLockScroll } from '../utils/helpers';

export const DatabaseView: React.FC = () => {
  const {
    rooms,
    users,
    customers,
    services,
    bookings,
    paymentReceipts,
    serviceItems,
    invoices,
    resetDatabase,
    getRawSQL,
  } = useHomestay();
  const { showToast } = useToast();

  const [selectedTable, setSelectedTable] = useState<string>('DONDATPHONG');
  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'erd' | 'code' | 'queries'>('tables');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  useLockScroll(resetConfirmOpen);

  const [selectedQueryIndex, setSelectedQueryIndex] = useState(0);
  const sampleQueries = [
    {
      title: '1. Thống kê tình trạng phòng homestay hiện tại (T-SQL)',
      sql: `-- Thong ke so luong phong theo tung trang thai\nSELECT TrangThaiPhong, COUNT(*) AS SoLuong \nFROM dbo.PHONG \nGROUP BY TrangThaiPhong\nORDER BY SoLuong DESC;`,
      result: [
        { TrangThaiPhong: 'Sẵn sàng', SoLuong: rooms.filter((r) => r.TrangThaiPhong === 'Sẵn sàng').length },
        { TrangThaiPhong: 'Đang sử dụng', SoLuong: rooms.filter((r) => r.TrangThaiPhong === 'Đang sử dụng').length },
        { TrangThaiPhong: 'Đã được đặt', SoLuong: rooms.filter((r) => r.TrangThaiPhong === 'Đã được đặt').length },
        { TrangThaiPhong: 'Tạm giữ', SoLuong: rooms.filter((r) => r.TrangThaiPhong === 'Tạm giữ').length },
        { TrangThaiPhong: 'Chờ dọn phòng', SoLuong: rooms.filter((r) => r.TrangThaiPhong === 'Chờ dọn phòng').length },
      ],
    },
    {
      title: '2. Thống kê tổng doanh thu thực tế theo Loại phiếu thu (T-SQL)',
      sql: `-- Doanh thu theo tung phieu thu (Coc 30%, Tat toan, Hoan coc)\nSELECT LoaiPhieu, COUNT(*) AS SoPhieu, SUM(SoTien) AS TongTienThu \nFROM dbo.PHIEUTHANHTOAN \nGROUP BY LoaiPhieu\nORDER BY TongTienThu DESC;`,
      result: [
        {
          LoaiPhieu: 'Cọc (30%)',
          SoPhieu: paymentReceipts.filter((p) => p.LoaiPhieu === 'Cọc').length,
          TongTienThu: formatVND(paymentReceipts.filter((p) => p.LoaiPhieu === 'Cọc').reduce((s, p) => s + p.SoTien, 0)),
        },
        {
          LoaiPhieu: 'Tất toán khi check-out',
          SoPhieu: paymentReceipts.filter((p) => p.LoaiPhieu === 'Tất toán').length,
          TongTienThu: formatVND(paymentReceipts.filter((p) => p.LoaiPhieu === 'Tất toán').reduce((s, p) => s + p.SoTien, 0)),
        },
        {
          LoaiPhieu: 'Hoàn cọc',
          SoPhieu: paymentReceipts.filter((p) => p.LoaiPhieu === 'Hoàn cọc').length,
          TongTienThu: formatVND(paymentReceipts.filter((p) => p.LoaiPhieu === 'Hoàn cọc').reduce((s, p) => s + p.SoTien, 0)),
        },
      ],
    },
    {
      title: '3. Tra cứu TOP 5 khách hàng chi tiêu nhiều nhất (T-SQL TOP 5)',
      sql: `-- Khach hang VIP co tong gia tri chi tieu cao nhat\nSELECT TOP 5 kh.MaKH, kh.HoTen, kh.SoDienThoai, COUNT(dp.MaDon) AS SoLanDat, SUM(dp.TongTien) AS TongChiTieu\nFROM dbo.KHACHHANG kh\nJOIN dbo.DONDATPHONG dp ON kh.MaKH = dp.MaKH\nGROUP BY kh.MaKH, kh.HoTen, kh.SoDienThoai\nORDER BY TongChiTieu DESC;`,
      result: customers
        .map((c) => {
          const cBookings = bookings.filter((b) => b.MaKH === c.MaKH);
          return {
            MaKH: c.MaKH,
            HoTen: c.HoTen,
            SoDienThoai: c.SoDienThoai,
            SoLanDat: cBookings.length,
            TongChiTieuRaw: cBookings.reduce((sum, b) => sum + b.TongTien, 0),
            TongChiTieu: formatVND(cBookings.reduce((sum, b) => sum + b.TongTien, 0)),
          };
        })
        .sort((a, b) => b.TongChiTieuRaw - a.TongChiTieuRaw)
        .slice(0, 5)
        .map(({ TongChiTieuRaw, ...rest }) => rest),
    },
    {
      title: '4. Kiểm tra dịch vụ phát sinh theo từng đơn đặt phòng (JOIN 3 bảng)',
      sql: `-- Chi tiet dich vu da su dung theo tung don kem don gia tai thoi diem them\nSELECT ct.MaDon, p.TenPhong, dv.TenDichVu, ct.SoLuong, ct.DonGiaTaiThoiDiem, ct.ThanhTien, ct.GiaiDoan\nFROM dbo.CHITIETDICHVU ct\nJOIN dbo.DONDATPHONG dp ON ct.MaDon = dp.MaDon\nJOIN dbo.PHONG p ON dp.MaPhong = p.MaPhong\nJOIN dbo.DICHVU dv ON ct.MaDV = dv.MaDV\nORDER BY ct.MaDon, ct.ThoiDiemThem DESC;`,
      result: serviceItems.slice(0, 6).map((ct) => {
        const dp = bookings.find((b) => b.MaDon === ct.MaDon);
        const p = rooms.find((r) => r.MaPhong === dp?.MaPhong);
        return {
          MaDon: ct.MaDon,
          Phong: p?.TenPhong || dp?.MaPhong || '',
          TenDichVu: ct.TenDichVu,
          SoLuong: ct.SoLuong,
          DonGia: formatVND(ct.DonGiaTaiThoiDiem),
          ThanhTien: formatVND(ct.ThanhTien),
          GiaiDoan: ct.GiaiDoan || 'In-house',
        };
      }),
    },
  ];

  const handleDownloadSQL = () => {
    const rawSql = getRawSQL();
    const blob = new Blob([rawSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'chicstay_database_sqlserver.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống tập tin chicstay_database_sqlserver.sql!', 'success');
  };

  const handleCopySQL = async () => {
    try {
      const rawSql = getRawSQL();
      await navigator.clipboard.writeText(rawSql);
      setCopiedSQL(true);
      showToast('Đã sao chép toàn bộ mã T-SQL (SQL Server) vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopiedSQL(false), 3000);
    } catch {
      showToast('Không thể sao chép, vui lòng tải tập tin SQL.', 'error');
    }
  };

  const renderTableData = () => {
    switch (selectedTable) {
      case 'PHONG':
        return {
          headers: ['MaPhong (PK)', 'TenPhong', 'LoaiPhong', 'GiaPhong', 'SucChua', 'TrangThaiPhong', 'MoTa'],
          rows: rooms.map((r) => [r.MaPhong, r.TenPhong, r.LoaiPhong, formatVND(r.GiaPhong), r.SucChua, r.TrangThaiPhong, r.MoTa || '']),
        };
      case 'NGUOIDUNG':
        return {
          headers: ['MaND (PK)', 'HoTen', 'Email', 'VaiTro', 'MatKhau'],
          rows: users.map((u) => [u.MaND, u.HoTen, u.Email, u.VaiTro, '******']),
        };
      case 'KHACHHANG':
        return {
          headers: ['MaKH (PK)', 'HoTen', 'SoDienThoai', 'Email', 'CCCD (UQ)', 'DiaChi', 'GhiChu'],
          rows: customers.map((c) => [c.MaKH, c.HoTen, c.SoDienThoai, c.Email || '', c.CCCD || '', c.DiaChi || '', c.GhiChu || '']),
        };
      case 'DICHVU':
        return {
          headers: ['MaDV (PK)', 'TenDichVu', 'NhomDichVu', 'DonViTinh', 'DonGia', 'ThoiDiemApDung', 'TrangThai'],
          rows: services.map((s) => [s.MaDV, s.TenDichVu, s.NhomDichVu, s.DonViTinh, formatVND(s.DonGia), s.ThoiDiemApDung, s.TrangThai]),
        };
      case 'DONDATPHONG':
        return {
          headers: ['MaDon (PK)', 'MaND (FK)', 'MaKH (FK)', 'MaPhong (FK)', 'NgayNhan', 'NgayTra', 'SoDem', 'TienPhong', 'TienCocYeuCau', 'TienDichVu', 'TongTien', 'DaThu', 'ConLai', 'TrangThaiDon'],
          rows: bookings.map((b) => [
            b.MaDon,
            b.MaND,
            b.MaKH,
            b.MaPhong,
            b.NgayNhanPhong,
            b.NgayTraPhong,
            b.SoDem,
            formatVND(b.TienPhong),
            formatVND(b.TienCocYeuCau),
            formatVND(b.TienDichVu),
            formatVND(b.TongTien),
            formatVND(b.DaThu),
            formatVND(b.ConLai),
            b.TrangThaiDon,
          ]),
        };
      case 'PHIEUTHANHTOAN':
        return {
          headers: ['MaPhieu (PK)', 'MaDon (FK)', 'LoaiPhieu', 'SoTien', 'PhuongThuc', 'MaGiaoDichNganHang', 'TrangThaiThanhToan', 'NgayLap', 'NguoiLap'],
          rows: paymentReceipts.map((p) => [
            p.MaPhieu,
            p.MaDon,
            p.LoaiPhieu,
            formatVND(p.SoTien),
            p.PhuongThuc,
            p.MaGiaoDichNganHang || '',
            p.TrangThaiThanhToan,
            p.NgayLap.substring(0, 16),
            p.NguoiLap,
          ]),
        };
      case 'CHITIETDICHVU':
        return {
          headers: ['MaChiTiet (PK)', 'MaDon (FK)', 'MaDV (FK)', 'TenDichVu', 'SoLuong', 'DonGiaTaiThoiDiem', 'ThanhTien', 'GiaiDoan', 'ThoiDiemThem'],
          rows: serviceItems.map((c) => [
            c.MaChiTiet || c.id,
            c.MaDon,
            c.MaDV,
            c.TenDichVu,
            c.SoLuong,
            formatVND(c.DonGiaTaiThoiDiem),
            formatVND(c.ThanhTien),
            c.GiaiDoan || 'In-house',
            c.ThoiDiemThem.substring(0, 16),
          ]),
        };
      case 'HOADON':
        return {
          headers: ['MaHoaDon (PK)', 'MaDon (FK/UK)', 'TienPhong', 'TienDichVu', 'TienCocDaTra', 'TienCheckOut', 'TongTienDaThanhToan', 'PhuongThuc', 'NgayXuat'],
          rows: invoices.map((h) => [
            h.MaHoaDon,
            h.MaDon,
            formatVND(h.TienPhong),
            formatVND(h.TienDichVu),
            formatVND(h.TienCocDaTra),
            formatVND(h.TienThanhToanKhiCheckOut),
            formatVND(h.TongTienDaThanhToan),
            h.PhuongThuc,
            h.NgayXuat.substring(0, 16),
          ]),
        };
      default:
        return { headers: [], rows: [] };
    }
  };

  const currentTableData = renderTableData();

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
              <Server className="w-3 h-3" /> Microsoft SQL Server (T-SQL)
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              SSMS Compatible · Database: CHICSTAY
            </span>
          </div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5 leading-tight mt-1">
            <Database className="w-7 h-7 text-blue-600" />
            CƠ SỞ DỮ LIỆU SQL SERVER (8 BẢNG QUAN HỆ)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Duyệt dữ liệu thực tế, kiểm tra toàn vẹn ràng buộc khóa ngoại (PK/FK/CHECK) và tải tập tin chicstay_database_sqlserver.sql
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySQL}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Sao chép toàn bộ mã T-SQL để dán vào SSMS"
          >
            {copiedSQL ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Đã sao chép T-SQL</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Sao Chép T-SQL</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadSQL}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>TẢI TẬP TIN chicstay_database_sqlserver.sql</span>
          </button>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Khôi phục CSDL gốc (Factory Reset)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('tables')}
          className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'tables'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Duyệt Dữ Liệu Các Bảng (Live Table)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('erd')}
          className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'erd'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sơ Đồ Thực Thể Quan Hệ (ERD & Ràng Buộc T-SQL)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('code')}
          className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'code'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Mã Nguồn CSDL T-SQL (SQL Server Script)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('queries')}
          className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'queries'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Truy Vấn Mẫu (T-SQL Queries)</span>
        </button>
      </div>

      {activeSubTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            {[
              { name: 'DONDATPHONG', label: '1. dbo.DONDATPHONG', count: bookings.length },
              { name: 'PHONG', label: '2. dbo.PHONG', count: rooms.length },
              { name: 'KHACHHANG', label: '3. dbo.KHACHHANG', count: customers.length },
              { name: 'DICHVU', label: '4. dbo.DICHVU', count: services.length },
              { name: 'PHIEUTHANHTOAN', label: '5. dbo.PHIEUTHANHTOAN', count: paymentReceipts.length },
              { name: 'CHITIETDICHVU', label: '6. dbo.CHITIETDICHVU', count: serviceItems.length },
              { name: 'HOADON', label: '7. dbo.HOADON', count: invoices.length },
              { name: 'NGUOIDUNG', label: '8. dbo.NGUOIDUNG', count: users.length },
            ].map((tbl) => (
              <button
                key={tbl.name}
                type="button"
                onClick={() => setSelectedTable(tbl.name)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedTable === tbl.name
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-white/60'
                }`}
              >
                <span>{tbl.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedTable === tbl.name ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tbl.count}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-slate-700">
                BẢNG SQL SERVER: <strong className="text-blue-700">dbo.{selectedTable}</strong> ({currentTableData.rows.length} bản ghi)
              </span>
              <span className="text-slate-400 text-[11px]">Đồng bộ dữ liệu thời gian thực (State Synchronized)</span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    {currentTableData.headers.map((h, idx) => (
                      <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentTableData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={currentTableData.headers.length} className="py-8 text-center text-slate-400">
                        Chưa có bản ghi nào trong bảng này.
                      </td>
                    </tr>
                  ) : (
                    currentTableData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                        {row.map((cell: any, cIdx: number) => (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap tabular-nums text-slate-800">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'erd' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Server className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Kiến trúc Cơ sở dữ liệu Microsoft SQL Server (T-SQL):</strong> Tất cả các bảng được đặt trong schema <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">dbo</code>, chuẩn hóa theo nguyên lý ACID, sử dụng kiểu dữ liệu <code className="font-mono bg-white px-1 py-0.5 rounded">NVARCHAR</code> cho tiếng Việt có dấu, <code className="font-mono bg-white px-1 py-0.5 rounded">DECIMAL(18,0)</code> cho tiền tệ, các ràng buộc toàn vẹn khóa ngoại (FK) và <code className="font-mono bg-white px-1 py-0.5 rounded">CHECK constraint</code> kiểm tra định dạng dữ liệu tự động.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                table: 'dbo.PHONG',
                pk: 'MaPhong VARCHAR(10)',
                fk: '',
                constraints: ['TrangThaiPhong DEFAULT N\'Sẵn sàng\''],
                fields: [
                  'TenPhong: NVARCHAR(100) NOT NULL',
                  'LoaiPhong: NVARCHAR(50) NOT NULL',
                  'GiaPhong: DECIMAL(18,0) NOT NULL',
                  'SucChua: INT NOT NULL',
                  'TrangThaiPhong: NVARCHAR(50) NOT NULL',
                  'MoTa: NVARCHAR(500) NULL',
                ],
              },
              {
                table: 'dbo.NGUOIDUNG',
                pk: 'MaND VARCHAR(10)',
                fk: '',
                constraints: ['Email: VARCHAR(100) NOT NULL'],
                fields: [
                  'HoTen: NVARCHAR(100) NOT NULL',
                  'Email: VARCHAR(100) NOT NULL',
                  'VaiTro: NVARCHAR(50) NOT NULL',
                  'MatKhau: VARCHAR(255) NOT NULL',
                ],
              },
              {
                table: 'dbo.KHACHHANG',
                pk: 'MaKH VARCHAR(10)',
                fk: '',
                constraints: [
                  'CHK_KH_HoTen: LEN(HoTen) > 0 & LTRIM',
                  'CHK_KH_SoDienThoai: LIKE \'0[0-9]{9}\'',
                  'CHK_KH_Email: Email format & NOT NULL',
                  'CHK_KH_CCCD: LEN = 12 & number & NOT NULL',
                  'CHK_KH_DiaChi: NOT NULL',
                  'UQ_KHACHHANG_CCCD: UNIQUE',
                ],
                fields: [
                  'HoTen: NVARCHAR(100) NOT NULL',
                  'SoDienThoai: VARCHAR(15) NOT NULL',
                  'Email: VARCHAR(100) NOT NULL',
                  'CCCD: VARCHAR(20) NOT NULL',
                  'DiaChi: NVARCHAR(255) NOT NULL',
                  'GhiChu: NVARCHAR(500) NULL',
                ],
              },
              {
                table: 'dbo.DICHVU',
                pk: 'MaDV VARCHAR(10)',
                fk: '',
                constraints: [
                  'TrangThai DEFAULT N\'Đang hoạt động\'',
                  'DonViTinh: N\'Lượt\' cho D008 & D009',
                ],
                fields: [
                  'TenDichVu: NVARCHAR(100) NOT NULL',
                  'NhomDichVu: NVARCHAR(50) NOT NULL',
                  'DonViTinh: NVARCHAR(20) NOT NULL',
                  'DonGia: DECIMAL(18,0) NOT NULL',
                  'ThoiDiemApDung: NVARCHAR(20) NOT NULL',
                  'TrangThai: NVARCHAR(30) NOT NULL',
                ],
              },
              {
                table: 'dbo.DONDATPHONG',
                pk: 'MaDon VARCHAR(15)',
                fk: 'MaND, MaKH, MaPhong',
                constraints: [
                  'FK_Don_NguoiDung -> NGUOIDUNG(MaND)',
                  'FK_Don_KhachHang -> KHACHHANG(MaKH)',
                  'FK_Don_Phong -> PHONG(MaPhong)',
                  'TienDichVu, DaThu, ConLai DEFAULT 0',
                ],
                fields: [
                  'NgayNhanPhong: DATE NOT NULL',
                  'NgayTraPhong: DATE NOT NULL',
                  'SoKhach: INT NOT NULL',
                  'SoDem: INT NOT NULL',
                  'TienPhong: DECIMAL(18,0) NOT NULL',
                  'TienCocYeuCau: DECIMAL(18,0) NOT NULL',
                  'TienDichVu: DECIMAL(18,0) NOT NULL',
                  'TongTien: DECIMAL(18,0) NOT NULL',
                  'DaThu: DECIMAL(18,0) NOT NULL',
                  'ConLai: DECIMAL(18,0) NOT NULL',
                  'TrangThaiDon: NVARCHAR(30) NOT NULL',
                  'ThoiGianTaoDon: DATETIME NOT NULL',
                  'ThoiGianCheckInThucTe: DATETIME NULL',
                  'ThoiGianCheckOutThucTe: DATETIME NULL',
                  'YeuCauDacBiet: NVARCHAR(500) NULL',
                ],
              },
              {
                table: 'dbo.PHIEUTHANHTOAN',
                pk: 'MaPhieu VARCHAR(15)',
                fk: 'MaDon, NguoiLap',
                constraints: [
                  'FK_Phieu_Don -> DONDATPHONG(MaDon)',
                  'FK_Phieu_NguoiDung -> NGUOIDUNG(MaND)',
                ],
                fields: [
                  'LoaiPhieu: NVARCHAR(20) NOT NULL',
                  'SoTien: DECIMAL(18,0) NOT NULL',
                  'PhuongThuc: NVARCHAR(20) NOT NULL',
                  'MaGiaoDichNganHang: VARCHAR(50) NULL',
                  'TrangThaiThanhToan: NVARCHAR(30) NOT NULL',
                  'NgayLap: DATETIME NOT NULL',
                  'NguoiLap: VARCHAR(10) NOT NULL',
                  'GhiChu: NVARCHAR(255) NULL',
                ],
              },
              {
                table: 'dbo.CHITIETDICHVU',
                pk: 'MaChiTiet VARCHAR(15)',
                fk: 'MaDon, MaDV',
                constraints: [
                  'FK_CTDV_Don -> DONDATPHONG(MaDon)',
                  'FK_CTDV_DichVu -> DICHVU(MaDV)',
                  'GiaiDoan DEFAULT N\'In-house\'',
                ],
                fields: [
                  'SoLuong: INT NOT NULL',
                  'DonGiaTaiThoiDiem: DECIMAL(18,0) NOT NULL',
                  'ThanhTien: DECIMAL(18,0) NOT NULL',
                  'GiaiDoan: NVARCHAR(20) NOT NULL',
                  'ThoiDiemThem: DATETIME NOT NULL',
                  'GhiChu: NVARCHAR(255) NULL',
                ],
              },
              {
                table: 'dbo.HOADON',
                pk: 'MaHoaDon VARCHAR(15)',
                fk: 'MaDon, NguoiXuat',
                constraints: [
                  'UK_HoaDon_Don: UNIQUE(MaDon)',
                  'FK_HoaDon_Don -> DONDATPHONG(MaDon)',
                  'FK_HoaDon_NguoiDung -> NGUOIDUNG(MaND)',
                ],
                fields: [
                  'TienPhong: DECIMAL(18,0) NOT NULL',
                  'TienDichVu: DECIMAL(18,0) NOT NULL',
                  'TienCocDaTra: DECIMAL(18,0) NOT NULL',
                  'TienThanhToanKhiCheckOut: DECIMAL(18,0)',
                  'TongTienDaThanhToan: DECIMAL(18,0)',
                  'PhuongThuc: NVARCHAR(20) NOT NULL',
                  'NgayXuat: DATETIME NOT NULL',
                  'NguoiXuat: VARCHAR(10) NOT NULL',
                  'GhiChu: NVARCHAR(255) NULL',
                ],
              },
            ].map((item) => (
              <div key={item.table} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-mono font-extrabold text-blue-700 text-sm">
                      {item.table}
                    </span>
                    <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                      T-SQL
                    </span>
                  </div>
                  <div className="text-xs space-y-1 mt-2.5">
                    <div className="font-mono text-emerald-700 font-bold">
                      PK: {item.pk}
                    </div>
                    {item.fk && (
                      <div className="font-mono text-amber-700 font-semibold text-[11px]">
                        FK: {item.fk}
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 space-y-0.5 text-[11px] text-slate-500 font-mono">
                      {item.fields.map((f, i) => (
                        <div key={i}>{f}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {item.constraints && item.constraints.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 space-y-0.5 text-[10px] text-slate-600 font-mono bg-slate-50 p-2 rounded-lg">
                    <span className="font-bold text-slate-700 block font-sans uppercase text-[9px]">Ràng buộc (Constraints):</span>
                    {item.constraints.map((c, i) => (
                      <div key={i} className="text-blue-800">• {c}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'code' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl text-xs text-white">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-emerald-300">chicstay_database_sqlserver.sql</span>
              <span className="text-slate-400 text-[11px]">· Microsoft SQL Server T-SQL (SSMS Ready)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySQL}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
              >
                {copiedSQL ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadSQL}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tập tin</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-slate-100 font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed">
            <pre className="whitespace-pre">{getRawSQL()}</pre>
          </div>
        </div>
      )}

      {activeSubTab === 'queries' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedQueryIndex(idx)}
                className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  selectedQueryIndex === idx
                    ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {q.title}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 rounded-xl p-4 text-emerald-400 font-mono text-xs space-y-2">
            <span className="text-slate-400 text-[10px] uppercase font-sans font-bold block flex items-center gap-1.5">
              <Play className="w-3 h-3 text-emerald-400" /> Câu lệnh T-SQL chạy thử nghiệm:
            </span>
            <pre className="whitespace-pre-wrap">{sampleQueries[selectedQueryIndex].sql}</pre>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
              <span>Kết Quả Trả Về ({sampleQueries[selectedQueryIndex].result.length} hàng):</span>
              <span className="text-slate-400 text-[11px] font-normal">Mô phỏng truy vấn thực tế</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-slate-800">
                {JSON.stringify(sampleQueries[selectedQueryIndex].result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative isolate">
            <div className="flex-shrink-0 bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Khôi phục CSDL gốc?
                </h3>
              </div>
            </div>

            <div className="p-5 text-xs text-slate-600 space-y-3">
              <p>
                Hành động này sẽ thiết lập lại toàn bộ dữ liệu 8 bảng quan hệ (Phòng, Khách hàng, Đơn đặt phòng, Dịch vụ, Phiếu thanh toán, Hóa đơn) về trạng thái chuẩn khởi tạo ban đầu.
              </p>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                ⚠ Dữ liệu phát sinh mới trong phiên làm việc sẽ được reset.
              </div>
            </div>

            <div className="flex-shrink-0 bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 z-20">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDatabase();
                  setResetConfirmOpen(false);
                  showToast('Đã khôi phục CSDL ban đầu thành công!', 'success');
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
