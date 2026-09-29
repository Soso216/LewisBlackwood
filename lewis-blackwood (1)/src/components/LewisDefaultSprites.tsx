import React from 'react';
import { PetAnimationState } from '../types';

interface LewisSpriteProps {
  state: PetAnimationState;
  customImage?: string;
  className?: string;
  isSpeaking?: boolean;
}

export const LewisSprite: React.FC<LewisSpriteProps> = ({
  state,
  customImage,
  className = "w-full h-full",
  isSpeaking = false,
}) => {
  // If user uploaded a custom image or GIF for this state, render it directly
  if (customImage) {
    return (
      <img
        src={customImage}
        alt={`Lewis ${state}`}
        className={`${className} object-contain select-none pointer-events-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]`}
        referrerPolicy="no-referrer"
        draggable={false}
      />
    );
  }

  // Otherwise, render a custom stylized SVG Chibi of Director Lewis Blackwood with vector animations!
  const isSleeping = state === 'sleep';
  const isPetting = state === 'pet';
  const isPouting = state === 'pout';
  const isWalking = state === 'walk';
  const isWorking = state === 'work';
  const isTalking = state === 'talk' || isSpeaking;

  return (
    <div className={`relative ${className} flex items-center justify-center select-none`}>
      <svg
        viewBox="0 0 120 140"
        className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)] overflow-visible"
      >
        {/* Soft Aura / Glow on Petting */}
        {isPetting && (
          <circle cx="60" cy="70" r="55" fill="rgba(255, 183, 255, 0.25)" className="animate-pulse" />
        )}

        {/* Shadow */}
        <ellipse cx="60" cy="132" rx="34" ry="7" fill="rgba(0,0,0,0.35)" />

        {/* Doctor Coat / Suit Back */}
        <path
          d="M 38 78 Q 28 100 24 124 Q 60 128 96 124 Q 92 100 82 78 Z"
          fill="#16181f"
          stroke="#2d3245"
          strokeWidth="1.5"
        />

        {/* Legs / Trousers */}
        <g>
          <rect x="42" y="112" width="12" height="20" rx="4" fill="#0f1015" />
          <rect x="66" y="112" width="12" height="20" rx="4" fill="#0f1015" />
          {/* Polished black leather shoes */}
          <ellipse cx="48" cy="132" rx="8" ry="4" fill="#050608" />
          <ellipse cx="72" cy="132" rx="8" ry="4" fill="#050608" />
        </g>

        {/* Tailored Vest / Shirt */}
        <path d="M 44 72 L 60 92 L 76 72 L 76 114 L 44 114 Z" fill="#252834" />
        {/* White Collar & Crimson/Black Tie */}
        <polygon points="52,72 60,82 68,72" fill="#ffffff" />
        <polygon points="58,76 62,76 64,102 60,106 56,102" fill="#881337" />

        {/* White Medical Lab Coat / Director Overcoat */}
        <path
          d="M 34 74 Q 28 96 26 122 Q 44 125 48 116 L 46 76 Z"
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <path
          d="M 86 74 Q 92 96 94 122 Q 76 125 72 116 L 74 76 Z"
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {/* Stethoscope */}
        <path
          d="M 46 74 Q 48 95 60 98 Q 72 95 74 74"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="100" r="4.5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />

        {/* Arms / Hands */}
        {isWorking ? (
          // Holding medical clipboard & pen
          <g>
            <path d="M 32 78 Q 28 92 40 98" stroke="#16181f" strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M 88 78 Q 92 92 78 98" stroke="#16181f" strokeWidth="9" strokeLinecap="round" fill="none" />
            <rect x="44" y="86" width="32" height="26" rx="3" fill="#3b2d54" stroke="#ffb7ff" strokeWidth="1" />
            <line x1="48" y1="92" x2="72" y2="92" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="48" y1="97" x2="68" y2="97" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="48" y1="102" x2="64" y2="102" stroke="#ffb7ff" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ) : isPetting ? (
          // Shy hands together / happy pose
          <g>
            <path d="M 32 78 Q 40 96 52 94" stroke="#16181f" strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M 88 78 Q 80 96 68 94" stroke="#16181f" strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="60" cy="94" r="5" fill="#fcd34d" />
          </g>
        ) : isPouting ? (
          // Crossed arms
          <g>
            <path d="M 30 80 Q 60 98 88 84" stroke="#16181f" strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M 90 80 Q 60 98 32 84" stroke="#16181f" strokeWidth="8" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          // Standard composed arms in coat pockets
          <g>
            <path d="M 32 76 Q 26 95 34 106" stroke="#16181f" strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M 88 76 Q 94 95 86 106" stroke="#16181f" strokeWidth="9" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* Head / Face */}
        <ellipse cx="60" cy="48" rx="30" ry="28" fill="#fdedd8" />

        {/* Ears */}
        <circle cx="30" cy="50" r="5" fill="#fdedd8" />
        <circle cx="90" cy="50" r="5" fill="#fdedd8" />

        {/* Jet-Black Stylish Hair Base */}
        <path
          d="M 28 46 Q 30 18 60 18 Q 90 18 92 46 Q 94 28 80 20 Q 60 14 38 22 Z"
          fill="#090a0f"
        />
        {/* Hair Bangs / Strands over forehead */}
        <path
          d="M 30 38 Q 42 42 46 54 Q 48 36 60 34 Q 72 36 78 52 Q 80 38 90 42 Q 86 24 60 22 Q 34 24 30 38 Z"
          fill="#12141d"
        />
        {/* Subtle Blue Highlights in Hair */}
        <path d="M 44 26 Q 58 24 74 28" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />

        {/* Eyes / Expressions */}
        {isSleeping ? (
          // Sleeping curved happy lines
          <g>
            <path d="M 42 50 Q 48 56 54 50" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 66 50 Q 72 56 78 50" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            {/* Sleeping snot bubble / zZz indicator */}
            <text x="86" y="32" fill="#93c5fd" fontSize="13" fontWeight="bold" fontFamily="monospace" className="animate-bounce">
              zZz
            </text>
          </g>
        ) : isPetting ? (
          // Happy closed smiling eyes with hearts
          <g>
            <path d="M 42 50 Q 48 44 54 50" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 66 50 Q 72 44 78 50" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            {/* Blushing cheeks */}
            <ellipse cx="40" cy="56" rx="6" ry="3.5" fill="#f43f5e" opacity="0.55" />
            <ellipse cx="80" cy="56" rx="6" ry="3.5" fill="#f43f5e" opacity="0.55" />
          </g>
        ) : isPouting ? (
          // Piercing icy blue eyes narrowed / annoyed
          <g>
            {/* Sharp dark brows */}
            <line x1="38" y1="42" x2="54" y2="46" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="82" y1="42" x2="66" y2="46" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            {/* Narrowed eyes */}
            <ellipse cx="46" cy="50" rx="6" ry="4" fill="#0284c7" />
            <ellipse cx="74" cy="50" rx="6" ry="4" fill="#0284c7" />
            <circle cx="47" cy="49" r="1.5" fill="#ffffff" />
            <circle cx="75" cy="49" r="1.5" fill="#ffffff" />
            {/* Tiny blush of frustration */}
            <ellipse cx="40" cy="56" rx="4" ry="2.5" fill="#f43f5e" opacity="0.4" />
            <ellipse cx="80" cy="56" rx="4" ry="2.5" fill="#f43f5e" opacity="0.4" />
          </g>
        ) : (
          // Piercing Icy Blue Eyes (Signature Lewis Look)
          <g>
            {/* Sophisticated brows */}
            <path d="M 40 43 Q 48 40 54 44" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            <path d="M 80 43 Q 72 40 66 44" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            
            {/* Sclera & Iris */}
            <ellipse cx="46" cy="50" rx="7" ry="8" fill="#ffffff" />
            <ellipse cx="74" cy="50" rx="7" ry="8" fill="#ffffff" />
            
            <ellipse cx="46" cy="50" rx="5" ry="6.5" fill="#0284c7" />
            <ellipse cx="74" cy="50" rx="5" ry="6.5" fill="#0284c7" />

            <ellipse cx="46" cy="50" rx="3" ry="4" fill="#082f49" />
            <ellipse cx="74" cy="50" rx="3" ry="4" fill="#082f49" />

            {/* Sparkle highlights in eyes */}
            <circle cx="48" cy="47" r="1.8" fill="#ffffff" />
            <circle cx="76" cy="47" r="1.8" fill="#ffffff" />
            <circle cx="44" cy="53" r="1" fill="#bae6fd" />
            <circle cx="72" cy="53" r="1" fill="#bae6fd" />

            {/* Subtle natural blush */}
            <ellipse cx="38" cy="56" rx="4" ry="2" fill="#f43f5e" opacity="0.25" />
            <ellipse cx="82" cy="56" rx="4" ry="2" fill="#f43f5e" opacity="0.25" />
          </g>
        )}

        {/* Eyeglasses / Rimless Spectacles */}
        <g opacity="0.85">
          <rect x="38" y="44" width="16" height="12" rx="2" fill="none" stroke="#94a3b8" strokeWidth="1" />
          <rect x="66" y="44" width="16" height="12" rx="2" fill="none" stroke="#94a3b8" strokeWidth="1" />
          <line x1="54" y1="49" x2="66" y2="49" stroke="#94a3b8" strokeWidth="1.2" />
        </g>

        {/* Nose */}
        <path d="M 60 52 L 59 56 L 61 56" stroke="#e2b192" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Mouth */}
        {isTalking ? (
          <ellipse cx="60" cy="62" rx="4" ry="3" fill="#be123c" stroke="#881337" strokeWidth="1" />
        ) : isPetting ? (
          <path d="M 55 60 Q 60 66 65 60" fill="none" stroke="#881337" strokeWidth="2" strokeLinecap="round" />
        ) : isPouting ? (
          <line x1="54" y1="62" x2="66" y2="61" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        ) : (
          // Sophisticated subtle smirk
          <path d="M 56 61 Q 60 63 65 60" fill="none" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
};
