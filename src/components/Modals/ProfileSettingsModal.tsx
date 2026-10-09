import React, { useState } from 'react';
import { X, User, Smile, Sparkles, Check, RefreshCw, Languages } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserStatus } from '../../types/index.ts';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_SEEDS = ['Felix', 'Aneka', 'Mittens', 'Coco', 'Jasper', 'Milo', 'Luna', 'Shadow', 'Oliver', 'Bella'];

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'zh', name: 'Mandarin Chinese (中文)', flag: '🇨🇳' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'English');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'online');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const handleRandomizeAvatar = () => {
    const randomSeed = PRESET_SEEDS[Math.floor(Math.random() * PRESET_SEEDS.length)] + '_' + Math.floor(Math.random() * 1000);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    setAvatar(newAvatar);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        bio: bio.trim(),
        preferredLanguage,
        status,
        avatar,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Profile & Preferences</h3>
              <p className="text-xs text-slate-400">Update how others see you in chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Avatar selector */}
          <div className="flex items-center gap-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="relative">
              <img
                src={avatar || user.avatar}
                alt={displayName}
                className="w-14 h-14 rounded-full bg-slate-700 border-2 border-indigo-500 object-cover"
              />
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                  status === 'online'
                    ? 'bg-emerald-500'
                    : status === 'busy'
                    ? 'bg-rose-500'
                    : status === 'away'
                    ? 'bg-amber-500'
                    : 'bg-slate-500'
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-white mb-1">Avatar Preset</div>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Randomize Avatar
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'online', label: 'Online', color: 'bg-emerald-500' },
                { id: 'busy', label: 'Busy (DND)', color: 'bg-rose-500' },
                { id: 'away', label: 'Away', color: 'bg-amber-500' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id as UserStatus)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-lg border transition ${
                    status === s.id
                      ? 'border-indigo-500 bg-indigo-600/20 text-white font-semibold'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Status Tag / Mood</label>
            <input
              type="text"
              placeholder="e.g. Building CampusLink 🚀"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                Preferred Translation Language
              </span>
              <span className="text-[10px] text-indigo-300">Gemini Powered</span>
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.name} value={lang.name} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Used when you translate received messages from the message hover-menu.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Bio / About</label>
            <textarea
              rows={2}
              placeholder="Tell other hackathon participants about yourself"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            {success ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Changes Saved!
              </span>
            ) : <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
