"use client";

import * as React from "react";

interface SmoothImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  containerClassName?: string;
}

export const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80";

// cache memori global untuk mencatat url gambar yang telah selesai dimuat agar tidak animasi ulang
const loadedImagesCache = new Set<string>();

export const SmoothImage: React.FC<SmoothImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  className = "",
  containerClassName = "",
  style,
  onClick,
  ...rest
}) => {
  const initialTarget = src || fallbackSrc;
  const isInitiallyCached = Boolean(initialTarget && loadedImagesCache.has(initialTarget));

  const [isLoaded, setIsLoaded] = React.useState<boolean>(isInitiallyCached);
  const [imgSrc, setImgSrc] = React.useState<string>(initialTarget);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const target = src || fallbackSrc;
    setImgSrc(target);

    if (target && loadedImagesCache.has(target)) {
      setIsLoaded(true);
      return;
    }

    // cek jika gambar sudah selesai dimuat dari cache browser
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      if (target) {
        loadedImagesCache.add(target);
      }
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src, fallbackSrc]);

  // handler saat gambar selesai dimuat onload
  const handleLoad = () => {
    if (imgSrc) {
      loadedImagesCache.add(imgSrc);
    }
    setIsLoaded(true);
  };

  // handler saat gambar gagal dimuat onerror beralih ke fallback
  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
    setIsLoaded(true);
  };

  // container styling yang menjaga agar efek blur tidak menyebar keluar div pembungkusnya
  const resolvedContainerClass = containerClassName
    ? `relative overflow-hidden ${containerClassName}`
    : `relative overflow-hidden ${className}`;

  const resolvedImgClass = containerClassName
    ? `w-full h-full ${className}`
    : "w-full h-full object-cover";

  const wasCached = Boolean(imgSrc && loadedImagesCache.has(imgSrc));

  return (
    <div
      className={resolvedContainerClass}
      style={style}
      onClick={onClick}
    >
      {/* background placeholder selama gambar belum loaded */}
      {!wasCached && (
        <div
          className={`absolute inset-0 bg-stone-200/80 dark:bg-stone-800/80 transition-opacity duration-500 pointer-events-none ${
            isLoaded ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`${resolvedImgClass} ${
          wasCached
            ? "blur-0 scale-100 opacity-100"
            : `transition-all duration-700 ease-out ${
                isLoaded
                  ? "blur-0 scale-100 opacity-100"
                  : "blur-2xl scale-110 opacity-0"
              }`
        }`}
        {...rest}
      />
    </div>
  );
};
