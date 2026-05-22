"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { apiFetch } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SurveillancePage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const { data: chats, isLoading: chatsLoading } = useQuery<any[]>({
    queryKey: ['surveillance_chats'],
    queryFn: async () => apiFetch('/api/chats')
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ['surveillance_messages', selectedChat],
    queryFn: async () => apiFetch(`/api/chats/${selectedChat}`),
    enabled: !!selectedChat
  });

  const chatColumns = [
    { header: 'Chat ID', accessorKey: 'id' },
    { header: 'Case / Title', accessorKey: 'title' },
    { header: 'Last Message', accessorKey: 'lastMessage' },
    { header: 'Type', accessorKey: 'type' },
    { 
      header: 'Actions', 
      accessorKey: 'actions' 
    }
  ];

  return (
    <PageShell title="Surveillance System">
      <div className="space-y-6">
        <Card title="Communication Monitor">
          <p className="mb-4 text-sm text-slate-400">
            Monitor communications between clients and lawyers to ensure transparency and mitigate fraud attempts.
          </p>
          
          {selectedChat ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Viewing Chat Log</h3>
                <Button variant="outline" size="sm" onClick={() => setSelectedChat(null)}>
                  Back to Chats
                </Button>
              </div>
              
              <div className="flex h-96 flex-col gap-4 overflow-y-auto rounded-2xl bg-slate-950 p-4">
                {messagesLoading ? (
                  <div className="text-center text-slate-500">Loading messages...</div>
                ) : messages?.length ? (
                  messages.map((msg) => (
                    <div key={msg.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-brand-400">{msg.senderId}</span>
                        <span className="text-xs text-slate-500">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">{msg.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500">No messages in this chat.</div>
                )}
              </div>
            </div>
          ) : (
            <>
              {chatsLoading ? (
                <div className="h-40 rounded-2xl bg-slate-950/80" />
              ) : (
                <DataTable
                  columns={chatColumns as any}
                  data={chats?.map(chat => ({
                    ...chat,
                    title: chat.metadata?.caseTitle || 'Direct Chat',
                    type: <Badge label={chat.type || 'direct'} variant={chat.type === 'case' ? 'info' : 'default'} />,
                    actions: (
                      <Button size="sm" onClick={() => setSelectedChat(chat.id)}>
                        Spy
                      </Button>
                    )
                  })) || []}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </PageShell>
  );
}