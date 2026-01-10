import { useState } from 'react';
import Image from 'next/image';

interface ProductThumbnailProps {
  src: string | null;
  alt: string;
}

export function ProductThumbnail({ src, alt }: ProductThumbnailProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center border">
        <span className="text-[10px] text-slate-400">Sin img</span>
      </div>
    );
  }

  return (
    <div className="h-10 w-10 relative">
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="h-10 w-10 rounded-md object-cover border"
        onError={(e) => {
          console.error(`Error loading image for ${alt}:`, src);
          setError(true);
        }}
        unoptimized
      />
    </div>
  );
}
