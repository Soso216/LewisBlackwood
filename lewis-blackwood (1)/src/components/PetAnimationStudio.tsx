import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Upload, 
  Trash2, 
  Play, 
  Heart, 
  Activity, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Download, 
  RotateCcw, 
  Check, 
  Sliders, 
  Eye, 
  Moon, 
  MessageSquare,
  Smile,
  Shield,
  FileText
} from 'lucide-react';
import { PetConfig, PetAnimationState, PetAnimationSlot } from '../types';
import { LewisSprite } from './LewisDefaultSprites';
import { petSound } from '../utils/audioSynth';

interface PetAnimationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  config: PetConfig;
  onUpdateConfig: (updater: (prev: PetConfig) => PetConfig) => void;
}

const ANIMATION_SLOTS: PetAnimationSlot[] = [
  {
    id: 'idle',
    label: 'Reposo / En Guardia',
    description: 'Pose principal cuando Lewis está de pie observándote fijamente.',
    defaultIconName: 'Shield',
    samplePrompt: 'GIF o PNG de Lewis parado de brazos cruzados o con bata médica',
  },
  {
    id: 'walk',
    label: 'Caminata / Explorador',
    description: 'Animación cuando deambula libremente por tu pantalla.',
    defaultIconName: 'Activity',
    samplePrompt: 'GIF de Lewis caminando o flotando de lado a lado',
  },
  {
    id: 'pet',
    label: 'Acariciado / Mimos',
    description: 'Reacción tierna y sonrojada cuando le haces clics repetidos.',
    defaultIconName: 'Heart',
    samplePrompt: 'GIF/PNG de Lewis sonrojado, con ojos cerrados o corazones',
  },
  {
    id: 'talk',
    label: 'Hablando / Explicando',
    description: 'Animación cuando Lewis responde mensajes de voz o texto.',
    defaultIconName: 'MessageSquare',
    samplePrompt: 'GIF de Lewis gesticulando o moviendo los labios elegantemente',
  },
  {
    id: 'sleep',
    label: 'Durmiendo / Descanso',
    description: 'Pose cuando decides ponerlo a dormir o descansa en una esquina.',
    defaultIconName: 'Moon',
    samplePrompt: 'GIF/PNG de Lewis durmiendo plácidamente con una manta',
  },
  {
    id: 'pout',
    label: 'Molesto / Al Arrastrar',
    description: 'Reacción cuando lo levantas con el cursor o lo agitas.',
    defaultIconName: 'Smile',
    samplePrompt: 'GIF/PNG de Lewis colgando del cuello de su bata o haciendo puchero',
  },
  {
    id: 'work',
    label: 'Trabajando / Médico',
    description: 'Pose mientras revisa historiales clínicos o toma café amargo.',
    defaultIconName: 'FileText',
    samplePrompt: 'GIF/PNG de Lewis con tabla médica o taza de café',
  },
];

export const PetAnimationStudio: React.FC<PetAnimationStudioProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'animations' | 'behavior' | 'stats'>('animations');
  const [previewState, setPreviewState] = useState<PetAnimationState>('idle');
  const [previewPetting, setPreviewPetting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlotForUpload, setSelectedSlotForUpload] = useState<PetAnimationState | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slotId: PetAnimationState) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB per animation)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("El archivo es muy pesado. Usa GIFs o imágenes menores a 5MB.");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onUpdateConfig(prev => ({
        ...prev,
        animations: {
          ...prev.animations,
          [slotId]: result,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAnimation = (slotId: PetAnimationState) => {
    onUpdateConfig(prev => {
      const nextAnims = { ...prev.animations };
      delete nextAnims[slotId];
      return {
        ...prev,
        animations: nextAnims,
      };
    });
  };

  const handleExportConfig = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "lewis_mascota_animaciones.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch {
      setUploadError("Error al exportar la configuración.");
    }
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onUpdateConfig(() => parsed);
          setExportSuccess(true);
          setTimeout(() => setExportSuccess(false), 2500);
        }
      } catch {
        setUploadError("El archivo JSON de animaciones no tiene un formato válido.");
      }
    };
    reader.readAsText(file);
  };

  const testPetMannequin = () => {
    setPreviewPetting(true);
    setPreviewState('pet');
    if (config.soundEnabled) {
      petSound.playPurr(2);
      petSound.playHeartPop();
    }
    setTimeout(() => {
      setPreviewPetting(false);
      setPreviewState('idle');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[10002] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#121318] border border-[#ffb7ff]/30 w-full max-w-4xl rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(255,183,255,0.15)] flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#201830] via-[#1a1728] to-[#121318] border-b border-white/10 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ffb7ff]/10 border border-[#ffb7ff]/30 flex items-center justify-center text-[#ffb7ff] shadow-inner">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-base sm:text-lg flex items-center gap-2">
                ESTUDIO DE ANIMACIONES & MASCOTA
                <span className="text-[10px] bg-[#ffb7ff]/20 text-[#ffb7ff] px-2 py-0.5 rounded-full font-mono border border-[#ffb7ff]/30">
                  Lewis Shimeji
                </span>
              </h2>
              <p className="text-white/40 text-xs">Personaliza las animaciones de Lewis, su libertad de movimiento y caricias.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 bg-white/[0.02] px-4 pt-2 gap-2 text-xs overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('animations')}
            className={`pb-3 px-4 font-semibold transition-all relative shrink-0 ${
              activeTab === 'animations'
                ? 'text-[#ffb7ff] border-b-2 border-[#ffb7ff]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            🎬 Banco de Animaciones ({Object.keys(config.animations || {}).length}/7)
          </button>
          <button
            onClick={() => setActiveTab('behavior')}
            className={`pb-3 px-4 font-semibold transition-all relative shrink-0 ${
              activeTab === 'behavior'
                ? 'text-[#ffb7ff] border-b-2 border-[#ffb7ff]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            🕹️ Movimiento y Pantalla
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-3 px-4 font-semibold transition-all relative shrink-0 ${
              activeTab === 'stats'
                ? 'text-[#ffb7ff] border-b-2 border-[#ffb7ff]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            💖 Vínculo y Caricias ({config.totalPets || 0})
          </button>
        </div>

        {/* Studio Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
          {/* Main Controls by Tab (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl flex items-center justify-between">
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} className="text-red-300 hover:text-white">✕</button>
              </div>
            )}

            {exportSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <Check size={14} />
                <span>¡Operación realizada con éxito!</span>
              </div>
            )}

            {/* TAB 1: ANIMATION SLOTS */}
            {activeTab === 'animations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[#ffb7ff]/80 text-xs uppercase tracking-widest font-semibold">
                    Ranuras de Animación Disponibles:
                  </p>
                  <span className="text-[11px] text-white/40">Soporta PNG transparente, GIF animado y WebP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ANIMATION_SLOTS.map((slot) => {
                    const hasCustom = !!config.animations?.[slot.id];

                    return (
                      <div
                        key={slot.id}
                        onClick={() => setPreviewState(slot.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                          previewState === slot.id
                            ? 'bg-[#ffb7ff]/10 border-[#ffb7ff]/50 shadow-lg'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Mini Thumbnail */}
                          <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                            <LewisSprite
                              state={slot.id}
                              customImage={config.animations?.[slot.id]}
                              className="w-10 h-10"
                            />
                            {hasCustom && (
                              <span className="absolute bottom-0 right-0 bg-[#ffb7ff] text-black text-[8px] font-bold px-1 rounded-tl">
                                GIF
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white text-xs font-bold truncate">{slot.label}</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewState(slot.id);
                                }}
                                className="text-[10px] text-[#ffb7ff] hover:underline"
                              >
                                Probar
                              </button>
                            </div>
                            <p className="text-white/50 text-[10px] line-clamp-2 mt-0.5">{slot.description}</p>
                            
                            {/* Upload / Remove buttons */}
                            <div className="flex items-center gap-2 mt-2">
                              <label
                                onClick={(e) => e.stopPropagation()}
                                className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-[9px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium"
                              >
                                <Upload size={10} />
                                <span>{hasCustom ? 'Reemplazar' : 'Subir Animación'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, slot.id)}
                                />
                              </label>

                              {hasCustom && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAnimation(slot.id);
                                  }}
                                  className="text-red-400/60 hover:text-red-400 p-1 transition-colors"
                                  title="Volver al vector original"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: BEHAVIOR & SCREEN MODE */}
            {activeTab === 'behavior' && (
              <div className="space-y-5">
                {/* Main Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                  <div>
                    <h4 className="text-white text-sm font-bold">Mascota Activa en Pantalla</h4>
                    <p className="text-white/40 text-xs">Muestra a Lewis acompañándote mientras usas la app.</p>
                  </div>
                  <button
                    onClick={() => onUpdateConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      config.enabled
                        ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {config.enabled ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>

                {/* Roam Space (Fullscreen vs Window) */}
                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                  <h4 className="text-white text-sm font-bold flex items-center gap-2">
                    <Maximize2 size={16} className="text-[#ffb7ff]" />
                    Libertad de Movimiento en Pantalla
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onUpdateConfig(prev => ({ ...prev, screenMode: 'fullscreen' }))}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        config.screenMode === 'fullscreen'
                          ? 'bg-[#ffb7ff]/15 border-[#ffb7ff] text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xs font-bold block text-[#ffb7ff]">🌍 Toda la Pantalla</span>
                      <span className="text-[10px] text-white/50 block mt-1">
                        Lewis puede flotar, caminar y pasear libremente por cualquier parte de tu pantalla.
                      </span>
                    </button>

                    <button
                      onClick={() => onUpdateConfig(prev => ({ ...prev, screenMode: 'window' }))}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        config.screenMode === 'window'
                          ? 'bg-[#ffb7ff]/15 border-[#ffb7ff] text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xs font-bold block text-[#b39ddb]">💬 Dentro del Chat</span>
                      <span className="text-[10px] text-white/50 block mt-1">
                        Lewis se mantiene confinado dentro de la ventana de conversación.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Movement Behavior Mode */}
                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                  <h4 className="text-white text-sm font-bold flex items-center gap-2">
                    <Activity size={16} className="text-cyan-400" />
                    Comportamiento Autónomo
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'wander', name: 'Explorador Libre', desc: 'Deambula, camina y descansa a su ritmo.' },
                      { id: 'follow', name: 'Seguir Cursor', desc: 'Sigue suavemente la posición de tu ratón.' },
                      { id: 'still', name: 'Centinela Fijo', desc: 'Se queda inmóvil donde lo dejes.' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onUpdateConfig(prev => ({ ...prev, behavior: b.id as any }))}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          config.behavior === b.id
                            ? 'bg-white/15 border-white/40 text-white'
                            : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-bold block text-white text-[11px]">{b.name}</span>
                        <span className="text-[9px] text-white/40 block mt-0.5">{b.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size & Speed Sliders */}
                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80 font-medium">Tamaño de Lewis:</span>
                      <span className="text-[#ffb7ff] font-mono">{Math.round((config.customScale || 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.8"
                      step="0.05"
                      value={config.customScale || 1.0}
                      onChange={(e) => onUpdateConfig(prev => ({ ...prev, customScale: parseFloat(e.target.value) }))}
                      className="w-full accent-[#ffb7ff] bg-white/10 h-1.5 rounded-full cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80 font-medium">Velocidad de Movimiento:</span>
                      <span className="text-[#ffb7ff] font-mono">{config.speed || 1}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={config.speed || 1.0}
                      onChange={(e) => onUpdateConfig(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                      className="w-full accent-[#ffb7ff] bg-white/10 h-1.5 rounded-full cursor-pointer"
                    />
                  </div>
                </div>

                {/* Audio & Speech Bubbles */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onUpdateConfig(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                      config.soundEnabled ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {config.soundEnabled ? <Volume2 size={16} className="text-[#ffb7ff]" /> : <VolumeX size={16} />}
                      <span>Efectos de Sonido</span>
                    </div>
                    <span className="text-[10px] font-bold">{config.soundEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={() => onUpdateConfig(prev => ({ ...prev, speechBubblesEnabled: !prev.speechBubblesEnabled }))}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                      config.speechBubblesEnabled ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-[#ffb7ff]" />
                      <span>Burbujas de Diálogo</span>
                    </div>
                    <span className="text-[10px] font-bold">{config.speechBubblesEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: STATS & BACKUP */}
            {activeTab === 'stats' && (
              <div className="space-y-5">
                <div className="p-5 bg-gradient-to-br from-[#2a1b38] to-[#121318] rounded-2xl border border-[#ffb7ff]/30 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#ffb7ff]/20 mx-auto flex items-center justify-center text-[#ffb7ff]">
                    <Heart size={32} fill="#ffb7ff" className="animate-pulse" />
                  </div>
                  <h3 className="text-white text-lg font-bold">Vínculo con Lewis Blackwood</h3>
                  <p className="text-white/60 text-xs max-w-md mx-auto">
                    Cada vez que haces clic sobre él o lo acaricias en pantalla, aumentas su nivel de confianza y desbloqueas diálogos más cercanos y dóciles.
                  </p>
                  <div className="flex justify-center gap-8 py-2">
                    <div>
                      <span className="text-2xl font-black text-[#ffb7ff]">{config.totalPets || 0}</span>
                      <span className="text-[10px] text-white/40 block uppercase tracking-wider">Total de Caricias</span>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-[#b39ddb]">{config.affectionLevel || 0}</span>
                      <span className="text-[10px] text-white/40 block uppercase tracking-wider">Puntos de Afecto</span>
                    </div>
                  </div>
                </div>

                {/* Import / Export Animation Pack */}
                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                  <h4 className="text-white text-xs font-bold uppercase tracking-widest text-[#ffb7ff]">
                    Respaldar / Compartir Pack de Animaciones
                  </h4>
                  <p className="text-white/50 text-xs">
                    Guarda todas tus animaciones y configuraciones en un archivo JSON o carga un pack externo con un clic.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleExportConfig}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      <Download size={14} />
                      <span>Descargar Pack (.json)</span>
                    </button>

                    <label className="flex-1 bg-[#ffb7ff]/20 hover:bg-[#ffb7ff]/30 text-[#ffb7ff] text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-medium cursor-pointer">
                      <Upload size={14} />
                      <span>Importar Pack</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={importInputRef}
                        onChange={handleImportConfig}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Interactive Preview Mannequin (4 Cols) */}
          <div className="lg:col-span-4 bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between min-h-[320px]">
            <div className="w-full flex justify-between items-center text-[10px] text-white/40 uppercase tracking-widest font-bold">
              <span>Probador en Vivo</span>
              <span className="text-[#ffb7ff]">{previewState.toUpperCase()}</span>
            </div>

            {/* Mannequin Container */}
            <div 
              onClick={testPetMannequin}
              className="relative w-40 h-44 flex items-center justify-center cursor-pointer group my-auto"
              title="¡Haz clic sobre Lewis para probar la animación de caricias!"
            >
              {/* Petting heart badge */}
              {previewPetting && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.4, 1], y: -20 }}
                  className="absolute -top-4 text-[#ffb7ff]"
                >
                  <Heart size={28} fill="#ffb7ff" />
                </motion.div>
              )}

              <div className="w-32 h-36">
                <LewisSprite
                  state={previewState}
                  customImage={config.animations?.[previewState]}
                />
              </div>

              <div className="absolute -bottom-2 bg-black/80 px-2 py-0.5 rounded-full text-[9px] text-white/60 border border-white/10 group-hover:text-[#ffb7ff] group-hover:border-[#ffb7ff]/40 transition-colors">
                Haz clic para acariciar
              </div>
            </div>

            {/* Quick State Preview Switcher */}
            <div className="w-full space-y-2">
              <span className="text-[9px] text-white/40 uppercase tracking-wider block text-center">Cambiar estado visual:</span>
              <div className="grid grid-cols-4 gap-1">
                {(['idle', 'walk', 'pet', 'talk', 'sleep', 'pout', 'work'] as PetAnimationState[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPreviewState(st)}
                    className={`py-1 rounded text-[9px] font-mono capitalize transition-all ${
                      previewState === st
                        ? 'bg-[#ffb7ff] text-black font-bold'
                        : 'bg-white/5 text-white/60 hover:bg-white/15'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/[0.02] border-t border-white/10 p-4 flex justify-between items-center text-xs">
          <button
            onClick={() => {
              if (confirm("¿Deseas restablecer todas las animaciones y configuraciones a los valores predeterminados?")) {
                onUpdateConfig(() => ({
                  enabled: true,
                  screenMode: 'fullscreen',
                  behavior: 'wander',
                  size: 'md',
                  customScale: 1.0,
                  soundEnabled: true,
                  speechBubblesEnabled: true,
                  speed: 1.0,
                  affectionLevel: 0,
                  totalPets: 0,
                  animations: {},
                }));
              }
            }}
            className="text-white/40 hover:text-red-400 text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Restablecer todo</span>
          </button>

          <button
            onClick={onClose}
            className="bg-[#ffb7ff] hover:bg-[#ffb7ff]/90 text-black font-bold px-6 py-2 rounded-xl shadow-lg shadow-[#ffb7ff]/20 transition-all text-xs"
          >
            Guardar y Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
