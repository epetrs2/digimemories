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
  const [, setScrollProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    // 1. SCENE & CAMERA SETUP
    const scene = new THREE.Scene();
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.9, 7.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // 2. STUDIO LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    keyLight.position.set(6, 8, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-6, -3, -5);
    scene.add(rimLight);

    const fillWarmLight = new THREE.PointLight(0xea580c, 1.6, 25);
    fillWarmLight.position.set(3, -2, 4);
    scene.add(fillWarmLight);

    // 3. PROCEDURAL TEXTURES
    // 3A. RETRO VHS LABEL CANVAS
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 1024;
    labelCanvas.height = 512;
    const ctx = labelCanvas.getContext('2d');
    if (ctx) {
      // Background off-white label
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1024, 512);

      // Top colored banner
      const grad = ctx.createLinearGradient(0, 0, 1024, 0);
      grad.addColorStop(0, '#c2410c');
      grad.addColorStop(0.5, '#ea580c');
      grad.addColorStop(1, '#f97316');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 90);

      // Brand text in banner
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px -apple-system, sans-serif';
      ctx.fillText('DIGIMEMORIES', 50, 58);
      ctx.font = '600 22px -apple-system, sans-serif';
      ctx.fillText('LABORATORIO DE PRESERVACIÓN', 320, 58);

      ctx.fillStyle = '#ffedd5';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('VHS • HQ 120', 820, 58);

      // Inner border lines
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 110, 964, 370);

      // Title header
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 34px -apple-system, sans-serif';
      ctx.fillText('ARCHIVO FAMILIAR ORIGINAL (1994)', 60, 170);

      // Handwritten pen lines simulation
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'italic 500 28px Georgia, serif';
      ctx.fillText('• Boda de Papá y Mamá (Catedral)', 65, 235);
      ctx.fillText('• Vacaciones de Verano 94 (Acapulco)', 65, 285);
      ctx.fillText('• Primeros pasos de Mariana en Navidad', 65, 335);

      // Technical footer
      ctx.fillStyle = '#64748b';
      ctx.font = '600 18px monospace';
      ctx.fillText('SP 120 MIN  |  HI-FI STEREO  |  FORMATO ANALÓGICO NTSC', 65, 410);
      ctx.fillText('ADVERTENCIA: CINTA MAGNÉTICA SUJETA A PÉRDIDA DE SEÑAL POR EDAD', 65, 445);

      // Fake barcode on right
      ctx.fillStyle = '#1e293b';
      for (let x = 800; x < 960; x += 6) {
        if (Math.random() > 0.3) {
          ctx.fillRect(x, 380, Math.random() > 0.5 ? 4 : 2, 60);
        }
      }
    }
    const labelTexture = new THREE.CanvasTexture(labelCanvas);

    // 4. VHS MESH BUILDER
    // VHS Standard Dimensions: 4.2 wide, 2.4 high, 0.55 deep
    const vhsGroup = new THREE.Group();
    scene.add(vhsGroup);

    // Shared Materials
    const plasticBlackMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.55,
      metalness: 0.1
    });

    const plasticDarkGrayMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.6,
      metalness: 0.05
    });

    const clearWindowMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      roughness: 0.15,
      transmission: 0.8,
      ior: 1.45
    });

    const spoolWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.4,
      metalness: 0.05
    });

    const magneticTapeMat = new THREE.MeshStandardMaterial({
      color: 0x1a120c,
      roughness: 0.25,
      metalness: 0.25
    });

    const metalRollerMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.92,
      roughness: 0.2
    });

    const screwMat = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      metalness: 0.95,
      roughness: 0.25
    });

    // 4A. FRONT SHELL GROUP (Front face + clear windows + label)
    const frontShellGroup = new THREE.Group();
    vhsGroup.add(frontShellGroup);

    // Main front frame
    const frontFaceGeo = new THREE.BoxGeometry(4.2, 2.4, 0.1);
    const frontFaceMesh = new THREE.Mesh(frontFaceGeo, plasticBlackMat);
    frontShellGroup.add(frontFaceMesh);

    // Label Plane on front
    const labelGeo = new THREE.PlaneGeometry(3.6, 1.7);
    const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.5 });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(0, 0.15, 0.055);
    frontShellGroup.add(labelMesh);

    // Two observation windows
    const leftWindowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.12), clearWindowMat);
    leftWindowMesh.position.set(-1.05, 0.15, 0.01);
    frontShellGroup.add(leftWindowMesh);

    const rightWindowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.12), clearWindowMat);
    rightWindowMesh.position.set(1.05, 0.15, 0.01);
    frontShellGroup.add(rightWindowMesh);

    // 4B. FRONT PROTECTIVE FLIP DOOR
    const frontDoorGroup = new THREE.Group();
    frontDoorGroup.position.set(0, -1.2, 0); // Pivot along bottom edge
    vhsGroup.add(frontDoorGroup);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.56), plasticDarkGrayMat);
    doorMesh.position.set(0, 0.175, 0);
    frontDoorGroup.add(doorMesh);

    // 4C. LEFT SPOOL (Source Tape Reel)
    const leftSpoolGroup = new THREE.Group();
    leftSpoolGroup.position.set(-1.05, 0.15, -0.1);
    vhsGroup.add(leftSpoolGroup);

    // White hub
    const spoolHubGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.38, 24);
    const leftHubMesh = new THREE.Mesh(spoolHubGeo, spoolWhiteMat);
    leftHubMesh.rotation.x = Math.PI / 2;
    leftSpoolGroup.add(leftHubMesh);

    // Wound magnetic tape coil (thick roll)
    const tapeCoilGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.36, 32, 1, true);
    const leftTapeMesh = new THREE.Mesh(tapeCoilGeo, magneticTapeMat);
    leftTapeMesh.rotation.x = Math.PI / 2;
    leftSpoolGroup.add(leftTapeMesh);

    // 4D. RIGHT SPOOL (Take-up Tape Reel)
    const rightSpoolGroup = new THREE.Group();
    rightSpoolGroup.position.set(1.05, 0.15, -0.1);
    vhsGroup.add(rightSpoolGroup);

    const rightHubMesh = new THREE.Mesh(spoolHubGeo, spoolWhiteMat);
    rightHubMesh.rotation.x = Math.PI / 2;
    rightSpoolGroup.add(rightHubMesh);

    // Smaller tape roll on right side
    const rightTapeCoilGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.36, 32, 1, true);
    const rightTapeMesh = new THREE.Mesh(rightTapeCoilGeo, magneticTapeMat);
    rightTapeMesh.rotation.x = Math.PI / 2;
    rightSpoolGroup.add(rightTapeMesh);

    // 4E. INTERNAL COMPONENTS (Metal guide pins, tape path ribbon)
    const internalsGroup = new THREE.Group();
    vhsGroup.add(internalsGroup);

    // Left Guide Roller
    const rollerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 16);
    const leftRoller = new THREE.Mesh(rollerGeo, metalRollerMat);
    leftRoller.position.set(-1.85, -0.95, -0.1);
    internalsGroup.add(leftRoller);

    // Right Guide Roller
    const rightRoller = new THREE.Mesh(rollerGeo, metalRollerMat);
    rightRoller.position.set(1.85, -0.95, -0.1);
    internalsGroup.add(rightRoller);

    // Magnetic ribbon strip spanning along bottom edge
    const ribbonGeo = new THREE.BoxGeometry(3.7, 0.32, 0.01);
    const ribbonMesh = new THREE.Mesh(ribbonGeo, magneticTapeMat);
    ribbonMesh.position.set(0, -0.98, -0.1);
    internalsGroup.add(ribbonMesh);

    // 4F. BACK SHELL
    const backShellGroup = new THREE.Group();
    backShellGroup.position.set(0, 0, -0.28);
    vhsGroup.add(backShellGroup);

    const backFaceGeo = new THREE.BoxGeometry(4.2, 2.4, 0.1);
    const backFaceMesh = new THREE.Mesh(backFaceGeo, plasticDarkGrayMat);
    backShellGroup.add(backFaceMesh);

    // 4G. SCREWS GROUP (5 corner screws popping out backwards)
    const screwsGroup = new THREE.Group();
    vhsGroup.add(screwsGroup);

    const screwGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12);
    const screwPositions = [
      [-1.9, 1.0, -0.36],
      [1.9, 1.0, -0.36],
      [-1.9, -1.0, -0.36],
      [1.9, -1.0, -0.36],
      [0, 0.15, -0.36]
    ];
    screwPositions.forEach(pos => {
      const s = new THREE.Mesh(screwGeo, screwMat);
      s.position.set(pos[0], pos[1], pos[2]);
      s.rotation.x = Math.PI / 2;
      screwsGroup.add(s);
    });

    // 5. INTERACTIVE MOUSE PARALLAX
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      targetMouseX = x * 0.45;
      targetMouseY = y * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 6. SCROLL INTERPOLATION & ANIMATION LOOP
    let currentProgress = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Lerp mouse
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      // Read current scroll progress from DOM
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const totalDist = rect.height - window.innerHeight;
        const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, totalDist)));
        currentProgress += (progress - currentProgress) * 0.09;
        setScrollProgress(currentProgress);

        // Update active stage for callout cards
        if (currentProgress < 0.22) setActiveStage(0);
        else if (currentProgress < 0.50) setActiveStage(1);
        else if (currentProgress < 0.75) setActiveStage(2);
        else setActiveStage(3);
      }

      const p = currentProgress;

      // Exploded View Component Animations:
      // Front Shell pops forward
      frontShellGroup.position.z = p * 2.4;
      frontShellGroup.rotation.x = p * 0.15;

      // Front Door flips open & lifts
      frontDoorGroup.rotation.x = -p * Math.PI * 0.85;
      frontDoorGroup.position.y = -1.2 + p * 1.35;
      frontDoorGroup.position.z = p * 2.9;

      // Spools lift upwards and separate laterally
      leftSpoolGroup.position.y = 0.15 + p * 1.5;
      leftSpoolGroup.position.x = -1.05 - p * 0.85;
      leftSpoolGroup.position.z = -0.1 + p * 1.2;
      leftSpoolGroup.rotation.z += 0.006;

      rightSpoolGroup.position.y = 0.15 + p * 1.5;
      rightSpoolGroup.position.x = 1.05 + p * 0.85;
      rightSpoolGroup.position.z = -0.1 + p * 1.2;
      rightSpoolGroup.rotation.z += 0.008;

      // Internals expand
      internalsGroup.position.y = -p * 0.6;
      internalsGroup.position.z = p * 0.8;

      // Back Shell slides backward
      backShellGroup.position.z = -0.28 - p * 2.2;
      backShellGroup.rotation.x = -p * 0.12;

      // Screws blast out backward
      screwsGroup.position.z = -p * 3.8;

      // Base rotation of whole VHS model
      vhsGroup.rotation.x = 0.22 + p * 0.35 + mouseY;
      vhsGroup.rotation.y = -0.38 + p * 0.75 + mouseX;
      vhsGroup.position.y = 0.15 - p * 0.2;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // 7. RESIZE LISTENER
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

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
          padding: '2rem 1.5rem',
          boxSizing: 'border-box'
        }}
      >
        {/* 3D WebGL Canvas Layer */}
        <div 
          ref={canvasMountRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            cursor: 'grab'
          }}
        />

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

        {/* Dynamic Glassmorphism Storytelling Cards Overlay */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '560px',
          pointerEvents: 'none',
          marginBottom: '1rem'
        }}>
          {/* STAGE 0: CÁPSULA INTACTA */}
          <div style={{
            opacity: activeStage === 0 ? 1 : 0,
            transform: activeStage === 0 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            position: activeStage === 0 ? 'relative' : 'absolute',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.82)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '1.25rem 1.6rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              <Sparkles size={14} /> La Cápsula del Tiempo Familiar
            </div>
            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
              Guardadas por más de 30 años
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              En los 80s y 90s, bodas, navidades y primeros pasos quedaron atrapados en cinta magnética. Pero estas cintas fueron diseñadas para durar solo 15 a 20 años.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.78rem', color: '#fb923c', fontWeight: 700 }}>
              <span>Desliza para ver la apertura interior</span>
              <ArrowDown size={14} className="animate-bounce" />
            </div>
          </div>

          {/* STAGE 1: DESMAGNETIZACIÓN NATURAL */}
          <div style={{
            opacity: activeStage === 1 ? 1 : 0,
            transform: activeStage === 1 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            position: activeStage === 1 ? 'relative' : 'absolute',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(234, 88, 12, 0.35)',
            borderRadius: '20px',
            padding: '1.25rem 1.6rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.45)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={14} /> FASE 1: APERTURA FRONTAL
              </span>
              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 800 }}>
                -20% Señal / década
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#ffffff' }}>
              1. Desmagnetización Inevitable de la Cinta
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.48 }}>
              Las diminutas partículas de óxido de hierro pierden su orientación magnética gradualmente. El video comienza a presentar estática, rayas blancas de distorsión ("dropout") y colores desvanecidos.
            </p>
          </div>

          {/* STAGE 2: SÍNDROME DE CINTA PEGAJOSA Y MOHO */}
          <div style={{
            opacity: activeStage === 2 ? 1 : 0,
            transform: activeStage === 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            position: activeStage === 2 ? 'relative' : 'absolute',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '20px',
            padding: '1.25rem 1.6rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.45)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Flame size={14} /> FASE 2: NÚCLEO Y BOBINAS
              </span>
              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontWeight: 800 }}>
                Peligro Crítico de Moho
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#ffffff' }}>
              2. Hidrólisis Química (Síndrome de Cinta Pegajosa)
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.48 }}>
              La humedad del aire descompone los polímeros aglutinantes de la cinta. Las capas se pegan entre sí y prolifera moho blanco microscópico que devora la emulsión. Al ponerla en una videocasetera común, la cinta se rompe.
            </p>
          </div>

          {/* STAGE 3: RESCATE 1:1 EN ESTUDIO PROFESIONAL */}
          <div style={{
            opacity: activeStage === 3 ? 1 : 0,
            transform: activeStage === 3 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            position: activeStage === 3 ? 'relative' : 'absolute',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '20px',
            padding: '1.25rem 1.6rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={14} /> FASE 3: DESPIECE TOTAL & SOLUCIÓN
              </span>
              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontWeight: 800 }}>
                Digitalización 1:1 en Estudio
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#ffffff' }}>
              3. Rescate Profesional en DigiMemories
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.48 }}>
              No arriesgues tus recuerdos en aparatos viejos que rayan la cinta. En nuestro laboratorio limpiamos las guías, estabilizamos la señal con TBC profesional y te entregamos tus videos en Full HD 1080p listos para celular, TV y USB.
            </p>
          </div>
        </div>

        {/* Bottom Timeline Indicator */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(12px)',
          padding: '0.5rem 1.25rem',
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
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isActive ? '#ea580c' : 'rgba(255, 255, 255, 0.2)',
                  boxShadow: isActive ? '0 0 10px #ea580c' : 'none',
                  transition: 'all 0.3s ease'
                }} />
                <span style={{
                  fontSize: '0.72rem',
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
  );
};

export default VhsExploded3D;
