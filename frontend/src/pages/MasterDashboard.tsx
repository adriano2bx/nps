import React, { useState, useEffect } from 'react';
import { Building2, MessageSquare, Zap, Users, ArrowUpRight, ArrowDownRight, Globe, ShieldCheck, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface TenantStats {
  id: string;
  name: string;
  slug: string;
  plan: string;
  _count: {
    users: number;
    contacts: number;
    campaigns: number;
    channels: number;
    activeCampaigns: number;
    inactiveCampaigns: number;
  };
}

export default function MasterDashboard() {
  const [tenants, setTenants] = useState<TenantStats[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
  const token = localStorage.getItem('nps_token');

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiBase}/api/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Failed to fetch master stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalCompanies = tenants.length;
  const totalActiveWorkflows = tenants.reduce((acc, t) => acc + (t._count?.activeCampaigns || 0), 0);
  const totalChannels = tenants.reduce((acc, t) => acc + (t._count?.channels || 0), 0);
  const enterpriseCount = tenants.filter(t => t.plan === 'ENTERPRISE').length;

  const stats = [
    { label: 'Empresas Ativas', value: totalCompanies, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Workflows Rodando', value: totalActiveWorkflows, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Canais Conectados', value: totalChannels, icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Clientes Enterprise', value: enterpriseCount, icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Dashboard Master</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Visão panorâmica de toda a infraestrutura da plataforma.</p>
      </div>

      {/* Grid de Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-surface-card shadow-sm relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-surface-card overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-400" /> Saúde por Empresa
              </h3>
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full font-bold text-zinc-500">REALTIME</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-surface-subtle/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Empresa / Plano</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Workflows</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Canais</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Usuários</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono tracking-tighter uppercase">{t.plan} • {t.slug}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center justify-center gap-3">
                            <div className="text-center">
                               <span className="block text-sm font-bold text-emerald-500">{t._count.activeCampaigns}</span>
                               <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-tighter">Ativos</span>
                            </div>
                            <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800"></div>
                            <div className="text-center">
                               <span className="block text-sm font-bold text-zinc-400">{t._count.inactiveCampaigns}</span>
                               <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-tighter">Inativos</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t._count.channels}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t._count.users}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                           <span className="text-[10px] font-bold uppercase text-emerald-500/80 tracking-tighter">Saudável</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Recent Events or Logs */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 dark:bg-white p-6 shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="text-white dark:text-zinc-900 font-bold mb-4 flex items-center gap-2">
                   <Activity className="w-4 h-4 opacity-50" /> Saúde Sistêmica
                </h3>
                <div className="space-y-4">
                   <div className="p-3 bg-white/10 dark:bg-zinc-100 rounded-xl space-y-1">
                      <div className="flex justify-between text-[10px] text-white/50 dark:text-zinc-500 font-bold uppercase">
                         <span>API Latency</span>
                         <span>Excellent</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 dark:bg-zinc-200 rounded-full overflow-hidden">
                         <div className="h-full w-[95%] bg-emerald-500"></div>
                      </div>
                   </div>
                   <div className="p-3 bg-white/10 dark:bg-zinc-100 rounded-xl space-y-1">
                      <div className="flex justify-between text-[10px] text-white/50 dark:text-zinc-500 font-bold uppercase">
                         <span>WhatsApp Workers</span>
                         <span>Stable</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 dark:bg-zinc-200 rounded-full overflow-hidden">
                         <div className="h-full w-[100%] bg-blue-500"></div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="absolute -bottom-4 -right-4 opacity-10">
                <Zap className="w-40 h-40 text-white dark:text-zinc-900" />
             </div>
          </div>

          <div className="p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center gap-3">
             <div className="p-3 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400">
                <Users className="w-6 h-6" />
             </div>
             <p className="text-xs font-medium text-zinc-500 max-w-[180px]">
                Novos recursos de auditoria e logs globais em breve.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
