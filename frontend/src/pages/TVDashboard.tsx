import { useEffect, useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Activity,
  Volume2,
  Target,
  RefreshCcw,
  TowerControl as Tower,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Global Hls for TypeScript
declare global { interface Window { Hls: any; } }

type SignalType = 'hls' | 'iframe' | 'twitch';

interface Signal {
  name: string;
  type: SignalType;
  url: string;
}

export default function TVDashboard() {
  const { dashboard, refreshDashboard, loading } = useData();
  const [time, setTime] = useState(new Date());
  
  // High-Reliability Signal Cycle
  // We prioritize signals that are least likely to block
  const SIGNALS: Signal[] = [
    { 
      name: 'RECORD NEWS (SINAL 1)', 
      type: 'iframe', 
      url: "https://www.dailymotion.com/embed/video/x7v7q7m?autoplay=1&mute=1&controls=0&ui-logo=0&sharing-enable=0" 
    },
    { 
      name: 'JOVEM PAN (SINAL 2)', 
      type: 'twitch', 
      url: "jovempannews" // Twitch channel name
    },
    { 
      name: 'TV BRASIL (ESTÁVEL)', 
      type: 'hls', 
      url: "https://tvbrasil-video.ebc.com.br/hls/tvbrasil/index.m3u8" 
    },
    { 
      name: 'SINAL DE TESTE (NASA)', 
      type: 'hls', 
      url: "https://ntv1.akamaized.net/hls/live/2014027/NASA-NTV1-HLS/master.m3u8" 
    }
  ];

  const [signalIndex, setSignalIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const activeSignal = SIGNALS[signalIndex];

  // Clock & Sync
  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    const sync = setInterval(refreshDashboard, 60000);
    return () => { clearInterval(clock); clearInterval(sync); };
  }, [refreshDashboard]);

  // Failover Watchdog
  useEffect(() => {
    setStatus('loading');
    
    // Auto-failover if the signal doesn't start in 12 seconds (more generous for TVs)
    const timer = setTimeout(() => {
      if (status === 'loading') {
        console.warn(`Sinal ${activeSignal.name} demorando demais. Pulando...`);
        handleNextSignal();
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [signalIndex]);

  // Player logic handle
  useEffect(() => {
    if (activeSignal.type !== 'hls') {
        // Iframes/Twitch don't have good reporting for loading state, so we mark active immediately
        const t = setTimeout(() => setStatus('active'), 2000);
        return () => clearTimeout(t);
    }

    const scriptId = 'hls-js-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initHls = () => {
      if (!videoRef.current || !window.Hls) return;
      const video = videoRef.current;

      if (window.Hls.isSupported()) {
        const hls = new window.Hls({
           xhrSetup: (xhr: any) => { xhr.withCredentials = false; },
           enableWorker: true
        });
        hls.loadSource(activeSignal.url);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play()
            .then(() => setStatus('active'))
            .catch(() => setStatus('active')); // Even if muted-autoplay block, we are theoretically 'active'
        });

        hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) setStatus('error');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeSignal.url;
        video.onloadedmetadata = () => {
           video.play().then(() => setStatus('active')).catch(() => setStatus('active'));
        };
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.async = true;
      script.onload = initHls;
      document.body.appendChild(script);
    } else if (window.Hls) {
      initHls();
    }

    return () => { 
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [activeSignal, signalIndex]);

  const handleNextSignal = () => {
    setSignalIndex((prev) => (prev + 1) % SIGNALS.length);
  };

  if (loading.dashboard && !dashboard) {
     return <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/5 border-t-brand-500 rounded-full animate-spin" />
     </div>;
  }

  const stats = dashboard?.stats || { score: 0, total: 0, promoters: 0, passives: 0, detractors: 0 };
  const tickerItems = [
    `📊 NPS GLOBAL: ${stats.score}`,
    `✅ TOTAL RESPOSTAS: ${stats.total}`,
    `🟢 OPERAÇÃO ESTÁVEL`,
    `🕒 ÚLTIMA ATUALIZAÇÃO: ${time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    `🚀 SEU FEEDBACK É ESSENCIAL PARA O NOSSO CRESCIMENTO`,
    `💎 MONITORAMENTO NPS v5.0 ONLINE`
  ];

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden font-sans cursor-none">
      
      {/* 1. SIGNAL LAYER */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeSignal.type === 'hls' ? (
            <motion.video 
              key={activeSignal.url}
              ref={videoRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, filter: status === 'loading' ? 'blur(10px)' : 'blur(0)' }}
              exit={{ opacity: 0 }}
              className="w-full h-full object-cover"
              muted playsInline autoPlay
            />
          ) : activeSignal.type === 'twitch' ? (
             <motion.iframe
                key={`twitch-${activeSignal.url}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={`https://player.twitch.tv/?channel=${activeSignal.url}&parent=${window.location.hostname}&autoplay=true&muted=true`}
                className="w-full h-full border-none scale-[1.03]"
                allowFullScreen
             />
          ) : (
            <motion.iframe
              key={activeSignal.url}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={activeSignal.url}
              className="w-full h-full border-none scale-[1.03]"
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-[1]" />
      </div>

      {/* 2. LOADING / ERROR OVERLAY */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
           <RefreshCcw className="w-12 h-12 text-brand-500 animate-spin mb-4" />
           <span className="text-white font-black uppercase tracking-[0.4em] text-xs">Conectando Sinal: {activeSignal.name}...</span>
        </div>
      )}

      {/* 3. OVERLAY HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 h-[10vh] bg-gradient-to-b from-black/95 via-black/40 to-transparent flex items-center justify-between px-[5vw] backdrop-blur-[1px]">
        <div className="flex items-center gap-[2vw]">
          <div className="h-[6vh] w-[6vh] bg-white rounded-2xl flex items-center justify-center shadow-2xl">
             <Target className="w-[60%] h-[60%] text-black" />
          </div>
          <div>
            <h1 className="text-[4vh] font-black text-white italic tracking-tighter leading-none uppercase">
              {dashboard?.recent?.[0]?.campaignName || 'NOTÍCIAS DA CLÍNICA'}
            </h1>
            <div className="flex items-center gap-[1.5vh] mt-[0.5vh]">
              <div className="px-2 py-0.5 bg-red-600 rounded text-[1vh] font-black uppercase text-white shadow-lg flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                AO VIVO
              </div>
              <span className="text-[1.2vh] font-bold text-white/50 tracking-[0.3em] uppercase">Sinal: {activeSignal.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[4vw]">
          <div className="bg-white/10 border border-white/10 px-[2.5vw] py-[1vh] rounded-2xl backdrop-blur-md shadow-xl flex flex-col items-center">
             <span className="text-[1vh] font-black text-white/40 tracking-widest uppercase mb-0.5">NPS ATUAL</span>
             <span className="text-[4.5vh] font-black text-brand-400 leading-none drop-shadow-lg">{stats.score}</span>
          </div>
          <div className="text-right">
            <span className="text-[5.5vh] font-mono tabular-nums leading-none font-black text-white block drop-shadow-2xl">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[1.1vh] font-bold text-white/30 uppercase tracking-[0.6em] whitespace-nowrap">
               {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
          </div>
        </div>
      </header>

      {/* 4. NPS TICKER */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-container {
          display: flex;
          white-space: nowrap;
          width: fit-content;
          animation: ticker-scroll 45s linear infinite;
        }
        .text-shadow-md {
          text-shadow: 0 4px 10px rgba(0,0,0,1);
        }
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-50 h-[7.5vh] bg-black border-t border-white/10 flex items-center overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,1)]">
        <div className="h-full bg-brand-600 px-[4vw] flex items-center gap-[2vh] z-10 shadow-[30px_0_40px_rgba(0,0,0,1)]">
           <Activity className="w-[3.5vh] h-[3.5vh] text-white animate-pulse" />
           <span className="text-[2vh] font-black text-white tracking-widest uppercase italic whitespace-nowrap">Painel NPS</span>
        </div>
        <div className="flex-1">
          <div className="ticker-container gap-[15vw]">
            {tickerItems.concat(tickerItems).map((item, i) => (
              <div key={i} className="flex gap-[3vh] items-center">
                <span className="text-[2.4vh] font-black text-white uppercase tracking-widest leading-none text-shadow-md">{item}</span>
                <div className="w-[1.2vh] h-[1.2vh] rounded-full bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. MANUAL OVERRIDE (BOTTOM OVERLAY) */}
      <div className="absolute bottom-[10vh] left-[4vw] z-50 flex items-center gap-[2vw] transition-opacity hover:opacity-100 opacity-20">
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/10">
          <Volume2 className="w-4 h-4 text-white animate-bounce" />
          <span className="text-white text-[0.8vh] font-black uppercase tracking-[0.2em]">Som desativado por padrão</span>
        </div>
        
        <button 
          onClick={handleNextSignal}
          className="pointer-events-auto flex items-center gap-3 bg-brand-600/20 hover:bg-brand-600 px-5 py-3 rounded-2xl border border-brand-500/30 transition-all text-white group shadow-2xl"
        >
          <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
          <div className="flex flex-col items-start translate-y-[-1px]">
             <span className="text-[1.2vh] font-black uppercase leading-none">Trocar Sinal</span>
             <span className="text-[0.7vh] font-bold text-white/50 uppercase tracking-widest">Alternar Provedor</span>
          </div>
        </button>
      </div>

      {/* Watermark Signal status */}
      {status === 'error' && (
        <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center gap-6">
           <AlertTriangle className="w-[15vh] h-[15vh] text-amber-500 animate-bounce" />
           <div className="text-center">
              <h2 className="text-[4vh] font-black text-white uppercase mb-2 leading-none">Falha no Sinal Local</h2>
              <p className="text-zinc-500 text-sm uppercase tracking-widest">Tentando reconectar em instantes...</p>
           </div>
           <button 
             onClick={handleNextSignal}
             className="px-10 py-5 bg-brand-500 hover:bg-brand-600 text-white rounded-full font-black uppercase tracking-[0.5em] shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all"
           >
              Próximo Sinal
           </button>
        </div>
      )}

      <div className="absolute bottom-[10vh] right-[4vw] z-40 opacity-5 pointer-events-none">
         <Tower className="w-[12vh] h-[12vh] text-white" />
      </div>

    </div>
  );
}
