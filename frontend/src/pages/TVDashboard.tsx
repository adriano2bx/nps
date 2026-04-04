import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Activity,
  Volume2,
  VolumeX,
  Target,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TVDashboard() {
  const { dashboard, refreshDashboard, loading } = useData();
  const [time, setTime] = useState(new Date());
  const [isMuted, setIsMuted] = useState(true);
  
  // Rotating live news channels (mostly YouTube IDs)
  // CNN Brasil: UCv_0N_S7RVP454JpG16V1UA
  // Record News: UC7s6SS_pYv_Xp3t9vM3i3fA
  const LIVE_SOURCE = "https://www.youtube.com/embed/live_stream?channel=UCv_0N_S7RVP454JpG16V1UA&autoplay=1&mute=1&controls=0&modestbranding=1&rel=0";

  // Auto-refresh data every 60 seconds (enough for TV)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  // Local Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading.dashboard && !dashboard) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center">
         <div className="w-12 h-12 border-4 border-white/10 border-t-brand-500 rounded-full animate-spin" />
         <p className="mt-4 text-xs font-bold text-zinc-500 tracking-widest uppercase">Sincronizando Sistema...</p>
      </div>
    );
  }

  const stats = dashboard?.stats || { score: 0, total: 0, promoters: 0, passives: 0, detractors: 0 };
  const clinicName = dashboard?.recent?.[0]?.campaignName || "Clinic Hub"; // Fallback or extract from dashboard

  const tickerItems = [
    `📊 NPS GLOBAL: ${stats.score}`,
    `✅ TOTAL DE RESPOSTAS: ${stats.total}`,
    `🚀 PROMOTORES: ${stats.promoters} (${stats.promoterPercentage}%)`,
    `⚠️ DETRATORES: ${stats.detractors} (${stats.detractorPercentage}%)`,
    `🕒 ÚLTIMA ATUALIZAÇÃO: ${time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    `📢 SUA OPINIÃO É FUNDAMENTAL PARA NOSSA EVOLUÇÃO`,
    `💎 SISTEMA DE MONITORAMENTO EM TEMPO REAL // CLINIC HUB v5.0`
  ];

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden font-sans cursor-none">
      
      {/* 1. BACKGROUND VIDEO (Live News) */}
      <div className="absolute inset-0 z-0 pointer-events-none scale-110">
        <iframe 
          width="100%" 
          height="100%" 
          src={LIVE_SOURCE}
          title="Live News"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          className="w-full h-full"
        ></iframe>
      </div>

      {/* 2. OVERLAY HEADER (GLASSMOROPHISM) */}
      <header className="absolute top-0 left-0 right-0 z-50 h-[10vh] bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between px-[5vw] backdrop-blur-[2px]">
        <div className="flex items-center gap-[2vw]">
          <div className="h-[6vh] w-[6vh] bg-white rounded-2xl flex items-center justify-center shadow-2xl brightness-110">
             <Target className="w-[60%] h-[60%] text-black" />
          </div>
          <div>
            <h1 className="text-[4vh] font-black text-white italic tracking-tighter leading-none">{dashboard?.recent?.[0]?.campaignName?.toUpperCase() || 'NOTÍCIAS DA CLÍNICA'}</h1>
            <div className="flex items-center gap-[1.5vh] mt-[0.5vh]">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-[1vh] font-black uppercase text-white shadow-lg animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                AO VIVO
              </div>
              <span className="text-[1.2vh] font-bold text-white/50 tracking-[0.3em] uppercase">Sincronizado com WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[4vw]">
          <div className="bg-white/10 border border-white/10 px-[2vw] py-[1vh] rounded-2xl backdrop-blur-md shadow-xl flex flex-col items-center">
             <span className="text-[1vh] font-black text-white/40 tracking-widest uppercase">NPS ATUAL</span>
             <span className="text-[4vh] font-black text-brand-400 leading-none">{stats.score}</span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[5vh] font-mono tabular-nums leading-none font-black text-white drop-shadow-2xl">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[1.2vh] font-bold text-white/30 uppercase tracking-[0.5em] mt-1">{time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          </div>
        </div>
      </header>

      {/* 3. SCROLLING TICKER (BOTTOM) */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-container {
          display: flex;
          white-space: nowrap;
          width: fit-content;
          animation: ticker-scroll 30s linear infinite;
        }
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-50 h-[6vh] bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-center shadow-[0_-10px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="h-full bg-brand-600 px-[3vw] flex items-center gap-[2vh] z-10 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
           <Activity className="w-[2.5vh] h-[2.5vh] text-white animate-pulse" />
           <span className="text-[1.8vh] font-black text-white tracking-widest uppercase italic">Painel NPS</span>
        </div>
        <div className="flex-1">
          <div className="ticker-container gap-[10vw]">
            {tickerItems.concat(tickerItems).map((item, i) => (
              <div key={i} className="flex gap-[2vh] items-center">
                <span className="text-[2vh] font-black text-brand-300 uppercase tracking-widest leading-none outline-text">{item}</span>
                <div className="w-[0.8vh] h-[0.8vh] rounded-full bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. UNMUTE HINT (Optional, fades away) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-[10vh] right-[4vw] z-50 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 pointer-events-none"
      >
        <Volume2 className="w-5 h-5 text-white animate-bounce" />
        <span className="text-white text-sm font-bold uppercase tracking-wider">Ajuste o volume se necessário</span>
      </motion.div>

      {/* LOGO WATERMARK (Bottom Right, subtle) */}
      <div className="absolute bottom-[8vh] right-[4vw] z-40 opacity-10 flex flex-col items-end">
         <Target className="w-20 h-20 text-white mb-2" />
         <span className="text-xs font-black text-white tracking-[1em] uppercase">Powered by Clinic Hub</span>
      </div>

      <style>{`
        .outline-text {
          text-shadow: 2px 2px 0px rgba(0,0,0,0.5);
        }
      `}</style>

    </div>
  );
}
