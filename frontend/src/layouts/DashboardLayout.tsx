import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Search, Hexagon, BarChart3, Building2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
    { icon: MessageSquare, label: 'Pesquisas', path: '/surveys' },
    { icon: BarChart3, label: 'Respostas', path: '/reports' },
    { icon: Activity, label: 'Integrações', path: '/integrations' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  const adminItems = [
    { icon: Activity, label: 'Dashboard Master', path: '/master-dashboard' },
    { icon: Building2, label: 'Empresas', path: '/companies' },
  ];

  // Mobile nav filter
  const mobileNavItems = navItems.filter(item => 
    ['Visão Geral', 'Pesquisas', 'Respostas', 'Configurações'].includes(item.label)
  );

  return (
    <div className="min-h-screen flex bg-[#fafafa] dark:bg-surface-dark text-zinc-900 dark:text-zinc-100 transition-colors duration-500 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
      {/* Sidebar - Sharp, Enterprise */}
      <aside className="w-[240px] border-r border-zinc-200 dark:border-surface-border bg-white dark:bg-surface-subtle flex-col hidden md:flex transition-colors duration-300 sticky top-0 h-screen overflow-y-auto shrink-0 z-30">
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
                          ? 'bg-zinc-200/50 dark:bg-surface-card text-zinc-900 dark:text-white font-medium ring-1 ring-zinc-200/50 dark:ring-surface-border'
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
                          ? 'bg-zinc-200/50 dark:bg-surface-card text-zinc-900 dark:text-white font-medium ring-1 ring-zinc-200/50 dark:ring-surface-border'
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
             <div className="w-7 h-7 rounded bg-zinc-900 dark:bg-surface-card flex items-center justify-center text-[10px] font-medium text-white shadow-sm border border-zinc-700 dark:border-surface-border group-hover:border-brand-500/50 transition-colors">
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
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-surface-border bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-30 transition-colors duration-300">
          <div className="flex items-center text-sm font-medium">
             <span className="text-zinc-600 dark:text-zinc-400 hidden sm:inline">HealthNPS</span>
             <span className="text-zinc-300 dark:text-zinc-700 mx-2 hidden sm:inline">/</span>
             <span className="text-zinc-900 dark:text-zinc-100">
               {user?.role === 'MASTER_ADMIN' ? 'Administração' : 'Plataforma'}
             </span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden p-4 md:p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-[1200px] mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-200 dark:border-surface-border flex items-center justify-around px-4 z-40 md:hidden pb-safe">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-all duration-200 ${
                isActive 
                  ? 'text-zinc-900 dark:text-white scale-110' 
                  : 'text-zinc-500 dark:text-zinc-500'
              }`
            }
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              location.pathname === item.path 
                ? 'bg-zinc-100 dark:bg-zinc-800' 
                : ''
            }`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
