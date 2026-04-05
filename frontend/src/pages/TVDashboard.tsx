import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Activity,
  Target,
  Wifi,
  Users,
  ShieldCheck,
  Heart,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TVDashboard() {
  const { dashboard, refreshDashboard, loading } = useData();
  const [time, setTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);

  // Premium Clinic Slides Configuration
  const slides = [
    {
      id: 'welcome',
      title: "BEM-VINDO!",
      subtitle: "Sua saúde e bem-estar são nossas prioridades absolutas.",
      icon: <Heart className="w-full h-full text-red-500" />,
      gradient: "from-red-500/20 via-red-500/5 to-transparent",
      color: "text-red-500"
    },
    {
      id: 'wifi',
      title: "CONECTE-SE!",
      subtitle: "Acesse nosso Wi-Fi gratuito na rede: CLINICA_PACIENTE // Senha: saude123",
      icon: <Wifi className="w-full h-full text-blue-500" />,
      gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
      color: "text-blue-500"
    },
    {
      id: 'excellence',
      title: "ATENDIMENTO HUMANIZADO",
      subtitle: "Nossa equipe está pronta para lhe atender com carinho e profissionalismo.",
      icon: <Users className="w-full h-full text-brand-500" />,
      gradient: "from-brand-500/20 via-brand-500/5 to-transparent",
      color: "text-brand-500"
    },
    {
      id: 'safety',
      title: "AMBIENTE SEGURO",
      subtitle: "Respeitamos todos os protocolos de higiene para sua total segurança.",
      icon: <ShieldCheck className="w-full h-full text-emerald-500" />,
      gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      color: "text-emerald-500"
    },
    {
      id: 'feedback',
      title: "SUA OPINIÃO IMPORTA!",
      subtitle: "Aponte sua câmera para dar seu feedback e nos ajude a evoluir.",
      icon: <QrCode className="w-full h-full text-amber-500" />,
      gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
      color: "text-amber-500"
    }
  ];

  const SLIDE_DURATION = 15000; // 15 seconds per slide

  // Clock & Sync
  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    const sync = setInterval(refreshDashboard, 60000);
    return () => { clearInterval(clock); clearInterval(sync); };
  }, [refreshDashboard]);

  // Slideshow Cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading.dashboard && !dashboard) {
    return (
      <div className="h-screen w-screen bg-[#020203] flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-white/5 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = dashboard?.stats || { score: 0, total: 0, promoters: 0, passives: 0, detractors: 0 };
  const clinicName = dashboard?.recent?.[0]?.campaignName || 'CENTRO MÉDICO';
  
  const tickerItems = [
    `📊 NPS GLOBAL ATUAL: ${stats.score}`,
    `✅ RESPOSTAS COLETADAS: ${stats.total}`,
    `🟢 OPERAÇÃO ATIVA E SINCRONIZADA`,
    `🕒 ÚLTIMA ATUALIZAÇÃO ÀS ${time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    `💎 MONITORAMENTO NPS v5.0 // CLINIC HUB MEDIA INDOOR`,
    `🚀 EXCELÊNCIA EM CADA DETALHE DO SEU ATENDIMENTO`
  ];

  return (
    <div className="h-screen w-screen bg-[#020203] relative overflow-hidden font-sans text-white cursor-none">
      
      {/* 1. LAYER: HEADER (TOP) */}
      <header className="absolute top-0 left-0 right-0 z-[100] h-[12vh] bg-gradient-to-b from-[#020203] via-[#020203]/90 to-transparent flex items-center justify-between px-[6vw] backdrop-blur-[2px]">
        <div className="flex items-center gap-[2.5vw]">
          <div className="h-[7vh] w-[7vh] bg-white dark:bg-surface-card rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] border border-white/10 dark:border-surface-border">
             <Target className="w-[60%] h-[60%] text-black dark:text-white" />
          </div>
          <div>
            <h1 className="text-[4.5vh] font-black italic tracking-tighter leading-none text-white drop-shadow-2xl">
              {clinicName.toUpperCase()}
            </h1>
            <div className="flex items-center gap-[1.5vh] mt-[0.5vh]">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-600 rounded text-[1vh] font-black uppercase text-white shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                DADOS EM TEMPO REAL
              </div>
              <span className="text-[1.2vh] font-bold text-zinc-500 tracking-[0.4em] uppercase">Sincronizado via WhatsApp</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[5vw]">
          <div className="bg-white/[0.03] dark:bg-surface-card/20 border border-white/5 dark:border-surface-border/30 px-[3vw] py-[1.2vh] rounded-[2.5vh] backdrop-blur-3xl shadow-2xl flex flex-col items-center">
             <span className="text-[1.1vh] font-black text-zinc-500 tracking-widest uppercase mb-1">NPS ATUAL</span>
             <span className="text-[5vh] font-black text-brand-400 leading-none drop-shadow-lg">{stats.score}</span>
          </div>
          <div className="text-right">
            <span className="text-[6vh] font-mono tabular-nums leading-none font-black text-white block tracking-tighter">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[1.2vh] font-bold text-zinc-600 uppercase tracking-[0.8em] whitespace-nowrap mt-1">
               {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
          </div>
        </div>
      </header>

      {/* 2. LAYER: SLIDESHOW (MAIN) */}
      <main className="h-full w-full flex items-center justify-center pt-[10vh] pb-[10vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            transition={{ duration: 1.5, ease: [0.165, 0.84, 0.44, 1] }}
            className={`w-full max-w-[85%] h-[60vh] rounded-[8vh] bg-gradient-to-br ${slides[currentSlide].gradient} border border-white/[0.03] dark:border-surface-border/20 shadow-inner relative flex flex-col items-center justify-center p-[8vh] text-center`}
          >
            {/* Background Icon Watermark */}
            <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center overflow-hidden pointer-events-none scale-150 rotate-12">
               {slides[currentSlide].icon}
            </div>

            <div className="h-[25vh] w-[25vh] mb-[6vh] drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]">
               {slides[currentSlide].icon}
            </div>

            <h2 className="text-[10vh] font-black leading-tight tracking-[-0.04em] mb-[3vh] uppercase drop-shadow-2xl">
              {slides[currentSlide].title}
            </h2>

            <p className="text-[4vh] font-medium text-zinc-400 max-w-[90%] leading-relaxed tracking-tight italic drop-shadow-lg">
               "{slides[currentSlide].subtitle}"
            </p>

            {/* Slide Progress Indicator */}
            <div className="absolute bottom-[6vh] flex gap-[1vh] z-10">
               {slides.map((_, i) => (
                 <div 
                   key={i} 
                   className={`h-[1vh] rounded-full transition-all duration-1000 ${i === currentSlide ? `w-[10vh] bg-white` : 'w-[2vh] bg-white/5'}`} 
                 />
               ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. LAYER: FOOTER TICKER (BOTTOM) */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-container {
          display: flex;
          white-space: nowrap;
          width: fit-content;
          animation: ticker-scroll 50s linear infinite;
        }
        .text-glow {
          text-shadow: 0 0 20px rgba(255,255,255,0.1);
        }
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-[100] h-[8vh] bg-[#020203] border-t border-white/[0.03] dark:border-surface-border/30 flex items-center overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        <div className="h-full bg-brand-600 px-[5vw] flex items-center gap-[3vh] z-10 shadow-[30px_0_40px_rgba(0,0,0,1)]">
           <Activity className="w-[3.5vh] h-[3.5vh] text-white animate-pulse" />
           <span className="text-[2.2vh] font-black text-white tracking-widest uppercase italic whitespace-nowrap">Dashboard NPS</span>
        </div>
        <div className="flex-1">
          <div className="ticker-container gap-[15vw]">
            {tickerItems.concat(tickerItems).map((item, i) => (
              <div key={i} className="flex gap-[4vh] items-center">
                <span className="text-[2.5vh] font-black text-brand-300 uppercase tracking-widest leading-none text-glow">{item}</span>
                <div className="w-[1.5vh] h-[1.5vh] flex items-center justify-center bg-white/10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar Top */}
      <div className="absolute top-0 left-0 right-0 z-[110] h-1 bg-white/5 overflow-hidden">
        <motion.div 
           key={`progress-${currentSlide}`}
           initial={{ width: "0%" }}
           animate={{ width: "100%" }}
           transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
           className="h-full bg-brand-500 shadow-[0_0_20px_rgba(99,102,241,1)]"
        />
      </div>

      {/* Watermark Signal status */}
      <div className="absolute bottom-[11vh] left-[6vw] z-50 flex items-center gap-4 opacity-10">
         <ArrowRight className="w-5 h-5 text-white animate-bounce-horizontal" />
         <span className="text-white text-[1.2vh] font-black uppercase tracking-[0.8em]">Clinic Media Indoor v5.0</span>
      </div>

      <style>{`
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 2s infinite;
        }
      `}</style>

    </div>
  );
}
