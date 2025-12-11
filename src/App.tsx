
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameStatus, type TypingStats, type CourseItem, type Course } from './types';
import { COURSES, parseContent, fetchExternalCourses } from './services/courseService';
import { TypingEngine } from './components/TypingEngine';
import { ResultsModal } from './components/ResultsModal';
import { Keyboard, BookOpen, Upload, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // Game State
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [currentCourseItems, setCurrentCourseItems] = useState<CourseItem[]>([]);
  
  // Settings
  // Initial state is empty since we load everything from files now
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [resetCount, setResetCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom Courses State (User Uploads)
  const [customCourses, setCustomCourses] = useState<Course[]>([]);
  
  // External Courses State (Fetched from server/folder)
  const [externalCourses, setExternalCourses] = useState<Course[]>([]);

  // Combined Courses: Built-in (Empty now) + External (Server) + Custom (Upload)
  // Fix: Use useMemo to prevent infinite loop. Without useMemo, this creates a new array on every render,
  // which causes loadCourse to change, which triggers the useEffect below, which triggers a re-render.
  const allCourses = useMemo(() => {
    return [...COURSES, ...externalCourses, ...customCourses];
  }, [externalCourses, customCourses]);

  // Stats
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    timeElapsed: 0,
    totalChars: 0,
    correctChars: 0,
    errors: 0
  });

  const [showResults, setShowResults] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load external courses on mount
  useEffect(() => {
    setIsLoading(true);
    fetchExternalCourses().then(courses => {
        if (courses.length > 0) {
            setExternalCourses(courses);
            // Automatically select the first course if none selected
            setSelectedCourseId(courses[0].id);
        }
        setIsLoading(false);
    });
  }, []);

  // Load course text
  const loadCourse = useCallback(() => {
    if (!selectedCourseId) return;

    setGameStatus(GameStatus.IDLE);
    setStats({
      wpm: 0,
      accuracy: 100,
      timeElapsed: 0,
      totalChars: 0,
      correctChars: 0,
      errors: 0
    });
    
    // Find in allCourses (built-in + external + custom)
    const course = allCourses.find(c => c.id === selectedCourseId);
    if (course) {
      setCurrentCourseItems(course.items);
    }
  }, [selectedCourseId, allCourses]); 

  useEffect(() => {
    loadCourse();
    setResetCount(prev => prev + 1);
  }, [loadCourse]);

  const handleStart = () => {
    setGameStatus(GameStatus.PLAYING);
  };

  const handleFinish = (finalStats: TypingStats) => {
    setGameStatus(GameStatus.FINISHED);
    setStats(finalStats);
    setShowResults(true);
  };

  const handleRestart = () => {
    setGameStatus(GameStatus.IDLE);
    setStats({
      wpm: 0,
      accuracy: 100,
      timeElapsed: 0,
      totalChars: 0,
      correctChars: 0,
      errors: 0
    });
    setResetCount(prev => prev + 1); // Increment to force re-render of TypingEngine
  };
  
  const handleModalClose = () => {
    setShowResults(false);
    handleRestart();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const parsedItems = parseContent(content);
        if (parsedItems.length > 0) {
          const newCourseId = `custom_${Date.now()}`;
          const newCourse: Course = {
            id: newCourseId,
            name: file.name.replace('.txt', '') || '自定义课程',
            items: parsedItems,
            rawContent: content
          };
          
          setCustomCourses(prev => [...prev, newCourse]);
          setSelectedCourseId(newCourseId);
        } else {
            alert("文件内容为空或格式不正确");
        }
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  // Logic for Next Course
  const currentCourseIndex = allCourses.findIndex(c => c.id === selectedCourseId);
  const hasNextCourse = currentCourseIndex !== -1 && currentCourseIndex < allCourses.length - 1;

  const handleNextCourse = () => {
    if (hasNextCourse) {
        // Changing the selectedId will trigger the useEffect, which calls loadCourse, 
        // which resets the game and increments resetCount.
        setSelectedCourseId(allCourses[currentCourseIndex + 1].id);
        setShowResults(false);
    } else {
        handleModalClose();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      
      {/* Compact Navbar */}
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
                  <BookOpen size={16} className="text-slate-500"/>
                  {isLoading ? (
                    <div className="flex items-center gap-2 px-2 text-sm text-slate-500">
                       <Loader2 size={14} className="animate-spin" />
                       <span>加载课程中...</span>
                    </div>
                  ) : (
                    <select 
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none focus:ring-0 cursor-pointer w-32 md:w-48"
                        disabled={allCourses.length === 0}
                    >
                        {allCourses.length === 0 && <option>无可用课程</option>}
                        {allCourses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                  )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden" 
                accept=".txt"
              />
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

      {/* Main Content */}
      <main className="flex-1 w-full mx-auto flex flex-col pt-24">
        
        {/* Stats Strip - Made Compact */}
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
                  <span className="text-xl font-black text-slate-700 tabular-nums leading-none">
                    {stats.totalChars}
                  </span>
               </div>
               
               <div className="hidden md:block h-8 w-px bg-slate-100"></div>
               
               <div className="hidden md:flex flex-col text-right">
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">用时</span>
                   <span className="text-xl font-bold text-slate-600 tabular-nums leading-none">{Math.floor(stats.timeElapsed / 60)}:{String(stats.timeElapsed % 60).padStart(2, '0')}</span>
               </div>
            </div>
        </div>

        {/* Game Area */}
        <div className="flex-1">
           {/* Key includes resetCount to completely destroy and recreate component on reset */}
           {currentCourseItems.length > 0 ? (
               <TypingEngine 
                  key={`${selectedCourseId}-${resetCount}`}
                  courseItems={currentCourseItems}
                  gameStatus={gameStatus}
                  onStart={handleStart}
                  onFinish={handleFinish}
                  onRestart={handleRestart}
                  setStats={setStats}
               />
           ) : (
               <div className="flex items-center justify-center h-64 text-slate-400">
                   {isLoading ? "加载中..." : "请选择一个课程开始练习"}
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
      />
    </div>
  );
};

export default App;
