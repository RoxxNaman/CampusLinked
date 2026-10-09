import React, { useState } from 'react';
import { X, Code2, Send } from 'lucide-react';

interface CodeSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendCode: (code: string, language: string, note?: string) => void;
}

const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'cpp', name: 'C++' },
  { id: 'java', name: 'Java' },
  { id: 'rust', name: 'Rust' },
  { id: 'go', name: 'Go' },
  { id: 'sql', name: 'SQL' },
  { id: 'bash', name: 'Bash / Shell' },
  { id: 'json', name: 'JSON' },
];

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({ isOpen, onClose, onSendCode }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSendCode(code.trim(), language, note.trim() || undefined);
    setCode('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Share Code Snippet</h3>
              <p className="text-[11px] text-slate-400">Formatted with syntax styling and 1-click copy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1/3">
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Optional Context</label>
              <input
                type="text"
                placeholder="e.g. WebSocket connection snippet"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Source Code</label>
            <textarea
              rows={10}
              placeholder={`// Paste your ${language} code here...\nfunction handleEvent() {\n  // ...\n}`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-slate-950 font-mono border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!code.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send Code Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
