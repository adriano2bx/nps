import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface BaileysConnectionModalProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

export default function BaileysConnectionModal({ channelId, channelName, onClose }: BaileysConnectionModalProps) {
  const [status, setStatus] = useState<'INITIALIZING' | 'QR' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED'>('INITIALIZING');
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
  const token = localStorage.getItem('nps_token');

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${apiBase}/api/baileys/${channelId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setQr(data.qr);
        setError(data.error);

        if (data.status === 'CONNECTED') {
          // Success! Keep it open for 2s then maybe auto-close or allow manual close
        }
      }
    } catch (err) {
      console.error('Failed to fetch baileys status:', err);
    }
  };

  const startConnection = async () => {
    try {
      await fetch(`${apiBase}/api/baileys/${channelId}/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStatus();
    } catch (err) {
      console.error('Failed to start connection:', err);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar este WhatsApp? Isso interromperá os envios ativos.')) return;
    
    setIsLoggingOut(true);
    try {
      const response = await fetch(`${apiBase}/api/baileys/${channelId}/logout`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setStatus('DISCONNECTED');
        setQr(null);
      }
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    startConnection();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [channelId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-surface-border/50 flex items-center justify-between bg-zinc-50/50 dark:bg-surface-subtle/40">
           <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">Conectar WhatsApp</h3>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{channelName}</p>
           </div>
           <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-surface-subtle rounded-full transition-colors">
              <X className="w-4 h-4 text-zinc-500" />
           </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          {status === 'INITIALIZING' && (
            <div className="space-y-4 py-8">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Iniciando sessão do WhatsApp...</p>
            </div>
          )}

          {status === 'QR' && qr && (
            <div className="space-y-6">
              <div className="relative group p-4 bg-white rounded-2xl border-4 border-zinc-100 dark:border-zinc-800 shadow-inner">
                <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto antialiased" />
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="bg-white/90 p-2 rounded-lg shadow-xl">
                      <RefreshCw className="w-5 h-5 text-zinc-900 animate-spin" style={{ animationDuration: '3s' }} />
                   </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Escaneie o QR Code</p>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px] mx-auto">
                  Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados</strong> e aponte a câmera para esta tela.
                </p>
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest pt-2 flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                >
                  {isLoggingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reiniciar Conexão'}
                </button>
              </div>
            </div>
          )}

          {(status === 'CONNECTING' || (status === 'QR' && !qr)) && (
            <div className="space-y-4 py-8">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Autenticando e sincronizando dados...</p>
            </div>
          )}

          {status === 'CONNECTED' && (
            <div className="space-y-6 py-6 animate-in zoom-in-90 fill-mode-both">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-white">Conectado com Sucesso!</h4>
                <p className="text-xs text-zinc-500">Seu WhatsApp agora está pronto para realizar disparos automáticos.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={onClose}
                  className="w-full btn-brand"
                >
                  Concluir
                </button>
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Desconectar WhatsApp'}
                </button>
              </div>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="space-y-4 py-8">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Erro na Conexão</p>
                <p className="text-xs text-zinc-500 mt-1">{error || 'Ocorreu um problema ao gerar o QR Code.'}</p>
              </div>
              <button 
                onClick={startConnection}
                className="btn-primary"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 text-center font-medium">
           Conexão segura via Protocolo Baileys. O HealthNPS não armazena suas mensagens.
        </div>
      </div>
    </div>
  );
}
