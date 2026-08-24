import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/useChatStore';
import { useGameStore } from '../../store/useGameStore';
import { socket } from '../../socket';

export function ChatPanel() {
  const messages = useChatStore(s => s.messages);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const roomCode = useGameStore(s => s.roomCode);

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(messages.length);

  useEffect(() => {
    const added = messages.length - prevCount.current;
    if (added > 0 && !isOpen) setUnread(u => u + added);
    prevCount.current = messages.length;
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  function handleOpen() {
    setIsOpen(true);
    setUnread(0);
  }

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || !roomCode) return;
    socket.emit('chat_send', { roomCode, text: trimmed });
    setDraft('');
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className="w-72 h-96 bg-gray-900/95 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
              <span className="text-sm font-semibold text-white">💬 Chat</span>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 flex flex-col gap-1.5">
              {messages.length === 0 && (
                <div className="text-gray-600 text-xs mt-2">No messages yet — say hi!</div>
              )}
              {messages.map(m => {
                const isMe = m.playerId === myPlayerId;
                return (
                  <div key={m.id} className={`text-xs ${isMe ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block max-w-[85%] rounded-xl px-2.5 py-1.5 text-left ${isMe ? 'bg-teamA text-white' : 'bg-gray-800 text-gray-100'}`}>
                      {!isMe && <div className="text-[10px] font-semibold text-gray-400 mb-0.5">{m.playerName}</div>}
                      <div className="break-words">{m.text}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-center gap-2 p-2 border-t border-gray-800">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                maxLength={500}
                placeholder="Message..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="px-3 py-1.5 rounded-lg bg-teamA hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          onClick={handleOpen}
          className="relative w-12 h-12 rounded-full bg-gray-900/90 border border-gray-700 shadow-xl flex items-center justify-center text-xl hover:bg-gray-800 transition-colors"
        >
          💬
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
