import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pencil, 
  Brush, 
  Eraser, 
  RotateCcw, 
  Trash2, 
  Download, 
  Send, 
  Sparkles, 
  X, 
  Palette, 
  Wand2, 
  Heart,
  Music,
  Maximize2
} from 'lucide-react';

interface LewisDrawingCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToLewis: (imageDataUrl: string, caption: string) => void;
  onRequestLewisToDraw: (prompt: string) => Promise<{ imageUrl?: string; caption?: string }>;
}

type ToolType = 'pencil' | 'brush' | 'neon' | 'highlighter' | 'eraser';

interface StrokePoint {
  x: number;
  y: number;
  color: string;
  size: number;
  tool: ToolType;
}

const PRESET_COLORS = [
  { name: 'Rosa Lewis', hex: '#ffb7ff' },
  { name: 'Lavanda', hex: '#b39ddb' },
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Carmesí', hex: '#ef4444' },
  { name: 'Dorado', hex: '#fbbf24' },
  { name: 'Esmeralda', hex: '#34d399' },
  { name: 'Azul Hielo', hex: '#38bdf8' },
  { name: 'Sombra', hex: '#27272a' },
];

const LEWIS_DRAWING_IDEAS = [
  { label: '🌹 Rosa oscura con espinas', prompt: 'Una rosa oscura estilizada con espinas elegantes y pétalos delicados, con gotas de rocío y una dedicatoria médica' },
  { label: '🩺 Estetoscopio en corazón', prompt: 'Un estetoscopio quirúrgico curvado formando la silueta perfecta de un corazón con una pequeña partitura musical' },
  { label: '🎹 Piano de cola nocturno', prompt: 'Un elegante piano de cola con teclas iluminadas bajo la luna, reflejando notas musicales suaves' },
  { label: '🐱 Gatito con bata médica', prompt: 'Un adorable gatito travieso durmiendo sobre un expediente médico con el estetoscopio del doctor' },
  { label: '♟️ Rey y Reina de ajedrez', prompt: 'Dos piezas de ajedrez, un rey y una reina entrelazados en un tablero brillante en jaque perpetuo' },
  { label: '☕ Café negro & dedicatoria', prompt: 'Una taza humeante de café negro de especialidad con una nota manuscrita: Solo para ti, pequeña' }
];

export const LewisDrawingCanvas: React.FC<LewisDrawingCanvasProps> = ({
  isOpen,
  onClose,
  onSendToLewis,
  onRequestLewisToDraw,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'lewis'>('draw');
  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [currentColor, setCurrentColor] = useState<string>('#ffb7ff');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [canvasBg, setCanvasBg] = useState<'dark' | 'black' | 'vintage'>('dark');
  const [dedicationText, setDedicationText] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isLewisDrawing, setIsLewisDrawing] = useState(false);
  const [lewisDrawingStep, setLewisDrawingStep] = useState<string>('');
  const [customLewisPrompt, setCustomLewisPrompt] = useState('');
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getBgColor = useCallback(() => {
    switch (canvasBg) {
      case 'black': return '#080808';
      case 'vintage': return '#181419';
      default: return '#121216';
    }
  }, [canvasBg]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 600;
    const height = rect.height || 420;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, width, height);

    // Save initial state to history
    try {
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasHistory([initialData]);
      setHistoryIndex(0);
    } catch (e) {}
  }, [getBgColor]);

  useEffect(() => {
    if (isOpen) {
      // Short delay to let modal mount and measure width
      const timer = setTimeout(() => {
        initCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasHistory(prev => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(data);
        if (next.length > 20) next.shift();
        return next;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 19));
    } catch (e) {}
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    const previousState = canvasHistory[newIndex];
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    saveStateToHistory();
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    lastPointRef.current = { x, y };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw single dot on tap
    drawStroke(ctx, x, y, x, y);
  };

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'eraser') {
      ctx.strokeStyle = getBgColor();
      ctx.lineWidth = brushSize * 2.5;
      ctx.shadowBlur = 0;
    } else if (currentTool === 'neon') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.shadowColor = currentColor;
      ctx.shadowBlur = 12;
    } else if (currentTool === 'highlighter') {
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brushSize * 2;
      ctx.shadowBlur = 0;
    } else if (currentTool === 'pencil') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = Math.max(1.5, brushSize * 0.4);
      ctx.shadowBlur = 0;
    } else {
      // Brush
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.shadowColor = currentColor;
      ctx.shadowBlur = 2;
    }

    ctx.stroke();
    ctx.restore();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    drawStroke(ctx, lastPointRef.current.x, lastPointRef.current.y, x, y);
    lastPointRef.current = { x, y };
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    isDrawingRef.current = false;
    lastPointRef.current = null;
    saveStateToHistory();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `dibujito_lewis_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSending(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const caption = dedicationText.trim() 
        ? `*Te entrega un papel con un dibujito hecho con cariño:* "${dedicationText.trim()}" ♡`
        : `*Te muestra un dibujito recién hecho con sus propias manos:* "Mira lo que dibujé para ti, Lewis ♡"`;
      onSendToLewis(dataUrl, caption);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  // Lewis Animated Live Sketching on Canvas
  const animateLewisDrawing = async (title: string, dedication: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsLewisDrawing(true);
    setLewisDrawingStep("Lewis afilando su pluma estilográfica...");

    // Clear canvas
    handleClear();

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 600;
    const h = rect.height || 420;

    await new Promise(r => setTimeout(r, 600));

    setLewisDrawingStep(`Lewis trazando: "${title}"...`);

    // Draw intricate decorative border
    ctx.save();
    ctx.strokeStyle = '#ffb7ff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(15, 15, w - 30, h - 30);
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.restore();

    // Procedural graceful curves (Rose / Heart / Music motif)
    const centerX = w / 2;
    const centerY = h / 2 - 20;

    ctx.save();
    ctx.strokeStyle = '#ffb7ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffb7ff';
    ctx.shadowBlur = 8;
    ctx.lineCap = 'round';

    // Animated heart curve
    const totalPoints = 120;
    for (let i = 0; i <= totalPoints; i++) {
      const t = (i / totalPoints) * Math.PI * 2;
      // Parametric heart formula
      const x = centerX + 11 * Math.pow(Math.sin(t), 3) * 8;
      const y = centerY - (10 * Math.cos(t) - 3.5 * Math.cos(2*t) - 1.5 * Math.cos(3*t) - 0.7 * Math.cos(4*t)) * 8;

      if (i === 0) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 20));
      }
    }
    ctx.restore();

    // Draw inner rose petals & stethoscope lines
    ctx.save();
    ctx.strokeStyle = '#b39ddb';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#b39ddb';
    ctx.shadowBlur = 6;
    for (let r = 15; r < 55; r += 12) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 1.5);
      ctx.stroke();
      await new Promise(res => setTimeout(res, 40));
    }
    ctx.restore();

    // Musical notes & sparkles
    setLewisDrawingStep("Lewis firmando con su caligrafía elegante...");
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px serif';
    ctx.fillText('♩', centerX - 80, centerY - 60);
    ctx.fillText('♪', centerX + 75, centerY - 50);
    ctx.fillText('♫', centerX - 90, centerY + 40);
    ctx.fillText('✦', centerX + 85, centerY + 30);
    ctx.fillText('✧', centerX - 30, centerY - 95);
    ctx.restore();

    // Handwritten dedication at the bottom
    ctx.save();
    ctx.fillStyle = '#ffb7ff';
    ctx.font = 'italic 18px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, centerX, h - 70);

    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = 'rgba(252, 252, 252, 0.85)';
    ctx.fillText(`"${dedication}"`, centerX, h - 45);

    ctx.font = '11px "Space Mono", monospace';
    ctx.fillStyle = '#ffb7ff';
    ctx.fillText('— DR. LEWIS BLACKWOOD  ♡', centerX, h - 25);
    ctx.restore();

    saveStateToHistory();
    setIsLewisDrawing(false);
    setLewisDrawingStep('');
  };

  const handleRequestLewisDrawing = async (promptTitle: string, fullPrompt: string) => {
    setIsLewisDrawing(true);
    setLewisDrawingStep(`Lewis preparando su lienzo personal...`);
    try {
      // First do the live procedural sketch on canvas
      await animateLewisDrawing(promptTitle, "Hecho con dedicación médica y artística para ti.");
      
      // Also request Lewis's AI generation & message
      const result = await onRequestLewisToDraw(fullPrompt);
      if (result.imageUrl) {
        // Load generated art onto canvas if available
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          const rect = canvas.getBoundingClientRect();
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          saveStateToHistory();
        };
        img.src = result.imageUrl;
      }
    } catch (e) {
      console.error("Error asking Lewis to draw:", e);
    } finally {
      setIsLewisDrawing(false);
      setLewisDrawingStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#121216] border border-[#ffb7ff]/30 w-full max-w-4xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="bg-[#191920] border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ffb7ff]/20 text-[#ffb7ff] flex items-center justify-center border border-[#ffb7ff]/30">
              <Palette size={18} />
            </div>
            <div>
              <h2 className="text-white font-garamond text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>Lienzo Artístico & Dibujos</span>
                <span className="text-[10px] font-mono-code bg-[#ffb7ff]/20 text-[#ffb7ff] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                  Tú & Lewis
                </span>
              </h2>
              <p className="text-white/40 text-[10px] sm:text-xs font-mono-code">
                Dibuja para él o pídele a Lewis que cree una ilustración para ti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 font-mono-code text-[11px]">
              <button
                onClick={() => setActiveTab('draw')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'draw'
                    ? 'bg-[#ffb7ff] text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Pencil size={12} />
                <span>Mi Dibujo</span>
              </button>
              <button
                onClick={() => setActiveTab('lewis')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'lewis'
                    ? 'bg-gradient-to-r from-[#b39ddb] to-[#ffb7ff] text-black shadow-md'
                    : 'text-white/60 hover:text-[#ffb7ff]'
                }`}
              >
                <Wand2 size={12} />
                <span>Lewis Dibuja</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-5 flex flex-col lg:flex-row gap-4 flex-1 overflow-y-auto">
          {/* Main Canvas View */}
          <div className="flex-1 flex flex-col">
            {/* Canvas Toolbar Top */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#17171e] p-2 rounded-xl border border-white/5 mb-2 font-mono-code text-xs">
              {/* Tool Selection */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentTool('brush')}
                  className={`p-1.5 sm:p-2 rounded-lg flex items-center gap-1 transition-all ${
                    currentTool === 'brush' ? 'bg-[#ffb7ff] text-black font-bold' : 'text-white/60 hover:bg-white/5'
                  }`}
                  title="Pincel artístico"
                >
                  <Brush size={14} />
                  <span className="hidden sm:inline text-[10px]">Pincel</span>
                </button>
                <button
                  onClick={() => setCurrentTool('pencil')}
                  className={`p-1.5 sm:p-2 rounded-lg flex items-center gap-1 transition-all ${
                    currentTool === 'pencil' ? 'bg-[#ffb7ff] text-black font-bold' : 'text-white/60 hover:bg-white/5'
                  }`}
                  title="Lápiz fino"
                >
                  <Pencil size={14} />
                  <span className="hidden sm:inline text-[10px]">Lápiz</span>
                </button>
                <button
                  onClick={() => setCurrentTool('neon')}
                  className={`p-1.5 sm:p-2 rounded-lg flex items-center gap-1 transition-all ${
                    currentTool === 'neon' ? 'bg-[#ffb7ff] text-black font-bold' : 'text-white/60 hover:bg-white/5'
                  }`}
                  title="Pluma resplandor neón"
                >
                  <Sparkles size={14} />
                  <span className="hidden sm:inline text-[10px]">Neón</span>
                </button>
                <button
                  onClick={() => setCurrentTool('eraser')}
                  className={`p-1.5 sm:p-2 rounded-lg flex items-center gap-1 transition-all ${
                    currentTool === 'eraser' ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30' : 'text-white/60 hover:bg-white/5'
                  }`}
                  title="Borrador"
                >
                  <Eraser size={14} />
                  <span className="hidden sm:inline text-[10px]">Borrar</span>
                </button>
              </div>

              {/* Stroke Size */}
              <div className="flex items-center gap-2 text-white/50 text-[10px]">
                <span>Grosor:</span>
                <input 
                  type="range" 
                  min="2" 
                  max="28" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-16 sm:w-24 accent-[#ffb7ff] cursor-pointer"
                />
                <span className="text-white font-mono text-[10px] w-4">{brushSize}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 sm:p-2 rounded-lg text-white/60 hover:bg-white/5 disabled:opacity-20 transition-all"
                  title="Deshacer trazo"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={handleClear}
                  className="p-1.5 sm:p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Limpiar lienzo"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 sm:p-2 rounded-lg text-[#ffb7ff]/80 hover:text-[#ffb7ff] hover:bg-white/5 transition-all"
                  title="Descargar imagen"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-[#0c0c0e] rounded-2xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                className="w-full h-full touch-none cursor-crosshair block"
                style={{ background: getBgColor() }}
              />

              {/* Lewis Live Drawing Overlay */}
              <AnimatePresence>
                {isLewisDrawing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none p-4 text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#ffb7ff]/20 text-[#ffb7ff] flex items-center justify-center border border-[#ffb7ff]/40 shadow-[0_0_20px_#ffb7ff] animate-pulse mb-3">
                      <Wand2 size={24} />
                    </div>
                    <p className="text-white font-garamond text-xl font-bold italic mb-1">
                      Lewis está dibujando para ti...
                    </p>
                    <p className="text-[#ffb7ff] font-mono-code text-xs animate-bounce">
                      {lewisDrawingStep || "Trazando líneas con precisión médica..."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Color Palette Bar */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 bg-[#17171e] p-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      setCurrentColor(c.hex);
                      if (currentTool === 'eraser') setCurrentTool('brush');
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shrink-0 ${
                      currentColor === c.hex ? 'border-white scale-110 shadow-[0_0_8px_currentColor]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
                {/* Custom Color Input */}
                <label className="relative w-6 h-6 rounded-full border border-white/20 overflow-hidden cursor-pointer shrink-0 hover:scale-110 transition-transform">
                  <input 
                    type="color" 
                    value={currentColor} 
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="opacity-0 absolute inset-0 cursor-pointer" 
                  />
                  <div className="w-full h-full bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400" />
                </label>
              </div>

              {/* Background Picker */}
              <div className="flex items-center gap-1 text-[10px] font-mono-code text-white/50">
                <span>Fondo:</span>
                <button
                  onClick={() => { setCanvasBg('dark'); setTimeout(initCanvas, 50); }}
                  className={`px-2 py-0.5 rounded ${canvasBg === 'dark' ? 'bg-[#ffb7ff]/20 text-[#ffb7ff] font-bold' : 'hover:text-white'}`}
                >
                  Gris
                </button>
                <button
                  onClick={() => { setCanvasBg('black'); setTimeout(initCanvas, 50); }}
                  className={`px-2 py-0.5 rounded ${canvasBg === 'black' ? 'bg-[#ffb7ff]/20 text-[#ffb7ff] font-bold' : 'hover:text-white'}`}
                >
                  Negro
                </button>
                <button
                  onClick={() => { setCanvasBg('vintage'); setTimeout(initCanvas, 50); }}
                  className={`px-2 py-0.5 rounded ${canvasBg === 'vintage' ? 'bg-[#ffb7ff]/20 text-[#ffb7ff] font-bold' : 'hover:text-white'}`}
                >
                  Burdeos
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Panel: Actions & Lewis Interaction */}
          <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">
            {activeTab === 'draw' ? (
              <div className="bg-[#17171e] border border-white/10 rounded-2xl p-4 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Heart size={16} className="text-[#ffb7ff]" />
                    <h3 className="text-white font-bold text-sm font-garamond">Dedicatoria para Lewis</h3>
                  </div>
                  <p className="text-white/50 text-[11px] font-mono-code leading-relaxed mb-3">
                    Escribe una nota o dedicatoria que acompañará tu dibujo. Lewis lo analizará con su ojo clínico y afecto protector.
                  </p>
                  <textarea
                    value={dedicationText}
                    onChange={(e) => setDedicationText(e.target.value)}
                    placeholder="Ej: Para el doctor más inteligente... te hice esto mientras escuchaba tu piano ♡"
                    className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 resize-none focus:outline-none focus:border-[#ffb7ff]/50 font-sans"
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <button
                    onClick={handleSendDrawing}
                    disabled={isSending}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b39ddb] to-[#ffb7ff] text-black font-bold text-xs font-mono-code uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#ffb7ff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{isSending ? "Enviando..." : "Enviar a Lewis ♡"}</span>
                  </button>
                  <p className="text-center text-[10px] text-white/30 font-mono-code">
                    Aparecerá en el chat y Lewis te responderá
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#17171e] border border-white/10 rounded-2xl p-4 flex flex-col flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 size={16} className="text-[#ffb7ff]" />
                  <h3 className="text-white font-bold text-sm font-garamond">Pídele un Dibujo a Lewis</h3>
                </div>
                <p className="text-white/50 text-[11px] font-mono-code leading-relaxed mb-3">
                  Selecciona una temática o escribe qué quieres que Lewis dibuje para ti con su estilo sofisticado:
                </p>

                {/* Preset Themes */}
                <div className="space-y-1.5 mb-3 flex-1 overflow-y-auto pr-1">
                  {LEWIS_DRAWING_IDEAS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRequestLewisDrawing(item.label, item.prompt)}
                      disabled={isLewisDrawing}
                      className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-[#ffb7ff]/10 border border-white/5 hover:border-[#ffb7ff]/30 text-left transition-all group disabled:opacity-30"
                    >
                      <div className="text-xs text-white font-medium group-hover:text-[#ffb7ff] transition-colors">
                        {item.label}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Request Input */}
                <div className="pt-3 border-t border-white/10">
                  <span className="text-[10px] text-white/40 uppercase font-mono-code tracking-wider block mb-1.5">
                    O pide algo personalizado:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customLewisPrompt}
                      onChange={(e) => setCustomLewisPrompt(e.target.value)}
                      placeholder="Ej: Un café con rosas..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#ffb7ff]/50"
                      disabled={isLewisDrawing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customLewisPrompt.trim()) {
                          handleRequestLewisDrawing("Dibujo exclusivo", customLewisPrompt.trim());
                          setCustomLewisPrompt('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (customLewisPrompt.trim()) {
                          handleRequestLewisDrawing("Dibujo exclusivo", customLewisPrompt.trim());
                          setCustomLewisPrompt('');
                        }
                      }}
                      disabled={isLewisDrawing || !customLewisPrompt.trim()}
                      className="px-3 py-2 rounded-xl bg-[#ffb7ff] text-black font-bold text-xs disabled:opacity-40 hover:scale-105 transition-all"
                    >
                      <Wand2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
