import { useState } from 'react';
import { 
  Plus, SmartphoneNfc, Trash2, Globe, Shield, 
  Check, ExternalLink,
  ChevronRight, Box, Bell, RefreshCcw, Edit2, Link, Link2Off, QrCode
} from 'lucide-react';
import Modal from '../components/Modal';
import BaileysConnectionModal from '../components/BaileysConnectionModal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const emptyChannel = { 
  name: '', 
  provider: 'META', 
  phoneNumberId: '',
  wabaId: '',
  accessToken: '',
  verifyToken: 'hvnps_' + Math.random().toString(36).substring(7),
  appId: '',
  apiKey: '',
  appName: '',
  sourceNumber: ''
};

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface Channel {
  id: string;
  name: string;
  provider: string;
  status: string;
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  verifyToken?: string;
  appName?: string;
  apiKey?: string;
  sourceNumber?: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'channels'>('general');
  const { channels, loading, isRefreshing, refreshChannels } = useData();
  const { token } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [editTarget, setEditTarget] = useState<Channel | null>(null);
  const [form, setForm] = useState(emptyChannel);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [baileysConnectTarget, setBaileysConnectTarget] = useState<Channel | null>(null);

  const handleSave = async () => {
    try {
      const url = editTarget 
        ? `${VITE_API_URL}/api/channels/${editTarget.id}` 
        : `${VITE_API_URL}/api/channels`;
      
      const response = await fetch(url, {
        method: editTarget ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error('Failed to save channel');
      refreshChannels();
      setCreateOpen(false);
      setEditTarget(null);
      setForm(emptyChannel);
    } catch (err: any) {
      alert('Erro ao salvar canal: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`${VITE_API_URL}/api/channels/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete channel');
      refreshChannels();
      setDeleteTarget(null);
    } catch (err: any) {
      alert('Erro ao excluir canal: ' + err.message);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const inputCls = "w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400";
  const labelCls = "block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1";
  const cardCls = "border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-surface-card shadow-sm overflow-hidden";
  const cardHeadCls = "px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-surface-subtle/50 flex justify-between items-center";

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Configurações</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gerencie sua conta, canais e integrações com o ecossistema.</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => refreshChannels()}
             className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
           >
              <RefreshCcw className={`w-4 h-4 ${isRefreshing.channels ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-2xl w-fit border border-zinc-200 dark:border-zinc-800 shadow-inner">
        {[
          { id: 'general', label: 'Geral', icon: Globe },
          { id: 'channels', label: 'Canais de WA', icon: SmartphoneNfc }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <tab.icon className={`w-4 h-4`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className={cardCls}>
              <div className={cardHeadCls}>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Box className="w-4 h-4 text-zinc-400" /> Informações da Clínica
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-1">
                  <label className={labelCls}>Nome Fantasia</label>
                  <input type="text" defaultValue="Clínica Morumbi Integrada" disabled className={`${inputCls} opacity-60 bg-zinc-50 cursor-not-allowed`} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>CNPJ Auditado</label>
                  <input type="text" defaultValue="00.000.000/0001-00" disabled className={`${inputCls} opacity-60 bg-zinc-50 cursor-not-allowed font-mono`} />
                </div>
                <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-xl flex gap-3 shadow-sm">
                  <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-medium">Dados cadastrais são validados periodicamente pelo nosso time de Compliance para garantir a segurança da plataforma e conformidade com as diretrizes da Meta Business.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-900 dark:bg-white rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
               <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Bell className="w-32 h-32 dark:text-zinc-900 text-white" />
               </div>
               <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white dark:text-zinc-900 mb-2">Suporte Prioritário Enterprise</h3>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-xs">Você tem acesso a um Gerente de Sucesso exclusivo e tempo de resposta de <span className="text-white dark:text-zinc-900 font-bold underline">15 minutos</span>.</p>
                  </div>
                  <button className="mt-8 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white px-8 py-3 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all w-fit shadow-xl shadow-black/20">Falar com Gerente</button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Canais de WhatsApp</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Conecte sua conta Meta ou instâncias externas para iniciar as pesquisas.</p>
              </div>
              <button 
                onClick={() => { setForm(emptyChannel); setCreateOpen(true); }}
                className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02] shadow-xl shadow-zinc-200/50 dark:shadow-none active:scale-95"
              >
                <Plus className="w-5 h-5" /> Vincular Canal
              </button>
            </div>

            {loading.channels && channels.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 bg-white dark:bg-zinc-900 h-44">
                    <div className="flex justify-between mb-4"><div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-24"></div><div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full"></div></div>
                    <div className="space-y-3"><div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-full"></div><div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3"></div></div>
                  </div>
                ))}
              </div>
            ) : channels.length === 0 ? (
              <div className="p-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center text-center bg-zinc-50/30 dark:bg-zinc-900/10">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center mb-6 shadow-xl shadow-zinc-200 dark:shadow-none ring-1 ring-zinc-200 dark:ring-zinc-700">
                  <SmartphoneNfc className="w-8 h-8 text-zinc-400" />
                </div>
                <h4 className="text-zinc-900 dark:text-white font-bold text-lg">Nenhum canal configurado</h4>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 max-w-sm">Conecte sua primeira conta de WhatsApp para que a plataforma possa disparar as réguas de NPS.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map((channel) => (
                  <div key={channel.id} className={`${cardCls} group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all rounded-3xl`}>
                    <div className={cardHeadCls}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${channel.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 pulse'}`} />
                        <span className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">{channel.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => {
                             setEditTarget(channel);
                             setForm({
                               name: channel.name,
                               provider: channel.provider,
                               phoneNumberId: channel.phoneNumberId || '',
                               wabaId: channel.wabaId || '',
                               accessToken: channel.accessToken || '',
                               verifyToken: channel.verifyToken || '',
                               appName: channel.appName || '',
                               appId: (channel as any).appId || '',
                               apiKey: channel.apiKey || '',
                               sourceNumber: channel.sourceNumber || '',
                             });
                             setCreateOpen(true);
                           }}
                           className="p-2 text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                         >
                           <Edit2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => setDeleteTarget(channel)} className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Provedor</span>
                        <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md font-bold text-[9px] text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 uppercase">{channel.provider}</span>
                      </div>
                      
                      {channel.provider === 'BAILEYS' ? (
                        <div className="space-y-4 pt-2">
                           {channel.status === 'CONNECTED' ? (
                             <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-600">
                                   <Link className="w-3 h-3" /> WHATSAPP CONECTADO
                                </div>
                                <button 
                                  onClick={() => setBaileysConnectTarget(channel)}
                                  className="w-full py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                >
                                   GERENCIAR CONEXÃO
                                </button>
                             </div>
                           ) : (
                             <div className="flex flex-col gap-3">
                                {channel.status !== 'DISCONNECTED' && (
                                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-600">
                                     <QrCode className="w-3 h-3" /> AGUARDANDO CONEXÃO
                                  </div>
                                )}
                                <button 
                                  onClick={() => setBaileysConnectTarget(channel)}
                                  className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold shadow-lg shadow-zinc-200 dark:shadow-none hover:brightness-110 active:scale-95 transition-all"
                                >
                                  <QrCode className="w-4 h-4" /> {channel.status === 'DISCONNECTED' ? 'Conectar Agora' : 'Ver QR Code'}
                                </button>
                             </div>
                           )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Identificador</span>
                          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50/50 dark:bg-zinc-850/50 px-3 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            {channel.phoneNumberId}
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); setEditTarget(null); }} title={editTarget ? 'Editar Canal' : 'Conectar Novo Canal'}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelCls}>Nome da Instância</label><input className={inputCls} placeholder="Ex: Recepção" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1">
              <label className={labelCls}>Provedor Meta/WhatsApp</label>
                <select 
                  className={`${inputCls} appearance-none cursor-pointer`} 
                  value={form.provider} 
                  onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                >
                  <option value="META" className="bg-white dark:bg-zinc-900">Meta Official API</option>
                  <option value="GUPSHUP" className="bg-white dark:bg-zinc-900">Gupshup Hub</option>
                  <option value="BAILEYS" className="bg-white dark:bg-zinc-900">Baileys API (Legacy/Private)</option>
                </select>
            </div>
          </div>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
          <div className="animate-in slide-in-from-right-4 duration-300">
             {form.provider === 'BAILEYS' ? (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    O canal <strong>Baileys (Web)</strong> não requer chaves de API externas. 
                    Após salvar, você poderá escanear o QR Code diretamente nesta página para conectar sua conta.
                  </p>
                </div>
              ) : (
               <>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                   <div className="space-y-1"><label className={labelCls}>Phone ID</label><input className={inputCls} placeholder="ID numérico..." value={form.phoneNumberId} onChange={e => setForm(f => ({ ...f, phoneNumberId: e.target.value }))} /></div>
                   <div className="space-y-1"><label className={labelCls}>WABA ID</label><input className={inputCls} placeholder="Business Account ID..." value={form.wabaId} onChange={e => setForm(f => ({ ...f, wabaId: e.target.value }))} /></div>
                 </div>
                 <div className="space-y-1 mb-6"><label className={labelCls}>Access Token Permanente</label><input type="password" className={inputCls} placeholder="EAAGA..." value={form.accessToken} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} /></div>

                 <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
                    <h5 className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                       <Link className="w-3.5 h-3.5 text-zinc-400" /> Webhook da Meta (Cloud API)
                    </h5>
                    {editTarget ? (
                       <>
                         <div className="space-y-1">
                           <label className={labelCls}>Callback URL <span className="normal-case font-normal text-zinc-500">(clique para copiar)</span></label>
                           <input readOnly className={`${inputCls} font-mono text-[11px] cursor-copy bg-white/50 dark:bg-black/20`} value={`${VITE_API_URL}/api/webhooks/meta/${editTarget.id}`} onClick={(e) => { navigator.clipboard.writeText(e.currentTarget.value); handleCopy(e.currentTarget.value); }} />
                         </div>
                         <div className="space-y-1">
                           <label className={labelCls}>Verify Token <span className="normal-case font-normal text-zinc-500">(clique para copiar)</span></label>
                           <input readOnly className={`${inputCls} font-mono text-[11px] cursor-copy bg-white/50 dark:bg-black/20`} value={form.verifyToken} onClick={(e) => { navigator.clipboard.writeText(e.currentTarget.value); handleCopy(e.currentTarget.value); }} />
                         </div>
                       </>
                    ) : (
                       <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          ⚠️ <strong>Salve o canal primeiro</strong> para que sua Callback URL pública e seu Verify Token sejam gerados. Você precisará colá-los no Meta for Developers.
                       </p>
                    )}
                 </div>
               </>
             )}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <button onClick={() => { setCreateOpen(false); setEditTarget(null); }} className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!form.name} className="px-6 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-200/50 dark:shadow-none">
              {editTarget ? 'Salvar Alterações' : 'Salvar Canal'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Desvincular Canal" size="sm">
        <div className="p-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">Você está prestes a desativar o canal <span className="font-bold text-zinc-900 dark:text-white">"{deleteTarget?.name}"</span>. Isso afetará todas as réguas de NPS que o utilizam.</p>
        </div>
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleDelete} className="px-6 py-2.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200/50 dark:shadow-none active:scale-95">Remover Definitivamente</button>
        </div>
      </Modal>

      {baileysConnectTarget && (
        <BaileysConnectionModal 
          channelId={baileysConnectTarget.id}
          channelName={baileysConnectTarget.name}
          onClose={() => { setBaileysConnectTarget(null); refreshChannels(); }}
        />
      )}
    </div>
  );
}
