import React from 'react';
import { X, FileText, Coins, HelpCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaxGuideModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="sticky top-0 z-10 bg-white -mx-6 -mt-6 px-6 pt-6 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              HƯỚNG DẪN THUẾ HOMESTAY (THÔNG TƯ 40/2021/TT-BTC)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
          <p>
            Đối với hoạt động kinh doanh lưu trú homestay / nhà nghỉ, mức thuế suất quy định hiện hành theo Thông tư 40/2021/TT-BTC của Bộ Tài chính:
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span>Thuế Giá trị gia tăng (GTGT):</span>
              <strong className="text-blue-700">5% doanh thu</strong>
            </div>
            <div className="flex justify-between">
              <span>Thuế Thu nhập cá nhân (TNCN):</span>
              <strong className="text-blue-700">2% doanh thu</strong>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span>Tổng nghĩa vụ thuế khoán:</span>
              <strong className="text-slate-900">7% doanh thu thực tế</strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            * Miễn thuế nếu tổng doanh thu kinh doanh trong năm dương lịch từ 100 triệu đồng trở xuống.
          </p>
          <p>
            Chicstay hỗ trợ xuất hóa đơn tổng hợp khi khách check-out giúp chủ homestay đối soát sao kê và lập sổ sách kế toán minh bạch.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export const LoanGuideModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="sticky top-0 z-10 bg-white -mx-6 -mt-6 px-6 pt-6 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-slate-900">
              GÓI HỖ TRỢ VỐN NÂNG CẤP HOMESTAY
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
          <p>
            Chương trình liên kết đối tác tài chính ngân hàng dành riêng cho chủ homestay và căn hộ du lịch:
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
              <strong className="text-blue-900 block text-xs">Vốn lưu động cải tạo & mua sắm trang thiết bị</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Hạn mức từ 50.000.000 ₫ - 500.000.000 ₫, giải ngân nhanh dựa trên lịch sử dòng tiền đặt phòng.
              </p>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
              <strong className="text-emerald-900 block text-xs">Lãi suất ưu đãi kinh doanh lưu trú</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Chỉ từ 6.5%/năm, thời hạn vay linh hoạt từ 6 đến 36 tháng.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export const HelpGuideModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="sticky top-0 z-10 bg-white -mx-6 -mt-6 px-6 pt-6 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              QUY TRÌNH NGHIỆP VỤ CHUẨN CHICSTAY
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-blue-700 block text-xs">1. Đặt cọc 30% & Hạn 12 giờ</strong>
            <p className="text-[11px]">
              Khi tạo đơn, hệ thống tính cọc = 30% tiền phòng (làm tròn nghìn, không tính tiền dịch vụ). Đơn ở trạng thái <em>Chờ đặt cọc</em>, phòng ở trạng thái <em>Tạm giữ</em>. Nếu quá 12h chưa cọc, Quản lý hủy đơn để giải phóng phòng.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-blue-700 block text-xs">2. Check-in & Phụ thu D008</strong>
            <p className="text-[11px]">
              Giờ check-in chuẩn là 14:00. Nếu khách đến sớm trước 14:00 và phòng đã sạch, Quản lý có thể check-in kèm phụ thu D008 (150.000 ₫ / Lượt). Nếu khách không đến, xác nhận No-show (giữ lại cọc).
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-blue-700 block text-xs">3. Dịch vụ phát sinh (Chốt cứng đơn giá)</strong>
            <p className="text-[11px]">
              Chỉ được thêm khi đơn ở trạng thái <em>Đã xác nhận</em> (Pre-stay) hoặc <em>Đã check-in</em> (In-house). Đơn giá chốt cứng tại thời điểm thêm. Tiền dịch vụ không cộng vào tiền cọc 30%. Khi đơn đã <em>Đã hoàn thành</em>, dữ liệu dịch vụ bị khóa hoàn toàn.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-blue-700 block text-xs">4. Check-out & Phụ thu D009</strong>
            <p className="text-[11px]">
              Giờ check-out chuẩn là 12:00. Trả muộn có phụ thu D009 (150.000 ₫ / Lượt). Hệ thống tổng hợp toàn bộ chi phí, trừ tiền cọc đã thu trước, thu số tiền còn lại và lập Hóa đơn tổng hợp. Phòng chuyển sang <em>Chờ dọn phòng</em>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-blue-700 block text-xs">5. Chính sách hoàn cọc (Mốc 48 giờ)</strong>
            <p className="text-[11px]">
              Hủy trước 14:00 ngày check-in ít nhất 48 giờ: Được hoàn 100% tiền cọc. Quản lý chuyển tiền thủ công ngoài hệ thống rồi bấm &quot;Đã hoàn&quot; để lập phiếu Hoàn cọc. Hủy dưới 48 giờ hoặc No-show: Không hoàn cọc theo chính sách.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
