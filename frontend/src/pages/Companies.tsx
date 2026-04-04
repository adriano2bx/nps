import React, { useState, useEffect } from 'react';
import { Plus, Building2, Edit2, Trash2, ShieldCheck, Zap } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  _count?: {
    users: number;
    contacts: number;
    campaigns: number;
  };
}

export default function Companies() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'FREE',
    adminEmail: '',
    adminPassword: ''
  });

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
  const token = localStorage.getItem('nps_token');

  const fetchTenants = async () => {
    try {
      const response = await fetch(`${apiBase}/api/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        alert(`Falha ao buscar empresas: ${errorData.error || response.statusText}`);
      }
    } catch (error: any) {
      console.error('Failed to fetch tenants:', error);
      alert(`Erro de conexão ao buscar empresas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingTenant ? 'PUT' : 'POST';
    const url = editingTenant ? `${apiBase}/api/tenants/${editingTenant.id}` : `${apiBase}/api/tenants`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingTenant(null);
        setFormData({ name: '', slug: '', plan: 'FREE', adminEmail: '', adminPassword: '' });
        fetchTenants();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido no servidor' }));
        alert(`Falha ao salvar empresa: ${errorData.error || 'Erro inesperado'}`);
      }
    } catch (error: any) {
      console.error('Failed to save tenant:', error);
      alert(`Erro de conexão: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os dados vinculados serão removidos.')) return;

    try {
      const response = await fetch(`${apiBase}/api/tenants/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchTenants();
      }
    } catch (error) {
      console.error('Failed to delete tenant:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Gestão de Empresas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Gerencie todos os clientes e instâncias da plataforma.</p>
        </div>
        <button 
          onClick={() => { setEditingTenant(null); setFormData({ name: '', slug: '', plan: 'FREE', adminEmail: '', adminPassword: '' }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nova Empresa
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-surface-card shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total de Clientes</span>
          </div>
          <p className="text-2xl font-bold">{tenants.length}</p>
        </div>
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-surface-card shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Plano Enterprise</span>
          </div>
          <p className="text-2xl font-bold">{tenants.filter(t => t.plan === 'ENTERPRISE').length}</p>
        </div>
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-surface-card shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Planos Ativos</span>
          </div>
          <p className="text-2xl font-bold">{tenants.filter(t => t.plan !== 'FREE').length}</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-surface-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-surface-subtle/40">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Empresa</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Slug / ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Plano</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Métricas</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Criada em</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">Carregando instâncias...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">Nenhuma empresa cadastrada.</td></tr>
              ) : tenants.map((tenant) => (
                <tr key={tenant.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{tenant.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{tenant.slug}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                      tenant.plan === 'ENTERPRISE' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' :
                      tenant.plan === 'PRO' ? 'bg-brand-500/10 text-brand-600' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
                    }`}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-400">
                      <div className="text-center">
                         <span className="block font-bold text-zinc-700 dark:text-zinc-300">{tenant._count?.users || 0}</span>
                         <span className="uppercase tracking-tighter opacity-70 font-mono">users</span>
                      </div>
                      <div className="text-center">
                         <span className="block font-bold text-zinc-700 dark:text-zinc-300">{tenant._count?.campaigns || 0}</span>
                         <span className="uppercase tracking-tighter opacity-70 font-mono">surveys</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-zinc-500">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { 
                          setEditingTenant(tenant); 
                          setFormData({ 
                            name: tenant.name, 
                            slug: tenant.slug, 
                            plan: tenant.plan,
                            adminEmail: '',
                            adminPassword: ''
                          }); 
                          setIsModalOpen(true); 
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(tenant.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 dark:bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0d0d0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <h3 className="text-lg font-bold mb-4">{editingTenant ? 'Editar Empresa' : 'Nova Empresa'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nome da Empresa</label>
                <input 
                  autoFocus
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Clínica Saúde Total"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Slug (Subdomínio)</label>
                <input 
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors font-mono"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="clinica-saude"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Plano</label>
                <select 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors appearance-none cursor-pointer"
                  value={formData.plan}
                  onChange={e => setFormData({ ...formData, plan: e.target.value })}
                >
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              {!editingTenant && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div className="pb-2">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Acesso do Administrador</h4>
                    <p className="text-[11px] text-zinc-500">Credenciais para o primeiro acesso da empresa.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">E-mail</label>
                    <input 
                      required
                      type="email"
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                      value={formData.adminEmail}
                      onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="admin@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Senha Inicial</label>
                    <input 
                      required
                      type="password"
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                      value={formData.adminPassword}
                      onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg"
                >
                  {editingTenant ? 'Salvar Alterações' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
