import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { Heart, Sparkles, Move, Eye, Smile, ShieldAlert, Moon, Activity, Zap, Volume2, VolumeX, Maximize2, Minimize2, Settings2, MousePointer2, Keyboard } from 'lucide-react';
import { PetConfig, PetAnimationState } from '../types';
import { LewisSprite } from './LewisDefaultSprites';
import { petSound } from '../utils/audioSynth';

interface HeartParticle {
  id: string;
  x: number;
  y: number;
  scale: number;
  color: string;
}

interface DesktopPetProps {
  config: PetConfig;
  onUpdateConfig: (updater: (prev: PetConfig) => PetConfig) => void;
  onOpenStudio: () => void;
  isSpeaking?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onTriggerAutopilot?: (action: 'chess' | 'piano' | 'tasks' | 'studio' | 'type_note') => void;
}

export const DesktopPet: React.FC<DesktopPetProps> = ({
  config,
  onUpdateConfig,
  onOpenStudio,
  isSpeaking = false,
  containerRef,
  onTriggerAutopilot,
}) => {
  const [currentState, setCurrentState] = useState<PetAnimationState>('idle');
  const [quote, setQuote] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [petCombo, setPetCombo] = useState(0);
  const [particles, setParticles] = useState<HeartParticle[]>([]);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);

  // Position motion values
  const posX = useMotionValue(120);
  const posY = useMotionValue(200);

  const wanderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const petResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mousePosRef = useRef({ x: 200, y: 200 });

  // Size pixel mapping
  const petSizePx = useMemo(() => {
    const base = config.size === 'sm' ? 70 : config.size === 'lg' ? 120 : 92;
    return Math.round(base * (config.customScale || 1.0));
  }, [config.size, config.customScale]);

  // Affection Level Titles
  const affectionLevelTitle = useMemo(() => {
    const pts = config.affectionLevel || 0;
    if (pts < 15) return { lvl: 1, name: "Director Imparcial", desc: "Autoritario y observador", color: "#94a3b8" };
    if (pts < 40) return { lvl: 2, name: "Mentor Protector", desc: "Tolerante y atento", color: "#60a5fa" };
    if (pts < 80) return { lvl: 3, name: "Guardián Devoto", desc: "Apegado y cariñoso", color: "#c084fc" };
    return { lvl: 4, name: "Compañero Incondicional", desc: "Completamente consentidor", color: "#f472b6" };
  }, [config.affectionLevel]);

  // Listen to global mouse movement for 'follow' behavior and zone detection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      if (config.behavior === 'follow' && !isDragging && config.enabled && !isSleeping) {
        let targetX = e.clientX - petSizePx / 2;
        let targetY = e.clientY - petSizePx / 2;

        if (config.screenMode === 'window' && containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          targetX = Math.max(0, Math.min(rect.width - petSizePx, e.clientX - rect.left - petSizePx / 2));
          targetY = Math.max(0, Math.min(rect.height - petSizePx, e.clientY - rect.top - petSizePx / 2));
        }

        const currX = posX.get();
        setFacingLeft(targetX < currX);
        setCurrentState('walk');

        animate(posX, targetX, { type: "spring", damping: 26, stiffness: 120, mass: 0.8 });
        animate(posY, targetY, { type: "spring", damping: 26, stiffness: 120, mass: 0.8 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [config.behavior, config.screenMode, config.enabled, isDragging, petSizePx, isSleeping]);

  // Autonomous Shimeji Wandering AI
  useEffect(() => {
    if (!config.enabled || config.behavior !== 'wander' || isDragging || isSleeping) {
      if (wanderTimerRef.current) clearTimeout(wanderTimerRef.current);
      return;
    }

    const planNextAction = () => {
      // Pick next interval
      const delay = Math.floor(Math.random() * 4000) + 3000;

      wanderTimerRef.current = setTimeout(() => {
        if (!config.enabled || isDragging || isSleeping) return;

        const roll = Math.random();

        if (roll < 0.65) {
          // Wander to random position
          let boundsW = window.innerWidth;
          let boundsH = window.innerHeight;

          if (config.screenMode === 'window' && containerRef?.current) {
            boundsW = containerRef.current.offsetWidth;
            boundsH = containerRef.current.offsetHeight;
          }

          const padding = 20;
          const newX = Math.max(padding, Math.min(boundsW - petSizePx - padding, Math.random() * (boundsW - petSizePx)));
          const newY = Math.max(padding, Math.min(boundsH - petSizePx - padding, Math.random() * (boundsH - petSizePx)));

          const currX = posX.get();
          setFacingLeft(newX < currX);
          setCurrentState('walk');

          const distance = Math.hypot(newX - currX, newY - posY.get());
          const duration = Math.max(1.2, distance / (110 * config.speed));

          animate(posX, newX, { duration, ease: "easeInOut" });
          animate(posY, newY, { 
            duration, 
            ease: "easeInOut",
            onComplete: () => {
              // Once reached, settle down
              const nextRoll = Math.random();
              if (nextRoll < 0.3) {
                setCurrentState('work');
                setQuote("Revisando los reportes del hospital...");
                setTimeout(() => setQuote(''), 3500);
              } else {
                setCurrentState('idle');
              }
            }
          });
        } else if (roll < 0.85) {
          // Stand and observe user
          setCurrentState('idle');
          const quotes = [
            "Te estoy vigilando, pequeña.",
            "Mantén la concentración en tus deberes.",
            "¿Estás tomando suficiente agua?",
            "Aquí estaré, observando cada uno de tus movimientos.",
            "Una postura impecable es fundamental.",
          ];
          setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
          setTimeout(() => setQuote(''), 3000);
        } else {
          // Quick medical work check
          setCurrentState('work');
        }

        planNextAction();
      }, delay);
    };

    planNextAction();

    return () => {
      if (wanderTimerRef.current) clearTimeout(wanderTimerRef.current);
    };
  }, [config.enabled, config.behavior, config.screenMode, config.speed, isDragging, petSizePx, isSleeping]);

  // Speaking state sync
  useEffect(() => {
    if (isSpeaking && !isDragging) {
      setCurrentState('talk');
    } else if (!isSpeaking && currentState === 'talk') {
      setCurrentState('idle');
    }
  }, [isSpeaking, isDragging]);

  // Trigger Petting Interaction
  const handlePet = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Sound effect
    if (config.soundEnabled) {
      petSound.playPurr(Math.min(petCombo, 5));
      petSound.playHeartPop();
    }

    // Burst of cute heart particles
    const clickX = e ? e.clientX : posX.get() + petSizePx / 2;
    const clickY = e ? e.clientY : posY.get() + petSizePx / 2;

    const newParticles: HeartParticle[] = Array.from({ length: 3 }).map((_, i) => ({
      id: Math.random().toString(36).substring(2, 9),
      x: clickX + (Math.random() * 40 - 20),
      y: clickY - 20 - i * 15,
      scale: Math.random() * 0.5 + 0.8,
      color: ['#ffb7ff', '#f472b6', '#fcd34d', '#b39ddb'][Math.floor(Math.random() * 4)],
    }));

    setParticles(prev => [...prev.slice(-12), ...newParticles]);

    // Clean up particles
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 1200);

    // Increase combo & affection
    setPetCombo(prev => prev + 1);
    onUpdateConfig(prev => ({
      ...prev,
      totalPets: (prev.totalPets || 0) + 1,
      affectionLevel: (prev.affectionLevel || 0) + 1,
    }));

    setCurrentState('pet');
    setIsSleeping(false);

    // Reset pet state back to idle after a moment
    if (petResetTimerRef.current) clearTimeout(petResetTimerRef.current);
    petResetTimerRef.current = setTimeout(() => {
      setCurrentState('idle');
      setPetCombo(0);
    }, 2800);

    // Contextual Dialogue based on affection & combo
    const pts = config.affectionLevel || 0;
    let quotes: string[] = [];

    if (petCombo >= 5) {
      quotes = [
        "¡Cielos, pequeña! Me vas a despeinar...",
        "Tanta insistencia solo demuestra lo mucho que me necesitas.",
        "¿Vas a pasar todo el día acariciándome? ...No me quejo.",
        "Hmph... eres incorregible, pero adorable.",
      ];
    } else if (pts < 15) {
      quotes = [
        "¿Qué pretendes tocándome así, pequeña?",
        "No me distraigas de mis deberes en el hospital.",
        "Hmph... eres una criatura muy curiosa.",
        "Compórtate y concéntrate en lo tuyo.",
        "Tus manos son cálidas... supongo.",
      ];
    } else if (pts < 50) {
      quotes = [
        "Está bien... admito que tus caricias son relajantes.",
        "Solo te permito esto a ti, recuérdalo bien.",
        "¿Buscabas atención? Ya la tienes toda.",
        "Eres muy persistente, tesoro.",
        "Descansa un poco a mi lado.",
      ];
    } else {
      quotes = [
        "Mi pequeña consentida... ven aquí.",
        "Siempre sabré cuidarte y protegerte.",
        "Me tienes a tu completa disposición, pequeña.",
        "Acaríciame todo lo que quieras, no iré a ningún lado.",
        "Eres mi mayor debilidad, ¿lo sabías?",
      ];
    }

    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    setTimeout(() => setQuote(''), 3600);
  };

  // Drag start & end
  const handleDragStart = () => {
    setIsDragging(true);
    setCurrentState('pout');
    if (config.soundEnabled) petSound.playPickup();
    setQuote("¡Oye! ¿A dónde crees que me llevas?");
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (config.soundEnabled) petSound.playDrop();

    const currY = posY.get();
    const isTop = currY < 120;
    const isBottom = currY > window.innerHeight - 200;

    if (isTop) {
      setQuote("Desde las alturas tengo la mejor vista del hospital.");
    } else if (isBottom) {
      setQuote("¿Aquí abajo? Vigilaré que no procrastines.");
    } else {
      setQuote("Pisé tierra firme otra vez. No vuelvas a levantarme sin avisar.");
    }

    setCurrentState('idle');
    setTimeout(() => setQuote(''), 3000);
  };

  if (!config.enabled) return null;

  const currentCustomImage = config.animations?.[currentState] || config.animations?.idle;

  return (
    <>
      {/* Floating Particles Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: p.x, y: p.y, scale: 0.5 }}
              animate={{ opacity: 0, y: p.y - 80, scale: p.scale, rotate: [0, -15, 15, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute pointer-events-none flex items-center gap-1 font-bold text-xs"
              style={{ color: p.color }}
            >
              <Heart size={16} fill={p.color} className="drop-shadow-md" />
              <span className="text-[10px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">+1</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mascot Companion Element */}
      <motion.div
        drag
        dragConstraints={config.screenMode === 'window' && containerRef ? containerRef : undefined}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handlePet}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowQuickMenu(prev => !prev);
        }}
        style={{
          x: posX,
          y: posY,
          width: petSizePx,
          height: petSizePx,
          position: config.screenMode === 'fullscreen' ? 'fixed' : 'absolute',
          zIndex: 9999,
        }}
        animate={{
          scaleX: facingLeft ? -1 : 1,
          scale: currentState === 'pet' ? 1.15 : isDragging ? 1.08 : [1, 1.03, 1],
          y: currentState === 'walk' ? [0, -6, 0] : 0,
        }}
        transition={{
          scale: { duration: 0.25 },
          y: currentState === 'walk' ? { repeat: Infinity, duration: 0.4 / config.speed, ease: "easeInOut" } : { duration: 0.2 },
        }}
        className="cursor-grab active:cursor-grabbing select-none group touch-none"
        title="Lewis (Haz clic para acariciar, arrastra para mover, clic derecho para menú)"
      >
        {/* Animated Speech Bubble */}
        <AnimatePresence>
          {quote && config.speechBubblesEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-16 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md text-[#ffb7ff] text-[11px] px-3.5 py-1.5 rounded-2xl border border-[#ffb7ff]/40 shadow-2xl whitespace-nowrap pointer-events-none font-medium tracking-tight flex items-center gap-1.5 z-30"
              style={{ scaleX: facingLeft ? -1 : 1 }} // Keep text readable when flipped
            >
              <Sparkles size={11} className="text-[#ffb7ff] shrink-0" />
              <span>{quote}</span>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/90 rotate-45 border-r border-b border-[#ffb7ff]/40"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Petting Hearts Burst on Lewis */}
        {currentState === 'pet' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.3, 1], rotate: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="absolute -top-3 -right-2 text-[#ffb7ff] z-20 pointer-events-none"
            style={{ scaleX: facingLeft ? -1 : 1 }}
          >
            <Heart size={20} fill="#ffb7ff" className="drop-shadow-lg" />
          </motion.div>
        )}

        {/* Lewis Sprite Model */}
        <LewisSprite
          state={currentState}
          customImage={currentCustomImage}
          isSpeaking={isSpeaking}
        />

        {/* Quick Interaction Badges on Hover */}
        <div 
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] text-white/80 whitespace-nowrap font-mono shadow-md z-20"
          style={{ transform: facingLeft ? 'scaleX(-1)' : 'none' }}
        >
          <Heart size={9} className="text-[#f472b6]" fill="#f472b6" />
          <span>{config.totalPets || 0} mimos</span>
        </div>
      </motion.div>

      {/* Floating Quick Action Dock (Visible when Right-Clicked or toggled) */}
      <AnimatePresence>
        {showQuickMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[10001] bg-[#14151a]/95 border border-[#ffb7ff]/30 p-3 rounded-2xl shadow-2xl backdrop-blur-xl w-64 max-w-[calc(100vw-24px)] text-white"
            style={{
              top: Math.min(window.innerHeight - 300, Math.max(20, posY.get() - 20)),
              left: Math.min(window.innerWidth - 270, Math.max(12, posX.get() + petSizePx + 15)),
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="font-bold text-xs text-white">Lewis Blackwood</span>
              </div>
              <button
                onClick={() => setShowQuickMenu(false)}
                className="text-white/40 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Affection Status */}
            <div className="bg-white/5 rounded-xl p-2 mb-3 border border-white/5">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="font-bold" style={{ color: affectionLevelTitle.color }}>
                  Nivel {affectionLevelTitle.lvl}: {affectionLevelTitle.name}
                </span>
                <span className="text-white/40">{config.affectionLevel || 0} pts</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#b39ddb] to-[#ffb7ff] transition-all duration-300"
                  style={{ width: `${Math.min(100, ((config.affectionLevel || 0) % 30) * 3.33)}%` }}
                />
              </div>
              <p className="text-[9px] text-white/50 mt-1 italic">{affectionLevelTitle.desc}</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-3">
              <button
                onClick={() => handlePet()}
                className="flex items-center gap-1.5 bg-[#ffb7ff]/10 hover:bg-[#ffb7ff]/20 text-[#ffb7ff] p-2 rounded-xl border border-[#ffb7ff]/20 transition-all font-medium"
              >
                <Heart size={13} fill="#ffb7ff" />
                <span>Acariciar</span>
              </button>

              <button
                onClick={() => {
                  onUpdateConfig(prev => ({
                    ...prev,
                    behavior: prev.behavior === 'wander' ? 'follow' : prev.behavior === 'follow' ? 'still' : 'wander',
                  }));
                }}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/90 p-2 rounded-xl border border-white/10 transition-all"
              >
                <Activity size={13} className="text-cyan-400" />
                <span className="capitalize">{config.behavior === 'wander' ? 'Libre' : config.behavior === 'follow' ? 'Seguir' : 'Fijo'}</span>
              </button>

              <button
                onClick={() => {
                  onUpdateConfig(prev => ({
                    ...prev,
                    screenMode: prev.screenMode === 'fullscreen' ? 'window' : 'fullscreen',
                  }));
                }}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/90 p-2 rounded-xl border border-white/10 transition-all"
              >
                {config.screenMode === 'fullscreen' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{config.screenMode === 'fullscreen' ? 'Al Chat' : 'Pantalla'}</span>
              </button>

              <button
                onClick={() => {
                  setIsSleeping(prev => !prev);
                  setCurrentState(!isSleeping ? 'sleep' : 'idle');
                  if (!isSleeping) setQuote("Me tomaré una siesta médica...");
                }}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/90 p-2 rounded-xl border border-white/10 transition-all"
              >
                <Moon size={13} className="text-purple-400" />
                <span>{isSleeping ? 'Despertar' : 'Dormir'}</span>
              </button>
            </div>

            {/* Autonomous Copilot Section (Use mouse and keyboard) */}
            <div className="pt-2 border-t border-white/10 mb-2.5">
              <div className="flex items-center justify-between text-[10px] text-white/60 mb-1.5">
                <span className="font-bold flex items-center gap-1 text-[#ffb7ff]">
                  <MousePointer2 size={11} />
                  Copiloto (Mouse/Teclado)
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${config.allowPeripheralControl ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                  {config.allowPeripheralControl ? 'Activo' : 'Sin permiso'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onTriggerAutopilot?.('chess');
                  }}
                  className="bg-white/5 hover:bg-[#ffb7ff]/20 p-1.5 rounded-lg text-left text-white/80 hover:text-white flex items-center gap-1 transition-all"
                >
                  <span>♟️ Jugar Ajedrez</span>
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onTriggerAutopilot?.('piano');
                  }}
                  className="bg-white/5 hover:bg-[#ffb7ff]/20 p-1.5 rounded-lg text-left text-white/80 hover:text-white flex items-center gap-1 transition-all"
                >
                  <span>🎹 Tocar Piano</span>
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onTriggerAutopilot?.('tasks');
                  }}
                  className="bg-white/5 hover:bg-[#ffb7ff]/20 p-1.5 rounded-lg text-left text-white/80 hover:text-white flex items-center gap-1 transition-all"
                >
                  <span>📋 Abrir Agenda</span>
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onTriggerAutopilot?.('type_note');
                  }}
                  className="bg-white/5 hover:bg-[#ffb7ff]/20 p-1.5 rounded-lg text-left text-white/80 hover:text-white flex items-center gap-1 transition-all"
                >
                  <span>✍️ Escribir Nota</span>
                </button>
              </div>
            </div>

            {/* Bottom button to Open Studio */}
            <button
              onClick={() => {
                setShowQuickMenu(false);
                onOpenStudio();
              }}
              className="w-full py-2 bg-gradient-to-r from-[#b39ddb] to-[#ffb7ff] text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-[#ffb7ff]/10 hover:opacity-95 transition-all"
            >
              <Settings2 size={14} />
              <span>Estudio de Animaciones</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
