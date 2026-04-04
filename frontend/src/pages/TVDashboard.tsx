import { useEffect, useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Activity,
  Volume2,
  Target,
  RefreshCcw,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Global Hls for TypeScript
declare global { interface Window { Hls: any; } }

export default function TVDashboard() {
  const { dashboard, refreshDashboard, loading } = useData();
  const [time, setTime] = useState(new Date());
  const [playerType, setPlayerType] = useState<'iptv' | 'youtube'>('iptv');
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  
  // Channels
  const IPTV_SOURCE = "https://59f139610ee89.streamlock.net/recordnews/smil:recordnews.smil/playlist.m3u8";
  const YOUTUBE_SOURCE = "https://www.youtube.com/embed/live_stream?channel=UC7s6SS_pYv_Xp3t9vM3i3fA&autoplay=1&mute=1&controls=0&modestbranding=1&rel=0";

  // Clock & Sync
  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    const sync = setInterval(refreshDashboard, 60000);
    return () => { clearInterval(clock); clearInterval(sync); };
  }, [refreshDashboard]);

  // HLS Player Initialize & Watchdog
  useEffect(() => {
    if (playerType !== 'iptv') return;

    const scriptId = 'hls-js-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    // Watchdog: If video doesn't start in 10s, fallback to YouTube
    const timer = setTimeout(() => {
      if (!isLoaded && playerType === 'iptv') {
        console.warn("IPTV Failure: Switching to YouTube fallback...");
        setPlayerType('youtube');
      }
    }, 10000);

    const initHls = () => {
      if (!videoRef.current || !window.Hls) return;
      const video = videoRef.current;

      if (window.Hls.isSupported()) {
        const hls = new window.Hls({
           xhrSetup: (xhr: any) => { 
             xhr.withCredentials = false; // Important for CORS on some sources
           }
        });
        hls.loadSource(IPTV_SOURCE);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().then(() => setIsLoaded(true)).catch(() => setIsLoaded(false));
        });

        hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) setPlayerType('youtube');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = IPTV_SOURCE;
        video.onloadedmetadata = () => {
           video.play().then(() => setIsLoaded(true)).catch(() => setIsLoaded(false));
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
    } else {
      if (window.Hls) initHls();
    }

    return () => { 
      clearTimeout(timer);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [playerType, isLoaded]);

  if (loading.dashboard && !dashboard) {
    return (
      <div className="h-screen w-screen bg-[#020203] flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-white/5 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = dashboard?.stats || { score: 0, total: 0, promoters: 0, passives: 0, detractors: 0 };
  const tickerItems = [
    `📊 NPS GLOBAL: ${stats.score}`,
    `✅ TOTAL RESPOSTAS: ${stats.total}`,
    `🟢 OPERAÇÃO ESTÁVEL`,
    `🕒 ÚLTIMA ATUALIZAÇÃO: ${time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    `💎 SISTEMA DE MONITORAMENTO NPS v5.0`,
    `🚀 SEU FEEDBACK É ESSENCIAL PARA O NOSSO CRESCIMENTO`
  ];

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden font-sans cursor-none">
      
      {/* 1. LAYER: VIDEO SIGNAL */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          {playerType === 'iptv' ? (
            <motion.video 
              key="iptv"
              ref={videoRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full object-cover"
              muted playsInline autoPlay
            />
          ) : (
            <motion.iframe
              key="youtube"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={YOUTUBE_SOURCE}
              className="w-full h-full border-none scale-105" // scale-105 to hide black bars
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          )}
        </AnimatePresence>
        {/* Subtle Darkening Overlay */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-[1]" />
      </div>

      {/* 2. LAYER: OVERLAY HEADER (TOP) */}
      <header className="absolute top-0 left-0 right-0 z-50 h-[10vh] bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between px-[5vw] backdrop-blur-[2px]">
        <div className="flex items-center gap-[2vw]">
          <div className="h-[6vh] w-[6vh] bg-white rounded-2xl flex items-center justify-center shadow-2xl">
             <Target className="w-[60%] h-[60%] text-black" />
          </div>
          <div>
            <h1 className="text-[4vh] font-black text-white italic tracking-tighter leading-none">
              {dashboard?.recent?.[0]?.campaignName?.toUpperCase() || 'MODO TV'}
            </h1>
            <div className="flex items-center gap-[1.5vh] mt-[0.5vh]">
              <div className="flex items-center gap-2 px-2 py-0.5 bg-red-600 rounded text-[1vh] font-black uppercase text-white shadow-lg animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                AO VIVO
              </div>
              <span className="text-[1.2vh] font-bold text-white/50 tracking-[0.3em] uppercase">Sinal: {playerType.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[4vw]">
          <div className="bg-white/10 border border-white/10 px-[2.5vw] py-[1vh] rounded-2xl backdrop-blur-md shadow-xl flex flex-col items-center">
             <span className="text-[1vh] font-black text-white/40 tracking-widest uppercase mb-0.5">NPS ATUAL</span>
             <span className="text-[4.5vh] font-black text-brand-400 leading-none drop-shadow-lg">{stats.score}</span>
          </div>
          <div className="text-right">
            <span className="text-[5.5vh] font-mono tabular-nums leading-none font-black text-white block">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[1.1vh] font-bold text-white/30 uppercase tracking-[0.6em] whitespace-nowrap">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
          </div>
        </div>
      </header>

      {/* 3. LAYER: NPS TICKER (BOTTOM) */}
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
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-50 h-[7vh] bg-black/95 border-t border-white/5 flex items-center overflow-hidden">
        <div className="h-full bg-brand-600 px-[4vw] flex items-center gap-[2vh] z-10 shadow-[20px_0_40px_rgba(0,0,0,1)]">
           <Activity className="w-[3.5vh] h-[3.5vh] text-white animate-pulse" />
           <span className="text-[2vh] font-black text-white tracking-widest uppercase italic whitespace-nowrap">Status NPS</span>
        </div>
        <div className="flex-1">
          <div className="ticker-container gap-[15vw]">
            {tickerItems.concat(tickerItems).map((item, i) => (
              <div key={i} className="flex gap-[3vh] items-center">
                <span className="text-[2.4vh] font-black text-brand-200 uppercase tracking-widest leading-none drop-shadow-md">{item}</span>
                <div className="w-[1.2vh] h-[1.2vh] rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. UTILITIES (OVERLAY) */}
      <div className="absolute bottom-[10vh] left-[4vw] z-50 flex items-center gap-[2vw]">
        {/* Unmute Helper */}
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/10 opacity-60">
          <Volume2 className="w-4 h-4 text-white animate-bounce" />
          <span className="text-white text-[1vh] font-bold uppercase tracking-wider">Ajuste o volume se necessário</span>
        </div>
        
        {/* Manual Signal Toggle (Visible only when hovering bottom or as a small indicator) */}
        <button 
          onClick={() => setPlayerType(playerType === 'iptv' ? 'youtube' : 'iptv')}
          className="pointer-events-auto flex items-center gap-2 bg-brand-600/20 hover:bg-brand-600 px-4 py-2 rounded-2xl border border-brand-500/30 transition-all text-white group"
        >
          <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
          <span className="text-[1vh] font-black uppercase tracking-widest">Trocar Sinal</span>
        </button>
      </div>

      <div className="absolute bottom-[10vh] right-[4vw] z-40 opacity-5 pointer-events-none">
         <Monitor className="w-[15vh] h-[15vh] text-white" />
      </div>

    </div>
  );
}
