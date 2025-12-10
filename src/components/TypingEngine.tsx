
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { GameStatus, type TypingStats, type CourseItem } from '../types';
import { RefreshCcw, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface TypingEngineProps {
  courseItems: CourseItem[];
  gameStatus: GameStatus;
  onStart: () => void;
  onFinish: (stats: TypingStats) => void;
  onRestart: () => void;
  setStats: (stats: TypingStats) => void;
}

// Increased to 60 to ensure ~5 lines of text
const ITEMS_PER_PAGE = 68;

export const TypingEngine: React.FC<TypingEngineProps> = ({
  courseItems,
  gameStatus,
  onStart,
  onFinish,
  onRestart,
  setStats
}) => {
  // State
  const [inputValue, setInputValue] = useState('');
  const [committedValue, setCommittedValue] = useState('');
  
  const [startTime, setStartTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeCharRef = useRef<HTMLDivElement>(null); // Ref to track the current character DOM element
  const [isFocused, setIsFocused] = useState(true);
  
  // Input Position State for IME following
  const [inputPos, setInputPos] = useState({ top: 0, left: 0 });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  
  // IME State
  const isComposing = useRef(false);

  // Derived Data
  const totalPages = Math.ceil(courseItems.length / ITEMS_PER_PAGE);
  const currentItems = courseItems.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // Auto focus logic
  const focusInput = useCallback(() => {
    if (gameStatus !== GameStatus.FINISHED && inputRef.current) {
        // Prevent scroll jumping when focusing
        inputRef.current.focus({ preventScroll: true });
    }
  }, [gameStatus]);

  useEffect(() => {
    focusInput();
  }, [focusInput, currentPage]);

  const handleContainerClick = () => {
    focusInput();
  };

  // Update Input Position to follow the active character
  useLayoutEffect(() => {
    if (activeCharRef.current && inputRef.current) {
      const charEl = activeCharRef.current;
      // Position the hidden input exactly over the current character
      // This forces the IME candidate window to appear at the correct location
      setInputPos({
        top: charEl.offsetTop,
        left: charEl.offsetLeft
      });
    }
  }, [committedValue, currentPage, isFocused]);

  // Stats Calculation
  const calculateStats = useCallback(() => {
    if (!startTime) return null;
    
    const now = Date.now();
    const durationSeconds = (now - startTime) / 1000;
    
    const fullTargetText = courseItems.map(item => item.hanzi).join('');
    
    let correct = 0;
    const minLen = Math.min(committedValue.length, fullTargetText.length);
    for (let i = 0; i < minLen; i++) {
      if (committedValue[i] === fullTargetText[i]) correct++;
    }

    const accuracy = committedValue.length > 0 ? (correct / committedValue.length) * 100 : 100;
    const wpm = durationSeconds > 0 ? (correct / durationSeconds) * 60 : 0;

    const currentStats: TypingStats = {
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy),
      timeElapsed: Math.round(durationSeconds),
      totalChars: committedValue.length,
      correctChars: correct,
      errors: committedValue.length - correct
    };

    setStats(currentStats);
    return currentStats;
  }, [committedValue, courseItems, startTime, setStats]);

  // Timer
  useEffect(() => {
    let interval: number;
    if (gameStatus === GameStatus.PLAYING) {
      interval = window.setInterval(() => {
        calculateStats();
      }, 500);
    }
    return () => clearInterval(interval);
  }, [gameStatus, calculateStats]);

  // --- Input Handling ---

  const processGameLogic = (text: string) => {
    if (gameStatus === GameStatus.IDLE && text.length > 0) {
      onStart();
      setStartTime(Date.now());
    }

    const charsInPrevPages = courseItems
        .slice(0, currentPage * ITEMS_PER_PAGE)
        .reduce((acc, item) => acc + item.hanzi.length, 0);
    
    const charsInCurrentPage = currentItems.reduce((acc, item) => acc + item.hanzi.length, 0);
    const typedInCurrentPage = text.length - charsInPrevPages;

    if (typedInCurrentPage >= charsInCurrentPage) {
        if (currentPage < totalPages - 1) {
             setCurrentPage(p => p + 1);
        } else {
             const fullTargetText = courseItems.map(item => item.hanzi).join('');
             if (text.length >= fullTargetText.length) {
                 const finalStats = calculateStats();
                 if (finalStats) onFinish(finalStats);
             }
        }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameStatus === GameStatus.FINISHED) return;

    const val = e.target.value;
    setInputValue(val);

    if (!isComposing.current) {
        setCommittedValue(val);
        processGameLogic(val);
    }
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposing.current = false;
    const val = e.currentTarget.value;
    setInputValue(val); 
    setCommittedValue(val);
    processGameLogic(val);
  };

  // --- Rendering ---

  const renderContent = () => {
    let globalCharIndexBase = 0;
    for(let i=0; i<currentPage * ITEMS_PER_PAGE; i++) {
        globalCharIndexBase += courseItems[i].hanzi.length;
    }

    let charOffsetCounter = 0;

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-4 content-start select-none">
        {currentItems.map((item, wordIdx) => {
          
          const chars = item.hanzi.split('').map((char, charIdxInWord) => {
            const absIndex = globalCharIndexBase + charOffsetCounter;
            charOffsetCounter++; 

            const userChar = committedValue[absIndex];
            const isCurrent = absIndex === committedValue.length;
            
            let charColor = "text-slate-900"; 
            let bgColor = "bg-transparent";
            
            if (absIndex < committedValue.length) {
              if (userChar === char) {
                charColor = "text-emerald-600 font-bold";
                // Optional: subtle background for correctness
                bgColor = "bg-transparent"; 
              } else {
                charColor = "text-rose-600 font-bold";
                bgColor = "bg-rose-50"; // Keep error highlight subtle
              }
            }
            
            return (
               <div 
                 key={charIdxInWord} 
                 className="flex flex-col items-center"
               >
                  {/* Hanzi (Reference) */}
                  <div className={`text-xl mb-0 leading-none ${absIndex < committedValue.length ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
                    {char}
                  </div>
                  
                  {/* Input Box - No borders, just position */}
                  <div 
                    ref={isCurrent ? activeCharRef : null}
                    className={`relative w-6 h-8 flex items-center justify-center text-lg transition-colors duration-75 ${bgColor} ${charColor}`}
                  >
                    {userChar}
                    {/* Blinking Cursor - Used standard css class .cursor-blink from index.html instead of tailwind arbitrary value */}
                    {isCurrent && isFocused && (
                        <div className="absolute bottom-1 w-5 h-0.5 bg-indigo-500 cursor-blink"></div>
                    )}
                  </div>
               </div>
            );
          });

          return (
            <div key={wordIdx} className="flex flex-col items-center px-0.5 rounded hover:bg-slate-50 transition-colors">
               {/* Pinyin (Top) */}
               <div className="text-xs text-indigo-400 font-mono tracking-tight leading-none opacity-80 mb-1">
                 {item.pinyin}
               </div>
               
               {/* Characters Container - Tight gap */}
               <div className="flex gap-0">
                 {chars}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Calculate total progress
  const totalCharsInCourse = courseItems.reduce((acc, item) => acc + item.hanzi.length, 0);
  const currentProgress = Math.min(100, Math.round((committedValue.length / Math.max(1, totalCharsInCourse)) * 100));

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-24">
      
      <div className="flex justify-between items-center mb-2 text-xs text-slate-400 font-medium uppercase tracking-wide">
          <div>PAGE {currentPage + 1} / {totalPages}</div>
          <div>PROGRESS {currentProgress}%</div>
      </div>

      <div 
        className="relative outline-none cursor-text min-h-[400px]"
        onClick={handleContainerClick}
      >
        {!isFocused && gameStatus !== GameStatus.FINISHED && (
           <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 bg-white/60 backdrop-blur-[1px]">
             <div className="flex items-center gap-2 px-5 py-2.5 text-white bg-indigo-600 rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition-transform hover:scale-105">
                <AlertCircle size={18} />
                <span className="font-medium">点击继续练习</span>
             </div>
           </div>
        )}

        {/* Hidden Input - Moving Follower */}
        <input
          ref={inputRef}
          type="text"
          // Key change: We use inline styles to position this input exactly over the active character
          style={{
             top: inputPos.top,
             left: inputPos.left,
             width: '1.5rem', 
             height: '1.5rem',
             opacity: 0, 
             position: 'absolute',
             padding: 0,
             margin: 0,
             border: 'none',
             pointerEvents: 'none',
             zIndex: 10
          }}
          value={inputValue}
          onChange={handleChange} 
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          disabled={gameStatus === GameStatus.FINISHED}
        />

        {renderContent()}

      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur border-t border-slate-200 p-3 shadow-lg z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex gap-2">
                <button
                    onClick={() => {
                        setCurrentPage(p => Math.max(0, p - 1));
                        focusInput();
                    }}
                    disabled={currentPage === 0}
                    className="p-2 text-slate-500 hover:text-indigo-600 disabled:opacity-30 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={() => {
                        setCurrentPage(p => Math.min(totalPages - 1, p + 1));
                        focusInput();
                    }}
                    disabled={currentPage === totalPages - 1}
                    className="p-2 text-slate-500 hover:text-indigo-600 disabled:opacity-30 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            <div className="text-sm font-medium text-slate-500">
                {gameStatus === GameStatus.IDLE ? '开始输入以启动计时' : gameStatus === GameStatus.PLAYING ? '练习中...' : '完成'}
            </div>

            <button
            onClick={onRestart}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-all bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 shadow-sm"
            >
            <RefreshCcw size={16} />
            <span className="font-medium">重置</span>
            </button>
        </div>
      </div>
    </div>
  );
};
