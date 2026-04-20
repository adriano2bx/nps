import { useEffect, useMemo } from 'react';
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing.dashboard) refreshDashboard();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshDashboard, isRefreshing.dashboard]);

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
              <button className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-sm font-semibold border border-slate-300 dark:border-slate-700">
                 Painel executivo
              </button>
              <button className="px-4 py-2 bg-white dark:bg-surface-card text-slate-600 dark:text-slate-400 rounded-full text-sm font-medium border border-slate-200 dark:border-surface-border">
                 Pacientes respondentes
              </button>
           </div>
           
           <div className="flex gap-2 text-sm">
             <button className="px-6 py-2 bg-white text-slate-600 rounded-full border border-slate-200 font-medium">Hoje</button>
             <button className="px-6 py-2 bg-indigo-200 text-indigo-900 rounded-full font-bold shadow-sm">Semana</button>
             <button className="px-6 py-2 bg-white text-slate-600 rounded-full border border-slate-200 font-medium">Mês</button>
             <button className="px-6 py-2 bg-white text-slate-600 rounded-full border border-slate-200 font-medium">Escolher período</button>
           </div>
        </div>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        <div className="bg-white dark:bg-surface-card rounded-3xl p-6 border border-slate-200 dark:border-surface-border shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
             <span className="text-slate-500 font-medium text-sm">NPS Geral</span>
             <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center text-violet-700"><Percent className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
             <div className="text-4xl font-bold text-slate-800 dark:text-white">{stats.score || 0}</div>
             <div className="text-slate-500 text-sm mt-1">{getScoreInterpretation(stats.score || 0)}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card rounded-3xl p-6 border border-slate-200 dark:border-surface-border shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
             <span className="text-slate-500 font-medium text-sm">Total de<br/>respostas</span>
             <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600"><Users className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
             <div className="text-4xl font-bold text-slate-800 dark:text-white">{stats.total || 0}</div>
             <div className="text-slate-500 text-sm mt-1 leading-tight">Pacientes<br/>respondentes no<br/>período</div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card rounded-3xl p-6 border border-slate-200 dark:border-surface-border shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
             <span className="text-slate-500 font-medium text-sm">Promotores</span>
             <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Smile className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
             <div className="text-4xl font-bold text-slate-800 dark:text-white">{stats.promoters || 0}</div>
             <div className="text-slate-500 text-sm mt-1">Notas 9 e 10</div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card rounded-3xl p-6 border border-slate-200 dark:border-surface-border shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
             <span className="text-slate-500 font-medium text-sm">Detratores</span>
             <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center text-rose-700"><MessageSquare className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
             <div className="text-4xl font-bold text-slate-800 dark:text-white">{stats.detractors || 0}</div>
             <div className="text-slate-500 text-sm mt-1">Notas 0 a 6</div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-card rounded-3xl p-6 border border-slate-200 dark:border-surface-border shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
             <span className="text-slate-500 font-medium text-sm">Nota média</span>
             <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700"><Star className="w-4 h-4" /></div>
          </div>
          <div className="mt-4">
             <div className="text-4xl font-bold text-slate-800 dark:text-white">{stats.averageScore?.toFixed(1) || '0.0'}</div>
             <div className="text-slate-500 text-sm mt-1 leading-tight">+0.5 pts vs<br/>período anterior</div>
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
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
         {/* BOX 1: INDICE VISUAL */}
         <div className="bg-slate-50 dark:bg-surface-subtle rounded-3xl p-6 flex flex-col justify-center">
            <div className="text-xs text-slate-500 mb-2">Índice visual do segmento</div>
            <div className="text-5xl font-bold text-slate-800 dark:text-white">{visualIndex}%</div>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">{visualIndexDesc}</p>
         </div>
         
         {/* BOX 2: EVOLUCAO */}
         <div className="bg-slate-50 dark:bg-surface-subtle rounded-3xl p-6 flex flex-col">
            <div className="text-xs text-slate-500 mb-4">Evolução dentro do período</div>
            <div className="flex-1 min-h-[100px]">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={safeHistory}>
                     <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>
         
         {/* BOX 3: ROSCA */}
         <div className="bg-slate-50 dark:bg-surface-subtle rounded-3xl flex items-center justify-center min-h-[150px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie data={safePie} innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                     {safePie.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                  </Pie>
               </PieChart>
             </ResponsiveContainer>
         </div>
         
         {/* BOX 4: LEGENDA */}
         <div className="flex flex-col justify-center space-y-3">
            {pieLegend.map((lg: any, i: number) => (
               <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-surface-subtle rounded-xl p-3 border-none">
                  <div className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: lg.color}}></div>
                     <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">{lg.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{lg.val}</span>
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
