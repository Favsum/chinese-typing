import React, { useState } from 'react';
import type { DifficultNote, TypingStats } from '../types';
import { X, Trophy, Target, Clock, Zap, ArrowRight, RefreshCw, FileText, Copy, Check } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: TypingStats;
  hasNextCourse: boolean;
  onNextCourse: () => void;
  difficultNotes: DifficultNote[];
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  onClose,
  stats,
  hasNextCourse,
  onNextCourse,
  difficultNotes,
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  if (!isOpen) return null;

  const data = [
    { name: '正确', value: stats.correctChars, color: '#10b981' },
    { name: '错误', value: stats.errors, color: '#f43f5e' },
  ];

  const minutes = Math.floor(stats.timeElapsed / 60);
  const seconds = stats.timeElapsed % 60;
  const timeString = minutes > 0 ? `${minutes}分 ${seconds}秒` : `${seconds}秒`;
  const handleCloseResults = () => {
    setShowNotes(false);
    setCopyStatus('idle');
    onClose();
  };

  const handleNextAction = () => {
    setShowNotes(false);
    setCopyStatus('idle');
    if (hasNextCourse) {
      onNextCourse();
      return;
    }

    onClose();
  };

  const notesText = difficultNotes.map((note) => `${note.hanzi} ${note.pinyin}`).join('\n');

  const handleCloseNotes = () => {
    setShowNotes(false);
    setCopyStatus('idle');
  };

  const handleCopyNotes = async () => {
    if (!notesText) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(notesText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = notesText;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopyStatus('copied');
      window.setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy difficult notes:', error);
      setCopyStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="relative bg-indigo-600 p-6 text-center">
          <button
            onClick={handleCloseResults}
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X size={20} />
          </button>
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-white/20 p-3">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">练习完成</h2>
          <p className="text-indigo-100">查看本次练习成绩与易错词笔记</p>
        </div>

        <div className="p-6">
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <div className="mb-1 flex items-center justify-center gap-2 text-slate-500">
                <Zap size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">速度 (CPM)</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{stats.wpm}</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <div className="mb-1 flex items-center justify-center gap-2 text-slate-500">
                <Target size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">准确率</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{stats.accuracy}%</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <div className="mb-1 flex items-center justify-center gap-2 text-slate-500">
                <Clock size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">用时</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{timeString}</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <div className="mb-1 flex items-center justify-center gap-2 text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">总字数</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{stats.totalChars}</div>
            </div>
          </div>

          <div className="mb-6 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={40} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <button
            onClick={() => setShowNotes(true)}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            <FileText size={18} />
            <span>查看易错词</span>
          </button>

          <button
            onClick={handleNextAction}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-medium text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100"
          >
            {hasNextCourse ? (
              <>
                <span>开始下一章</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>再练一次</span>
                <RefreshCw size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      {showNotes && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-end border-b border-slate-200 px-5 py-4">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyNotes}
                  disabled={difficultNotes.length === 0}
                  aria-label="Copy difficult notes text"
                  className="flex items-center justify-center rounded-full border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copyStatus === 'copied' ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <button
                  onClick={handleCloseNotes}
                  className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5">
              {difficultNotes.length > 0 ? (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {difficultNotes.map((note, index) => (
                    <div
                      key={`${note.hanzi}-${note.pinyin}-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                    >
                      {note.hanzi} {note.pinyin}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-slate-500 opacity-70">
                  <p className="text-sm leading-6">
                    练习过程中双击 Tab，会记录当前光标前一个完整词组。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
