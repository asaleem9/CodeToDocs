import React from 'react';
import './Logo.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  if (!showText) return null;

  return (
    <div className={`logo-container logo-${size}`}>
      <span className="logo-text">
        <span className="logo-prompt">&gt; </span>
        <span className="logo-name">CodeToDocs</span>
        <span className="logo-cursor">_</span>
      </span>
    </div>
  );
};

export default Logo;
