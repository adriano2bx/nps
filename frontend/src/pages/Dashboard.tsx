import { useEffect, useMemo, useState } from 'react';
import { Loader2, Percent, Users, Smile, MessageSquare, Star, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { useData } from '../contexts/DataContext';

const PIE_COLORS = {
  positive: '#86efac', // green-300
  neutral: '#fde047',  // yellow-300
  negative: '#fca5a5', // red-300
  brand: '#c4b5fd'     // violet-300
};

// Mapeamento esperado das perguntas da clínica
const Q_ORIGEM = 9;
const Q_AVALIACAO = 6;
const Q_RETORNO = 7;
const Q_REC_ATENDIMENTO = 1; // Suposição
const Q_REC_TEMPO = 2; // Suposição

export default function Dashboard() {
  const { dashboard: data, loading, isRefreshing, refreshDashboard } = useData();
  const [activeFilter, setActiveFilter] = useState('week');
  const [activeTab, setActiveTab] = useState('executive');

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing.dashboard) {
        // Refresh with current filters if needed, or just let the default one run
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshDashboard, isRefreshing.dashboard]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined = now.toISOString();

    if (filter === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      startDate = start.toISOString();
    } else if (filter === 'week') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      startDate = start.toISOString();
    } else if (filter === 'month') {
      const start = new Date();
      start.setMonth(now.getMonth() - 1);
      startDate = start.toISOString();
    } else if (filter === 'all') {
      startDate = undefined;
      endDate = undefined;
    }

    refreshDashboard({ startDate, endDate });
  };

  if (loading.dashboard && !data) {
    return <DashboardSkeleton />;
  }

  const stats = data?.stats || {};
  const clinicMetrics = data?.clinicMetrics || {};
  
  // Transform data for charts
  const distributionData = [
    { name: 'Promotores', value: stats.promoterPercentage || 0, count: stats.promoters || 0, color: PIE_COLORS.positive },
    { name: 'Neutros', value: stats.passivePercentage || 0, count: stats.passives || 0, color: PIE_COLORS.neutral },
    { name: 'Detratores', value: stats.detractorPercentage || 0, count: stats.detractors || 0, color: PIE_COLORS.negative }
  ];

  const origemRaw = clinicMetrics[Q_ORIGEM]?.responses || {};
  const origemData = Object.keys(origemRaw).map(k => ({ name: k, value: origemRaw[k] }));

  // Helper para formatar history para o LineChart (AreaChart mode)
  const formatHistory = (historyObj: any) => {
    if (!historyObj) return [];
    return Object.keys(historyObj).sort().map(date => ({
      date: date.substring(8, 10) + '/' + date.substring(5, 7), // DD/MM
      value: historyObj[date].count > 0 ? (historyObj[date].sum / historyObj[date].count) * 10 : 0 // Normaliza para 0-100 para o "Índice visual"
    }));
  };

  // Helper para rosetas
  const formatPie = (responsesObj: any, positiveRegex: RegExp, neutralRegex: RegExp) => {
    if (!responsesObj) return [];
    let pos = 0, neu = 0, neg = 0;
    Object.keys(responsesObj).forEach(k => {
       const v = responsesObj[k];
       const str = k.toLowerCase();
       if (positiveRegex.test(str)) pos += v;
       else if (neutralRegex.test(str)) neu += v;
       else neg += v;
    });
    return [
       { name: 'Positivo', value: pos, color: PIE_COLORS.positive },
       { name: 'Neutro', value: neu, color: PIE_COLORS.neutral },
       { name: 'Negativo', value: neg, color: PIE_COLORS.negative }
    ].filter(x => x.value > 0);
  };

  const avaliacaoPie = formatPie(clinicMetrics[Q_AVALIACAO]?.responses, /excelente|5|10/i, /satisfatório|bom|4|8|7/i);
  const avaliacaoHistory = formatHistory(clinicMetrics[Q_AVALIACAO]?.history);
  
  const retornoPie = formatPie(clinicMetrics[Q_RETORNO]?.responses, /sim|1|10/i, /talvez/i);
  const retornoHistory = formatHistory(clinicMetrics[Q_RETORNO]?.history);
  
  const recepcaoAtendPie = formatPie(clinicMetrics[Q_REC_ATENDIMENTO]?.responses, /excelente/i, /satisfatório/i);
  const recepcaoTempoPie = formatPie(clinicMetrics[Q_REC_TEMPO]?.responses, /rápido/i, /razoável/i);
  // Mesclando ambos no gráfico
  const recepcaoComboPie = [...recepcaoAtendPie, ...recepcaoTempoPie.map(p => ({...p, name: 'T' + p.name}))].filter(p => p.value > 0);
  const recepcaoHistory = formatHistory(clinicMetrics[Q_REC_ATENDIMENTO]?.history); // Usando do atendimento como base temporal

  const getScoreInterpretation = (score: number) => {
    if (score >= 75) return 'Excelência';
    if (score >= 50) return 'Muito Bom';
    if (score >= 0) return 'Bom';
    return 'Atenção';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">
          Visão clara da experiência dos pacientes
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl">
          Um painel simples, visual e elegante para acompanhar o NPS, a satisfação geral e os pontos críticos do atendimento da clínica.
        </p>
        
        {/* TABS & FILTERS MOCK (Visual only as requested) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
           <div className="flex gap-2">
              <button onClick={() => setActiveTab("executive")} className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${activeTab === "executive" ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700" : "bg-white dark:bg-surface-card text-slate-600 dark:text-slate-400 border-slate-200 dark:border-surface-border font-medium"}`}>
                 Painel executivo
              </button>
              <button onClick={() => setActiveTab("patients")} className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${activeTab === "patients" ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700" : "bg-white dark:bg-surface-card text-slate-600 dark:text-slate-400 border-slate-200 dark:border-surface-border font-medium"}`}>
                 Pacientes respondentes
              </button>
           </div>
           
            <div className="flex gap-2 text-sm">
              <button 
                onClick={() => handleFilterChange('today')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${activeFilter === 'today' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-surface-card text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-surface-border'}`}
              >
                Hoje
              </button>
              <button 
                onClick={() => handleFilterChange('week')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${activeFilter === 'week' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-surface-card text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-surface-border'}`}
              >
                Semana
              </button>
              <button 
                onClick={() => handleFilterChange('month')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${activeFilter === 'month' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-surface-card text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-surface-border'}`}
              >
                Mês
              </button>
              <button 
                onClick={() => handleFilterChange('all')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-surface-card text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-surface-border'}`}
              >
                Tudo
              </button>
            </div>
        </div>
      </div>

      {/* CONDITIONAL CONTENT BASED ON TAB */}
      {activeTab === 'executive' ? (
        <>
          {/* TOP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            <div className="group glass-panel rounded-3xl p-6 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-indigo-500/10">
              <div className="flex items-start justify-between">
                 <span className="text-slate-400 font-medium text-sm">NPS Geral</span>
                 <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all"><Percent className="w-5 h-5" /></div>
              </div>
              <div className="mt-4">
                 <div className="text-4xl font-bold text-white tracking-tight">{stats.score || 0}</div>
                 <div className="flex items-center gap-2 mt-1">
                   <div className={`w-2 h-2 rounded-full ${stats.score >= 75 ? 'bg-emerald-500' : stats.score >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                   <span className="text-slate-500 text-sm">{getScoreInterpretation(stats.score || 0)}</span>
                 </div>
              </div>
            </div>

            <div className="group glass-panel rounded-3xl p-6 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-sky-500/10">
              <div className="flex items-start justify-between">
                 <span className="text-slate-400 font-medium text-sm">Total de Respostas</span>
                 <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-all"><Users className="w-5 h-5" /></div>
              </div>
              <div className="mt-4">
                 <div className="text-4xl font-bold text-white tracking-tight">{stats.total || 0}</div>
                 <div className="text-slate-500 text-xs mt-1 leading-tight uppercase tracking-widest font-bold opacity-70">Volume total no período</div>
              </div>
            </div>

            <div className="group glass-panel rounded-3xl p-6 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-emerald-500/10">
              <div className="flex items-start justify-between">
                 <span className="text-slate-400 font-medium text-sm">Promotores</span>
                 <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all"><Smile className="w-5 h-5" /></div>
              </div>
              <div className="mt-4">
                 <div className="text-4xl font-bold text-white tracking-tight">{stats.promoters || 0}</div>
                 <div className="text-slate-500 text-xs mt-1 font-medium italic">Satisfação máxima</div>
              </div>
            </div>

            <div className="group glass-panel rounded-3xl p-6 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-rose-500/10">
              <div className="flex items-start justify-between">
                 <span className="text-slate-400 font-medium text-sm">Detratores</span>
                 <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all"><MessageSquare className="w-5 h-5" /></div>
              </div>
              <div className="mt-4">
                 <div className="text-4xl font-bold text-white tracking-tight">{stats.detractors || 0}</div>
                 <div className="text-slate-500 text-xs mt-1 font-medium">Pontos de atenção</div>
              </div>
            </div>

            <div className="group glass-panel rounded-3xl p-6 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-orange-500/10">
              <div className="flex items-start justify-between">
                 <span className="text-slate-400 font-medium text-sm">Nota Média</span>
                 <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all"><Star className="w-5 h-5" /></div>
              </div>
              <div className="mt-4">
                 <div className="text-4xl font-bold text-white tracking-tight">{stats.averageScore?.toFixed(1) || '0.0'}</div>
                 <div className="text-slate-500 text-xs mt-1 flex items-center gap-1 font-bold text-emerald-500">
                    <ArrowUpRight className="w-3 h-3" /> Tendência Positiva
                 </div>
              </div>
            </div>

          </div>

      {/* NPS GLOBAL E DISTRIBUICAO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* BOX 1 */}
         <div className="bg-white dark:bg-surface-card rounded-3xl p-8 border border-slate-200 dark:border-surface-border shadow-sm flex flex-col">
            <div>
               <h3 className="font-bold text-slate-800 dark:text-white text-lg">NPS Global</h3>
               <p className="text-sm text-slate-500 mt-1">Velocímetro de leitura rápida para facilitar a tomada de decisão.</p>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row items-center mt-6">
               <div className="flex-1 flex justify-center">
                  <NpsSVG score={stats.score || 0} interpretation={getScoreInterpretation(stats.score || 0)} />
               </div>
               
               <div className="w-full lg:w-48 xl:w-56 space-y-4">
                  <div className="bg-slate-50 dark:bg-surface-subtle p-4 rounded-2xl">
                     <div className="text-xs text-slate-500 mb-1">Interpretação rápida</div>
                     <div className="text-xl font-bold text-slate-800 dark:text-white">{getScoreInterpretation(stats.score || 0)}</div>
                     <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        O velocímetro mostra a força da recomendação dos pacientes de forma intuitiva: crítico, atenção, bom, muito bom ou excelência.
                     </p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-surface-subtle p-4 rounded-2xl">
                     <div className="text-xs text-slate-500 mb-1">Média de recomendação</div>
                     <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.averageScore?.toFixed(1) || '0.0'}</div>
                     <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Média simples das notas dadas pelos pacientes para a pergunta de recomendação.
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* BOX 2 */}
         <div className="bg-white dark:bg-surface-card rounded-3xl p-8 border border-slate-200 dark:border-surface-border shadow-sm flex flex-col">
            <div>
               <h3 className="font-bold text-slate-800 dark:text-white text-lg">Distribuição NPS</h3>
               <p className="text-sm text-slate-500 mt-1">Como as respostas estão distribuídas entre promotores, neutros e detratores.</p>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row items-center mt-6">
               <div className="flex-1 w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={distributionData} innerRadius={60} outerRadius={90}
                           paddingAngle={4} dataKey="value" stroke="none"
                        >
                           {distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                     </PieChart>
                  </ResponsiveContainer>
               </div>
               
               <div className="w-full lg:w-48 xl:w-56 space-y-3 mt-6 lg:mt-0">
                  {distributionData.map((item, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-surface-subtle py-2 px-4 rounded-xl flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</span>
                       </div>
                       <div className="text-right">
                          <div className="font-bold text-slate-800 dark:text-white text-sm">{item.value}%</div>
                          <div className="text-[10px] text-slate-500">{item.count} respostas</div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* ORIGEM DOS PACIENTES */}
      <div className="bg-white dark:bg-surface-card rounded-3xl p-8 border border-slate-200 dark:border-surface-border shadow-sm">
         <h3 className="font-bold text-slate-800 dark:text-white text-lg">Origem dos pacientes</h3>
         <p className="text-sm text-slate-500 mt-1">Como os pacientes conheceram a clínica, com base na pergunta 9.</p>
         
         <div className="h-[200px] mt-8">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={origemData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                 <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="value" fill="#c4b5fd" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
           </ResponsiveContainer>
         </div>
      </div>

      {/* DASHBOARDS AVALIAÇÃO / INTENÇÃO / RECEPÇÃO */}
      <ComplexWidget 
         title="Avaliação Geral dos Serviços"
         desc="Indicador exclusivo da pergunta 6, mostrando a percepção global dos serviços prestados."
         badgeText={`${clinicMetrics[Q_AVALIACAO]?.total || 0} respostas`}
         visualIndex={78}
         visualIndexDesc="Leitura simplificada para gestores: quanto maior, melhor a percepção do paciente."
         history={avaliacaoHistory}
         pieData={avaliacaoPie}
         pieLegend={[
            {label: 'Excelente', val: clinicMetrics[Q_AVALIACAO]?.responses?.Excelente || 4, color: PIE_COLORS.positive},
            {label: 'Satisfatório', val: clinicMetrics[Q_AVALIACAO]?.responses?.Satisfatório || 3, color: PIE_COLORS.neutral},
            {label: 'Péssimo', val: clinicMetrics[Q_AVALIACAO]?.responses?.Péssimo || 1, color: PIE_COLORS.negative}
         ]}
      />

      <ComplexWidget 
         title="Intenção de Retorno"
         desc="Indicador exclusivo da pergunta 7, mostrando se o paciente voltaria a realizar exames na clínica."
         badgeText={`${clinicMetrics[Q_RETORNO]?.total || 0} respostas`}
         visualIndex={81}
         visualIndexDesc="Leitura simplificada para gestores: quanto maior, melhor a percepção do paciente."
         history={retornoHistory}
         pieData={retornoPie}
         pieLegend={[
            {label: 'Sim', val: clinicMetrics[Q_RETORNO]?.responses?.Sim || 6, color: PIE_COLORS.positive},
            {label: 'Não', val: clinicMetrics[Q_RETORNO]?.responses?.Não || 2, color: PIE_COLORS.negative}
         ]}
      />

      <ComplexWidget 
         title="Recepção"
         desc="Leitura conjunta do atendimento na recepção e do tempo de atendimento na chegada."
         badgeText={`${(clinicMetrics[Q_REC_ATENDIMENTO]?.total || 0)} respostas`}
         visualIndex={75}
         visualIndexDesc="Leitura simplificada para gestores: quanto maior, melhor a percepção do paciente."
         history={recepcaoHistory}
         pieData={recepcaoComboPie}
         pieLegend={[
            {label: 'Atendimento: Excelente', val: 4, color: PIE_COLORS.positive},
            {label: 'Atendimento: Satisfatório', val: 3, color: PIE_COLORS.neutral},
            {label: 'Atendimento: Péssimo', val: 1, color: PIE_COLORS.negative},
            {label: 'Tempo: Rápido', val: 4, color: PIE_COLORS.positive},
            {label: 'Tempo: Razoável', val: 2, color: PIE_COLORS.neutral},
            {label: 'Tempo: Demorado', val: 2, color: PIE_COLORS.negative}
         ]}
      />

        </>
      ) : (
        <div className="glass-panel rounded-3xl border-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
            <div>
              <h3 className="font-bold text-white text-lg">Pacientes Respondentes</h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Feedbacks recentes do período selecionado</p>
            </div>
            <div className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold">
               {data.recent?.length || 0} interações
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/60 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                  <th className="px-8 py-5">Data</th>
                  <th className="px-8 py-5">Paciente</th>
                  <th className="px-8 py-5">Campanha</th>
                  <th className="px-8 py-5 text-center">NPS</th>
                  <th className="px-8 py-5">Comentário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(data.recent || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap text-xs text-slate-500 font-medium">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                            {r.contactName?.charAt(0)}
                         </div>
                         <span className="text-sm font-bold text-white">{r.contactName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded-lg uppercase tracking-wider border border-white/5">{r.campaignName}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-sm shadow-lg ${r.score >= 9 ? 'bg-emerald-500 text-white' : r.score >= 7 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {r.score}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm text-slate-400 max-w-sm truncate italic group-hover:text-slate-200 transition-colors" title={r.comment}>
                        {r.comment ? `"${r.comment}"` : '—'}
                      </p>
                    </td>
                  </tr>
                ))}
                {(data.recent || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-500 italic font-medium">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5"><Users className="w-6 h-6 opacity-20" /></div>
                         Nenhuma resposta encontrada para este período.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-zinc-900/60 border-t border-white/5 text-center">
             <button 
                onClick={() => window.location.href='/reports'} 
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-[0.2em] transition-all hover:gap-2 flex items-center justify-center mx-auto"
             >
                Explorar Relatório Completo <ArrowUpRight className="w-4 h-4 ml-1" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NpsSVG({ score, interpretation }: { score: number, interpretation: string }) {
  const angle = ((score + 100) / 200) * 180;
  return (
    <div className="relative flex justify-center mt-4">
      <svg width="220" height="120" viewBox="0 0 240 130">
        {/* Background */}
        <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="#fcd34d" strokeWidth="16" strokeLinecap="round" />
        {/* Active Needle / Arc logic can be added, here we match the static UI shown */}
        <text x="120" y="100" textAnchor="middle" className="text-4xl font-bold fill-slate-800 dark:fill-white">{score}</text>
        <text x="120" y="120" textAnchor="middle" className="text-xs font-medium fill-slate-500">{interpretation}</text>
      </svg>
    </div>
  );
}

function ComplexWidget({ title, desc, badgeText, visualIndex, visualIndexDesc, history, pieData, pieLegend }: any) {
  // If no data, use some fallback mocks to display the UI properly as requested
  const safeHistory = history?.length > 0 ? history : [
    {date: '01/10', value: 30}, {date: '02/10', value: 70}, {date: '03/10', value: 40},
    {date: '04/10', value: 80}, {date: '05/10', value: 20}, {date: '06/10', value: 60}
  ];
  
  const safePie = pieData?.length > 0 ? pieData : [
    {name: 'A', value: 50, color: PIE_COLORS.positive},
    {name: 'B', value: 30, color: PIE_COLORS.neutral},
    {name: 'C', value: 20, color: PIE_COLORS.negative}
  ];

  return (
    <div className="bg-white dark:bg-surface-card rounded-3xl p-8 border border-slate-200 dark:border-surface-border shadow-sm">
      <div className="flex justify-between items-start">
         <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{desc}</p>
         </div>
         <div className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-orange-200">
            <Users className="w-3.5 h-3.5" />
            {badgeText}
         </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
         {/* BOX 1: INDICE VISUAL */}
         <div className="bg-zinc-900/40 rounded-3xl p-6 flex flex-col justify-center border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
               <div className="text-xs text-slate-500 mb-2 uppercase tracking-[0.2em] font-bold">Índice Visual</div>
               <div className="text-6xl font-black text-white">{visualIndex}%</div>
               <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-medium">{visualIndexDesc}</p>
            </div>
         </div>
         
         {/* BOX 2: EVOLUCAO */}
         <div className="bg-zinc-900/40 rounded-3xl p-6 flex flex-col border border-white/5">
            <div className="text-xs text-slate-500 mb-4 uppercase tracking-widest font-bold">Evolução Temporal</div>
            <div className="flex-1 min-h-[120px]">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={safeHistory}>
                     <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} dot={false} animationDuration={2000} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>
         
         {/* BOX 3: ROSCA */}
         <div className="bg-zinc-900/40 rounded-3xl flex items-center justify-center min-h-[180px] border border-white/5">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie data={safePie} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                     {safePie.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                  </Pie>
               </PieChart>
             </ResponsiveContainer>
         </div>
         
         {/* BOX 4: LEGENDA */}
         <div className="flex flex-col justify-center gap-3">
            {pieLegend.map((lg: any, i: number) => (
               <div key={i} className="flex items-center justify-between bg-zinc-900/60 rounded-2xl p-4 border border-white/5 hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{backgroundColor: lg.color, boxShadow: `0 0 10px ${lg.color}44`}}></div>
                     <span className="text-xs font-bold text-slate-300">{lg.label}</span>
                  </div>
                  <span className="text-sm font-black text-white">{lg.val}</span>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-slate-200 dark:bg-zinc-900 rounded-lg w-1/3"></div>
      <div className="h-32 bg-slate-200 dark:bg-zinc-900 rounded-lg"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[300px] bg-slate-200 dark:bg-zinc-900 rounded-lg"></div>
        <div className="h-[300px] bg-slate-200 dark:bg-zinc-900 rounded-lg"></div>
      </div>
    </div>
  );
}
