import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessagesSquare,
  Send,
  Loader2,
  Wifi,
  WifiOff,
  Mic,
  Users,
  ArrowLeft,
  MessageCircle,
  X,
  Trash2,
  CheckSquare,
  Check,
} from 'lucide-react';
import {
  API_WS_URL,
  getRoomMessages,
  postRoomMessage,
  getToken,
  getDmMessages,
  sendDm,
  getUsers,
  deleteRoomMessages,
  deleteAllRoomMessages,
  deleteDmMessages,
  deleteAllDmMessages,
} from '../lib/api';
import type { RoomMessage, PresenceUser, DirectMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { readFileAsAttachment } from '../lib/attachments';
import type { Attachment } from '../lib/attachments';
import AutoGrowTextarea from '../components/AutoGrowTextarea';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

const AVATAR_COLORS = [
  'from-brand-500 to-violet-500',
  'from-cyan-500 to-brand-500',
  'from-amber-500 to-rose-500',
  'from-emerald-500 to-cyan-500',
  'from-fuchsia-500 to-brand-500',
];

function colorFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function timeLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Renders a message bubble that may embed a pasted image as ![image](data:...)
function MessageContent({ content, image }: { content: string; image?: string }) {
  if (image) {
    return (
      <div className="space-y-2">
        <img src={image} alt="Shared image" className="max-h-64 w-auto max-w-full rounded-xl object-cover" />
        {content.replace(/!\[image\]\(data:[^)]*\)/, '').trim() && (
          <p className="whitespace-pre-wrap break-words">{content.replace(/!\[image\]\(data:[^)]*\)/, '').trim()}</p>
        )}
      </div>
    );
  }

  const parts = content.split(/!\[image\]\(data:[^)]*\)/);
  const hasImage = /!\[image\]\(data:[^)]*\)/.test(content);
  if (hasImage) {
    const match = content.match(/!\[image\]\(data:[^)]*\)/);
    const src = match?.[0].replace('![image](', '').slice(0, -1);
    return (
      <div className="space-y-2">
        {src && <img src={src} alt="Shared image" className="max-h-64 w-auto max-w-full rounded-xl object-cover" />}
        {parts.filter(Boolean).join('').trim() && (
          <p className="whitespace-pre-wrap break-words">{parts.filter(Boolean).join('').trim()}</p>
        )}
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words">{content}</p>;
}

interface RoomChatProps {
  className?: string;
  initialDmPeer?: { id: number; name: string } | null;
}

export default function RoomChat({ className = '', initialDmPeer = null }: RoomChatProps) {
  const { user, isDemo, loading } = useAuth();
  const selfId = user?.id ?? -1;
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [allUsers, setAllUsers] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [roomAttachment, setRoomAttachment] = useState<Attachment | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const seenIds = useRef(new Set<number>());
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1:1 DM state
  const [dmPeer, setDmPeer] = useState<PresenceUser | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const [dmError, setDmError] = useState('');
  const [dmSelectMode, setDmSelectMode] = useState(false);
  const [dmSelected, setDmSelected] = useState<Set<number>>(new Set());
  const [dmDeleting, setDmDeleting] = useState(false);
  const dmScrollRef = useRef<HTMLDivElement>(null);

  // Voice for room composer
  const {
    supported: voiceSupported,
    listening: voiceListening,
    transcript: voiceTranscript,
    toggle: toggleVoice,
    reset: resetVoice,
  } = useSpeechRecognition();

  // Voice for DM composer
  const {
    supported: dmVoiceSupported,
    listening: dmVoiceListening,
    transcript: dmVoiceTranscript,
    toggle: dmToggleVoice,
    reset: dmResetVoice,
  } = useSpeechRecognition();

  useEffect(() => {
    if (voiceListening && voiceTranscript) setInput(voiceTranscript);
  }, [voiceListening, voiceTranscript]);

  useEffect(() => {
    if (dmVoiceListening && dmVoiceTranscript) setDmInput(dmVoiceTranscript);
  }, [dmVoiceListening, dmVoiceTranscript]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const appendUnique = useCallback((incoming: RoomMessage[]) => {
    setMessages((prev) => {
      const next = [...prev];
      for (const m of incoming) {
        if (m.id > 0 && seenIds.current.has(m.id)) continue;
        if (m.id > 0) seenIds.current.add(m.id);
        const tempIdx = next.findIndex((t) => t.id < 0 && t.content === m.content && t.name === m.name);
        if (tempIdx >= 0) {
          next[tempIdx] = m;
          continue;
        }
        next.push(m);
      }
      return next.slice(-100);
    });
  }, []);

  const reconcile = useCallback(async () => {
    try {
      const res = await getRoomMessages(50);
      setOnline(res.online);
      if (res.users) setUsers(res.users);
      appendUnique(res.messages);
    } catch {
      /* keep quiet; retry next tick */
    }
  }, [appendUnique]);

  // Open a DM thread with a peer
  const openDm = useCallback(async (peer: PresenceUser) => {
    setDmPeer(peer);
    setDmError('');
    try {
      const res = await getDmMessages(peer.id);
      setDmMessages(res.messages);
      setTimeout(() => {
        if (dmScrollRef.current) dmScrollRef.current.scrollTop = dmScrollRef.current.scrollHeight;
      }, 50);
    } catch {
      setDmError('Could not load conversation.');
    }
  }, []);

  const closeDm = useCallback(() => {
    setDmPeer(null);
    setDmMessages([]);
    setDmInput('');
    setRoomAttachment(null);
    dmResetVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open a 1:1 thread requested from a notification / URL param
  useEffect(() => {
    if (initialDmPeer && !loading) {
      openDm({ id: initialDmPeer.id, name: initialDmPeer.name });
    }
  }, [initialDmPeer, loading, openDm]);

  const sendDmMessage = useCallback(async () => {
    const content = dmInput.trim();
    const attach = roomAttachment;
    if ((!content && !attach) || !dmPeer || dmSending) return;
    setDmSending(true);
    setDmInput('');
    setRoomAttachment(null);
    setDmError('');

    const payload = attach
      ? content
        ? content + '\n![image](data:' + attach.mime + ';base64,' + attach.data + ')'
        : '![image](data:' + attach.mime + ';base64,' + attach.data + ')'
      : content;

    const tempId = -1 - Date.now();
    const optimistic: DirectMessage = {
      id: tempId,
      sender_id: user?.id ?? 0,
      recipient_id: dmPeer.id,
      name: 'You',
      content: payload,
      created_at: new Date().toISOString(),
    };
    setDmMessages((prev) => [...prev, optimistic]);
    setTimeout(() => {
      if (dmScrollRef.current) dmScrollRef.current.scrollTop = dmScrollRef.current.scrollHeight;
    }, 30);

    try {
      const saved = await sendDm(dmPeer.id, payload);
      setDmMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch (err) {
      setDmError(err instanceof Error ? err.message : 'Could not send message.');
      setDmMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDmInput(content);
      setRoomAttachment(attach);
    } finally {
      setDmSending(false);
    }
  }, [dmInput, dmPeer, dmSending, roomAttachment, user]);

  useEffect(() => {
    getRoomMessages(50)
      .then((res) => {
        setOnline(res.online);
        if (res.users) setUsers(res.users);
        appendUnique(res.messages);
        setTimeout(scrollToBottom, 50);
      })
      .catch(() => setError('Could not load chat history.'));

    // Load the full member list (registered users) once signed in
    if (!loading && getToken() && !isDemo) {
      getUsers()
        .then((res) => {
          setAllUsers(res.users.map((u) => ({ id: u.id, name: u.name || 'User' })));
        })
        .catch(() => {
          /* presence members still available */
        });
    }
  }, [appendUnique, loading, isDemo]);

  useEffect(() => {
    if (loading || !getToken()) return;

    const pollTimer = window.setInterval(() => {
      reconcile();
    }, 3000);

    let ws: WebSocket | null = null;
    let retryTimer: number | undefined;
    let closed = false;

    const connect = () => {
      const token = getToken();
      if (!token || closed) return;
      ws = new WebSocket(`${API_WS_URL}/ws/room?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError('');
        reconcile();
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            appendUnique([data]);
            scrollToBottom();
          } else if (data.type === 'deleted' && Array.isArray(data.ids)) {
            const idSet = new Set(data.ids as number[]);
            setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
            for (const id of idSet) seenIds.current.delete(id);
          } else if (data.type === 'presence') {
            setOnline(data.online);
            if (data.users) setUsers(data.users);
          } else if (data.type === 'dm' && data.message) {
            // Incoming live DM for the open peer
            if (dmPeer && (data.message.sender_id === dmPeer.id || data.message.recipient_id === dmPeer.id)) {
              setDmMessages((prev) => {
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
              setTimeout(() => {
                if (dmScrollRef.current) dmScrollRef.current.scrollTop = dmScrollRef.current.scrollHeight;
              }, 30);
            }
          } else if (data.type === 'dm_deleted' && Array.isArray(data.ids)) {
            // Live deletion in a 1:1 thread
            if (dmPeer && (data.peer_id === dmPeer.id || data.peer_id === selfId)) {
              const idSet = new Set(data.ids as number[]);
              setDmMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
            }
          } else if (data.type === 'dm_ack' && data.id) {
            // Ack already handled by optimistic replace; ignore
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          retryTimer = window.setTimeout(() => connect(), 2500);
        }
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.clearInterval(pollTimer);
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [loading, user, appendUnique, reconcile, dmPeer, selfId]);

  const hasSelf = Boolean(user && !loading);
  const selfName = isDemo ? `Demo User ${user?.id ?? ''}` : user?.name || '';

  const handleSend = async () => {
    const content = input.trim();
    const attach = roomAttachment;
    if ((!content && !attach) || sending) return;
    setInput('');
    setRoomAttachment(null);
    setSending(true);
    setError('');
    if (voiceListening) {
      resetVoice();
      toggleVoice();
    }

    const tempId = -1 - Date.now();

    const payload = attach
      ? content
        ? content + '\n![image](data:' + attach.mime + ';base64,' + attach.data + ')'
        : '![image](data:' + attach.mime + ';base64,' + attach.data + ')'
      : content;

    setMessages((prev) => [
      ...prev,
      { id: tempId, user_id: selfId, name: selfName, content: payload, created_at: null, image: attach?.preview },
    ]);
    scrollToBottom();

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ content: payload }));
      setTimeout(reconcile, 600);
      setSending(false);
      return;
    }

    try {
      await postRoomMessage(payload);
      setTimeout(reconcile, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
      setRoomAttachment(attach);
    } finally {
      setSending(false);
    }
  };

  const toggleSelect = useCallback(
    (id: number) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    []
  );

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0 || deleting) return;
    setDeleting(true);
    const ids = Array.from(selected);
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    exitSelectMode();
    try {
      await deleteRoomMessages(ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete messages.');
    } finally {
      setDeleting(false);
    }
  }, [selected, deleting, exitSelectMode]);

  const handleDeleteAllMine = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    setMessages((prev) => prev.filter((m) => m.user_id !== selfId));
    exitSelectMode();
    try {
      await deleteAllRoomMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete messages.');
    } finally {
      setDeleting(false);
    }
  }, [deleting, exitSelectMode, selfId]);

  const exitDmSelectMode = useCallback(() => {
    setDmSelectMode(false);
    setDmSelected(new Set());
  }, []);

  const toggleDmSelect = useCallback((id: number) => {
    setDmSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDmDeleteSelected = useCallback(async () => {
    if (dmSelected.size === 0 || dmDeleting) return;
    setDmDeleting(true);
    const ids = Array.from(dmSelected);
    setDmMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    exitDmSelectMode();
    try {
      await deleteDmMessages(ids);
    } catch (err) {
      setDmError(err instanceof Error ? err.message : 'Could not delete messages.');
    } finally {
      setDmDeleting(false);
    }
  }, [dmSelected, dmDeleting, exitDmSelectMode]);

  const handleDmDeleteAllMine = useCallback(async () => {
    if (!dmPeer || dmDeleting) return;
    setDmDeleting(true);
    setDmMessages((prev) => prev.filter((m) => m.sender_id !== selfId));
    exitDmSelectMode();
    try {
      await deleteAllDmMessages(dmPeer.id);
    } catch (err) {
      setDmError(err instanceof Error ? err.message : 'Could not delete messages.');
    } finally {
      setDmDeleting(false);
    }
  }, [dmPeer, dmDeleting, exitDmSelectMode, selfId]);

  const handleDmPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          if (!file.type.startsWith('image/')) {
            setPasteError('Only images can be pasted into chat rooms; other files work in Charmeey Chats.');
            setTimeout(() => setPasteError(''), 4000);
            return;
          }
          try {
            const attachment = await readFileAsAttachment(file);
            setRoomAttachment(attachment);
          } catch (err) {
            setPasteError(err instanceof Error ? err.message : 'Paste failed.');
            setTimeout(() => setPasteError(''), 4000);
          }
        }
        return;
      }
    }
  };

  // Members sidebar shown to the left of the chatting panel
  const renderMembersSidebar = () => {
    const onlineIds = new Set(users.map((u) => u.id));
    const merged: PresenceUser[] = [];
    for (const u of allUsers) {
      if (onlineIds.has(u.id)) continue;
      merged.push(u);
    }
    const members = [...users, ...merged];
    return (
      <aside className="hidden sm:flex w-56 lg:w-64 shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Users className="h-4 w-4 text-brand-300" />
          <span className="text-[13px] font-semibold text-white">Members</span>
          <span className="ml-auto rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-medium text-brand-300">
            {members.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {members.length === 0 ? (
            <p className="px-2 py-3 text-xs text-white/30">No members yet.</p>
          ) : (
            members.map((u) => {
              const isSelf = u.id === selfId;
              const isOnline = onlineIds.has(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => !isSelf && openDm(u)}
                  disabled={isSelf}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                    isSelf
                      ? 'opacity-40 cursor-default'
                      : 'text-white/70 hover:bg-white/[0.07] hover:text-white'
                  }`}
                  title={isSelf ? 'This is you' : `Message ${u.name} privately`}
                >
                  <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colorFor(u.name)} text-[10px] font-bold text-white`}>
                    {u.name.trim().charAt(0).toUpperCase() || '?'}
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-ink-900" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  {u.id === selfId && (
                    <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/40">you</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>
    );
  };

  // If a DM peer is open, render DM thread instead of the room
  if (dmPeer) {
    return (
      <div className={`flex overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl ${className}`}>
        {/* Members sidebar (left of the chatting panel) */}
        {renderMembersSidebar()}

        {/* DM panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* DM Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={closeDm}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5"
                title="Back to room"
                aria-label="Back to room"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colorFor(dmPeer.name)} text-xs font-semibold text-white`}>
                {dmPeer.name.trim().charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{dmPeer.name}</div>
                <div className="text-[10px] text-white/40">Direct message · 1:1</div>
              </div>
            </div>
            {dmSelectMode ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/60">{dmSelected.size} selected</span>
                <button
                  onClick={handleDmDeleteSelected}
                  disabled={dmSelected.size === 0 || dmDeleting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  onClick={exitDmSelectMode}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/50 transition-colors hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {dmMessages.length > 0 && (
                  <>
                    <button
                      onClick={() => setDmSelectMode(true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/50 transition-colors hover:text-white"
                      title="Select your messages to delete"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Select
                    </button>
                    <button
                      onClick={handleDmDeleteAllMine}
                      disabled={dmDeleting}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20"
                      title="Delete all messages you sent in this thread"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear mine
                    </button>
                  </>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-[10px] font-medium text-brand-300">
                  <MessageCircle className="h-3 w-3" />
                  Private
                </span>
              </div>
            )}
          </div>

          {/* DM Messages */}
          <div ref={dmScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {dmMessages.length === 0 && !dmError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <MessageCircle className="h-8 w-8 text-white/20" />
                <p className="text-sm text-white/40">No messages yet with {dmPeer.name}.</p>
              </div>
            ) : (
              dmMessages.map((m) => {
                const isMine = m.sender_id === selfId;
                const isSelected = dmSelected.has(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={dmSelectMode && isMine ? () => toggleDmSelect(m.id) : undefined}
                    className={`flex items-start gap-2.5 ${isMine ? 'flex-row-reverse' : ''} ${
                      dmSelectMode && isMine ? 'cursor-pointer' : ''
                    }`}
                  >
                    {dmSelectMode && isMine && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDmSelect(m.id);
                        }}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected ? 'bg-brand-500 border-brand-500' : 'border-white/30 hover:border-white/60'
                        }`}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleDmSelect(m.id);
                          }
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    )}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                        isMine ? 'from-brand-500 to-violet-600' : colorFor(m.name)
                      } text-xs font-semibold text-white`}
                    >
                      {m.name.trim().charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className={`max-w-[78%] sm:max-w-[70%] ${isMine ? 'items-end' : ''} flex flex-col`}>
                      <div className="mb-0.5 flex items-baseline gap-2 px-1">
                        <span className={`text-[11px] font-semibold ${isMine ? 'text-brand-300' : 'text-white/70'}`}>
                          {m.name}
                        </span>
                        <span className="text-[9px] text-white/30">{timeLabel(m.created_at)}</span>
                      </div>
                      <div
                        className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed transition-opacity ${
                          isMine
                            ? 'rounded-tr-sm bg-gradient-to-r from-brand-600 to-violet-600 text-white'
                            : 'rounded-tl-sm bg-white/[0.06] text-white/85'
                        } ${dmSelectMode && isMine && !isSelected ? 'opacity-40' : ''}`}
                      >
                        <MessageContent content={m.content} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {dmError && <p className="text-center text-xs text-rose-400/80">{dmError}</p>}
          </div>

          {/* DM Composer */}
          <div className="border-t border-white/[0.06] p-3 sm:p-4">
            {roomAttachment && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-1.5 w-fit text-xs">
                {roomAttachment.preview ? (
                  <img src={roomAttachment.preview} alt={roomAttachment.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <span className="text-white/40">📎</span>
                )}
                <span className="truncate text-white/60">Pasted image</span>
                <button
                  onClick={() => setRoomAttachment(null)}
                  className="ml-1 text-white/40 hover:text-white"
                  aria-label="Remove pasted image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-brand-500/40">
              <AutoGrowTextarea
                value={dmInput}
                onChange={setDmInput}
                onPaste={handleDmPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendDmMessage();
                  }
                }}
                placeholder={`Message ${dmPeer.name}…`}
                disabled={dmSending}
                maxLines={7}
              />
              {dmVoiceSupported && (
                <button
                  onClick={() => {
                    if (dmVoiceListening) {
                      dmResetVoice();
                      dmToggleVoice();
                    } else {
                      dmToggleVoice();
                    }
                  }}
                  title={dmVoiceListening ? 'Stop recording' : 'Speak to type'}
                  aria-label={dmVoiceListening ? 'Stop recording' : 'Speak to type'}
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    dmVoiceListening
                      ? 'text-brand-300 bg-brand-600/20 animate-pulse'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={sendDmMessage}
                disabled={(!dmInput.trim() && !roomAttachment) || dmSending}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 text-white transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-30 disabled:hover:shadow-none"
                title="Send"
              >
                {dmSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-white/30">
              {pasteError ? (
                <span className="text-rose-400/80">{pasteError}</span>
              ) : (
                'Enter to send · Shift+Enter for a new line · Paste an image to share it.'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl ${className}`}>
      {/* Members sidebar (left of the chatting panel) */}
      {renderMembersSidebar()}

      {/* Room panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600">
              <MessagesSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Community Chat</div>
              <div className="text-[10px] text-white/40">Chat with other CharmeeyAI users</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {selectMode ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/70">
                  <CheckSquare className="h-3 w-3" />
                  {selected.size} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selected.size === 0 || deleting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-1 text-[10px] font-medium text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20"
                  title="Delete selected messages"
                >
                  <Trash2 className="h-3 w-3" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={exitSelectMode}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/50 transition-colors hover:text-white"
                  title="Cancel selection"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                {hasSelf && (
                  <>
                    <button
                      onClick={() => setSelectMode(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/50 transition-colors hover:text-white"
                      title="Select messages to delete"
                    >
                      <Trash2 className="h-3 w-3" />
                      Select
                    </button>
                    <button
                      onClick={handleDeleteAllMine}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-1 text-[10px] font-medium text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20"
                      title="Delete all of your messages"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deleting ? 'Deleting…' : 'Clear mine'}
                    </button>
                  </>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'
                  }`}
                >
                  {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {connected ? 'Live' : 'Offline'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-[10px] font-medium text-brand-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
                  </span>
                  {online} online
                </span>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {messages.length === 0 && !error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <MessagesSquare className="h-8 w-8 text-white/20" />
              <p className="text-sm text-white/40">No messages yet — say hello to the community.</p>
              {!hasSelf && <p className="text-xs text-white/30">Sign in to join the conversation.</p>}
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.user_id === selfId;
              const isSelected = selected.has(m.id);
              return (
                <div
                  key={m.id}
                  onClick={selectMode && isMine ? () => toggleSelect(m.id) : undefined}
                  className={`flex items-start gap-2.5 ${isMine ? 'flex-row-reverse' : ''} ${
                    selectMode && isMine ? 'cursor-pointer' : ''
                  }`}
                >
                  {selectMode && isMine && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(m.id);
                      }}
                      className={`mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-brand-500 border-brand-500'
                          : 'border-white/30 hover:border-white/60'
                      }`}
                      aria-label={isSelected ? 'Deselect message' : 'Select message'}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </button>
                  )}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                      isMine ? 'from-brand-500 to-violet-600' : colorFor(m.name)
                    } text-xs font-semibold text-white`}
                  >
                    {m.name.trim().charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className={`max-w-[78%] sm:max-w-[70%] ${isMine ? 'items-end' : ''} flex flex-col`}>
                    <div className="mb-0.5 flex items-baseline gap-2 px-1">
                      <span className={`text-[11px] font-semibold ${isMine ? 'text-brand-300' : 'text-white/70'}`}>
                        {m.name}
                      </span>
                      <span className="text-[9px] text-white/30">{timeLabel(m.created_at)}</span>
                    </div>
                    <div
                      className={`relative whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed transition-opacity ${
                        isMine
                          ? 'rounded-tr-sm bg-gradient-to-r from-brand-600 to-violet-600 text-white'
                          : 'rounded-tl-sm bg-white/[0.06] text-white/85'
                      } ${selectMode && isMine && !isSelected ? 'opacity-40' : ''}`}
                    >
                      <MessageContent content={m.content} image={m.image} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {error && (
            <p className="text-center text-xs text-rose-400/80">{error}</p>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/[0.06] p-3 sm:p-4">
          {roomAttachment && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-1.5 w-fit text-xs">
              {roomAttachment.preview ? (
                <img src={roomAttachment.preview} alt={roomAttachment.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                <span className="text-white/40">📎</span>
              )}
              <span className="truncate text-white/60">Pasted image</span>
              <button
                onClick={() => setRoomAttachment(null)}
                className="ml-1 text-white/40 hover:text-white"
                aria-label="Remove pasted image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-brand-500/40">
            <AutoGrowTextarea
              value={input}
              onChange={setInput}
              onPaste={handleDmPaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={hasSelf ? 'Write a message…' : 'Sign in to join the conversation…'}
              disabled={!hasSelf || sending}
              maxLines={7}
            />
            {voiceSupported && hasSelf && (
              <button
                onClick={() => {
                  if (voiceListening) {
                    resetVoice();
                    toggleVoice();
                  } else {
                    toggleVoice();
                  }
                }}
                title={voiceListening ? 'Stop recording' : 'Speak to type'}
                aria-label={voiceListening ? 'Stop recording' : 'Speak to type'}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  voiceListening
                    ? 'text-brand-300 bg-brand-600/20 animate-pulse'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !roomAttachment) || !hasSelf || sending}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 text-white transition-all hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-30 disabled:hover:shadow-none"
              title="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-white/30">
            {pasteError ? (
              <span className="text-rose-400/80">{pasteError}</span>
            ) : (
              'Enter to send · Shift+Enter for a new line · Keep it kind, friend. Paste an image to share it.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}