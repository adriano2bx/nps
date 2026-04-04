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
  }
}

export default function Surveys() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { campaigns: surveys, loading, isRefreshing, refreshCampaigns } = useData();
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const toggleActive = async (id: string, currentStatus: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
    setMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
            title="Atualizar Dados"
          >
            <RefreshCcw className={`w-4 h-4 ${isRefreshing.campaigns ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => navigate('new')}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-zinc-200/50 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            Nova Pesquisa
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
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
              ) : surveys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 font-medium">
                    Nenhuma pesquisa encontrada. Comece criando uma nova!
                  </td>
                </tr>
              ) : (
                surveys.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all group">
                    <td className="py-5 px-6">
                      <div className="font-bold text-zinc-900 dark:text-white text-sm">{row.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{row._count?.questions || 0} perguntas no fluxo</div>
                    </td>
                    <td className="py-5 px-6">
                      <span className="inline-flex py-1 px-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] tracking-wider font-bold text-zinc-600 dark:text-zinc-400 uppercase border border-zinc-200/50 dark:border-zinc-700/50">
                        {row.triggerType}
                      </span>
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
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleDelete} className="px-6 py-2.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200/50 dark:shadow-none active:scale-95">Excluir Agora</button>
        </div>
      </Modal>
    </div>
  );
}
