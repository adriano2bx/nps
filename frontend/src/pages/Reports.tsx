import { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, ShieldCheck, 
  Calendar, ChevronDown, FileSpreadsheet, FileText,
  UserX, CheckCircle2, AlertCircle, TrendingUp, RefreshCcw,
  Trash2
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { TableSkeleton, StatsSkeleton } from '../components/Skeletons';
import { TableVirtuoso } from 'react-virtuoso';
import React from 'react';

export default function Reports() {
  const { token } = useAuth();
  const { 
    reports: rData, 
    campaigns, 
    loading, 
    isRefreshing, 
    refreshReports,
    refreshDashboard
  } = useData();

  const [filter, setFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    campaign: 'all',
    scoreCategory: 'all',
    status: 'all'
  });

  // Modal State & Data Fetching
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const fetchSessionDetail = async (id: string) => {
    setSelectedSession(id);
    setLoadingDetail(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/reports/session/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const json = await response.json();
        setDetail(json);
      }
    } catch (err) {
      console.error('Error fetching session detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const data = rData.data;
  const pagination = rData.pagination;
  const stats = rData.stats;

  useEffect(() => {
    refreshReports(1, filters);
  }, [filters.campaign, filters.scoreCategory, refreshReports]);

  const handleAnonymize = async (sessionId: string) => {
    if (!window.confirm('LGPD: Deseja anonimizar permanentemente este contato? A nota será mantida para estatísticas, mas o nome e telefone serão removidos.')) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/reports/anonymize-session/${sessionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        refreshReports(pagination.page, filters);
        refreshDashboard();
      }
    } catch (err) {
      console.error('Error anonymizing:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/reports/session/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        refreshReports(pagination.page, filters);
        refreshDashboard();
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const filteredData = Array.isArray(data) ? data.filter(row => {
    const term = filter.toLowerCase();
    const name = (row.name || '').toLowerCase();
    const phone = (row.phone || '').toLowerCase();
    const response = (row.response || '').toLowerCase();
    return name.includes(term) || phone.includes(term) || response.includes(term);
  }) : [];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Central de Inteligência</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Relatórios consolidados e gestão de conformidade LGPD.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refreshReports(pagination.page, filters)} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95" title="Atualizar Dados">
            <RefreshCcw className={`w-4 h-4 ${isRefreshing.reports ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative group">
            <button onClick={() => setIsExporting(!isExporting)} className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-5 py-2.5 rounded-xl font-semibold text-sm hover:scale-[1.02] transition-all shadow-lg active:scale-95">
              <Download className="w-4 h-4" /> Exportar Dados <ChevronDown className={`w-4 h-4 transition-transform ${isExporting ? 'rotate-180' : ''}`} />
            </button>
            {isExporting && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel (.xlsx)</button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800 transition-colors"><FileText className="w-4 h-4 text-blue-500" /> CSV (Padrão)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading.reports && !stats ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total de Respostas', value: stats?.total || 0, icon: CheckCircle2, color: 'text-zinc-900 dark:text-white' },
            { label: 'NPS Score', value: stats?.score || 0, icon: TrendingUp, color: 'text-brand-600 dark:text-brand-400', sub: 'Zona de Qualidade' },
            { label: 'Promotores', value: `${stats?.promoterPercentage || 0}%`, icon: ShieldCheck, color: 'text-emerald-600' },
            { label: 'Detratores', value: `${stats?.detractorPercentage || 0}%`, icon: AlertCircle, color: 'text-rose-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"><s.icon className="w-5 h-5 text-zinc-500" /></div>
                {s.sub && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-600 rounded-full">{s.sub}</span>}
              </div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
              <h3 className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</h3>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Buscar por nome, telefone ou resposta..." className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl py-2.5 px-10 text-sm focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all" value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              <Calendar className="w-4 h-4" /> Últimos 30 dias <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${showAdvanced ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>
              <Filter className="w-4 h-4" /> Filtros Avançados
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl animate-in slide-in-from-top-4 duration-300 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Campanha Específica</label><select className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all cursor-pointer" value={filters.campaign} onChange={e => setFilters({...filters, campaign: e.target.value})}><option value="all">Todas as Campanhas</option>{campaigns.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
            <div><label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Categoria de Nota (NPS)</label><select className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all cursor-pointer" value={filters.scoreCategory} onChange={e => setFilters({...filters, scoreCategory: e.target.value})}><option value="all">Todos os Scores</option><option value="promoter">Promotores (9-10)</option><option value="neutral">Neutros (7-8)</option><option value="detractor">Detratores (0-6)</option></select></div>
            <div><label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Status da Resposta</label><select className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all cursor-pointer" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="all">Qualquer Status</option><option value="completed">Concluída</option><option value="pending">Pendente</option><option value="expired">Expirada</option></select></div>
            <div className="md:col-span-3 pt-2 flex justify-end"><button onClick={() => setFilters({ campaign: 'all', scoreCategory: 'all', status: 'all' })} className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase tracking-widest transition-colors">Limpar Filtros</button></div>
          </div>
        )}
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[650px]">
        <div className="flex-1 overflow-hidden">
          <TableVirtuoso
            style={{ height: '100%' }}
            data={filteredData}
            useWindowScroll={false}
            fixedHeaderContent={() => (
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 backdrop-blur-md">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-inherit text-left">Data</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-inherit text-left">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-inherit text-left">Campanha</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center bg-inherit">NPS</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-inherit text-left">Comentário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right bg-inherit">Ações</th>
              </tr>
            )}
            components={{
              Table: (props) => <table {...props} className="w-full text-left border-collapse" />,
              TableRow: (props) => {
                const rowData = (props as any).item;
                return (
                  <tr 
                    {...props} 
                    className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer" 
                    onClick={() => rowData?.id && fetchSessionDetail(rowData.id)}
                  />
                );
              },
              TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-zinc-100 dark:divide-zinc-800" />),
            }}
            itemContent={(_index, row) => (
              <>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{new Date(row.date).toLocaleDateString('pt-BR')}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${row.isMasked ? 'text-rose-500 italic' : 'text-zinc-900 dark:text-white'}`}>{row.name}</span>
                    <span className="text-xs text-zinc-500">{row.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-left">
                  <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold rounded-md uppercase tracking-wider">{row.campaign}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-sm ${row.score >= 9 ? 'bg-emerald-500 text-white' : row.score >= 7 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {row.score}
                  </div>
                </td>
                <td className="px-6 py-4 text-left">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-xs truncate" title={row.response}>{row.response || '—'}</p>
                </td>
                <td className="px-6 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                  {!row.isMasked && (
                    <button onClick={() => handleAnonymize(row.id)} className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Anonimizar (Direito ao Esquecimento LGPD)">
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(row.id)} className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </>
            )}
          />
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/50">
          <span className="text-xs text-zinc-500">Mostrando {filteredData.length} de {pagination.total} registros</span>
          <div className="flex items-center gap-2">
            <button onClick={() => refreshReports(pagination.page - 1, filters)} disabled={pagination.page <= 1 || loading.reports} className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 disabled:opacity-30">Anterior</button>
            <div className="flex items-center gap-1">
               {[...Array(Math.min(pagination.pages, 5))].map((_, i) => (
                 <button key={i} onClick={() => refreshReports(i + 1, filters)} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all ${pagination.page === i + 1 ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'text-zinc-500'}`}>{i + 1}</button>
               ))}
            </div>
            <button onClick={() => refreshReports(pagination.page + 1, filters)} disabled={pagination.page >= pagination.pages || loading.reports} className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 disabled:opacity-30">Próximo</button>
          </div>
        </div>
      </div>

      {/* Detailed session modal */}
      <Modal isOpen={!!selectedSession} onClose={() => setSelectedSession(null)} title="Detalhes da Interação" size="lg">
        {loadingDetail ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-800 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Buscando histórico completo...</p>
          </div>
        ) : detail ? (
          <div className="space-y-8 p-1">
            {/* Header: Contact Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 ${detail.session.contact.isMasked ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'}`}>
                  {detail.session.contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${detail.session.contact.isMasked ? 'text-rose-500 italic' : 'text-zinc-900 dark:text-white'}`}>{detail.session.contact.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-zinc-500">{detail.session.contact.phone}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{detail.session.campaignName}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded uppercase tracking-wider mb-2">{detail.session.status}</span>
                <p className="text-xs text-zinc-500">{new Date(detail.session.startedAt).toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Section 1: Response List */}
            <div className="space-y-4">
               <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <FileText className="w-3 h-3" /> Transcrição da Pesquisa
               </h4>
               <div className="space-y-3">
                 {detail.session.responses.map((r: any, i: number) => (
                   <div key={i} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-4 transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
                     <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">{r.question}</p>
                     <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-relaxed">{r.text || r.value || '—'}</p>
                        {r.type === 'nps' && (
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shadow-lg ${r.value! >= 9 ? 'bg-emerald-500 text-white' : r.value! >= 7 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {r.value}
                          </div>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Section 2: History Timeline */}
            <div className="space-y-4">
               <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <TrendingUp className="w-3 h-3" /> Histórico de Engajamento
               </h4>
               <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-zinc-100 dark:bg-zinc-800" />
                  
                  {detail.history.map((h: any, i: number) => (
                    <div key={i} className="relative flex items-center justify-between group">
                      <div className={`absolute -left-[1.375rem] w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 transition-all ${h.score === null ? 'bg-zinc-300 animate-pulse' : h.score >= 9 ? 'bg-emerald-500 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : h.score >= 7 ? 'bg-amber-500' : 'bg-rose-500'} group-hover:scale-125 z-10`} />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{h.campaignName}</p>
                        <p className="text-[10px] text-zinc-400">{new Date(h.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${h.score === null ? 'text-zinc-300' : h.score >= 9 ? 'text-emerald-500' : h.score >= 7 ? 'text-amber-500' : 'text-rose-500'}`}>
                           {h.score === null ? 'Incompleta' : `Score: ${h.score}`}
                         </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="relative flex items-center gap-3">
                    <div className="absolute -left-[1.375rem] w-3 h-3 rounded-full bg-brand-500 ring-4 ring-brand-500/20" />
                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Interação Atual</span>
                  </div>

                  {detail.history.length === 0 && (
                    <p className="text-[10px] text-zinc-400 italic">Primeira interação deste contato registrada no sistema.</p>
                  )}
               </div>
            </div>

            {/* Footer: Admin Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800 text-left">
               <div className="flex items-center gap-2">
                  {!detail.session.contact.isMasked && (
                    <button onClick={() => { handleAnonymize(detail.session.id); setSelectedSession(null); }} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors uppercase tracking-tight">
                      <UserX className="w-4 h-4" /> Anonimizar LGPD
                    </button>
                  )}
               </div>
               <button onClick={() => { setDeleteTarget(detail.session.id); setSelectedSession(null); }} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors uppercase tracking-tight">
                 <Trash2 className="w-4 h-4" /> Excluir Registro
               </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão" size="sm">
        <div className="p-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">Tem certeza que deseja excluir o registro de <span className="font-semibold text-zinc-900 dark:text-zinc-100">"{Array.isArray(data) ? data.find((d: any) => d.id === deleteTarget)?.name : ''}"</span>? Esta ação removerá permanentemente os dados desta resposta.</p>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Cancelar</button>
          <button onClick={() => deleteTarget && handleDelete(deleteTarget)} className="px-4 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Confirmar Exclusão</button>
        </div>
      </Modal>
    </div>
  );
}
