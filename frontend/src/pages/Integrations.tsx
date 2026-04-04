import { useState, useEffect } from 'react';
import axios from 'axios';
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
  MoreVertical,
  Activity,
  AlertTriangle
} from 'lucide-react';

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

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [keysRes, hooksRes] = await Promise.all([
        axios.get('/api/integrations/keys', { headers }),
        axios.get('/api/integrations/webhooks', { headers })
      ]);
      
      setKeys(keysRes.data);
      setWebhooks(hooksRes.data);
    } catch (err) {
      console.error('Failed to fetch integrations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/integrations/keys', { name: newKeyName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedKey(res.data.key);
      setKeys([res.data, ...keys]);
    } catch (err) {
      alert('Erro ao criar chave');
    }
  };

  const handleCreateWebhook = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/integrations/webhooks', { 
        url: webhookUrl, 
        events: selectedEvents 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWebhooks([...webhooks, res.data]);
      setIsWebhookModalOpen(false);
      setWebhookUrl('');
    } catch (err) {
      alert('Erro ao criar webhook');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Tem certeza? Isso quebrará as integrações usando esta chave.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/integrations/keys/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeys(keys.filter(k => k.id !== id));
    } catch (err) {
      alert('Erro ao deletar chave');
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
        
        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button 
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'keys' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Chaves de API
          </button>
          <button 
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'webhooks' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            Webhooks
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'keys' ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                    <Key className="w-5 h-5" />
                  </div>
                  <h2 className="font-semibold text-zinc-900 dark:text-white">Suas Chaves</h2>
                </div>
                <button 
                  onClick={() => { setIsKeyModalOpen(true); setGeneratedKey(null); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Nova Chave
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                      <Webhook className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-zinc-900 dark:text-white">Webhooks Ativos</h2>
                  </div>
                  <button 
                    onClick={() => setIsWebhookModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" /> Novo Webhook
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                           <button onClick={() => handleDeleteKey(hook.id)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {hook.events.split(',').map(ev => (
                             <span key={ev} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 rounded uppercase tracking-wider">{ev}</span>
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
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 p-6 rounded-2xl shadow-xl text-white dark:text-zinc-900">
             <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="font-bold text-lg">Ambiente Seguro</h3>
             </div>
             <p className="text-sm opacity-80 leading-relaxed mb-6">
                Todas as requisições API requerem o header <strong>X-API-KEY</strong>. 
                Seus webhooks são assinados com um segredo <strong>HMAC-SHA256</strong> exclusivo.
             </p>
             <a href="#" className="flex items-center gap-2 text-sm font-bold border-b border-white/20 pb-1 w-fit hover:opacity-80 transition-opacity">
                Abrir Documentação Técnica <ExternalLink className="w-3.5 h-3.5" />
             </a>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
             <h4 className="font-semibold text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-500" /> Métricas de Integração
             </h4>
             <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500">Chamadas API (24h)</span>
                <span className="font-mono text-sm font-bold">1.242</span>
             </div>
             <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500">Taxa de Sucesso Webhook</span>
                <span className="text-sm font-bold text-emerald-500">99.8%</span>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL: Nueva Chave */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
              {!generatedKey ? (
                <>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Gerar Nova Chave</h3>
                    <p className="text-sm text-zinc-500">Dê um nome para identificar onde essa chave será usada (ex: CRM, Site, ERP).</p>
                  </div>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-900 dark:ring-white transition-all outline-none"
                    placeholder="Nome da Integração" 
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setIsKeyModalOpen(false)} className="flex-1 py-3 text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
                    <button 
                      onClick={handleCreateKey}
                      disabled={!newKeyName}
                      className="flex-1 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
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
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl font-mono text-xs break-all pr-12 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {generatedKey}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(generatedKey)}
                        className="absolute right-3 top-3 p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm hover:scale-105 transition-transform"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsKeyModalOpen(false)}
                    className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold rounded-xl shadow-xl"
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
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-2xl shadow-2xl p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Configurar Endpoint Webhook</h3>
                <p className="text-sm text-zinc-500">Seu servidor receberá um POST JSON sempre que um destes eventos ocorrer.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">URL do Destino (Endpoint)</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 focus:ring-2 ring-zinc-900 dark:ring-white outline-none"
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
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedEvents.includes(event.id) ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900 shadow-lg scale-[1.02]' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'}`}
                      >
                        <event.icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{event.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsWebhookModalOpen(false)} className="flex-1 py-3 text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
                <button 
                  onClick={handleCreateWebhook}
                  disabled={!webhookUrl || selectedEvents.length === 0}
                  className="flex-1 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold rounded-xl hover:opacity-90 shadow-xl disabled:opacity-50"
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

// Helper icons missing in standard imports if needed or for consistency
function MessageSquare(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
