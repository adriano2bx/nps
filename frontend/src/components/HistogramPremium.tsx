import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HistogramPremiumProps {
  data: Array<{ score: number; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const score = parseInt(label);
    let category = 'Passivo';
    let colorClass = 'text-zinc-500';
    
    if (score >= 9) {
      category = 'Promotor';
      colorClass = 'text-emerald-500';
    } else if (score <= 6) {
      category = 'Detrator';
      colorClass = 'text-rose-500';
    } else {
      category = 'Passivo';
      colorClass = 'text-zinc-500 font-bold';
    }

    return (
      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-3 shadow-2xl rounded-lg min-w-[140px] backdrop-blur-md bg-opacity-90">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nota {label}</span>
          <span className={`text-sm font-black ${colorClass}`}>{category}</span>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1.5" />
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Respostas:</span>
            <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">{payload[0].value}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const HistogramPremium: React.FC<HistogramPremiumProps> = ({ data }) => {
  // Ensure we have all 1-10 scores
  const fullData = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1;
    const existing = data.find(d => d.score === score);
    return existing || { score, count: 0 };
  });

  return (
    <div className="h-[280px] w-full group">
       <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={fullData} 
            margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
             barGap={2}
          >
            <defs>
               <linearGradient id="barPromoter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
               </linearGradient>
               <linearGradient id="barPassive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71717a" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#52525b" stopOpacity={0.8}/>
               </linearGradient>
               <linearGradient id="barDetractor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
               </linearGradient>
               
               {/* Reflection Effect */}
               <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                     <feMergeNode in="coloredBlur" />
                     <feMergeNode in="SourceGraphic" />
                  </feMerge>
               </filter>
            </defs>

            <XAxis 
              dataKey="score" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#71717a', fontWeight: '800' }}
              dy={10}
            />
            <YAxis 
               axisLine={false} 
               tickLine={false} 
               tick={{ fontSize: 10, fill: '#3f3f46' }}
               allowDecimals={false}
            />
            
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} 
              content={<CustomTooltip />}
              animationDuration={200}
            />

            <ReferenceLine x={6.5} stroke="#3f3f46" strokeDasharray="3 3" opacity={0.2} />
            <ReferenceLine x={8.5} stroke="#3f3f46" strokeDasharray="3 3" opacity={0.2} />

            <Bar 
              dataKey="count" 
              radius={[6, 6, 2, 2]} 
              animationDuration={1500}
              animationBegin={200}
            >
              {
                fullData.map((entry, index) => {
                  let fill = "url(#barPassive)";
                  if (entry.score >= 9) fill = "url(#barPromoter)";
                  else if (entry.score <= 6) fill = "url(#barDetractor)";
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={fill}
                      className="transition-all duration-300 hover:opacity-100 opacity-90 cursor-pointer"
                    />
                  );
                })
              }
            </Bar>
          </BarChart>
       </ResponsiveContainer>
    </div>
  );
};
