"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, MessageSquare, User, ArrowLeft, MessageSquareOff, HelpCircle, Calendar } from 'lucide-react';

export default function SurveillancePage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Fetch chats
  const { data: chats = [], isLoading: chatsLoading } = useQuery<any[]>({
    queryKey: ['surveillance_chats'],
    queryFn: async () => apiFetch('/api/chats')
  });

  // Fetch messages for active chat
  const { data: messages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ['surveillance_messages', selectedChatId],
    queryFn: async () => apiFetch(`/api/chats/${selectedChatId}`),
    enabled: !!selectedChatId
  });

  // Get active chat profile data
  const activeChat = chats.find(c => c.id === selectedChatId);

  // Map participant details
  const getParticipantName = (uid: string) => {
    const p = activeChat?.participantDetails?.find((x: any) => x.uid === uid);
    return p?.name || uid;
  };

  const getParticipantRole = (uid: string) => {
    return activeChat?.participantDetails?.find((x: any) => x.uid === uid)?.role || 'user';
  };

  return (
    <PageShell title="Surveillance System">
      <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
        {/* Banner */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shrink-0 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-400" />
              Compliance Surveillance Hub
            </h2>
            <p className="text-xs text-slate-400">
              Audit peer-to-peer lawyer communications, moderate user interactions, and investigate reported fraud attempts.
            </p>
          </div>
        </div>

        {/* Workspace split-pane */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-[0.8fr_1.2fr] gap-6">
          
          {/* Left Panel: Chat List */}
          <div className={`rounded-3xl border border-slate-800 bg-slate-900/95 overflow-hidden flex flex-col ${selectedChatId ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-300">Active Communication Streams ({chats.length})</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-slate-850/60">
              {chatsLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-slate-950/40 animate-pulse border border-slate-900" />
                  ))}
                </div>
              ) : chats.length > 0 ? (
                chats.map((chat) => {
                  const isActive = chat.id === selectedChatId;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`p-4 flex flex-col gap-2 cursor-pointer transition ${
                        isActive ? 'bg-slate-950/80 border-l-2 border-brand-500' : 'hover:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-mono">ID: {chat.id.slice(0, 8)}…</span>
                        <Badge
                          label={chat.type || 'direct'}
                          variant={chat.type === 'case' ? 'info' : 'default'}
                        />
                      </div>
                      
                      <h4 className="text-sm font-semibold text-white line-clamp-1">
                        {chat.resolvedCaseTitle || 'Direct Chat'}
                      </h4>

                      {/* Participant Previews */}
                      <div className="flex gap-1.5 flex-wrap">
                        {chat.participantDetails?.map((p: any) => (
                          <span
                            key={p.uid}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                              p.role === 'lawyer' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <User className="h-2.5 w-2.5" />
                            {p.name}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-1 mt-1 italic">
                        Last update: {chat.updatedAt ? new Date(chat.updatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-64">
                  <MessageSquareOff className="h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-sm">No active conversation streams found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Chat Viewer */}
          <div className={`rounded-3xl border border-slate-800 bg-slate-900/95 overflow-hidden flex flex-col ${selectedChatId ? 'flex' : 'hidden lg:flex'}`}>
            {selectedChatId && activeChat ? (
              <>
                {/* Chat Metadata Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between shrink-0">
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedChatId(null)}
                      className="lg:hidden inline-flex items-center gap-1 text-xs text-brand-400 font-semibold mb-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to list
                    </button>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {activeChat.resolvedCaseTitle}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">Stream: {activeChat.id}</p>
                  </div>
                </div>

                {/* Participant detail bar */}
                <div className="px-4 py-2 border-b border-slate-850 bg-slate-950/40 flex flex-wrap gap-2 items-center justify-start shrink-0 text-xs text-slate-400">
                  <span className="font-semibold text-slate-500">Participants:</span>
                  {activeChat.participantDetails?.map((p: any) => (
                    <div key={p.uid} className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-2 py-0.5">
                      <span className="font-medium text-slate-200">{p.name}</span>
                      <span className="text-[10px] uppercase text-slate-500 font-bold">({p.role})</span>
                    </div>
                  ))}
                </div>

                {/* Message stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-48 text-xs text-slate-500">
                      Loading conversation messages...
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg) => {
                      const senderRole = getParticipantRole(msg.senderId);
                      const isLawyer = senderRole === 'lawyer';
                      
                      return (
                        <div key={msg.id} className="flex flex-col max-w-[85%] space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-[10px] font-bold ${isLawyer ? 'text-amber-450' : 'text-sky-400'}`}>
                              {getParticipantName(msg.senderId)}
                            </span>
                            <span className="text-[10px] text-slate-650">({senderRole})</span>
                          </div>
                          
                          <div className={`rounded-2xl border p-3.5 text-sm ${
                            isLawyer 
                              ? 'bg-amber-500/5 border-amber-500/20 text-slate-250' 
                              : 'bg-slate-900 border-slate-800 text-slate-200'
                          }`}>
                            <p className="leading-relaxed">{msg.text}</p>
                            
                            <span className="block text-[9px] text-slate-500 mt-2 font-mono text-right">
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-550 italic">
                      <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
                      <p className="text-sm">Conversation initialized. No messages exchanged.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
                <div className="rounded-full bg-slate-900 border border-slate-800 p-4 mb-4">
                  <ShieldCheck className="h-10 w-10 text-slate-650" />
                </div>
                <h4 className="text-md font-semibold text-slate-300">Select Stream to Audit</h4>
                <p className="text-xs text-slate-500 text-center max-w-sm mt-1">
                  Choose an active chat stream from the left list to review detailed messaging threads and participant activities.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}