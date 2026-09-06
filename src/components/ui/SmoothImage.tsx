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
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [imgSrc, setImgSrc] = React.useState<string>(src || fallbackSrc);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const target = src || fallbackSrc;
    setImgSrc(target);

    // Cek jika gambar sudah selesai dimuat dari cache browser
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src, fallbackSrc]);

  // Handler saat gambar selesai dimuat (onLoad event)
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Handler saat gambar gagal dimuat (onError event) -> beralih ke fallback
  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
    setIsLoaded(true);
  };

  // Container styling yang menjaga agar efek blur tidak menyebar keluar div pembungkusnya
  const resolvedContainerClass = containerClassName
    ? `relative overflow-hidden ${containerClassName}`
    : `relative overflow-hidden ${className}`;

  const resolvedImgClass = containerClassName
    ? `w-full h-full ${className}`
    : "w-full h-full object-cover";

  return (
    <div
      className={resolvedContainerClass}
      style={style}
      onClick={onClick}
    >
      {/* Background placeholder selama gambar belum loaded */}
      <div
        className={`absolute inset-0 bg-stone-200/80 dark:bg-stone-800/80 transition-opacity duration-500 pointer-events-none ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      />

      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`${resolvedImgClass} transition-all duration-700 ease-out ${
          isLoaded
            ? "blur-0 scale-100 opacity-100"
            : "blur-2xl scale-110 opacity-0"
        }`}
        {...rest}
      />
    </div>
  );
};
