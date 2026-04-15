import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GameStatus,
  type TypingStats,
  type CourseItem,
  type Course,
  type CourseManifestItem,
  type DifficultNote,
} from './types';
import { parseContent, fetchCourseManifest, loadCourseById } from './services/courseService';
import { TypingEngine } from './components/TypingEngine';
import { ResultsModal } from './components/ResultsModal';
import { Keyboard, BookOpen, Upload, Loader2, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';

const createInitialStats = (): TypingStats => ({
  wpm: 0,
  accuracy: 100,
  timeElapsed: 0,
  totalChars: 0,
  correctChars: 0,
  errors: 0,
});

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [currentCourseItems, setCurrentCourseItems] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [resetCount, setResetCount] = useState(0);
  const [isManifestLoading, setIsManifestLoading] = useState(true);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [courseManifest, setCourseManifest] = useState<CourseManifestItem[]>([]);
  const [customCourses, setCustomCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<TypingStats>(createInitialStats);
  const [showResults, setShowResults] = useState(false);
  const [difficultNotes, setDifficultNotes] = useState<DifficultNote[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const courseCacheRef = useRef<Map<string, Course>>(new Map());

  const manifestById = useMemo(() => new Map(courseManifest.map((course) => [course.id, course])), [courseManifest]);
  const customCoursesById = useMemo(() => new Map(customCourses.map((course) => [course.id, course])), [customCourses]);

  const selectOptions = useMemo(() => {
    const manifestOptions = courseManifest.map((course) => ({
      id: course.id,
      label: course.label,
    }));

    const customOptions = customCourses.map((course) => ({
      id: course.id,
      label: course.name,
    }));

    return [...manifestOptions, ...customOptions];
  }, [courseManifest, customCourses]);

  const resetPracticeState = useCallback(() => {
    setGameStatus(GameStatus.IDLE);
    setStats(createInitialStats());
    setShowResults(false);
    setDifficultNotes([]);
    setResetCount((count) => count + 1);
  }, []);

  const goToCourseSelection = useCallback(() => {
    resetPracticeState();
    setSelectedCourseId('');
    setCurrentCourseItems([]);
    setIsCourseLoading(false);
  }, [resetPracticeState]);

  const openCourse = useCallback(
    (courseId: string) => {
      resetPracticeState();
      setSelectedCourseId(courseId);
      setCurrentCourseItems([]);
    },
    [resetPracticeState],
  );

  const loadCourseIntoCache = useCallback(async (courseId: string, courseName: string) => {
    const cachedCourse = courseCacheRef.current.get(courseId);
    if (cachedCourse) {
      return cachedCourse;
    }

    const loadedCourse = await loadCourseById(courseId, courseName);
    if (loadedCourse) {
      courseCacheRef.current.set(courseId, loadedCourse);
    }

    return loadedCourse;
  }, []);

  const preloadAdjacentCourses = useCallback(
    (courseId: string) => {
      const currentIndex = courseManifest.findIndex((course) => course.id === courseId);
      if (currentIndex === -1) {
        return;
      }

      const adjacentCourses = [courseManifest[currentIndex - 1], courseManifest[currentIndex + 1]].filter(
        (course): course is CourseManifestItem => Boolean(course),
      );

      adjacentCourses.forEach((course) => {
        void loadCourseIntoCache(course.id, course.label);
      });
    },
    [courseManifest, loadCourseIntoCache],
  );

  useEffect(() => {
    let isCancelled = false;

    const loadManifest = async () => {
      setIsManifestLoading(true);
      const manifest = await fetchCourseManifest();

      if (!isCancelled) {
        setCourseManifest(manifest);
        setIsManifestLoading(false);
      }
    };

    void loadManifest();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadSelectedCourse = async () => {
      if (!selectedCourseId) {
        setIsCourseLoading(false);
        return;
      }

      const customCourse = customCoursesById.get(selectedCourseId);
      if (customCourse) {
        setCurrentCourseItems(customCourse.items);
        setIsCourseLoading(false);
        return;
      }

      const manifestCourse = manifestById.get(selectedCourseId);
      if (!manifestCourse) {
        setCurrentCourseItems([]);
        setIsCourseLoading(false);
        return;
      }

      setIsCourseLoading(true);
      const loadedCourse = await loadCourseIntoCache(manifestCourse.id, manifestCourse.label);

      if (isCancelled) {
        return;
      }

      setCurrentCourseItems(loadedCourse?.items || []);
      setIsCourseLoading(false);
      preloadAdjacentCourses(manifestCourse.id);
    };

    void loadSelectedCourse();

    return () => {
      isCancelled = true;
    };
  }, [selectedCourseId, customCoursesById, manifestById, loadCourseIntoCache, preloadAdjacentCourses]);

  const handleStart = () => {
    setGameStatus(GameStatus.PLAYING);
  };

  const handleFinish = (finalStats: TypingStats) => {
    setGameStatus(GameStatus.FINISHED);
    setStats(finalStats);
    setShowResults(true);
  };

  const handleRestart = useCallback(() => {
    resetPracticeState();
  }, [resetPracticeState]);

  const handleModalClose = useCallback(() => {
    setShowResults(false);
    handleRestart();
  }, [handleRestart]);

  const handleRecordDifficultItem = useCallback((note: DifficultNote) => {
    setDifficultNotes((currentNotes) => {
      const alreadyExists = currentNotes.some(
        (currentNote) => currentNote.hanzi === note.hanzi && currentNote.pinyin === note.pinyin,
      );

      return alreadyExists ? currentNotes : [...currentNotes, note];
    });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result as string;
      if (!content) return;

      const parsedItems = parseContent(content);
      if (parsedItems.length === 0) {
        alert('文件内容为空或格式不正确');
        return;
      }

      const newCourseId = `custom_${Date.now()}`;
      const newCourse: Course = {
        id: newCourseId,
        name: file.name.replace(/\.[^.]+$/, '') || '自定义课程',
        items: parsedItems,
        rawContent: content,
      };

      courseCacheRef.current.set(newCourseId, newCourse);
      setCustomCourses((courses) => [...courses, newCourse]);
      openCourse(newCourseId);
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentCourseIndex = courseManifest.findIndex((course) => course.id === selectedCourseId);
  const hasNextCourse = currentCourseIndex !== -1 && currentCourseIndex < courseManifest.length - 1;

  const handleNextCourse = useCallback(() => {
    if (!hasNextCourse) {
      handleModalClose();
      return;
    }

    const nextCourse = courseManifest[currentCourseIndex + 1];
    if (nextCourse) {
      openCourse(nextCourse.id);
    }
  }, [courseManifest, currentCourseIndex, handleModalClose, hasNextCourse, openCourse]);

  const isHomeScreen = selectedCourseId === '';

  const renderHomeScreen = () => {
    if (isManifestLoading) {
      return (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      );
    }

    if (courseManifest.length === 0) {
      return <div className="flex items-center justify-center h-64 text-slate-400">暂无可用章节</div>;
    }

    return (
      <div className="max-w-5xl mx-auto w-full px-4 pb-28">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {courseManifest.map((course) => (
            <button
              key={course.id}
              onClick={() => openCourse(course.id)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50"
            >
              <div className="text-sm font-semibold text-slate-800">{course.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded text-white">
              <Keyboard size={20} />
            </div>
            <h1 className="text-lg font-bold text-slate-900">汉语打字练习</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
              <BookOpen size={16} className="text-slate-500" />
              {isManifestLoading ? (
                <div className="flex items-center gap-2 px-2 text-sm text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span>加载课程中...</span>
                </div>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (!nextValue) {
                      goToCourseSelection();
                      return;
                    }

                    openCourse(nextValue);
                  }}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none focus:ring-0 cursor-pointer w-32 md:w-48"
                  disabled={selectOptions.length === 0}
                >
                  <option value="">选择章节</option>
                  {selectOptions.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              title="导入本地TXT课程文件"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">导入课程</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto flex flex-col pt-24">
        {!isHomeScreen && (
          <div className="max-w-4xl mx-auto w-full px-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 py-2 px-6 flex items-center justify-between">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">速度 (WPM)</span>
              <span className="text-xl font-black text-indigo-600 tabular-nums leading-none">{stats.wpm}</span>
            </div>

            <div className="h-8 w-px bg-slate-100"></div>

            <div className="flex flex-col items-center md:items-start">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">准确率</span>
              <span className={`text-xl font-black tabular-nums leading-none ${stats.accuracy < 90 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {stats.accuracy}%
              </span>
            </div>

            <div className="h-8 w-px bg-slate-100"></div>

            <div className="flex flex-col items-center md:items-start">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">已输入</span>
              <span className="text-xl font-black text-slate-700 tabular-nums leading-none">{stats.totalChars}</span>
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-100"></div>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">用时</span>
              <span className="text-xl font-bold text-slate-600 tabular-nums leading-none">
                {Math.floor(stats.timeElapsed / 60)}:{String(stats.timeElapsed % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
          </div>
        )}

        <div className="flex-1">
          {isHomeScreen ? (
            renderHomeScreen()
          ) : currentCourseItems.length > 0 ? (
            <TypingEngine
              key={`${selectedCourseId}-${resetCount}`}
              courseItems={currentCourseItems}
              gameStatus={gameStatus}
              onStart={handleStart}
              onFinish={handleFinish}
              onRestart={handleRestart}
              setStats={setStats}
              onRecordDifficultItem={handleRecordDifficultItem}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              {isCourseLoading ? '加载中...' : '请选择一个课程开始练习'}
            </div>
          )}
        </div>
      </main>

      {isHomeScreen && (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur border-t border-slate-200 p-3 shadow-lg z-40">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex gap-2">
              <button
                disabled
                className="p-2 text-slate-500 rounded-lg opacity-30"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                disabled
                className="p-2 text-slate-500 rounded-lg opacity-30"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="text-sm font-medium text-slate-500">选择章节开始练习</div>

            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm opacity-40"
            >
              <RefreshCcw size={16} />
              <span className="font-medium">重置</span>
            </button>
          </div>
        </div>
      )}

      <ResultsModal
        isOpen={showResults}
        onClose={handleModalClose}
        stats={stats}
        hasNextCourse={hasNextCourse}
        onNextCourse={handleNextCourse}
        difficultNotes={difficultNotes}
      />
    </div>
  );
};

export default App;
