import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Target,
  Activity,
  AlertCircle,
  Heart,
  ShieldCheck,
  Wifi,
  Users,
  QrCode
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function TVDashboard() {
  const { dashboard, refreshDashboard, loading } = useData();
  const [time, setTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);

  // Mídia Indoor Content (Fluid vh-based scaling to prevent cropping)
  const slides = [
    {
      title: "BEM-VINDO!",
      content: "Sua saúde e bem-estar são prioridades absolutas para nossa equipe.",
      icon: <Heart className="w-full h-full text-red-500" />,
      color: "from-red-500/10 to-transparent"
    },
    {
      title: "WI-FI GRATUITO",
      content: "Conecte-se na rede: CLINICA_PACIENTE // Senha: saude123",
      icon: <Wifi className="w-full h-full text-blue-500" />,
      color: "from-blue-500/10 to-transparent"
    },
    {
      title: "SEGURANÇA E HIGIENE",
      content: "Utilize álcool em gel e respeite os protocolos de segurança sanitária.",
      icon: <ShieldCheck className="w-full h-full text-emerald-500" />,
      color: "from-emerald-500/10 to-transparent"
    },
    {
      title: "ATENDIMENTO HUMANIZADO",
      content: "Nossa equipe está preparada para lhe atender com excelência e carinho.",
      icon: <Users className="w-full h-full text-brand-500" />,
      color: "from-brand-500/10 to-transparent"
    },
    {
      title: "SUA OPINIÃO IMPORTA",
      content: "Aponte sua câmera para o QR Code e ajude-nos a evoluir.",
      icon: <QrCode className="w-full h-full text-amber-500" />,
      color: "from-amber-500/10 to-transparent"
    }
  ];

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  // Slideshow Rotation (12 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // Local Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading.dashboard && !dashboard) {
    return (
      <div className="h-screen w-screen bg-[#020203] flex flex-col items-center justify-center">
         <div className="w-12 h-12 border-4 border-brand-500/10 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = dashboard?.stats || { score: 0, total: 0, promoters: 0, passives: 0, detractors: 0 };
  const distribution = dashboard?.distribution || [];

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#10b981'; 
    if (score >= 50) return '#3b82f6';
    if (score >= 0) return '#f59e0b';
    return '#ef4444'; 
  };

  const getZoneInfo = (score: number) => {
    if (score >= 75) return { label: 'ZONA DE EXCELÊNCIA', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (score >= 50) return { label: 'ZONA DE QUALIDADE', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    if (score >= 0) return { label: 'ZONA DE APERFEIÇOAMENTO', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { label: 'ZONA CRÍTICA', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

  const zone = getZoneInfo(stats.score);

  const tickerItems = [
    `📊 NPS GLOBAL ATUAL: ${stats.score}`,
    `👥 TOTAL DE RESPOSTAS COLETADAS: ${stats.total}`,
    `🚀 STATUS DA OPERAÇÃO: ${zone.label}`,
    `🟢 CONEXÃO COM WHATSAPP ESTÁVEL`,
    `🕒 ÚLTIMA ATUALIZAÇÃO ÀS ${time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    `💎 MONITORAMENTO NPS DE ALTA PERFORMANCE FINAL v4.0`
  ];

  return (
    <div className="h-screen w-screen bg-[#020203] text-white flex flex-col overflow-hidden font-sans">
      
      {/* HEADER (8vh) */}
      <header className="h-[8vh] shrink-0 border-b border-white/[0.03] bg-[#020203]/90 px-[4vw] flex items-center justify-between z-50">
        <div className="flex items-center gap-[1.5vw]">
          <div className="h-[5vh] w-[5vh] bg-white rounded-xl flex items-center justify-center shadow-xl shrink-0">
             <Target className="w-[60%] h-[60%] text-black" />
          </div>
          <div>
            <h1 className="text-[3.5vh] font-bold tracking-tight">NPS <span className="opacity-30 tracking-widest text-[0.8em]">PULSE</span></h1>
            <div className="flex items-center gap-[0.5vw] mt-[0.2vh]">
               <div className="w-[0.8vh] h-[0.8vh] rounded-full bg-brand-500 animate-pulse" />
               <span className="text-[1.2vh] font-bold uppercase tracking-widest text-brand-500/80">Sincronização Ativa</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[3vw]">
          <div className={`${zone.bg} ${zone.border} ${zone.color} border px-[1.5vw] py-[0.8vh] rounded-full flex items-center gap-[0.8vw]`}>
             <Activity className="w-[1.5vh] h-[1.5vh]" />
             <span className="text-[1.2vh] font-black uppercase tracking-widest">{zone.label}</span>
          </div>
          <div className="text-right">
            <span className="text-[4.5vh] font-mono tabular-nums leading-none font-medium text-brand-50">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* TICKER (4vh) */}
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-marquee-css {
          display: flex;
          white-space: nowrap;
          width: fit-content;
          animation: marquee 100s linear infinite;
          will-change: transform;
        }
      `}</style>
      <div className="h-[4vh] shrink-0 bg-brand-600/10 border-b border-brand-500/20 flex items-center overflow-hidden relative">
         <div className="h-full bg-brand-600 px-[2vw] flex items-center gap-[1vw] z-10 shadow-2xl">
            <AlertCircle className="w-[1.8vh] h-[1.8vh] text-white animate-pulse" />
            <span className="text-[1.3vh] font-black text-white italic tracking-tighter uppercase whitespace-nowrap">Ao Vivo</span>
         </div>
         <div className="flex-1 overflow-hidden">
            <div className="animate-marquee-css gap-[5vw] items-center h-full">
               {tickerItems.concat(tickerItems).map((item, i) => (
                  <div key={i} className="flex gap-[1vw] items-center h-full">
                     <span className="text-[1.3vh] font-black uppercase tracking-[0.2em] text-brand-500">{item}</span>
                     <div className="w-[0.5vh] h-[0.5vh] rounded-full bg-white/10" />
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* MAIN (84vh) */}
      <main className="h-[84vh] flex gap-[2vw] p-[2vw] overflow-hidden">
        
        {/* LEFT COLUMN: Data Center (40% width) */}
        <div className="w-[40%] flex flex-col gap-[2vw] h-full">
            {/* NPS Card */}
            <div className={`flex-[1.2] min-h-0 bg-[#0d0d0f] border border-white/[0.06] rounded-[5vh] p-[2.5vw] flex flex-col items-center justify-between shadow-2xl overflow-hidden`}>
                <div className="w-full flex justify-between items-center opacity-40">
                    <span className="text-[1.2vh] font-black uppercase tracking-[0.4em]">Monitoramento</span>
                    <Activity className="w-[2vh] h-[2vh] text-brand-500" />
                </div>

                <div className="flex-1 w-full min-h-0 relative flex items-center justify-center py-[2vh]">
                    <div className="h-full aspect-square relative">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6.5" fill="transparent" className="text-white/[0.03]" />
                            <motion.circle 
                                initial={{ strokeDashoffset: 277 }}
                                animate={{ strokeDashoffset: 277 - (277 * (stats.score + 100) / 200) }}
                                cx="50" cy="50" r="44" 
                                stroke={getScoreColor(stats.score)} strokeWidth="6.5" fill="transparent"
                                strokeDasharray="277"
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[12vh] font-black text-white leading-none tracking-tighter drop-shadow-2xl">
                                {stats.score}
                            </span>
                            <span className="text-[1.2vh] font-black uppercase tracking-[0.8em] text-zinc-500 mt-[1vh] opacity-70">NPS SCORE</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 w-full gap-[1.5vw]">
                    <BigStat label="RESPOSTAS" value={stats.total} />
                    <BigStat label="PROMOTOR" value={`${stats.promoterPercentage}%`} color="text-emerald-500" />
                    <BigStat label="DETRATOR" value={`${stats.detractorPercentage}%`} color="text-red-500" />
                </div>
            </div>

            {/* Sentiment Card */}
            <div className="flex-1 min-h-0 bg-[#0d0d0f] border border-white/[0.06] rounded-[5vh] p-[3vw] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-[3vh] opacity-40">
                    <span className="text-[1.2vh] font-black uppercase tracking-[0.4em]">Sentimento</span>
                    <Activity className="w-[2vh] h-[2vh] text-brand-500" />
                </div>
                <div className="flex-1 w-full relative">
                    <div className="absolute inset-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution} margin={{ bottom: 20, left: -25, right: 0, top: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" stroke="#ffffff03" vertical={false} />
                                <XAxis 
                                    dataKey="score" 
                                    stroke="#ffffff11" 
                                    fontSize="1.5vh"
                                    tickLine={false} 
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive={false}>
                                    {distribution.map((entry: any, index: number) => {
                                        const s = entry.score;
                                        let c = '#ef4444';
                                        if (s >= 9) c = '#10b981';
                                        else if (s >= 7) c = '#f59e0b';
                                        return <Cell key={`cell-${index}`} fill={c} fillOpacity={0.8} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Media Indoor (60% width) */}
        <div className="w-[60%] bg-[#0d0d0f] border border-white/[0.06] rounded-[6vh] flex flex-col overflow-hidden shadow-2xl relative h-full">
          <div className="absolute top-[4vh] right-[4vw] z-10 flex gap-[0.8vw]">
             {slides.map((_, i) => (
               <div key={i} className={`h-[1vh] w-[4vh] rounded-full transition-all duration-700 ${i === currentSlide ? 'bg-brand-500 w-[10vh]' : 'bg-white/5'}`} />
             ))}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div 
               key={currentSlide}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.05 }}
               transition={{ duration: 1 }}
               className={`flex-1 flex flex-col items-center justify-center p-[6vh] bg-gradient-to-br ${slides[currentSlide].color}`}
            >
               <div className="h-[25vh] w-[25vh] mb-[6vh] drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                  {slides[currentSlide].icon}
               </div>
               
               <h2 className="text-[7vh] font-black text-white uppercase tracking-[0.2em] text-center mb-[4vh] leading-tight">
                 {slides[currentSlide].title}
               </h2>
               
               <p className="text-[3.5vh] text-zinc-400 font-medium text-center max-w-[80%] leading-relaxed italic">
                 "{slides[currentSlide].content}"
               </p>
            </motion.div>
          </AnimatePresence>

          <div className="h-[1vh] bg-zinc-950 w-full shrink-0">
             <motion.div 
               key={`bar-${currentSlide}`}
               className="h-full bg-brand-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]" 
               initial={{ width: "0%" }}
               animate={{ width: "100%" }} 
               transition={{ duration: 12, ease: "linear" }}
             />
          </div>
        </div>

      </main>

      {/* FOOTER (4vh) */}
      <footer className="h-[4vh] shrink-0 border-t border-white/[0.03] bg-[#020203] px-[4vw] flex items-center justify-between text-[1.2vh] font-black text-zinc-700 tracking-[0.5em] uppercase">
         <div>CLINIC HUB PRO // MEDIA INDOOR // v4.0</div>
         <div className="flex items-center gap-[0.5vw]">
            <div className="w-[1vh] h-[1vh] rounded-full bg-emerald-500 animate-pulse" />
            LIVE DATA
         </div>
      </footer>
    </div>
  );
}

function BigStat({ label, value, color }: { label: string, value: any, color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[2.5vh] py-[2.5vh] px-[1vw] flex flex-col items-center shadow-xl">
      <span className="text-[1vh] font-black text-zinc-500 mb-[1vh] tracking-[0.2em] uppercase">{label}</span>
      <span className={`text-[4vh] font-black ${color || 'text-zinc-100'}`}>{value}</span>
    </div>
  );
}
