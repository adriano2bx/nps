import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Lock, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [isHovered, setIsHovered] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha no login');
      }

      const { token, user } = await response.json();
      login(token, user);
      
      if (user.role === 'MASTER_ADMIN') {
        navigate('/master-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row-reverse bg-zinc-50 dark:bg-surface-dark selection:bg-brand-500/30 transition-colors duration-300 relative">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {/* Left Column: Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative z-10 bg-white dark:bg-black transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm mx-auto"
        >
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="text-white dark:text-black w-6 h-6" />
            </div>
            <span className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">HealthNPS</span>
          </div>

          <div className="mb-10">
            <h1 className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight mb-2">Bem-vindo de volta</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              Faça login no painel para testar os fluxos e métricas de satisfação.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">E-mail corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-zinc-50 dark:focus:bg-zinc-900 transition-all duration-200"
                  placeholder="admin@clinica.com.br"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Senha</label>
                <a href="#" className="text-xs text-brand-600 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-white transition-colors">Esqueceu a senha?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-zinc-900 dark:text-white text-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-zinc-50 dark:focus:bg-zinc-900 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-medium text-sm rounded-lg py-2.5 px-4 mt-4 flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar na plataforma'}
              {!loading && (
                <motion.div
                  animate={{ x: isHovered ? 4 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              )}
            </button>
          </form>
          
          <div className="mt-10 border-t border-zinc-200 dark:border-zinc-900 pt-6">
            <p className="text-xs text-zinc-500 dark:text-zinc-600">
              © {new Date().getFullYear()} Plataforma Multi-Tenant. Padrões LGPD B2B.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Abstract/Corporate Graphic (now Left via flex-row-reverse) */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-8 bg-zinc-100 dark:bg-zinc-950 overflow-hidden border-r border-zinc-200 dark:border-zinc-900/50 transition-colors duration-300">
        <div className="absolute inset-0">
          {/* Muted grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-zinc-200/50 dark:from-brand-900/10 dark:via-transparent dark:to-[#111]"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative z-10 w-full max-w-lg"
        >
          {/* Strict Enterprise Dashboard Mockup */}
          <div className="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-black/40 p-1 flex pl-3 items-center mb-[-0.5rem] relative z-0 mx-4 shadow-xl">
             <div className="flex gap-2 opacity-50">
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600"></div>
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600"></div>
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600"></div>
             </div>
          </div>
          <div className="rounded-2xl border border-white/60 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 p-8 backdrop-blur-md shadow-2xl relative z-10">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800/50">
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-zinc-300 dark:bg-zinc-700/50"></div>
                <div className="h-2 w-20 rounded bg-zinc-200 dark:bg-zinc-800"></div>
              </div>
               <div className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-transparent flex items-center justify-center">
                  <div className="h-3 w-3 rounded-sm bg-brand-500/80"></div>
               </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800/30 pb-3">
                 <div className="h-2 w-40 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                 <div className="text-zinc-500 font-mono text-xs">+42.0%</div>
              </div>
              <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800/30 pb-3">
                 <div className="h-2 w-32 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                 <div className="text-zinc-500 font-mono text-xs">-1.2%</div>
              </div>
              <div className="flex justify-between items-end pb-1">
                 <div className="h-2 w-48 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                 <div className="text-zinc-500 font-mono text-xs">+18.4%</div>
              </div>
            </div>
            
            <div className="mt-12 grid grid-cols-2 gap-4">
              <div className="h-28 rounded-lg bg-white/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/50 flex flex-col justify-end p-4 gap-1.5 relative overflow-hidden">
                 <div className="absolute top-4 right-4 text-xs font-mono text-zinc-500 dark:text-zinc-600">Q3</div>
                 <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                 <div className="h-10 w-full rounded bg-brand-100 dark:bg-brand-600/20 flex flex-row items-end gap-1">
                    <div className="h-full w-full bg-brand-300 dark:bg-brand-500/40 rounded-t-sm"></div>
                    <div className="h-[60%] w-full bg-brand-400 dark:bg-brand-500/60 rounded-t-sm"></div>
                    <div className="h-[80%] w-full bg-brand-500 dark:bg-brand-500/80 rounded-t-sm"></div>
                 </div>
              </div>
              
              <div className="h-28 rounded-lg bg-white/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/50 flex items-center justify-center flex-col gap-3 relative">
                 <div className="h-10 w-10 rounded-full border-[3px] border-zinc-200 dark:border-zinc-800 border-t-brand-500"></div>
                 <div className="h-1 w-12 rounded bg-zinc-200 dark:bg-zinc-800"></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
