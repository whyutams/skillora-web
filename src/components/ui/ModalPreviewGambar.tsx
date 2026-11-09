"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ExternalLink } from "lucide-react";
import { SmoothImage } from "./SmoothImage";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  description?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = "Pratinjau Gambar",
  description,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // tutup dengan tombol escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl w-full max-h-[90vh] flex flex-col bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200/80 dark:border-stone-800/80 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* header modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate max-w-md">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Buka Gambar Asli"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* gambar pratinjau */}
        <div className="p-3 sm:p-5 flex items-center justify-center overflow-auto max-h-[70vh] bg-stone-100/60 dark:bg-stone-950/60">
          <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-md max-w-full">
            <SmoothImage
              src={imageUrl}
              alt={title}
              className="max-h-[60vh] w-auto object-contain"
              containerClassName="rounded-xl overflow-hidden"
            />
          </div>
        </div>

        {/* rincian keterangan */}
        {description && (
          <div className="px-5 py-3 bg-stone-50/80 dark:bg-stone-900/80 border-t border-stone-200/80 dark:border-stone-800/80 text-[11px] text-stone-500">
            {description}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export const ModalPreviewGambar = ImagePreviewModal;
