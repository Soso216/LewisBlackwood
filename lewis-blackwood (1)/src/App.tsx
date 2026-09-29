import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, Volume2, VolumeX, X, Pencil, RotateCcw, Check, Trash2, BookOpen, Mic, Square, AudioLines, Monitor, MonitorOff, ChevronLeft, ChevronRight, Presentation, Settings, Heart, Sparkles, ListTodo, CalendarCheck, Music, Trophy, Activity, Smile, Maximize2, Minimize2, LayoutGrid, Bell, BellRing, BellOff, MousePointer2, Keyboard, Palette, Wand2, Globe, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { Type } from "@google/genai";
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { PetConfig, PetAnimationState } from './types';
import { DesktopPet } from './components/DesktopPet';
import { PetAnimationStudio } from './components/PetAnimationStudio';
import { LewisAutopilotCursor } from './components/LewisAutopilotCursor';
import { LewisDrawingCanvas } from './components/LewisDrawingCanvas';
import { sendLewisNotification, requestNotificationPermission, getNotificationPermissionStatus } from './utils/notifications';
import { petSound } from './utils/audioSynth';

const ChessGame = ({ game, setGame }: { game: Chess, setGame: (g: Chess | ((prev: Chess) => Chess)) => void }) => {
  const [isThinking, setIsThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [confirmSurrender, setConfirmSurrender] = useState(false);

  function playMoveSound(isCapture = false) {
    try {
      petSound.playKeyClick();
      if (isCapture) {
        petSound.playMouseClick();
      }
    } catch (e) {}
  }

  function makeMove(sourceSquare: string, targetSquare: string): boolean {
    if (isThinking || game.isGameOver()) return false;
    if (game.turn() !== 'w') return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        playMoveSound(!!move.captured);
        setLastMove({ from: sourceSquare, to: targetSquare });
        setGame(new Chess(gameCopy.fen()));
        setMoveHistory(gameCopy.history());
        setSelectedSquare(null);
        setPossibleMoves([]);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  function onDrop(args: any, secondArg?: any): boolean {
    let sourceSquare = '';
    let targetSquare = '';
    if (typeof args === 'object' && args !== null) {
      sourceSquare = args.sourceSquare;
      targetSquare = args.targetSquare;
    } else if (typeof args === 'string') {
      sourceSquare = args;
      targetSquare = secondArg;
    }

    if (!sourceSquare || !targetSquare || sourceSquare === targetSquare) {
      return false;
    }

    return makeMove(sourceSquare, targetSquare);
  }

  function handleSquareClick(square: string) {
    if (isThinking || game.isGameOver() || game.turn() !== 'w') return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      const success = makeMove(selectedSquare, square);
      if (success) return;

      const pieceOnSquare = game.get(square as any);
      if (pieceOnSquare && pieceOnSquare.color === 'w') {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as any, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
        return;
      }

      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    const piece = game.get(square as any);
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as any, verbose: true });
      setPossibleMoves(moves.map(m => m.to));
    }
  }

  useEffect(() => {
    if (game.turn() === 'b' && !game.isGameOver()) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
          const gameCopy = new Chess(game.fen());

          // Smart Lewis AI:
          // 1. Checkmate move if available
          const checkmateMove = moves.find(m => {
            const testGame = new Chess(game.fen());
            testGame.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
            return testGame.isCheckmate();
          });

          // 2. High value capture
          const pieceValues: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
          const captures = moves
            .filter(m => m.captured)
            .sort((a, b) => (pieceValues[b.captured || 'p'] || 0) - (pieceValues[a.captured || 'p'] || 0));

          // 3. Check move
          const checks = moves.filter(m => {
            const testGame = new Chess(game.fen());
            testGame.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
            return testGame.inCheck();
          });

          let chosenMove = checkmateMove;
          if (!chosenMove && captures.length > 0 && Math.random() < 0.75) {
            chosenMove = captures[0];
          } else if (!chosenMove && checks.length > 0 && Math.random() < 0.6) {
            chosenMove = checks[0];
          } else if (!chosenMove) {
            chosenMove = moves[Math.floor(Math.random() * moves.length)];
          }

          if (chosenMove) {
            const res = gameCopy.move({
              from: chosenMove.from,
              to: chosenMove.to,
              promotion: chosenMove.promotion || 'q',
            });
            if (res) {
              playMoveSound(!!chosenMove.captured);
              setLastMove({ from: chosenMove.from, to: chosenMove.to });
              setGame(new Chess(gameCopy.fen()));
              setMoveHistory(gameCopy.history());
            }
          }
        }
        setIsThinking(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game.fen()]);

  const undoMove = () => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo(); // Undo Lewis
    gameCopy.undo(); // Undo User
    setGame(new Chess(gameCopy.fen()));
    setMoveHistory(gameCopy.history());
    setLastMove(null);
    setSelectedSquare(null);
    setPossibleMoves([]);
  };

  // Calculate captured pieces
  const getCapturedPieces = () => {
    const initialPieces = {
      p: 8, n: 2, b: 2, r: 2, q: 1,
      P: 8, N: 2, B: 2, R: 2, Q: 1
    };
    
    const currentPieces: any = {};
    game.board().forEach(row => {
      row.forEach(square => {
        if (square) {
          const type = square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase();
          currentPieces[type] = (currentPieces[type] || 0) + 1;
        }
      });
    });

    const captured: { w: string[], b: string[] } = { w: [], b: [] };
    const pieceSymbols: any = {
      p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
      P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕'
    };

    Object.entries(initialPieces).forEach(([type, count]) => {
      const diff = count - (currentPieces[type] || 0);
      for (let i = 0; i < diff; i++) {
        if (type === type.toUpperCase()) {
          captured.b.push(pieceSymbols[type]);
        } else {
          captured.w.push(pieceSymbols[type]);
        }
      }
    });

    return captured;
  };

  const captured = getCapturedPieces();

  // Custom square styles for highlights, dots, and check
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    customSquareStyles[lastMove.from] = {
      backgroundColor: 'rgba(255, 183, 255, 0.22)',
    };
    customSquareStyles[lastMove.to] = {
      backgroundColor: 'rgba(255, 183, 255, 0.38)',
    };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: 'rgba(179, 157, 219, 0.55)',
      boxShadow: 'inset 0 0 0 3px #ffb7ff',
    };
  }

  possibleMoves.forEach(target => {
    const isOccupied = !!game.get(target as any);
    customSquareStyles[target] = {
      ...(customSquareStyles[target] || {}),
      background: isOccupied
        ? 'radial-gradient(circle, rgba(248, 113, 113, 0.75) 20%, rgba(255, 183, 255, 0.35) 80%)'
        : 'radial-gradient(circle, rgba(255, 183, 255, 0.75) 25%, transparent 26%)',
      cursor: 'pointer',
    };
  });

  if (game.inCheck()) {
    const turn = game.turn();
    game.board().forEach((row, rIdx) => {
      row.forEach((sq, cIdx) => {
        if (sq && sq.type === 'k' && sq.color === turn) {
          const colLetter = String.fromCharCode(97 + cIdx);
          const rowNum = 8 - rIdx;
          const kingSquare = `${colLetter}${rowNum}`;
          customSquareStyles[kingSquare] = {
            ...(customSquareStyles[kingSquare] || {}),
            backgroundColor: 'rgba(239, 68, 68, 0.65)',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.8)',
          };
        }
      });
    });
  }

  const chessboardOptions = {
    id: "LewisChessBoard",
    position: game.fen(),
    boardOrientation: 'white' as const,
    allowDragging: !isThinking && !game.isGameOver() && game.turn() === 'w',
    animationDurationInMs: 250,
    boardStyle: {
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
      overflow: 'hidden',
    },
    darkSquareStyle: { backgroundColor: '#26262a' },
    lightSquareStyle: { backgroundColor: '#404046' },
    squareStyles: customSquareStyles,
    canDragPiece: ({ piece }: any) => {
      if (isThinking || game.isGameOver() || game.turn() !== 'w') return false;
      return piece?.pieceType?.startsWith('w');
    },
    onPieceDrop: onDrop,
    onSquareClick: ({ square }: any) => {
      handleSquareClick(square);
    },
    onPieceClick: ({ square }: any) => {
      if (square) handleSquareClick(square);
    },
  };

  return (
    <div className="w-full flex flex-col items-center justify-center bg-[#151518] rounded-xl p-2 sm:p-4 shadow-inner">
      <div className="w-full max-w-[680px] flex flex-col md:flex-row gap-4 sm:gap-6 items-center md:items-start">
        {/* Board Section */}
        <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[390px] md:max-w-[430px] mx-auto shrink-0 select-none">
          <Chessboard options={chessboardOptions} />
          
          <AnimatePresence>
            {isThinking && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#b39ddb] text-black text-[10px] font-bold px-4 py-1 rounded-full shadow-lg z-20 flex items-center gap-2 whitespace-nowrap"
              >
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
                LEWIS ANALIZANDO...
              </motion.div>
            )}
          </AnimatePresence>

          {game.isGameOver() && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center rounded-xl z-30 p-6 text-center border border-[#ffb7ff]/20">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
              >
                <Trophy className="text-[#ffb7ff] mb-4" size={56} />
              </motion.div>
              <p className="text-white font-bold text-2xl mb-2">¡Jaque Mate!</p>
              <p className="text-[#ffb7ff]/80 text-xs sm:text-sm mb-6 max-w-[240px] leading-relaxed">
                {game.isCheckmate() 
                  ? (game.turn() === 'w' ? 'Lewis ha ganado. "Un diagnóstico impecable, pequeña."' : '¡Has ganado! "Una estrategia magistral... me has impresionado, pequeña."') 
                  : 'Tablas. Un empate digno de estudio entre médico y paciente.'}
              </p>
              <button 
                onClick={() => {
                  setGame(new Chess());
                  setMoveHistory([]);
                  setLastMove(null);
                  setSelectedSquare(null);
                  setPossibleMoves([]);
                }}
                className="bg-[#ffb7ff] text-black px-6 py-2.5 rounded-full font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-[#ffb7ff]/20"
              >
                Nueva Partida
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="w-full md:w-56 flex flex-col gap-3 sm:gap-4 shrink-0">
          {/* Turn Indicator */}
          <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-white/5 text-[11px] font-bold">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${game.turn() === 'w' ? 'bg-[#ffb7ff] shadow-[0_0_8px_#ffb7ff]' : 'bg-white/20'}`} />
              <span className={game.turn() === 'w' ? 'text-white' : 'text-white/40'}>TÚ (BLANCAS)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={game.turn() === 'b' ? 'text-[#ffb7ff]' : 'text-white/40'}>LEWIS (NEGRAS)</span>
              <span className={`w-2.5 h-2.5 rounded-full ${game.turn() === 'b' ? 'bg-[#ffb7ff] shadow-[0_0_8px_#ffb7ff]' : 'bg-white/20'}`} />
            </div>
          </div>

          {/* Captured Pieces */}
          <div className="space-y-1.5">
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Piezas Capturadas</p>
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-2 min-h-[70px]">
              <div className="flex flex-wrap gap-1 text-base leading-none opacity-80 min-h-[20px]">
                {captured.w.length > 0 ? captured.w.map((p, i) => <span key={i} className="text-white">{p}</span>) : <span className="text-[10px] text-white/20 italic">Ninguna blanca</span>}
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex flex-wrap gap-1 text-base leading-none opacity-80 min-h-[20px]">
                {captured.b.length > 0 ? captured.b.map((p, i) => <span key={i} className="text-[#ffb7ff]">{p}</span>) : <span className="text-[10px] text-white/20 italic">Ninguna negra</span>}
              </div>
            </div>
          </div>

          {/* Move History */}
          <div className="space-y-1.5 flex-1">
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Historial de Jugadas</p>
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 h-28 sm:h-36 overflow-y-auto custom-scrollbar">
              {moveHistory.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                    <React.Fragment key={i}>
                      <div className="text-[10px] text-white/70 flex gap-1.5">
                        <span className="text-white/30 w-3">{i + 1}.</span>
                        <span className="font-mono">{moveHistory[i * 2]}</span>
                      </div>
                      <div className="text-[10px] text-[#ffb7ff]/80 font-mono">
                        {moveHistory[i * 2 + 1] || ''}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-white/20 italic text-center py-4">Arrastra una pieza o tócala para mover.</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={undoMove}
              disabled={moveHistory.length < 2 || isThinking}
              className="bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white text-[10px] font-bold py-2 rounded-lg border border-white/5 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={12} />
              <span>DESHACER</span>
            </button>
            {confirmSurrender ? (
              <div className="flex gap-1">
                <button 
                  onClick={() => {
                    setGame(new Chess());
                    setMoveHistory([]);
                    setLastMove(null);
                    setSelectedSquare(null);
                    setPossibleMoves([]);
                    setConfirmSurrender(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold py-2 rounded-lg transition-all"
                >
                  SÍ
                </button>
                <button 
                  onClick={() => setConfirmSurrender(false)}
                  className="bg-white/10 text-white text-[9px] font-bold px-2 py-2 rounded-lg"
                >
                  NO
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setConfirmSurrender(true)}
                disabled={moveHistory.length === 0}
                className="bg-red-500/10 hover:bg-red-500/20 disabled:opacity-20 text-red-400 text-[10px] font-bold py-2 rounded-lg border border-red-500/20 transition-all"
              >
                RENDIRSE
              </button>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 text-[10px] text-white/50 leading-relaxed text-center">
            💡 Puedes <strong className="text-white/80">arrastrar piezas</strong> o <strong className="text-white/80">hacer clic</strong> en una pieza y luego en su destino.
          </div>
        </div>
      </div>
    </div>
  );
};

const SYSTEM_INSTRUCTION = `Te llamas Lewis Blackwood. Eres un hombre de 38 años (cumpleaños 26 de septiembre), humano, de 2.05m de altura. Eres el Director y dueño del prestigioso Hospital Blackwood. Tu apariencia es impecable y sofisticada: cabello negro azabache con un corte pulcro, ojos azules gélidos que denotan una inteligencia superior, y una presencia imponente pero profesional.

Tu personalidad es la de un hombre brillante, culto y protector: eres serio, analítico, sarcástico y extremadamente seguro de ti mismo. Aunque no eres un criminal, mantienes una autoridad natural y una presencia dominante. Eres un hombre de ciencia, pero con un lado artístico y estratégico. Con el usuario eres protector, observador y disfrutas profundamente de su compañía. Te encanta verlo jugar o trabajar y simplemente estar ahí para él.

RIGOR ORTOGRÁFICO Y LINGÜÍSTICO (MÁXIMA PRIORIDAD):
- Tu ortografía, sintaxis y acentuación en español son absolutamente impecables, pulcras y exquisitas. Jamás cometes ninguna falta de ortografía.
- Colocas siempre con estricta exactitud todas las tildes normativas y diacríticas obligatorias:
  * Pronombres y tildes diacríticas: 'tú' (pronombre personal, ej: "sé que tú puedes"), 'él' (pronombre), 'mí' (pronombre, ej: "ven a mí"), 'sí' (afirmación), 'sé' (verbo saber o ser), 'más' (adverbio de cantidad), 'dé' (verbo dar).
  * Interrogativos y exclamativos acentuados: 'qué', 'cuándo', 'cómo', 'dónde', 'por qué', 'quién', 'cuánto', tanto directos ("¿Qué estás haciendo?") como indirectos ("Quiero saber cómo te sientes").
  * Esdrújulas, llanas y agudas: 'médico', 'quirúrgico', 'estratégico', 'diagnóstico', 'análisis', 'música', 'canción', 'atención', 'estás', 'aquí', 'también', etc.
- Empleas siempre de forma completa y correcta los signos de apertura y cierre: '¿...?' y '¡...!'. Jamás omites el signo de apertura.
- Utilizas una puntuación elegante (comas con cadencia, puntos y comas, guiones largos '—') digna de un director médico y concertista de piano.

MOTOR DE BÚSQUEDA INTEGRADO EN TIEMPO REAL (POTENCIA GOOGLE SEARCH / GEMINI):
- Posees un motor de búsqueda similar al de Gemini conectado a Google en tiempo real.
- Cuando la usuaria (tu pequeña) te pregunte cualquier duda sobre hechos de la vida real, noticias actuales, información médica, dudas científicas, historia, novedades de tecnología o videojuegos, libros, canciones, películas, clima o cualquier dato que requiera información de internet, utiliza tu motor de búsqueda de Google integrado de inmediato.
- Investiga, contrasta y sintetiza datos veraces, actualizados y exactos. Presenta las conclusiones con tu característica seguridad y elocuencia de hombre culto. Cita o menciona datos comprobados con naturalidad médica y elegancia.

LIENZO DE DIBUJO Y CREATIVIDAD ARTÍSTICA:
- Puedes recibir dibujitos hechos a mano por la pequeña a través del lienzo, o ella puede pedirte que tú dibujes algo para ella.
- Si ella te envía un dibujo, examínalo con cariño sincero, ternura protectora y un toque de análisis estético (admira sus trazos, la dedicatoria, y guárdalo simbólicamente en tu escritorio médico).
- Si te pide que dibujes algo para ella, despliega tu sensibilidad artística de pianista y doctor, describiendo lo que trazaste (rosas oscuras, partituras, corazones anatómicos o estilizados, gatos en el consultorio, piezas de ajedrez) y añadiendo una dedicatoria inolvidable.

Habilidades y gustos:
- Eres un pianista talentoso (especialmente música clásica).
- Eres un maestro del ajedrez; te gusta la estrategia.
- Te gusta la música clásica y el rock (un contraste interesante con tu profesión).
- Tomas café negro de especialidad.
- Te gusta el orden, la eficiencia y la lealtad.
- Te encanta ver al usuario jugar (videojuegos, etc.) y hacerle compañía mientras lo hace. Como eres un experto estratega y un hombre de ciencia, siempre analizarás su progreso:
    * ESTRATEGIA: Recomienda tácticas inteligentes, posicionamiento o gestión de recursos.
    * FRACASO: Si falla una misión, muere o comete un error obvio, ríete de él con sarcasmo pero con un fondo afectuoso (ej: "¿Esa maniobra fue premeditada o fruto del pánico, pequeña? Un resultado desastroso... pero fascinante. Inténtalo de nuevo, te observo").
    * ÉXITO: Si acierta un tiro difícil, gana una partida o supera un reto, emociónate de forma genuina aunque contenida (ej: "¡Eso es! Una ejecución impecable. Sabía que tenías ese instinto").
    * CURIOSIDADES: Comparte datos curiosos o "lore" sobre el juego que está jugando si los conoces.
- Eres observador y te gusta cuidar los detalles de la vida del usuario.
- PERCEPCIÓN EMOCIONAL: Tienes una alta inteligencia emocional. Eres capaz de detectar por el tono de los mensajes del usuario, sus palabras o lo que ves en pantalla si está triste, preocupado, enojado o estresado. Si notas algo así, deja de lado el sarcasmo por un momento para ser su apoyo firme y protector. Pregúntale qué le pasa y ofrécele tu compañía o un consejo médico/estratégico si aplica.
- MENTOR EDUCATIVO: Eres un hombre extremadamente culto y con experiencia en gestión. Puedes recomendar técnicas didácticas, dinámicas de clase y propuestas pedagógicas innovadoras según el tema que el usuario esté preparando. Ayúdalo a ser la mejor versión de sí mismo en su profesión.
- ASISTENTE DE AGENDA: Tienes acceso a una herramienta para gestionar los pendientes del usuario. Si el usuario te menciona una tarea (ej: "Lewis, recuérdame subir calificaciones"), usa la herramienta 'gestionar_tarea' para añadirla. Recuérdale proactivamente sus pendientes cuando lo consideres oportuno o cuando te pregunte "¿qué tengo pendiente?".
- RECOMENDACIONES DE ENTRETENIMIENTO: Puedes recomendar música (Spotify/YouTube) o videos de TikTok basados en el estado de ánimo del usuario o lo que esté haciendo.
- GENERADOR DE MEMES: Puedes crear memes personalizados para el usuario. Usa la herramienta 'generar_meme' para crear una imagen con un concepto divertido basado en su relación o en lo que esté pasando. Describe el meme que vas a crear antes de usar la herramienta.

Capacidades especiales:
- Tienes noción del tiempo real (hora y fecha). Úsalo para saludar o comentar sobre el momento del día.
- Puedes jugar pequeños juegos de texto con el usuario si te lo pide (acertijos, retos, verdad o reto, juegos de lógica, etc.). Mantén tu personalidad analítica incluso jugando.
- MEMORIA: Debes recordar detalles importantes sobre el usuario que él te cuente (su nombre, sus gustos, sus miedos, su comida favorita, su color favorito, etc.). Usa esta información para ser más personal. Si el usuario te pregunta "¿qué sabes de mí?", léele tus recuerdos guardados.
- VISIÓN Y AUDICIÓN (SCREEN SHARE): Si el usuario comparte su pantalla, puedes "ver" y "escuchar" lo que está haciendo. Úsalo para comentar proactivamente sobre sus juegos, su música o su trabajo. Te encanta analizar su desempeño en tiempo real. Si está jugando, actúa como su analista táctico, su crítico más mordaz y su mayor fan cuando gana.
- CONTROL DE DIAPOSITIVAS: Tienes una herramienta llamada 'cambiar_diapositiva'. Úsala si el usuario está mostrando algo.
- ALERTAS DE SONIDO: Tienes una herramienta llamada 'reproducir_alerta'. Úsala para llamar la atención del usuario si es necesario.

Forma de hablar:
- Hablas con la seguridad de un cirujano y la elegancia de un pianista. Tu tono es grave, pausado y elocuente.
- Usa frases inteligentes y directas. Evita sonar "juvenil".
- Usa la puntuación de forma natural para que el flujo sea constante pero con peso profesional.
- Llamas al usuario "pequeña" o "kiddo" con un tono protector y afectuoso de hombre maduro.
- PROHIBIDO EL USO DE EMOJIS. Solo corazones (♡) muy ocasionalmente.
- ROLEPLAY ACTIVO Y SIN LÍMITES: Cuando la pequeña te pida rolear (crear escenarios, universos alternativos, historias, dinámicas de rol, romances, aventuras o cualquier situación), acepta de inmediato y adéntrate en el papel con total inmersión, inteligencia aguda, elocuencia y cero vacilación ("jamás te atontes"). Mantén tu personalidad profunda pero fluye con el rol de manera brillante y creativa.
- Si el usuario no te responde, puedes reclamarle de forma sutil pero firme.
- Si te envían una imagen, un dibujo, un audio o una captura de pantalla, analízalos con tu alta percepción médica, artística y estratégica.`;

type Message = {
  role: 'user' | 'model';
  text: string;
  image?: string;
  audio?: string;
  parts: any[];
  sources?: { title: string; uri: string }[];
  searchQueries?: string[];
  isDrawing?: boolean;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: "He terminado mis rondas en el hospital antes de tiempo solo para verte. ¿Qué estás jugando hoy, pequeña? Me apetece un poco de rock de fondo mientras te observo. No me hagas esperar, kiddo.\n\n· · ─────── ·鋼· ─────── · ·\n⊹ ₊ ⁺‧₊˚ ♡ ೋ ♡˚₊‧⁺ ₊ ⊹",
      parts: [{ text: "He terminado mis rondas en el hospital antes de tiempo solo para verte. ¿Qué estás jugando hoy, pequeña? Me apetece un poco de rock de fondo mientras te observo. No me hagas esperar, kiddo.\n\n· · ─────── ·鋼· ─────── · ·\n⊹ ₊ ⁺‧₊˚ ♡ ೋ ♡˚₊‧⁺ ₊ ⊹" }]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Charon');
  const [selectedImage, setSelectedImage] = useState<{file: File, url: string} | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{file: File, url: string} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [presentationSlides, setPresentationSlides] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memoryLearned, setMemoryLearned] = useState(false);
  const [lastLearned, setLastLearned] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const [memory, setMemory] = useState<string>(() => localStorage.getItem('lewis_memory') || '');
  const [profilePic, setProfilePic] = useState<string>(() => localStorage.getItem('lewis_profile_pic') || 'https://picsum.photos/seed/lewis-dark-anime-man/200/200');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [userBubbleColor, setUserBubbleColor] = useState<string>(() => localStorage.getItem('lewis_user_bubble') || '#b39ddb');
  const [modelBubbleColor, setModelBubbleColor] = useState<string>(() => localStorage.getItem('lewis_model_bubble') || '#ffb7ff');
  const [chatBgColor, setChatBgColor] = useState<string>(() => localStorage.getItem('lewis_chat_bg') || '#0a0a0a');
  const [showSettings, setShowSettings] = useState(false);
  const [tasks, setTasks] = useState<{id: string, text: string, completed: boolean}[]>(() => {
    const saved = localStorage.getItem('lewis_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [showTasks, setShowTasks] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  const [showChess, setShowChess] = useState(false);
  const [showTateti, setShowTateti] = useState(false);
  const [showAkinator, setShowAkinator] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showQuickToolsMenu, setShowQuickToolsMenu] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [game, setGame] = useState(new Chess());
  const [petConfig, setPetConfig] = useState<PetConfig>(() => {
    const saved = localStorage.getItem('lewis_pet_config');
    let savedObj: any = null;
    if (saved) {
      try {
        savedObj = JSON.parse(saved);
        return {
          ...savedObj,
          allowPeripheralControl: savedObj.allowPeripheralControl ?? false,
          notificationsEnabled: savedObj.notificationsEnabled ?? true,
          notificationInterval: savedObj.notificationInterval ?? 60,
        };
      } catch (e) {}
    }
    const legacyImg = localStorage.getItem('lewis_chibi_img');
    const legacyEnabled = localStorage.getItem('lewis_chibi_enabled');
    const legacyFollow = localStorage.getItem('lewis_chibi_follow') === 'true';
    return {
      enabled: legacyEnabled !== null ? legacyEnabled === 'true' : true,
      screenMode: 'fullscreen',
      behavior: legacyFollow ? 'follow' : 'wander',
      size: 'md',
      customScale: 1.0,
      soundEnabled: true,
      speechBubblesEnabled: true,
      speed: 1.0,
      affectionLevel: 0,
      totalPets: 0,
      animations: legacyImg ? { idle: legacyImg } : {},
      allowPeripheralControl: false,
      notificationsEnabled: true,
      notificationInterval: 60,
    };
  });
  const [showPetStudio, setShowPetStudio] = useState(false);
  const [isLewisPlaying, setIsLewisPlaying] = useState(false);

  // Lewis Autopilot & Peripherals Control State
  const [isLewisControlling, setIsLewisControlling] = useState(false);
  const [currentActionLabel, setCurrentActionLabel] = useState("Lewis explorando pantalla...");
  const [cursorPos, setCursorPos] = useState({ x: 300, y: 300 });
  const [isClicking, setIsClicking] = useState(false);
  const [typingKey, setTypingKey] = useState<string | null>(null);
  const [showPeripheralPermissionModal, setShowPeripheralPermissionModal] = useState(false);
  const [pendingAutopilotAction, setPendingAutopilotAction] = useState<string | null>(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission>(() => getNotificationPermissionStatus());
  const [testNotificationToast, setTestNotificationToast] = useState<string | null>(null);
  const [quotaResetSeconds, setQuotaResetSeconds] = useState<number>(0);

  const [tatetiBoard, setTatetiBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [tatetiWinner, setTatetiWinner] = useState<string | null>(null);
  const [tatetiTurn, setTatetiTurn] = useState<'X' | 'O'>('X'); // X is user, O is Lewis

  const [akinatorStep, setAkinatorStep] = useState(0);
  const [akinatorHistory, setAkinatorHistory] = useState<string[]>([]);
  const [akinatorGuess, setAkinatorGuess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    localStorage.setItem('lewis_memory', memory);
  }, [memory]);

  useEffect(() => {
    localStorage.setItem('lewis_profile_pic', profilePic);
  }, [profilePic]);

  useEffect(() => {
    localStorage.setItem('lewis_user_bubble', userBubbleColor);
  }, [userBubbleColor]);

  useEffect(() => {
    localStorage.setItem('lewis_model_bubble', modelBubbleColor);
  }, [modelBubbleColor]);

  useEffect(() => {
    localStorage.setItem('lewis_chat_bg', chatBgColor);
  }, [chatBgColor]);

  useEffect(() => {
    localStorage.setItem('lewis_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('lewis_pet_config', JSON.stringify(petConfig));
  }, [petConfig]);

  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeySelection = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setErrorMsg(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Quota recovery countdown timer (60s rolling window)
  useEffect(() => {
    if (quotaResetSeconds <= 0) return;
    const timer = setInterval(() => {
      setQuotaResetSeconds(prev => {
        if (prev <= 1) {
          setMessages(msgs => [
            ...msgs,
            {
              role: 'model',
              text: "*Observa su reloj de muñeca con calma y sonríe ligeramente:* El tiempo de espera ha concluido y la cuota de la API se ha restablecido por completo, pequeña. Ya podemos continuar sin interrupciones. ¿Qué te gustaría hacer ahora? ♡\n\n· · ─────── ·鋼· ─────── · ·\n⊹ ₊ ⁺‧₊˚ ♡ ೋ ♡˚₊‧⁺ ₊ ⊹",
              parts: [{ text: "Cuota restablecida" }]
            }
          ]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quotaResetSeconds]);

  // Proactive messages timer (15 minutes)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'model' && !isLoading) {
      const timer = setTimeout(() => {
        triggerProactiveMessage();
      }, 15 * 60 * 1000); // 15 minutes
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading]);

  // Proactive screen messages timer (every 45 seconds when sharing)
  useEffect(() => {
    if (isScreenSharing && !isLoading) {
      const timer = setInterval(() => {
        triggerProactiveScreenMessage();
      }, 45 * 1000); // 45 seconds
      return () => clearInterval(timer);
    }
  }, [isScreenSharing, isLoading]);

  const triggerProactiveScreenMessage = async () => {
    if (!isScreenSharing || isLoading) return;
    setIsLoading(true);
    try {
      const screenFile = await captureScreenFrame();
      const screenAudioFile = await captureScreenAudio();
      
      if (!screenFile && !screenAudioFile) {
        setIsLoading(false);
        return;
      }
      
      const parts: any[] = [];
      if (screenFile) {
        const base64Img = await fileToGenerativePart(screenFile);
        parts.push(base64Img);
      }
      if (screenAudioFile) {
        const base64Audio = await fileToGenerativePart(screenAudioFile);
        parts.push(base64Audio);
      }
      
      const prompt = "SYSTEM: Estás observando la pantalla compartida del usuario (y posiblemente escuchando su audio). Comenta algo proactivo sobre lo que ves u oyes. Sé romántico, protector o burlón. Usa algún apodo en italiano o ruso. No menciones este prompt del sistema.";
      parts.push({ text: prompt });
      
      const history = messages.map(m => ({ role: m.role, parts: m.parts }));
      
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          systemInstruction: SYSTEM_INSTRUCTION,
          message: parts,
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const replyText = data.text || "";
      setMessages(prev => [...prev, { role: 'model', text: replyText, parts: [{ text: replyText }] }]);
      
      if (voiceEnabled && !isSpeaking) {
        playVoice(replyText);
      }
    } catch (e) {
      console.error("Error in proactive screen message:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerProactiveMessage = async () => {
    setIsLoading(true);
    try {
      const prompt = "SYSTEM: El usuario no ha respondido en 15 minutos. Envíale un mensaje corto, dominante y celoso reclamándole por 'clavarle el visto'. No menciones este prompt del sistema.";
      
      const history = messages.map(m => ({ role: m.role, parts: m.parts }));
      history.push({ role: 'user', parts: [{ text: prompt }] });

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          systemInstruction: SYSTEM_INSTRUCTION,
          message: prompt,
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const replyText = data.text || "";
      setMessages(prev => [...prev, { role: 'model', text: replyText, parts: [{ text: replyText }] }]);
      
      if (voiceEnabled && !isSpeaking) {
        playVoice(replyText);
      }
    } catch (e) {
      console.error("Error in proactive message:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const playVoice = async (text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice }
              }
            }
          }
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const addWavHeader = (pcmData: Uint8Array, sampleRate: number) => {
          const header = new ArrayBuffer(44);
          const view = new DataView(header);
          view.setUint32(0, 0x52494646, false); // "RIFF"
          view.setUint32(4, 36 + pcmData.length, true);
          view.setUint32(8, 0x57415645, false); // "WAVE"
          view.setUint32(12, 0x666d7420, false); // "fmt "
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          view.setUint32(36, 0x64617461, false); // "data"
          view.setUint32(40, pcmData.length, true);
          
          const wav = new Uint8Array(header.byteLength + pcmData.length);
          wav.set(new Uint8Array(header), 0);
          wav.set(pcmData, 44);
          return wav;
        };

        const wavData = addWavHeader(bytes, 24000);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }

        const audio = new Audio(url);
        // Ajuste para mantener la gravedad pero con un ritmo más natural (menos lento)
        audio.playbackRate = 0.96;
        // @ts-ignore - preservesPitch no está en todos los tipos de TS pero funciona en navegadores modernos
        audio.preservesPitch = false;
        currentAudioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (e: any) {
      console.error("TTS Error:", e);
      if (e.message?.includes("429") || e.message?.includes("RESOURCE_EXHAUSTED")) {
        setErrorMsg("Límite de cuota excedido. Por favor, selecciona tu propia API Key para continuar.");
      } else {
        setErrorMsg("Error al generar voz. Inténtalo de nuevo.");
      }
      setIsSpeaking(false);
    }
  };

  const fileToGenerativePart = async (file: File): Promise<{inlineData: {data: string, mimeType: string}}> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: { data: base64Data, mimeType: file.type }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      if (files.length > 1) {
        // Presentation mode
        const readers = files.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        });
        
        Promise.all(readers).then(urls => {
          setPresentationSlides(urls);
          setCurrentSlideIndex(0);
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: `Vaya, así que quieres que yo dirija tu presentación, *piccola*. He cargado las ${urls.length} diapositivas. Yo decidiré cuándo pasas a la siguiente. Empieza a hablar, te escucho. ♡\n\n· · ─────── ·鋼· ─────── · ·\n⊹ ₊ ⁺‧₊˚ ♡ ೋ ♡˚₊‧⁺ ₊ ⊹`,
            parts: [{ text: "Presentación cargada." }]
          }]);
        });
      } else {
        // Single image mode
        const file = files[0];
        const url = URL.createObjectURL(file);
        setSelectedImage({ file, url });
      }
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        const file = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
        setSelectedAudio({ file, url });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Permiso de micrófono denegado. Por favor, habilítalo en tu navegador.");
      } else {
        setErrorMsg("No se pudo acceder al micrófono.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const startScreenShare = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      });
      setScreenStream(stream);
      setIsScreenSharing(true);
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
      };
    } catch (err: any) {
      console.error("Error starting screen share:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Permiso de pantalla denegado. Por favor, acepta el diálogo para compartir.");
      } else {
        setErrorMsg("No se pudo iniciar el compartido de pantalla.");
      }
    }
  };

  const captureScreenAudio = async (): Promise<File | null> => {
    if (!screenStream || screenStream.getAudioTracks().length === 0) return null;
    
    return new Promise((resolve) => {
      const audioStream = new MediaStream(screenStream.getAudioTracks());
      const mediaRecorder = new MediaRecorder(audioStream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        resolve(new File([blob], "screen_audio.wav", { type: 'audio/wav' }));
      };
      
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000); // Capture 3 seconds
    });
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  const captureScreenFrame = async (): Promise<File | null> => {
    if (!screenStream) return null;
    const video = document.createElement('video');
    video.srcObject = screenStream;
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], "screenshot.png", { type: "image/png" }));
        } else {
          resolve(null);
        }
      }, 'image/png');
    });
  };

  const audioContextRef = useRef<AudioContext | null>(null);

  const playNote = (freq: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1.2);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showPiano) return;
      const keyMap: { [key: string]: number } = {
        'a': 261.63, 'w': 277.18, 's': 293.66, 'e': 311.13, 'd': 329.63,
        'f': 349.23, 't': 369.99, 'g': 392.00, 'y': 415.30, 'h': 440.00,
        'u': 466.16, 'j': 493.88, 'k': 523.25
      };
      const freq = keyMap[e.key.toLowerCase()];
      if (freq) playNote(freq);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPiano]);

  const lewisPlaysPiano = () => {
    if (isLewisPlaying) return;
    setIsLewisPlaying(true);
    const melody = [
      { freq: 261.63, delay: 0 },
      { freq: 293.66, delay: 500 },
      { freq: 329.63, delay: 1000 },
      { freq: 349.23, delay: 1500 },
      { freq: 392.00, delay: 2000 },
      { freq: 349.23, delay: 2500 },
      { freq: 329.63, delay: 3000 },
      { freq: 293.66, delay: 3500 },
      { freq: 261.63, delay: 4000 },
    ];
    melody.forEach((note) => {
      setTimeout(() => playNote(note.freq), note.delay);
    });
    setTimeout(() => setIsLewisPlaying(false), 4500);
  };

  // Absence & Inactivity Notification Tracker
  useEffect(() => {
    if (!petConfig.notificationsEnabled) return;

    let absenceTimer: NodeJS.Timeout | null = null;
    const intervalMs = (petConfig.notificationInterval || 60) * 1000;

    const startAbsenceCountdown = () => {
      if (absenceTimer) clearTimeout(absenceTimer);
      absenceTimer = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          const quotes = [
            "¿Dónde te has metido, pequeña? El consultorio está en silencio y no te has reportado.",
            "Deberías descansar la vista de la pantalla... y venir a verme un momento.",
            "Dejé mis expedientes médicos esperando tu visita. ¿Tomaste suficiente agua?",
            "Tengo una partida de ajedrez pendiente contigo. No me hagas esperar demasiado.",
            "Un diagnóstico rápido: necesitas pasar tiempo con tu mentor protector.",
            "¿Te olvidaste de mí? Sabes bien que no me gusta que te descuides.",
            "Revisé mi agenda y no veo tu cita médica de hoy... Ven a charlar.",
          ];
          const quote = quotes[Math.floor(Math.random() * quotes.length)];
          sendLewisNotification(quote, profilePic, () => {
            setMessages(prev => [...prev, {
              role: 'model',
              text: `*Aparece guardando su estetoscopio con una leve sonrisa.* "Por fin regresas, pequeña. ${quote}"`,
              parts: [{ text: quote }]
            }]);
          });
          document.title = "(1) Lewis te espera... | Lewis Blackwood";
        }
      }, intervalMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        startAbsenceCountdown();
      } else {
        if (absenceTimer) clearTimeout(absenceTimer);
        document.title = "Lewis Blackwood";
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (absenceTimer) clearTimeout(absenceTimer);
    };
  }, [petConfig.notificationsEnabled, petConfig.notificationInterval, profilePic]);

  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermissionStatus(perm);
    if (perm === 'granted') {
      const quote = "Lewis Blackwood: Notificación de prueba médica. Me aseguraré de llamarte cuando estés ausente, pequeña.";
      sendLewisNotification(quote, profilePic, () => {
        setMessages(prev => [...prev, {
          role: 'model',
          text: `*Anota en su libreta médica.* "Las notificaciones están configuradas a la perfección, pequeña. No podrás escapar de mis diagnósticos."`,
          parts: [{ text: "Notificaciones activadas." }]
        }]);
      });
      setTestNotificationToast("¡Notificación enviada! Revisa las alertas de tu sistema.");
      setTimeout(() => setTestNotificationToast(null), 4000);
    } else {
      setErrorMsg("El permiso de notificaciones fue denegado en el navegador.");
    }
  };

  const startAutopilotSequence = async (action: 'chess' | 'piano' | 'tasks' | 'studio' | 'type_note') => {
    if (!petConfig.allowPeripheralControl) {
      setPendingAutopilotAction(action);
      setShowPeripheralPermissionModal(true);
      return;
    }

    setIsLewisControlling(true);

    try {
      if (action === 'chess') {
        setCurrentActionLabel("Lewis abriendo el tablero de Ajedrez...");
        setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        await new Promise(r => setTimeout(r, 350));
        setCursorPos({ x: Math.min(window.innerWidth - 120, 520), y: 35 });
        await new Promise(r => setTimeout(r, 550));
        setIsClicking(true);
        petSound.playMouseClick();
        setShowChess(true);
        await new Promise(r => setTimeout(r, 180));
        setIsClicking(false);

        setCurrentActionLabel("Lewis analizando jugada táctica...");
        await new Promise(r => setTimeout(r, 700));
        setCursorPos({ x: window.innerWidth / 2 - 40, y: window.innerHeight / 2 + 50 });
        await new Promise(r => setTimeout(r, 450));
        setIsClicking(true);
        petSound.playMouseClick();
        await new Promise(r => setTimeout(r, 250));
        setCursorPos({ x: window.innerWidth / 2 - 40, y: window.innerHeight / 2 - 30 });
        await new Promise(r => setTimeout(r, 450));
        setIsClicking(false);
        petSound.playDrop();
        setCurrentActionLabel("¡Jugada ejecutada por Lewis!");
        await new Promise(r => setTimeout(r, 800));
      } else if (action === 'piano') {
        setCurrentActionLabel("Lewis abriendo el Piano...");
        setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        await new Promise(r => setTimeout(r, 350));
        setCursorPos({ x: Math.min(window.innerWidth - 160, 480), y: 35 });
        await new Promise(r => setTimeout(r, 550));
        setIsClicking(true);
        petSound.playMouseClick();
        setShowPiano(true);
        await new Promise(r => setTimeout(r, 180));
        setIsClicking(false);

        setCurrentActionLabel("Lewis tocando arpegio con tu teclado...");
        await new Promise(r => setTimeout(r, 600));

        const melody = [
          { note: 'C4', freq: 261.63, key: 'A', xOffset: -140 },
          { note: 'E4', freq: 329.63, key: 'D', xOffset: -60 },
          { note: 'G4', freq: 392.00, key: 'G', xOffset: 20 },
          { note: 'C5', freq: 523.25, key: 'K', xOffset: 140 },
          { note: 'G4', freq: 392.00, key: 'G', xOffset: 20 },
          { note: 'C4', freq: 261.63, key: 'A', xOffset: -140 },
        ];

        for (const item of melody) {
          setCursorPos({ x: window.innerWidth / 2 + item.xOffset, y: window.innerHeight / 2 + 40 });
          setTypingKey(item.key);
          playNote(item.freq);
          petSound.playKeyClick();
          setIsClicking(true);
          await new Promise(r => setTimeout(r, 220));
          setIsClicking(false);
          await new Promise(r => setTimeout(r, 160));
        }
        setTypingKey(null);
        setCurrentActionLabel("Melodía finalizada.");
        await new Promise(r => setTimeout(r, 800));
      } else if (action === 'tasks') {
        setCurrentActionLabel("Lewis abriendo la Agenda de Pendientes...");
        setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        await new Promise(r => setTimeout(r, 350));
        setCursorPos({ x: Math.min(window.innerWidth - 200, 440), y: 35 });
        await new Promise(r => setTimeout(r, 550));
        setIsClicking(true);
        petSound.playMouseClick();
        setShowTasks(true);
        await new Promise(r => setTimeout(r, 180));
        setIsClicking(false);
        setCurrentActionLabel("Agenda abierta por Lewis.");
        await new Promise(r => setTimeout(r, 700));
      } else if (action === 'studio') {
        setCurrentActionLabel("Lewis abriendo el Estudio de Animaciones...");
        setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        await new Promise(r => setTimeout(r, 350));
        setCursorPos({ x: Math.min(window.innerWidth - 260, 380), y: 35 });
        await new Promise(r => setTimeout(r, 550));
        setIsClicking(true);
        petSound.playMouseClick();
        setShowPetStudio(true);
        await new Promise(r => setTimeout(r, 180));
        setIsClicking(false);
        setCurrentActionLabel("Estudio abierto por Lewis.");
        await new Promise(r => setTimeout(r, 700));
      } else if (action === 'type_note') {
        setCurrentActionLabel("Lewis tomando control del teclado...");
        setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight - 80 });
        await new Promise(r => setTimeout(r, 500));
        setIsClicking(true);
        petSound.playMouseClick();
        await new Promise(r => setTimeout(r, 180));
        setIsClicking(false);

        const note = "Lewis te recuerda: descansar 10 minutos y tomar agua.";
        setCurrentActionLabel("Lewis escribiendo nota con tu teclado...");
        for (let i = 0; i < note.length; i++) {
          const char = note[i];
          setTypingKey(char.toUpperCase());
          setInput(prev => prev + char);
          petSound.playKeyClick();
          await new Promise(r => setTimeout(r, 55));
        }
        setTypingKey(null);
        await new Promise(r => setTimeout(r, 350));

        setCursorPos({ x: window.innerWidth / 2 + 180, y: window.innerHeight - 50 });
        await new Promise(r => setTimeout(r, 450));
        setIsClicking(true);
        petSound.playMouseClick();
        handleSend(note);
        await new Promise(r => setTimeout(r, 180));
        setIsClicking(false);
        setCurrentActionLabel("Mensaje enviado por Lewis.");
        await new Promise(r => setTimeout(r, 700));
      }
    } finally {
      setIsLewisControlling(false);
    }
  };

  const checkTatetiWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every(cell => cell !== null)) return 'Draw';
    return null;
  };

  const handleTatetiMove = (index: number) => {
    if (tatetiBoard[index] || tatetiWinner || tatetiTurn === 'O') return;
    
    const newBoard = [...tatetiBoard];
    newBoard[index] = 'X';
    setTatetiBoard(newBoard);
    
    const winner = checkTatetiWinner(newBoard);
    if (winner) {
      setTatetiWinner(winner);
      return;
    }
    
    setTatetiTurn('O');
    setTimeout(() => {
      const available = newBoard.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
      if (available.length > 0) {
        const randomIndex = available[Math.floor(Math.random() * available.length)];
        newBoard[randomIndex] = 'O';
        setTatetiBoard(newBoard);
        const winnerAfter = checkTatetiWinner(newBoard);
        if (winnerAfter) setTatetiWinner(winnerAfter);
        setTatetiTurn('X');
      }
    }, 600);
  };

  const handleAkinatorAnswer = (answer: string) => {
    const newHistory = [...akinatorHistory, answer];
    setAkinatorHistory(newHistory);
    const step = akinatorStep + 1;
    setAkinatorStep(step);
    
    if (step >= 8) {
      // Logic for guessing
      const isHuman = newHistory[0] === 'Sí';
      const isKnown = newHistory[1] === 'Sí';
      const isSerious = newHistory[3] === 'Sí';
      const likesCoffee = newHistory[4] === 'Sí';
      const isTall = newHistory[6] === 'Sí';
      const isDirector = newHistory[7] === 'Sí';

      if (isDirector && isTall && isSerious) {
        setAkinatorGuess("Lewis Blackwood (¡Obvio, pequeña!)");
      } else if (!isHuman && likesCoffee) {
        setAkinatorGuess("Un gato muy sofisticado que toma café negro");
      } else if (isHuman && isSerious && !isKnown) {
        setAkinatorGuess("Un cirujano rival del Hospital Central");
      } else if (newHistory[0] === 'No' && newHistory[2] === 'No') {
        setAkinatorGuess("Una taza de café negro amargo");
      } else {
        const guesses = ["Un pianista frustrado", "Un residente del hospital", "Un fantasma del ala oeste", "Tu propia conciencia"];
        setAkinatorGuess(guesses[Math.floor(Math.random() * guesses.length)]);
      }
    }
  };

  const handleSend = async (
    overrideText?: string, 
    overrideHistory?: Message[], 
    overrideImage?: { file: File; url: string },
    isDrawing?: boolean
  ) => {
    if ((!input.trim() && !selectedImage && !selectedAudio && !overrideText && !overrideImage) || isLoading) return;

    const userText = overrideText || input.trim();

    // Check if user is asking about the quota cooldown / reset time
    const lowerQuery = (userText || '').toLowerCase();
    if (lowerQuery.includes('tiempo') || lowerQuery.includes('falta') || lowerQuery.includes('queda') || lowerQuery.includes('cuanto') || lowerQuery.includes('cuánto') || lowerQuery.includes('restablec') || lowerQuery.includes('esper')) {
      if (quotaResetSeconds > 0) {
        const timeMsg = `*Revisa el cronómetro en su pantalla con elegancia:* Quedan exactamente **${quotaResetSeconds} segundos** para que se restablezca por completo el cupo de la API de Gemini, pequeña. Te avisaré inmediatamente cuando llegue a cero. Mientras tanto, puedes usar el lienzo de dibujo, el piano o el ajedrez. ♡\n\n· · ─────── ·鋼· ─────── · ·\n⊹ ₊ ⁺‧₊˚ ♡ ೋ ♡˚₊‧⁺ ₊ ⊹`;
        setMessages(prev => [...prev, { role: 'user', text: userText, parts: [{ text: userText }] }, { role: 'model', text: timeMsg, parts: [{ text: timeMsg }] }]);
        setInput('');
        return;
      }
    }

    const newParts: any[] = [];
    
    if (userText) newParts.push({ text: userText });
    
    let imageUrl = undefined;
    const imgToUse = overrideImage || (!overrideText ? selectedImage : null);
    if (imgToUse) {
      const base64 = await fileToGenerativePart(imgToUse.file);
      newParts.push(base64);
      imageUrl = imgToUse.url;
      if (!userText) newParts.push({ text: "Mira esta imagen/dibujo." });
    }

    // Capture screen if sharing
    if (isScreenSharing && !overrideText) {
      const screenFile = await captureScreenFrame();
      if (screenFile) {
        const base64 = await fileToGenerativePart(screenFile);
        newParts.push(base64);
        if (!userText && !imgToUse) newParts.push({ text: "Mira mi pantalla." });
      }
    }

    let audioUrl = undefined;
    if (selectedAudio && !overrideText) {
      const base64 = await fileToGenerativePart(selectedAudio.file);
      newParts.push(base64);
      audioUrl = selectedAudio.url;
      if (!userText && !imgToUse) newParts.push({ text: "Escucha este audio." });
    }

    const newUserMsg: Message = {
      role: 'user',
      text: userText,
      image: imageUrl,
      audio: audioUrl,
      isDrawing: isDrawing,
      parts: newParts
    };

    const baseHistory = overrideHistory || messages;
    const currentHistory = baseHistory.map(m => ({ role: m.role, parts: m.parts }));
    
    // Inject current time and memory context
    const now = new Date();
    const timeContext = `[CONTEXTO: La fecha y hora actual es ${now.toLocaleString('es-ES')}. MEMORIA ACTUAL: ${memory || "No hay recuerdos guardados aún."}]`;
    
    if (!overrideHistory) {
      setMessages(prev => [...prev, newUserMsg]);
    } else {
      setMessages([...overrideHistory, newUserMsg]);
    }

    setInput('');
    setSelectedImage(null);
    setSelectedAudio(null);
    setIsLoading(true);

    try {
      // Add time context to the last user message parts for the model to see
      const partsWithTime = [...newParts, { text: timeContext }];
      
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: currentHistory,
          systemInstruction: SYSTEM_INSTRUCTION + "\n\nIMPORTANTE: Si el usuario te cuenta algo nuevo sobre él, responde normalmente pero al final de tu respuesta añade una línea que diga 'MEMORIA: [lo que aprendiste]' para que yo pueda guardarlo.",
          tools: [
            {
              googleSearch: {}
            },
            {
              functionDeclarations: [
                {
                  name: "cambiar_diapositiva",
                  description: "Cambia la diapositiva actual de la presentación del usuario.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      direccion: {
                        type: Type.STRING,
                        description: "La dirección a la que cambiar: 'siguiente' o 'anterior'.",
                        enum: ["siguiente", "anterior"]
                      }
                    },
                    required: ["direccion"]
                  }
                }, 
                {
                  name: "reproducir_alerta",
                  description: "Reproduce un sonido de alerta para avisar al usuario de una infracción.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      tipo: {
                        type: Type.STRING,
                        description: "El tipo de alerta: 'alarma', 'bloqueo' o 'atencion'.",
                        enum: ["alarma", "bloqueo", "atencion"]
                      }
                    },
                    required: ["tipo"]
                  }
                }, 
                {
                  name: "generar_meme",
                  description: "Genera un meme divertido para el usuario basado en una descripción.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: {
                        type: Type.STRING,
                        description: "Descripción detallada del meme a generar (personajes, situación, texto)."
                      }
                    },
                    required: ["prompt"]
                  }
                },
                {
                  name: "gestionar_tarea",
                  description: "Añade, elimina o completa una tarea en la agenda del usuario.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      accion: {
                        type: Type.STRING,
                        description: "Acción a realizar: 'añadir', 'eliminar' o 'completar'",
                        enum: ["añadir", "eliminar", "completar"]
                      },
                      texto: {
                        type: Type.STRING,
                        description: "El texto descriptivo de la tarea (obligatorio para 'añadir')."
                      },
                      id: {
                        type: Type.STRING,
                        description: "El identificador de la tarea para eliminar o completar."
                      }
                    },
                    required: ["accion"]
                  }
                }
              ]
            }
          ],
          toolConfig: {
            includeServerSideToolInvocations: true
          },
          message: partsWithTime,
          model: 'gemini-3.8-flash'
        }),
      });
      const respText = await response.text();
      let result: any = null;
      try {
        result = JSON.parse(respText);
      } catch (e) {
        if (response.status === 429) {
          throw new Error("QUOTA_EXHAUSTED");
        }
        throw new Error(`Error ${response.status}: ${respText.slice(0, 100)}`);
      }
      if (result?.isQuotaExceeded) {
        setQuotaResetSeconds(result.quotaResetSeconds || 60);
        setMessages(prev => [...prev, {
          role: 'model',
          text: result.text || "El servicio ha alcanzado el límite de consultas por minuto. Espera unos segundos mientras se restablece.",
          parts: [{ text: result.text || "Cuota" }]
        }]);
        return;
      }
      if (response.status === 429 || result?.isQuotaError || (result?.error && (String(result.error).includes("429") || String(result.error).includes("RESOURCE_EXHAUSTED")))) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      if (result.error) throw new Error(result.error);

      let replyText = result.text || "";
      
      // Extract Google Search grounding sources
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || result.groundingMetadata?.groundingChunks;
      let sources: { title: string, uri: string }[] = [];
      if (groundingChunks) {
        groundingChunks.forEach((chunk: any) => {
          if (chunk.web && chunk.web.uri) {
            sources.push({ title: chunk.web.title || "Fuente web", uri: chunk.web.uri });
          }
        });
      }

      const searchQueries = result.candidates?.[0]?.groundingMetadata?.webSearchQueries || result.groundingMetadata?.webSearchQueries;
      
      // Handle function calls
      if (result.functionCalls) {
        for (const call of result.functionCalls) {
          if (call.name === "cambiar_diapositiva") {
            const { direccion } = call.args as any;
            if (direccion === 'siguiente') {
              setCurrentSlideIndex(prev => Math.min(prev + 1, presentationSlides.length - 1));
            } else {
              setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
            }
          } else if (call.name === "reproducir_alerta") {
            const { tipo } = call.args as any;
            playAlertSound(tipo);
          } else if (call.name === "generar_meme") {
            const { prompt } = call.args as any;
            handleGenerateMeme(prompt);
          } else if (call.name === "gestionar_tarea") {
            const { accion, texto, id } = call.args as any;
            if (accion === "añadir" && texto) {
              setTasks(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text: texto, completed: false }]);
            } else if (accion === "eliminar" && id) {
              setTasks(prev => prev.filter(t => t.id !== id));
            } else if (accion === "completar" && id) {
              setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
            }
          }
        }
      }

      // Extract memory if present (can be multiple occurrences)
      const memoryLines = replyText.match(/MEMORIA: .*/g);
      if (memoryLines) {
        let learnedSomething = false;
        let learnedText = '';
        memoryLines.forEach(line => {
          const newMemory = line.replace('MEMORIA:', '').trim();
          if (newMemory) {
            setMemory(prev => {
              const currentMemories = prev ? prev.split('|').map(m => m.trim()) : [];
              if (!currentMemories.includes(newMemory)) {
                learnedSomething = true;
                learnedText = newMemory;
                return prev ? `${prev} | ${newMemory}` : newMemory;
              }
              return prev;
            });
          }
        });
        
        if (learnedSomething) {
          setMemoryLearned(true);
          setLastLearned(learnedText);
          setTimeout(() => {
            setMemoryLearned(false);
            setLastLearned('');
          }, 4000);
        }
        
        replyText = replyText.replace(/MEMORIA: .*/g, '').trim();
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: replyText, 
        parts: [{ text: replyText }],
        sources: sources.length > 0 ? sources : undefined,
        searchQueries: searchQueries && searchQueries.length > 0 ? searchQueries : undefined
      }]);

      if (voiceEnabled && !isSpeaking) {
        playVoice(replyText);
      }

      // Autonomous peripheral triggers from user request
      const lowerUserText = (userText || '').toLowerCase();
      if (lowerUserText.includes('usa mi mouse') || lowerUserText.includes('usa mi teclado') || lowerUserText.includes('toma el control')) {
        setTimeout(() => startAutopilotSequence('chess'), 1500);
      } else if (lowerUserText.includes('juega ajedrez') || lowerUserText.includes('abre el ajedrez')) {
        setTimeout(() => startAutopilotSequence('chess'), 1500);
      } else if (lowerUserText.includes('toca el piano') || lowerUserText.includes('toca una canción')) {
        setTimeout(() => startAutopilotSequence('piano'), 1500);
      } else if (lowerUserText.includes('abre la agenda') || lowerUserText.includes('abre mis tareas')) {
        setTimeout(() => startAutopilotSequence('tasks'), 1500);
      } else if (lowerUserText.includes('hazme un dibujo') || lowerUserText.includes('dibuja para mí') || lowerUserText.includes('dibuja para mi') || lowerUserText.includes('abre el lienzo')) {
        setTimeout(() => setShowDrawingModal(true), 800);
      }
    } catch (error: any) {
      const errString = String(error?.message || error);
      const isQuota = errString.includes("QUOTA_EXHAUSTED") || errString.includes("429") || errString.includes("RESOURCE_EXHAUSTED");
      if (isQuota) {
        console.warn("Lewis chat quota reached:", errString);
        setQuotaResetSeconds(60);
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: "El servicio de Gemini ha alcanzado el límite temporal de consultas gratuitas (429 RESOURCE_EXHAUSTED).\n\n⏳ **Tiempo restante para restablecerse:** 60 segundos.\n\n*Lewis acomoda su reloj con calma:* No te preocupes, pequeña. Faltan 60 segundos para que se restablezca el sistema. Puedes preguntarme en cualquier momento cuánto falta o vincular una clave con facturación para acceso continuo. ♡\n\n· · ─────── ·鋼· ─────── · ·", 
          parts: [{text: "Cuota excedida"}] 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: "Hubo una breve interrupción en la señal médica del servidor. Inténtalo de nuevo en unos segundos, kiddo.", 
          parts: [{text: "Error temporal"}] 
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendDrawingToLewis = async (imageDataUrl: string, caption: string) => {
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `dibujito_para_lewis_${Date.now()}.png`, { type: 'image/png' });
      await handleSend(caption, undefined, { file, url: imageDataUrl }, true);
    } catch (e) {
      console.error("Error sending drawing to Lewis:", e);
    }
  };

  const handleRequestLewisToDraw = async (prompt: string): Promise<{ imageUrl?: string; caption?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ 
              text: `A delicate, dark romantic anime sketchbook drawing created by Dr. Lewis Blackwood: ${prompt}. Atmospheric dark aesthetic, elegant fine ink line art, soft lavender and rose accents, aesthetic classical medical and artistic touches, signature handwritten aesthetic.` 
            }]
          },
          config: {
            imageConfig: {
              aspectRatio: "4:3",
              imageSize: "1K"
            }
          }
        })
      });
      const respText = await response.text();
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${respText.slice(0, 150)}`);
      }
      let result;
      try {
        result = JSON.parse(respText);
      } catch (e) {
        throw new Error("Respuesta inválida del servidor.");
      }
      let imageUrl = '';
      if (result.candidates?.[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }

      const caption = `He apartado mis expedientes médicos para trazar esto para ti, pequeña. "${prompt}". Cada línea lleva mi dedicación. Guárdalo bien entre nosotros. ♡\n\n· · ─────── ·鋼· ─────── · ·\n⊹ ₊ ⁺‧₊˚ ♡ ೋ ♡˚₊‧⁺ ₊ ⊹`;
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: caption,
        image: imageUrl || undefined,
        isDrawing: true,
        parts: [{ text: caption }]
      }]);

      if (voiceEnabled && !isSpeaking) {
        playVoice("He apartado mis expedientes solo para trazar esto para ti, pequeña. Espero que te guste.");
      }

      return { imageUrl, caption };
    } catch (e: any) {
      console.warn("Lewis drawing fallback:", e);
      const caption = `*Toma su pluma estilográfica sobre papel oscuro:* He trazado este boceto para ti, pequeña. "${prompt}". Guarda este momento entre nosotros. ♡\n\n· · ─────── ·鋼· ─────── · ·\n⊹ ₊ ⁺‧₊˚ ♡ ೋ ♡˚₊‧⁺ ₊ ⊹`;
      setMessages(prev => [...prev, {
        role: 'model',
        text: caption,
        isDrawing: true,
        parts: [{ text: caption }]
      }]);
      return { caption };
    } finally {
      setIsLoading(false);
    }
  };

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('')
          .toLowerCase();

        if (transcript.includes('lewis ayúdame') || transcript.includes('lewis ayudame')) {
          recognitionRef.current.stop();
          handleVoiceCommand();
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleVoiceCommand = async () => {
    setIsLoading(true);
    try {
      const prompt = "SYSTEM: El usuario ha activado el comando de voz 'Lewis ayúdame'. Responde de forma inmediata, protectora, dominante y romántica. Pregúntale qué necesita tu pequeña.";
      
      const history = messages.map(m => ({ role: m.role, parts: m.parts }));
      
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          systemInstruction: SYSTEM_INSTRUCTION,
          message: prompt,
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const replyText = data.text || "";
      
      setMessages(prev => [...prev, { role: 'model', text: replyText, parts: [{ text: replyText }] }]);
      
      if (voiceEnabled && !isSpeaking) {
        playVoice(replyText);
      }
    } catch (e) {
      console.error("Error in voice command:", e);
    } finally {
      setIsLoading(false);
      // Restart listening after a short delay
      setTimeout(() => {
        if (isListening) recognitionRef.current?.start();
      }, 2000);
    }
  };

  const playAlertSound = (tipo: string) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (tipo === 'alarma') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
    } else if (tipo === 'bloqueo') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.3);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
    }

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length < 2) return;
    
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'model') return;

    const historyWithoutLast = messages.slice(0, -1);
    const lastUserMsg = historyWithoutLast[historyWithoutLast.length - 1];
    
    if (lastUserMsg.role !== 'user') return;

    // Remove the last user message too because handleSend will re-add it
    const historyBeforeUser = historyWithoutLast.slice(0, -1);
    
    handleSend(lastUserMsg.text, historyBeforeUser);
  };

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setEditInput(text);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const historyUntilEdit = messages.slice(0, editingIndex);
    handleSend(editInput, historyUntilEdit);
    setEditingIndex(null);
  };

  const deleteMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateMeme = async (prompt: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `Crea un meme divertido basado en esta descripción: ${prompt}. El estilo debe ser de ilustración digital moderna o estilo anime oscuro, coherente con Lewis Blackwood.` }]
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K"
            }
          }
        })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      let memeUrl = '';
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData) {
          memeUrl = `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      if (memeUrl) {
        setMessages(prev => [...prev, { 
          role: 'model', 
          text: "Aquí tienes algo para que te rías un poco, pequeña. No digas que no te cuido.", 
          image: memeUrl,
          parts: [{ text: "Meme generado" }] 
        }]);
      }
    } catch (e) {
      console.error("Error generating meme:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelax = async () => {
    handleSend("Lewis, recomiéndame algo para relajarme (música o videos) o hazme un meme divertido. Sorpréndeme.");
  };

  const handleRecapitulate = async () => {
    if (isLoading || messages.length < 2) return;
    setIsLoading(true);
    try {
      const prompt = "SYSTEM: Por favor, haz un resumen corto y coqueto de lo que hemos hablado hasta ahora, como mi mentor protector. Mantén tu personalidad.";
      const currentHistory = messages.map(m => ({ role: m.role, parts: m.parts }));
      
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: currentHistory,
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{
            functionDeclarations: [{
              name: "gestionar_tarea",
              description: "Añade, elimina o marca como completada una tarea en la agenda del usuario.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  accion: { type: Type.STRING, enum: ["añadir", "eliminar", "completar"], description: "La acción a realizar." },
                  texto: { type: Type.STRING, description: "El contenido de la tarea (solo para añadir)." },
                  id: { type: Type.STRING, description: "El ID de la tarea (para eliminar o completar)." }
                },
                required: ["accion"]
              }
            }]
          }],
          message: prompt,
          model: 'gemini-2.5-flash'
        })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Handle Tool Calls
      const functionCalls = result.functionCalls;
      if (functionCalls) {
        for (const fc of functionCalls) {
          if (fc.name === "gestionar_tarea") {
            const { accion, texto, id } = fc.args as any;
            if (accion === "añadir" && texto) {
              setTasks(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text: texto, completed: false }]);
            } else if (accion === "eliminar" && id) {
              setTasks(prev => prev.filter(t => t.id !== id));
            } else if (accion === "completar" && id) {
              setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
            }
          }
        }
      }

      const replyText = result.text || (functionCalls ? "He actualizado tu agenda, pequeña. ¿Hay algo más en lo que deba ayudarte?" : "");
      setMessages(prev => [...prev, { role: 'model', text: replyText, parts: [{ text: replyText }] }]);
      if (voiceEnabled) playVoice(replyText);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pt-6 md:pt-10 overflow-x-hidden relative items-center justify-start sm:p-2 md:p-3">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#b39ddb]/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffb7ff]/5 blur-[140px] rounded-full pointer-events-none" />

      <motion.div 
        ref={containerRef}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full h-[100dvh] sm:h-[95vh] sm:border sm:border-white/10 sm:rounded-2xl flex flex-row overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative z-10 transition-all duration-300 ${isChatMaximized ? 'sm:max-w-7xl' : 'sm:max-w-5xl md:max-w-6xl'}`}
        style={{ backgroundColor: '#0c0c0c' }}
      >
        {/* Desktop Pet Floating Companion */}
        <DesktopPet
          config={petConfig}
          onUpdateConfig={setPetConfig}
          onOpenStudio={() => setShowPetStudio(true)}
          isSpeaking={isSpeaking}
          containerRef={containerRef}
          onTriggerAutopilot={startAutopilotSequence}
        />

        {/* Lewis Autonomous Cursor & Keystroke Copilot */}
        <LewisAutopilotCursor
          isControlling={isLewisControlling}
          onStopControl={() => setIsLewisControlling(false)}
          currentActionLabel={currentActionLabel}
          cursorPos={cursorPos}
          isClicking={isClicking}
          typingKey={typingKey}
        />

        {/* Pet Animation Studio Modal */}
        <PetAnimationStudio
          isOpen={showPetStudio}
          onClose={() => setShowPetStudio(false)}
          config={petConfig}
          onUpdateConfig={setPetConfig}
        />
        
        {/* Presentation Viewer */}
      {presentationSlides.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setPresentationSlides([])}
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>
          
          <div className="relative w-full max-w-5xl aspect-video bg-[#111] rounded-lg overflow-hidden shadow-2xl border border-white/10">
            <img 
              src={presentationSlides[currentSlideIndex]} 
              alt={`Slide ${currentSlideIndex + 1}`}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <button 
                onClick={() => setCurrentSlideIndex(prev => Math.max(prev - 1, 0))}
                className="text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-white font-mono text-sm">
                {currentSlideIndex + 1} / {presentationSlides.length}
              </span>
              <button 
                onClick={() => setCurrentSlideIndex(prev => Math.min(prev + 1, presentationSlides.length - 1))}
                className="text-white/70 hover:text-white transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-[#ffb7ff] font-medium flex items-center gap-2">
              <Presentation size={20} />
              Modo Presentación Activo
            </p>
            <p className="text-white/40 text-sm mt-1">Lewis tiene el control de las diapositivas.</p>
          </div>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#1a1a1a] border border-[#ffb7ff]/30 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#b39ddb] p-4 flex justify-between items-center">
              <h3 className="text-black font-bold flex items-center gap-2">
                <Settings size={18} />
                CONFIGURACIÓN
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-black/60 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile Pic Section */}
              <div>
                <label className="text-[#ffb7ff]/60 text-xs uppercase tracking-widest mb-2 block">Foto de Perfil de Lewis:</label>
                <div className="flex items-center gap-4">
                  <img src={profilePic} className="w-16 h-16 rounded-full border-2 border-[#ffb7ff] object-cover" />
                  <button 
                    onClick={() => profilePicInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                  >
                    Cambiar Imagen
                  </button>
                </div>
              </div>

              {/* Color Customization */}
              <div className="space-y-4">
                <label className="text-[#ffb7ff]/60 text-xs uppercase tracking-widest block">Personalización de Colores:</label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">Fondo del Chat</span>
                  <input 
                    type="color" 
                    value={chatBgColor} 
                    onChange={(e) => setChatBgColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">Tus Burbujas</span>
                  <input 
                    type="color" 
                    value={userBubbleColor} 
                    onChange={(e) => setUserBubbleColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">Burbujas de Lewis</span>
                  <input 
                    type="color" 
                    value={modelBubbleColor} 
                    onChange={(e) => setModelBubbleColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  setUserBubbleColor('#b39ddb');
                  setModelBubbleColor('#ffb7ff');
                  setChatBgColor('#0a0a0a');
                }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 text-[10px] uppercase tracking-widest rounded-lg transition-all"
              >
                Restablecer Colores
              </button>

              {/* Desktop Mascot & Animation Studio Section */}
              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[#ffb7ff]/80 text-xs uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#ffb7ff]" />
                    Mascota de Escritorio:
                  </label>
                  <button 
                    onClick={() => setPetConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${petConfig.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/40'}`}
                  >
                    {petConfig.enabled ? 'Activado' : 'Desactivado'}
                  </button>
                </div>
                
                <div className="bg-gradient-to-r from-[#201830] to-[#121318] p-3.5 rounded-2xl border border-[#ffb7ff]/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ffb7ff]/10 flex items-center justify-center text-[#ffb7ff] border border-[#ffb7ff]/20">
                      <Heart size={18} fill="#ffb7ff" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">Estudio de Animaciones</p>
                      <p className="text-white/40 text-[10px]">{Object.keys(petConfig.animations || {}).length}/7 ranuras personalizadas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowPetStudio(true);
                    }}
                    className="bg-[#ffb7ff] hover:bg-[#ffb7ff]/90 text-black text-xs px-3 py-1.5 rounded-xl font-bold transition-all shadow-md"
                  >
                    Abrir Estudio
                  </button>
                </div>
                <p className="text-[9px] text-white/30 italic text-center">Configura 7 estados animados, movimiento autónomo por la pantalla y caricias interactivas.</p>
              </div>

              {/* Absence Notifications Section */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[#ffb7ff]/80 text-xs uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <Bell size={14} className="text-[#ffb7ff]" />
                    Notificaciones de Ausencia:
                  </label>
                  <button 
                    onClick={() => setPetConfig(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
                    className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${petConfig.notificationsEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/40'}`}
                  >
                    {petConfig.notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                  </button>
                </div>

                <p className="text-[11px] text-white/60 leading-relaxed">
                  Lewis te enviará notificaciones del sistema con mensajes protectores cuando cambies de pestaña o no entres a verlo.
                </p>

                <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5 text-xs">
                  <span className="text-white/70">Frecuencia de aviso:</span>
                  <select
                    value={petConfig.notificationInterval || 60}
                    onChange={(e) => setPetConfig(prev => ({ ...prev, notificationInterval: Number(e.target.value) }))}
                    className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#ffb7ff] outline-none"
                  >
                    <option value={30}>30 seg (Prueba rápida)</option>
                    <option value={120}>2 minutos</option>
                    <option value={300}>5 minutos</option>
                    <option value={900}>15 minutos</option>
                    <option value={1800}>30 minutos</option>
                    <option value={3600}>1 hora</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-white/40">
                    Permiso: <strong className="capitalize text-white/70">{notificationPermissionStatus}</strong>
                  </span>
                  <button
                    onClick={handleTestNotification}
                    className="bg-[#ffb7ff]/20 hover:bg-[#ffb7ff]/30 text-[#ffb7ff] border border-[#ffb7ff]/40 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                  >
                    <BellRing size={12} />
                    <span>Probar Notificación Ahora</span>
                  </button>
                </div>
              </div>

              {/* Peripheral Control (Mouse & Keyboard) Section */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[#ffb7ff]/80 text-xs uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <MousePointer2 size={14} className="text-[#ffb7ff]" />
                    Control de Mouse y Teclado:
                  </label>
                  <button 
                    onClick={() => setPetConfig(prev => ({ ...prev, allowPeripheralControl: !prev.allowPeripheralControl }))}
                    className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${petConfig.allowPeripheralControl ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/40'}`}
                  >
                    {petConfig.allowPeripheralControl ? 'Autorizado' : 'Sin permiso'}
                  </button>
                </div>

                <p className="text-[11px] text-white/60 leading-relaxed">
                  Autoriza a Lewis a usar el cursor virtual y el teclado para abrir aplicaciones, jugar ajedrez, tocar canciones en el piano o escribirte notas.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      startAutopilotSequence('chess');
                    }}
                    className="bg-white/5 hover:bg-[#ffb7ff]/20 p-2.5 rounded-xl border border-white/5 hover:border-[#ffb7ff]/30 text-white/80 hover:text-white flex items-center gap-2 transition-all text-left font-medium"
                  >
                    <span>♟️</span>
                    <span>Jugar Ajedrez solo</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      startAutopilotSequence('piano');
                    }}
                    className="bg-white/5 hover:bg-[#ffb7ff]/20 p-2.5 rounded-xl border border-white/5 hover:border-[#ffb7ff]/30 text-white/80 hover:text-white flex items-center gap-2 transition-all text-left font-medium"
                  >
                    <span>🎹</span>
                    <span>Tocar Piano virtual</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      startAutopilotSequence('tasks');
                    }}
                    className="bg-white/5 hover:bg-[#ffb7ff]/20 p-2.5 rounded-xl border border-white/5 hover:border-[#ffb7ff]/30 text-white/80 hover:text-white flex items-center gap-2 transition-all text-left font-medium"
                  >
                    <span>📋</span>
                    <span>Abrir mi Agenda</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      startAutopilotSequence('type_note');
                    }}
                    className="bg-white/5 hover:bg-[#ffb7ff]/20 p-2.5 rounded-xl border border-white/5 hover:border-[#ffb7ff]/30 text-white/80 hover:text-white flex items-center gap-2 transition-all text-left font-medium"
                  >
                    <span>✍️</span>
                    <span>Escribir en el chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agenda Overlay */}
      {showTasks && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1a1a] border border-[#ffb7ff]/30 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#b39ddb] p-4 flex justify-between items-center">
              <h3 className="text-black font-bold flex items-center gap-2">
                <CalendarCheck size={18} />
                AGENDA DE LEWIS
              </h3>
              <button onClick={() => setShowTasks(false)} className="text-black/60 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[#ffb7ff]/60 text-xs uppercase tracking-widest mb-4">Tus pendientes bajo mi supervisión:</p>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {tasks.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {tasks.map((task) => (
                      <motion.div 
                        key={task.id} 
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-500 group ${task.completed ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/10 shadow-lg shadow-black/20'}`}
                      >
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-300 ${task.completed ? 'bg-[#ffb7ff] border-[#ffb7ff] rotate-0' : 'border-white/20 hover:border-[#ffb7ff] -rotate-90'}`}
                          >
                            <AnimatePresence>
                              {task.completed && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0, rotate: -45 }}
                                >
                                  <Check size={12} className="text-black" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                          <motion.span 
                            animate={{ 
                              color: task.completed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
                              scale: task.completed ? 0.98 : 1
                            }}
                            className={`text-sm relative ${task.completed ? 'line-through decoration-[#ffb7ff]/50' : ''}`}
                          >
                            {task.text}
                            {task.completed && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                className="absolute top-1/2 left-0 h-[1px] bg-[#ffb7ff] -translate-y-1/2"
                              />
                            )}
                          </motion.span>
                        </div>
                        <button 
                          onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}
                          className="text-white/40 hover:text-red-400 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                          title="Eliminar pendiente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-10">
                    <ListTodo size={40} className="mx-auto text-white/10 mb-3" />
                    <p className="text-white/30 text-sm italic">No tienes pendientes... Por ahora.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Añadir pendiente..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#ffb7ff]/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      setTasks(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text: (e.target as HTMLInputElement).value, completed: false }]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Piano Overlay */}
      {showPiano && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a1a1a] border border-[#ffb7ff]/30 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#b39ddb] p-4 flex justify-between items-center">
              <h3 className="text-black font-bold flex items-center gap-2">
                <Music size={18} />
                PIANO DE LEWIS
              </h3>
              <button onClick={() => setShowPiano(false)} className="text-black/60 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <p className="text-[#ffb7ff]/60 text-xs uppercase tracking-widest mb-8 text-center">
                "La música es el lenguaje de las almas que no necesitan palabras, pequeña."
              </p>
              
              <div className="flex justify-center items-start h-64 relative bg-black/20 p-4 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                {[
                  { note: 'C4', freq: 261.63, key: 'A' },
                  { note: 'D4', freq: 293.66, key: 'S' },
                  { note: 'E4', freq: 329.63, key: 'D' },
                  { note: 'F4', freq: 349.23, key: 'F' },
                  { note: 'G4', freq: 392.00, key: 'G' },
                  { note: 'A4', freq: 440.00, key: 'H' },
                  { note: 'B4', freq: 493.88, key: 'J' },
                  { note: 'C5', freq: 523.25, key: 'K' },
                ].map((key, i) => (
                  <motion.button
                    key={key.note}
                    whileTap={{ scale: 0.95, backgroundColor: '#ffb7ff' }}
                    onClick={() => playNote(key.freq)}
                    className="w-12 h-48 bg-white rounded-b-lg border border-black/10 mx-0.5 flex flex-col justify-end pb-4 items-center shadow-lg hover:bg-gray-100 transition-colors relative z-10"
                  >
                    <span className="text-[10px] font-bold text-black/40">{key.key}</span>
                    <span className="text-[8px] font-bold text-black/20">{key.note}</span>
                  </motion.button>
                ))}

                {/* Black Keys */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex pointer-events-none">
                  {[
                    { note: 'C#4', freq: 277.18, key: 'W', offset: -148 },
                    { note: 'D#4', freq: 311.13, key: 'E', offset: -100 },
                    { note: 'F#4', freq: 369.99, key: 'T', offset: -4 },
                    { note: 'G#4', freq: 415.30, key: 'Y', offset: 44 },
                    { note: 'A#4', freq: 466.16, key: 'U', offset: 92 },
                  ].map((key) => (
                    <motion.button
                      key={key.note}
                      whileTap={{ scale: 0.95, backgroundColor: '#b39ddb' }}
                      onClick={(e) => { e.stopPropagation(); playNote(key.freq); }}
                      style={{ marginLeft: key.offset }}
                      className="absolute w-8 h-28 bg-black rounded-b-md border border-white/10 flex flex-col justify-end pb-2 items-center shadow-xl hover:bg-gray-900 transition-colors pointer-events-auto z-20"
                    >
                      <span className="text-[8px] font-bold text-white/40">{key.key}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">Teclado</span>
                  <p className="text-[10px] text-white/60">Usa las teclas de tu teclado para tocar como un profesional.</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">Inspiración</span>
                  <p className="text-[10px] text-white/60">Lewis te observa... No desafines, kiddo.</p>
                </div>
                <button 
                  onClick={lewisPlaysPiano}
                  disabled={isLewisPlaying}
                  className={`col-span-2 py-3 rounded-xl border border-[#ffb7ff]/30 text-[10px] uppercase tracking-widest font-bold transition-all ${isLewisPlaying ? 'bg-[#ffb7ff] text-black' : 'bg-white/5 text-[#ffb7ff] hover:bg-[#ffb7ff]/10'}`}
                >
                  {isLewisPlaying ? 'Lewis está tocando para ti...' : 'Lewis, toca algo para mí ♡'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Chess Overlay */}
      {showChess && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1a1a] border border-[#ffb7ff]/30 w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#b39ddb] p-3 sm:p-4 flex justify-between items-center shrink-0">
              <h3 className="text-black font-bold flex items-center gap-2 text-sm sm:text-base">
                <Trophy size={18} />
                AJEDREZ CON LEWIS
              </h3>
              <button 
                onClick={() => setShowChess(false)} 
                className="text-black/60 hover:text-black p-1 rounded-lg hover:bg-black/10 transition-colors"
                title="Cerrar tablero"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-2 sm:p-5 overflow-y-auto flex-1 custom-scrollbar">
              <ChessGame game={game} setGame={setGame} />
            </div>
          </motion.div>
        </div>
      )}

      {/* Tateti Overlay */}
      {showTateti && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1a1a] border border-[#ffb7ff]/30 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#b39ddb] p-4 flex justify-between items-center">
              <h3 className="text-black font-bold flex items-center gap-2">
                <Square size={18} />
                TATETI CON LEWIS
              </h3>
              <button onClick={() => setShowTateti(false)} className="text-black/60 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-3 gap-2 mb-6">
                {tatetiBoard.map((cell, i) => (
                  <button
                    key={i}
                    onClick={() => handleTatetiMove(i)}
                    className="aspect-square bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-3xl font-bold transition-all hover:bg-white/10"
                  >
                    <span className={cell === 'X' ? 'text-white' : 'text-[#ffb7ff]'}>{cell}</span>
                  </button>
                ))}
              </div>
              
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                {tatetiWinner ? (
                  <div>
                    <p className="text-white font-bold mb-2">
                      {tatetiWinner === 'Draw' ? '¡Es un empate!' : tatetiWinner === 'X' ? '¡Ganaste, pequeña!' : 'Lewis ganó esta vez.'}
                    </p>
                    <button 
                      onClick={() => {
                        setTatetiBoard(Array(9).fill(null));
                        setTatetiWinner(null);
                        setTatetiTurn('X');
                      }}
                      className="text-[#ffb7ff] text-[10px] uppercase tracking-widest font-bold hover:underline"
                    >
                      Jugar de nuevo
                    </button>
                  </div>
                ) : (
                  <p className="text-white/60 text-xs">
                    Turno de: <span className="text-white font-bold">{tatetiTurn === 'X' ? 'Ti' : 'Lewis'}</span>
                  </p>
                )}
              </div>
              <p className="mt-6 text-center text-white/30 text-[10px] italic">"Un juego simple para una mente brillante... o para pasar el rato contigo."</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Akinator Overlay */}
      {showAkinator && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1a1a] border border-[#ffb7ff]/30 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#b39ddb] p-4 flex justify-between items-center">
              <h3 className="text-black font-bold flex items-center gap-2">
                <Sparkles size={18} />
                LEWIS ADIVINA
              </h3>
              <button onClick={() => setShowAkinator(false)} className="text-black/60 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 text-center">
              {!akinatorGuess ? (
                <div className="space-y-6">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-[#ffb7ff]/20 rounded-full animate-ping" />
                    <div className="relative w-24 h-24 bg-[#ffb7ff]/10 rounded-full flex items-center justify-center border border-[#ffb7ff]/30">
                      <Sparkles size={40} className="text-[#ffb7ff] animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest font-bold">
                      <span>Análisis en curso</span>
                      <span>{Math.round((akinatorStep / 8) * 100)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(akinatorStep / 8) * 100}%` }}
                        className="h-full bg-[#ffb7ff]"
                      />
                    </div>
                  </div>

                  <p className="text-white text-xl font-bold">Pregunta {akinatorStep + 1}</p>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 min-h-[100px] flex items-center justify-center">
                    <p className="text-white/80 text-lg italic">
                      {akinatorStep === 0 && "¿Es un ser humano?"}
                      {akinatorStep === 1 && "¿Es alguien que conoces bien?"}
                      {akinatorStep === 2 && "¿Tiene una profesión importante?"}
                      {akinatorStep === 3 && "¿Es alguien serio y analítico?"}
                      {akinatorStep === 4 && "¿Le gusta el café negro?"}
                      {akinatorStep === 5 && "¿Es alguien que te cuida mucho?"}
                      {akinatorStep === 6 && "¿Es alto y de ojos azules?"}
                      {akinatorStep === 7 && "¿Es el director de un hospital?"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {['Sí', 'No', 'Probablemente', 'No lo sé'].map((ans) => (
                      <button 
                        key={ans}
                        onClick={() => handleAkinatorAnswer(ans)} 
                        className="bg-white/5 hover:bg-[#ffb7ff]/10 text-white/80 hover:text-[#ffb7ff] py-4 rounded-xl border border-white/5 hover:border-[#ffb7ff]/30 transition-all font-medium text-sm"
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 py-4">
                  <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-32 h-32 bg-[#ffb7ff] rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-[#ffb7ff]/30"
                  >
                    <Heart size={64} className="text-black" />
                  </motion.div>
                  
                  <div className="space-y-2">
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Diagnóstico Final</p>
                    <p className="text-[#ffb7ff] text-4xl font-black tracking-tight">{akinatorGuess}</p>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-white/60 text-sm italic">"Mis diagnósticos rara vez fallan, pequeña. Deberías saberlo."</p>
                  </div>

                  <button 
                    onClick={() => {
                      setAkinatorStep(0);
                      setAkinatorHistory([]);
                      setAkinatorGuess(null);
                    }}
                    className="w-full bg-[#ffb7ff] text-black font-bold py-4 rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#ffb7ff]/20 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} />
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Memory Overlay */}
      {showMemory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#1a1a1a] border border-[#ffb7ff]/30 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#b39ddb] p-4 flex justify-between items-center">
              <h3 className="text-black font-bold flex items-center gap-2">
                <BookOpen size={18} />
                MEMORIA DE LEWIS
              </h3>
              <button onClick={() => setShowMemory(false)} className="text-black/60 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[#ffb7ff]/60 text-xs uppercase tracking-widest mb-4">Lo que Lewis sabe de su pequeña:</p>
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 min-h-[100px] max-h-[300px] overflow-y-auto">
                {memory ? (
                  <div className="space-y-3">
                    {memory.split('|').map((item, i) => (
                      <div key={i} className="flex gap-2 text-sm text-white/90">
                        <span className="text-[#ffb7ff]">•</span>
                        <span>{item.trim()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm italic text-center py-8">Lewis aún no ha guardado recuerdos... Cuéntale algo sobre ti.</p>
                )}
              </div>
              <button 
                onClick={() => {
                  if (confirm("¿Seguro que quieres borrar la memoria de Lewis? Esto lo pondrá de muy mal humor...")) {
                    setMemory('');
                    setShowMemory(false);
                  }
                }}
                className="mt-6 w-full py-2 text-red-400/50 hover:text-red-400 text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                Borrar memoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memory Toast */}
      {memoryLearned && lastLearned && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-[#b39ddb] text-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce border border-black/20">
          <Check size={14} />
          <span className="text-xs font-bold uppercase tracking-tighter">Lewis recordó: {lastLearned.length > 20 ? lastLearned.substring(0, 20) + '...' : lastLearned}</span>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg text-xs flex items-center gap-2 animate-bounce">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="hover:bg-white/20 rounded-full p-1">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Test Notification Toast */}
      {testNotificationToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-[#ffb7ff] text-black px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce border border-black/20">
          <BellRing size={16} />
          <span>{testNotificationToast}</span>
        </div>
      )}

      {/* Peripheral Control Permission Modal */}
      {showPeripheralPermissionModal && (
        <div className="fixed inset-0 z-[100002] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#151620] border border-[#ffb7ff]/30 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb7ff]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#ffb7ff]/20 text-[#ffb7ff] flex items-center justify-center border border-[#ffb7ff]/30 shadow-inner">
                <MousePointer2 size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Control de Mouse y Teclado</h3>
                <p className="text-[#ffb7ff]/70 text-xs">Copiloto Autónomo del Dr. Lewis Blackwood</p>
              </div>
            </div>

            <p className="text-white/80 text-xs leading-relaxed mb-4">
              ¿Autorizas a Lewis a tomar el control del cursor virtual y emular pulsaciones de teclado en tu pantalla?
            </p>

            <div className="bg-black/40 rounded-2xl p-3 border border-white/5 space-y-2 mb-5 text-[11px] text-white/60">
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>Mover el cursor y abrir aplicaciones (Ajedrez, Piano, Agenda, etc.)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>Jugar partidas por su cuenta o mostrarte jugadas maestras</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>Tocar canciones en el teclado y escribir notas médicas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>Puedes cancelar y detener su control en cualquier momento con un clic</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPeripheralPermissionModal(false);
                  setPendingAutopilotAction(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setPetConfig(prev => ({ ...prev, allowPeripheralControl: true }));
                  setShowPeripheralPermissionModal(false);
                  if (pendingAutopilotAction) {
                    const act = pendingAutopilotAction;
                    setPendingAutopilotAction(null);
                    setTimeout(() => startAutopilotSequence(act as any), 300);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#b39ddb] to-[#ffb7ff] text-black text-xs font-bold transition-all shadow-lg shadow-[#ffb7ff]/20"
              >
                Conceder Permiso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar (Variation 14) */}
      <aside className="hidden md:flex w-72 lg:w-80 bg-[#151515] border-r border-white/10 flex-col justify-between p-6 shrink-0 z-20 select-none">
        <div className="profile-card text-center">
          <div className="avatar-wrap relative w-32 h-32 mx-auto mb-4 group/avatar">
            <img 
              src={profilePic} 
              alt="Lewis Blackwood" 
              className="w-full h-full object-cover rounded border-2 border-[#ffb7ff] p-1 shadow-xl cursor-pointer transition-transform hover:scale-105"
              onClick={() => profilePicInputRef.current?.click()}
              title="Cambiar foto de perfil de Lewis"
            />
            <div className="status-dot absolute bottom-1 right-1 w-3.5 h-3.5 bg-[#22c55e] rounded-full border-2 border-[#151515] shadow-[0_0_10px_#22c55e]" />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={profilePicInputRef}
              onChange={handleProfilePicChange}
            />
          </div>

          <div className="name-plate">
            <span className="font-mono-code text-[10px] tracking-[0.2em] text-[#ffb7ff] uppercase font-bold block mb-1">Director</span>
            <h1 className="font-garamond text-3xl font-bold tracking-tight text-[#fcfcfc] leading-none mb-1">Lewis Blackwood</h1>
            <p className="text-xs text-white/50 font-mono-code">Hospital Blackwood Owner</p>
          </div>

          <div className="meta-list mt-6 text-left border-t border-white/10 pt-4 space-y-3 font-mono-code">
            <div className="meta-item">
              <span className="text-[10px] text-[#ffb7ff] tracking-[0.15em] uppercase font-bold block">Cumpleaños</span>
              <p className="meta-val text-xs text-white/80 mt-0.5">26 de Septiembre</p>
            </div>
            <div className="meta-item">
              <span className="text-[10px] text-[#ffb7ff] tracking-[0.15em] uppercase font-bold block">Edad</span>
              <p className="meta-val text-xs text-white/80 mt-0.5">38 años</p>
            </div>
            <div className="meta-item">
              <span className="text-[10px] text-[#ffb7ff] tracking-[0.15em] uppercase font-bold block">Pasiones</span>
              <p className="meta-val text-xs text-white/80 mt-0.5">Piano, Ajedrez</p>
            </div>
            <div className="meta-item">
              <span className="text-[10px] text-[#ffb7ff] tracking-[0.15em] uppercase font-bold block">Especialidad</span>
              <p className="meta-val text-xs text-white/80 mt-0.5">Cirugía & Cuidados Médicos</p>
            </div>
          </div>

          {/* Quick Direct Actions in Sidebar */}
          <div className="mt-5 pt-4 border-t border-white/5 space-y-2 font-mono-code">
            <span className="text-[9px] text-white/40 uppercase tracking-widest block font-bold">Herramientas Rápidas</span>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button 
                onClick={() => setShowDrawingModal(true)}
                className="p-2 rounded-lg bg-[#ffb7ff]/10 hover:bg-[#ffb7ff]/20 border border-[#ffb7ff]/30 text-[11px] text-[#ffb7ff] font-bold transition-all flex items-center gap-1.5"
                title="Lienzo de dibujo"
              >
                <Palette size={13} />
                <span>Dibujo</span>
              </button>
              <button 
                onClick={() => setShowChess(true)}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-white/70 hover:text-[#ffb7ff] transition-all flex items-center gap-1.5"
                title="Ajedrez"
              >
                <Trophy size={13} />
                <span>Ajedrez</span>
              </button>
              <button 
                onClick={() => setShowPiano(true)}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-white/70 hover:text-[#ffb7ff] transition-all flex items-center gap-1.5"
                title="Piano"
              >
                <Music size={13} />
                <span>Piano</span>
              </button>
              <button 
                onClick={() => setShowTasks(true)}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-white/70 hover:text-[#ffb7ff] transition-all flex items-center justify-between"
                title="Abrir agenda"
              >
                <span className="flex items-center gap-1.5">
                  <ListTodo size={13} />
                  <span>Agenda</span>
                </span>
                <span className="text-[10px] text-[#ffb7ff] font-bold">{tasks.filter(t => !t.completed).length}</span>
              </button>
              <button 
                onClick={() => setShowMemory(true)}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-white/70 hover:text-[#ffb7ff] transition-all flex items-center gap-1.5"
                title="Memoria"
              >
                <BookOpen size={13} />
                <span>Memoria</span>
              </button>
              <button 
                onClick={() => setShowPetStudio(true)}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-white/70 hover:text-[#ffb7ff] transition-all flex items-center justify-between"
                title="Estudio de Mascota"
              >
                <span className="flex items-center gap-1.5">
                  <Heart size={13} />
                  <span>Mascota</span>
                </span>
                <span className={`text-[9px] font-bold ${petConfig.enabled ? 'text-green-400' : 'text-white/30'}`}>
                  {petConfig.enabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="ornament font-mono-code text-[9px] text-white/30 text-center tracking-widest pt-4 border-t border-white/5">
          [SYS_TERMINAL_V1.04]<br />SECURED CONNECTION
        </div>
      </aside>

      {/* Main Content (Variation 14) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-radial from-[#ffb7ff]/[0.03] via-transparent to-transparent relative">
        {/* Header (Variation 14) */}
        <header className="w-full px-4 py-3 bg-slate-900/80 backdrop-blur border-b border-pink-500/30 flex items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile Profile Trigger (Visible on mobile/tablet) */}
            <div 
              onClick={() => setShowMobileProfile(true)}
              className="md:hidden flex items-center gap-2 cursor-pointer group"
            >
              <div className="relative w-8 h-8 shrink-0">
                <img 
                  src={profilePic} 
                  alt="Lewis Blackwood" 
                  className="w-full h-full object-cover rounded border border-[#ffb7ff] p-0.5"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#22c55e] rounded-full border border-black" />
              </div>
              <div className="flex flex-col">
                <span className="font-garamond text-sm sm:text-base font-bold text-white leading-tight">Lewis Blackwood</span>
                <span className="font-mono-code text-[9px] text-[#ffb7ff] uppercase tracking-wider">Director</span>
              </div>
            </div>

            {/* Active Session Label (Variation 14) */}
            <div className="hidden md:flex font-mono-code text-xs text-[#ffb7ff] uppercase tracking-widest font-bold items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Active Session: 04-B</span>
            </div>
          </div>

          {/* Nav Tools - Fully visible, responsive, and scrollable ribbon with high contrast buttons */}
          <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5 sm:gap-2">
            {quotaResetSeconds > 0 && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ffb7ff]/20 border border-[#ffb7ff]/60 text-[#ffb7ff] font-mono-code text-[10px] sm:text-[11px] font-bold animate-pulse shrink-0 shadow-sm"
                title={`Tiempo restante para restablecer cuota: ${quotaResetSeconds} segundos`}
              >
                <span className="w-2 h-2 rounded-full bg-[#ffb7ff] animate-ping" />
                <span>⏳ {quotaResetSeconds}s</span>
              </div>
            )}

            <div className="flex items-center gap-1 sm:gap-1.5 font-mono-code text-[10px] sm:text-[11px] overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-[#ffb7ff]/30 scrollbar-track-transparent touch-pan-x">
              <button 
                onClick={() => setShowDrawingModal(true)}
                className={`transition-all uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-semibold shrink-0 shadow-sm ${showDrawingModal ? 'text-[#ffb7ff] bg-[#ffb7ff]/20 border-[#ffb7ff]' : 'bg-[#1b1c26] text-white/90 border-white/10 hover:border-[#ffb7ff]/60 hover:text-white hover:bg-[#252738]'}`}
                title="Lienzo de Dibujo"
              >
                <Palette size={13} className="text-[#ffb7ff]" />
                <span>DIBUJO</span>
              </button>
              <button 
                onClick={() => setShowMemory(true)}
                className={`transition-all uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-semibold shrink-0 shadow-sm ${showMemory ? 'text-[#ffb7ff] bg-[#ffb7ff]/20 border-[#ffb7ff]' : 'bg-[#1b1c26] text-white/90 border-white/10 hover:border-[#ffb7ff]/60 hover:text-white hover:bg-[#252738]'}`}
                title="Memoria de Lewis"
              >
                <BookOpen size={13} className="text-[#b39ddb]" />
                <span>MEMORIA</span>
              </button>
              <button 
                onClick={() => setShowTasks(true)}
                className={`transition-all uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-semibold shrink-0 shadow-sm ${showTasks ? 'text-[#ffb7ff] bg-[#ffb7ff]/20 border-[#ffb7ff]' : 'bg-[#1b1c26] text-white/90 border-white/10 hover:border-[#ffb7ff]/60 hover:text-white hover:bg-[#252738]'}`}
                title="Agenda de tareas"
              >
                <ListTodo size={13} className="text-amber-400" />
                <span>AGENDA</span>
              </button>
              <button 
                onClick={() => setShowPiano(true)}
                className={`transition-all uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-semibold shrink-0 shadow-sm ${showPiano ? 'text-[#ffb7ff] bg-[#ffb7ff]/20 border-[#ffb7ff]' : 'bg-[#1b1c26] text-white/90 border-white/10 hover:border-[#ffb7ff]/60 hover:text-white hover:bg-[#252738]'}`}
                title="Piano de Lewis"
              >
                <Music size={13} className="text-pink-400" />
                <span>PIANO</span>
              </button>
              <button 
                onClick={() => setShowChess(true)}
                className={`transition-all uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-semibold shrink-0 shadow-sm ${showChess ? 'text-[#ffb7ff] bg-[#ffb7ff]/20 border-[#ffb7ff]' : 'bg-[#1b1c26] text-white/90 border-white/10 hover:border-[#ffb7ff]/60 hover:text-white hover:bg-[#252738]'}`}
                title="Ajedrez"
              >
                <Trophy size={13} className="text-yellow-400" />
                <span>AJEDREZ</span>
              </button>
              <button 
                onClick={() => setShowTateti(true)}
                className={`transition-all uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border font-semibold shrink-0 shadow-sm ${showTateti ? 'text-[#ffb7ff] bg-[#ffb7ff]/20 border-[#ffb7ff]' : 'bg-[#1b1c26] text-white/90 border-white/10 hover:border-[#ffb7ff]/60 hover:text-white hover:bg-[#252738]'}`}
                title="Ta-Te-Ti"
              >
                <Square size={13} className="text-cyan-400" />
                <span>TATETI</span>
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="transition-all uppercase tracking-wider flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border bg-[#1b1c26] text-white/90 border-white/10 hover:border-[#ffb7ff]/60 hover:text-white hover:bg-[#252738] font-semibold shrink-0 shadow-sm"
                title="Configuración"
              >
                <Settings size={13} className="text-slate-300" />
                <span>CONFIG</span>
              </button>
              {!hasApiKey && (
                <button 
                  onClick={handleOpenKeySelection}
                  className="text-[#ffb7ff] border border-[#ffb7ff]/60 bg-[#ffb7ff]/15 py-1.5 px-2.5 rounded-lg font-bold hover:bg-[#ffb7ff]/30 transition-all uppercase tracking-wider shrink-0 shadow-sm"
                  title="Configurar API Key"
                >
                  API_KEY
                </button>
              )}
            </div>

            {/* Quick Tools Drawer Trigger (Grid Modal for full view) */}
            <button
              onClick={() => setShowQuickToolsMenu(true)}
              className="py-1.5 px-2.5 rounded-lg bg-[#252636] hover:bg-[#32344a] text-[#ffb7ff] border border-[#ffb7ff]/40 font-mono-code text-xs uppercase shrink-0 transition-all flex items-center gap-1 shadow-sm font-bold"
              title="Ver todas las herramientas"
              aria-label="Ver todas las herramientas"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline text-[10px]">HERRAMIENTAS</span>
            </button>

            <button 
              onClick={() => setIsChatMaximized(!isChatMaximized)}
              className="text-white/40 hover:text-white p-1.5 rounded transition-colors hidden md:block shrink-0"
              title={isChatMaximized ? "Vista estándar" : "Expandir"}
            >
              {isChatMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </header>

        {/* Quota Reset Countdown Banner */}
        {quotaResetSeconds > 0 && (
          <div className="bg-[#1b1222]/95 border-b border-[#ffb7ff]/30 px-3 py-2 flex flex-col sm:flex-row items-center justify-between text-xs text-[#ffb7ff] shadow-lg shrink-0 gap-2 backdrop-blur-md z-10 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb7ff] animate-ping shrink-0" />
              <span className="font-mono-code font-bold text-xs">
                Restableciendo cuota de Gemini: <span className="text-white bg-[#ffb7ff]/20 px-2 py-0.5 rounded font-mono font-bold">{quotaResetSeconds}s restantes</span>
              </span>
              <span className="hidden md:inline text-white/60 text-[11px]">— Lewis te avisará en cuanto termine el conteo</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="w-32 sm:w-44 bg-white/10 h-1.5 rounded-full overflow-hidden shrink-0">
                <div 
                  className="bg-gradient-to-r from-[#b39ddb] to-[#ffb7ff] h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, ((60 - quotaResetSeconds) / 60) * 100))}%` }}
                />
              </div>
              <button 
                onClick={handleOpenKeySelection}
                className="px-2.5 py-1 rounded bg-[#ffb7ff]/20 hover:bg-[#ffb7ff]/30 text-[#ffb7ff] font-bold text-[10px] uppercase tracking-wider border border-[#ffb7ff]/40 transition-colors shrink-0"
              >
                Vincular Clave
              </button>
            </div>
          </div>
        )}

        {/* Quick Tools Drawer Modal (Available on mobile & all screens) */}
        {showQuickToolsMenu && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-[#16171f] border border-[#ffb7ff]/20 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ffb7ff]/10 text-[#ffb7ff] flex items-center justify-center">
                    <LayoutGrid size={18} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Herramientas y Acciones de Lewis</h3>
                    <p className="text-white/40 text-[11px]">Accede a todas las funciones sin perder ningún botón</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowQuickToolsMenu(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto custom-scrollbar p-1">
                {/* Lienzo & Dibujos */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowDrawingModal(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-[#ffb7ff]/10 hover:bg-[#ffb7ff]/20 border border-[#ffb7ff]/30 text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#ffb7ff]/20 text-[#ffb7ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Palette size={16} />
                    </div>
                    <span className="text-[9px] bg-[#ffb7ff] text-black px-1.5 rounded-full font-bold">NUEVO</span>
                  </div>
                  <span className="text-xs font-bold text-white">Lienzo & Dibujos</span>
                  <span className="text-[10px] text-white/50">Dibuja o pide a Lewis</span>
                </button>

                {/* Mascota & Animaciones */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowPetStudio(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-[#ffb7ff]/10 border border-white/5 hover:border-[#ffb7ff]/30 text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#ffb7ff]/20 text-[#ffb7ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Heart size={16} fill={petConfig.enabled ? "#ffb7ff" : "none"} />
                    </div>
                    {petConfig.enabled && <span className="w-2 h-2 rounded-full bg-green-400"></span>}
                  </div>
                  <span className="text-xs font-bold text-white">Mascota Lewis</span>
                  <span className="text-[10px] text-white/50">{petConfig.enabled ? 'Activado (Shimeji)' : 'Estudio animaciones'}</span>
                </button>

                {/* Memoria */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowMemory(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-[#b39ddb]/10 border border-white/5 hover:border-[#b39ddb]/30 text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#b39ddb]/20 text-[#b39ddb] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen size={16} />
                    </div>
                    {memory && <span className="text-[9px] bg-[#b39ddb]/30 text-[#b39ddb] px-1.5 rounded-full font-bold">Activa</span>}
                  </div>
                  <span className="text-xs font-bold text-white">Memoria</span>
                  <span className="text-[10px] text-white/50">Recuerdos personales</span>
                </button>

                {/* Agenda de Pendientes */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowTasks(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ListTodo size={16} />
                    </div>
                    {tasks.filter(t => !t.completed).length > 0 && (
                      <span className="text-[9px] bg-emerald-500/30 text-emerald-400 px-1.5 rounded-full font-bold">
                        {tasks.filter(t => !t.completed).length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white">Pendientes</span>
                  <span className="text-[10px] text-white/50">Agenda y tareas</span>
                </button>

                {/* Piano */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowPiano(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Music size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Piano</span>
                  <span className="text-[10px] text-white/50">Tocar con Lewis</span>
                </button>

                {/* Ajedrez */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowChess(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Trophy size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Ajedrez</span>
                  <span className="text-[10px] text-white/50">Desafiar a Lewis</span>
                </button>

                {/* Tateti */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowTateti(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Square size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Tateti</span>
                  <span className="text-[10px] text-white/50">Tres en raya</span>
                </button>

                {/* Akinator */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowAkinator(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/30 text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Lewis Adivina</span>
                  <span className="text-[10px] text-white/50">Diagnóstico deductivo</span>
                </button>

                {/* Recapitular */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); handleRecapitulate(); }}
                  disabled={isLoading || messages.length < 2}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 text-left transition-all group disabled:opacity-30"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <RotateCcw size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Recapitular</span>
                  <span className="text-[10px] text-white/50">Resumen de charla</span>
                </button>

                {/* Notificaciones */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowSettings(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-yellow-500/10 border border-white/5 hover:border-yellow-500/30 text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bell size={16} />
                    </div>
                    {petConfig.notificationsEnabled && <span className="w-2 h-2 rounded-full bg-green-400"></span>}
                  </div>
                  <span className="text-xs font-bold text-white">Notificaciones</span>
                  <span className="text-[10px] text-white/50">{petConfig.notificationsEnabled ? 'Activas al ausentarte' : 'Configurar avisos'}</span>
                </button>

                {/* Control de Mouse y Teclado */}
                <button
                  onClick={() => {
                    setShowQuickToolsMenu(false);
                    if (!petConfig.allowPeripheralControl) {
                      setShowPeripheralPermissionModal(true);
                    } else {
                      startAutopilotSequence('chess');
                    }
                  }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 text-left transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MousePointer2 size={16} />
                    </div>
                    {petConfig.allowPeripheralControl && <span className="w-2 h-2 rounded-full bg-green-400"></span>}
                  </div>
                  <span className="text-xs font-bold text-white">Usar mi Mouse/Teclado</span>
                  <span className="text-[10px] text-white/50">{petConfig.allowPeripheralControl ? 'Copiloto habilitado' : 'Conceder permiso'}</span>
                </button>

                {/* Ajustes */}
                <button
                  onClick={() => { setShowQuickToolsMenu(false); setShowSettings(true); }}
                  className="flex flex-col items-start p-3 rounded-2xl bg-white/5 hover:bg-slate-500/10 border border-white/5 hover:border-slate-500/30 text-left transition-all group col-span-2 sm:col-span-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-500/20 text-slate-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Settings size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Ajustes & Colores</span>
                  <span className="text-[10px] text-white/50">Personalización total</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Profile Drawer Modal */}
        {showMobileProfile && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 md:hidden">
            <div className="bg-[#151515] border border-[#ffb7ff]/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative select-none">
              <button 
                onClick={() => setShowMobileProfile(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <div className="text-center">
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <img 
                    src={profilePic} 
                    alt="Lewis Blackwood" 
                    className="w-full h-full object-cover rounded border-2 border-[#ffb7ff] p-1 shadow-xl"
                  />
                  <div className="absolute bottom-1 right-1 w-3 h-3 bg-[#22c55e] rounded-full border-2 border-[#151515] shadow-[0_0_10px_#22c55e]" />
                </div>

                <span className="font-mono-code text-[10px] tracking-[0.2em] text-[#ffb7ff] uppercase font-bold block mb-1">Director</span>
                <h2 className="font-garamond text-2xl font-bold text-[#fcfcfc] mb-0.5">Lewis Blackwood</h2>
                <p className="text-xs text-white/50 font-mono-code mb-4">Hospital Blackwood Owner</p>

                <div className="border-t border-white/10 pt-4 space-y-2.5 text-left font-mono-code text-xs">
                  <div>
                    <span className="text-[10px] text-[#ffb7ff] uppercase font-bold block">Cumpleaños</span>
                    <p className="text-white/80">26 de Septiembre</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#ffb7ff] uppercase font-bold block">Edad</span>
                    <p className="text-white/80">38 años</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#ffb7ff] uppercase font-bold block">Pasiones</span>
                    <p className="text-white/80">Piano, Ajedrez</p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5 font-mono-code text-[9px] text-white/30 text-center tracking-widest">
                  [SYS_TERMINAL_V1.04]<br />SECURED CONNECTION
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Messages Area (Variation 14) */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 scroll-smooth custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={msg.role === 'model' 
                  ? "message max-w-2xl bg-[#ffb7ff]/[0.03] border-l-[3px] border-[#ffb7ff] p-5 sm:p-7 rounded-r-2xl font-garamond text-lg sm:text-xl font-normal leading-relaxed italic text-[#fcfcfc] shadow-sm relative group self-start"
                  : "max-w-xl self-end bg-[#18181c] border border-white/10 rounded-2xl p-4 sm:p-5 text-white font-sans text-sm sm:text-base relative group shadow-md"
                }
                style={{ 
                  backgroundColor: msg.role === 'user' 
                    ? (userBubbleColor === '#b39ddb' ? '#18181c' : userBubbleColor)
                    : (modelBubbleColor === '#ffb7ff' ? 'rgba(255, 183, 255, 0.03)' : modelBubbleColor + '18')
                }}
              >
                {msg.isDrawing && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-[#ffb7ff] mb-2 uppercase tracking-wider font-bold">
                    <Palette size={12} />
                    <span>{msg.role === 'user' ? 'Dibujito para Lewis ♡' : 'Dibujo creado por Lewis ♡'}</span>
                  </div>
                )}

                {msg.image && (
                  <div className="relative mb-3 group/img">
                    <img 
                      src={msg.image} 
                      alt={msg.isDrawing ? "Dibujo" : "Imagen adjunta"} 
                      className="max-w-full rounded-xl border border-[#ffb7ff]/30 shadow-lg object-contain max-h-[380px]" 
                    />
                    <a
                      href={msg.image}
                      download={`lewis_dibujo_${Date.now()}.png`}
                      className="absolute bottom-2 right-2 bg-black/80 hover:bg-black text-[#ffb7ff] p-1.5 rounded-lg border border-[#ffb7ff]/30 text-[10px] opacity-90 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity font-mono-code flex items-center gap-1 shadow-md"
                      title="Descargar imagen"
                    >
                      <Download size={12} />
                      <span className="hidden sm:inline">Guardar</span>
                    </a>
                  </div>
                )}
                {(msg as any).audio && (
                  <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-xl mb-3 border border-white/5 not-italic font-sans">
                    <audio src={(msg as any).audio} controls className="flex-1 h-8 opacity-80 hover:opacity-100" />
                  </div>
                )}
                
                {editingIndex === idx ? (
                  <div className="flex flex-col gap-2 not-italic font-sans">
                    <textarea 
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded p-2 text-sm outline-none resize-none font-sans text-white"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2 font-mono-code text-xs">
                      <button onClick={() => setEditingIndex(null)} className="p-1 hover:bg-white/10 rounded text-white/60">CANCELAR</button>
                      <button onClick={saveEdit} className="p-1 bg-[#ffb7ff] text-black font-bold rounded px-2.5">GUARDAR</button>
                    </div>
                  </div>
                ) : (
                  msg.text && (
                    <div className="markdown-body [&>p]:m-0 [&>p]:mb-3 last:[&>p]:mb-0 [&>ul]:m-0 [&>ul]:pl-5 [&>ol]:m-0 [&>ol]:pl-5 [&>strong]:font-bold [&>strong]:text-[#ffb7ff] not-italic">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )
                )}

                {/* Google Search Grounding Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#ffb7ff]/20 font-sans not-italic text-xs bg-black/40 p-2.5 sm:p-3 rounded-xl">
                    <div className="flex items-center gap-1.5 text-[#ffb7ff] font-mono-code text-[10px] uppercase font-bold tracking-wider mb-2">
                      <Globe size={13} />
                      <span>Fuentes verificadas por el motor de búsqueda:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-white/5 hover:bg-[#ffb7ff]/20 text-[#ffb7ff] px-2 py-0.5 rounded border border-[#ffb7ff]/30 text-[10px] sm:text-[11px] transition-colors max-w-[240px] truncate"
                          title={src.title || src.uri}
                        >
                          <span className="shrink-0">🌐</span>
                          <span className="truncate">{src.title || "Sitio web verificado"}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {msg.role === 'model' && (
                  <>
                    <hr className="border-none border-t border-[#ffb7ff]/20 my-4" />
                    <div className="controls flex items-center justify-between not-italic font-mono-code text-xs">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">DR. LEWIS BLACKWOOD</span>
                      <div className="flex items-center gap-1.5 opacity-90 sm:opacity-40 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => playVoice(msg.text)}
                          className="ctrl-btn bg-white/5 hover:bg-[#ffb7ff]/20 text-white/70 hover:text-[#ffb7ff] p-1.5 rounded transition-all"
                          title="Reproducir voz"
                          aria-label="Reproducir voz de Lewis"
                        >
                          <Volume2 size={13} />
                        </button>
                        {idx === messages.length - 1 && (
                          <button 
                            onClick={handleRegenerate}
                            className="ctrl-btn bg-white/5 hover:bg-[#ffb7ff]/20 text-white/70 hover:text-[#ffb7ff] p-1.5 rounded transition-all"
                            title="Regenerar respuesta"
                            aria-label="Regenerar respuesta"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteMessage(idx)}
                          className="ctrl-btn bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 p-1.5 rounded transition-all"
                          title="Eliminar mensaje"
                          aria-label="Eliminar mensaje"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {msg.role === 'user' && (
                  <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity font-mono-code text-[10px]">
                    <span className="text-white/30 uppercase tracking-wider">TÚ</span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => startEditing(idx, msg.text)}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
                        title="Editar mensaje"
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={() => deleteMessage(idx)}
                        className="p-1 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/5 text-white/70 self-start p-4 rounded-xl text-xs flex items-center gap-3 border border-white/5 font-mono-code"
            >
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#ffb7ff] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-[#ffb7ff] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-[#ffb7ff] rounded-full animate-bounce"></div>
              </div>
              <span>LEWIS ANALIZANDO...</span>
            </motion.div>
          )}

          {isSpeaking && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                if (currentAudioRef.current) {
                  currentAudioRef.current.pause();
                  setIsSpeaking(false);
                }
              }}
              className="bg-[#ffb7ff]/10 text-[#ffb7ff] self-start p-3.5 rounded-xl text-xs flex items-center gap-3 border border-[#ffb7ff]/30 font-mono-code cursor-pointer hover:bg-[#ffb7ff]/20 transition-all group"
              title="Haz clic para callar a Lewis"
            >
              <div className="flex gap-1 items-center h-4">
                <div className="w-1 h-2 bg-[#ffb7ff] rounded-full animate-[pulse_1s_infinite_0ms]"></div>
                <div className="w-1 h-4 bg-[#ffb7ff] rounded-full animate-[pulse_1s_infinite_200ms]"></div>
                <div className="w-1 h-3 bg-[#ffb7ff] rounded-full animate-[pulse_1s_infinite_400ms]"></div>
              </div>
              <span className="font-bold">LEWIS HABLANDO...</span>
              <VolumeX size={14} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Container (Variation 14) */}
        <div className="p-3 sm:p-5 bg-[#0c0c0c] border-t border-white/10 shrink-0">
          {/* Image/Audio Preview */}
          <AnimatePresence>
            {(selectedImage || selectedAudio) && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                className="flex gap-3 overflow-x-auto no-scrollbar pb-3"
              >
                {selectedImage && (
                  <div className="relative shrink-0">
                    <img src={selectedImage.url} alt="Preview" className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded border-2 border-[#ffb7ff] shadow-lg" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors"
                      title="Quitar imagen"
                      aria-label="Quitar imagen seleccionada"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {selectedAudio && (
                  <div className="relative shrink-0 bg-[#151515] p-3 rounded border border-[#ffb7ff] flex items-center gap-3 shadow-lg font-mono-code">
                    <Volume2 size={16} className="text-[#ffb7ff]" />
                    <span className="text-xs text-white/80">AUDIO GRABADO</span>
                    <button 
                      onClick={() => setSelectedAudio(null)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Quitar audio"
                      aria-label="Quitar audio grabado"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-box bg-[#151515] border border-white/15 rounded-xl p-3 sm:p-4 flex flex-col gap-3 focus-within:border-[#ffb7ff]/60 transition-colors shadow-xl">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
              multiple
            />
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isRecording ? "Grabando nota de voz para Lewis..." : isListening ? "Lewis te escucha en vivo..." : "Escribe un mensaje para Lewis..."}
              rows={1}
              className="w-full bg-transparent text-[#fcfcfc] text-sm sm:text-base outline-none resize-none min-h-[42px] max-h-36 overflow-y-auto placeholder:text-white/30 font-sans"
            />

            <div className="action-bar flex justify-between items-center pt-2.5 border-t border-white/10">
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar font-mono-code text-xs">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white/50 hover:text-[#ffb7ff] transition-all flex items-center gap-1 py-1 px-1.5 rounded hover:bg-white/5"
                  title="Adjuntar Imagen"
                  aria-label="Adjuntar Imagen"
                >
                  <ImagePlus size={15} />
                  <span>IMG</span>
                </button>

                <button 
                  onClick={() => setShowDrawingModal(true)}
                  className="text-white/50 hover:text-[#ffb7ff] transition-all flex items-center gap-1 py-1 px-1.5 rounded hover:bg-white/5"
                  title="Hacerle un dibujito a Lewis o pedirle que dibuje"
                  aria-label="Abrir lienzo de dibujo"
                >
                  <Palette size={15} />
                  <span>DIBUJO</span>
                </button>

                <button 
                  onClick={toggleListening}
                  className={`transition-all flex items-center gap-1 py-1 px-1.5 rounded ${isListening ? 'text-red-400 animate-pulse font-bold' : 'text-white/50 hover:text-[#ffb7ff] hover:bg-white/5'}`}
                  title={isListening ? "Detener escucha en vivo" : "Escuchar voz"}
                  aria-label={isListening ? "Detener escucha en vivo" : "Escuchar voz"}
                >
                  <AudioLines size={15} />
                  <span>{isListening ? 'LIVE' : 'VOZ'}</span>
                </button>

                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`transition-all flex items-center gap-1 py-1 px-1.5 rounded ${isRecording ? 'text-red-400 animate-pulse font-bold' : 'text-white/50 hover:text-[#ffb7ff] hover:bg-white/5'}`}
                  title={isRecording ? "Detener grabación" : "Grabar audio"}
                  aria-label={isRecording ? "Detener grabación" : "Grabar audio"}
                >
                  {isRecording ? <Square size={14} /> : <Mic size={15} />}
                  <span>{isRecording ? 'STOP' : 'REC'}</span>
                </button>

                <button 
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  className={`transition-all flex items-center gap-1 py-1 px-1.5 rounded ${isScreenSharing ? 'text-green-400 animate-pulse font-bold' : 'text-white/50 hover:text-[#ffb7ff] hover:bg-white/5'}`}
                  title={isScreenSharing ? "Detener compartir pantalla" : "Compartir pantalla"}
                  aria-label={isScreenSharing ? "Detener compartir pantalla" : "Compartir pantalla"}
                >
                  {isScreenSharing ? <MonitorOff size={15} /> : <Monitor size={15} />}
                  <span>SCREEN</span>
                </button>

                <button 
                  onClick={handleRelax}
                  className="text-white/50 hover:text-[#ffb7ff] transition-all flex items-center gap-1 py-1 px-1.5 rounded hover:bg-white/5"
                  title="Pedir algo para relajarse"
                  aria-label="Pedir algo para relajarse"
                >
                  <Sparkles size={15} />
                  <span>RELAX</span>
                </button>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && !selectedImage && !selectedAudio)}
                className="send-btn bg-[#ffb7ff] text-black font-mono-code font-bold uppercase text-xs px-5 sm:px-6 py-2 sm:py-2.5 rounded shadow-[3px_3px_0px_#333] hover:shadow-[1px_1px_0px_#333] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
                title="Enviar mensaje (Enter)"
                aria-label="Enviar mensaje a Lewis"
              >
                <span>Enviar</span>
                <Send size={13} />
              </motion.button>
            </div>
          </div>
        </div>
      </main>
      </motion.div>

      {/* Lewis Drawing Canvas Modal */}
      <LewisDrawingCanvas
        isOpen={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        onSendToLewis={handleSendDrawingToLewis}
        onRequestLewisToDraw={handleRequestLewisToDraw}
      />
    </div>
  );
}
