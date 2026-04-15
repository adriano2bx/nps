import { 
  BookOpen, 
  Code2, 
  Terminal, 
  Globe, 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  ChevronRight, 
  Copy, 
  ExternalLink,
  Info,
  Server,
  Workflow
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function IntegrationDocs() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const envApiUrl = import.meta.env.VITE_API_URL;
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiBase = envApiUrl || (isDev ? 'http://localhost:3001' : window.location.origin);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sections = [
    { 
      id: 'auth', 
      title: 'Autenticação', 
      icon: ShieldCheck, 
      color: 'text-blue-500',
      content: 'Todas as chamadas à API Pública (V1) devem incluir o cabeçalho X-API-KEY. Sua chave é composta pelo seu ID de Tenant seguido por um segredo gerado.'
    },
    { 
      id: 'trigger', 
      title: 'Disparo de Pesquisas', 
      icon: Zap, 
      color: 'text-amber-500',
      content: 'Use o endpoint /trigger para iniciar uma conversa de pesquisa com um cliente. Ideal para fluxos pós-venda ou pós-atendimento.'
    },
    { 
      id: 'webhooks', 
      title: 'Webhooks & Eventos', 
      icon: Globe, 
      color: 'text-purple-500',
      content: 'Receba notificações em tempo real no seu servidor sempre que um evento ocorrer (pesquisa iniciada, resposta recebida, etc).'
    }
  ];

  const CodeBlock = ({ code, id }: { code: string, id: string }) => (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-300 p-6 rounded-2xl font-mono text-xs overflow-x-auto border border-white/5 leading-relaxed shadow-2xl">
        {code}
      </pre>
      <button 
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all border border-white/5"
      >
        {copiedId === id ? <span className="text-[10px] font-bold text-emerald-400">Copiado!</span> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-surface-dark text-zinc-900 dark:text-zinc-100 selection:bg-blue-100 dark:selection:bg-blue-900/30 font-sans transition-colors duration-500">
      {/* Header / Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-zinc-200 dark:border-surface-border">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center border border-zinc-200 dark:border-surface-border">
              <Code2 className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="font-bold tracking-tight">API Reference <span className="text-zinc-400 font-medium ml-1">v1.0</span></span>
          </div>
          <div className="flex items-center gap-6">
             <a href={`${apiBase}/api/docs`} target="_blank" className="text-sm font-medium hover:text-blue-500 transition-colors flex items-center gap-2">
                Swagger <ExternalLink className="w-3.5 h-3.5" />
             </a>
              <Link to="/integrations" className="btn-primary py-1.5 px-4">
                 Voltar ao Painel
              </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block space-y-8 sticky top-28 self-start">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 px-4">Início</h4>
            <div className="space-y-1">
               {sections.map(s => (
                  <a key={s.id} href={`#${s.id}`} className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-surface-subtle transition-all group">
                     <s.icon className={`w-4 h-4 ${s.color}`} />
                     {s.title}
                  </a>
               ))}
            </div>
          </div>
          
          <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
             <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Dica Técnica</span>
             </div>
             <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                Nossos webhooks suportam retry automático em caso de falha no seu servidor (até 5 tentativas).
             </p>
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-24 pb-24">
          
          {/* Introduction */}
          <section id="auth" className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-900/30">
               <ShieldCheck className="w-3.5 h-3.5" /> Autenticação Segura
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight">Fundamentos da API</h2>
            <p className="text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed">
               Todas as chamadas à API do HealthNPS devem ser autenticadas via header <code className="bg-zinc-100 dark:bg-surface-subtle px-1.5 py-0.5 rounded text-zinc-900 dark:text-white font-mono text-base">X-API-KEY</code>. 
               Sua chave é composta pelo seu <code className="text-blue-500 font-bold">tenantId</code> seguido por um <code className="text-emerald-500 font-bold">segredo</code>.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="p-6 bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border rounded-3xl shadow-sm">
                   <h4 className="font-bold flex items-center gap-2 mb-2"><Terminal className="w-4 h-4 text-zinc-400" /> Header Exemplo</h4>
                   <div className="bg-zinc-100 dark:bg-surface-subtle p-4 rounded-xl font-mono text-xs break-all text-zinc-500">
                      X-API-KEY: b8c1...9c22.d9f2...a4e5
                   </div>
                </div>
                <div className="p-6 bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border rounded-3xl shadow-sm">
                   <h4 className="font-bold flex items-center gap-2 mb-2"><Server className="w-4 h-4 text-zinc-400" /> Base URL</h4>
                   <div className="bg-zinc-100 dark:bg-surface-subtle p-4 rounded-xl font-mono text-xs text-blue-500 font-bold">
                      {apiBase}/api/v1
                   </div>
                </div>
            </div>
          </section>

          {/* Trigger API */}
          <section id="trigger" className="space-y-8">
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-500">
                     <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold">Disparar Pesquisa</h3>
               </div>
               <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-lg">
                  Envie solicitações para convidar clientes para pesquisas de satisfação em tempo real. Este endpoint cria uma nova sessão de atendimento automatizado no WhatsApp.
               </p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 px-1">
                  <Workflow className="w-3.5 h-3.5" /> Payload Requisitado (POST /trigger)
               </div>
               <CodeBlock 
                  id="code_trigger"
                  code={`curl -X POST ${apiBase}/api/v1/trigger \\
  -H "X-API-KEY: SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": "uuid-da-campanha",
    "phoneNumber": "5511999999999",
    "contactName": "João Silva"
  }'`}
               />
            </div>
          </section>


          {/* Webhooks Section */}
          <section id="webhooks" className="space-y-8">
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-500">
                     <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold">Webhooks & Eventos</h3>
               </div>
               <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-lg">
                  Configura endpoints para receber notificações HTTP POST. Quando um cliente responde uma nota, enviamos um payload completo para sua URL.
               </p>
            </div>

            <div className="bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border rounded-3xl overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                           <th className="px-6 py-4 font-bold">Evento</th>
                           <th className="px-6 py-4 font-bold">Payload Descrição</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        <tr>
                           <td className="px-6 py-4"><span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-black uppercase tracking-wider">survey.started</span></td>
                           <td className="px-6 py-4 text-zinc-500">Sessão aberta, primeiro convite disparado no WhatsApp.</td>
                        </tr>
                        <tr>
                           <td className="px-6 py-4"><span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded text-[10px] font-black uppercase tracking-wider">response.received</span></td>
                           <td className="px-6 py-4 text-zinc-500">Nota NPS (0-10) ou texto capturado. Inclui <code className="text-zinc-800 dark:text-white font-bold">answerValue</code>.</td>
                        </tr>
                        <tr>
                           <td className="px-6 py-4"><span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 rounded text-[10px] font-black uppercase tracking-wider">survey.closed</span></td>
                           <td className="px-6 py-4 text-zinc-500">Pesquisa encerrada, mensagem de agradecimento enviada.</td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>
          </section>

          {/* Final Message Card */}
          <section className="bg-gradient-to-br from-zinc-900/90 to-black dark:from-zinc-100 dark:to-zinc-200 p-12 rounded-3xl text-white dark:text-zinc-900 relative overflow-hidden border border-white/5 dark:border-surface-border">
             <Terminal className="absolute top-0 right-0 w-64 h-64 text-white/5 dark:text-black/5 -translate-y-12 translate-x-12" />
             <div className="relative z-10 max-w-xl space-y-6">
                <h3 className="text-3xl font-bold">Pronto para Integrar?</h3>
                <p className="text-lg opacity-80 leading-relaxed">
                   Nossa API foi desenhada para ser simples e poderosa. Se precisar de ajuda em implementações complexas, nossa equipe técnica está à disposição.
                </p>
                <div className="flex gap-4">
                   <Link to="/integrations" className="px-6 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl font-bold transition-transform hover:scale-105">
                      Voltar para Chaves de API
                   </Link>
                </div>
             </div>
          </section>

        </div>
      </main>
    </div>
  );
}
