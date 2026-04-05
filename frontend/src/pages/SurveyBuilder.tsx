import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import Modal from '../components/Modal';
import {
  ChevronRight, ChevronLeft, Plus, Trash2, GripVertical,
  CheckCircle2, MessageSquareText, Hash, Clock, Send,
  Smartphone, Eye, LayoutTemplate, Zap, Radio, QrCode, Copy, Check,
  Smile, RotateCcw, MoreHorizontal, List as ListIcon, MousePointerClick, Download,
  Image as ImageIcon, UploadCloud, ShieldCheck, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type QuestionType = 'nps' | 'open' | 'choice' | 'list';
type PlanLevel = 'STARTER' | 'PRO' | 'ENTERPRISE';
export interface QuestionAction {
  type: 'next' | 'jump' | 'optout' | 'webhook';
  targetQuestionId?: string | number | 'FINISH';
  topicId?: string;
  webhookUrl?: string;
}

export interface SurveyOption {
  label: string;
  action?: QuestionAction;
}

interface Question {
  id: number;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: (string | SurveyOption)[]; // Support both legacy and new format
  fixed?: boolean; // consent question
}

interface GeneralState {
  type: string;
  triggerType: string;
  mediaPath: string;
  name: string;
  channel: string;
  channelId: string;
  topicId: string;
  clinicName: string;
  phone: string;
  header: string;
  footer: string;
  openingBody: string;
  buttonYes: string;
  buttonNo: string;
  closingMessage: string;
  isHsm: string;
  templateName: string;
  ctaLabel: string;
  ctaLink: string;
  supportName: string;
  supportPhone: string;
}

interface WhatsAppChannel {
  id: string;
  name: string;
  provider: string;
  status: string;
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepBar({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors border ${done ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent' : active ? 'bg-white dark:bg-surface-subtle text-zinc-900 dark:text-white border-zinc-900 dark:border-white' : 'bg-zinc-100 dark:bg-surface-subtle text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-surface-border'}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'}`}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div className={`h-px w-16 sm:w-24 mb-4 mx-2 ${i < current ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Emoji Input Wrapper ──────────────────────────────────────────────────────
function EmojiInput({ 
  value, 
  onChange, 
  children, 
  className = "",
  buttonClassName = "top-2"
}: { 
  value: string; 
  onChange: (val: string) => void; 
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, upward: false });
  const triggerRef = useRef<HTMLDivElement>(null);
  const isDark = document.documentElement.classList.contains('dark');

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pickerHeight = 350;
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < pickerHeight && rect.top > pickerHeight;
      
      setPickerPos({
        top: upward ? rect.top - pickerHeight - 8 : rect.bottom + 8,
        left: Math.max(10, Math.min(window.innerWidth - 290, rect.right - 280)),
        upward
      });
    }
  };

  const togglePicker = () => {
    if (!showPicker) updatePosition();
    setShowPicker(!showPicker);
  };

  useEffect(() => {
    if (showPicker) {
      const handleScroll = (e: Event) => {
        // If the scroll happened inside the picker, don't close it
        const pickerElement = document.getElementById('emoji-picker-container');
        if (pickerElement && pickerElement.contains(e.target as Node)) {
          return;
        }
        setShowPicker(false);
      };

      const handleResize = () => setShowPicker(false);

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showPicker]);

  const onEmojiClick = (emojiData: { emoji: string }) => {
    onChange(value + emojiData.emoji);
    setShowPicker(false);
  };

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      {children}
      <div className={`absolute right-2 z-10 flex gap-1 ${buttonClassName}`}>
        <button
          type="button"
          onClick={togglePicker}
          className={`p-1.5 rounded-md transition-all ${
            showPicker 
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md' 
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
          title="Inserir Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {showPicker && createPortal(
        <>
          {/* Backdrop for clicking outside */}
          <div 
            className="fixed inset-0 z-[9998] bg-transparent" 
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(false);
            }} 
          />
          <div 
            id="emoji-picker-container"
            className="fixed z-[9999] shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in duration-200"
            style={{ 
              top: pickerPos.top, 
              left: pickerPos.left,
              transformOrigin: pickerPos.upward ? 'bottom right' : 'top right'
            }}
          >
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                autoFocusSearch={false}
                theme={isDark ? Theme.DARK : Theme.LIGHT}
                width={280}
                height={350}
                skinTonesDisabled
                searchPlaceHolder="Buscar emoji..."
                previewConfig={{ showPreview: false }}
                searchDisabled={false}
              />
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}


// ─── Upgrade Modal ────────────────────────────────────────────────────────────
function UpgradeModal({ isOpen, onClose, requiredPlan }: { isOpen: boolean; onClose: () => void; requiredPlan: string }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d0d0f] w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🚀</span>
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Recurso de Elite!</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">
            Para desbloquear o módulo <span className="font-bold text-brand-600 dark:text-brand-400">{requiredPlan}</span> e outras ferramentas avançadas, você precisa realizar o upgrade da sua conta.
          </p>
          <div className="space-y-3">
             <button className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform active:scale-95 shadow-lg">
                Falar com Consultor (Upgrade)
             </button>
             <button onClick={onClose} className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                Agora não, obrigado.
             </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── WaPreviewPhone ── phone frame for Step 1 ─────────────────────────────────
function WaPreviewPhone({ header, footer, clinicName, body, buttonYes, buttonNo, type, mediaPath, isBaileys }: {
  header: string; footer: string; clinicName: string;
  body: string; buttonYes: string; buttonNo: string;
  type?: string; mediaPath?: string; isBaileys?: boolean;
}) {
  const [clock] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [replied, setReplied] = useState<string | null>(null);
  const defaultBody = "Olá! Você foi convidado para uma pesquisa rápida de satisfação. 😊";
  const displayBody = body.trim() || defaultBody;
  const displayYes = buttonYes.trim() || '✅ Sim, aceito';
  const displayNo  = buttonNo.trim()  || '❌ Não, obrigado';
  return (
    <div className="flex flex-col items-center">
      <div className="relative bg-zinc-900 dark:bg-black rounded-[2.5rem] shadow-2xl border-4 border-zinc-800 dark:border-zinc-700" style={{ width: 300, height: 620 }}>
        <div className="absolute -left-[6px] top-20 w-1.5 h-8 bg-zinc-700 rounded-l-sm" />
        <div className="absolute -left-[6px] top-32 w-1.5 h-12 bg-zinc-700 rounded-l-sm" />
        <div className="absolute -left-[6px] top-48 w-1.5 h-12 bg-zinc-700 rounded-l-sm" />
        <div className="absolute -right-[6px] top-28 w-1.5 h-16 bg-zinc-700 rounded-r-sm" />
        <div className="absolute inset-[3px] rounded-[2.2rem] overflow-hidden bg-black flex flex-col">
          <div className="bg-[#075e54] dark:bg-[#111b21] px-4 pt-2 pb-1 flex items-center justify-between shrink-0">
            <span className="text-white text-[11px] font-semibold">{clock}</span>
            <div className="flex items-center gap-1">
              <svg width="15" height="11" viewBox="0 0 15 11" fill="white" className="opacity-90"><rect x="0" y="7" width="2.5" height="4" rx="0.5"/><rect x="3.5" y="5" width="2.5" height="6" rx="0.5"/><rect x="7" y="3" width="2.5" height="8" rx="0.5"/><rect x="10.5" y="1" width="2.5" height="10" rx="0.5"/></svg>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="white" className="opacity-90"><path d="M7 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/><path d="M3.5 5.8A5 5 0 0110.5 5.8" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/><path d="M1 3A8 8 0 0113 3" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>
              <div className="flex items-center gap-0.5"><div className="w-6 h-3 rounded-[3px] border border-white/80 p-[2px] flex"><div className="w-[75%] bg-white rounded-[1px]" /></div><div className="w-[2px] h-1.5 bg-white/60 rounded-r-sm" /></div>
            </div>
          </div>
          <div className="bg-[#075e54] dark:bg-[#1f2c34] px-3 py-2 flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#128c7e] flex items-center justify-center text-white text-xs font-bold border-2 border-white/20">
              { (clinicName?.charAt(0) || 'P').toUpperCase() }
            </div>
            <div>
              <p className="text-white text-[12px] font-semibold leading-none">{ clinicName || 'Pesquisa de Satisfação' }</p>
              <p className="text-[#b2dfdb] text-[10px] mt-0.5">online agora</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#e5ddd5] dark:bg-[#0b1218] p-2.5 space-y-2"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23b2967d' fill-opacity='0.06'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/g%3E%3C/svg%3E")` }}>
            <div className="flex justify-start">
              <div className="max-w-[88%] flex flex-col gap-px">
                <div className="bg-white dark:bg-[#1f2c34] rounded-lg rounded-bl-none shadow-md ring-1 ring-zinc-100 dark:ring-transparent overflow-hidden">
                  {!mediaPath && header && (
                    <div className="px-2.5 pt-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-700/50">
                      <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{header}</p>
                    </div>
                  )}
                  {(type === 'marketing' || !type || type === 'survey') && mediaPath && (
                    <div className="w-full max-h-48 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                      <img 
                        src={mediaPath} 
                        alt="Header" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="px-2.5 py-2">
                    <p className="text-[12px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{displayBody}</p>
                  </div>
                  {footer && (
                    <div className="px-2.5 pb-1.5 border-t border-zinc-200 dark:border-zinc-700/50">
                      <p className="text-[9px] text-zinc-400 italic">{footer}</p>
                    </div>
                  )}
                  <div className="flex justify-end px-2.5 pb-1">
                    <span className="text-[9px] text-zinc-400">{clock}</span>
                  </div>
                </div>
                {!replied && type !== 'marketing' && (
                  <div className="flex flex-col gap-px mt-px">
                    <button onClick={() => setReplied(displayYes)} className="w-full bg-white dark:bg-[#1f2c34] py-2 px-2.5 text-[12px] font-semibold text-[#00a884] text-center hover:bg-[#f0faf7] dark:hover:bg-[#00a884]/10 transition-colors border-t border-zinc-200 dark:border-zinc-700/40">{displayYes}</button>
                    <button onClick={() => setReplied(displayNo)}  className="w-full bg-white dark:bg-[#1f2c34] py-2 px-2.5 text-[12px] font-semibold text-[#00a884] text-center hover:bg-[#f0faf7] dark:hover:bg-[#00a884]/10 transition-colors border-t border-zinc-200 dark:border-zinc-700/40">{displayNo}</button>
                  </div>
                )}
              </div>
            </div>
            {replied && (
              <div className="flex justify-end animate-in slide-in-from-right-4 duration-300">
                <div className="max-w-[75%] bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-br-none shadow-sm px-2.5 py-1.5">
                  <p className="text-[12px] text-zinc-800 dark:text-zinc-100">{replied}</p>
                  <span className="block text-right text-[9px] text-[#7fbf7f] mt-0.5">{clock} ✓✓</span>
                </div>
              </div>
            )}
            {replied && (
              <div className="flex justify-center">
                <button onClick={() => setReplied(null)} className="text-[9px] bg-black/10 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-3 py-1 rounded-full hover:bg-black/20 transition-colors">↺ reiniciar</button>
              </div>
            )}
          </div>
          <div className="bg-[#f0f0f0] dark:bg-[#1f2c34] px-2 py-1.5 flex items-center gap-1.5 shrink-0">
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">Mensagem</div>
            <div className="w-8 h-8 rounded-full bg-[#128c7e] flex items-center justify-center shrink-0"><Send className="w-3.5 h-3.5 text-white" /></div>
          </div>
          <div className="bg-black h-5 flex items-center justify-center shrink-0"><div className="w-20 h-1 bg-white/30 rounded-full" /></div>
        </div>
      </div>
    </div>
  );
}



// ─── Step 1: General Config ──────────────────────────────────────────────────
function Step1({ 
  data, 
  onChange, 
  plan, 
  onUpgrade, 
  channels, 
  topics,
  refreshTopics,
  isBaileys,
  isUploading,
  fileInputRef,
  handleFileUpload,
  onOpenTopicModal
}: { 
  data: GeneralState; 
  onChange: (k: string, v: string) => void; 
  plan: PlanLevel;
  onUpgrade: (feature: string) => void;
  channels: WhatsAppChannel[];
  topics: any[];
  refreshTopics: () => Promise<void>;
  isBaileys: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onOpenTopicModal: () => void;
}) {
  const inputCls = "w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-surface-border rounded-lg py-2.5 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 focus:border-zinc-400 dark:focus:border-zinc-600 transition-all cursor-pointer appearance-none";
  const labelCls = "block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5";

  return (
    <div>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className={labelCls}>Nome da Campanha *</label>
            <input className={inputCls} placeholder="Ex: Satisfação Pós-Atendimento" value={data.name} onChange={e => onChange('name', e.target.value)} />
          </div>
          <div className="col-span-1 relative">
            <label className={labelCls}>Categoria *</label>
            <div className="relative">
              <select 
                className={inputCls} 
                value={data.topicId || ''} 
                onChange={async e => {
                  const val = e.target.value;
                  if (val === 'CREATE_NEW') {
                    onOpenTopicModal();
                    onChange('topicId', ''); // Reset to placeholder while modal is open
                  } else {
                    onChange('topicId', val);
                  }
                }}
              >
                <option value="" className="bg-white dark:bg-zinc-900">Selecione uma Categoria...</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-zinc-900">{t.name}</option>
                ))}
                <option value="CREATE_NEW" className="bg-white dark:bg-zinc-900 font-bold text-emerald-600">+ Criar Nova Categoria</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
              </div>
            </div>
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Plano Atual</label>
            <div className="flex items-center gap-2 h-10 px-3 border border-zinc-100 dark:border-surface-border/60 rounded-md bg-zinc-50/30 dark:bg-surface-subtle/40">
               <span className={`w-2 h-2 rounded-full ${plan === 'STARTER' ? 'bg-zinc-400' : plan === 'PRO' ? 'bg-blue-500' : 'bg-purple-500 animate-pulse'}`} />
               <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">{plan}</span>
            </div>
          </div>
          <div className="col-span-2 relative">
            <label className={labelCls}>Canal Designado *</label>
            <div className="relative">
              <select 
                className={inputCls} 
                value={data.channelId} 
                onChange={e => {
                  const channel = channels.find(c => c.id === e.target.value);
                  onChange('channelId', e.target.value);
                  if (channel) onChange('channel', channel.name);
                }}
              >
                <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Selecione um canal...</option>
                {channels.filter(c => c.provider !== 'BAILEYS' || c.id === data.channelId).map(channel => (
                  <option key={channel.id} value={channel.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    {channel.name} {channel.provider === 'BAILEYS' ? '⚡ (Baileys)' : `(${channel.provider})`}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* Tipo da mensagem inicial */}
        {/* Tipo da Campanha */}
        <div>
          <label className={labelCls}>Tipo de Campanha</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              onClick={() => {
                onChange('type', 'survey');
                // Se voltar pra survey, o padrão costuma ser interativo (isHsm false)
              }}
              className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                data.type === 'survey' || !data.type
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ListIcon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Pesquisa & NPS</span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-relaxed">Fluxo conversacional estruturado. Permite adicionar perguntas interativas.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                if (plan === 'STARTER') return onUpgrade('Marketing & Promoções');
                onChange('type', 'marketing');
                onChange('isHsm', 'true'); // Marketing SEMPRE exige HSM (template oficial)
              }}
              className={`relative flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                data.type === 'marketing'
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Marketing / Informativo</span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-relaxed">Disparo massivo de promoções e alertas via HSM (Apoia Imagem/Vídeo).</p>
            </button>
          </div>
        </div>

        {/* Como a conversa começa? (Trigger Type) */}
        <div>
          <label className={labelCls}>Como a Campanha é Acionada?</label>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <button
              type="button"
              onClick={() => onChange('triggerType', 'active')}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                data.triggerType === 'active' || !data.triggerType
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Disparo Ativo</span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-tight">Empresa envia.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('triggerType', 'qrcode');
                onChange('isHsm', 'false'); // Se o cliente escaneia, a conversa é sempre interativa.
              }}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                data.triggerType === 'qrcode'
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">QR Code</span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-tight">Usuário inicia.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                if (plan === 'STARTER') return onUpgrade('Disparo em Lote (CSV)');
                onChange('triggerType', 'bulk');
                onChange('isHsm', 'true'); // Lote geralmente é HSM fora da janela.
              }}
              className={`relative flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                data.triggerType === 'bulk'
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <UploadCloud className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Em Lote</span>
                {plan === 'STARTER' && (
                  <span className="absolute top-1 right-1 px-1 py-0 bg-blue-500 text-white rounded-[2px] text-[7px] font-bold uppercase">PRO</span>
                )}
              </div>
              <p className="text-[9px] text-zinc-500 leading-tight">Planilha CSV.</p>
            </button>
          </div>
        </div>

        {/* Configurações Adicionais (Somente para Pesquisas — Oculto para Baileys) */}
        {data.type === 'survey' && data.triggerType !== 'qrcode' && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/20">
            <label className={labelCls}>Tipo de Envio do WhatsApp</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => onChange('isHsm', 'false')}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                  data.isHsm === 'false' || !data.isHsm
                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Interativa (24h)</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Ideal para quando o usuário acabou de interagir com a clínica.</p>
              </button>
              <button
                type="button"
                onClick={() => onChange('isHsm', 'true')}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                  data.isHsm === 'true'
                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Template HSM</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Obrigatório para iniciar conversas após 24h do último contato.</p>
              </button>
            </div>
            {data.isHsm === 'true' && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className={labelCls}>Nome do Template Oficial (Meta)</label>
                <input 
                  className={inputCls} 
                  placeholder="Ex: nps_pesquisa_v1" 
                  value={data.templateName} 
                  onChange={e => onChange('templateName', e.target.value)} 
                />
                <p className="text-[11px] text-zinc-500 mt-1 italic">Este nome deve corresponder exatamente ao template aprovado no Business Manager.</p>
              </div>
            )}
          </div>
        )}

        {/* Baileys text-only mode info */}
        {isBaileys && (
          <div className="border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-500/5">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">Modo Texto Simples (Baileys)</h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400/70 mt-1 leading-relaxed">
                  Canais Baileys enviam apenas texto puro. Botões interativos, listas, templates HSM e mídias não são suportados. Todas as interações serão baseadas em respostas de texto do usuário.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Media Upload (Meta Only) */}
        {(
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/20">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                  Anexar Mídia Oficial (HSM)
                </h4>
             </div>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                accept="image/*"
                onChange={handleFileUpload}
              />
              <div 
                className={`border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center bg-white dark:bg-zinc-900 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer relative overflow-hidden ${plan !== 'ENTERPRISE' ? 'opacity-60 grayscale' : ''}`}
                onClick={() => {
                  if (plan !== 'ENTERPRISE') return onUpgrade('Marketing Multimídia');
                  fileInputRef.current?.click();
                }}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center py-4 animate-pulse">
                     <span className="text-zinc-400 mb-2 italic">Enviando mídia...</span>
                     <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-[loading_1s_infinite]"></div>
                     </div>
                  </div>
                ) : data.mediaPath ? (
                  <div className="group relative">
                     <img src={data.mediaPath} alt="Preview" className="max-h-48 rounded-lg mx-auto shadow-sm" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <span className="text-white text-xs font-semibold">Alterar Mídia</span>
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-3">
                      <span className="text-zinc-400">📷</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:white mb-1">Upload de Imagem ou Vídeo</h3>
                    <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">Arraste a mídia ou clique. Essa imagem integrará seu Template Oficial da Meta e passará pela aprovação antes do disparo livre.</p>
                  </>
                )}
              </div>
          </div>
        )}


        <div>
          <label className={labelCls}>Corpo da Mensagem Inicial</label>
          <EmojiInput value={data.openingBody} onChange={val => onChange('openingBody', val)} buttonClassName="bottom-2">
            <textarea
              rows={4}
              className={`${inputCls} resize-none`}
              placeholder={`Olá! Gostaríamos de saber sobre sua experiência conosco. Sua opinião é muito importante para nós. 😊

Você aceita participar de uma pesquisa rápida de satisfação?`}
              value={data.openingBody}
              onChange={e => onChange('openingBody', e.target.value)}
            />
          </EmojiInput>
          <p className="text-[11px] text-zinc-500 mt-1">Texto completo exibido no balão.</p>
        </div>

        {/* Botões de Aceite — Ocultos para Baileys (texto puro) */}
        {(
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`${labelCls} mb-0`}>Botão de Aceite (SIM)</label>
                <span className={`text-[10px] font-mono ${(data.buttonYes || '').length >= 20 ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
                  {(data.buttonYes || '').length}/20
                </span>
              </div>
              <EmojiInput value={data.buttonYes} onChange={val => onChange('buttonYes', val)}>
                <input 
                  maxLength={20}
                  className={inputCls} 
                  placeholder="Ex: Sim, participar" 
                  value={data.buttonYes} 
                  onChange={e => onChange('buttonYes', e.target.value)} 
                />
              </EmojiInput>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`${labelCls} mb-0`}>Botão de Recusa (NÃO)</label>
                <span className={`text-[10px] font-mono ${(data.buttonNo || '').length >= 20 ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
                  {(data.buttonNo || '').length}/20
                </span>
              </div>
              <EmojiInput value={data.buttonNo} onChange={val => onChange('buttonNo', val)}>
                <input 
                  maxLength={20}
                  className={inputCls} 
                  placeholder="Ex: Não, agora não" 
                  value={data.buttonNo} 
                  onChange={e => onChange('buttonNo', e.target.value)} 
                />
              </EmojiInput>
            </div>
            <p className="col-span-2 text-[10px] text-zinc-400 -mt-2 italic">
              Limite de 20 caracteres por botão (regra da API Meta).
            </p>
          </div>
        )}

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/20">
          <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ações Pós-Encerramento (Enterprise)
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Call to Action (Botão com Link)</label>
                <input className={inputCls} placeholder="Texto do Botão (Ex: Abrir Site)" value={data.ctaLabel} onChange={e => onChange('ctaLabel', e.target.value)} />
             </div>
             <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>URL do Destino</label>
                <input className={inputCls} placeholder="https://google.com/review" value={data.ctaLink} onChange={e => onChange('ctaLink', e.target.value)} />
             </div>
             
             <div className="col-span-2 h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
             
             <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Sugestão de Contato Humano</label>
                <input className={inputCls} placeholder="Nome (Ex: Suporte VIP)" value={data.supportName} onChange={e => onChange('supportName', e.target.value)} />
             </div>
             <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Telefone (VCard)</label>
                <input className={inputCls} placeholder="5511999999999" value={data.supportPhone} onChange={e => onChange('supportPhone', e.target.value)} />
             </div>
          </div>
          <p className="text-[10px] text-zinc-500 italic">Disponível para canais Meta. O CTA permite enviar um botão que abre um site. O VCard envia o contato para ser salvo.</p>
        </div>

        <div>
          <label className={labelCls}>Mensagem de Encerramento</label>
          <textarea
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="Obrigado pelo seu feedback! Ele nos ajuda a melhorar continuamente nosso atendimento."
            value={data.closingMessage}
            onChange={e => onChange('closingMessage', e.target.value)}
          />
        </div>
      </div>

    </div>
  );
}

// ─── Step 2 constants ─────────────────────────────────────────────────────
const qTypeLabels: Record<QuestionType, { label: string; icon: any; hint: string }> = {
  nps:    { label: 'Nota NPS (0-10)', icon: Hash, hint: 'Gera a pontuação NPS principal (0-10).' },
  open:   { label: 'Texto Puro', icon: MessageSquareText, hint: 'Campo de texto livre.' },
  choice: { label: 'Botões', icon: MousePointerClick, hint: 'Até 3 botões rápidos.' },
  list:   { label: 'Lista / Menu', icon: ListIcon, hint: 'Gaveta com opções selecionáveis.' },
};

const CONSENT_QUESTION: Question = {
  id: 0, type: 'open',
  text: 'Você aceita participar de uma breve pesquisa de satisfação? Responda SIM para continuar ou NÃO para recusar.',
  required: true, fixed: true,
};

// ─── Survey Simulator ─────────────────────────────────────────────────────
function SurveySimulator({
  questions, clinicName, header, footer, activeStep, setActiveStep, closingMessage, isBaileys
}: {
  questions: Question[];
  clinicName: string;
  header: string;
  footer: string;
  activeStep: number;
  setActiveStep: (i: number) => void;
  closingMessage: string;
  isBaileys?: boolean;
}) {
  const [showList, setShowList] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'bot' | 'user'; text: string; header?: string; footer?: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

  const currentQ = questions[activeStep];
  const isFinished = activeStep >= questions.length;

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeStep]);

  const handleSelect = (val: string | SurveyOption) => {
    const label = typeof val === 'string' ? val : val.label;
    const action = typeof val === 'string' ? undefined : val.action;

    setShowList(false);
    setHoveredOption(null);
    const botText = currentQ.text || (
      currentQ.type === 'nps' ? 'De 0 a 10, o quanto você nos recomendaria?' :
      currentQ.type === 'open' ? 'Deixe seu comentário:' : 'Selecione uma opção:'
    );
    const hHeader = activeStep === 0 ? (header || `🏥 ${clinicName || 'Sua Clínica'}`) : undefined;
    const hFooter = activeStep === 0 ? footer : undefined;
    
    setChatHistory(h => [
      ...h, 
      { role: 'bot', text: botText, header: hHeader, footer: hFooter },
      { role: 'user', text: label }
    ]);

    setTimeout(() => {
      if (action) {
        if (action.type === 'jump' && action.targetQuestionId) {
          if (action.targetQuestionId === 'FINISH') {
            setActiveStep(questions.length);
          } else {
            const targetIdx = questions.findIndex(q => String(q.id) === String(action.targetQuestionId));
            if (targetIdx !== -1) {
              setActiveStep(targetIdx);
            } else {
              setActiveStep(activeStep + 1);
            }
          }
          return;
        }
        if (action.type === 'optout') {
          setActiveStep(questions.length);
          return;
        }
      }

      if (activeStep < questions.length - 1) setActiveStep(activeStep + 1);
      else setActiveStep(questions.length);
    }, 380);
  };

  const handleReset = () => { setChatHistory([]); setShowList(false); setHoveredOption(null); setActiveStep(0); };

  return (
    /* ── Outer phone frame ── */
    <div className="flex flex-col items-center">
      <div
        className="relative bg-zinc-900 dark:bg-black rounded-[2.5rem] shadow-2xl border-4 border-zinc-800 dark:border-zinc-700"
        style={{ width: 300, height: 620 }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[6px] top-20 w-1.5 h-8 bg-zinc-700 dark:bg-zinc-600 rounded-l-sm" />
        <div className="absolute -left-[6px] top-32 w-1.5 h-12 bg-zinc-700 dark:bg-zinc-600 rounded-l-sm" />
        <div className="absolute -left-[6px] top-48 w-1.5 h-12 bg-zinc-700 dark:bg-zinc-600 rounded-l-sm" />
        <div className="absolute -right-[6px] top-28 w-1.5 h-16 bg-zinc-700 dark:bg-zinc-600 rounded-r-sm" />

        {/* Inner screen */}
        <div className="absolute inset-[3px] rounded-[2.2rem] overflow-hidden bg-black flex flex-col" style={{position:'absolute'}}>

          {/* Status bar */}
          <div className="bg-[#075e54] dark:bg-[#111b21] px-4 pt-2 pb-1 flex items-center justify-between shrink-0">
            <span className="text-white text-[11px] font-semibold">{clock}</span>
            <div className="flex items-center gap-1">
              {/* Signal */}
              <svg width="15" height="11" viewBox="0 0 15 11" fill="white" className="opacity-90">
                <rect x="0" y="7" width="2.5" height="4" rx="0.5"/><rect x="3.5" y="5" width="2.5" height="6" rx="0.5"/><rect x="7" y="3" width="2.5" height="8" rx="0.5"/><rect x="10.5" y="1" width="2.5" height="10" rx="0.5"/>
              </svg>
              {/* WiFi */}
              <svg width="14" height="11" viewBox="0 0 14 11" fill="white" className="opacity-90">
                <path d="M7 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/><path d="M3.5 5.8A5 5 0 0110.5 5.8" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/><path d="M1 3A8 8 0 0113 3" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
              </svg>
              {/* Battery */}
              <div className="flex items-center gap-0.5">
                <div className="w-6 h-3 rounded-[3px] border border-white/80 p-[2px] flex">
                  <div className="w-[75%] bg-white rounded-[1px]" />
                </div>
                <div className="w-[2px] h-1.5 bg-white/60 rounded-r-sm" />
              </div>
            </div>
          </div>

          {/* WhatsApp top bar */}
          <div className="bg-[#075e54] dark:bg-[#1f2c34] px-3 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#128c7e] flex items-center justify-center text-white text-xs font-bold shrink-0 border-2 border-white/20">
                {(clinicName || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-[12px] font-semibold leading-none">{clinicName || 'Sua Clínica'}</p>
                <p className="text-[#b2dfdb] text-[10px] mt-0.5">online agora</p>
              </div>
            </div>
            <button onClick={handleReset} title="Reiniciar" className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat area — wraps both messages and the drawer overlay */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
          <div
            className="flex-1 overflow-y-auto bg-[#e5ddd5] dark:bg-[#0b1218] p-2.5 space-y-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23b2967d' fill-opacity='0.06'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/g%3E%3C/svg%3E")`
            }}
          >
            {/* History */}
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg shadow-sm text-[12px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-zinc-800 dark:text-zinc-100 rounded-br-none px-2.5 py-1.5'
                    : 'bg-white dark:bg-[#1f2c34] text-zinc-800 dark:text-zinc-100 rounded-bl-none overflow-hidden'
                }`}>
                  {msg.role === 'bot' ? (
                    <div className="flex flex-col gap-px">
                      {msg.header && (
                        <div className="px-2.5 pt-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{msg.header}</p>
                        </div>
                      )}
                      <div className="px-2.5 py-2">
                        <p className="text-[12px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      {msg.footer && (
                        <div className="px-2.5 pb-1.5 border-t border-zinc-200 dark:border-zinc-700/50">
                          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 italic">{msg.footer}</p>
                        </div>
                      )}
                      <div className="flex justify-end px-2.5 pb-1">
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500">{clock}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {msg.text}
                      <span className={`block text-right text-[9px] mt-0.5 text-[#7fbf7f]`}>
                        {clock} ✓✓
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Current question */}
            {currentQ && !isFinished && (
              <div className="flex justify-start" key={`q-${activeStep}`}>
                <div className="max-w-[88%] flex flex-col gap-px">
                  <div className="bg-white dark:bg-[#1f2c34] rounded-lg rounded-bl-none shadow-md ring-1 ring-zinc-100 dark:ring-transparent overflow-hidden">
                    {(header || clinicName) && (
                      <div className="px-2.5 pt-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-700/50">
                        <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                          {header || `🏥 ${clinicName}`}
                        </p>
                      </div>
                    )}
                    <div className="px-2.5 py-2">
                      <p className="text-[12px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {currentQ.text || (
                          currentQ.type === 'nps' ? 'De 0 a 10, o quanto você nos recomendaria?' :
                          currentQ.type === 'open' ? 'Deixe seu comentário:' : 'Selecione uma opção:'
                        )}
                      </p>
                    </div>
                    {footer && (
                      <div className="px-2.5 pb-1.5 border-t border-zinc-200 dark:border-zinc-700/50">
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 italic">{footer}</p>
                      </div>
                    )}
                    <div className="flex justify-end px-2.5 pb-1">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500">{clock}</span>
                    </div>
                  </div>

                  {/* Inline buttons 1-3 */}
                  {currentQ.type === 'choice' && (
                    <div className="flex flex-col gap-px mt-px">
                      {(currentQ.options ?? []).map((o, i) => {
                        const opt = typeof o === 'string' ? o : o.label;
                        return (
                          <button key={i}
                            onClick={() => handleSelect(o || `Opção ${i + 1}`)}
                            className="w-full bg-white dark:bg-[#1f2c34] py-2 px-2.5 text-[12px] font-semibold text-[#00a884] text-center hover:bg-[#f0faf7] dark:hover:bg-[#00a884]/10 transition-colors border-t border-zinc-200 dark:border-zinc-700/40"
                          >
                            {opt || `Opção ${i+1}`}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* List button 4+ */}
                  {currentQ.type === 'list' && (
                    <button onClick={() => setShowList(true)}
                      className="mt-px w-full bg-white dark:bg-[#1f2c34] py-2 px-2.5 text-[12px] font-semibold text-[#00a884] flex items-center justify-center gap-1.5 hover:bg-[#f0faf7] dark:hover:bg-[#00a884]/10 transition-colors border-t border-zinc-200 dark:border-zinc-700/40"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" /> Ver Opções
                    </button>
                  )}


                </div>
              </div>
            )}

            {isFinished && (
              <div className="flex justify-start animate-in slide-in-from-left-4 duration-300">
                <div className="max-w-[80%] bg-white dark:bg-[#1f2c34] text-zinc-800 dark:text-zinc-100 rounded-lg rounded-bl-none shadow-sm px-2.5 py-1.5 text-[12px] leading-relaxed">
                  <p className="whitespace-pre-wrap">{closingMessage || 'Obrigado por participar!'}</p>
                  <span className="block text-right text-[9px] mt-0.5 text-zinc-400 dark:text-zinc-500">{clock}</span>
                </div>
              </div>
            )}

            {isFinished && (
              <div className="flex flex-col items-center gap-1.5 py-4">
                <span className="text-[10px] bg-black/15 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 px-3 py-1 rounded-full">
                  ✅ Pesquisa concluída
                </span>
                <button 
                  onClick={() => {
                    setChatHistory([]);
                    setActiveStep(0);
                  }}
                  className="text-[10px] bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reiniciar simulação
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* List drawer — overlays full screen including input bar, like real WhatsApp */}
          {showList && currentQ && (
            <div className="absolute inset-0 bg-black/60 z-30 flex flex-col justify-end animate-in fade-in duration-150">
              <div className="bg-white dark:bg-[#233138] rounded-t-2xl animate-in slide-in-from-bottom-4 duration-250 max-h-[80%] flex flex-col">
                {/* Drawer handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-4 pb-2.5 pt-1 border-b border-zinc-100 dark:border-zinc-700 shrink-0">
                  <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">Selecione uma opção</p>
                  <button onClick={() => setShowList(false)} className="text-[12px] text-[#00a884] font-bold">FECHAR</button>
                </div>
                <div className="overflow-y-auto">
                  {(currentQ.options ?? []).map((o, i) => {
                    const opt = typeof o === 'string' ? o : o.label;
                    return (
                      <button
                        key={i}
                        onMouseEnter={() => setHoveredOption(i)}
                        onMouseLeave={() => setHoveredOption(null)}
                        onClick={() => handleSelect(o || `Opção ${i + 1}`)}
                        className="w-full text-left px-4 py-3.5 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-700/60 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          hoveredOption === i ? 'border-[#00a884]' : 'border-zinc-400 dark:border-zinc-500'
                        }`}>
                          <span className={`w-2.5 h-2.5 rounded-full transition-all ${
                            hoveredOption === i ? 'bg-[#00a884] scale-100' : 'bg-transparent scale-0'
                          }`} />
                        </span>
                        <span className="text-[13px] text-zinc-700 dark:text-zinc-200 leading-snug">
                          {opt || `Opção ${i + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </div>

          {/* WhatsApp input bar — form real em vez de apenas div */}
          <form
            className={`bg-[#f0f0f0] dark:bg-[#1f2c34] px-2 py-1.5 flex items-center gap-1.5 shrink-0`}
            onSubmit={(e) => {
              e.preventDefault();
              const canType = currentQ?.type === 'nps' || currentQ?.type === 'open';
              if (isFinished || !inputText.trim() || !canType) return;
              
              if (currentQ?.type === 'nps') {
                const val = parseInt(inputText.trim(), 10);
                if (isNaN(val) || val < 0 || val > 10) {
                  setChatHistory(h => [
                    ...h, 
                    { role: 'user', text: inputText }, 
                    { role: 'bot', text: "Apenas números de 0 a 10 são aceitos. Tente novamente!" }
                  ]);
                  setInputText('');
                  return;
                }
              }
              
              handleSelect(inputText.trim());
              setInputText('');
            }}
          >
            {(() => {
              const canType = currentQ?.type === 'nps' || currentQ?.type === 'open';
              return (
                <>
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    disabled={isFinished || !canType}
                    className={`flex-1 bg-white dark:bg-[#2a3942] rounded-full px-3 py-1.5 text-[12px] leading-none transition-colors border-none focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-800 dark:text-zinc-100 disabled:opacity-50 ${
                      canType && !isFinished ? '' : 'cursor-not-allowed'
                    }`}
                    placeholder={
                      isFinished ? 'Mensagem' :
                      currentQ?.type === 'nps' ? 'Digite sua nota (0-10)...' :
                      false ? 'Digite sua resposta...' :
                      currentQ?.type === 'open' ? 'Digite sua mensagem...' :
                      'Mensagem'
                    }
                  />
                  <button
                    type="submit"
                    disabled={isFinished || !inputText.trim() || !canType}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      canType && !isFinished && inputText.trim()
                        ? 'bg-[#128c7e] cursor-pointer hover:bg-[#0a7a6a]'
                        : 'bg-[#128c7e]'
                    }`}
                  >
                    <Send className={`w-3.5 h-3.5 ${inputText.trim() ? 'text-white' : 'text-white/50'}`} />
                  </button>
                </>
              );
            })()}
          </form>

          {/* Home indicator */}
          <div className="bg-black h-5 flex items-center justify-center shrink-0">
            <div className="w-20 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Question Builder ─────────────────────────────────────────────────
function ActionConfigModal({ 
  action, 
  questions, 
  currentQuestionId,
  onSave 
}: { 
  action?: QuestionAction; 
  questions: Question[]; 
  currentQuestionId: number;
  onSave: (action: QuestionAction | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localAction, setLocalAction] = useState<QuestionAction | undefined>(action);

  useEffect(() => {
    if (isOpen) setLocalAction(action);
  }, [isOpen, action]);

  const handleSave = () => {
    onSave(localAction);
    setIsOpen(false);
  };

  const labelCls = "block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5";
  const inputCls = "w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md py-1.5 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 transition-colors";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-1.5 rounded-md transition-all ${
          action && action.type !== 'next'
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'text-zinc-300 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
        title="Configurar Ação"
      >
        <Zap className={`w-3.5 h-3.5 ${action && action.type !== 'next' ? 'fill-current' : ''}`} />
      </button>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Configurar Ação da Resposta"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Ação ao Selecionar</label>
            <select 
              className={inputCls}
              value={localAction?.type || 'next'}
              onChange={(e) => setLocalAction({ ...localAction, type: e.target.value as any })}
            >
              <option value="next">Apenas coletar (Próxima pergunta)</option>
              <option value="jump">Ir para pergunta específica (Desvio)</option>
              <option value="optout">Bloquear contato (Opt-out)</option>
              <option value="webhook">Acionar Integração (Webhook)</option>
            </select>
          </div>

          {localAction?.type === 'jump' && (
            <div>
              <label className={labelCls}>Pular para...</label>
              <select 
                className={inputCls}
                value={localAction?.targetQuestionId || ''}
                onChange={(e) => setLocalAction({ ...localAction, targetQuestionId: e.target.value })}
              >
                <option value="">Selecione o destino...</option>
                {questions
                  .filter(q => q.id !== currentQuestionId)
                  .map((q, i) => (
                    <option key={q.id} value={q.id}>
                      P{questions.findIndex(x => x.id === q.id) + 1}: {q.text.substring(0, 30)}...
                    </option>
                  ))
                }
                <option value="FINISH" className="font-bold text-emerald-600">🏁 Finalizar Pesquisa (Agradecimento)</option>
              </select>
            </div>
          )}

          {localAction?.type === 'webhook' && (
            <div>
              <label className={labelCls}>URL do Webhook (POST)</label>
              <input 
                className={inputCls}
                placeholder="https://sua-api.com/callback"
                value={localAction?.webhookUrl || ''}
                onChange={(e) => setLocalAction({ ...localAction, webhookUrl: e.target.value })}
              />
              <p className="text-[10px] text-zinc-500 mt-1">Enviaremos os dados da resposta para esta URL.</p>
            </div>
          )}

          {localAction?.type === 'optout' && (
            <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 p-3 rounded-lg">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                Esta opção bloqueará o contato para que não receba mais campanhas deste tipo (Tópico) automaticamente.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              onClick={() => { setLocalAction(undefined); onSave(undefined); setIsOpen(false); }}
              className="px-4 py-2 text-[10px] font-bold text-zinc-400 hover:text-rose-500 uppercase tracking-widest transition-all"
            >
              Remover Ação
            </button>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-bold shadow-xl shadow-zinc-200/50 dark:shadow-none active:scale-95 transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Step2({
  questions, setQuestions, clinicName, header, footer, simStep, setSimStep, isBaileys
}: {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
  clinicName: string;
  header: string;
  footer: string;
  simStep: number;
  setSimStep: (n: number) => void;
  isBaileys?: boolean;
}) {


  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === idx) return;
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(idx, 0, removed);
    setQuestions(newQuestions);
    setDraggedIndex(idx);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const buttonTemplates = [
    { id: 'choice', type: 'choice', label: 'Botões', icon: MousePointerClick, defaultOptions: ['Sim', 'Não'], defaultText: 'Você gostou do atendimento?' },
    { id: 'list_notes', type: 'list', label: 'Lista c/ Notas', icon: Hash, defaultOptions: ['0','1','2','3','4','5','6','7','8','9','10'], defaultText: 'De 0 a 10, o quanto você recomendaria nossa clínica?' },
    { id: 'list_text', type: 'list', label: 'Lista c/ Textos', icon: ListIcon, defaultOptions: ['Péssimo','Ruim','Bom','Excelente'], defaultText: 'Como você avalia nossa clínica de forma geral?' },
    { id: 'open', type: 'open', label: 'Texto Puro', icon: MessageSquareText, defaultText: 'Por favor, deixe seu comentário livre.' }
  ];

  const addQuestionTemplate = (tmpl: any) => {
    const newQ: Question = {
      id: Date.now(), type: tmpl.type as QuestionType, text: tmpl.defaultText, required: true,
      options: tmpl.defaultOptions ? [...tmpl.defaultOptions] : undefined
    };
    setQuestions([...questions, newQ]);
  };
  const update = (id: number, key: keyof Question, value: any) =>
    setQuestions(questions.map(q => q.id === id ? { ...q, [key]: value } : q));
  const remove = (id: number) => setQuestions(questions.filter(q => q.id !== id));

  const addOption = (q: Question) =>
    update(q.id, 'options', [...(q.options ?? []), { label: `Opção ${(q.options?.length ?? 0) + 1}` }]);
  const removeOption = (q: Question, idx: number) =>
    update(q.id, 'options', (q.options ?? []).filter((_, i) => i !== idx));
  const updateOption = (q: Question, idx: number, val: string) =>
    update(q.id, 'options', (q.options ?? []).map((o, i) => {
      if (i === idx) {
        if (typeof o === 'string') return { label: val };
        return { ...o, label: val };
      }
      return o;
    }));
  const updateOptionAction = (q: Question, idx: number, action: QuestionAction | undefined) =>
    update(q.id, 'options', (q.options ?? []).map((o, i) => {
      if (i === idx) {
        const label = typeof o === 'string' ? o : o.label;
        return { label, action };
      }
      return o;
    }));

  const inputCls = "w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md py-2 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors";
  const labelCls = "block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5";

  return (
    <div>
      <div className="space-y-4">
        {questions.length === 0 && (
          <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4">
              <MessageSquareText className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhuma pergunta adicionada</p>
            <p className="text-xs text-zinc-500 mt-1">A mensagem de consentimento (SIM/NÃO) já está configurada no Passo 1.</p>
          </div>
        )}

        {questions.map((q, idx) => {
          const meta = qTypeLabels[q.type];
          const optCount = q.options?.length ?? 0;
          return (
            <div
              key={q.id}
              draggable
              onDragStart={(e) => {
                // Allows firefox to drag
                if (e.dataTransfer) {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
                }
                handleDragStart(idx);
              }}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0d0d0f] rounded-xl p-5 shadow-sm group transition-opacity ${
                draggedIndex === idx ? 'opacity-50 scale-[0.98]' : 'opacity-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-2 pt-0.5">
                  <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-500">P{idx + 1}</div>
                  <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-700 cursor-grab active:cursor-grabbing" />
                </div>

                <div className="flex-1 space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-tight">
                      <meta.icon className="w-3 h-3" />{meta.label}
                    </span>
                    <button onClick={() => remove(q.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Question text */}
                  <div>
                    <label className={labelCls}>Pergunta</label>
                    <input
                      className={inputCls}
                      placeholder={q.type === 'nps' ? 'De 0 a 10, o quanto você nos recomendaria?' : q.type === 'open' ? 'O que podemos melhorar?' : 'Como avalia o atendimento?'}
                      value={q.text}
                      onChange={e => update(q.id, 'text', e.target.value)}
                    />
                  </div>

                  {/* Options editor — only for 'choice' and 'list' */}
                  {(q.type === 'choice' || q.type === 'list') && (
                    <div className="pl-3 border-l-2 border-zinc-100 dark:border-zinc-800 space-y-2">
                      <label className={labelCls}>
                        Opções de Resposta
                        <span className="ml-2 font-normal normal-case tracking-normal text-zinc-400">
                          {q.type === 'choice' ? '(botões — até 3)' : '(lista / gaveta — até 10)'}
                        </span>
                      </label>

                      {(q.options ?? []).map((o, oIdx) => {
                        const opt = typeof o === 'string' ? o : o.label;
                        const action = typeof o === 'string' ? undefined : o.action;
                        return (
                          <div key={oIdx} className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <EmojiInput
                                value={opt}
                                onChange={val => updateOption(q, oIdx, val)}
                                className="flex-1"
                              >
                                <input
                                  maxLength={q.type === 'choice' ? 20 : 24}
                                  className={`${inputCls} py-1.5 text-xs pr-14`}
                                  value={opt}
                                  onChange={e => updateOption(q, oIdx, e.target.value)}
                                  placeholder={`Opção ${oIdx + 1}`}
                                />
                              </EmojiInput>
                              <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                <span className={`text-[9px] font-mono pointer-events-none mt-0.5 ${
                                    opt.length >= (q.type === 'choice' ? 20 : 24) ? 'text-red-500 font-bold' : 'text-zinc-400'
                                  }`}>
                                    {opt.length}/{q.type === 'choice' ? 20 : 24}
                                </span>
                                <ActionConfigModal 
                                  action={action} 
                                  questions={questions} 
                                  currentQuestionId={q.id}
                                  onSave={(act) => updateOptionAction(q, oIdx, act)}
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeOption(q, oIdx)}
                              disabled={optCount <= 1}
                              className="p-1.5 text-zinc-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}

                      <button
                        onClick={() => addOption(q)}
                        disabled={(q.type === 'choice' && optCount >= 3) || (q.type === 'list' && optCount >= 10)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-[#00a884] uppercase tracking-wider hover:opacity-75 disabled:opacity-30 transition-opacity"
                      >
                        <Plus className="w-3 h-3" /> Adicionar Opção
                      </button>

                      <p className="text-[10px] text-zinc-400 italic">
                        {q.type === 'choice' ? '✨ Máximo de 3 opções (limite de botões do WhatsApp).' : '📝 Máximo de 10 opções na lista.'}
                      </p>
                    </div>
                  )}

                  {/* Footer row */}
                  <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <span className="text-[10px] text-zinc-400 italic">{meta.hint}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add buttons bar */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {buttonTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => { addQuestionTemplate(tmpl); setSimStep(Math.max(0, questions.length)); }}
              className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-[#0d0d0f] border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group"
            >
              <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                <tmpl.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] whitespace-nowrap font-bold uppercase tracking-tight text-zinc-500">
                + {tmpl.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Step 3: Trigger & Dispatch ──────────────────────────────────────────────
function Step3({ data, onChange, type, plan, onUpgrade, triggerType }: { 
  data: any; 
  onChange: (k: string, v: string) => void; 
  type: string;
  plan: PlanLevel;
  onUpgrade: (feature: string) => void;
  triggerType: string;
}) {
  const inputCls = "w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-surface-border rounded-lg py-2.5 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 focus:border-zinc-400 dark:focus:border-zinc-600 transition-all cursor-pointer appearance-none";
  const labelCls = "block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5";
  const [copied, setCopied] = useState(false);

  const isQr = triggerType === 'qrcode';
  const isBulk = triggerType === 'bulk';
  const isActive = triggerType === 'active';
  const isMkt = type === 'marketing';
  const waNumber = data.waNumber?.replace(/\D/g, '') || '5511900000000';
  const keyword = data.keyword || 'PESQUISA';
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(keyword)}`;
  const hasValidQRData = !!data.waNumber && !!data.keyword;

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${keyword || 'pesquisa'}.png`;
      a.click();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(waLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Configuration based on triggers finalized in Step 1 */}
      <div>
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
           Configurações de {isActive ? 'Disparo Automático' : isBulk ? 'Envio em Lote' : 'Ponto de Captura (QR Code)'}
        </h4>
      </div>

      {/* Active & Bulk Dispatch Options */}
      {(isActive || isBulk) && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Atraso antes do envio</label>
              <select className={inputCls} value={data.delay} onChange={e => onChange('delay', e.target.value)}>
                <option value="0">Imediato</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
                <option value="1440">24 horas</option>
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">Tempo após o atendimento.</p>
            </div>
            <div>
              <label className={labelCls}>Timeout de resposta</label>
              <select className={inputCls} value={data.timeout} onChange={e => onChange('timeout', e.target.value)}>
                <option value="1440">24 horas</option>
                <option value="2880">48 horas</option>
                <option value="10080">7 dias</option>
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">Encerra sessão sem resposta.</p>
            </div>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Janela de envio permitida
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Horário início</label>
                <input type="time" className={inputCls} value={data.windowStart || '08:00'} onChange={e => onChange('windowStart', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Horário fim</label>
                <input type="time" className={inputCls} value={data.windowEnd || '20:00'} onChange={e => onChange('windowEnd', e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">Mensagens fora deste horário serão enfileiradas para o próximo dia útil.</p>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Reenvio único após 24h</span>
                <p className="text-[11px] text-zinc-500 mt-0.5">Reenvia uma vez se o usuário não responder à pergunta de consentimento.</p>
              </div>
              <div className="relative ml-4 shrink-0">
                <input type="checkbox" className="sr-only peer" defaultChecked onChange={e => onChange('resend', e.target.checked ? '1' : '0')} />
                <div className="w-10 h-5 bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-zinc-900 dark:peer-checked:bg-white rounded-full transition-colors cursor-pointer"></div>
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-zinc-900 peer-checked:translate-x-5 rounded-full shadow transition-transform pointer-events-none"></div>
              </div>
            </label>
          </div>

          {/* Upload CSV (If Bulk) */}
          {isBulk && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20">
              <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                Importar Planilha (.CSV / .XLSX)
              </h4>
              <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-6 bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-zinc-400">
                <UploadCloud className="w-6 h-6 text-zinc-400 mb-2" />
                <span className="text-xs font-medium text-zinc-900 dark:text-white">Selecione o arquivo da sua máquina</span>
                <span className="text-[10px] text-zinc-500 mt-1">Colunas recomendadas: Telefone, Nome</span>
              </div>
            </div>
          )}

          {/* Scheduled Dispatch (If Marketing) */}
          {isMkt && (
            <div className={`border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/20 relative group`}>
              <div className="flex items-center justify-between">
                 <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Agendar Disparo Futuro
                 </h4>
              </div>
              <div>
                <input 
                  type="datetime-local" 
                  className={`${inputCls}`}
                  value={data.scheduledAt || ''} 
                  onChange={e => onChange('scheduledAt', e.target.value)} 
                />
                <p className="text-[11px] text-zinc-500 mt-2">Deixe em branco para disparar imediatamente assim que for engatilhado. Caso contrário, o servidor segurará as mensagens até a data UTC exata informada.</p>
              </div>
            </div>
          )}

        </>
      )}

      {/* QR Code Mode */}
      {isQr && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Número WhatsApp da Clínica *</label>
              <input
                className={inputCls}
                placeholder="55 11 90000-0000 (com código do país)"
                value={data.waNumber || ''}
                onChange={e => onChange('waNumber', e.target.value)}
              />
              <p className="text-[11px] text-zinc-500 mt-1">Número que receberá a mensagem do usuário.</p>
            </div>
            <div>
              <label className={labelCls}>Palavra-chave de ativação *</label>
              <input
                className={`${inputCls} font-mono uppercase`}
                placeholder="Ex: PESQUISA"
                value={data.keyword || ''}
                onChange={e => onChange('keyword', e.target.value.toUpperCase())}
              />
              <p className="text-[11px] text-zinc-500 mt-1">Enviada automaticamente quando o usuário escanear.</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Timeout de sessão</label>
            <div className="relative max-w-[200px]">
              <select className={inputCls} value={data.timeout} onChange={e => onChange('timeout', e.target.value)}>
                <option value="1440" className="bg-white dark:bg-zinc-900">24 horas</option>
                <option value="2880" className="bg-white dark:bg-zinc-900">48 horas</option>
                <option value="10080" className="bg-white dark:bg-zinc-900">7 dias</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Encerra a sessão sem resposta do usuário.</p>
          </div>

          {/* QR Code Preview */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <QrCode className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Pré-visualização do QR Code</span>
            </div>
            <div className="p-6 flex flex-col items-center gap-5 bg-white dark:bg-[#0a0a0a]">
              {hasValidQRData ? (
                <>
                  <div className="p-4 bg-white rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative group overflow-hidden">
                    <QRCodeCanvas
                      id="qr-canvas"
                      value={waLink}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#18181b"
                      level="M"
                    />
                    <div className="absolute inset-0 bg-white/90 dark:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <button onClick={downloadQRCode} className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl px-4 py-2 font-medium text-xs rounded-full flex items-center gap-1.5 hover:scale-105 transition-transform active:scale-95">
                        <Download className="w-3.5 h-3.5" /> Baixar PNG
                      </button>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Escaneie para iniciar a pesquisa</p>
                    <p className="text-[11px] text-zinc-500">Abre o WhatsApp e envia a palavra-chave automaticamente</p>
                  </div>
                  <div className="w-full flex items-center gap-2">
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 font-mono text-[11px] text-zinc-600 dark:text-400 truncate">
                      {waLink}
                    </div>
                    <button
                      onClick={copyLink}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                        copied
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-10 flex flex-col items-center gap-3 w-full">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-[#111] flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                    <QrCode className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <p className="text-[11px] text-center text-zinc-500 dark:text-zinc-500 max-w-[200px] leading-relaxed">
                    Preencha o <strong>Número</strong> e a <strong>Palavra-chave</strong> acima para gerar a URL nativa do QR Code.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SurveyBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const tenantPlan = 'ENTERPRISE';
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { token, user } = useAuth();
  const { refreshCampaigns, topics, refreshTopics } = useData();
  const [channels, setChannels] = useState<WhatsAppChannel[]>([]);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
        const response = await fetch(`${apiBase}/api/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setChannels(data);
        }
      } catch (err) {
        console.error('Failed to fetch channels:', err);
      }
    };
    if (token) {
      fetchChannels();
      refreshTopics(); // Ensure topics are loaded
    }
  }, [token, refreshTopics]);

  // Sandbox State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [general, setGeneral] = useState<GeneralState>({
    type: 'survey',
    triggerType: 'active',
    mediaPath: '',
    name: '',
    channel: '',
    channelId: '',
    topicId: '',
    clinicName: '',
    phone: '',
    header: '',
    footer: 'Responda SAIR para não receber mais mensagens.',
    openingBody: '',
    buttonYes: '✅ Sim, aceito',
    buttonNo: '❌ Não, obrigado',
    closingMessage: '',
    isHsm: 'false',
    templateName: '',
    ctaLabel: '',
    ctaLink: '',
    supportName: '',
    supportPhone: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<Question[]>([
    { id: 1, type: 'nps', text: 'De 0 a 10, o quanto você recomendaria nossa clínica para um amigo ou familiar?', required: true }
  ]);
  const [dispatch, setDispatch] = useState({
    delay: '60', timeout: '1440',
    windowStart: '08:00', windowEnd: '20:00', resend: '1',
    waNumber: '', keyword: ''
  });

  const updateGeneral = (k: string, v: string) => setGeneral(p => ({ ...p, [k]: v }));
  const updateDispatch = (k: string, v: string) => setDispatch(p => ({ ...p, [k]: v }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/campaigns/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Falha no upload');
      const data = await response.json();
      updateGeneral('mediaPath', data.url);
    } catch (err: any) {
      alert('Erro ao carregar imagem: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const canNext = () => {
    if (step === 0) {
      return !!general.name && !!general.channelId && !!general.topicId;
    }
    if (step === 1) return questions.length > 0 && questions.every(q => q.text.trim());
    return true;
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      
      const payload = {
        name: general.name,
        type: general.type,
        channelId: general.channelId || null, 
        topicId: general.topicId || null,
        clinicName: general.clinicName,
        phone: general.phone,
        header: general.header,
        footer: general.footer,
        openingBody: general.openingBody,
        buttonYes: general.buttonYes,
        buttonNo: general.buttonNo,
        closingMessage: general.closingMessage,
        isHsm: general.isHsm === 'true',
        triggerType: general.triggerType,
        templateName: general.templateName,
        ctaLabel: general.ctaLabel,
        ctaLink: general.ctaLink,
        supportName: general.supportName,
        supportPhone: general.supportPhone,
        ...dispatch, // include keyword, waNumber, delay, timeout, etc.
        questions: questions.map(q => ({
          id: q.id,
          type: q.type,
          text: q.text,
          required: q.required,
          options: q.options || []
        }))
      };

      const response = await fetch(`${apiBase}/api/campaigns`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao salvar campanha');
      }

      alert('✅ Campanha criada com sucesso!');
      await refreshCampaigns();
      navigate('/surveys');
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Mode Logic
  const { id } = useParams();
  useEffect(() => {
    if (id) {
      const fetchCampaign = async () => {
        try {
          const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
          const res = await fetch(`${apiBase}/api/campaigns/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const campaign = await res.json();
          
          setGeneral({
            name: campaign.name,
            type: campaign.type.toLowerCase(),
            triggerType: campaign.triggerType,
            channelId: campaign.whatsappChannelId || '',
            topicId: campaign.topicId || '',
            clinicName: campaign.clinicName || '',
            phone: campaign.phone || '',
            header: campaign.header || '',
            footer: campaign.footer || '',
            openingBody: campaign.openingBody || '',
            buttonYes: campaign.buttonYes || '✅ Sim, aceito',
            buttonNo: campaign.buttonNo || '❌ Não, obrigado',
            closingMessage: campaign.closingMessage || '',
            isHsm: String(campaign.isHsm),
            templateName: campaign.templateName || '',
            ctaLabel: campaign.ctaLabel || '',
            ctaLink: campaign.ctaLink || '',
            supportName: campaign.supportName || '',
            supportPhone: campaign.supportPhone || '',
            channel: channels.find(c => c.id === campaign.whatsappChannelId)?.name || campaign.whatsappChannelId || '',
            mediaPath: campaign.mediaPath || ''
          });

          setDispatch({
            delay: String(campaign.delay || 60),
            timeout: String(campaign.timeout || 1440),
            windowStart: campaign.windowStart || '08:00',
            windowEnd: campaign.windowEnd || '20:00',
            resend: String(campaign.resend || 1),
            waNumber: campaign.waNumber || '',
            keyword: campaign.keyword || ''
          });

          if (campaign.questions) {
            setQuestions(campaign.questions.map((q: any) => ({
              id: q.id,
              type: q.type,
              text: q.text,
              required: q.required,
              options: q.options ? JSON.parse(q.options) : []
            })));
          }
        } catch (err) {
          console.error('Error loading campaign:', err);
        }
      };
      fetchCampaign();
    }
  }, [id, token, channels]);

  // Sincroniza o nome do canal quando a lista de canais carrega após a campanha
  useEffect(() => {
    if (id && channels.length > 0 && general.channelId && !general.channel) {
      const found = channels.find(c => c.id === general.channelId);
      if (found) {
        setGeneral(prev => ({ ...prev, channel: found.name }));
      }
    }
  }, [channels, general.channelId, id]);

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) return;
    setIsCreatingTopic(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/topics`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newTopicName.trim() })
      });
      if (res.ok) {
        const newTopic = await res.json();
        await refreshTopics();
        setGeneral(prev => ({ ...prev, topicId: newTopic.id }));
        setIsTopicModalOpen(false);
        setNewTopicName('');
      } else {
        const err = await res.json();
        alert('Erro ao criar categoria: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Failed to create topic', err);
      alert('Erro de conexão ao criar categoria.');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...general,
          topicId: general.topicId || null,
          ...dispatch,
          questions: questions.map(q => ({
            id: q.id,
            type: q.type,
            text: q.text,
            required: q.required,
            options: q.options || []
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to update');
      await refreshCampaigns();
      navigate('/surveys');
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Simulator state — lifted here so it persists across steps 0 & 1
  const [simStep, setSimStep] = useState(0);

  const isMkt = general.type === 'marketing';
  const currentLabels = isMkt 
    ? ['Configure o Template', 'Audiência & Disparo'] 
    : ['Configuração Geral', 'Quadro de Perguntas', 'Gatilhos & Disparo'];

  const showSim = step === 0 || (step === 1 && !isMkt);
  const selectedChannel = channels.find(c => c.id === general.channelId);
  const isBaileys = false; // Forced to allow list/channels everywhere

  // Derive which UI components to show based on step index and type
  const renderStep = () => {
    if (step === 0) return (
      <Step1 
        data={general} 
        onChange={updateGeneral} 
        plan={tenantPlan} 
        onUpgrade={(f) => { setUpgradeFeature(f); setIsUpgradeOpen(true); }} 
        channels={channels} 
        topics={topics}
        refreshTopics={refreshTopics}
        isBaileys={isBaileys}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        onOpenTopicModal={() => setIsTopicModalOpen(true)}
      />
    );
    if (step === 1) {
      if (isMkt) return <Step3 data={dispatch} onChange={updateDispatch} type={general.type} plan={tenantPlan} onUpgrade={(f) => { setUpgradeFeature(f); setIsUpgradeOpen(true); }} triggerType={general.triggerType} />;
      return <Step2 questions={questions} setQuestions={setQuestions} clinicName={general.clinicName} header={general.header} footer={general.footer} simStep={simStep} setSimStep={setSimStep} isBaileys={isBaileys} />;
    }
    if (step === 2 && !isMkt) return <Step3 data={dispatch} onChange={updateDispatch} type={general.type} plan={tenantPlan} onUpgrade={(f) => { setUpgradeFeature(f); setIsUpgradeOpen(true); }} triggerType={general.triggerType} />;
    return null;
  };

  return (
    <>
    <div className="flex gap-0 min-h-screen">
      {/* ── Left scrollable area ── */}
      <div className={`flex-1 min-w-0 space-y-6 transition-all duration-300 ${showSim ? 'pr-[340px]' : ''}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/surveys')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Criar Nova Campanha</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Configure o fluxo da jornada do seu usuário.</p>
          </div>
        </div>

        <StepBar current={step} labels={currentLabels} />

        <div className="max-w-2xl">
          <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-lg bg-white dark:bg-[#0A0A0A] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#080808]">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{currentLabels[step]}</h2>
            </div>
            <div className="p-6">
              {renderStep()}
            </div>
          </div>
        </div>

        <div className="max-w-2xl flex justify-between">
        <button
          onClick={() => step === 0 ? navigate('/surveys') : setStep(s => s - 1)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </button>

        {step < currentLabels.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-black rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40"
          >
            Próximo <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
             <button
              onClick={() => setIsTestModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" /> Enviar Teste
            </button>

            <button
              onClick={id ? handleUpdate : handleFinish}
              disabled={isSaving || (general.triggerType === 'qrcode' && (!dispatch.waNumber || !dispatch.keyword))}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-black rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-95"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isSaving ? 'Salvando...' : (id ? 'Salvar Alterações' : 'Colocar no Ar')}
            </button>
          </div>
        )}
      </div></div>

      {/* Sandbox Test Modal */}
      <Modal 
        isOpen={isTestModalOpen} 
        onClose={() => setIsTestModalOpen(false)} 
        title="Disparo de Teste (Sandbox)"
        description="Veja exatamente como a mensagem chegará no seu celular antes de publicar."
      >
        <div className="space-y-4 py-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-zinc-500">
               <Smartphone className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-widest text-[10px]">Número de Teste</span>
            </div>
            <input 
              type="text" 
              placeholder="55 (DDD) 99999-9999"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-3 px-4 text-sm font-mono focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center shrink-0">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              <strong>Modo Seguro:</strong> Esse disparo não gasta créditos do seu plano e não afeta as estatísticas do painel. A semente de dados `{'{nome}'}` será substituída por "Visitante de Teste".
            </p>
          </div>

          {!general.channelId && (
            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
              <span className="text-amber-600 text-sm">⚠️</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Canal não selecionado:</strong> Volte ao Passo 1 e selecione um canal conectado para habilitar o envio de teste.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-zinc-100 dark:border-zinc-800">
           <button 
             onClick={() => setIsTestModalOpen(false)}
             className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-700"
           >
             Cancelar
           </button>
           <button 
             disabled={!testPhone || isSendingTest || !general.channelId}
             onClick={async () => {
               setIsSendingTest(true);
               try {
                 const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
                 const messageText = (general.openingBody || 'Olá! Gostaríamos de saber sua opinião.')
                   .replace(/\{nome\}/gi, 'Visitante de Teste');
                 const response = await fetch(`${apiBase}/api/baileys/${general.channelId}/test-send`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                   body: JSON.stringify({ phone: testPhone.replace(/\D/g, ''), text: messageText })
                 });
                 const result = await response.json();
                 if (!response.ok) throw new Error(result.error || result.details || 'Falha ao enviar teste');
                 setIsTestModalOpen(false);
                 setTestPhone('');
                 alert('✅ Teste enviado com sucesso! Verifique seu WhatsApp.');
               } catch (err: any) {
                 console.error('[Test Send Error]:', err);
                 alert(`❌ Erro ao enviar teste: ${err.message}`);
               } finally {
                 setIsSendingTest(false);
               }
             }}
             className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
           >
             {isSendingTest ? 'Enviando...' : 'Disparar Agora'}
           </button>
        </div>
      </Modal>

      {/* ── Fixed right panel: phone simulator ── */}
      {showSim && (
        <div className="fixed top-0 right-0 h-screen w-[340px] border-l border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#080808] flex flex-col z-10">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0d0d0d] flex items-center gap-2 shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-zinc-500 dark:border-zinc-400" />
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {step === 0 ? 'Prévia · Mensagem Inicial' : 'Prévia · Fluxo de Pesquisa'}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-y-auto py-6 px-[15px]">
            {step === 0 && (
              <WaPreviewPhone
                header={general.header}
                footer={general.footer}
                clinicName={general.clinicName}
                body={general.openingBody}
                buttonYes={general.buttonYes}
                buttonNo={general.buttonNo}
                type={general.type}
                mediaPath={general.mediaPath}
                isBaileys={isBaileys}
              />
            )}
            {step === 1 && (
              <SurveySimulator
                questions={questions}
                clinicName={general.clinicName}
                header={general.header}
                footer={general.footer}
                activeStep={simStep}
                setActiveStep={setSimStep}
                closingMessage={general.closingMessage}
                isBaileys={isBaileys}
              />
            )}
          </div>
          <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#0d0d0d] shrink-0">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
              {step === 0 ? 'Interaja com os botões para testar' : 'Clique nas opções para simular'}
            </p>
          </div>
        </div>
      )}

      {/* Topic Creation Modal */}
      <Modal 
        isOpen={isTopicModalOpen} 
        onClose={() => setIsTopicModalOpen(false)} 
        title="Criar Nova Categoria"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
              Nome da Categoria
            </label>
            <input 
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
              placeholder="Ex: Promoções, Avisos, NPS..."
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTopic()}
              autoFocus
            />
            <p className="text-[10px] text-zinc-500 mt-2 ml-1 italic">
              Esta categoria será usada para organizar suas campanhas e gerenciar o opt-out dos clientes.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
            <button 
              onClick={() => setIsTopicModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateTopic}
              disabled={isCreatingTopic || !newTopicName.trim()}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-xl font-bold text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isCreatingTopic ? 'Criando...' : 'Criar Categoria'}
            </button>
          </div>
        </div>
      </Modal>

      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} requiredPlan={upgradeFeature} />
    </div>
    </>
  );
}
