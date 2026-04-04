import { useEffect, useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Activity,
  Volume2,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';

// Declaring Hls globally for TypeScript
declare global {
  interface Window {
    Hls: any;
  }
}

export default function TVDashboard() {
  const { dashboard, refreshDashboard, loading } = useData();
  const [time, setTime] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // List of possible Record News / CNN Brasil HLS streams
  // Some links may be more stable than others depending on geographic location
  const IPTV_SOURCES = [
    "https://turnerlive.warnermediacdn.com/hls/live/586495/cnngo/cnn_slate/VIDEO_0_3564000.m3u8",
    "https://raw.githubusercontent.com/CODERX24/tv/master/CNN.m3u8",
    "https://59f139610ee89.streamlock.net/recordnews/smil:recordnews.smil/playlist.m3u8"
  ];

  // Auto-refresh data every 60 seconds
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

  // Load HLS.js and Initialize Player
  useEffect(() => {
    const scriptId = 'hls-js-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initPlayer = () => {
      if (!videoRef.current || !window.Hls) return;

      const video = videoRef.current;
      const hlsSource = IPTV_SOURCES[0]; // Using primary source

      if (window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(hlsSource);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log("Autoplay blocked:", e));
        });
        
        // Error handling for switching sources
        hls.on(window.Hls.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            console.warn("HLS Fatal Error, checking next source...");
            // Simple logic could go here to try IPTV_SOURCES[1]
          }
        });

        return () => hls.destroy();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari/iOS which has native support
        video.src = hlsSource;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.log("Autoplay blocked:", e));
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.async = true;
      script.onload = initPlayer;
      document.body.appendChild(script);
    } else {
      // Script already exists, wait for Hls to be available if not yet
      const checkHls = setInterval(() => {
        if (window.Hls) {
          clearInterval(checkHls);
          initPlayer();
        }
      }, 100);
    }
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
  const tickerItems = [
    `📊 NPS GLOBAL: ${stats.score}`,
    `✅ TOTAL DE RESPOSTAS: ${stats.total}`,
    `🚀 PROMOTORES: ${stats.promoters} (${stats.promoterPercentage}%)`,
    `⚠️ DETRATORES: ${stats.detractors} (${stats.detractorPercentage}%)`,
    `🕒 ÚLTIMA ATUALIZAÇÃO: ${time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    `📢 SUA OPINIÃO É FUNDAMENTAL PARA NOSSA EVOLUÇÃO`,
    `💎 MONITORAMENTO EM TEMPO REAL // CLINIC HUB v5.0`
  ];

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden font-sans cursor-none">
      
      {/* 1. BACKGROUND VIDEO (IPTV via HLS) */}
      <div className="absolute inset-0 z-0 scale-105">
        <video 
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />
        {/* Dark overlay to ensure contrast */}
        <div className="absolute inset-0 bg-black/20 z-[1]" />
      </div>

      {/* 2. OVERLAY HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 h-[10vh] bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between px-[5vw] backdrop-blur-[1px]">
        <div className="flex items-center gap-[2vw]">
          <div className="h-[6vh] w-[6vh] bg-white rounded-2xl flex items-center justify-center shadow-2xl">
             <Target className="w-[60%] h-[60%] text-black" />
          </div>
          <div>
            <h1 className="text-[4vh] font-black text-white italic tracking-tighter leading-none">{dashboard?.recent?.[0]?.campaignName?.toUpperCase() || 'NOTÍCIAS DA CLÍNICA'}</h1>
            <div className="flex items-center gap-[1.5vh] mt-[0.5vh]">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-[1vh] font-black uppercase text-white shadow-lg animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                AO VIVO (IPTV)
              </div>
              <span className="text-[1.2vh] font-bold text-white/50 tracking-[0.3em] uppercase">Monitoramento Ativo</span>
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
          animation: ticker-scroll 40s linear infinite;
        }
        .outline-text {
          text-shadow: 2px 2px 0px rgba(0,0,0,0.8);
        }
      `}</style>
      <div className="absolute bottom-0 left-0 right-0 z-50 h-[7vh] bg-black/95 border-t border-white/10 flex items-center overflow-hidden">
        <div className="h-full bg-brand-600 px-[3vw] flex items-center gap-[2vh] z-10 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
           <Activity className="w-[3vh] h-[3vh] text-white animate-pulse" />
           <span className="text-[2vh] font-black text-white tracking-widest uppercase italic">Painel NPS</span>
        </div>
        <div className="flex-1">
          <div className="ticker-container gap-[12vw]">
            {tickerItems.concat(tickerItems).map((item, i) => (
              <div key={i} className="flex gap-[3vh] items-center">
                <span className="text-[2.2vh] font-black text-brand-300 uppercase tracking-widest leading-none outline-text">{item}</span>
                <div className="w-[1vh] h-[1vh] rounded-full bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UNMUTE HINT */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 5, duration: 1 }}
        className="absolute bottom-[10vh] left-[4vw] z-50 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 pointer-events-none"
      >
        <Volume2 className="w-5 h-5 text-white animate-bounce" />
        <span className="text-white text-xs font-bold uppercase tracking-wider">Ajuste o volume se necessário</span>
      </motion.div>

    </div>
  );
}
