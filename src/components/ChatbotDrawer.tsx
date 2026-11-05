import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  X,
  Bot,
  Minimize2,
  Move,
} from 'lucide-react';
import { useHomestay } from '../context/HomestayContext';
import { formatVND } from '../utils/helpers';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: any) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { rooms, bookings, customers, services, serviceItems, paymentReceipts } = useHomestay();

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Xin chào Quản lý! Tôi là Chatbot hỗ trợ quản lý homestay Chicstay. Tôi có thể hỗ trợ bạn tra cứu phòng trống, top phòng/dịch vụ, khách quay lại > 3 lần, đỉnh điểm doanh thu ngày/tháng/mùa và quy trình cọc 30% / hoàn tiền 48h.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const WINDOW_WIDTH = 400;
  const WINDOW_HEIGHT = 560;

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const initializePosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const maxX = Math.max(10, window.innerWidth - WINDOW_WIDTH - 24);
    const maxY = Math.max(10, window.innerHeight - WINDOW_HEIGHT - 24);
    setPosition({ x: maxX, y: maxY });
  }, [WINDOW_WIDTH, WINDOW_HEIGHT]);

  useEffect(() => {
    if (isOpen && !position) {
      initializePosition();
    }
  }, [isOpen, position, initializePosition]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const maxX = Math.max(10, window.innerWidth - WINDOW_WIDTH - 10);
        const maxY = Math.max(10, window.innerHeight - WINDOW_HEIGHT - 10);
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [WINDOW_WIDTH, WINDOW_HEIGHT]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!position) return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = moveEvent.clientX - dragOffsetRef.current.x;
      const newY = moveEvent.clientY - dragOffsetRef.current.y;

      const maxX = Math.max(10, window.innerWidth - WINDOW_WIDTH - 10);
      const maxY = Math.max(10, window.innerHeight - WINDOW_HEIGHT - 10);

      setPosition({
        x: Math.min(Math.max(10, newX), maxX),
        y: Math.min(Math.max(10, newY), maxY),
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    'Hôm nay có bao nhiêu phòng trống?',
    'Khách quay lại trên 3 lần?',
    'Top 5 phòng được đặt nhiều nhất?',
    'Top 5 dịch vụ sử dụng nhiều nhất?',
    'Doanh thu cao nhất theo ngày/tháng/mùa?',
    'Chính sách đặt cọc và hoàn cọc 48h?',
    'Quy định phụ thu check-in sớm D008?',
    'Quy định trả phòng muộn D009?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    const totalRev = paymentReceipts
      .filter((p) => p.LoaiPhieu === 'Cọc' || p.LoaiPhieu === 'Tất toán')
      .reduce((s, p) => s + p.SoTien, 0);

    const contextPayload = {
      rooms,
      bookings,
      customers,
      services,
      serviceItems,
      paymentReceipts,
      totalRevenue: totalRev,
    };

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: contextPayload,
        }),
      });

      const data = await response.json();
      const replyText = data.reply || 'Xin lỗi, trợ lý chưa xử lý được câu hỏi lúc này.';

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: `Tình trạng phòng Chicstay:\n- Sẵn sàng: ${rooms.filter((r) => r.TrangThaiPhong === 'Sẵn sàng').length} phòng\n- Đang sử dụng: ${rooms.filter((r) => r.TrangThaiPhong === 'Đang sử dụng').length} phòng.\nTổng doanh thu đã thu: ${formatVND(totalRev)}.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && position && (
        <div
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${WINDOW_WIDTH}px`,
            height: `${WINDOW_HEIGHT}px`,
            zIndex: 60,
          }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Draggable Header */}
          <div
            onMouseDown={handleMouseDown}
            className="p-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0"
            title="Nhấn giữ và kéo để di chuyển cửa sổ chat"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black tracking-wide">Chatbot Hỗ Trợ Quản Lý</h3>
                  <Move className="w-3 h-3 text-white/60" />
                </div>
                <span className="text-[10px] text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Trực tuyến · Chicstay Homestay
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Thu nhỏ trợ lý"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Đóng trợ lý"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5 text-xs shrink-0">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/50 transition-all text-[11px] font-medium shrink-0 cursor-pointer shadow-2xs"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/60 select-text">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl w-fit text-xs text-slate-500 shadow-2xs">
                <Bot className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Trợ lý đang phân tích dữ liệu...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Field */}
          <div className="p-3 border-t border-slate-200 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Hỏi về phòng trống, top phòng, khách quay lại..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden select-text"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold transition-all shadow-xs cursor-pointer"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
