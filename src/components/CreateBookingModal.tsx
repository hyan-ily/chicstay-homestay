import React, { useState } from 'react';
import {
  Calendar,
  Check,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { useToast } from '../context/ToastContext';
import { formatVND, calculateNights, calculateDeposit, formatDate, validateCustomerFull, useLockScroll } from '../utils/helpers';
import { Phong } from '../types';

interface CreateBookingModalProps {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  initialRoomCode?: string;
  onClose: () => void;
  onSuccess: (maDon: string) => void;
}

export const CreateBookingModal: React.FC<CreateBookingModalProps> = ({
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  initialRoomCode,
  onClose,
  onSuccess,
}) => {
  useLockScroll(true);
  const {
    rooms,
    customers,
    createBooking,
    getAvailableRoomsForDates,
  } = useHomestay();
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(initialCheckIn || todayStr);
  const [checkOut, setCheckOut] = useState(initialCheckOut || tomorrowStr);
  const [guestCount, setGuestCount] = useState(initialGuests);
  const [selectedRoomCode, setSelectedRoomCode] = useState(initialRoomCode || '');

  const handleCheckInChange = (newVal: string) => {
    setCheckIn(newVal);
    if (newVal < todayStr) {
      showToast('Cảnh báo: Ngày nhận phòng không được chọn ở quá khứ!', 'warning');
    }
    if (checkOut && newVal >= checkOut) {
      showToast('Cảnh báo: Ngày nhận phòng phải trước ngày trả phòng!', 'warning');
    }
  };

  const handleCheckOutChange = (newVal: string) => {
    setCheckOut(newVal);
    if (checkIn && newVal <= checkIn) {
      showToast('Cảnh báo: Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!', 'warning');
    }
  };

  // Customer mode: 'existing' | 'new'
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // New Customer Form (HoTen, SoDienThoai, CCCD 12 số, Email, DiaChi đều bắt buộc)
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCccd, setNewCustomerCccd] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerNote, setNewCustomerNote] = useState('');

  // Special request
  const [specialRequest, setSpecialRequest] = useState('');

  // Error message & field errors
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    HoTen?: string;
    SoDienThoai?: string;
    CCCD?: string;
    Email?: string;
    DiaChi?: string;
  }>({});

  const availableRooms = getAvailableRoomsForDates(checkIn, checkOut, guestCount);
  const selectedRoom = rooms.find((r) => r.MaPhong === selectedRoomCode);

  const nights = calculateNights(checkIn, checkOut);
  const estimatedRoomCost = selectedRoom ? selectedRoom.GiaPhong * nights : 0;
  const estimatedDeposit30 = calculateDeposit(estimatedRoomCost, 0.3);

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.HoTen.toLowerCase().includes(q) ||
      c.SoDienThoai.includes(q) ||
      (c.CCCD ?? '').includes(q)
    );
  });

  const handleSelectRoom = (r: Phong) => {
    setSelectedRoomCode(r.MaPhong);
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});

    if (checkIn < todayStr) {
      const msg = 'Ngày nhận phòng không được ở quá khứ.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    if (checkIn >= checkOut) {
      const msg = 'Ngày nhận phòng phải trước ngày trả phòng ít nhất 1 đêm.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    if (!selectedRoomCode) {
      const msg = 'Vui lòng chọn một phòng khả dụng từ danh sách.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    if (customerMode === 'existing' && !selectedCustomerId) {
      const msg = 'Vui lòng chọn một khách hàng có sẵn từ danh sách.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    if (customerMode === 'new') {
      const val = validateCustomerFull({
        HoTen: newCustomerName,
        SoDienThoai: newCustomerPhone,
        CCCD: newCustomerCccd,
        Email: newCustomerEmail,
        DiaChi: newCustomerAddress,
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
        const msg = `${fieldName}: ${firstEntry[1]}`;
        setErrorMessage(msg);
        showToast(msg, 'error');
        return;
      }
    }

    const payload = {
      maPhong: selectedRoomCode,
      maKH: customerMode === 'existing' ? selectedCustomerId : undefined,
      newCustomer:
        customerMode === 'new'
          ? {
              hoTen: newCustomerName.trim(),
              soDienThoai: newCustomerPhone.trim(),
              cccd: newCustomerCccd.trim(),
              email: newCustomerEmail.trim(),
              diaChi: newCustomerAddress.trim(),
              ghiChu: newCustomerNote.trim() || undefined,
            }
          : undefined,
      ngayNhanPhong: checkIn,
      ngayTraPhong: checkOut,
      soKhach: guestCount,
      yeuCauDacBiet: specialRequest.trim() || undefined,
    };

    const res = createBooking(payload);
    if (res.success && res.maDon) {
      showToast(res.message, 'success');
      onSuccess(res.maDon);
      onClose();
    } else {
      setErrorMessage(res.message);
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
        {/* Header cố định lên cao kịch khung trắng */}
        <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              TẠO ĐƠN ĐẶT PHÒNG MỚI
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động kiểm tra tình trạng phòng và tính cọc 30%
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phần thân cuộn độc lập bên dưới, không bao giờ lộ chữ đằng sau header */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form id="create-booking-form" onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Step 1: Chọn ngày & Số khách */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">
                1. Thời Gian & Số Lượng Khách
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Ngày nhận phòng:
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    min={todayStr}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Ngày trả phòng:
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn}
                    onChange={(e) => handleCheckOutChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Số khách lưu trú:
                  </label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
                  >
                    <option value={1}>1 khách</option>
                    <option value={2}>2 khách</option>
                    <option value={3}>3 khách</option>
                    <option value={4}>4 khách</option>
                    <option value={5}>5 khách</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                <span>Thời gian lưu trú: <strong className="text-slate-800">{nights} đêm</strong></span>
                <span>· Giờ check-in tiêu chuẩn: <strong>14:00</strong></span>
                <span>· Giờ check-out: <strong>12:00</strong></span>
              </div>
            </div>

            {/* Step 2: Chọn phòng trống khả dụng */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  2. Chọn Phòng Còn Trống ({availableRooms.length} phòng khả dụng)
                </span>
                <span className="text-[11px] text-slate-500">
                  {formatDate(checkIn)} → {formatDate(checkOut)}
                </span>
              </div>

              {availableRooms.length === 0 ? (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs text-center">
                  ⚠ Không còn phòng trống trong khoảng thời gian yêu cầu hoặc sức chứa không đủ. Vui lòng chọn ngày khác!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {availableRooms.map((r) => {
                    const isSelected = selectedRoomCode === r.MaPhong;
                    return (
                      <div
                        key={r.MaPhong}
                        onClick={() => handleSelectRoom(r)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{r.MaPhong}</span>
                            <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[130px]">
                              {r.TenPhong}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {formatVND(r.GiaPhong)} / đêm · Tối đa {r.SucChua} người
                          </div>
                        </div>
                        <div className="text-right">
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-blue-600">Chọn</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Thông tin khách hàng (Có thêm ô Địa chỉ bắt buộc) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  3. Thông Tin Khách Hàng
                </span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      customerMode === 'existing'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Khách có sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      customerMode === 'new'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    + Khách mới
                  </button>
                </div>
              </div>

              {customerMode === 'existing' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Tìm theo Tên, SĐT, hoặc CCCD khách..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-1">
                    {filteredCustomers.map((c) => (
                      <div
                        key={c.MaKH}
                        onClick={() => setSelectedCustomerId(c.MaKH)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                          selectedCustomerId === c.MaKH
                            ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <span>{c.HoTen}</span> ({c.SoDienThoai})
                          <span className="block text-[10px] text-slate-400">CCCD: {c.CCCD || '--'} · {c.DiaChi || 'Việt Nam'}</span>
                        </div>
                        {selectedCustomerId === c.MaKH && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      Họ và tên (*):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        fieldErrors.HoTen ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } bg-white`}
                    />
                    {fieldErrors.HoTen && (
                      <p className="text-[10px] text-rose-600 mt-0.5">{fieldErrors.HoTen}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      Số điện thoại (*):
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0912345678 (10 số)"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        fieldErrors.SoDienThoai ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } bg-white`}
                    />
                    {fieldErrors.SoDienThoai && (
                      <p className="text-[10px] text-rose-600 mt-0.5">{fieldErrors.SoDienThoai}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      CCCD / Định danh (*) (đúng 12 số):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="001201004567"
                      value={newCustomerCccd}
                      onChange={(e) => setNewCustomerCccd(e.target.value)}
                      inputMode="numeric"
                      maxLength={12}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        fieldErrors.CCCD ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } bg-white`}
                    />
                    {fieldErrors.CCCD && (
                      <p className="text-[10px] text-rose-600 mt-0.5">{fieldErrors.CCCD}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      Email (*):
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="khach@gmail.com"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        fieldErrors.Email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } bg-white`}
                    />
                    {fieldErrors.Email && (
                      <p className="text-[10px] text-rose-600 mt-0.5">{fieldErrors.Email}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      Địa chỉ thường trú (*):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Số nhà, Đường, Phường/Xã, Tỉnh/TP..."
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        fieldErrors.DiaChi ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      } bg-white`}
                    />
                    {fieldErrors.DiaChi && (
                      <p className="text-[10px] text-rose-600 mt-0.5">{fieldErrors.DiaChi}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      Ghi chú sở thích / Yêu cầu đặc biệt (tùy chọn):
                    </label>
                    <input
                      type="text"
                      placeholder="Sở thích phòng cao, giường êm..."
                      value={newCustomerNote}
                      onChange={(e) => setNewCustomerNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ghi chú đơn */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Yêu cầu đặc biệt cho đơn đặt phòng:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Cần chuẩn bị máy sấy, hẹn cọc sáng nay qua VietQR..."
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            {/* Financial Calculation Box */}
            {selectedRoom && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền phòng dự kiến ({nights} đêm × {formatVND(selectedRoom.GiaPhong)}):</span>
                  <span className="font-bold tabular-nums text-slate-900">{formatVND(estimatedRoomCost)}</span>
                </div>
                <div className="flex justify-between text-blue-800 font-extrabold text-sm pt-1 border-t border-blue-200">
                  <span>Tiền đặt cọc yêu cầu (30% làm tròn nghìn):</span>
                  <span className="tabular-nums">{formatVND(estimatedDeposit30)}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  ℹ Đơn sẽ được lưu ở trạng thái <strong>&quot;Chờ đặt cọc&quot;</strong>, phòng chuyển sang <strong>&quot;Tạm giữ&quot;</strong> trong 12 giờ.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer cố định ở đáy hộp modal */}
        <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-booking-form"
            disabled={!selectedRoomCode}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-xs cursor-pointer transition-colors"
          >
            Xác Nhận Tạo Đơn Đặt Phòng
          </button>
        </div>
      </div>
    </div>
  );
};
