import { useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Loader2, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../contexts/DataContext';
import { HistogramPremium } from '../components/HistogramPremium';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#0a0a0b] border border-zinc-200 dark:border-zinc-800 p-3 shadow-xl rounded-md min-w-[120px]">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {payload[0].name}: <span className="text-brand-600 dark:text-brand-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const NpsGauge = ({ score }: { score: number }) => {
  // Normalize -100 to 100 into 0 to 180 degrees
  const angle = ((score + 100) / 200) * 180;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="240" height="130" viewBox="0 0 240 130" className="overflow-visible">
        {/* Background Arc - Critical */}
        <path d="M 20 120 A 100 100 0 0 1 120 20" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.1" />
        {/* Background Arc - Rest */}
        <path d="M 120 20 A 100 100 0 0 1 220 120" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" opacity="0.1" />
        
        {/* Active Zones */}
        <path d="M 20 120 A 100 100 0 0 1 120 20" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="157 157" strokeDashoffset={score < 0 ? 157 + (score * 1.57) : 0} className="transition-all duration-1000" />
        <path d="M 120 20 A 100 100 0 0 1 220 120" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="157 157" strokeDashoffset={score > 0 ? 157 - (score * 1.57) : 157} className="transition-all duration-1000" />

        {/* Pointer Needle */}
        <g transform={`rotate(${angle - 90}, 120, 120)`} className="transition-transform duration-1000 ease-out">
          <line x1="120" y1="120" x2="120" y2="35" stroke="currentColor" strokeWidth="3" className="text-zinc-900 dark:text-white" />
          <circle cx="120" cy="120" r="6" fill="currentColor" className="text-zinc-900 dark:text-white" />
        </g>
        
        {/* Center Text */}
        <text x="120" y="110" textAnchor="middle" className="text-2xl font-bold fill-zinc-900 dark:fill-white">{score}</text>
        <text x="120" y="125" textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest fill-zinc-400">NPS Global</text>
      </svg>
      
      {/* Legend Labels */}
      <div className="flex justify-between w-[220px] mt-2 text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
        <span>Crítico</span>
        <span>Excelência</span>
      </div>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex justify-between items-end gap-4 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-1/3"></div>
    <div className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-[300px] bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>
      <div className="h-[300px] bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="h-[300px] bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>
      <div className="h-[300px] bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>
      <div className="h-[300px] bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>
    </div>
  </div>
);

export default function Dashboard() {
  const { dashboard: data, loading, isRefreshing, refreshDashboard } = useData();
  const navigate = useNavigate();

  // Automatic Refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing.dashboard) {
        refreshDashboard();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshDashboard, isRefreshing.dashboard]);

  if (loading.dashboard && !data) {
    return <DashboardSkeleton />;
  }

  const stats = data?.stats;
  const distribution = data?.distribution || [];
  const timeSeries = data?.timeSeries || [];
  const byCampaign = data?.byCampaign || [];
  const recent = data?.recent || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Visão Geral</h1>
            {isRefreshing.dashboard && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Métricas de Net Promoter Score dos seus envios ativos em tempo real.</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => refreshDashboard()}
              disabled={isRefreshing.dashboard}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
               {isRefreshing.dashboard ? 'Atualizando...' : 'Atualizar Dados'}
            </button>
        </div>
      </div>

      <div className="border border-zinc-200 dark:border-surface-border/80 rounded-lg bg-white dark:bg-surface-card flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-surface-border/80 shadow-sm">
         {[
           { label: "Net Promoter Score", value: stats?.score || 0, sub: `${stats?.total || 0} respostas totais`, trend: (stats?.score || 0) >= 0 ? "up" : "down" },
           { label: "Promotores", value: stats?.promoters || 0, sub: `${stats?.promoterPercentage || 0}% do total`, trend: "up" },
           { label: "Detratores", value: stats?.detractors || 0, sub: `${stats?.detractorPercentage || 0}% do total`, trend: "down" }
         ].map((stat, i) => (
            <div key={i} className="flex-1 p-5 flex flex-col gap-1">
               <div className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">{stat.label}</div>
               <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">{stat.value}</span>
                  <span className={`flex items-center text-xs font-medium ${stat.trend === 'up' ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                     {stat.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                     {stat.sub.split(' ')[0]}
                  </span>
               </div>
               <div className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-2">{stat.sub.substring(stat.sub.indexOf(' ') + 1)}</div>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-zinc-200 dark:border-surface-border/80 rounded-lg bg-white dark:bg-surface-card p-5 flex flex-col shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Evolução do NPS</div>
             <div className="text-xs text-zinc-500 font-mono">Últimos 30 Dias</div>
           </div>
           <div className="h-[220px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={timeSeries.length > 0 ? timeSeries : [{ date: 'Sem dados', score: 0 }]} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} domain={[0, 100]} />
                 <Tooltip content={<CustomTooltip />} />
                 <Area type="monotone" name="Global Score" dataKey="score" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="lg:col-span-1 border border-zinc-200 dark:border-surface-border/80 rounded-lg bg-white dark:bg-surface-card p-5 flex flex-col shadow-sm">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Velocímetro de Performance</div>
          <div className="flex-1 flex flex-col justify-center items-center py-4">
             <NpsGauge score={stats?.score || 0} />
             
             <div className="w-full mt-8 space-y-3">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800/80 pb-2">Top Campanhas</div>
                {byCampaign.slice(0, 3).map((camp: any, i: number) => (
                   <div key={i} className="flex justify-between items-center">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">{camp.name}</span>
                      <div className="flex items-center gap-2">
                         <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full ${camp.score >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(0, camp.score)}%` }}></div>
                         </div>
                         <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-200">{camp.score}</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-zinc-200 dark:border-surface-border/80 rounded-lg bg-white dark:bg-surface-card p-5 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Distribuição de Notas</div>
            <div className="flex gap-1.5">
               <div className="w-2 h-2 rounded-full bg-rose-500"></div>
               <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            </div>
          </div>
          <div className="mt-4">
             <HistogramPremium data={distribution} />
          </div>
          <div className="flex justify-between mt-4 px-2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
             <span>Detratores</span>
             <span>Passivos</span>
             <span>Promotores</span>
          </div>
        </div>

        <div className="border border-zinc-200 dark:border-surface-border/80 rounded-lg bg-white dark:bg-surface-card p-5 flex flex-col shadow-sm">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Estrutura de Feedback</div>
          <div className="flex-1 flex flex-col gap-6 justify-center">
             <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                   <div className="text-xs font-medium text-emerald-600 dark:text-emerald-500">Promotores (5)</div>
                   <div className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{stats?.promoterPercentage || 0}%</div>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-sm overflow-hidden">
                   <div className="h-full bg-emerald-500/90 dark:bg-emerald-500 rounded-sm" style={{ width: `${stats?.promoterPercentage || 0}%` }}></div>
                </div>
             </div>
             <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                   <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Neutros (4)</div>
                   <div className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{stats?.passivePercentage || 0}%</div>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-sm overflow-hidden">
                   <div className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-sm" style={{ width: `${stats?.passivePercentage || 0}%` }}></div>
                </div>
             </div>
             <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                   <div className="text-xs font-medium text-red-600 dark:text-red-500">Detratores (0-3)</div>
                   <div className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{stats?.detractorPercentage || 0}%</div>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-sm overflow-hidden">
                   <div className="h-full bg-red-500/90 dark:bg-red-500 rounded-sm" style={{ width: `${stats?.detractorPercentage || 0}%` }}></div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-1 border border-zinc-200 dark:border-surface-border/80 rounded-lg bg-white dark:bg-surface-card flex flex-col shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-surface-border/80 flex justify-between items-center bg-zinc-50/50 dark:bg-surface-subtle/40">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Respostas Recentes</h3>
          </div>
          <div className="p-0 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {recent.length === 0 ? (
                <div className="p-10 text-center text-xs text-zinc-500 font-medium italic">
                   Nenhuma resposta recente
                </div>
              ) : recent.slice(0, 5).map((row: any, i: number) => (
                 <div key={i} className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-lg font-black shrink-0 transition-transform group-hover:scale-105 ${
                      row.score >= 5 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                      row.score >= 4 ? 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' : 
                      'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}>
                       {row.score}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start gap-2">
                          <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{row.contactName}</div>
                          <div className="text-[10px] font-medium text-zinc-400 shrink-0">{new Date(row.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</div>
                       </div>
                       <div className="text-[11px] text-zinc-500 dark:text-zinc-500 truncate flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          {row.campaignName}
                       </div>
                       {row.comment && (
                         <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 italic line-clamp-1">
                            "{row.comment}"
                         </div>
                       )}
                    </div>
                 </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
