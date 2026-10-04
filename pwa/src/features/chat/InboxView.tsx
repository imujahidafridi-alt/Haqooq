import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ChatRoomView } from './ChatRoomView';
import { chatService, ChatThread } from '../../services/chatService';
import {
  MessageSquare,
  ShieldCheck,
  Lock,
  Search,
  Scale,
  FileText,
  UserCheck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface Props {
  initialChatId?: string | null;
  initialChatTitle?: string | null;
}

export const InboxView: React.FC<Props> = ({ initialChatId, initialChatTitle }) => {
  const { user } = useAuthStore();
  const { setActiveTab } = useUiStore();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<{ id: string; title: string } | null>(
    initialChatId ? { id: initialChatId, title: initialChatTitle || 'Active Chat' } : null
  );

  useEffect(() => {
    if (initialChatId) {
      setSelectedChat({ id: initialChatId, title: initialChatTitle || 'Active Chat' });
    }
  }, [initialChatId, initialChatTitle]);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);

    const unsubscribe = chatService.subscribeToInboxChats(user.id, (chatThreads: ChatThread[]) => {
      setThreads(chatThreads);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getThreadTitle = (thread: ChatThread) => {
    if (thread.id.startsWith('direct-')) {
      return 'Direct Legal Consultation';
    }
    return thread.caseId ? `Case #${thread.caseId.slice(0, 6)} Consultation` : 'Legal Consultation';
  };

  const filteredThreads = threads.filter((t) => {
    if (!searchFilter.trim()) return true;
    const title = getThreadTitle(t).toLowerCase();
    const lastMsg = (t.lastMessage || '').toLowerCase();
    const query = searchFilter.toLowerCase();
    return title.includes(query) || lastMsg.includes(query);
  });

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm flex overflow-hidden h-[calc(100vh-140px)] min-h-[640px]">
      {/* Left Pane: Conversation Threads list */}
      <div
        className={`w-full md:w-88 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-white ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Thread header */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">
                Consultations
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {threads.length} active legal dialogue threads
              </p>
            </div>
            <div
              className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
              title="Privileged legal communication channel"
            >
              <ShieldCheck size={16} className="text-emerald-600" />
              <span className="hidden sm:inline">Protected</span>
            </div>
          </div>

          {/* Quick search inside threads */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1A365D] focus:ring-2 focus:ring-[#1A365D]/10 outline-none transition-all"
            />
          </div>
        </div>

        {/* Thread items list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex justify-center items-center h-56">
              <LoadingSpinner size="md" label="Loading consultation threads..." />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center text-center h-full">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1A365D] mb-3">
                <MessageSquare size={24} />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                {searchFilter ? 'No matching conversations' : 'No Conversations Yet'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mb-4">
                {searchFilter
                  ? 'Try searching with another keyword.'
                  : 'Consultation threads are opened when an advocate bids on your legal matter or when you reach out directly.'}
              </p>
              {!searchFilter && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setActiveTab('search')}
                  className="gap-1.5"
                >
                  <Search size={14} />
                  <span>Find an Advocate</span>
                </Button>
              )}
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const unreadCount = user?.id && thread.unreadCount ? thread.unreadCount[user.id] || 0 : 0;
              const isSelected = selectedChat?.id === thread.id;
              const isDirect = thread.id.startsWith('direct-');
              const title = getThreadTitle(thread);

              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedChat({ id: thread.id, title })}
                  className={`p-4 flex items-center gap-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-l-[#1A365D]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <Avatar name={title} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0 ${
                            isDirect
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isDirect ? 'Direct' : 'Case'}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                        {formatTimestamp(thread.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate leading-relaxed">
                        {thread.lastMessage || 'No messages yet...'}
                      </p>

                      {unreadCount > 0 && (
                        <span className="bg-[#1A365D] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Consultation Room or Privilege Overview */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50/50 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <ChatRoomView
            chatId={selectedChat.id}
            chatTitle={selectedChat.title}
            onBack={() => setSelectedChat(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center overflow-y-auto">
            <div className="max-w-xl mx-auto flex flex-col items-center">
              {/* Grand privilege seal */}
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1A365D] to-[#2A4365] text-white flex items-center justify-center shadow-lg shadow-[#1A365D]/15 mb-6 ring-4 ring-blue-50">
                <Scale size={40} className="text-[#C5A880]" />
              </div>

              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold mb-3 shadow-2xs">
                <Lock size={14} className="text-emerald-600" />
                <span>Encrypted Attorney-Client Privilege</span>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                Haqooq Legal Consultations
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Select a conversation on the left to consult with your advocate, review case proposals, or share confidential legal files under privileged legal protections.
              </p>

              {/* 3 Pillars of Confidentiality */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8 text-left">
                <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1A365D] flex items-center justify-center mb-2.5">
                    <Lock size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Statutory Privilege
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Protected under Article 9 of Qanun-e-Shahadat Order 1984.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5">
                    <UserCheck size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Verified Advocates
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Every advocate is verified against provincial Bar Council rolls.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2.5">
                    <FileText size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Case Brief Integrity
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Court hearing timelines and filings remain tied to your docket.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => setActiveTab('search')}
                  className="gap-2"
                >
                  <Search size={16} />
                  <span>Explore Verified Advocates</span>
                </Button>
                {user?.role === 'client' && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('post')}
                    className="gap-2"
                  >
                    <span>Post a Legal Case</span>
                    <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
