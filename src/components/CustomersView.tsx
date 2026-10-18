import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Edit2,
  UserCheck,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { useToast } from '../context/ToastContext';
import { KhachHang } from '../types';
import {
  formatVND,
  formatDate,
  validateCustomerFull,
  validateCustomerName,
  validateCustomerPhone,
  validateCustomerCccd,
  validateCustomerEmail,
  validateCustomerAddress,
  normalizePhoneNumber,
} from '../utils/helpers';
import { ModalShell } from './ModalShell';

interface CustomersViewProps {
  onOpenBookingDetail?: (maDon: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onOpenBookingDetail }) => {
  const { customers, bookings, createCustomer, updateCustomer } = useHomestay();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<KhachHang | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<KhachHang | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCccd, setFormCccd] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNote, setFormNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    HoTen?: string;
    SoDienThoai?: string;
    CCCD?: string;
    Email?: string;
    DiaChi?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.HoTen.toLowerCase().includes(q) ||
      c.MaKH.toLowerCase().includes(q) ||
      c.SoDienThoai.includes(q) ||
      (c.CCCD ?? '').includes(q)
    );
  });

  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormCccd('');
    setFormEmail('');
    setFormAddress('');
    setFormNote('');
    setErrorMessage('');
    setFieldErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: KhachHang) => {
    setEditingCustomer(c);
    setFormName(c.HoTen || '');
    setFormPhone(c.SoDienThoai || '');
    setFormCccd(c.CCCD ?? '');
    setFormEmail(c.Email ?? '');
    setFormAddress(c.DiaChi || '');
    setFormNote(c.GhiChu || '');
    setErrorMessage('');
    setFieldErrors({});
  };

  const validateField = (field: 'HoTen' | 'SoDienThoai' | 'CCCD' | 'Email' | 'DiaChi', value: string) => {
    let err: string | undefined;
    if (field === 'HoTen') {
      const res = validateCustomerName(value);
      if (!res.valid) err = res.error;
    } else if (field === 'SoDienThoai') {
      const res = validateCustomerPhone(value);
      if (!res.valid) err = res.error;
    } else if (field === 'CCCD') {
      const res = validateCustomerCccd(value);
      if (!res.valid) err = res.error;
    } else if (field === 'Email') {
      const res = validateCustomerEmail(value);
      if (!res.valid) err = res.error;
    } else if (field === 'DiaChi') {
      const res = validateCustomerAddress(value);
      if (!res.valid) err = res.error;
    }

    setFieldErrors((prev) => ({
      ...prev,
      [field]: err,
    }));
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');
    const val = validateCustomerFull({
      HoTen: formName,
      SoDienThoai: formPhone,
      CCCD: formCccd,
      Email: formEmail,
      DiaChi: formAddress,
    });

    if (!val.valid) {
      setFieldErrors(val.errors);
      const firstEntry = Object.entries(val.errors)[0];
      const fieldLabels: Record<string, string> = {
        HoTen: 'Họ và tên',
        SoDienThoai: 'Số điện thoại',
        CCCD: 'CCCD',
        Email: 'Email',
        DiaChi: 'Địa chỉ',
      };
      const fieldName = fieldLabels[firstEntry[0]] || firstEntry[0];
      const errorText = `${fieldName}: ${firstEntry[1]}`;
      setErrorMessage(errorText);
      showToast(errorText, 'error');
      return;
    }

    const cccdTrim = formCccd.trim();
    const dup = customers.find((c) => (c.CCCD || '').trim() === cccdTrim);
    if (dup) {
      const msg = `CCCD: Số CCCD "${cccdTrim}" đã tồn tại trên hệ thống (Khách hàng: ${dup.MaKH} - ${dup.HoTen}).`;
      setFieldErrors((prev) => ({ ...prev, CCCD: msg }));
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    const res = createCustomer({
      HoTen: formName.trim(),
      SoDienThoai: formPhone.trim(),
      CCCD: cccdTrim,
      Email: formEmail.trim(),
      DiaChi: formAddress.trim(),
      GhiChu: formNote.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(res.message, 'success');
      setIsAddModalOpen(false);
    } else {
      setErrorMessage(res.message);
      showToast(res.message, 'error');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || isSubmitting) return;

    setErrorMessage('');
    setFieldErrors({});

    // 1. Kiểm tra validation toàn bộ các trường bắt buộc (Họ tên, SĐT, CCCD 12 số, Email, Địa chỉ)
    const val = validateCustomerFull({
      HoTen: formName,
      SoDienThoai: formPhone,
      CCCD: formCccd,
      Email: formEmail,
      DiaChi: formAddress,
    });

    if (!val.valid) {
      setFieldErrors(val.errors);
      const firstEntry = Object.entries(val.errors)[0];
      const fieldLabels: Record<string, string> = {
        HoTen: 'Họ và tên',
        SoDienThoai: 'Số điện thoại',
        CCCD: 'CCCD',
        Email: 'Email',
        DiaChi: 'Địa chỉ',
      };
      const fieldName = fieldLabels[firstEntry[0]] || firstEntry[0];
      const errorText = `${fieldName}: ${firstEntry[1]}`;
      setErrorMessage(errorText);
      showToast(errorText, 'error');
      return;
    }

    // 2. Kiểm tra có thay đổi dữ liệu nào không
    const isNameSame = formName.trim() === (editingCustomer.HoTen || '').trim();
    const isPhoneSame = normalizePhoneNumber(formPhone) === normalizePhoneNumber(editingCustomer.SoDienThoai);
    const isCccdSame = formCccd.trim() === (editingCustomer.CCCD || '').trim();
    const isEmailSame = formEmail.trim() === (editingCustomer.Email || '').trim();
    const isAddressSame = formAddress.trim() === (editingCustomer.DiaChi || '').trim();
    const isNoteSame = formNote.trim() === (editingCustomer.GhiChu || '').trim();

    if (isNameSame && isPhoneSame && isCccdSame && isEmailSame && isAddressSame && isNoteSame) {
      showToast('Không có thay đổi để cập nhật', 'info');
      return;
    }

    // 3. Kiểm tra CCCD trùng (loại trừ chính khách hàng đang cập nhật theo MaKH)
    const cccdTrim = formCccd.trim();
    const dup = customers.find(
      (c) => c.MaKH !== editingCustomer.MaKH && (c.CCCD || '').trim() === cccdTrim
    );
    if (dup) {
      const msg = `CCCD: Số CCCD "${cccdTrim}" đã trùng với khách hàng ${dup.MaKH} (${dup.HoTen}).`;
      setFieldErrors((prev) => ({ ...prev, CCCD: msg }));
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    const res = updateCustomer(editingCustomer.MaKH, {
      HoTen: formName.trim(),
      SoDienThoai: formPhone.trim(),
      CCCD: cccdTrim,
      Email: formEmail.trim(),
      DiaChi: formAddress.trim(),
      GhiChu: formNote.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(res.message, 'success');
      setEditingCustomer(null);
    } else {
      if (res.message === 'Không có thay đổi để cập nhật') {
        showToast(res.message, 'info');
      } else {
        setErrorMessage(res.message);
        showToast(res.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5 leading-tight">
            <Users className="w-7 h-7 text-blue-600" />
            QUẢN LÝ HỒ SƠ KHÁCH HÀNG
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu trữ thông tin liên hệ, CCCD (12 số), Email, Địa chỉ bắt buộc và lịch sử lưu trú của khách hàng Chicstay
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>TẠO HỒ SƠ KHÁCH HÀNG MỚI</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Tra cứu khách hàng theo Họ tên, Mã KH (KH...), Số điện thoại hoặc CCCD..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white shadow-xs outline-hidden focus:border-blue-500"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            Không tìm thấy hồ sơ khách hàng nào phù hợp với từ khóa.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const customerBookings = bookings.filter((b) => b.MaKH === cust.MaKH);
            const totalSpent = customerBookings
              .filter((b) => b.TrangThaiDon === 'Đã hoàn thành')
              .reduce((sum, b) => sum + b.TongTien, 0);

            return (
              <div
                key={cust.MaKH}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded-sm">
                      {cust.MaKH}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(cust)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-md cursor-pointer transition-colors"
                      title="Chỉnh sửa hồ sơ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{cust.HoTen}</h3>

                  <div className="text-xs text-slate-600 space-y-1 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.SoDienThoai}</span>
                    </div>
                    {cust.Email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.Email}</span>
                      </div>
                    )}
                    {cust.CCCD && (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>CCCD: <strong>{cust.CCCD}</strong></span>
                      </div>
                    )}
                    {cust.DiaChi && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.DiaChi}</span>
                      </div>
                    )}
                  </div>

                  {cust.GhiChu && (
                    <div className="mt-2.5 p-2 bg-amber-50 rounded-lg border border-amber-100 text-[11px] text-amber-900">
                      <strong>Lưu ý:</strong> {cust.GhiChu}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Số lần đặt phòng</span>
                    <strong className="text-slate-900">{customerBookings.length} lần</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Tổng chi tiêu</span>
                    <strong className="text-emerald-700 tabular-nums">{formatVND(totalSpent)}</strong>
                  </div>
                  <button
                    onClick={() => setSelectedCustomerDetail(cust)}
                    className="ml-2 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer transition-colors"
                  >
                    Xem lịch sử
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: THÊM KHÁCH HÀNG MỚI (DÙNG MODALSHELL) */}
      {/* ============================================================== */}
      <ModalShell
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="TẠO MỚI HỒ SƠ KHÁCH HÀNG"
        subtitle="Tiêu đề cố định phía trên, nhập đầy đủ thông tin bắt buộc (*)"
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
              type="submit"
              form="add-customer-form"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Hồ Sơ Khách Hàng'}
            </button>
          </>
        }
      >
        <form id="add-customer-form" onSubmit={handleSaveAdd} noValidate className="space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Họ và tên (*):
              </label>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (fieldErrors.HoTen) validateField('HoTen', e.target.value);
                }}
                className={`w-full px-3 py-2 rounded-xl border ${
                  fieldErrors.HoTen ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                } text-xs focus:border-blue-500 outline-hidden`}
              />
              {fieldErrors.HoTen && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.HoTen}</span>
                </p>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Số điện thoại (*):
              </label>
              <input
                type="tel"
                required
                placeholder="0912345678 (10 số)"
                value={formPhone}
                onChange={(e) => {
                  setFormPhone(e.target.value);
                  if (fieldErrors.SoDienThoai) validateField('SoDienThoai', e.target.value);
                }}
                className={`w-full px-3 py-2 rounded-xl border ${
                  fieldErrors.SoDienThoai ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                } text-xs focus:border-blue-500 outline-hidden`}
              />
              {fieldErrors.SoDienThoai && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.SoDienThoai}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                CCCD / Số định danh (*) (đúng 12 số):
              </label>
              <input
                type="text"
                required
                maxLength={12}
                inputMode="numeric"
                placeholder="001201004567"
                value={formCccd}
                onChange={(e) => {
                  setFormCccd(e.target.value);
                  if (fieldErrors.CCCD) validateField('CCCD', e.target.value);
                }}
                className={`w-full px-3 py-2 rounded-xl border ${
                  fieldErrors.CCCD ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                } text-xs focus:border-blue-500 outline-hidden`}
              />
              {fieldErrors.CCCD && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.CCCD}</span>
                </p>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Email (*):
              </label>
              <input
                type="email"
                required
                placeholder="khach@gmail.com"
                value={formEmail}
                onChange={(e) => {
                  setFormEmail(e.target.value);
                  if (fieldErrors.Email) validateField('Email', e.target.value);
                }}
                className={`w-full px-3 py-2 rounded-xl border ${
                  fieldErrors.Email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                } text-xs focus:border-blue-500 outline-hidden`}
              />
              {fieldErrors.Email && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.Email}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Địa chỉ thường trú (*):
            </label>
            <input
              type="text"
              required
              placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP..."
              value={formAddress}
              onChange={(e) => {
                setFormAddress(e.target.value);
                if (fieldErrors.DiaChi) validateField('DiaChi', e.target.value);
              }}
              className={`w-full px-3 py-2 rounded-xl border ${
                fieldErrors.DiaChi ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              } text-xs focus:border-blue-500 outline-hidden`}
            />
            {fieldErrors.DiaChi && (
              <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{fieldErrors.DiaChi}</span>
              </p>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Ghi chú đặc biệt / Sở thích:
            </label>
            <textarea
              rows={2}
              placeholder="Thói quen, yêu cầu nệm êm, trà thơm, dị ứng..."
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:border-blue-500 outline-hidden"
            />
          </div>
        </form>
      </ModalShell>

      {/* ============================================================== */}
      {/* MODAL 2: CẬP NHẬT HỒ SƠ KHÁCH HÀNG (DÙNG MODALSHELL) */}
      {/* ============================================================== */}
      {editingCustomer && (
        <ModalShell
          isOpen={Boolean(editingCustomer)}
          onClose={() => setEditingCustomer(null)}
          title={`CẬP NHẬT HỒ SƠ (${editingCustomer.MaKH})`}
          subtitle="Tiêu đề cố định phía trên, vui lòng bổ sung các thông tin bắt buộc (*)"
          icon={<Edit2 className="w-5 h-5 text-blue-600" />}
          maxWidth="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="edit-customer-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
              >
                {isSubmitting ? 'Đang lưu...' : 'Cập Nhật Hồ Sơ'}
              </button>
            </>
          }
        >
          <form id="edit-customer-form" onSubmit={handleSaveEdit} noValidate className="space-y-3.5 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Họ và tên (*):
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (fieldErrors.HoTen) validateField('HoTen', e.target.value);
                  }}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    fieldErrors.HoTen ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  } text-xs focus:border-blue-500 outline-hidden`}
                />
                {fieldErrors.HoTen && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.HoTen}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số điện thoại (*):
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => {
                    setFormPhone(e.target.value);
                    if (fieldErrors.SoDienThoai) validateField('SoDienThoai', e.target.value);
                  }}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    fieldErrors.SoDienThoai ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  } text-xs focus:border-blue-500 outline-hidden`}
                />
                {fieldErrors.SoDienThoai && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.SoDienThoai}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  CCCD / Số định danh (*) (đúng 12 số):
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  inputMode="numeric"
                  placeholder="001201004567"
                  value={formCccd}
                  onChange={(e) => {
                    setFormCccd(e.target.value);
                    if (fieldErrors.CCCD) validateField('CCCD', e.target.value);
                  }}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    fieldErrors.CCCD ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  } text-xs focus:border-blue-500 outline-hidden`}
                />
                {fieldErrors.CCCD && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.CCCD}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Email (*):
                </label>
                <input
                  type="email"
                  required
                  placeholder="khach@gmail.com"
                  value={formEmail}
                  onChange={(e) => {
                    setFormEmail(e.target.value);
                    if (fieldErrors.Email) validateField('Email', e.target.value);
                  }}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    fieldErrors.Email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  } text-xs focus:border-blue-500 outline-hidden`}
                />
                {fieldErrors.Email && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.Email}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Địa chỉ thường trú (*):
              </label>
              <input
                type="text"
                required
                placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP..."
                value={formAddress}
                onChange={(e) => {
                  setFormAddress(e.target.value);
                  if (fieldErrors.DiaChi) validateField('DiaChi', e.target.value);
                }}
                className={`w-full px-3 py-2 rounded-xl border ${
                  fieldErrors.DiaChi ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                } text-xs focus:border-blue-500 outline-hidden`}
              />
              {fieldErrors.DiaChi && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.DiaChi}</span>
                </p>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Ghi chú đặc biệt / Sở thích:
              </label>
              <textarea
                rows={2}
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:border-blue-500 outline-hidden"
              />
            </div>
          </form>
        </ModalShell>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CHI TIẾT LỊCH SỬ KHÁCH HÀNG (DÙNG MODALSHELL) */}
      {/* ============================================================== */}
      {selectedCustomerDetail && (
        <ModalShell
          isOpen={Boolean(selectedCustomerDetail)}
          onClose={() => setSelectedCustomerDetail(null)}
          title={`LỊCH SỬ LƯU TRÚ - ${selectedCustomerDetail.HoTen}`}
          subtitle={`Mã KH: ${selectedCustomerDetail.MaKH} · SĐT: ${selectedCustomerDetail.SoDienThoai} · CCCD: ${selectedCustomerDetail.CCCD || '--'}`}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          maxWidth="xl"
          footer={
            <button
              type="button"
              onClick={() => setSelectedCustomerDetail(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
            >
              Đóng
            </button>
          }
        >
          <div className="space-y-2">
            {bookings.filter((b) => b.MaKH === selectedCustomerDetail.MaKH).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Khách hàng chưa có lịch sử đặt phòng nào.
              </div>
            ) : (
              bookings
                .filter((b) => b.MaKH === selectedCustomerDetail.MaKH)
                .map((b) => (
                  <div
                    key={b.MaDon}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenBookingDetail?.(b.MaDon);
                            setSelectedCustomerDetail(null);
                          }}
                          className="text-blue-700 hover:text-blue-900 hover:underline font-mono font-bold cursor-pointer inline-flex items-center gap-1"
                          title="Bấm để xem chi tiết đơn đặt phòng"
                        >
                          {b.MaDon}
                          <ExternalLink className="w-3 h-3 text-blue-500" />
                        </button>
                        <span className="font-semibold text-slate-800">Phòng {b.MaPhong}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatDate(b.NgayNhanPhong)} → {formatDate(b.NgayTraPhong)} ({b.SoDem} đêm)
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        {b.TrangThaiDon}
                      </span>
                      <div className="font-bold text-slate-900 mt-1 tabular-nums">
                        {formatVND(b.TongTien)}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
};
