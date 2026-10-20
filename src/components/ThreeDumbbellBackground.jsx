import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, Eye, EyeOff } from "lucide-react";

export default function ThreeDumbbellBackground({ opacity = 0.42, interactive = true, showControls = false }) {
  const mountRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [intensity, setIntensity] = useState("normal"); // subtle, normal, cinematic

  const opacityMap = {
    subtle: 0.25,
    normal: 0.45,
    cinematic: 0.75,
  };

  const currentOpacity = opacityMap[intensity] || opacity;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    let isDisposed = false;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    // 2. Procedural Knurled Texture for Chrome Grip
    const createKnurlTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#64748b";
      ctx.fillRect(0, 0, 128, 128);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.5;
      for (let i = -128; i < 256; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 128, 128);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i + 128, 0);
        ctx.lineTo(i, 128);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 2);
      return tex;
    };

    const knurlTexture = createKnurlTexture();

    // 3. Materials
    const chromeBarMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.22,
    });

    const knurlGripMat = new THREE.MeshStandardMaterial({
      color: 0x718096,
      bumpMap: knurlTexture,
      bumpScale: 0.04,
      metalness: 0.92,
      roughness: 0.35,
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0f1522,
      metalness: 0.88,
      roughness: 0.32,
    });

    const cyanTrimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      metalness: 0.9,
      roughness: 0.15,
    });

    const glowingCollarMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      metalness: 0.95,
      roughness: 0.1,
    });

    // 4. Construct a Realistic Precision 3D Dumbbell
    const createDumbbell = (scale = 1.0) => {
      const dumbbell = new THREE.Group();

      // Center Handle Bar
      const barGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 32);
      barGeo.rotateZ(Math.PI / 2);
      const barMesh = new THREE.Mesh(barGeo, chromeBarMat);
      dumbbell.add(barMesh);

      // Knurled Center Grip
      const gripGeo = new THREE.CylinderGeometry(0.135, 0.135, 1.8, 32);
      gripGeo.rotateZ(Math.PI / 2);
      const gripMesh = new THREE.Mesh(gripGeo, knurlGripMat);
      dumbbell.add(gripMesh);

      // Dumbbell Plates (Left & Right Symmetric)
      const sides = [-1, 1];
      sides.forEach((side) => {
        // Inner Stopper Collar
        const collarGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 32);
        collarGeo.rotateZ(Math.PI / 2);
        const collarMesh = new THREE.Mesh(collarGeo, glowingCollarMat);
        collarMesh.position.x = side * 1.02;
        dumbbell.add(collarMesh);

        // Tier 1: Large Hex Plate
        const plate1Geo = new THREE.CylinderGeometry(1.08, 1.08, 0.32, 12);
        plate1Geo.rotateZ(Math.PI / 2);
        const plate1Mesh = new THREE.Mesh(plate1Geo, plateMat);
        plate1Mesh.position.x = side * 1.26;
        dumbbell.add(plate1Mesh);

        // Tier 1 Neon Bevel Trim Ring
        const trim1Geo = new THREE.TorusGeometry(1.08, 0.025, 16, 12);
        trim1Geo.rotateY(Math.PI / 2);
        const trim1Mesh = new THREE.Mesh(trim1Geo, cyanTrimMat);
        trim1Mesh.position.x = side * 1.26;
        dumbbell.add(trim1Mesh);

        // Tier 2: Mid Hex Plate
        const plate2Geo = new THREE.CylinderGeometry(0.92, 0.92, 0.28, 12);
        plate2Geo.rotateZ(Math.PI / 2);
        const plate2Mesh = new THREE.Mesh(plate2Geo, plateMat);
        plate2Mesh.position.x = side * 1.58;
        dumbbell.add(plate2Mesh);

        // Tier 3: Outer Hex Plate
        const plate3Geo = new THREE.CylinderGeometry(0.78, 0.78, 0.24, 12);
        plate3Geo.rotateZ(Math.PI / 2);
        const plate3Mesh = new THREE.Mesh(plate3Geo, plateMat);
        plate3Mesh.position.x = side * 1.86;
        dumbbell.add(plate3Mesh);

        // Outer Metallic Lock Cap / Hub
        const capGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.14, 32);
        capGeo.rotateZ(Math.PI / 2);
        const capMesh = new THREE.Mesh(capGeo, chromeBarMat);
        capMesh.position.x = side * 2.02;
        dumbbell.add(capMesh);

        // Cap Accent Ring (Glowing cyan)
        const capRingGeo = new THREE.TorusGeometry(0.38, 0.02, 16, 32);
        capRingGeo.rotateY(Math.PI / 2);
        const capRing = new THREE.Mesh(capRingGeo, cyanTrimMat);
        capRing.position.x = side * 2.02;
        dumbbell.add(capRing);
      });

      dumbbell.scale.set(scale, scale, scale);
      return dumbbell;
    };

    // 5. Primary Hero Dumbbell (Positioned elegantly in right/background)
    const heroDumbbell = createDumbbell(1.15);
    heroDumbbell.position.set(3.4, 0.4, 0);
    heroDumbbell.rotation.set(0.4, -0.6, 0.35);
    scene.add(heroDumbbell);

    // 6. Secondary Depth Dumbbell (Offset deeper in space for 3D depth)
    const depthDumbbell = createDumbbell(0.75);
    depthDumbbell.position.set(-4.2, -1.8, -3.5);
    depthDumbbell.rotation.set(-0.5, 0.8, -0.6);
    scene.add(depthDumbbell);

    // 7. Floating 3D Chalk / Energy Embers
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 18;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      particleSpeeds[i] = 0.003 + Math.random() * 0.008;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x070c1a, 1.4);
    scene.add(ambientLight);

    // Electric Cyan Key Light
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 3.4);
    keyLight.position.set(6, 7, 6);
    scene.add(keyLight);

    // Royal Blue Rim Light (Edge Highlights)
    const rimLight = new THREE.DirectionalLight(0x2563eb, 3.8);
    rimLight.position.set(-6, -4, -4);
    scene.add(rimLight);

    // Ice Cyan Top Fill
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 1.6);
    fillLight.position.set(0, 8, 2);
    scene.add(fillLight);

    // Orbiting Pulsing Glow Light
    const pulsePointLight = new THREE.PointLight(0x00f0ff, 3.5, 12);
    pulsePointLight.position.set(3.4, 1.2, 2.5);
    scene.add(pulsePointLight);

    // 9. Mouse Parallax Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e) => {
      if (!interactive) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = nx * 0.35;
      mouseY = ny * 0.25;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 10. Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // 11. Render Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth Lerp Mouse Parallax
      targetRotX += (mouseY - targetRotX) * 0.04;
      targetRotY += (mouseX - targetRotY) * 0.04;

      // Primary Dumbbell Floating & Rotation
      heroDumbbell.rotation.y = elapsedTime * 0.18 + targetRotY;
      heroDumbbell.rotation.x = Math.sin(elapsedTime * 0.6) * 0.12 + 0.4 + targetRotX;
      heroDumbbell.rotation.z = Math.cos(elapsedTime * 0.4) * 0.08 + 0.35;
      heroDumbbell.position.y = 0.4 + Math.sin(elapsedTime * 0.8) * 0.22;

      // Secondary Dumbbell Floating & Counter Rotation
      depthDumbbell.rotation.y = -elapsedTime * 0.12 - targetRotY * 0.5;
      depthDumbbell.rotation.x = Math.cos(elapsedTime * 0.5) * 0.1 - 0.5;
      depthDumbbell.position.y = -1.8 + Math.cos(elapsedTime * 0.7) * 0.18;

      // Pulse Point Light orbit
      pulsePointLight.position.x = 3.4 + Math.cos(elapsedTime * 0.9) * 1.8;
      pulsePointLight.position.y = 0.4 + Math.sin(elapsedTime * 1.2) * 1.4;

      // Drift Particles Upward
      const positions = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i];
        if (positions[i * 3 + 1] > 6) {
          positions[i * 3 + 1] = -6;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;
      particles.rotation.y = elapsedTime * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      isDisposed = true;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      renderer.dispose();
      knurlTexture.dispose();
      chromeBarMat.dispose();
      knurlGripMat.dispose();
      plateMat.dispose();
      cyanTrimMat.dispose();
      glowingCollarMat.dispose();
      particleMat.dispose();
      particleGeo.dispose();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [interactive]);

  return (
    <>
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={mountRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: visible ? currentOpacity : 0,
          transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      />

      {/* Atmospheric Vignette & Color Grade Overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 75% 35%, rgba(14, 28, 54, 0.28) 0%, rgba(7, 10, 20, 0.75) 60%, rgba(4, 6, 14, 0.92) 100%)",
        }}
      />

      {/* Subtle 3D Ambiance Intensity Control Pill (Shown only when enabled) */}
      {showControls && (
        <div
          className="three-bg-control-pill"
          style={{
            position: "fixed",
            bottom: "16px",
            left: "20px",
            zIndex: 45,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            background: "rgba(14, 20, 36, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(85, 231, 255, 0.2)",
            borderRadius: "999px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.75)",
            userSelect: "none",
          }}
        >
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="flex items-center gap-1.5 hover:text-cyan transition-colors cursor-pointer bg-transparent border-none text-inherit p-0"
            title={visible ? "Hide 3D Dumbbell Background" : "Show 3D Dumbbell Background"}
          >
            {visible ? <Eye size={13} className="text-cyan" /> : <EyeOff size={13} />}
            <span className="font-semibold text-white">3D Dumbbell FX</span>
          </button>

          {visible && (
            <div className="flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
              {["subtle", "normal", "cinematic"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setIntensity(mode)}
                  className="cursor-pointer border-none px-1.5 py-0.5 rounded text-2xs transition-all uppercase font-bold"
                  style={{
                    background: intensity === mode ? "rgba(56, 189, 248, 0.25)" : "transparent",
                    color: intensity === mode ? "#55e7ff" : "rgba(255, 255, 255, 0.45)",
                    border: intensity === mode ? "1px solid rgba(85, 231, 255, 0.4)" : "1px solid transparent",
                  }}
                >
                  {mode === "cinematic" ? "Pro" : mode}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
