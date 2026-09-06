"use client";

import * as React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Crop, ZoomIn, ZoomOut, RotateCcw, Check } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onSaveCrop: (croppedBlob: Blob) => Promise<void>;
  isSaving: boolean;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  onSaveCrop,
  isSaving,
}) => {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Load image as data URL when file changes
  React.useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleCropAndSave = async () => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Size of export canvas (square 1:1)
    const exportSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill white/clean background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportSize, exportSize);

    // Calculate scaling and translation
    const scaleFactor = exportSize / containerRect.width;

    // Drawing coordinates
    const drawWidth = img.clientWidth * zoom * scaleFactor;
    const drawHeight = img.clientHeight * zoom * scaleFactor;

    // Image center relative to container
    const centerX = (containerRect.width / 2 + offset.x) * scaleFactor;
    const centerY = (containerRect.height / 2 + offset.y) * scaleFactor;

    const destX = centerX - drawWidth / 2;
    const destY = centerY - drawHeight / 2;

    ctx.drawImage(img, destX, destY, drawWidth, drawHeight);

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          await onSaveCrop(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSaving && onClose()}
      title="Potong Foto Profil (1:1)"
      description="Geser dan sesuaikan ukuran foto agar pas dengan bingkai proporsi 1:1."
    >
      <div className="space-y-4 pt-1">
        {/* 1:1 Crop Viewport */}
        <div className="flex justify-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-stone-900 border-2 border-[#0F3E2E] shadow-inner select-none cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                className="max-w-none transition-transform duration-75 pointer-events-none"
              />
            )}

            {/* Circular / Square Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/40 rounded-2xl">
              <div className="absolute inset-2 border border-dashed border-emerald-400/60 rounded-full" />
            </div>

            {/* Hint text */}
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/70 bg-black/60 px-2.5 py-0.5 rounded-full pointer-events-none">
              Tarik untuk menggeser posisi
            </span>
          </div>
        </div>

        {/* Zoom & Control Controls */}
        <div className="space-y-2 px-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span className="flex items-center gap-1">
              <Crop className="w-3.5 h-3.5 text-emerald-600" />
              Perbesaran (Zoom)
            </span>
            <span className="text-stone-700 dark:text-stone-300">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-stone-400" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#0F3E2E]"
            />
            <ZoomIn className="w-4 h-4 text-stone-400" />

            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              title="Reset Posisi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCropAndSave}
            isLoading={isSaving}
            className="bg-[#0F3E2E] hover:bg-[#165640] text-white font-semibold gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Foto</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
