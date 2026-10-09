import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'Image',
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-zoom-out"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center cursor-default"
      >
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <a
            href={imageUrl}
            download={imageName}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur transition"
            title="Download image"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <img
          src={imageUrl}
          alt={imageName}
          className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-700/50"
        />
        <div className="mt-2 text-xs text-slate-300 font-medium px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur">
          {imageName}
        </div>
      </div>
    </div>
  );
};
