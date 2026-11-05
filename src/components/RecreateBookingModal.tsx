import React, { useState } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  Calendar,
  Check,
  X,
  CreditCard,
  BedDouble,
  Users,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { useToast } from '../context/ToastContext';
import { DonDatPhong } from '../types';
import {
  formatVND,
  formatDate,
  formatDateTime,
  calculateNights,
  calculateDeposit,
  getCustomerTier,
  calculateTierDiscount,
  shiftDatesIfInPast,
  useLockScroll,
} from '../utils/helpers';

interface RecreateBookingModalProps {
  sourceBooking: DonDatPhong;
  onClose: () => void;
  onSuccess: (newMaDon: string) => void;
}

export const RecreateBookingModal: React.FC<RecreateBookingModalProps> = ({
  sourceBooking,
  onClose,
  onSuccess,
}) => {
  useLockScroll(true);
  const {
    rooms,
    customers,
    bookings,
    createBooking,
    checkRoomAvailability,
    getAvailableRoomsForDates,
  } = useHomestay();
  const { showToast } = useToast();

  const customer = customers.find((c) => c.MaKH === sourceBooking.MaKH);

  // 1. Kiểm tra tính hợp lệ của ngày lưu trú so với ngày hiện tại (Asia/Ho_Chi_Minh)
  const shifted = shiftDatesIfInPast(sourceBooking.NgayNhanPhong, sourceBooking.NgayTraPhong);

  const [checkIn, setCheckIn] = useState<string>(shifted.adjustedCheckIn);
  const [checkOut, setCheckOut] = useState<string>(shifted.adjustedCheckOut);
  const [guestCount, setGuestCount] = useState<number>(sourceBooking.SoKhach || 1);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>(sourceBooking.MaPhong);
  const [specialReq, setSpecialReq] = useState<string>(sourceBooking.YeuCauDacBiet || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const nights = calculateNights(checkIn, checkOut);

  // Kiểm tra tình trạng phòng được chọn
  const isSelectedRoomAvail = checkRoomAvailability(selectedRoomCode, checkIn, checkOut);
  const selectedRoom = rooms.find((r) => r.MaPhong === selectedRoomCode);

  // Danh sách các phòng trống cho thời gian này
  const availableRooms = getAvailableRoomsForDates(checkIn, checkOut, guestCount);

  // Hạng thành viên & chiết khấu giá phòng hiện hành
  const tier = customer ? getCustomerTier(bookings, customer.MaKH) : { name: 'Thành viên' as const, discountRate: 0 };
  const rawRoomCost = selectedRoom ? selectedRoom.GiaPhong * nights : 0;
  const { discountAmount, roomPriceAfterDiscount } = calculateTierDiscount(rawRoomCost, tier.discountRate);
  const newTienPhong = roomPriceAfterDiscount;
  const newTienCocYeuCau = calculateDeposit(newTienPhong, 0.3);

  const handleCheckInChange = (newVal: string) => {
    setCheckIn(newVal);
    setErrorMessage('');
    if (newVal < todayStr) {
      showToast('Cảnh báo: Ngày nhận phòng không được chọn ở quá khứ!', 'warning');
    }
  };

  const handleCheckOutChange = (newVal: string) => {
    setCheckOut(newVal);
    setErrorMessage('');
    if (checkIn && newVal <= checkIn) {
      showToast('Cảnh báo: Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!', 'warning');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (checkIn < todayStr) {
      setErrorMessage('Ngày nhận phòng không được ở quá khứ.');
      return;
    }
    if (checkIn >= checkOut) {
      setErrorMessage('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
      return;
    }
    if (!selectedRoom) {
      setErrorMessage('Vui lòng chọn phòng lưu trú.');
      return;
    }
    if (guestCount > selectedRoom.SucChua) {
      setErrorMessage(
        `Phòng ${selectedRoom.TenPhong} (${selectedRoom.MaPhong}) chỉ có sức chứa tối đa ${selectedRoom.SucChua} khách. Vui lòng chọn phòng có sức chứa lớn hơn!`
      );
      return;
    }
    if (!isSelectedRoomAvail) {
      setErrorMessage(
        `Phòng ${selectedRoom.TenPhong} (${selectedRoomCode}) đã có người đặt trong giai đoạn ${formatDate(checkIn)} → ${formatDate(checkOut)}. Vui lòng chọn phòng trống khác!`
      );
      return;
    }

    setIsSubmitting(true);

    const payload = {
      maPhong: selectedRoomCode,
      maKH: sourceBooking.MaKH,
      ngayNhanPhong: checkIn,
      ngayTraPhong: checkOut,
      soKhach: guestCount,
      yeuCauDacBiet: specialReq ? specialReq.trim() : undefined,
      maDonGoc: sourceBooking.MaDon, // Gắn tham chiếu mã đơn gốc hai chiều
    };

    const res = createBooking(payload);
    setIsSubmitting(false);

    if (res.success && res.maDon) {
      showToast(
        `Đã tái tạo đơn mới ${res.maDon} từ đơn gốc ${sourceBooking.MaDon} thành công! Số tiền cọc cần thu: ${formatVND(newTienCocYeuCau)} (30%).`,
        'success'
      );
      onSuccess(res.maDon);
      onClose();
    } else {
      setErrorMessage(res.message);
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overscroll-contain">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 relative isolate">
        {/* Header */}
        <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              TẠO ĐƠN MỚI TỪ ĐƠN ({sourceBooking.MaDon})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kế thừa dữ liệu khách & phòng, kiểm tra lịch trống và tính lại tiền cọc 30%
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
          {/* BANNER 1: THÔNG TIN ĐƠN ĐÃ HỦY */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-rose-900">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                THÔNG TIN ĐƠN GỐC ĐÃ HỦY: {sourceBooking.MaDon}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                Đã hủy
              </span>
            </div>
            <div className="text-slate-700">
              <strong>• Lý do hủy:</strong>{' '}
              <span className="text-rose-700 font-semibold">
                {sourceBooking.LyDoHuy || 'Quá hạn xác nhận tiền cọc 12 giờ'}
              </span>
            </div>
            <div className="text-slate-600 text-[11px]">
              <strong>• Thời gian hủy:</strong>{' '}
              {formatDateTime(sourceBooking.ThoiGianHuy || sourceBooking.ThoiGianTaoDon)}
            </div>
          </div>

          {/* BANNER 2: HƯỚNG DẪN ĐỐI SOÁT GIAO DỊCH NGÂN HÀNG */}
          <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-xs space-y-1 text-amber-950">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              LƯU Ý ĐỐI SOÁT GIAO DỊCH NGÂN HÀNG (DÀNH CHO QUẢN LÝ):
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90">
              Trường hợp khách hàng đã chuyển tiền cọc trước đó nhưng quá hạn 12 giờ xác nhận, Quản lý vui lòng
              đối soát thủ công sao kê ngân hàng thực tế. Thống nhất với khách:{' '}
              <strong>(1) Hoàn trả tiền cọc cho khách</strong> theo biên lai sao kê, hoặc{' '}
              <strong>(2) Đối trừ số tiền này khi thu cọc cho đơn mới</strong> được tái tạo.{' '}
              <span className="text-rose-700 font-bold underline">
                Tuyệt đối không ghi nhận trùng lặp giao dịch thu cọc trên hệ thống!
              </span>
            </p>
          </div>

          {/* BANNER 3: THÔNG BÁO TỰ ĐỘNG ĐIỀU CHỈNH NGÀY NẾU Ở QUÁ KHỨ */}
          {shifted.wasAdjusted && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block font-bold text-blue-950 mb-0.5">
                  Tự động điều chỉnh ngày lưu trú hợp lệ:
                </strong>
                {shifted.notice}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form id="recreate-booking-form" onSubmit={handleSubmit} className="space-y-4">
            {/* THÔNG TIN KHÁCH HÀNG KẾ THỪA */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">
                1. Thông Tin Khách Hàng (Kế Thừa)
              </span>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <strong className="text-slate-900">{customer?.HoTen || 'Khách lẻ'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-mono text-slate-800">{customer?.SoDienThoai || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CCCD:</span>
                  <span className="font-mono text-slate-800">{customer?.CCCD || '--'}</span>
                </div>
                {tier.discountRate > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-100 pt-1">
                    <span>Hạng thành viên:</span>
                    <span>{tier.name} (Ưu đãi -{tier.discountRate * 100}% tiền phòng)</span>
                  </div>
                )}
              </div>
            </div>

            {/* THỜI GIAN LƯU TRÚ & SỐ KHÁCH */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">
                2. Thời Gian Lưu Trú & Số Lượng Khách
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
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} khách
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                Thời gian: <strong>{nights} đêm</strong> ({formatDate(checkIn)} → {formatDate(checkOut)})
              </div>
            </div>

            {/* CHỌN PHÒNG & KIỂM TRA TÌNH TRẠNG TRỐNG */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">
                  3. Phòng Lưu Trú & Kiểm Tra Khả Dụng
                </span>
                <span className="text-[11px] text-slate-500">
                  {availableRooms.length} phòng trống trong thời gian này
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Chọn phòng:
                </label>
                <select
                  value={selectedRoomCode}
                  onChange={(e) => setSelectedRoomCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
                >
                  {rooms.map((r) => {
                    const isAvail = checkRoomAvailability(r.MaPhong, checkIn, checkOut);
                    return (
                      <option key={r.MaPhong} value={r.MaPhong}>
                        {r.MaPhong} - {r.TenPhong} ({r.LoaiPhong}, {formatVND(r.GiaPhong)}/đêm, max {r.SucChua} người) {isAvail ? '— [CÒN TRỐNG]' : '— [ĐÃ KÍN]'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedRoom && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-semibold">Tình trạng phòng đã chọn:</span>
                    {isSelectedRoomAvail ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        ✓ Phòng trống, sẵn sàng đón khách
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                        ✕ Phòng đã kín trong thời gian này
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Sức chứa: Tối đa {selectedRoom.SucChua} người</span>
                    <span>Đơn giá niêm yết: {formatVND(selectedRoom.GiaPhong)} / đêm</span>
                  </div>
                </div>
              )}
            </div>

            {/* YÊU CẦU ĐẶC BIỆT */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block uppercase tracking-wide">
                4. Yêu Cầu Đặc Biệt & Ghi Chú
              </span>
              <textarea
                rows={2}
                value={specialReq}
                onChange={(e) => setSpecialReq(e.target.value)}
                placeholder="Ghi chú kế thừa từ đơn cũ hoặc ghi chú mới của khách..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white outline-hidden focus:border-blue-500"
              />
            </div>

            {/* TỔNG KẾT TÀI CHÍNH: KHÔNG SAO CHÉP TIỀN CỌC CŨ */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
              <span className="text-xs font-bold text-blue-950 block uppercase tracking-wide">
                5. Tính Toán Tài Chính Đơn Mới (Quy Tắc Nghiệp Vụ)
              </span>

              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Tiền phòng gốc ({nights} đêm × {formatVND(selectedRoom?.GiaPhong || 0)}):</span>
                  <span className="font-semibold tabular-nums">{formatVND(rawRoomCost)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Ưu đãi thành viên {tier.name} (-{tier.discountRate * 100}%):</span>
                    <span className="tabular-nums">-{formatVND(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-blue-200">
                  <span>Tổng tiền phòng thực tính:</span>
                  <span className="tabular-nums">{formatVND(newTienPhong)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200 text-sm">
                  <span>Tiền cọc yêu cầu 30% (làm tròn nghìn):</span>
                  <span className="tabular-nums">{formatVND(newTienCocYeuCau)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-semibold pt-1">
                  <span>Tiền cọc bắt đầu (Không sao chép cọc cũ):</span>
                  <span className="tabular-nums font-bold">0 ₫ (Chưa thu)</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Trạng thái khởi tạo:</span>
                  <span className="font-bold text-blue-700">Chờ đặt cọc (Hạn cọc 12 giờ)</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            type="submit"
            form="recreate-booking-form"
            disabled={isSubmitting || !isSelectedRoomAvail}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Xác nhận tạo đơn mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
