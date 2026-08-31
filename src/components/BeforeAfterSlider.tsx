import React, { useState, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Cinta Original (Degradada)',
  afterLabel = 'Digitalizado & Restaurado'
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  return (
    <div 
      className="glass" 
      style={{ padding: '1rem', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.95)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
          <Sparkles size={18} className="text-accent" />
          <span>Comparador de Restauración de Color</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Desliza para comparar</span>
      </div>

      <div
        ref={containerRef}
        className="ba-container"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleTouchMove}
      >
        {/* After Image (Background) */}
        <img
          src={afterImage}
          alt="Restaurado"
          className="ba-image"
          draggable={false}
        />
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(0, 0, 0, 0.65)',
          color: '#ffffff',
          padding: '0.35rem 0.85rem',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          zIndex: 2
        }}>
          {afterLabel}
        </div>

        {/* Before Image (Clipped Overlay) */}
        <div
          className="ba-overlay"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt="Original"
            className="ba-image"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
              maxWidth: 'none'
            }}
            draggable={false}
          />
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(234, 88, 12, 0.85)',
            color: '#ffffff',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
            zIndex: 2
          }}>
            {beforeLabel}
          </div>
        </div>

        {/* Slider Line and Handle */}
        <div
          className="ba-slider-line"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="ba-slider-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
