import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Search, Hexagon, BarChart3, Building2, Activity } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
    { icon: MessageSquare, label: 'Pesquisas', path: '/surveys' },
    { icon: BarChart3, label: 'Relatórios', path: '/reports' },
    { icon: Users, label: 'Usuários', path: '/patients' },
    { icon: Activity, label: 'Integrações', path: '/integrations' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  const adminItems = [
    { icon: Activity, label: 'Dashboard Master', path: '/master-dashboard' },
    { icon: Building2, label: 'Empresas', path: '/companies' },
  ];

  return (
    <div className="min-h-screen flex bg-white dark:bg-surface-dark text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans selection:bg-brand-500/30">
      {/* Sidebar - Sharp, Enterprise */}
      <aside className="w-[240px] border-r border-zinc-200 dark:border-surface-border bg-white dark:bg-surface-subtle flex-col hidden md:flex transition-colors duration-300 sticky top-0 h-screen overflow-y-auto shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-zinc-200 dark:border-surface-border">
          <div className="w-6 h-6 bg-zinc-900 dark:bg-white flex items-center justify-center rounded-sm mr-2.5">
             <Hexagon className="text-white dark:text-black w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-white">HealthNPS</span>
        </div>
        
        <div className="flex-1 py-5 flex flex-col gap-1">
          {user?.role !== 'MASTER_ADMIN' && (
            <>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-5 mb-2">Plataforma</div>
              <nav className="space-y-0.5 px-3">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-2.5 py-1.5 rounded-md text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-zinc-200/50 dark:bg-surface-card text-zinc-900 dark:text-white font-medium'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-surface-card/40'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </>
          )}

          {user?.role === 'MASTER_ADMIN' && (
            <>
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-5 mt-6 mb-2">Administração</div>
              <nav className="space-y-0.5 px-3">
                {adminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-2.5 py-1.5 rounded-md text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-zinc-200/50 dark:bg-surface-card text-zinc-900 dark:text-white font-medium'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-surface-card/40'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>
        
        <div className="p-3 border-t border-zinc-200 dark:border-surface-border">
          <div 
            onClick={logout}
            className="flex items-center gap-3 px-2 py-1.5 hover:bg-zinc-200/50 dark:hover:bg-surface-card rounded-md cursor-pointer transition-colors group"
          >
             <div className="w-7 h-7 rounded bg-zinc-900 dark:bg-surface-subtle flex items-center justify-center text-[10px] font-medium text-white shadow-sm border border-zinc-700 group-hover:border-brand-500/50 transition-colors">
                {user?.name?.substring(0, 2).toUpperCase() || 'AD'}
             </div>
             <div className="flex flex-col flex-1 truncate">
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">{user?.name || 'Administrador'}</span>
                <span className="text-[10px] text-zinc-500 lg:text-zinc-600 truncate">{user?.tenant?.name || 'Sistema'}</span>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-surface-border bg-white dark:bg-surface-dark sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center text-sm font-medium">
             <span className="text-zinc-600 dark:text-zinc-400">HealthNPS</span>
             <span className="text-zinc-300 dark:text-zinc-700 mx-2">/</span>
             <span className="text-zinc-900 dark:text-zinc-100">
               {user?.role === 'MASTER_ADMIN' ? 'Administração do Sistema' : 'Visão Geral'}
             </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="w-full bg-zinc-50 dark:bg-surface-subtle border border-zinc-200 dark:border-surface-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-surface-ring/20 focus:border-surface-ring transition-all"
              />
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          <div className="max-w-[1200px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
