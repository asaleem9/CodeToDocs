import React from 'react';
import './Logo.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const sizeMap = {
    small: { icon: 32, text: 16 },
    medium: { icon: 48, text: 20 },
    large: { icon: 64, text: 24 }
  };

  const dimensions = sizeMap[size];

  return (
    <div className={`logo-container logo-${size}`}>
      <svg
        width={dimensions.icon}
        height={dimensions.icon}
        viewBox="0 0 100 100"
        className="logo-icon"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#818cf8', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#c084fc', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="documentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#818cf8', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Main circle background */}
        <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" opacity="0.2" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#logoGradient)" strokeWidth="2" />

        {/* Code brackets - left */}
        <path
          d="M 35 30 L 25 40 L 25 60 L 35 70"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Code brackets - right */}
        <path
          d="M 65 30 L 75 40 L 75 60 L 65 70"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Document/AI icon in center */}
        <rect
          x="42"
          y="35"
          width="16"
          height="22"
          rx="2"
          fill="url(#documentGradient)"
          opacity="0.9"
        />

        {/* Document lines */}
        <line x1="45" y1="40" x2="55" y2="40" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="45" y1="45" x2="55" y2="45" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="45" y1="50" x2="52" y2="50" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />

        {/* AI sparkle effect */}
        <circle cx="56" cy="36" r="2" fill="#fbbf24" opacity="0.9">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="40" r="1.5" fill="#fbbf24" opacity="0.7">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.5s" repeatCount="indefinite" />
        </circle>
      </svg>

      {showText && (
        <div className="logo-text" style={{ fontSize: `${dimensions.text}px` }}>
          <span className="logo-code">Code</span>
          <span className="logo-to">To</span>
          <span className="logo-docs">Docs</span>
          <span className="logo-ai">AI</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
