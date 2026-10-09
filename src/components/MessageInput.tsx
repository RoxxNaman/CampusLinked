import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Code2,
  Lock,
  Unlock,
  Smile,
  X,
  Sparkles,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  StopCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Square,
  Volume2,
  Clock,
  Calendar,
} from 'lucide-react';
import { useChat } from '../context/ChatContext.tsx';
import { api } from '../utils/api.ts';

interface MessageInputProps {
  onOpenCodeModal: () => void;
  onOpenE2EModal: () => void;
}

const COMMON_EMOJIS = ['😀', '😂', '🔥', '🚀', '👍', '❤️', '💡', '🎉', '💻', '✨', '🙌', '💯'];

function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onOpenCodeModal,
  onOpenE2EModal,
}) => {
  const {
    activeConversation,
    activeConversationId,
    sendMessage,
    sendTyping,
    replyToMessage,
    setReplyToMessage,
    roomKeys,
  } = useChat();

  const [text, setText] = useState('');
  const [isEncryptedToggle, setIsEncryptedToggle] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Message Scheduling state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledSendTime, setScheduledSendTime] = useState<number | null>(null);
  const [customDateTime, setCustomDateTime] = useState('');

  const schedulePresets = [
    { label: 'In 5 minutes', getTs: () => Date.now() + 5 * 60 * 1000 },
    { label: 'In 15 minutes', getTs: () => Date.now() + 15 * 60 * 1000 },
    { label: 'In 1 hour', getTs: () => Date.now() + 60 * 60 * 1000 },
    { label: 'In 3 hours', getTs: () => Date.now() + 3 * 60 * 60 * 1000 },
    {
      label: 'Tomorrow 9:00 AM',
      getTs: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d.getTime();
      },
    },
  ];

  const handleSetPreset = (getTs: () => number) => {
    const ts = getTs();
    setScheduledSendTime(ts);
    setShowScheduleModal(false);
  };

  const handleSetCustomDateTime = () => {
    if (!customDateTime) return;
    const ts = new Date(customDateTime).getTime();
    if (isNaN(ts) || ts <= Date.now()) {
      setUploadError('Please select a future date and time');
      return;
    }
    setScheduledSendTime(ts);
    setShowScheduleModal(false);
  };

  const buildScheduleMetadata = () => {
    if (!scheduledSendTime) return undefined;
    return {
      sendTime: scheduledSendTime,
      scheduledFor: scheduledSendTime,
      isScheduled: true,
      scheduledAt: Date.now(),
    };
  };

  // Voice recording & Preview state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto set encryption toggle if room has encryption key
  useEffect(() => {
    if (activeConversation?.isEncrypted) {
      setIsEncryptedToggle(true);
    } else {
      setIsEncryptedToggle(false);
    }
  }, [activeConversation]);

  // Handle typing event emission
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.trim().length > 0) {
      sendTyping(true);
    } else {
      sendTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!text.trim() || isUploading) return;
    const msgText = text.trim();
    setText('');
    sendTyping(false);

    const metadata = buildScheduleMetadata();
    setScheduledSendTime(null);

    try {
      await sendMessage({
        text: msgText,
        mediaType: 'text',
        isEncrypted: isEncryptedToggle,
        metadata,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to send message');
    }
  };

  // Quick insert @AI tag
  const handleInsertAi = () => {
    setText((prev) => (prev.includes('@AI') ? prev : `@AI ${prev}`.trim()));
    textareaRef.current?.focus();
  };

  // File & Image upload handling with safety checks
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isImage = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    setUploadError(null);
    setIsUploading(true);

    const metadata = buildScheduleMetadata();
    setScheduledSendTime(null);

    try {
      const uploaded = await api.uploadFile(file);
      await sendMessage({
        text: isImage ? '' : file.name,
        mediaType: isImage ? 'image' : 'file',
        mediaUrl: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        fileMime: uploaded.mimeType,
        metadata,
      });
    } catch (err: any) {
      setUploadError(err.message || 'File upload rejected');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Get best supported audio mime type across browsers
  const getSupportedMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    for (const type of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const clearPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
    }
    setPreviewAudioUrl(null);
    setPreviewBase64(null);
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
  };

  // Voice Note Recording via MediaRecorder API
  const startRecording = async () => {
    setUploadError(null);
    clearPreview();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop all active microphone tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        const chosenMime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: chosenMime });

        // Create blob URL for in-browser audio preview
        const blobUrl = URL.createObjectURL(audioBlob);
        setPreviewAudioUrl(blobUrl);

        // Convert blob to base64 Data URI for storage and transmission
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setPreviewBase64(base64Data);
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone recording error:', err);
      setUploadError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access to record voice notes.'
          : 'Could not access audio device: ' + (err.message || 'Unknown device error')
      );
    }
  };

  const stopRecording = (discard = false) => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    const duration = recordingSeconds;
    setPreviewDuration(duration);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (discard) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        clearPreview();
      } else {
        mediaRecorderRef.current.stop();
      }
    }
    setIsRecording(false);
  };

  // Toggle playback in preview mode
  const togglePlayPreview = () => {
    if (!previewAudioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(previewAudioUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewCurrentTime(Math.floor(audio.currentTime));
      };

      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
      };

      audio.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch((err) => {
        console.error('Failed to play preview audio:', err);
        setIsPreviewPlaying(false);
      });
    } else {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      } else {
        previewAudioRef.current.play().then(() => {
          setIsPreviewPlaying(true);
        }).catch(console.error);
      }
    }
  };

  // Send the recorded and previewed base64 voice note
  const sendVoiceNote = async () => {
    if (!previewBase64) return;
    setIsUploading(true);
    const metadata = buildScheduleMetadata();
    setScheduledSendTime(null);
    try {
      await sendMessage({
        mediaType: 'audio',
        mediaUrl: previewBase64,
        voiceDuration: previewDuration || recordingSeconds || 1,
        fileName: `voice_note_${Date.now()}.webm`,
        metadata,
      });
      clearPreview();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to send voice note');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 select-none relative">
      {/* File security or network error banner */}
      {uploadError && (
        <div className="mb-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="p-1 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Replying banner */}
      {replyToMessage && (
        <div className="mb-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300 animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-indigo-400">Replying to {replyToMessage.senderName}:</span>
            <span className="text-slate-400 truncate">{replyToMessage.text || 'media'}</span>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scheduled message alert banner */}
      {scheduledSendTime && (
        <div className="mb-2 p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>
              Message scheduled for:{' '}
              <strong className="text-amber-200">
                {new Date(scheduledSendTime).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>{' '}
              <span className="text-[10px] text-amber-400/80 font-mono">(send time stored in message metadata)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setScheduledSendTime(null)}
            className="p-1 rounded text-amber-400 hover:text-white hover:bg-amber-500/20 transition"
            title="Cancel schedule"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Voice Recording Mode Bar */}
      {isRecording ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-rose-500/50 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3">
            {/* Live recording indicator */}
            <div className="relative flex items-center justify-center">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping absolute" />
              <span className="w-3 h-3 rounded-full bg-rose-500 relative" />
            </div>

            {/* Time counter */}
            <span className="font-mono text-xs font-bold text-rose-300">
              {formatAudioTime(recordingSeconds)}
            </span>

            {/* Animated Equalizer Waveform bars */}
            <div className="flex items-center gap-0.5 h-5 px-1">
              {[40, 75, 55, 90, 60, 30, 80, 45, 95, 70, 50, 85, 60].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-rose-400 rounded-full animate-pulse transition-all duration-150"
                  style={{
                    height: `${Math.max(25, (h * ((recordingSeconds % 3) + 1)) % 100)}%`,
                    animationDelay: `${i * 70}ms`,
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Recording voice memo...</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stopRecording(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition flex items-center gap-1.5"
              title="Discard recording"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow shadow-indigo-600/30"
              title="Stop & preview recording"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop & Preview</span>
            </button>
          </div>
        </div>
      ) : previewAudioUrl ? (
        /* Voice Note Preview Mode Bar */
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayPreview}
              className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shrink-0 shadow-md shadow-indigo-600/30"
              title={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Waveform / Timeline Scrubber */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] text-indigo-200 mb-1">
                <span className="font-semibold flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Voice Note Ready
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {formatAudioTime(previewCurrentTime)} / {formatAudioTime(previewDuration || recordingSeconds)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-400 h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${
                      previewDuration > 0 ? (previewCurrentTime / previewDuration) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Preview Actions: Re-record / Discard / Send */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={clearPreview}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
              title="Discard voice note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={startRecording}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Re-record voice note"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={sendVoiceNote}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
              title="Send voice note"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Voice Note</span>
            </button>
          </div>
        </div>
      ) : (
        /* Normal Typing Input */
        <div className="flex items-end gap-2">
          {/* Action Menu (Attach, Code, Emoji, E2E) */}
          <div className="flex items-center gap-1 pb-1">
            {/* Attachment Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Attach photo or document"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl bg-slate-950 border border-slate-800 p-1.5 shadow-2xl z-30 space-y-1 animate-in fade-in">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 transition"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Send Image</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 transition"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Upload Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* Code Snippet Button */}
            <button
              type="button"
              onClick={onOpenCodeModal}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Share formatted code block"
            >
              <Code2 className="w-4 h-4" />
            </button>

            {/* End-to-End Encryption Lock Toggle */}
            <button
              type="button"
              onClick={() => {
                if (!activeConversation?.isEncrypted) {
                  onOpenE2EModal();
                } else {
                  setIsEncryptedToggle(!isEncryptedToggle);
                }
              }}
              className={`p-2 rounded-xl transition ${
                isEncryptedToggle
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={
                isEncryptedToggle
                  ? 'Message will be encrypted with AES-256'
                  : 'Enable End-to-End Encryption'
              }
            >
              {isEncryptedToggle ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>

            {/* Quick @AI Tag button */}
            <button
              type="button"
              onClick={handleInsertAi}
              className="px-2 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition"
              title="Mention Gemini AI Assistant"
            >
              <Sparkles className="w-3 h-3" />
              <span>@AI</span>
            </button>

            {/* Schedule Message Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowScheduleModal(!showScheduleModal)}
                className={`p-2 rounded-xl transition ${
                  scheduledSendTime
                    ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40 shadow-xs ring-1 ring-amber-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={
                  scheduledSendTime
                    ? `Scheduled for ${new Date(scheduledSendTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Schedule message for future delivery'
                }
              >
                <Clock className="w-4 h-4" />
              </button>

              {showScheduleModal && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 rounded-2xl bg-slate-950 border border-slate-800 p-3 shadow-2xl z-40 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Schedule Message Delivery</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Presets */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Quick Presets
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {schedulePresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSetPreset(preset.getTs)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-600/20 hover:border-amber-500/40 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition text-left"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom DateTime */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Or Custom Date & Time
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={customDateTime}
                        onChange={(e) => setCustomDateTime(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={handleSetCustomDateTime}
                        disabled={!customDateTime}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition disabled:opacity-40"
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  {scheduledSendTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setScheduledSendTime(null);
                        setShowScheduleModal(false);
                      }}
                      className="w-full py-1 text-center text-xs text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      Cancel Schedule
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Textarea Input */}
          <div className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-1.5 flex items-end focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onBlur={() => sendTyping(false)}
              placeholder={
                scheduledSendTime
                  ? `Message will be delivered at ${new Date(scheduledSendTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}...`
                  : isEncryptedToggle
                  ? 'Type an end-to-end encrypted message...'
                  : 'Type message... (Enter to send, Shift+Enter for newline)'
              }
              className="w-full bg-transparent px-2.5 py-1 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[28px]"
            />

            {/* Emoji popover button */}
            <div className="relative pb-0.5">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 transition"
                title="Insert Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl grid grid-cols-6 gap-1 z-30 animate-in fade-in">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1.5 text-base hover:scale-125 transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Send or Mic Button */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={isUploading}
              className={`p-3 rounded-2xl text-white transition shadow-lg disabled:opacity-50 flex items-center justify-center ${
                scheduledSendTime
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
              title={
                scheduledSendTime
                  ? `Send scheduled message (stores send time in metadata)`
                  : 'Send Message'
              }
            >
              {scheduledSendTime ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
              title="Hold to Record Voice Memo"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e, false)}
            className="hidden"
          />
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={(e) => handleFileUpload(e, true)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};
