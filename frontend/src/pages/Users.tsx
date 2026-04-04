import React, { useState, useEffect } from 'react';
import { 
  MoreHorizontal, ShieldAlert, ShieldCheck, UserX, RefreshCcw, 
  Search, Plus, Trash2, Edit2, Loader2, Tag, Layers, X, Check
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { TableVirtuoso } from 'react-virtuoso';

interface Segment {
  id: string;
  name: string;
  color: string;
  _count?: { contacts: number };
}

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  optOut: boolean;
  isMasked: boolean;
  lastActive: string;
  segments: Segment[];
}

const emptyForm = { name: '', phoneNumber: '', segmentIds: [] as string[] };

export default function Users() {
  const { token } = useAuth();
  const { patients: pData, isRefreshing, refreshPatients } = useData();
  const [selected, setSelected] = useState<Contact | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  // CRUD States
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  // Segmentation States
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentsOpen, setSegmentsOpen] = useState(false);
  const [newSegment, setNewSegment] = useState({ name: '', color: '#10b981' });
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);

  const patients = pData.data || [];
  const pagination = pData.pagination;

  const fetchSegments = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/segments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSegments(data);
      }
    } catch (err) {
      console.error('Error fetching segments:', err);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const url = editTarget 
        ? `${apiBase}/api/contacts/${editTarget.id}` 
        : `${apiBase}/api/contacts`;
      
      const response = await fetch(url, {
        method: editTarget ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        refreshPatients(pagination.page);
        setFormOpen(false);
        setEditTarget(null);
        setForm(emptyForm);
      }
    } catch (err) {
      console.error('Error saving contact:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/contacts/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        refreshPatients(pagination.page);
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegment.name) return;
    setIsCreatingSegment(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/segments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newSegment)
      });
      if (response.ok) {
        fetchSegments();
        setNewSegment({ name: '', color: '#10b981' });
      }
    } catch (err) {
      console.error('Error creating segment:', err);
    } finally {
      setIsCreatingSegment(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/segments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) fetchSegments();
    } catch (err) {
      console.error('Error deleting segment:', err);
    }
  };

  const toggleSegmentInForm = (id: string) => {
    setForm(prev => {
      const exists = prev.segmentIds.includes(id);
      if (exists) return { ...prev, segmentIds: prev.segmentIds.filter(i => i !== id) };
      return { ...prev, segmentIds: [...prev.segmentIds, id] };
    });
  };

  const filteredPatients = patients.filter(p => {
    const term = filter.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) || (p.phoneNumber || '').includes(term);
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Usuários & Contatos</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gerencie seu diretório de contatos e segmentações para disparos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSegmentsOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-200 dark:border-zinc-800"
          >
            <Layers className="w-4 h-4" />
            Segmentos
          </button>
          <button 
            onClick={() => { setEditTarget(null); setForm(emptyForm); setFormOpen(true); }}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-zinc-200/50 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou WhatsApp ID..." 
            className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl py-2.5 px-10 text-sm focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => refreshPatients(pagination.page)} className={`p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 ${isRefreshing.patients ? 'animate-spin' : ''}`}>
              <RefreshCcw className="w-4 h-4 text-zinc-400" />
           </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col h-[600px]">
        <div className="flex-1 overflow-hidden">
          <TableVirtuoso
            style={{ height: '100%' }}
            data={filteredPatients}
            fixedHeaderContent={() => (
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md">
                <th className="py-4 px-6 font-bold text-zinc-400 text-[10px] uppercase tracking-widest bg-inherit text-left">Usuário</th>
                <th className="py-4 px-6 font-bold text-zinc-400 text-[10px] uppercase tracking-widest bg-inherit text-center">WhatsApp ID</th>
                <th className="py-4 px-6 font-bold text-zinc-400 text-[10px] uppercase tracking-widest bg-inherit text-left">Segmentos</th>
                <th className="py-4 px-6 font-bold text-zinc-400 text-[10px] uppercase tracking-widest bg-inherit">Status</th>
                <th className="py-4 px-6 w-[80px] bg-inherit"></th>
              </tr>
            )}
            components={{
              Table: (props) => <table {...props} className="w-full text-left border-collapse text-sm" />,
              TableRow: (props) => <tr {...props} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all group" />,
              TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-zinc-100 dark:divide-zinc-800" />),
            }}
            itemContent={(_index, row) => (
              <>
                <td className="py-4 px-6">
                  <div className={`font-bold text-sm ${row.isMasked ? 'text-rose-500 italic' : 'text-zinc-900 dark:text-white'}`}>
                    {row.name}
                  </div>
                </td>
                <td className="py-4 px-6 font-mono text-[11px] text-zinc-500 text-center">
                  {row.phoneNumber}
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-wrap gap-1.5">
                     {row.segments?.length > 0 ? (
                      row.segments.map((seg: Segment) => (
                        <span 
                          key={seg.id} 
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: seg.color }}
                        >
                          {seg.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic">Sem segmento</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  {row.optOut ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-[10px] font-bold uppercase tracking-wider border border-rose-100 dark:border-rose-500/20">
                      <ShieldAlert className="w-3 h-3" /> Bloqueado
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> Ativo
                    </div>
                  )}
                </td>
                <td className="py-4 px-6 text-right relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === row.id ? null : row.id)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuOpen === row.id && (
                    <div className="absolute right-12 top-0 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-48 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={() => { setEditTarget(row); setForm({ name: row.name, phoneNumber: row.phoneNumber, segmentIds: row.segments.map((s: Segment) => s.id) }); setFormOpen(true); setMenuOpen(null); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar Cadastro
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(row); setMenuOpen(null); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir Contato
                      </button>
                    </div>
                  )}
                </td>
              </>
            )}
          />
        </div>
      </div>

      {/* Form Modal (Add/Edit) */}
      <Modal 
        isOpen={formOpen} 
        onClose={() => setFormOpen(false)} 
        title={editTarget ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
        size="md"
      >
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                required
                className="w-full bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-zinc-900/5 transition-all text-zinc-900 dark:text-white"
                placeholder="Ex: João da Silva"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">WhatsApp (com DDD)</label>
              <input 
                required
                className="w-full bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm font-mono text-zinc-900 dark:text-white"
                placeholder="5511999999999"
                value={form.phoneNumber}
                onChange={e => setForm({...form, phoneNumber: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Tag className="w-3 h-3" /> Segmentação & Tags
             </label>
             <div className="flex flex-wrap gap-2 p-4 bg-zinc-50 dark:bg-zinc-850/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                {segments.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 italic">Nenhum segmento criado ainda.</p>
                ) : (
                  segments.map(seg => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => toggleSegmentInForm(seg.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        form.segmentIds.includes(seg.id)
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg'
                          : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      {seg.name}
                      {form.segmentIds.includes(seg.id) && <Check className="w-3 h-3 ml-1" />}
                    </button>
                  ))
                )}
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <button type="button" onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-xs font-bold text-zinc-500">Cancelar</button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-3 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editTarget ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Segment Manager Modal */}
      <Modal isOpen={segmentsOpen} onClose={() => setSegmentsOpen(false)} title="Gerenciar Segmentos" size="md">
         <div className="p-6 space-y-8">
            <div className="bg-zinc-50 dark:bg-zinc-850/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
               <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Criar Novo Segmento</h4>
               <div className="flex gap-3">
                  <input 
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="Ex: VIPs, Inativos..."
                    value={newSegment.name}
                    onChange={e => setNewSegment({...newSegment, name: e.target.value})}
                  />
                  <input 
                    type="color" 
                    className="w-12 h-10 p-0 border-none bg-transparent cursor-pointer rounded-lg overflow-hidden"
                    value={newSegment.color}
                    onChange={e => setNewSegment({...newSegment, color: e.target.value})}
                  />
                  <button 
                    onClick={handleCreateSegment}
                    disabled={isCreatingSegment || !newSegment.name}
                    className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {isCreatingSegment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
                  </button>
               </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Segmentos Existentes</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {segments.map(seg => (
                    <div key={seg.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-sm group">
                       <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{seg.name}</p>
                            <p className="text-[10px] text-zinc-400">{seg._count?.contacts || 0} usuários</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => handleDeleteSegment(seg.id)}
                         className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
               <button onClick={() => setSegmentsOpen(false)} className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm">Fechar</button>
            </div>
         </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão" size="sm">
        <div className="p-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja excluir <span className="font-bold text-zinc-900 dark:text-zinc-100">"{deleteTarget?.name}"</span>? 
            Esta ação é irreversível e removerá todos os dados deste contato.
          </p>
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
             <button onClick={() => setDeleteTarget(null)} className="px-5 py-2 text-xs font-bold text-zinc-500">Cancelar</button>
             <button onClick={handleDelete} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-200">Excluir Usuário</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
