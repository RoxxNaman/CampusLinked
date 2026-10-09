import React, { useState } from 'react';
import { X, Lock, Key, ShieldCheck, Check } from 'lucide-react';
import { useChat } from '../../context/ChatContext.tsx';

interface E2EKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const E2EKeyModal: React.FC<E2EKeyModalProps> = ({ isOpen, onClose, conversationId }) => {
  const { roomKeys, setRoomKey, activeConversation } = useChat();
  const currentKey = roomKeys[conversationId] || '';
  const [keyInput, setKeyInput] = useState(currentKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomKey(conversationId, keyInput.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">End-to-End Chat Encryption</h3>
              <p className="text-[11px] text-slate-400">Zero-Knowledge AES-GCM 256-Bit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              How It Works:
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When encryption is unlocked with the shared room passphrase, all outbound messages are encrypted in browser memory via Web Crypto API. The server and network only see impenetrable ciphertexts.
            </p>
            {activeConversation?.encryptionKeyHint && (
              <div className="pt-1 text-[11px] text-emerald-300">
                Hint from room creator: <code className="bg-emerald-900/40 px-1 py-0.5 rounded font-mono">{activeConversation.encryptionKeyHint}</code>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Shared Room Passphrase</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Enter room key to decrypt messages..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Tip: For demo testing, default key is: <span className="text-emerald-400 font-mono">kamand2026</span>
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            {saved ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Key Applied!
              </span>
            ) : <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
              >
                Set Encryption Key
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
