import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { GameStatus, type DifficultNote, type TypingStats, type CourseItem } from '../types';
import { RefreshCcw, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface TypingEngineProps {
  courseItems: CourseItem[];
  gameStatus: GameStatus;
  onStart: () => void;
  onFinish: (stats: TypingStats) => void;
  onRestart: () => void;
  setStats: (stats: TypingStats) => void;
  onRecordDifficultItem: (note: DifficultNote) => void;
}

const ITEMS_PER_PAGE = 68;
const TAB_DOUBLE_PRESS_MS = 300;

const findPreviousCourseItem = (courseItems: CourseItem[], cursorPosition: number): CourseItem | null => {
  if (cursorPosition <= 0) {
    return null;
  }

  let cumulativeLength = 0;
  let previousItem: CourseItem | null = null;

  for (const item of courseItems) {
    cumulativeLength += item.hanzi.length;
    if (cumulativeLength <= cursorPosition) {
      previousItem = item;
      continue;
    }

    break;
  }

  return previousItem;
};

export const TypingEngine: React.FC<TypingEngineProps> = ({
  courseItems,
  gameStatus,
  onStart,
  onFinish,
  onRestart,
  setStats,
  onRecordDifficultItem,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [committedValue, setCommittedValue] = useState('');
  const [activeTimeMs, setActiveTimeMs] = useState(0);
  const [isFocused, setIsFocused] = useState(true);
  const [inputPos, setInputPos] = useState({ top: 0, left: 0 });
  const [currentPage, setCurrentPage] = useState(0);

  const lastTickRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeCharRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const lastTabPressRef = useRef(0);

  const totalPages = Math.ceil(courseItems.length / ITEMS_PER_PAGE);
  const currentItems = courseItems.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const focusInput = useCallback(() => {
    if (gameStatus !== GameStatus.FINISHED && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [gameStatus]);

  useEffect(() => {
    focusInput();
  }, [focusInput, currentPage]);

  useLayoutEffect(() => {
    if (activeCharRef.current && inputRef.current) {
      const charEl = activeCharRef.current;
      setInputPos({
        top: charEl.offsetTop,
        left: charEl.offsetLeft,
      });
    }
  }, [committedValue, currentPage, isFocused]);

  const calculateStats = useCallback(
    (currentActiveMs: number) => {
      const durationSeconds = currentActiveMs / 1000;
      const fullTargetText = courseItems.map((item) => item.hanzi).join('');

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
        errors: committedValue.length - correct,
      };

      setStats(currentStats);
      return currentStats;
    },
    [committedValue, courseItems, setStats],
  );

  useEffect(() => {
    let interval: number | undefined;

    if (gameStatus === GameStatus.PLAYING && isFocused) {
      lastTickRef.current = Date.now();

      interval = window.setInterval(() => {
        const now = Date.now();
        const delta = now - (lastTickRef.current || now);
        lastTickRef.current = now;

        setActiveTimeMs((prev) => {
          const newTime = prev + delta;
          calculateStats(newTime);
          return newTime;
        });
      }, 100);
    } else {
      lastTickRef.current = null;
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameStatus, isFocused, calculateStats]);

  const processGameLogic = useCallback(
    (text: string) => {
      if (gameStatus === GameStatus.IDLE && text.length > 0) {
        onStart();
      }

      const charsInPrevPages = courseItems
        .slice(0, currentPage * ITEMS_PER_PAGE)
        .reduce((acc, item) => acc + item.hanzi.length, 0);

      const charsInCurrentPage = currentItems.reduce((acc, item) => acc + item.hanzi.length, 0);
      const typedInCurrentPage = text.length - charsInPrevPages;

      if (typedInCurrentPage >= charsInCurrentPage) {
        if (currentPage < totalPages - 1) {
          setCurrentPage((page) => page + 1);
        } else {
          const fullTargetText = courseItems.map((item) => item.hanzi).join('');
          if (text.length >= fullTargetText.length) {
            const finalStats = calculateStats(activeTimeMs);
            onFinish(finalStats);
          }
        }
      }
    },
    [activeTimeMs, calculateStats, courseItems, currentItems, currentPage, gameStatus, onFinish, onStart, totalPages],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameStatus === GameStatus.FINISHED) return;

    const val = e.target.value;
    setInputValue(val);

    if (!isComposing.current) {
      setCommittedValue(val);
      processGameLogic(val);
      e.target.setSelectionRange(val.length, val.length);
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
    e.currentTarget.setSelectionRange(val.length, val.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Tab') {
      return;
    }

    e.preventDefault();

    if (gameStatus === GameStatus.FINISHED) {
      return;
    }

    const now = performance.now();
    if (now - lastTabPressRef.current <= TAB_DOUBLE_PRESS_MS) {
      lastTabPressRef.current = 0;
      const note = findPreviousCourseItem(courseItems, committedValue.length);
      if (note) {
        onRecordDifficultItem({
          hanzi: note.hanzi,
          pinyin: note.pinyin,
        });
      }
      return;
    }

    lastTabPressRef.current = now;
  };

  const renderContent = () => {
    let globalCharIndexBase = 0;
    for (let i = 0; i < currentPage * ITEMS_PER_PAGE; i++) {
      globalCharIndexBase += courseItems[i].hanzi.length;
    }

    let charOffsetCounter = 0;

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-6 content-start select-none">
        {currentItems.map((item, wordIdx) => {
          const chars = item.hanzi.split('').map((char, charIdxInWord) => {
            const absIndex = globalCharIndexBase + charOffsetCounter;
            charOffsetCounter++;
            const userChar = committedValue[absIndex];
            const isCurrent = absIndex === committedValue.length;
            let charColor = 'text-slate-900';

            if (absIndex < committedValue.length) {
              charColor = userChar === char ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium';
            }

            return (
              <div key={charIdxInWord} className="flex flex-col items-center">
                <div
                  className={`text-2xl mb-0 leading-none ${
                    absIndex < committedValue.length ? 'text-slate-400' : 'text-slate-700 font-medium'
                  }`}
                >
                  {char}
                </div>
                <div
                  ref={isCurrent ? activeCharRef : null}
                  className={`relative w-6 h-8 flex items-center justify-center text-2xl transition-colors duration-75 ${charColor}`}
                >
                  {userChar}
                  {isCurrent && isFocused && <div className="absolute bottom-1 w-5 h-0.5 bg-indigo-500 cursor-blink" />}
                </div>
              </div>
            );
          });

          return (
            <div key={wordIdx} className="flex flex-col items-center px-0.5 rounded hover:bg-slate-50 transition-colors">
              <div className="text-xs text-indigo-200 font-mono tracking-tight leading-none opacity-80 mb-1">
                {item.pinyin}
              </div>
              <div className="flex gap-0">{chars}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const totalCharsInCourse = courseItems.reduce((acc, item) => acc + item.hanzi.length, 0);
  const currentProgress = Math.min(100, Math.round((committedValue.length / Math.max(1, totalCharsInCourse)) * 100));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
        <div>
          PAGE {currentPage + 1} / {totalPages}
        </div>
        <div>PROGRESS {currentProgress}%</div>
      </div>

      <div className="relative min-h-[400px] cursor-text outline-none" onClick={focusInput}>
        {!isFocused && gameStatus !== GameStatus.FINISHED && (
          <div className="absolute inset-0 z-50 flex items-start justify-center bg-white/60 pt-20 backdrop-blur-[1px]">
            <div className="flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700">
              <AlertCircle size={18} />
              <span className="font-medium">点击继续练习</span>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
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
            zIndex: 10,
          }}
          value={inputValue}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={gameStatus === GameStatus.FINISHED}
        />

        {renderContent()}
      </div>

      <div className="fixed bottom-0 left-0 z-40 w-full border-t border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCurrentPage((page) => Math.max(0, page - 1));
                focusInput();
              }}
              disabled={currentPage === 0}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => {
                setCurrentPage((page) => Math.min(totalPages - 1, page + 1));
                focusInput();
              }}
              disabled={currentPage === totalPages - 1}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="text-sm font-medium text-slate-500">
            {gameStatus === GameStatus.IDLE ? '开始输入以启动计时' : isFocused ? '练习中...' : '已暂停'}
          </div>

          <button
            onClick={onRestart}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-600"
          >
            <RefreshCcw size={16} />
            <span className="font-medium">重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
