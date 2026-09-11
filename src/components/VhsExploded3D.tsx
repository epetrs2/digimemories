import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  AlertTriangle, 
  Flame, 
  Sparkles, 
  ArrowDown, 
  CheckCircle2, 
  Film
} from 'lucide-react';

export const VhsExploded3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [useCssFallback, setUseCssFallback] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Scroll listener for calculating progress (shared between WebGL & CSS 3D fallback)
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalDist = rect.height - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, totalDist)));
      
      setScrollProgress(progress);

      if (progress < 0.22) setActiveStage(0);
      else if (progress < 0.50) setActiveStage(1);
      else if (progress < 0.75) setActiveStage(2);
      else setActiveStage(3);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMousePos({ x: x * 15, y: y * 12 });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // WebGL 3D Scene Initialization
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    // 1. SAFE WEBGL SUPPORT CHECK
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || 
                 testCanvas.getContext('webgl') || 
                 testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setUseCssFallback(true);
        return;
      }
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      } catch {
        setUseCssFallback(true);
        return;
      }
    }

    if (!renderer) {
      setUseCssFallback(true);
      return;
    }

    // 2. SCENE & CAMERA SETUP
    const scene = new THREE.Scene();
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 7.2);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    // 3. STUDIO LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(6, 8, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-6, -3, -5);
    scene.add(rimLight);

    const fillWarmLight = new THREE.PointLight(0xea580c, 1.5, 25);
    fillWarmLight.position.set(3, -2, 4);
    scene.add(fillWarmLight);

    // 4. RETRO VHS LABEL TEXTURE
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 1024;
    labelCanvas.height = 512;
    const ctx = labelCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1024, 512);

      const grad = ctx.createLinearGradient(0, 0, 1024, 0);
      grad.addColorStop(0, '#c2410c');
      grad.addColorStop(0.5, '#ea580c');
      grad.addColorStop(1, '#f97316');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 90);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px -apple-system, sans-serif';
      ctx.fillText('DIGIMEMORIES', 50, 58);
      ctx.font = '600 22px -apple-system, sans-serif';
      ctx.fillText('LABORATORIO DE PRESERVACIÓN', 320, 58);

      ctx.fillStyle = '#ffedd5';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('VHS • HQ 120', 820, 58);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 110, 964, 370);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 34px -apple-system, sans-serif';
      ctx.fillText('ARCHIVO FAMILIAR ORIGINAL (1994)', 60, 170);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'italic 500 28px Georgia, serif';
      ctx.fillText('• Boda de Papá y Mamá (Catedral)', 65, 235);
      ctx.fillText('• Vacaciones de Verano 94 (Acapulco)', 65, 285);
      ctx.fillText('• Primeros pasos de Mariana en Navidad', 65, 335);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 18px monospace';
      ctx.fillText('SP 120 MIN  |  HI-FI STEREO  |  FORMATO ANALÓGICO NTSC', 65, 410);
      ctx.fillText('ADVERTENCIA: CINTA MAGNÉTICA SUJETA A PÉRDIDA DE SEÑAL POR EDAD', 65, 445);
    }
    const labelTexture = new THREE.CanvasTexture(labelCanvas);

    // 5. VHS 3D MODEL BUILDER
    const vhsGroup = new THREE.Group();
    scene.add(vhsGroup);

    const plasticBlackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55, metalness: 0.1 });
    const plasticDarkGrayMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6, metalness: 0.05 });
    const clearWindowMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, roughness: 0.15, transmission: 0.8, ior: 1.45 });
    const spoolWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.05 });
    const magneticTapeMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.25, metalness: 0.25 });
    const metalRollerMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.92, roughness: 0.2 });
    const screwMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.95, roughness: 0.25 });

    // Front Shell
    const frontShellGroup = new THREE.Group();
    vhsGroup.add(frontShellGroup);
    frontShellGroup.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 0.1), plasticBlackMat));

    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.7), new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.5 }));
    labelMesh.position.set(0, 0.15, 0.055);
    frontShellGroup.add(labelMesh);

    const leftWindowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.12), clearWindowMat);
    leftWindowMesh.position.set(-1.05, 0.15, 0.01);
    frontShellGroup.add(leftWindowMesh);

    const rightWindowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.12), clearWindowMat);
    rightWindowMesh.position.set(1.05, 0.15, 0.01);
    frontShellGroup.add(rightWindowMesh);

    // Front Door Flap
    const frontDoorGroup = new THREE.Group();
    frontDoorGroup.position.set(0, -1.2, 0);
    vhsGroup.add(frontDoorGroup);
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.56), plasticDarkGrayMat);
    doorMesh.position.set(0, 0.175, 0);
    frontDoorGroup.add(doorMesh);

    // Left Spool
    const leftSpoolGroup = new THREE.Group();
    leftSpoolGroup.position.set(-1.05, 0.15, -0.1);
    vhsGroup.add(leftSpoolGroup);

    const spoolHubGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.38, 24);
    const leftHub = new THREE.Mesh(spoolHubGeo, spoolWhiteMat);
    leftHub.rotation.x = Math.PI / 2;
    leftSpoolGroup.add(leftHub);

    const leftTape = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.36, 32, 1, true), magneticTapeMat);
    leftTape.rotation.x = Math.PI / 2;
    leftSpoolGroup.add(leftTape);

    // Right Spool
    const rightSpoolGroup = new THREE.Group();
    rightSpoolGroup.position.set(1.05, 0.15, -0.1);
    vhsGroup.add(rightSpoolGroup);

    const rightHub = new THREE.Mesh(spoolHubGeo, spoolWhiteMat);
    rightHub.rotation.x = Math.PI / 2;
    rightSpoolGroup.add(rightHub);

    const rightTape = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.36, 32, 1, true), magneticTapeMat);
    rightTape.rotation.x = Math.PI / 2;
    rightSpoolGroup.add(rightTape);

    // Internals
    const internalsGroup = new THREE.Group();
    vhsGroup.add(internalsGroup);

    const rollerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 16);
    const leftRoller = new THREE.Mesh(rollerGeo, metalRollerMat);
    leftRoller.position.set(-1.85, -0.95, -0.1);
    internalsGroup.add(leftRoller);

    const rightRoller = new THREE.Mesh(rollerGeo, metalRollerMat);
    rightRoller.position.set(1.85, -0.95, -0.1);
    internalsGroup.add(rightRoller);

    const ribbonMesh = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.32, 0.01), magneticTapeMat);
    ribbonMesh.position.set(0, -0.98, -0.1);
    internalsGroup.add(ribbonMesh);

    // Back Shell
    const backShellGroup = new THREE.Group();
    backShellGroup.position.set(0, 0, -0.28);
    vhsGroup.add(backShellGroup);
    backShellGroup.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 0.1), plasticDarkGrayMat));

    // Screws
    const screwsGroup = new THREE.Group();
    vhsGroup.add(screwsGroup);
    const screwGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12);
    [[-1.9, 1.0, -0.36], [1.9, 1.0, -0.36], [-1.9, -1.0, -0.36], [1.9, -1.0, -0.36], [0, 0.15, -0.36]].forEach(pos => {
      const s = new THREE.Mesh(screwGeo, screwMat);
      s.position.set(pos[0], pos[1], pos[2]);
      s.rotation.x = Math.PI / 2;
      screwsGroup.add(s);
    });

    // 6. RENDER LOOP WITH EXPLODED INTERPOLATION
    let animId: number;
    let lerpP = 0;

    const render = () => {
      animId = requestAnimationFrame(render);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const totalDist = rect.height - window.innerHeight;
        const targetP = Math.max(0, Math.min(1, -rect.top / Math.max(1, totalDist)));
        lerpP += (targetP - lerpP) * 0.09;
      }

      const p = lerpP;

      frontShellGroup.position.z = p * 2.4;
      frontShellGroup.rotation.x = p * 0.15;

      frontDoorGroup.rotation.x = -p * Math.PI * 0.85;
      frontDoorGroup.position.y = -1.2 + p * 1.35;
      frontDoorGroup.position.z = p * 2.9;

      leftSpoolGroup.position.y = 0.15 + p * 1.5;
      leftSpoolGroup.position.x = -1.05 - p * 0.85;
      leftSpoolGroup.position.z = -0.1 + p * 1.2;
      leftSpoolGroup.rotation.z += 0.006;

      rightSpoolGroup.position.y = 0.15 + p * 1.5;
      rightSpoolGroup.position.x = 1.05 + p * 0.85;
      rightSpoolGroup.position.z = -0.1 + p * 1.2;
      rightSpoolGroup.rotation.z += 0.008;

      internalsGroup.position.y = -p * 0.6;
      internalsGroup.position.z = p * 0.8;

      backShellGroup.position.z = -0.28 - p * 2.2;
      backShellGroup.rotation.x = -p * 0.12;

      screwsGroup.position.z = -p * 3.8;

      vhsGroup.rotation.x = 0.22 + p * 0.35;
      vhsGroup.rotation.y = -0.38 + p * 0.75;
      vhsGroup.position.y = 0.15 - p * 0.2;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(render);

    const handleResize = () => {
      if (!mount || !renderer) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer && renderer.domElement) {
        try { mount.removeChild(renderer.domElement); } catch {}
      }
      try { renderer.dispose(); } catch {}
    };
  }, [useCssFallback]);

  const p = scrollProgress;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        height: '340vh',
        background: 'radial-gradient(ellipse at 50% 40%, #1c1917 0%, #0c0a09 100%)',
        color: '#ffffff'
      }}
    >
      {/* Pinned Sticky Viewport */}
      <div 
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          padding: '5rem 1.5rem 1.5rem',
          boxSizing: 'border-box'
        }}
      >
        {/* WebGL 3D Canvas Layer (Used when WebGL is active) */}
        {!useCssFallback ? (
          <div 
            ref={canvasMountRef}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              cursor: 'grab'
            }}
          />
        ) : (
          /* CSS 3D Exploded Engine (Bulletproof Fallback for all environments) */
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: '1200px',
              zIndex: 1,
              pointerEvents: 'none'
            }}
          >
            <div 
              style={{
                position: 'relative',
                width: 'min(420px, 85vw)',
                height: '240px',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${16 - p * 12 + mousePos.y * 0.4}deg) rotateY(${-22 + p * 38 + mousePos.x * 0.4}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
            >
              {/* Back Shell */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
                  border: '2px solid #27272a',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
                  transform: `translateZ(${-p * 110}px)`,
                  transition: 'transform 0.1s linear'
                }}
              />

              {/* Internal Spools */}
              <div 
                style={{
                  position: 'absolute',
                  inset: '20px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${p * 50}px) translateY(${-p * 45}px)`,
                  transition: 'transform 0.1s linear'
                }}
              >
                {/* Left Reel with Magnetic Tape */}
                <div 
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #f8fafc 24%, #1e1b18 25%, #2a221b 85%, #f1f5f9 86%)',
                    border: '3px solid #3f3f46',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `translateX(${-p * 55}px) rotate(${p * 240}deg)`
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px dashed #71717a' }} />
                </div>

                {/* Right Reel */}
                <div 
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #f8fafc 28%, #1e1b18 29%, #2a221b 72%, #f1f5f9 73%)',
                    border: '3px solid #3f3f46',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `translateX(${p * 55}px) rotate(${p * 320}deg)`
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px dashed #71717a' }} />
                </div>
              </div>

              {/* Front Protective Door */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-12px',
                  left: 0,
                  right: 0,
                  height: '36px',
                  background: 'linear-gradient(180deg, #27272a 0%, #18181b 100%)',
                  borderRadius: '6px',
                  border: '1px solid #3f3f46',
                  transformOrigin: 'bottom center',
                  transform: `translateZ(${p * 140}px) rotateX(${-p * 95}deg)`,
                  transition: 'transform 0.1s linear'
                }}
              />

              {/* Front Casing with Vintage Label and Dual Windows */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
                  transform: `translateZ(${p * 120}px)`,
                  transition: 'transform 0.1s linear',
                  padding: '12px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {/* Vintage Label */}
                <div 
                  style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#0f172a',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ea580c', paddingBottom: '4px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#c2410c' }}>DIGIMEMORIES</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>ARCHIVO FAMILIAR 1994</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#1e3a8a', lineHeight: 1.3 }}>
                    Vacaciones Acapulco + Boda Papá y Mamá
                  </div>
                </div>

                {/* Clear observation windows */}
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '90px' }}>
                  <div style={{ width: '100px', height: '80px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }} />
                  <div style={{ width: '100px', height: '80px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '780px', pointerEvents: 'none' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(234, 88, 12, 0.15)',
            border: '1px solid rgba(234, 88, 12, 0.35)',
            color: '#fdba74',
            padding: '0.35rem 0.95rem',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.75rem',
            backdropFilter: 'blur(10px)'
          }}>
            <Film size={14} className="text-accent" />
            <span>Anatomía 3D & Peligro de Pérdida Analógica</span>
          </div>

          <h2 style={{
            margin: 0,
            fontSize: 'clamp(1.75rem, 3.8vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            color: '#f8fafc',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)'
          }}>
            El peligro oculto dentro de tus <span style={{ background: 'linear-gradient(90deg, #ea580c 0%, #f97316 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>cintas familiares</span>
          </h2>

          <p style={{
            margin: '0.5rem auto 0 auto',
            fontSize: 'clamp(0.85rem, 1.8vw, 1.05rem)',
            color: '#94a3b8',
            maxWidth: '580px'
          }}>
            Desliza hacia abajo para abrir el casete capa por capa y descubrir por qué el tiempo borra tus recuerdos.
          </p>
        </div>

        {/* Bottom HUD: Storytelling Cards + Timeline Indicator */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '580px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem',
          pointerEvents: 'none'
        }}>
          {/* Dynamic Glassmorphism Storytelling Cards Overlay */}
          <div style={{
            position: 'relative',
            width: '100%',
            minHeight: '140px'
          }}>
            {/* STAGE 0: CÁPSULA INTACTA */}
            <div style={{
              opacity: activeStage === 0 ? 1 : 0,
              transform: activeStage === 0 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(28, 25, 23, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '18px',
              padding: '1.1rem 1.4rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              textAlign: 'center',
              pointerEvents: activeStage === 0 ? 'auto' : 'none'
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                <Sparkles size={13} /> La Cápsula del Tiempo Familiar
              </div>
              <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Guardadas por más de 30 años
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                En los 80s y 90s, bodas, navidades y primeros pasos quedaron atrapados en cinta magnética. Pero estas cintas fueron diseñadas para durar solo 15 a 20 años.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.75rem', color: '#fb923c', fontWeight: 700 }}>
                <span>Desliza para ver la apertura interior</span>
                <ArrowDown size={13} className="animate-bounce" />
              </div>
            </div>

            {/* STAGE 1: DESMAGNETIZACIÓN NATURAL */}
            <div style={{
              opacity: activeStage === 1 ? 1 : 0,
              transform: activeStage === 1 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(28, 25, 23, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(234, 88, 12, 0.35)',
              borderRadius: '18px',
              padding: '1.1rem 1.4rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              pointerEvents: activeStage === 1 ? 'auto' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={13} /> FASE 1: APERTURA FRONTAL
                </span>
                <span style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 800 }}>
                  -20% Señal / década
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.12rem', fontWeight: 800, color: '#ffffff' }}>
                1. Desmagnetización Inevitable de la Cinta
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                Las diminutas partículas de óxido de hierro pierden su orientación magnética gradualmente. El video comienza a presentar estática, rayas blancas de distorsión ("dropout") y colores desvanecidos.
              </p>
            </div>

            {/* STAGE 2: SÍNDROME DE CINTA PEGAJOSA Y MOHO */}
            <div style={{
              opacity: activeStage === 2 ? 1 : 0,
              transform: activeStage === 2 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(28, 25, 23, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '18px',
              padding: '1.1rem 1.4rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              pointerEvents: activeStage === 2 ? 'auto' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Flame size={13} /> FASE 2: NÚCLEO Y BOBINAS
                </span>
                <span style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontWeight: 800 }}>
                  Peligro Crítico de Moho
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.12rem', fontWeight: 800, color: '#ffffff' }}>
                2. Hidrólisis Química (Síndrome de Cinta Pegajosa)
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                La humedad del aire descompone los polímeros aglutinantes de la cinta. Las capas se pegan entre sí y prolifera moho blanco microscópico que devora la emulsión. Al ponerla en una videocasetera común, la cinta se rompe.
              </p>
            </div>

            {/* STAGE 3: RESCATE 1:1 EN ESTUDIO PROFESIONAL */}
            <div style={{
              opacity: activeStage === 3 ? 1 : 0,
              transform: activeStage === 3 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(28, 25, 23, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '18px',
              padding: '1.1rem 1.4rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              pointerEvents: activeStage === 3 ? 'auto' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={13} /> FASE 3: DESPIECE TOTAL & SOLUCIÓN
                </span>
                <span style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontWeight: 800 }}>
                  Digitalización 1:1 en Estudio
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.12rem', fontWeight: 800, color: '#ffffff' }}>
                3. Rescate Profesional en DigiMemories
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                No arriesgues tus recuerdos en aparatos viejos que rayan la cinta. En nuestro laboratorio limpiamos las guías, estabilizamos la señal con TBC profesional y te entregamos tus videos en Full HD 1080p listos para celular, TV y USB.
              </p>
            </div>
          </div>

          {/* Bottom Timeline Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(12px)',
            padding: '0.45rem 1.15rem',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {[
              { label: 'Casete Intacto' },
              { label: 'Desmagnetización' },
              { label: 'Moho & Cinta Pegada' },
              { label: 'Rescate Digital' }
            ].map((step, idx) => {
              const isActive = activeStage === idx;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: isActive ? '#ea580c' : 'rgba(255, 255, 255, 0.25)',
                    boxShadow: isActive ? '0 0 10px #ea580c' : 'none',
                    transition: 'all 0.3s ease'
                  }} />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? '#f8fafc' : '#94a3b8',
                    transition: 'color 0.3s ease'
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default VhsExploded3D;
