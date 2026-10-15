import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export const DotVideosTabIcon: React.FC<IconProps> = ({ size = 26, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    {/* Screen frame dots */}
    <circle cx="4" cy="5" r="1.4" />
    <circle cx="8" cy="5" r="1.4" />
    <circle cx="12" cy="5" r="1.4" />
    <circle cx="16" cy="5" r="1.4" />
    <circle cx="20" cy="5" r="1.4" />

    <circle cx="4" cy="19" r="1.4" />
    <circle cx="8" cy="19" r="1.4" />
    <circle cx="12" cy="19" r="1.4" />
    <circle cx="16" cy="19" r="1.4" />
    <circle cx="20" cy="19" r="1.4" />

    <circle cx="4" cy="12" r="1.4" />
    <circle cx="20" cy="12" r="1.4" />

    {/* Centered play triangle dots */}
    <circle cx="9.5" cy="9" r="1.4" />
    <circle cx="9.5" cy="12" r="1.4" />
    <circle cx="9.5" cy="15" r="1.4" />
    <circle cx="13" cy="10.5" r="1.4" />
    <circle cx="13" cy="13.5" r="1.4" />
    <circle cx="16" cy="12" r="1.4" />
  </svg>
);

export const DotFoldersTabIcon: React.FC<IconProps> = ({ size = 26, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    {/* Tab top */}
    <circle cx="4" cy="6" r="1.4" />
    <circle cx="7.5" cy="6" r="1.4" />
    <circle cx="11" cy="6" r="1.4" />
    
    {/* Body top */}
    <circle cx="14" cy="8.5" r="1.4" />
    <circle cx="17.5" cy="8.5" r="1.4" />
    <circle cx="20" cy="8.5" r="1.4" />

    {/* Left and right sides */}
    <circle cx="3" cy="10" r="1.4" />
    <circle cx="3" cy="14" r="1.4" />
    <circle cx="3" cy="18" r="1.4" />

    <circle cx="21" cy="10" r="1.4" />
    <circle cx="21" cy="14" r="1.4" />
    <circle cx="21" cy="18" r="1.4" />

    {/* Bottom edge */}
    <circle cx="6.5" cy="18" r="1.4" />
    <circle cx="10" cy="18" r="1.4" />
    <circle cx="13.5" cy="18" r="1.4" />
    <circle cx="17.5" cy="18" r="1.4" />
  </svg>
);

export const DotNetworkTabIcon: React.FC<IconProps> = ({ size = 26, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    {/* Broadcast pulse rings */}
    <circle cx="12" cy="16" r="1.7" />

    <circle cx="8" cy="12.5" r="1.4" />
    <circle cx="12" cy="11" r="1.4" />
    <circle cx="16" cy="12.5" r="1.4" />

    <circle cx="5" cy="9" r="1.4" />
    <circle cx="12" cy="6.5" r="1.4" />
    <circle cx="19" cy="9" r="1.4" />

    <circle cx="3" cy="5.5" r="1.4" />
    <circle cx="12" cy="3" r="1.4" />
    <circle cx="21" cy="5.5" r="1.4" />
  </svg>
);

export const DotFavoritesTabIcon: React.FC<IconProps> = ({ size = 26, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    {/* Heart shaped dots */}
    <circle cx="8" cy="6" r="1.4" />
    <circle cx="11" cy="7.5" r="1.4" />
    <circle cx="5" cy="8.5" r="1.4" />
    <circle cx="13" cy="7.5" r="1.4" />
    <circle cx="16" cy="6" r="1.4" />
    <circle cx="19" cy="8.5" r="1.4" />

    <circle cx="4" cy="12" r="1.4" />
    <circle cx="20" cy="12" r="1.4" />

    <circle cx="6" cy="15.5" r="1.4" />
    <circle cx="18" cy="15.5" r="1.4" />

    <circle cx="9" cy="18.5" r="1.4" />
    <circle cx="15" cy="18.5" r="1.4" />

    <circle cx="12" cy="20.5" r="1.5" />
  </svg>
);

export const DotSettingsTabIcon: React.FC<IconProps> = ({ size = 26, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="12" cy="3.5" r="1.5" />
    <circle cx="12" cy="20.5" r="1.5" />
    <circle cx="3.5" cy="12" r="1.5" />
    <circle cx="20.5" cy="12" r="1.5" />
    <circle cx="6" cy="6" r="1.5" />
    <circle cx="18" cy="18" r="1.5" />
    <circle cx="18" cy="6" r="1.5" />
    <circle cx="6" cy="18" r="1.5" />
    {/* Center dot */}
    <circle cx="12" cy="12" r="2.2" />
  </svg>
);

export const DotSettingsIcon = DotSettingsTabIcon;

export const DotRecentIcon: React.FC<IconProps> = ({ size = 20, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    {/* Clock ring dots */}
    <circle cx="12" cy="3" r="1.4" />
    <circle cx="18.5" cy="5.5" r="1.4" />
    <circle cx="21" cy="12" r="1.4" />
    <circle cx="18.5" cy="18.5" r="1.4" />
    <circle cx="12" cy="21" r="1.4" />
    <circle cx="5.5" cy="18.5" r="1.4" />
    <circle cx="3" cy="12" r="1.4" />
    <circle cx="5.5" cy="5.5" r="1.4" />
    {/* Clock hands */}
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="8" r="1.3" />
    <circle cx="15.5" cy="12" r="1.3" />
  </svg>
);

export const DotRecentTabIcon = DotRecentIcon;

export const DotHeartIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 20,
  className = '',
  color = 'currentColor',
  filled = false,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#D71921' : color} className={className}>
    <circle cx="8" cy="6" r="1.4" />
    <circle cx="11" cy="7.5" r="1.4" />
    <circle cx="5" cy="8.5" r="1.4" />
    <circle cx="13" cy="7.5" r="1.4" />
    <circle cx="16" cy="6" r="1.4" />
    <circle cx="19" cy="8.5" r="1.4" />
    <circle cx="4" cy="12" r="1.4" />
    <circle cx="20" cy="12" r="1.4" />
    <circle cx="6" cy="15.5" r="1.4" />
    <circle cx="18" cy="15.5" r="1.4" />
    <circle cx="9" cy="18.5" r="1.4" />
    <circle cx="15" cy="18.5" r="1.4" />
    <circle cx="12" cy="20.5" r="1.5" />
    {filled && (
      <>
        <circle cx="8.5" cy="10" r="1.3" />
        <circle cx="12" cy="11" r="1.3" />
        <circle cx="15.5" cy="10" r="1.3" />
        <circle cx="12" cy="15" r="1.3" />
      </>
    )}
  </svg>
);

export const DotListIcon: React.FC<IconProps> = ({ size = 20, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="4" cy="6" r="1.4" />
    <circle cx="9" cy="6" r="1.2" />
    <circle cx="14" cy="6" r="1.2" />
    <circle cx="19" cy="6" r="1.2" />

    <circle cx="4" cy="12" r="1.4" />
    <circle cx="9" cy="12" r="1.2" />
    <circle cx="14" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />

    <circle cx="4" cy="18" r="1.4" />
    <circle cx="9" cy="18" r="1.2" />
    <circle cx="14" cy="18" r="1.2" />
    <circle cx="19" cy="18" r="1.2" />
  </svg>
);

export const DotGridIcon: React.FC<IconProps> = ({ size = 20, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="6" cy="6" r="1.6" />
    <circle cx="12" cy="6" r="1.6" />
    <circle cx="18" cy="6" r="1.6" />

    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />

    <circle cx="6" cy="18" r="1.6" />
    <circle cx="12" cy="18" r="1.6" />
    <circle cx="18" cy="18" r="1.6" />
  </svg>
);

export const DotRescanIcon: React.FC<IconProps> = ({ size = 20, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="12" cy="4" r="1.4" />
    <circle cx="16.5" cy="5.5" r="1.4" />
    <circle cx="19.5" cy="9" r="1.4" />
    <circle cx="20" cy="13.5" r="1.4" />
    <circle cx="18" cy="17.5" r="1.4" />
    <circle cx="14.5" cy="19.8" r="1.4" />
    <circle cx="10" cy="20" r="1.4" />
    <circle cx="6" cy="18" r="1.4" />
    <circle cx="4" cy="14" r="1.4" />
    {/* Arrow head */}
    <circle cx="8" cy="4" r="1.4" />
    <circle cx="8" cy="7.5" r="1.4" />
  </svg>
);

export const DotPlayIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="7" cy="5" r="1.5" />
    <circle cx="7" cy="8.5" r="1.5" />
    <circle cx="7" cy="12" r="1.5" />
    <circle cx="7" cy="15.5" r="1.5" />
    <circle cx="7" cy="19" r="1.5" />
    <circle cx="10.5" cy="7.5" r="1.5" />
    <circle cx="10.5" cy="12" r="1.5" />
    <circle cx="10.5" cy="16.5" r="1.5" />
    <circle cx="14" cy="9.5" r="1.5" />
    <circle cx="14" cy="14.5" r="1.5" />
    <circle cx="17.5" cy="12" r="1.5" />
  </svg>
);

export const DotPauseIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="8" cy="5" r="1.5" />
    <circle cx="8" cy="8.5" r="1.5" />
    <circle cx="8" cy="12" r="1.5" />
    <circle cx="8" cy="15.5" r="1.5" />
    <circle cx="8" cy="19" r="1.5" />
    <circle cx="16" cy="5" r="1.5" />
    <circle cx="16" cy="8.5" r="1.5" />
    <circle cx="16" cy="12" r="1.5" />
    <circle cx="16" cy="15.5" r="1.5" />
    <circle cx="16" cy="19" r="1.5" />
  </svg>
);

export const DotForwardIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="5" cy="7" r="1.5" />
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="5" cy="17" r="1.5" />
    <circle cx="9" cy="9.5" r="1.5" />
    <circle cx="9" cy="14.5" r="1.5" />
    <circle cx="13" cy="12" r="1.5" />
    <circle cx="13" cy="7" r="1.5" />
    <circle cx="13" cy="17" r="1.5" />
    <circle cx="16.5" cy="9.5" r="1.5" />
    <circle cx="16.5" cy="14.5" r="1.5" />
    <circle cx="20" cy="12" r="1.5" />
  </svg>
);

export const DotBackwardIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="19" cy="7" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
    <circle cx="19" cy="17" r="1.5" />
    <circle cx="15" cy="9.5" r="1.5" />
    <circle cx="15" cy="14.5" r="1.5" />
    <circle cx="11" cy="12" r="1.5" />
    <circle cx="11" cy="7" r="1.5" />
    <circle cx="11" cy="17" r="1.5" />
    <circle cx="7.5" cy="9.5" r="1.5" />
    <circle cx="7.5" cy="14.5" r="1.5" />
    <circle cx="4" cy="12" r="1.5" />
  </svg>
);

export const DotFullscreenIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="5" cy="5" r="1.5" />
    <circle cx="9" cy="5" r="1.5" />
    <circle cx="5" cy="9" r="1.5" />
    <circle cx="19" cy="5" r="1.5" />
    <circle cx="15" cy="5" r="1.5" />
    <circle cx="19" cy="9" r="1.5" />
    <circle cx="5" cy="19" r="1.5" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="5" cy="15" r="1.5" />
    <circle cx="19" cy="19" r="1.5" />
    <circle cx="15" cy="19" r="1.5" />
    <circle cx="19" cy="15" r="1.5" />
  </svg>
);

export const DotEqualizerIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="5" cy="18" r="1.4" />
    <circle cx="5" cy="14" r="1.4" />
    <circle cx="5" cy="10" r="1.4" />
    <circle cx="5" cy="6" r="1.4" fill="#D71921" />
    <circle cx="12" cy="18" r="1.4" />
    <circle cx="12" cy="14" r="1.4" />
    <circle cx="12" cy="10" r="1.4" fill="#D71921" />
    <circle cx="19" cy="18" r="1.4" />
    <circle cx="19" cy="14" r="1.4" fill="#D71921" />
  </svg>
);

export const DotSubtitlesIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
    <circle cx="4" cy="7" r="1.3" />
    <circle cx="9" cy="7" r="1.3" />
    <circle cx="15" cy="7" r="1.3" />
    <circle cx="20" cy="7" r="1.3" />
    <circle cx="4" cy="17" r="1.3" />
    <circle cx="9" cy="17" r="1.3" />
    <circle cx="15" cy="17" r="1.3" />
    <circle cx="20" cy="17" r="1.3" />
    <circle cx="4" cy="12" r="1.3" />
    <circle cx="20" cy="12" r="1.3" />
    <circle cx="8" cy="12" r="1.3" />
    <circle cx="12" cy="12" r="1.3" />
    <circle cx="16" cy="12" r="1.3" />
  </svg>
);
