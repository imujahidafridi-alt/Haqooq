import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { chatService, ChatMessage } from '../../services/chatService';
import { Send, ArrowLeft, Shield, Lock } from 'lucide-react';

interface Props {
  chatId: string;
  chatTitle: string;
  onBack?: () => void;
}

export const ChatRoomView: React.FC<Props> = ({ chatId, chatTitle, onBack }) => {
  const { user } = useAuthStore();
  const { addToast } = useUiStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !user?.id) return;
    setIsLoading(true);

    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    // Safety timeout: guarantees spinner never hangs
    const timer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 2000);

    const init = async () => {
      // Ensure parent chat document exists to satisfy Firestore security rules
      await chatService.ensureChatThread(chatId, user.id);

      // Mark as read
      await chatService.markChatAsRead(chatId, user.id);

      // Listen to messages in realtime
      if (isMounted) {
        unsubscribe = chatService.listenToMessages(
          chatId,
          (msgs: ChatMessage[]) => {
            if (isMounted) {
              setMessages(msgs);
              setIsLoading(false);
            }
          },
          75
        );
      }
    };

    init();

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || isSending) return;

    const messageText = text.trim();
    setText('');
    setIsSending(true);

    try {
      await chatService.sendMessage(chatId, user.id, messageText);
    } catch (err: any) {
      addToast(err.message || 'Failed to send message', 'error');
      setText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* Chat Room Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden text-slate-500 hover:text-slate-800 p-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Back to threads"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <Avatar name={chatTitle} size="sm" />

          <div className="min-w-0">
            <h2 className="font-bold text-sm sm:text-base text-slate-900 truncate">
              {chatTitle}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <Lock size={11} />
              <span className="truncate">Attorney-Client Privileged Communication</span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
          <Shield size={13} className="text-[#1A365D]" />
          <span>Encrypted Legal Channel</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3 bg-slate-50/70">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" label="Loading confidential messages..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1A365D] flex items-center justify-center mb-3 ring-8 ring-blue-50/50">
              <Shield size={24} />
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">
              Consultation Room Initialized
            </h4>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              All communications in this consultation are covered under statutory professional legal privilege. Send your first message below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-2xs text-sm leading-relaxed ${
                    isSelf
                      ? 'bg-[#1A365D] text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`text-[10px] text-right mt-1 font-medium ${
                      isSelf ? 'text-blue-200/80' : 'text-slate-400'
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 sm:gap-3 shrink-0"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type confidential legal consultation message..."
          className="flex-1 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/15 text-sm outline-none transition-all"
        />

        <Button
          type="submit"
          variant="primary"
          disabled={!text.trim() || isSending}
          loading={isSending}
          icon={<Send size={15} />}
          className="shrink-0"
        >
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
};
