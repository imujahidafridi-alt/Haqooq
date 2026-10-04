import React, { useState } from 'react';

interface AvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  src?: string | null;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  seed?: string;
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  src,
  size = 44,
  seed,
  isOnline,
  className = '',
}) => {
  const activeImage = src !== undefined ? src : imageUrl;
  const numSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 32
      : size === 'md'
      ? 44
      : size === 'lg'
      ? 56
      : size === 'xl'
      ? 76
      : 44;

  const [imageError, setImageError] = useState(false);

  const avatarColors = [
    '#1A365D', '#0D9488', '#2563EB', '#7C3AED',
    '#D97706', '#E11D48', '#059669', '#4F46E5',
  ];

  const getInitials = (str?: string | null) => {
    if (!str) return 'H';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const getBgColor = (key?: string | null) => {
    if (!key) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const bgColor = getBgColor(seed || name);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 overflow-hidden shadow-xs ring-2 ring-white ${className}`}
      style={{
        width: `${numSize}px`,
        height: `${numSize}px`,
        fontSize: `${Math.round(numSize * 0.4)}px`,
        backgroundColor: bgColor,
      }}
    >
      {activeImage && !imageError ? (
        <img
          src={activeImage}
          alt={name || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}

      {isOnline && (
        <span
          className="absolute bottom-0 right-0 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-400"
          style={{
            width: `${Math.max(8, Math.round(numSize * 0.28))}px`,
            height: `${Math.max(8, Math.round(numSize * 0.28))}px`,
          }}
        />
      )}
    </div>
  );
};
