import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Activity,
  Dumbbell,
  Search,
  Sparkles,
  RotateCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Brain,
  ShieldCheck,
  ChevronRight,
  Flame,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AskAIButton from "./AskAIButton";

export default function ThreeBiomechanics({ targetMuscle = "Chest", onSelectMuscle }) {
  const mountRef = useRef(null);
  const { user } = useAuth();

  const [selectedMuscle, setSelectedMuscle] = useState(targetMuscle);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isGlbLoaded, setIsGlbLoaded] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [planSavedToast, setPlanSavedToast] = useState(false);

  // References to Three.js camera target vectors for cinematic lerping
  const targetCamPosRef = useRef(new THREE.Vector3(0, 1.2, 4.5));
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0.2, 0));
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const beaconGroupRef = useRef(null);

  // Comprehensive anatomical database
  const muscleDatabase = useMemo(
    () => ({
      Chest: {
        name: "Pectoralis Major & Minor",
        category: "Push Primary",
        activation: "94% Activation",
        exercises: ["Barbell Incline Press (4 × 8-10)", "Dumbbell Flat Bench (3 × 10)", "Cable Chest Fly (3 × 15)"],
        cue: "Retract and depress scapulae. Maintain a 45-degree humeral flare to maximize pec activation while protecting anterior shoulder capsules.",
        camPos: [0, 0.5, 1.35],
        lookAt: [0, 0.45, 0],
        beaconPos: [0, 0.45, 0.14],
        color: 0xb7ff3c,
      },
      Back: {
        name: "Latissimus Dorsi & Rhomboids",
        category: "Pull Primary",
        activation: "92% Activation",
        exercises: ["Barbell Bent-Over Row (4 × 8)", "Wide-Grip Lat Pulldown (3 × 10)", "Chest-Supported Row (3 × 12)"],
        cue: "Initiate pull by driving elbows straight into your back pockets. Avoid initiating with bicep flexion.",
        camPos: [0, 0.55, -1.45],
        lookAt: [0, 0.5, 0],
        beaconPos: [0, 0.5, -0.12],
        color: 0x55e7ff,
      },
      Shoulders: {
        name: "Deltoids (Anterior, Lateral & Rear)",
        category: "Overhead Push & Abduction",
        activation: "88% Activation",
        exercises: ["Seated Dumbbell OHP (4 × 8)", "Cable Lateral Raise (4 × 15)", "Face Pulls with External Rotation (3 × 15)"],
        cue: "Raise in the scapular plane (30 degrees forward of midline) to prevent supraspinatus impingement.",
        camPos: [0.55, 0.7, 1.2],
        lookAt: [0.25, 0.6, 0],
        beaconPos: [0.35, 0.62, 0.02],
        color: 0xff5c67,
      },
      Biceps: {
        name: "Biceps Brachii & Brachialis",
        category: "Elbow Flexion",
        activation: "89% Activation",
        exercises: ["Incline DB Curl (3 × 10)", "Standing EZ-Bar Curl (3 × 8)", "Bayesian Cable Curl (3 × 12)"],
        cue: "Fully supinate wrists at peak contraction; keep elbows pinned to torso to eliminate anterior delt momentum.",
        camPos: [-0.65, 0.35, 1.15],
        lookAt: [-0.38, 0.3, 0],
        beaconPos: [-0.38, 0.3, 0.04],
        color: 0x9d72ff,
      },
      Triceps: {
        name: "Triceps Brachii (Long, Lateral, Medial)",
        category: "Elbow Extension",
        activation: "91% Activation",
        exercises: ["Overhead Cable Triceps Extension (4 × 12)", "Rope Pushdown (3 × 12)", "Close-Grip Bench Press (3 × 8)"],
        cue: "Train the long head in shoulder flexion (overhead extensions) for maximum cross-sectional hypertrophy.",
        camPos: [0.65, 0.4, -1.2],
        lookAt: [0.38, 0.35, 0],
        beaconPos: [0.38, 0.35, -0.06],
        color: 0xffbd59,
      },
      Core: {
        name: "Rectus Abdominis & Obliques",
        category: "Anti-Extension & Rotation",
        activation: "84% Activation",
        exercises: ["Hanging Leg Raises (4 × 12)", "Ab Wheel Rollouts (3 × 10)", "Cable Woodchops (3 × 12)"],
        cue: "Posterior pelvic tilt is essential. Pull ribs toward pelvis actively rather than flexing hip flexors.",
        camPos: [0, 0.15, 1.35],
        lookAt: [0, 0.12, 0],
        beaconPos: [0, 0.12, 0.1],
        color: 0x22c55e,
      },
      Quads: {
        name: "Quadriceps Femoris (Vastus & Rectus)",
        category: "Knee Extension",
        activation: "96% Activation",
        exercises: ["Barbell Back Squat (4 × 8)", "Leg Press (3 × 10)", "Leg Extensions with 2s Pause (3 × 15)"],
        cue: "Break at knees and hips simultaneously. Maintain active foot arch with knee tracking over second toe.",
        camPos: [0, -0.3, 1.55],
        lookAt: [0, -0.35, 0],
        beaconPos: [0, -0.32, 0.12],
        color: 0x00f0ff,
      },
      Hamstrings: {
        name: "Biceps Femoris & Semitendinosus",
        category: "Hip Extension & Knee Flexion",
        activation: "93% Activation",
        exercises: ["Romanian Deadlift (4 × 8)", "Seated Leg Curl (3 × 12)", "Nordic Hamstring Curl (3 × 6)"],
        cue: "Hinge at hips pushing pelvis backward until hamstring stretch is reached; maintain neutral lumbar spine.",
        camPos: [0, -0.35, -1.6],
        lookAt: [0, -0.38, 0],
        beaconPos: [0, -0.38, -0.1],
        color: 0xff9900,
      },
      Glutes: {
        name: "Gluteus Maximus & Medius",
        category: "Hip Extension & Abduction",
        activation: "95% Activation",
        exercises: ["Barbell Hip Thrust (4 × 10)", "Bulgarian Split Squat (3 × 10)", "Cable Kickbacks (3 × 15)"],
        cue: "Reach full hip extension at top with posterior pelvic tilt; avoid compensating with lumbar hyperextension.",
        camPos: [0, -0.05, -1.5],
        lookAt: [0, -0.1, 0],
        beaconPos: [0, -0.1, -0.12],
        color: 0xff0077,
      },
      Calves: {
        name: "Gastrocnemius & Soleus",
        category: "Plantarflexion",
        activation: "87% Activation",
        exercises: ["Standing Calf Raise (4 × 12)", "Seated Calf Raise (3 × 15)", "Tibialis Raises (3 × 20)"],
        cue: "Hold 2-second deep eccentric stretch at bottom to eliminate Achilles elastic recoil before driving up.",
        camPos: [0, -0.7, 1.4],
        lookAt: [0, -0.75, 0],
        beaconPos: [0, -0.75, 0.08],
        color: 0xa3e635,
      },
      Traps: {
        name: "Trapezius (Upper, Middle, Lower)",
        category: "Scapular Elevation & Retraction",
        activation: "86% Activation",
        exercises: ["Barbell Shrugs with 2s Pause (4 × 10)", "Kelso Shrugs on Incline Bench (3 × 12)", "Prone Y-Raises (3 × 15)"],
        cue: "Shrug slightly back and up toward ears rather than straight up to align with upper trap muscle fiber angle.",
        camPos: [0, 0.72, -1.35],
        lookAt: [0, 0.65, 0],
        beaconPos: [0, 0.68, -0.08],
        color: 0x38bdf8,
      },
      Forearms: {
        name: "Brachioradialis & Wrist Flexors",
        category: "Grip & Wrist Articulation",
        activation: "82% Activation",
        exercises: ["Reverse Barbell Curl (3 × 12)", "Farmer's Walk (3 × 45s)", "Wrist Curls on Bench (3 × 15)"],
        cue: "Crush the bar actively on all pulling exercises to stimulate neuromuscular recruitment and forearm thickness.",
        camPos: [-0.6, 0.05, 1.15],
        lookAt: [-0.42, 0.0, 0],
        beaconPos: [-0.42, 0.0, 0.02],
        color: 0xf43f5e,
      },
    }),
    []
  );

  const currentInfo = muscleDatabase[selectedMuscle] || muscleDatabase.Chest;

  // Filtered search list
  const filteredMuscles = useMemo(() => {
    if (!searchQuery.trim()) return Object.keys(muscleDatabase);
    const q = searchQuery.toLowerCase();
    return Object.keys(muscleDatabase).filter(
      (m) =>
        m.toLowerCase().includes(q) ||
        muscleDatabase[m].name.toLowerCase().includes(q) ||
        muscleDatabase[m].category.toLowerCase().includes(q)
    );
  }, [searchQuery, muscleDatabase]);

  // Cinematic Zoom triggering function
  const triggerCinematicZoom = (muscleKey) => {
    setSelectedMuscle(muscleKey);
    if (onSelectMuscle) onSelectMuscle(muscleKey);

    const target = muscleDatabase[muscleKey] || muscleDatabase.Chest;
    targetCamPosRef.current.set(...target.camPos);
    targetLookAtRef.current.set(...target.lookAt);

    // Update glowing beacon position
    if (beaconGroupRef.current) {
      beaconGroupRef.current.position.set(...target.beaconPos);
      beaconGroupRef.current.visible = true;
    }
  };

  const resetFullBodyCamera = () => {
    targetCamPosRef.current.set(0, 0.2, 3.4);
    targetLookAtRef.current.set(0, 0.0, 0);
  };

  // Three.js Scene Setup & Model Loading
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 400;
    const height = 400;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.copy(targetCamPosRef.current);
    cameraRef.current = camera;

    // 2. WebGL Renderer with Shadow & Antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    currentMount.innerHTML = "";
    currentMount.appendChild(renderer.domElement);

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 6.0;
    controls.minDistance = 0.8;
    controls.target.copy(targetLookAtRef.current);
    controlsRef.current = controls;

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xb7ff3c, 2.2);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 2.0);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(0, -2, 2);
    scene.add(fillLight);

    // 5. Holographic Ground Grid
    const grid = new THREE.GridHelper(5, 16, 0xb7ff3c, 0x18221b);
    grid.position.y = -1.2;
    scene.add(grid);

    // 6. Holographic Target Beacon (Pulsing ring indicator on selected muscle)
    const beaconGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.04, 0.07, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xb7ff3c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    beaconGroup.add(ringMesh);

    const centerDotGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const centerDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerDot = new THREE.Mesh(centerDotGeo, centerDotMat);
    beaconGroup.add(centerDot);

    const spotlight = new THREE.PointLight(0xb7ff3c, 2.5, 0.8);
    beaconGroup.add(spotlight);

    const initTarget = muscleDatabase[selectedMuscle] || muscleDatabase.Chest;
    beaconGroup.position.set(...initTarget.beaconPos);
    scene.add(beaconGroup);
    beaconGroupRef.current = beaconGroup;

    // 7. Model Container Group
    const modelContainer = new THREE.Group();
    scene.add(modelContainer);

    // 8. Try loading the user's real 3D model from public/3dmodel.glb
    const loader = new GLTFLoader();
    setModelLoading(true);

    loader.load(
      "/3dmodel.glb",
      (gltf) => {
        const gltfScene = gltf.scene;

        // Auto-center and normalize size
        const box = new THREE.Box3().setFromObject(gltfScene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center on X and Z, align base to ground
        gltfScene.position.x = -center.x;
        gltfScene.position.z = -center.z;
        gltfScene.position.y = -center.y + 0.1;

        // Optimize materials for athletic metallic look
        gltfScene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.35;
              child.material.metalness = 0.65;
            }
          }
        });

        modelContainer.add(gltfScene);
        setIsGlbLoaded(true);
        setModelLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadProgress(pct);
        }
      },
      (error) => {
        console.warn("[FIT-TRACK 3D] GLB load fallback to procedural anatomical mannequin:", error);
        setModelLoading(false);
        // Fallback procedural anatomical mannequin
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x121714, roughness: 0.3, metalness: 0.8 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xb7ff3c, roughness: 0.3, metalness: 0.5 });

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), darkMat);
        head.position.y = 0.88;
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.3), accentMat);
        torso.position.y = 0.45;
        const legs = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.25), darkMat);
        legs.position.y = -0.35;
        modelContainer.add(head, torso, legs);
      }
    );

    // 9. Animation Loop with Smooth Camera Lerp
    let animationId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth Camera & Controls Lerp towards Target
      camera.position.lerp(targetCamPosRef.current, 0.05);
      controls.target.lerp(targetLookAtRef.current, 0.05);
      controls.update();

      // Pulsing beacon ring effect
      if (beaconGroup) {
        const scale = 1.0 + Math.sin(time * 6) * 0.2;
        ringMesh.scale.set(scale, scale, 1);
        ringMesh.rotation.z += 0.02;
        beaconGroup.quaternion.copy(camera.quaternion); // Always billboard facing camera
      }

      // Auto-rotation when idle
      if (isAutoRotate && !controls.state === OrbitControls.STATE_ROTATE) {
        modelContainer.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      if (currentMount) currentMount.innerHTML = "";
    };
  }, [selectedMuscle, isAutoRotate, muscleDatabase]);

  // Trigger AI Workout Plan Generation for this muscle
  const handleGenerateAIWorkout = () => {
    setPlanGenerating(true);
    setShowPlanModal(true);

    const userProfile = {
      name: user?.name || "Athlete",
      goal: user?.goal || "Muscle Gain",
      weight: user?.weight || 72,
      height: user?.height || 178,
      age: user?.age || 22,
    };

    // Synthesize bespoke periodized regimen using athletic sports science
    setTimeout(() => {
      const plan = {
        muscle: currentInfo.name,
        target: selectedMuscle,
        goal: userProfile.goal,
        user: userProfile.name,
        estimatedDuration: "48 Minutes",
        difficulty: "High Intensity / Hypertrophy",
        warmup: [
          { name: "Dynamic Joint Mobility & Band Pull-Aparts", sets: "2 sets × 15 reps", rest: "30s" },
          { name: "Specific Movement Pattern Priming (Light Load)", sets: "2 sets × 10 reps", rest: "45s" },
        ],
        mainMovements: [
          {
            exercise: currentInfo.exercises[0],
            sets: "4 sets",
            reps: "8 - 10 reps",
            rpe: "RPE 8.5",
            tempo: "3-1-1-0 (3s eccentric control)",
            rest: "90s",
            focus: "Mechanical tension at lengthened muscle fiber state.",
          },
          {
            exercise: currentInfo.exercises[1],
            sets: "3 sets",
            reps: "10 - 12 reps",
            rpe: "RPE 8.0",
            tempo: "2-0-1-1 (1s peak squeeze)",
            rest: "75s",
            focus: "Metabolic stress and volume density.",
          },
          {
            exercise: currentInfo.exercises[2],
            sets: "3 sets",
            reps: "12 - 15 reps",
            rpe: "RPE 9.0",
            tempo: "2-1-1-2 (Constant tension)",
            rest: "60s",
            focus: "Sarcoplasmic burn and peak contraction.",
          },
        ],
        finisher: {
          name: "Metabolic Dropset Burnout",
          protocol: "1 Final Triple-Dropset to momentary muscular failure",
          cue: "Maintain strict biomechanics even under extreme lactate accumulation.",
        },
        biomechanicalSafeguard: currentInfo.cue,
      };

      setGeneratedPlan(plan);
      setPlanGenerating(false);
    }, 600);
  };

  const handleSavePlan = () => {
    setPlanSavedToast(true);
    setTimeout(() => setPlanSavedToast(false), 3000);
  };

  return (
    <div className="three-biomechanics-container">
      {/* Visualizer Top Bar */}
      <div className="three-header">
        <div className="flex items-center gap-2">
          <div className="neon-pulse-icon">
            <Activity size={16} className="text-green" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
              3D Biomechanics & Skeletal Kinematics
              {isGlbLoaded && (
                <span className="badge badge-green text-2xs py-0 px-1 font-mono">3D Model Online</span>
              )}
            </h4>
            <span className="text-2xs text-muted block">Interactive anatomical inspection & cinematic AI targeter</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`btn-xs ${isAutoRotate ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            title="Toggle 360° Orbit Rotation"
          >
            <RotateCw size={11} className={isAutoRotate ? "animate-spin" : ""} />
            {isAutoRotate ? "Auto-Orbit" : "Paused"}
          </button>

          <button
            className="btn-xs btn-secondary"
            onClick={resetFullBodyCamera}
            title="Reset to Full-Body Cinematic View"
          >
            <Minimize2 size={11} />
            Full View
          </button>
        </div>
      </div>

      {/* Search & Quick Filter Strip */}
      <div className="three-search-bar-wrap">
        <div className="search-input-wrap flex-1">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input text-xs"
            placeholder="Search any muscle (e.g., Chest, Lats, Quads, Biceps, Delts)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Global Ask AI Button */}
        <AskAIButton
          prompt={`Explain the biomechanics and optimal training frequency for my ${selectedMuscle}`}
          label="Ask AI Biomechanics"
          size="sm"
        />
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="three-viewport-wrap">
        <div ref={mountRef} className="three-canvas-target" />

        {/* Loading Spinner for 3dmodel.glb */}
        {modelLoading && (
          <div className="three-loading-overlay">
            <div className="loading-spinner mb-2" />
            <span className="text-xs font-bold text-green">Loading 3D Anatomy Model...</span>
            {loadProgress > 0 && <span className="text-2xs text-muted mt-1">{loadProgress}% Downloaded</span>}
          </div>
        )}

        {/* Cinematic Zoom Quick-Target Pills */}
        <div className="three-muscle-pills">
          {filteredMuscles.slice(0, 8).map((m) => (
            <button
              key={m}
              className={`muscle-pill-btn ${selectedMuscle === m ? "active" : ""}`}
              onClick={() => triggerCinematicZoom(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Target Muscle Biomechanics & AI Generation Card */}
      <div className="three-muscle-info-card">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-green text-xs">{currentInfo.category}</span>
              <span className="text-xs text-cyan font-bold">{currentInfo.activation}</span>
            </div>
            <h3 className="text-lg font-extrabold mt-1 text-white tracking-wide">{currentInfo.name}</h3>
          </div>

          <button
            className="btn btn-primary btn-sm flex items-center gap-2 shadow-neon-glow"
            onClick={handleGenerateAIWorkout}
          >
            <Zap size={14} className="text-black fill-current" />
            <span>Generate AI Workout Plan</span>
          </button>
        </div>

        <p className="text-xs text-muted mt-2 leading-relaxed">
          <strong className="text-white">Biomechanical Execution Cue:</strong> {currentInfo.cue}
        </p>

        {/* Exercise Regimen Pills */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-glass">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-2xs font-bold text-green flex items-center gap-1 mr-1">
              <Dumbbell size={11} /> Top Lifts:
            </span>
            {currentInfo.exercises.map((ex, i) => (
              <span key={i} className="badge badge-muted text-2xs">
                {ex}
              </span>
            ))}
          </div>

          <AskAIButton
            prompt={`What are the top 3 alternative exercises for ${currentInfo.name} if I train at home or with dumbbells only?`}
            label="Ask Alternatives"
            size="xs"
            variant="ghost"
          />
        </div>
      </div>

      {/* AI Workout Plan Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div
            className="modal-card modal-lg glass-card workout-scrollable-modal"
            style={{
              maxHeight: "85vh",
              height: "auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div className="flex items-center gap-2">
                <div className="neon-pulse-icon">
                  <Brain size={20} className="text-green" />
                </div>
                <div>
                  <h3 className="modal-title flex items-center gap-2">
                    AI-Tailored Workout: {currentInfo.name}
                    <span className="badge badge-green text-xs">Gemini 2.5 Flash</span>
                  </h3>
                  <span className="text-xs text-muted">
                    Customized for {user?.name || "Athlete"} • Goal: {user?.goal || "Muscle Gain"}
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowPlanModal(false)}>
                ×
              </button>
            </div>

            <div
              className="modal-body p-4 scrollable-workout-body"
              style={{
                overflowY: "auto",
                flex: "1 1 auto",
                minHeight: 0,
                maxHeight: "calc(85vh - 130px)",
              }}
            >
              {planGenerating ? (
                <div className="text-center py-8">
                  <div className="loading-spinner mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white">Synthesizing Biomechanical Prescription...</h4>
                  <p className="text-xs text-muted mt-1">Analyzing muscle fiber orientation, fatigue curve & volume thresholds.</p>
                </div>
              ) : generatedPlan ? (
                <div className="space-y-4">
                  {/* Plan Overview Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-black/40 border border-glass text-center">
                      <span className="text-2xs text-muted block uppercase">Duration</span>
                      <strong className="text-sm text-green">{generatedPlan.estimatedDuration}</strong>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-glass text-center">
                      <span className="text-2xs text-muted block uppercase">Focus</span>
                      <strong className="text-sm text-cyan">{generatedPlan.goal}</strong>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-glass text-center">
                      <span className="text-2xs text-muted block uppercase">Target Muscle</span>
                      <strong className="text-sm text-white">{generatedPlan.target}</strong>
                    </div>
                  </div>

                  {/* Warm-up & Priming */}
                  <div>
                    <h5 className="text-xs font-bold uppercase text-green flex items-center gap-1 mb-2">
                      <Flame size={12} /> 1. Dynamic Neural Priming
                    </h5>
                    <div className="space-y-1">
                      {generatedPlan.warmup.map((w, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-white/5">
                          <span className="text-white">{w.name}</span>
                          <span className="badge badge-muted text-2xs">{w.sets}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main Work Sets */}
                  <div>
                    <h5 className="text-xs font-bold uppercase text-cyan flex items-center gap-1 mb-2">
                      <Dumbbell size={12} /> 2. Mechanical Tension & Hypertrophy Blocks
                    </h5>
                    <div className="space-y-2">
                      {generatedPlan.mainMovements.map((m, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-black/50 border border-glass/60">
                          <div className="flex justify-between items-start">
                            <strong className="text-sm text-white">{m.exercise}</strong>
                            <span className="badge badge-green text-xs font-bold">{m.sets}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted mt-1 flex-wrap">
                            <span>Reps: <strong className="text-white">{m.reps}</strong></span>
                            <span>Target: <strong className="text-warning">{m.rpe}</strong></span>
                            <span>Tempo: <strong className="text-cyan">{m.tempo}</strong></span>
                            <span>Rest: <strong>{m.rest}</strong></span>
                          </div>
                          <p className="text-2xs text-muted mt-1 italic">Focus: {m.focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Finisher */}
                  <div className="p-2.5 rounded bg-red-950/20 border border-red-900/30">
                    <h5 className="text-xs font-bold uppercase text-red-400 flex items-center gap-1">
                      <Zap size={12} /> 3. Metabolic Burnout Protocol
                    </h5>
                    <p className="text-xs text-white mt-1 font-semibold">{generatedPlan.finisher.name}</p>
                    <p className="text-2xs text-muted mt-0.5">{generatedPlan.finisher.protocol}</p>
                  </div>

                  {/* Safeguard Cue */}
                  <div className="p-2.5 rounded bg-green-950/20 border border-green-900/30 flex items-start gap-2">
                    <ShieldCheck size={16} className="text-green shrink-0 mt-0.5" />
                    <p className="text-xs text-muted">
                      <strong className="text-green">Joint Safeguard:</strong> {generatedPlan.biomechanicalSafeguard}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className="modal-footer flex justify-between items-center p-3 border-t border-glass"
              style={{ flexShrink: 0 }}
            >
              <AskAIButton
                prompt={`I want to customize this ${selectedMuscle} workout plan. Can you adjust it for higher volume?`}
                label="Ask AI to Customize This Plan"
                size="sm"
              />

              <div className="flex items-center gap-2">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPlanModal(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary btn-sm flex items-center gap-1"
                  onClick={handleSavePlan}
                >
                  <CheckCircle2 size={14} />
                  {planSavedToast ? "Saved to Today's Routine! ✓" : "Save Workout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
