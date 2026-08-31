import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertOctagon, ShieldAlert } from 'lucide-react';

const slides = [
  {
    src: '/tapes_stack.jpg',
    alt: 'Pila de cintas VHS familiares olvidadas',
    tag: 'Degradación Magnética',
    caption: 'Pérdida de señal progresiva',
    desc: 'Con el paso de los años, el aglutinante magnético se descompone y borra las grabaciones.',
    icon: <AlertOctagon size={18} className="text-accent" />
  },
  {
    src: '/tape_mold.jpg',
    alt: 'Cinta VHS dañada por moho y humedad',
    tag: 'Humedad y Hongos',
    caption: 'El moho corroe la cinta física',
    desc: 'Los hongos consumen la capa química microscópica donde están grabadas tus memorias.',
    icon: <ShieldAlert size={18} className="text-accent" />
  },
  {
    src: '/tape_tangled.jpg',
    alt: 'Cinta magnética enredada y frágil',
    tag: 'Fragilidad Mecánica',
    caption: 'Cintas quebradizas y enredos',
    desc: 'El plástico se reseca, perdiendo elasticidad y rompiéndose al intentar reproducirlo.',
    icon: <AlertOctagon size={18} className="text-accent" />
  }
];

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  return (
    <div className="glass" style={{ padding: '0.75rem', borderRadius: '24px', background: '#ffffff' }}>
      <div className="carousel-container" style={{ position: 'relative', height: '440px' }}>
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={index}
              className={`carousel-slide ${isActive ? 'active' : ''}`}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: isActive ? 1 : 0,
                transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: isActive ? 'auto' : 'none'
              }}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Gradient overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(28, 25, 23, 0.88) 0%, rgba(28, 25, 23, 0.3) 50%, transparent 100%)',
                  pointerEvents: 'none'
                }}
              />

              {/* Caption card */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.25rem',
                  left: '1.25rem',
                  right: '1.25rem',
                  color: '#ffffff',
                  zIndex: 2
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(234, 88, 12, 0.9)',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem'
                }}>
                  {slide.tag}
                </div>
                <h4 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '0.35rem', lineHeight: 1.2 }}>
                  {slide.caption}
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.4, margin: 0 }}>
                  {slide.desc}
                </p>
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          aria-label="Slide anterior"
          style={{
            position: 'absolute',
            top: '50%',
            left: '14px',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.85)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10,
            transition: 'transform 0.2s ease'
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={nextSlide}
          aria-label="Slide siguiente"
          style={{
            position: 'absolute',
            top: '50%',
            right: '14px',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.85)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10,
            transition: 'transform 0.2s ease'
          }}
        >
          <ChevronRight size={20} />
        </button>

        {/* Indicator dots */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            display: 'flex',
            gap: '6px',
            zIndex: 10
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ir al slide ${i + 1}`}
              style={{
                width: i === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: i === currentIndex ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.6)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Carousel;
