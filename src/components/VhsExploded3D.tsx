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

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.22, 6.6);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    // 3. STUDIO LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const frontDirectLight = new THREE.DirectionalLight(0xffffff, 2.4);
    frontDirectLight.position.set(0, 2, 7);
    scene.add(frontDirectLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.0);
    keyLight.position.set(5, 7, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-6, -3, -5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xea580c, 1.4, 25);
    fillLight.position.set(3, -2, 4);
    scene.add(fillLight);

    // 4. AUTHENTIC TEXTURES LOADER
    const textureLoader = new THREE.TextureLoader();
    const loadTex = (url: string) => {
      const tex = textureLoader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    };

    const frontTex = loadTex('/assets/vhs/vhs_front_cutout.png');
    const backTex = loadTex('/assets/vhs/vhs_back.png');
    const spineTex = loadTex('/assets/vhs/vhs_spine.png');
    const flapTex = loadTex('/assets/vhs/vhs_flap.png');
    const reelFullTex = loadTex('/assets/vhs/vhs_reel_full.png');
    const reelSmallTex = loadTex('/assets/vhs/vhs_reel_small.png');

    // 5. AUTHENTIC VHS 3D CASSETTE MODEL
    // Exact standard VHS dimensions: 188mm x 104mm x 25mm -> ratio 4.34 x 2.4 x 0.56
    const W = 4.34;
    const H = 2.40;
    const D = 0.56;

    const vhsGroup = new THREE.Group();
    scene.add(vhsGroup);

    const casingBlackMat = new THREE.MeshStandardMaterial({ 
      color: 0x151518, 
      roughness: 0.65, 
      metalness: 0.08 
    });

    const windowGlassMat = new THREE.MeshPhysicalMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.28, 
      roughness: 0.12, 
      transmission: 0.85, 
      ior: 1.48 
    });

    const tapeEdgeMat = new THREE.MeshStandardMaterial({ 
      color: 0x18120e, 
      roughness: 0.35, 
      metalness: 0.3 
    });

    const chromeRollerMat = new THREE.MeshStandardMaterial({ 
      color: 0xd4d4d8, 
      metalness: 0.95, 
      roughness: 0.18 
    });

    const screwMat = new THREE.MeshStandardMaterial({ 
      color: 0xa1a1aa, 
      metalness: 0.92, 
      roughness: 0.25 
    });

    // --- FRONT SHELL ---
    const frontShellGroup = new THREE.Group();
    vhsGroup.add(frontShellGroup);

    // Front textured face with real transparent acrylic windows
    const frontMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H), 
      new THREE.MeshStandardMaterial({ 
        map: frontTex, 
        transparent: true, 
        roughness: 0.55, 
        metalness: 0.08 
      })
    );
    frontMesh.position.set(0, 0, D / 2);
    frontShellGroup.add(frontMesh);

    // Clear acrylic observation window panes
    const leftWindowGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.10), windowGlassMat);
    leftWindowGlass.position.set(-1.18, -0.04, D / 2 + 0.005);
    frontShellGroup.add(leftWindowGlass);

    const rightWindowGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.10), windowGlassMat);
    rightWindowGlass.position.set(1.18, -0.04, D / 2 + 0.005);
    frontShellGroup.add(rightWindowGlass);

    // Perimeter Casing Walls (Top, Bottom, Left, Right)
    const topRim = new THREE.Mesh(new THREE.PlaneGeometry(W, D), casingBlackMat);
    topRim.position.set(0, H / 2, 0);
    topRim.rotation.x = -Math.PI / 2;
    frontShellGroup.add(topRim);

    const bottomSpine = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D), 
      new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.6 })
    );
    bottomSpine.position.set(0, -H / 2, 0);
    bottomSpine.rotation.x = Math.PI / 2;
    frontShellGroup.add(bottomSpine);

    const leftRim = new THREE.Mesh(new THREE.PlaneGeometry(D, H), casingBlackMat);
    leftRim.position.set(-W / 2, 0, 0);
    leftRim.rotation.y = -Math.PI / 2;
    frontShellGroup.add(leftRim);

    const rightRim = new THREE.Mesh(new THREE.PlaneGeometry(D, H), casingBlackMat);
    rightRim.position.set(W / 2, 0, 0);
    rightRim.rotation.y = Math.PI / 2;
    frontShellGroup.add(rightRim);

    // --- TOP FLAP (Protective Door with "Insert this side into recorder") ---
    const frontDoorGroup = new THREE.Group();
    // Pivot at top edge of the cassette
    frontDoorGroup.position.set(0, H / 2, D / 2);
    vhsGroup.add(frontDoorGroup);

    const flapMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W, 0.28), 
      new THREE.MeshStandardMaterial({ map: flapTex, roughness: 0.6 })
    );
    flapMesh.position.set(0, -0.14, 0);
    frontDoorGroup.add(flapMesh);

    const flapTop = new THREE.Mesh(new THREE.PlaneGeometry(W, D * 0.95), casingBlackMat);
    flapTop.position.set(0, 0, -D * 0.475);
    flapTop.rotation.x = -Math.PI / 2;
    frontDoorGroup.add(flapTop);

    // Exposed magnetic tape under flap (visible when door opens!)
    const flapTapeRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.92, 0.22, 0.02), 
      tapeEdgeMat
    );
    flapTapeRibbon.position.set(0, -0.14, -D * 0.35);
    frontDoorGroup.add(flapTapeRibbon);

    // --- LEFT SPOOL (Take-up reel with full tape) ---
    const leftSpoolGroup = new THREE.Group();
    leftSpoolGroup.position.set(-1.18, -0.04, 0);
    vhsGroup.add(leftSpoolGroup);

    const spoolGeo = new THREE.CylinderGeometry(0.96, 0.96, 0.42, 48);
    const leftReelCapMat = new THREE.MeshStandardMaterial({ 
      map: reelFullTex, 
      transparent: true, 
      roughness: 0.4 
    });

    const leftSpoolMesh = new THREE.Mesh(spoolGeo, [tapeEdgeMat, leftReelCapMat, leftReelCapMat]);
    leftSpoolMesh.rotation.x = Math.PI / 2;
    leftSpoolGroup.add(leftSpoolMesh);

    // --- RIGHT SPOOL (Supply reel with smaller tape pack) ---
    const rightSpoolGroup = new THREE.Group();
    rightSpoolGroup.position.set(1.18, -0.04, 0);
    vhsGroup.add(rightSpoolGroup);

    const rightReelCapMat = new THREE.MeshStandardMaterial({ 
      map: reelSmallTex, 
      transparent: true, 
      roughness: 0.4 
    });

    const rightSpoolMesh = new THREE.Mesh(spoolGeo, [tapeEdgeMat, rightReelCapMat, rightReelCapMat]);
    rightSpoolMesh.rotation.x = Math.PI / 2;
    rightSpoolGroup.add(rightSpoolMesh);

    // --- INTERNAL GUIDE ROLLERS & MAGNETIC TAPE RIBBON ---
    const internalsGroup = new THREE.Group();
    vhsGroup.add(internalsGroup);

    const rollerGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.44, 20);
    const leftRoller = new THREE.Mesh(rollerGeo, chromeRollerMat);
    leftRoller.position.set(-1.88, -0.96, 0);
    internalsGroup.add(leftRoller);

    const rightRoller = new THREE.Mesh(rollerGeo, chromeRollerMat);
    rightRoller.position.set(1.88, -0.96, 0);
    internalsGroup.add(rightRoller);

    // Bottom horizontal tape ribbon running between rollers
    const ribbonMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.76, 0.28, 0.012), 
      tapeEdgeMat
    );
    ribbonMesh.position.set(0, -0.96, 0);
    internalsGroup.add(ribbonMesh);

    // --- BACK SHELL ---
    const backShellGroup = new THREE.Group();
    backShellGroup.position.set(0, 0, -D / 2);
    vhsGroup.add(backShellGroup);

    const backMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H), 
      new THREE.MeshStandardMaterial({ 
        map: backTex, 
        roughness: 0.65, 
        metalness: 0.06 
      })
    );
    backMesh.rotation.y = Math.PI; // Face backwards
    backShellGroup.add(backMesh);

    // --- SCREWS (Corner & Center assembly) ---
    const screwsGroup = new THREE.Group();
    vhsGroup.add(screwsGroup);
    const screwGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12);
    [
      [-1.95, 1.05, -D / 2 - 0.04], 
      [1.95, 1.05, -D / 2 - 0.04], 
      [-1.95, -1.05, -D / 2 - 0.04], 
      [1.95, -1.05, -D / 2 - 0.04], 
      [0, 0.08, -D / 2 - 0.04]
    ].forEach(pos => {
      const s = new THREE.Mesh(screwGeo, screwMat);
      s.position.set(pos[0], pos[1], pos[2]);
      s.rotation.x = Math.PI / 2;
      screwsGroup.add(s);
    });

    // 6. ANIMATION RENDER LOOP WITH SCROLL EXPLOSION
    let animId: number;
    let lerpP = 0;

    const render = () => {
      animId = requestAnimationFrame(render);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const totalDist = rect.height - window.innerHeight;
        const targetP = Math.max(0, Math.min(1, -rect.top / Math.max(1, totalDist)));
        lerpP += (targetP - lerpP) * 0.085;
      }

      const p = lerpP;

      // Front Shell lifts forward
      frontShellGroup.position.z = p * 2.3;
      frontShellGroup.rotation.x = p * 0.12;

      // Top Door flap hinges open
      frontDoorGroup.rotation.x = -p * 1.55;
      frontDoorGroup.position.z = D / 2 + p * 2.6;

      // Left spool lifts in 3D and spins
      leftSpoolGroup.position.z = p * 2.6;
      leftSpoolGroup.position.y = -0.04 + p * 1.35;
      leftSpoolGroup.position.x = -1.18 - p * 0.75;
      leftSpoolMesh.rotation.z += 0.007;

      // Right spool lifts in 3D and spins
      rightSpoolGroup.position.z = p * 2.6;
      rightSpoolGroup.position.y = -0.04 + p * 1.35;
      rightSpoolGroup.position.x = 1.18 + p * 0.75;
      rightSpoolMesh.rotation.z += 0.009;

      // Internals floating
      internalsGroup.position.y = -p * 0.55;
      internalsGroup.position.z = p * 0.9;

      // Back shell drops backwards
      backShellGroup.position.z = -D / 2 - p * 2.2;
      backShellGroup.rotation.x = -p * 0.1;

      // Screws float out
      screwsGroup.position.z = -p * 3.6;

      // Overall cassette orientation with natural mouse reactivity
      vhsGroup.rotation.x = 0.18 + p * 0.32;
      vhsGroup.rotation.y = -0.32 + p * 0.72;
      vhsGroup.position.y = 0.58 - p * 0.22;

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
          /* CSS 3D Exploded Engine (Authentic VHS Fallback for all environments) */
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: '1200px',
              zIndex: 1,
              pointerEvents: 'none',
              transform: 'translateY(-20px)'
            }}
          >
            <div 
              style={{
                position: 'relative',
                width: 'min(440px, 86vw)',
                height: '243px',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${16 - p * 12 + mousePos.y * 0.4}deg) rotateY(${-22 + p * 38 + mousePos.x * 0.4}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
            >
              {/* Back Shell with authentic drive spindle holes */}
              <img 
                src="/assets/vhs/vhs_back.png" 
                alt="VHS Back Shell"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.85)',
                  transform: `translateZ(${-p * 110}px)`,
                  transition: 'transform 0.1s linear',
                  pointerEvents: 'none'
                }}
              />

              {/* Internal Spools (Dual authentic white hubs with magnetic tape) */}
              <div 
                style={{
                  position: 'absolute',
                  inset: '16px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${p * 60}px) translateY(${-p * 45}px)`,
                  transition: 'transform 0.1s linear'
                }}
              >
                {/* Left Reel (Full takeup reel) */}
                <img 
                  src="/assets/vhs/vhs_reel_full.png"
                  alt="VHS Left Spool"
                  style={{
                    width: '125px',
                    height: '125px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))',
                    transform: `translateX(${-p * 50}px) rotate(${p * 240}deg)`,
                    transition: 'transform 0.1s linear'
                  }}
                />

                {/* Right Reel (Supply reel) */}
                <img 
                  src="/assets/vhs/vhs_reel_small.png"
                  alt="VHS Right Spool"
                  style={{
                    width: '125px',
                    height: '125px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))',
                    transform: `translateX(${p * 50}px) rotate(${p * 320}deg)`,
                    transition: 'transform 0.1s linear'
                  }}
                />
              </div>

              {/* Front Protective Door Flap ("Insert this side into recorder") */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '32px',
                  transformOrigin: 'top center',
                  transform: `translateZ(${p * 140}px) rotateX(${-p * 95}deg)`,
                  transition: 'transform 0.1s linear',
                  zIndex: 4
                }}
              >
                <img 
                  src="/assets/vhs/vhs_flap.png" 
                  alt="VHS Flap"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
                />
              </div>

              {/* Front Face with authentic label and transparent acrylic windows */}
              <img 
                src="/assets/vhs/vhs_front_solid.png" 
                alt="VHS Authentic Front Face"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.75)',
                  transform: `translateZ(${p * 120}px)`,
                  transition: 'transform 0.1s linear',
                  zIndex: 3
                }}
              />
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
          maxWidth: '520px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.65rem',
          pointerEvents: 'none',
          marginBottom: '0.5rem'
        }}>
          {/* Dynamic Glassmorphism Storytelling Cards Overlay */}
          <div style={{
            position: 'relative',
            width: '100%',
            minHeight: '118px'
          }}>
            {/* STAGE 0: CÁPSULA INTACTA */}
            <div style={{
              opacity: activeStage === 0 ? 1 : 0,
              transform: activeStage === 0 ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(24, 20, 18, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '0.85rem 1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
              textAlign: 'center',
              pointerEvents: activeStage === 0 ? 'auto' : 'none'
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                <Sparkles size={12} /> La Cápsula del Tiempo Familiar
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.08rem', fontWeight: 800, color: '#f8fafc' }}>
                Guardadas por más de 30 años
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                En los 80s y 90s, bodas, navidades y primeros pasos quedaron atrapados en cinta magnética. Pero estas cintas fueron diseñadas para durar solo 15 a 20 años.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.45rem', fontSize: '0.72rem', color: '#fb923c', fontWeight: 700 }}>
                <span>Desliza para ver la apertura interior</span>
                <ArrowDown size={12} className="animate-bounce" />
              </div>
            </div>

            {/* STAGE 1: DESMAGNETIZACIÓN NATURAL */}
            <div style={{
              opacity: activeStage === 1 ? 1 : 0,
              transform: activeStage === 1 ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(24, 20, 18, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(234, 88, 12, 0.35)',
              borderRadius: '16px',
              padding: '0.85rem 1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
              pointerEvents: activeStage === 1 ? 'auto' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={13} /> FASE 1: APERTURA FRONTAL
                </span>
                <span style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 800 }}>
                  -20% Señal / década
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
                1. Desmagnetización Inevitable de la Cinta
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                Las diminutas partículas de óxido de hierro pierden su orientación magnética gradualmente. El video comienza a presentar estática, rayas blancas de distorsión ("dropout") y colores desvanecidos.
              </p>
            </div>

            {/* STAGE 2: SÍNDROME DE CINTA PEGAJOSA Y MOHO */}
            <div style={{
              opacity: activeStage === 2 ? 1 : 0,
              transform: activeStage === 2 ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(24, 20, 18, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '0.85rem 1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
              pointerEvents: activeStage === 2 ? 'auto' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Flame size={13} /> FASE 2: NÚCLEO Y BOBINAS
                </span>
                <span style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontWeight: 800 }}>
                  Peligro Crítico de Moho
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
                2. Hidrólisis Química (Síndrome de Cinta Pegajosa)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                La humedad del aire descompone los polímeros aglutinantes de la cinta. Las capas se pegan entre sí y prolifera moho blanco microscópico que devora la emulsión. Al ponerla en una videocasetera común, la cinta se rompe.
              </p>
            </div>

            {/* STAGE 3: RESCATE 1:1 EN ESTUDIO PROFESIONAL */}
            <div style={{
              opacity: activeStage === 3 ? 1 : 0,
              transform: activeStage === 3 ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'absolute',
              inset: 0,
              background: 'rgba(24, 20, 18, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '16px',
              padding: '0.85rem 1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
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
