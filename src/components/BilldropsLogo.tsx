import React from 'react';

interface BilldropsLogoProps {
  className?: string;
  size?: number | string;
}

export const BilldropsLogo: React.FC<BilldropsLogoProps> = ({
  className = 'w-full h-full',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Billdrops B Logo"
    >
      {/* 1. Folded Corner (Top-Left Page Fold in Electric Blue) */}
      <path
        d="M 28 42 C 28 42 33 28 44 26 L 44 42 Z"
        fill="#1e75ff"
      />

      {/* 2. Main Dark Navy Letter 'B' Body with Crisp Nested Geometry */}
      {/* Outer Contour */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="
          M 44 26
          L 58 26
          C 68.5 26 77 31 77 40
          C 77 46 72 50.5 64 52.5
          C 73 54.5 78.5 60 78.5 68
          C 78.5 77.5 70 84 57 84
          L 30 84
          C 28.9 84 28 83.1 28 82
          L 28 44
          L 44 44
          L 44 26
          Z
          M 44 34.5
          L 44 42
          L 57 42
          C 60.8 42 64.5 39.5 64.5 35
          C 64.5 31 61 28.5 56.5 28.5
          L 44 28.5
          L 44 34.5
          Z
          M 37.5 59
          L 55 59
          C 59 59 62.5 61.5 62.5 65
          C 62.5 68.5 59 71 55 71
          L 37.5 71
          C 35 71 33.5 69 33.5 66.5
          C 33.5 64 35 59 37.5 59
          Z
        "
        fill="#0b172a"
      />
    </svg>
  );
};
