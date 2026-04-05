import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, PlayCircle, PauseCircle, Trash2, PauseOctagon, RefreshCcw, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { TableSkeleton } from '../components/Skeletons';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  triggerType: string;
  _count?: {
    questions: number;
    sessions: number;
  };
  topic?: {
    id: string;
    name: string;
    color: string | null;
  };
}

export default function Surveys() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { campaigns: surveys, loading, isRefreshing, refreshCampaigns, topics } = useData();
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | 'all'>('all');

  const filteredSurveys = surveys.filter(s => 
    selectedTopicId === 'all' || s.topic?.id === selectedTopicId
  );

  const toggleActive = async (id: string, currentStatus: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const response = await fetch(`${apiBase}/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        refreshCampaigns();
      } else {
        const errorData = await response.json();
        alert('Erro ao alterar status: ' + (errorData.details || errorData.error || 'Erro desconhecido'));
      }
    } catch (err: any) {
      console.error('Error toggling status:', err);
      alert('Falha na conexão com o servidor.');
    }
    setMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/campaigns/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        refreshCampaigns();
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Pesquisas</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Configure fluxos de NPS e réguas de relacionamento.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refreshCampaigns()} 
            className="btn-secondary p-2.5"
            title="Atualizar Dados"
          >
            <RefreshCcw className={`w-4 h-4 ${isRefreshing.campaigns ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => navigate('new')}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Pesquisa
          </button>
        </div>
      </div>
      
      {/* Topics Filter */}
      {topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedTopicId('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedTopicId === 'all' 
                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black shadow-lg shadow-zinc-200 dark:shadow-none' 
                : 'bg-white dark:bg-surface-subtle border-zinc-200 dark:border-surface-border text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            Todas
          </button>
          {topics.map(topic => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopicId(topic.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${
                selectedTopicId === topic.id 
                  ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black shadow-lg shadow-zinc-200 dark:shadow-none' 
                  : 'bg-white dark:bg-surface-subtle border-zinc-200 dark:border-surface-border text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topic.color || '#10b981' }} />
              {topic.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-surface-card border border-zinc-200 dark:border-surface-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-surface-border/50 bg-zinc-50/50 dark:bg-surface-subtle/50">
                <th className="py-4 px-6 font-bold text-zinc-400 text-xs uppercase tracking-widest">Nome da Campanha</th>
                <th className="py-4 px-6 font-bold text-zinc-400 text-xs uppercase tracking-widest">Canal</th>
                <th className="py-4 px-6 font-bold text-zinc-400 text-xs uppercase tracking-widest text-center">Interações</th>
                <th className="py-4 px-6 font-bold text-zinc-400 text-xs uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 transition-all">
              {loading.campaigns && surveys.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <TableSkeleton rows={4} />
                  </td>
                </tr>
              ) : filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 font-medium">
                    {selectedTopicId === 'all' 
                      ? 'Nenhuma pesquisa encontrada. Comece criando uma nova!' 
                      : 'Nenhuma pesquisa encontrada nesta categoria.'}
                  </td>
                </tr>
              ) : (
                filteredSurveys.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all group">
                    <td className="py-5 px-6">
                      <div className="font-bold text-zinc-900 dark:text-white text-sm">{row.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{row._count?.questions || 0} perguntas no fluxo</div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex py-1 px-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] tracking-wider font-bold text-zinc-600 dark:text-zinc-400 uppercase border border-zinc-200/50 dark:border-zinc-700/50 w-fit">
                          {row.triggerType}
                        </span>
                        {row.topic && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: row.topic.color || '#10b981' }} />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{row.topic.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {row._count?.sessions || 0}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        {row.status === 'ACTIVE' ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[10px] font-bold uppercase border border-emerald-100 dark:border-emerald-500/20">
                            <PlayCircle className="w-3.5 h-3.5" /> Ativa
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase border border-zinc-200 dark:border-zinc-700">
                            <PauseCircle className="w-3.5 h-3.5" /> Pausada
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right relative">
                      <button onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpen === row.id && (
                        <div className="absolute right-12 top-0 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-48 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={() => navigate(`edit/${row.id}`)} className="flex items-center gap-3 w-full px-4 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold">
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar Questionário
                          </button>
                          <button onClick={() => toggleActive(row.id, row.status)} className="flex items-center gap-3 w-full px-4 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold">
                            {row.status === 'ACTIVE' ? <PauseOctagon className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            {row.status === 'ACTIVE' ? 'Pausar Campanha' : 'Ativar Campanha'}
                          </button>
                          <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                          <button onClick={() => { setDeleteTarget(row); setMenuOpen(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-xs font-semibold">
                            <Trash2 className="w-3.5 h-3.5" /> Excluir permanentemente
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão" size="sm">
        <div className="p-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Tem certeza que deseja excluir a pesquisa <span className="font-bold text-zinc-900 dark:text-white">"{deleteTarget?.name}"</span>? 
            Esta ação apagará todos os dados vinculados a esta campanha e é <span className="text-rose-500 font-semibold underline">irreversível</span>.
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100 dark:border-surface-border/50">
          <button onClick={() => setDeleteTarget(null)} className="btn-ghost">Cancelar</button>
          <button onClick={handleDelete} className="btn-danger px-8">Excluir Agora</button>
        </div>
      </Modal>
    </div>
  );
}
