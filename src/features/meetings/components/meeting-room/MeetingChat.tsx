'use client';

import * as React from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import {
  getMeetingChatMessages,
  sendMeetingChatMessage,
  ChatMessageWithSender,
} from '../../services/chatService';

interface MeetingChatProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  currentUserId: string;
}

export function MeetingChat({
  isOpen,
  onClose,
  meetingId,
  currentUserId,
}: MeetingChatProps) {
  const [messages, setMessages] = React.useState<ChatMessageWithSender[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load message history
  React.useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    async function loadHistory() {
      const history = await getMeetingChatMessages(meetingId);
      if (isSubscribed) {
        setMessages(history);
        setTimeout(scrollToBottom, 100);
      }
    }

    loadHistory();

    // Subscribe to real-time chat insertions on Supabase table
    const channel = supabase
      .channel(`chat:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_chat_messages',
          filter: `meeting_id=eq.${meetingId}`,
        },
        async (payload) => {
          // Fetch sender profile to show name & avatar
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: ChatMessageWithSender = {
            id: payload.new.id,
            meeting_id: payload.new.meeting_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            sender: sender || null,
          };

          setMessages((prev) => [...prev, newMessage]);
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      channel.unsubscribe();
    };
  }, [isOpen, meetingId, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const content = inputValue;
    setInputValue('');
    setIsSending(true);

    const res = await sendMeetingChatMessage(meetingId, content);
    setIsSending(false);

    if (res.success && res.data) {
      scrollToBottom();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full sm:w-80 md:w-96 flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl">
      {/* Chat Header */}
      <div className="flex h-14 sm:h-16 items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">In-Call Messages</h3>
          <p className="text-[11px] text-slate-400">Visible to participants in this meeting</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Chat"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-400 p-6">
            <p>No messages yet.</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Messages are saved and preserved for this meeting.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const senderName = isMe
              ? 'You'
              : msg.sender?.full_name || msg.sender?.email?.split('@')[0] || 'Member';

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isMe && (
                  <Avatar
                    src={msg.sender?.avatar_url}
                    fallback={senderName}
                    size="sm"
                    className="h-7 w-7 text-[10px] shrink-0 mt-0.5"
                  />
                )}

                <div className={`max-w-[78%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {senderName}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Send a message to everyone..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 rounded-xl bg-slate-800/90 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <Button
            type="submit"
            size="icon"
            variant="primary"
            disabled={!inputValue.trim() || isSending}
            className="h-9 w-9 shrink-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
