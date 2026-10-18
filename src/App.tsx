import React, { useState } from 'react';
import { HomestayProvider, useHomestay } from './context/HomestayContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { Sidebar, TabKey } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { BookingsView } from './components/BookingsView';
import { RoomsView } from './components/RoomsView';
import { ServicesView } from './components/ServicesView';
import { PaymentsView } from './components/PaymentsView';
import { CustomersView } from './components/CustomersView';
import { ReportsView } from './components/ReportsView';
import { DatabaseView } from './components/DatabaseView';
import { CreateBookingModal } from './components/CreateBookingModal';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { AuthModal } from './components/AuthModal';
import { ChatbotDrawer } from './components/ChatbotDrawer';
import { LoginView } from './components/LoginView';
import { Settings, Shield, User, MessageSquare } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser } = useHomestay();

  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals state
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Booking modals
  const [isCreateBookingModalOpen, setIsCreateBookingModalOpen] = useState(false);
  const [createBookingInitialData, setCreateBookingInitialData] = useState<{
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    roomCode?: string;
  } | undefined>(undefined);

  const [printInvoiceMaDon, setPrintInvoiceMaDon] = useState<string | null>(null);

  // Filter pass-through for Bookings tab
  const [bookingsInitialFilter, setBookingsInitialFilter] = useState<string>('ALL');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const handleNavigateToBookings = (statusFilter = 'ALL') => {
    setBookingsInitialFilter(statusFilter);
    setSelectedBookingId(null);
    setCurrentTab('bookings');
  };

  const handleOpenBookingDetail = (maDon: string) => {
    setSelectedBookingId(maDon);
    setCurrentTab('bookings');
  };

  const handleOpenCreateBookingModal = (initialData?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    roomCode?: string;
  }) => {
    setCreateBookingInitialData(initialData);
    setIsCreateBookingModalOpen(true);
  };

  const handleDownloadSQL = () => {
    setCurrentTab('database');
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans text-slate-800 overflow-hidden bg-[#f8fafc]">
      {/* Top Header */}
      <Header
        onOpenChatbot={() => setIsChatbotOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onNavigateToTab={(tab) => setCurrentTab(tab)}
        onOpenBookingDetail={handleOpenBookingDetail}
      />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Fixed vertical sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'bookings') {
              setSelectedBookingId(null);
            }
            setCurrentTab(tab);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        {(() => {
          const isAnyGlobalModalOpen = isCreateBookingModalOpen || isAuthModalOpen || Boolean(printInvoiceMaDon);
          return (
            <main className={`flex-1 ${isAnyGlobalModalOpen ? 'overflow-hidden' : 'overflow-y-auto'} p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full h-full`}>
              {currentTab === 'dashboard' && (
                <DashboardView
                  onNavigateToBookings={handleNavigateToBookings}
                  onOpenCreateBookingModal={handleOpenCreateBookingModal}
                  onOpenChatbot={() => setIsChatbotOpen(true)}
                  onDownloadSQL={handleDownloadSQL}
                  onOpenBookingDetail={handleOpenBookingDetail}
                />
              )}

              {currentTab === 'bookings' && (
                <BookingsView
                  initialStatusFilter={bookingsInitialFilter}
                  initialActiveBookingId={selectedBookingId}
                  onClearActiveBooking={() => setSelectedBookingId(null)}
                  onOpenCreateBookingModal={(init) => handleOpenCreateBookingModal(init)}
                  onOpenBookingDetail={handleOpenBookingDetail}
                  onPrintInvoice={(maDon) => setPrintInvoiceMaDon(maDon)}
                />
              )}

              {currentTab === 'rooms' && (
                <RoomsView
                  onOpenCreateBookingModal={(init) => handleOpenCreateBookingModal(init)}
                  onOpenBookingDetail={handleOpenBookingDetail}
                />
              )}

              {currentTab === 'services' && (
                <ServicesView onNavigateToBooking={handleOpenBookingDetail} />
              )}

              {currentTab === 'payments' && (
                <PaymentsView
                  onPrintInvoice={(maDon) => setPrintInvoiceMaDon(maDon)}
                  onOpenBookingDetail={handleOpenBookingDetail}
                />
              )}

              {currentTab === 'customers' && (
                <CustomersView onOpenBookingDetail={handleOpenBookingDetail} />
              )}

              {currentTab === 'reports' && <ReportsView />}

              {currentTab === 'database' && <DatabaseView />}

              {currentTab === 'settings' && (
                <div className="max-w-2xl bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-blue-600" />
                      CÀI ĐẶT HỆ THỐNG HOMESTAY CHICSTAY
                    </h2>
                  </div>

                  {/* User Account */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-500" />
                      Tài khoản người dùng hiện tại
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Họ và tên:</span>
                        <strong className="text-slate-900">{currentUser?.HoTen}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email:</span>
                        <span className="font-mono text-slate-700">{currentUser?.Email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vai trò phân quyền:</span>
                        <span className="font-bold text-blue-700">{currentUser?.VaiTro} Homestay</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Policy Summary */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-slate-500" />
                      Chính sách nghiệp vụ cốt lõi
                    </h3>
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-xs space-y-2 text-slate-700">
                      <div>
                        <strong>• Tỷ lệ tiền cọc yêu cầu:</strong> 30% tiền phòng (làm tròn đến hàng nghìn đồng, không tính tiền dịch vụ).
                      </div>
                      <div>
                        <strong>• Thời hạn giữ cọc:</strong> Tối đa 12 giờ kể từ thời điểm tạo đơn.
                      </div>
                      <div>
                        <strong>• Hoàn tiền cọc khi hủy:</strong> Hủy trước mốc 14:00 ngày check-in ít nhất 48 giờ được hoàn 100% tiền cọc.
                      </div>
                      <div>
                        <strong>• Phụ thu nhận phòng sớm & trả phòng muộn:</strong> D008 (Nhận phòng sớm: 150.000 ₫ / Lượt), D009 (Trả phòng muộn: 150.000 ₫ / Lượt).
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          );
        })()}
      </div>

      {/* Floating Chatbot Bubble at bottom-right corner */}
      <button
        type="button"
        onClick={() => setIsChatbotOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer group border-2 border-white"
        title="Mở Trợ lý ảo Quản lý Chicstay"
        aria-label="Mở Trợ lý ảo Quản lý Chicstay"
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-6 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Modals */}
      {isCreateBookingModalOpen && (
        <CreateBookingModal
          initialCheckIn={createBookingInitialData?.checkIn}
          initialCheckOut={createBookingInitialData?.checkOut}
          initialGuests={createBookingInitialData?.guests}
          initialRoomCode={createBookingInitialData?.roomCode}
          onClose={() => setIsCreateBookingModalOpen(false)}
          onSuccess={() => {
            setCurrentTab('bookings');
          }}
        />
      )}

      {printInvoiceMaDon && (
        <InvoicePrintModal
          maDon={printInvoiceMaDon}
          onClose={() => setPrintInvoiceMaDon(null)}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ChatbotDrawer
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        onNavigateToTab={(tab) => {
          setCurrentTab(tab);
          setIsChatbotOpen(false);
        }}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser } = useHomestay();

  if (!currentUser) {
    return <LoginView />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <HomestayProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </HomestayProvider>
  );
}
