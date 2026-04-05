import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Key, 
  Webhook, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  Globe, 
  ShieldCheck, 
  Zap,
  ExternalLink,
  Info,
  Activity,
  AlertTriangle,
  Code2,
  Terminal,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  key?: string; // Only present on creation
}

interface WebhookConfig {
  id: string;
  url: string;
  events: string;
  secret: string;
  active: boolean;
}

export default function Integrations() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks'>('keys');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Actions
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['survey.started', 'response.received']);

  const availableEvents = [
    { id: 'survey.started', label: 'Pesquisa Iniciada', icon: Zap },
    { id: 'response.received', label: 'Resposta Recebida', icon: MessageSquare },
    { id: 'survey.closed', label: 'Pesquisa Concluída', icon: CheckCircle2 },
    { id: 'message.delivered', label: 'Mensagem Entregue', icon: Globe },
    { id: 'contact.optout', label: 'Opt-out (Sair)', icon: AlertTriangle }
  ];

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const envApiUrl = import.meta.env.VITE_API_URL;
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiBase = envApiUrl || (isDev ? 'http://localhost:3001' : window.location.origin);

  const fetchData = useCallback(async () => {
    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const [keysRes, hooksRes] = await Promise.all([
        fetch(`${apiBase}/api/integrations/keys`, { headers }),
        fetch(`${apiBase}/api/integrations/webhooks`, { headers })
      ]);
      
      if (!keysRes.ok || !hooksRes.ok) {
        throw new Error('Falha ao carregar dados de integração');
      }

      const keysData = await keysRes.json();
      const hooksData = await hooksRes.json();
      
      setKeys(keysData);
      setWebhooks(hooksData);
    } catch (err: any) {
      console.error('Failed to fetch integrations data:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateKey = async () => {
    try {
      const res = await fetch(`${apiBase}/api/integrations/keys`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.details || `Erro ${res.status}: Não foi possível criar a chave.`);
      }

      setGeneratedKey(data.key);
      setKeys([data, ...keys]);
      setNewKeyName(''); // Reset name after success
    } catch (err: any) {
      alert(`Erro ao criar chave: ${err.message}`);
    }
  };

  const handleCreateWebhook = async () => {
    try {
      const res = await fetch(`${apiBase}/api/integrations/webhooks`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          url: webhookUrl, 
          events: selectedEvents 
        })
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || `Erro ${res.status}: Não foi possível cadastrar o webhook.`);
      }

      setWebhooks([...webhooks, data]);
      setIsWebhookModalOpen(false);
      setWebhookUrl('');
    } catch (err: any) {
      alert(`Erro ao criar webhook: ${err.message}`);
    }
  };

  const handleDeleteKey = async (id: string, isWebhook = false) => {
    console.log(`[Integrations] 🚮 handleDeleteKey called for ${id}, isWebhook: ${isWebhook}`);
    if (confirmDeleteId !== id) {
       console.log(`[Integrations] ⏳ First click - asking for confirmation`);
       setConfirmDeleteId(id);
       setTimeout(() => setConfirmDeleteId(null), 3000); // 3s for confirmation
       return;
    }
    
    setConfirmDeleteId(null);

    if (!token) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      return;
    }

    try {
      console.log(`[Integrations] 🗑️ Deleting ${isWebhook ? 'webhook' : 'key'}: ${id}`);
      const endpoint = isWebhook ? `${apiBase}/api/integrations/webhooks/${id}` : `${apiBase}/api/integrations/keys/${id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        let errorMsg = 'Erro ao deletar recurso';
        try {
          const data = await res.json();
          errorMsg = data.error || data.details || errorMsg;
        } catch (e) {
          // If body is not JSON, use default error
        }
        throw new Error(errorMsg);
      }

      console.log(`[Integrations] ✅ ${isWebhook ? 'Webhook' : 'Key'} deleted success`);
      if (isWebhook) {
        setWebhooks(prev => prev.filter(w => w.id !== id));
      } else {
        setKeys(prev => prev.filter(k => k.id !== id));
      }
    } catch (err: any) {
      console.error('[Integrations] ❌ Delete error:', err);
      alert(`Erro ao deletar: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Desenvolvedor & Integrações</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Conecte seu CRM, ERP e automatize disparos via API e Webhooks.</p>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-surface-subtle/50 p-1 rounded-xl border border-zinc-200 dark:border-surface-border">
          <button 
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'keys' ? 'bg-white dark:bg-surface-card text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-surface-border' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Chaves de API
          </button>
          <button 
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'webhooks' ? 'bg-white dark:bg-surface-card text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-surface-border' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Webhooks
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'keys' ? (
            <div className="bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-zinc-100 dark:border-surface-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                    <Key className="w-5 h-5" />
                  </div>
                  <h2 className="font-semibold text-zinc-900 dark:text-white">Suas Chaves</h2>
                </div>
                <button 
                  onClick={() => { setIsKeyModalOpen(true); setGeneratedKey(null); }}
                  className="btn-primary py-1.5 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" /> Nova Chave
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-surface-border/50">
                {keys.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-zinc-500 text-sm italic">Nenhuma chave gerada ainda.</p>
                  </div>
                ) : (
                  keys.map(key => (
                    <div key={key.id} className="p-6 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">{key.name}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                          Criada em: {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleDeleteKey(key.id)}
                        className={`p-2 transition-all rounded-lg flex items-center gap-2 ${confirmDeleteId === key.id ? 'bg-red-500 text-white shadow-lg' : 'text-zinc-400 hover:text-red-500'}`}
                      >
                        {confirmDeleteId === key.id ? (
                           <span className="text-[10px] font-bold uppercase px-1">Confirmar?</span>
                        ) : (
                           <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-zinc-100 dark:border-surface-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                      <Webhook className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-zinc-900 dark:text-white">Webhooks Ativos</h2>
                  </div>
                  <button 
                    onClick={() => setIsWebhookModalOpen(true)}
                    className="btn-primary py-1.5 px-4"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Novo Webhook
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-surface-border/50">
                  {webhooks.length === 0 ? (
                    <div className="p-12 text-center text-sm italic text-zinc-500">Nenhum endpoint configurado.</div>
                  ) : (
                    webhooks.map(hook => (
                      <div key={hook.id} className="p-6 space-y-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2 truncate">
                              <div className={`w-2 h-2 rounded-full ${hook.active ? 'bg-green-500' : 'bg-zinc-400'}`} />
                              <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-md">{hook.url}</span>
                           </div>
                           <button 
                              onClick={() => handleDeleteKey(hook.id, true)} 
                              className={`p-1.5 rounded-lg transition-all ${confirmDeleteId === hook.id ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-red-500'}`}
                           >
                              {confirmDeleteId === hook.id ? (
                                <span className="text-[10px] font-bold px-1">Confirmar?</span>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                           </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {hook.events.split(',').map(ev => (
                             <span key={ev} className="px-2 py-0.5 bg-zinc-100 dark:bg-surface-subtle text-[10px] font-bold text-zinc-500 rounded uppercase tracking-wider">{ev}</span>
                           ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
            </div>
          )}
        </div>

        {/* Right Column: Mini-docs / Stats */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-50 dark:to-white p-6 rounded-2xl shadow-xl text-white dark:text-zinc-900 border border-white/5 dark:border-zinc-200">
             <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="font-bold text-lg">Ambiente Seguro</h3>
             </div>
             <p className="text-sm opacity-80 leading-relaxed mb-6">
                Todas as requisições API requerem o header <strong>X-API-KEY</strong>. 
                Seus webhooks são assinados com um segredo <strong>HMAC-SHA256</strong> exclusivo.
             </p>
              <div className="space-y-3">
                <Link to="/integrations/docs" className="flex items-center gap-2 text-sm font-bold border-b border-white/20 pb-1 w-fit hover:opacity-80 transition-opacity">
                  Tutorial & Guia Completo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <a href={`${apiBase}/api/docs`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold border-b border-white/20 pb-1 w-fit hover:opacity-80 transition-opacity">
                  Swagger OpenAPI <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
          </div>

          <div className="bg-zinc-950 dark:bg-surface-card rounded-3xl p-8 text-white dark:text-zinc-900 relative overflow-hidden group shadow-2xl border border-white/5 dark:border-surface-border">
            <Code2 className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 dark:text-zinc-900/5 group-hover:rotate-12 transition-transform duration-700" />
            <h4 className="text-sm font-bold flex items-center gap-2 mb-6"><Terminal className="w-4 h-4 text-emerald-500" /> API SDK v1.2</h4>
            <div className="space-y-6 relative z-10">
              <div className="space-y-2"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base API URL</span><div className="bg-white/5 dark:bg-surface-subtle p-3 rounded-xl text-[11px] font-mono text-emerald-400 break-all border border-white/5 dark:border-surface-border shadow-inner leading-relaxed">{`${apiBase}/api`}</div></div>
              <div className="space-y-2"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gatilho Rápido</span><pre className="bg-white/5 dark:bg-surface-subtle p-4 rounded-xl text-[10px] font-mono text-zinc-400 dark:text-zinc-500 overflow-x-auto border border-white/5 dark:border-surface-border shadow-inner leading-relaxed">{`curl -X POST /trigger \\
  -H "X-API-KEY: SUA_CHAVE" \\
  -d '{"ph": "55..."}'`}</pre></div>
              <Link to="/integrations/docs" className="flex items-center gap-2 text-[10px] font-black text-emerald-500 hover:text-emerald-400 transition-colors pt-2 uppercase tracking-widest">Documentação Completa <ChevronRight className="w-3 h-3" /></Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Nueva Chave */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
              {!generatedKey ? (
                <>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Gerar Nova Chave</h3>
                    <p className="text-sm text-zinc-500">Dê um nome para identificar onde essa chave será usada (ex: CRM, Site, ERP).</p>
                  </div>
                  <input 
                    placeholder="Nome da Integração" 
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                  />
                  <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-surface-border/50">
                    <button onClick={() => setIsKeyModalOpen(false)} className="btn-ghost flex-1 py-3">Cancelar</button>
                    <button 
                      onClick={handleCreateKey}
                      disabled={!newKeyName}
                      className="btn-primary flex-1 py-3"
                    >
                      Gerar Chave
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="font-bold text-sm">Chave Gerada com Sucesso!</span>
                    </div>
                    <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      IMPORTANTE: Copie e salve sua chave agora. Por segurança, ela não será mostrada novamente.
                    </p>
                    <div className="relative group">
                      <div className="w-full bg-zinc-100 dark:bg-surface-subtle p-4 rounded-xl font-mono text-xs break-all pr-12 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-surface-border">
                        {generatedKey}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(generatedKey)}
                        className="absolute right-3 top-3 p-2 bg-white dark:bg-surface-card rounded-lg shadow-sm hover:scale-105 transition-transform border border-zinc-200 dark:border-surface-border"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsKeyModalOpen(false)}
                    className="btn-primary w-full py-4"
                  >
                    Entendido, já salvei
                  </button>
                </>
              )}
           </div>
        </div>
      )}

      {/* MODAL: Nuevo Webhook */}
      {isWebhookModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border w-full max-w-xl rounded-2xl shadow-2xl p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Configurar Endpoint Webhook</h3>
                <p className="text-sm text-zinc-500">Seu servidor receberá um POST JSON sempre que um destes eventos ocorrer.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">URL do Destino (Endpoint)</label>
                  <input 
                    placeholder="https://seu-servidor.com/webhook"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 block">Eventos para Notificar</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableEvents.map(event => (
                      <button 
                        key={event.id}
                        onClick={() => {
                          if (selectedEvents.includes(event.id)) {
                            setSelectedEvents(selectedEvents.filter(e => e !== event.id));
                          } else {
                            setSelectedEvents([...selectedEvents, event.id]);
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedEvents.includes(event.id) ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900 shadow-lg scale-[1.02]' : 'bg-transparent border-zinc-200 dark:border-surface-border text-zinc-500 hover:border-zinc-400'}`}
                      >
                        <event.icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{event.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

               <div className="flex gap-3 pt-6 border-t border-zinc-100 dark:border-surface-border/50">
                <button onClick={() => setIsWebhookModalOpen(false)} className="btn-ghost flex-1 py-3">Cancelar</button>
                <button 
                  onClick={handleCreateWebhook}
                  disabled={!webhookUrl || selectedEvents.length === 0}
                  className="btn-primary flex-1 py-3"
                >
                  Confirmar Endpoint
                </button>
              </div>
            </div>
         </div>
      )}
    </div>
  );
}

