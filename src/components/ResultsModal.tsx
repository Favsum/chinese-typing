import React from 'react';
import { TypingStats } from '../types';
import { X, Trophy, Target, Clock, Zap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: TypingStats;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const data = [
    { name: '正确', value: stats.correctChars, color: '#10b981' },
    { name: '错误', value: stats.errors, color: '#f43f5e' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative p-6 text-center bg-indigo-600">
          <button 
            onClick={onClose}
            className="absolute p-2 text-white/80 transition-colors rounded-full top-4 right-4 hover:bg-white/20 hover:text-white"
          >
            <X size={20} />
          </button>
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white/20 rounded-full">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">练习完成!</h2>
          <p className="text-indigo-100">查看您的打字成绩</p>
        </div>

        {/* Stats Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-2 mb-1 text-slate-500">
                <Zap size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">速度 (CPM)</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{stats.wpm}</div>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-2 mb-1 text-slate-500">
                <Target size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">准确率</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{stats.accuracy}%</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-2 mb-1 text-slate-500">
                <Clock size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">用时</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">{stats.timeElapsed}s</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
               <div className="flex items-center justify-center gap-2 mb-1 text-slate-500">
                 <span className="text-xs font-semibold uppercase tracking-wider">总字数</span>
               </div>
               <div className="text-3xl font-bold text-slate-800">{stats.totalChars}</div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 mb-6">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
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
            onClick={onClose}
            className="w-full py-3.5 text-white font-medium bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 focus:ring-4 focus:ring-indigo-100"
          >
            开始新练习
          </button>
        </div>

      </div>
    </div>
  );
};