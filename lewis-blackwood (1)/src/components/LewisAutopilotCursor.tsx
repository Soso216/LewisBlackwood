import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MousePointer2, Keyboard, X, Sparkles, Hand, Zap } from 'lucide-react';
import { petSound } from '../utils/audioSynth';

export interface AutopilotTarget {
  id: string;
  label: string;
  x: number;
  y: number;
  onExecute: () => void;
  typingText?: string;
}

interface LewisAutopilotCursorProps {
  isControlling: boolean;
  onStopControl: () => void;
  currentActionLabel?: string;
  cursorPos: { x: number; y: number };
  isClicking: boolean;
  typingKey: string | null;
}

export const LewisAutopilotCursor: React.FC<LewisAutopilotCursorProps> = ({
  isControlling,
  onStopControl,
  currentActionLabel = "Explorando pantalla...",
  cursorPos,
  isClicking,
  typingKey,
}) => {
  if (!isControlling) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      {/* Floating Status Bar at Top */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto bg-[#14151f]/95 border border-[#ffb7ff]/40 shadow-[0_10px_35px_rgba(255,183,255,0.25)] backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-3 text-white z-[100000]"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb7ff] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <MousePointer2 size={13} className="text-[#ffb7ff]" />
            <Keyboard size={13} className="text-[#b39ddb]" />
            <span>Lewis en control de mouse y teclado</span>
          </div>
        </div>

        <div className="h-3 w-px bg-white/20" />

        <div className="text-[11px] text-[#ffb7ff] max-w-[200px] truncate font-medium">
          {currentActionLabel}
        </div>

        <button
          onClick={onStopControl}
          className="ml-1 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/70 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border border-white/10 flex items-center gap-1"
          title="Recuperar control de periféricos"
        >
          <X size={10} />
          <span>Detener</span>
        </button>
      </motion.div>

      {/* Virtual Cursor */}
      <motion.div
        animate={{
          x: cursorPos.x,
          y: cursorPos.y,
          scale: isClicking ? 0.85 : 1,
        }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 180,
          mass: 0.6,
        }}
        className="absolute top-0 left-0 -ml-2 -mt-2 pointer-events-none"
      >
        {/* Glow halo */}
        <div className="absolute -inset-3 bg-[#ffb7ff]/30 blur-md rounded-full animate-pulse" />

        {/* Doctor Gloved Hand / Glowing Cursor */}
        <div className="relative flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
          >
            <path
              d="M4 3L11.5 21L14.5 13.5L22 10.5L4 3Z"
              fill="url(#lewisCursorGradient)"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="lewisCursorGradient" x1="4" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#b39ddb" />
                <stop offset="1" stopColor="#ffb7ff" />
              </linearGradient>
            </defs>
          </svg>

          {/* Small Avatar Tag next to cursor */}
          <div className="absolute top-5 left-5 bg-black/80 border border-[#ffb7ff]/40 text-[#ffb7ff] text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md shadow-lg flex items-center gap-1 whitespace-nowrap">
            <span>Dr. Lewis</span>
            {isClicking && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>}
          </div>
        </div>

        {/* Click ripple effect */}
        <AnimatePresence>
          {isClicking && (
            <motion.div
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute top-0 left-0 w-8 h-8 rounded-full border-2 border-[#ffb7ff] -ml-2 -mt-2 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating Virtual Keystroke Indicator */}
      <AnimatePresence>
        {typingKey && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: cursorPos.y - 40, x: cursorPos.x + 20 }}
            animate={{ scale: 1.1, opacity: 1, y: cursorPos.y - 60, x: cursorPos.x + 20 }}
            exit={{ scale: 0.6, opacity: 0, y: cursorPos.y - 80 }}
            transition={{ duration: 0.3 }}
            className="absolute pointer-events-none bg-[#241c38]/95 border border-[#ffb7ff]/60 px-2 py-1 rounded-lg shadow-xl text-white font-mono text-xs flex items-center gap-1.5 backdrop-blur-sm"
          >
            <Keyboard size={12} className="text-[#ffb7ff]" />
            <span className="font-bold text-[#ffb7ff]">Tecla [{typingKey}]</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
