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
import { Keyboard, BookOpen, Upload, Loader2, ChevronLeft, Settings, X } from 'lucide-react';

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
  const [selectedCourseId, setSelectedCourseId] = useState(() => {
    return localStorage.getItem('chinese_typing_selected_course') || '';
  });
  const [resetCount, setResetCount] = useState(0);
  const [isManifestLoading, setIsManifestLoading] = useState(true);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [courseManifest, setCourseManifest] = useState<CourseManifestItem[]>([]);
  const [customCourses, setCustomCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<TypingStats>(createInitialStats);
  const [showResults, setShowResults] = useState(false);
  const [difficultNotes, setDifficultNotes] = useState<DifficultNote[]>([]);

  // 设置相关状态
  const [showPinyin, setShowPinyin] = useState(() => {
    const saved = localStorage.getItem('chinese_typing_show_pinyin');
    return saved !== null ? saved === 'true' : true;
  });
  const [pinyinSize, setPinyinSize] = useState(() => {
    const saved = localStorage.getItem('chinese_typing_pinyin_size');
    return saved ? parseInt(saved, 10) : 14;
  });
  const [pinyinOpacity, setPinyinOpacity] = useState(() => {
    const saved = localStorage.getItem('chinese_typing_pinyin_opacity');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const courseCacheRef = useRef<Map<string, Course>>(new Map());

  const manifestById = useMemo(() => new Map(courseManifest.map((course) => [course.id, course])), [courseManifest]);
  const customCoursesById = useMemo(() => new Map(customCourses.map((course) => [course.id, course])), [customCourses]);

  useEffect(() => {
    localStorage.setItem('chinese_typing_selected_course', selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    localStorage.setItem('chinese_typing_show_pinyin', String(showPinyin));
    localStorage.setItem('chinese_typing_pinyin_size', String(pinyinSize));
    localStorage.setItem('chinese_typing_pinyin_opacity', String(pinyinOpacity));
  }, [showPinyin, pinyinSize, pinyinOpacity]);

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
      <div className="max-w-5xl mx-auto w-full px-4 pb-20 mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {courseManifest.map((course) => (
            <button
              key={course.id}
              onClick={() => openCourse(course.id)}
              className="group relative flex items-center justify-center py-5 px-4 bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_-6px_rgba(79,70,229,0.15)] hover:-translate-y-[1px] hover:border-indigo-300 transition-all duration-300 overflow-hidden text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 text-[15px] font-medium text-slate-700 group-hover:text-indigo-600 transition-colors tracking-wide">
                {course.label}
              </span>
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
            <div
              className={`flex items-center gap-2 ${!isHomeScreen ? 'cursor-pointer group' : ''}`}
              onClick={!isHomeScreen ? goToCourseSelection : undefined}
              title={!isHomeScreen ? "返回首页" : undefined}
            >
              <div className="p-1.5 bg-indigo-600 rounded text-white group-hover:bg-indigo-700 transition-colors">
                <Keyboard size={20} />
              </div>
              <h1 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                中文打字练习
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 bg-white text-slate-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors"
              title="显示设置"
            >
              <Settings size={18} />
            </button>
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


        <div className="flex-1">
          {isHomeScreen ? (
            renderHomeScreen()
          ) : currentCourseItems.length > 0 ? (
            <div className="flex flex-col w-full h-full">
              <div className="mx-auto w-full max-w-6xl pt-2 pb-4">
                <button
                  onClick={goToCourseSelection}
                  className="inline-flex items-center justify-center gap-1 pl-3 pr-4 py-1.5 text-sm font-medium text-slate-400 bg-[#F8FAFC] rounded-lg w-fit"
                >
                  <ChevronLeft size={16} className="translate-y-[-0.5px]" />
                  <span>返回</span>
                </button>
              </div>
              <TypingEngine
                key={`${selectedCourseId}-${resetCount}`}
                courseItems={currentCourseItems}
                gameStatus={gameStatus}
                stats={stats}
                onStart={handleStart}
                onFinish={handleFinish}
                onRestart={handleRestart}
                setStats={setStats}
                onRecordDifficultItem={handleRecordDifficultItem}
                showPinyin={showPinyin}
                pinyinSize={pinyinSize}
                pinyinOpacity={pinyinOpacity}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              {isCourseLoading ? '加载中...' : '请选择一个课程开始练习'}
            </div>
          )}
        </div>
      </main>



      <ResultsModal
        isOpen={showResults}
        onClose={handleModalClose}
        stats={stats}
        hasNextCourse={hasNextCourse}
        onNextCourse={handleNextCourse}
        difficultNotes={difficultNotes}
      />

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">显示设置</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-white hover:bg-white border-none"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">显示拼音</span>
                <button
                  onClick={() => setShowPinyin(!showPinyin)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors p-0 border-none focus:ring-0 ${showPinyin ? 'bg-indigo-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${showPinyin ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className={`space-y-2 transition-opacity ${!showPinyin ? 'opacity-50' : ''}`}>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">拼音大小</span>
                  <span className="text-xs text-slate-500 font-mono">{pinyinSize}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={pinyinSize}
                  onChange={(e) => setPinyinSize(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                  disabled={!showPinyin}
                />
              </div>
              <div className={`space-y-2 transition-opacity ${!showPinyin ? 'opacity-50' : ''}`}>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700">拼音显示淡化</span>
                  <span className="text-xs text-slate-500 font-mono">{pinyinOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pinyinOpacity}
                  onChange={(e) => setPinyinOpacity(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                  disabled={!showPinyin}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
