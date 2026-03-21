import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, Sparkles, Moon, Cloud, ChevronLeft, ArrowRight, Sparkle, Plus, Minus, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ParticleField } from './components/ParticleField';
import { reportTraeDebug } from './utils/telemetry';
import { callDreamAPI } from './services/apiClient';
import { useLocalStorage } from './hooks/useLocalStorage';
import { cn } from './utils/cn';
import { generateNonOverlappingPosition } from './utils/galaxy';
import { MIN_SCALE, MAX_SCALE, SCALE_CHANGE } from './constants';
import type { Step, DreamType, AIResult, HistoryDream } from './types';

const DREAM_TYPES: { id: DreamType; label: string; icon: React.ReactNode; gradient: string }[] = [
  { id: 'sweet', label: '美梦', icon: <Star className="w-5 h-5" />, gradient: 'from-amber-400 to-orange-500' },
  { id: 'nightmare', label: '噩梦', icon: <Moon className="w-5 h-5" />, gradient: 'from-purple-500 to-indigo-600' },
  { id: 'fantasy', label: '奇幻', icon: <Sparkles className="w-5 h-5" />, gradient: 'from-cyan-400 via-blue-500 to-purple-600' },
  { id: 'memory', label: '回忆', icon: <Cloud className="w-5 h-5" />, gradient: 'from-pink-400 to-rose-500' },
];

const RITUAL_PHRASES = [
  "正在连接梦境...",
  "正在回溯记忆...",
  "正在捕捉情绪...",
  "正在编织星光...",
  "凝聚星辰中..."
];

export default function App() {
  const [step, setStep] = useState<Step>('prologue');
  const [dreamText, setDreamText] = useState('');
  const [dreamType, setDreamType] = useState<DreamType>('sweet');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [ritualPhraseIndex, setRitualPhraseIndex] = useState(0);
  const [dreamHistory, setDreamHistory] = useLocalStorage<HistoryDream[]>('dream_galaxy_history', []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestDreamId, setLatestDreamId] = useState<string | null>(null);
  const [galaxyOffset, setGalaxyOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [galaxyScale, setGalaxyScale] = useState(1);
  const [resultSource, setResultSource] = useState<'record' | 'galaxy'>('record');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stepRef = useRef(step);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // 自动播放音乐当声音开启时
  useEffect(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  useEffect(() => {
    //#region debug-point
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    reportTraeDebug({
      ev: 'app_mount',
      href: window.location.href,
      navType: navEntry?.type ?? '',
      navRedirectCount: navEntry?.redirectCount ?? 0
    });

    const onError = (e: ErrorEvent) => {
      reportTraeDebug({
        ev: 'window_error',
        msg: String(e.message || ''),
        filename: String(e.filename || ''),
        lineno: e.lineno ?? 0,
        colno: e.colno ?? 0
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = (e as PromiseRejectionEvent).reason;
      reportTraeDebug({
        ev: 'unhandled_rejection',
        reason: reason instanceof Error ? reason.message : String(reason)
      });
    };
    const onPageHide = () => reportTraeDebug({ ev: 'pagehide', step: stepRef.current });
    const onVisibility = () => reportTraeDebug({ ev: 'visibility', state: document.visibilityState, step: stepRef.current });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    //#endregion debug-point
  }, []);

  useEffect(() => {
    //#region debug-point
    reportTraeDebug({ ev: 'step_change', step, hasResult: !!aiResult, isSubmitting });
    //#endregion debug-point
  }, [step, aiResult, isSubmitting]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!dreamText.trim()) return;
    //#region debug-point
    const submitStart = performance.now();
    reportTraeDebug({ ev: 'submit_start', step, dreamType, dreamTextLen: dreamText.length });
    //#endregion debug-point
    setIsSubmitting(true);
    flushSync(() => {
      setStep('ritual');
      setRitualPhraseIndex(0);
    });

    try {
      const textSnapshot = dreamText;
      const typeSnapshot = dreamType;
      await analyzeDream(textSnapshot, typeSnapshot);
    } catch (error) {
      //#region debug-point
      reportTraeDebug({
        ev: 'submit_error',
        step,
        dreamType,
        dreamTextLen: dreamText.length,
        ms: Math.round(performance.now() - submitStart),
        error: error instanceof Error ? error.message : String(error)
      });
      //#endregion debug-point
    } finally {
      setIsSubmitting(false);
    }
    //#region debug-point
    reportTraeDebug({ ev: 'submit_done', step: 'result', ms: Math.round(performance.now() - submitStart) });
    //#endregion debug-point
    flushSync(() => setStep('result'));
  };

  useEffect(() => {
    if (step === 'ritual') {
      const interval = setInterval(() => {
        setRitualPhraseIndex((prev) => (prev + 1) % RITUAL_PHRASES.length);
      }, 900);
      return () => clearInterval(interval);
    }
  }, [step]);

  const analyzeDream = async (text: string, type: DreamType) => {
    //#region debug-point
    const analyzeStart = performance.now();
    reportTraeDebug({ ev: 'analyze_start', dreamType: type, dreamTextLen: text.length });
    //#endregion debug-point
    const now = new Date();
    const date = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const id = Date.now().toString();

    let aiData = await callDreamAPI(text, type);

    if (!aiData) {
      let color = "#fbbf24";
      let gradient = "from-amber-300 to-orange-500";
      let keyword = "治愈";
      let imagePrompt = "dreamy starry night sky with soft clouds, ethereal, magical";
      
      let title = "梦境记录";
      let summary = text.length > 50 ? text.substring(0, 50) + "..." : text;
      let interpretation = "这是一个值得思考的梦境。你的潜意识正在通过这个梦传递一些重要的信息。";
      let suggestion = "试着记录下这个梦带给你的感受，它可能会在未来给你一些启发。";

      if (type === 'nightmare' || text.includes('害怕') || text.includes('追') || text.includes('黑')) {
        color = "#c084fc";
        gradient = "from-purple-500 to-indigo-700";
        keyword = "觉醒";
        imagePrompt = "mysterious dark starry sky with ethereal mist, mysterious, deep purple tones";
        title = "黑夜中的觉醒";
        summary = "在梦中经历了恐惧与不安，但每一次恐惧的背后，都是成长的契机。";
        interpretation = "恐惧是潜意识的铠甲。即使在黑暗中奔跑，这也是你内心渴望突破束缚、寻找光明的证明。这个梦提醒你，你比想象中更勇敢。";
        suggestion = "今天做一件让你感到稍微挑战的事情，你会发现自己的力量。写下来，哪些恐惧其实只是纸老虎？";
      } else if (type === 'fantasy' || text.includes('飞') || text.includes('魔法') || text.includes('海')) {
        color = "#38bdf8";
        gradient = "from-cyan-300 via-blue-500 to-purple-600";
        keyword = "自由";
        imagePrompt = "fantasy night sky with stars and nebula, flying through clouds, magical, ethereal blue and purple";
        title = "星辰下的飞翔";
        summary = "在奇幻的世界里挣脱重力，自由翱翔，探索无限的可能。";
        interpretation = "挣脱了现实的重力，你的灵魂在无垠的奇幻之境翱翔。这颗星辰折射着你无穷的创造力与渴望自由的心。你的内心渴望突破现状。";
        suggestion = "今天给自己留一些完全自由的时间，做一件平时想做但没机会做的事。创造力需要被释放。";
      } else if (type === 'memory' || text.includes('考') || text.includes('以前') || text.includes('家')) {
        color = "#f472b6";
        gradient = "from-pink-400 to-rose-600";
        keyword = "眷恋";
        imagePrompt = "nostalgic dreamy sky with soft pink clouds, warm golden light, sentimental, ethereal";
        title = "时光的温柔回响";
        summary = "过去的记忆在梦中重现，那些被遗忘的情感再次浮现。";
        interpretation = "时间在梦里打了个折。那些未竟的遗憾与深深的思念，都在这颗温柔的星辰中得到了安放。这个梦告诉你，有些美好从未真正离开。";
        suggestion = "给思念的人发一条信息，或者只是简单地回忆一下美好的过往。感恩是治愈的开始。";
      } else if (text.includes('爱') || text.includes('抱')) {
        color = "#fb7185";
        gradient = "from-rose-400 to-red-500";
        keyword = "温暖";
        imagePrompt = "romantic dreamy sky with stars, soft pink and golden light, warm and loving atmosphere";
        title = "爱的频率";
        summary = "在梦中感受到温暖与爱，这是灵魂最深处的渴望。";
        interpretation = "爱是穿越梦境的唯一频率。你在梦里感受到的温暖，已被这颗星辰永久收藏。这个梦提醒你，你值得被爱，也有能力去爱。";
        suggestion = "今天对一个人表达你的感激或爱意，可以是一句简单的问候。爱是流动的能量。";
      } else {
        imagePrompt = "dreamy starry night sky, ethereal, magical, peaceful";
        title = "星河中的低语";
        summary = "一段独特的梦境体验，潜意识在编织着属于你的故事。";
        interpretation = "在无垠的梦境中，你的潜意识编织了一段独特的旋律。这颗星辰将永远闪烁着你此刻的情感与力量。这个梦是你的内心在说话。";
        suggestion = "带着这份觉知，今天试着更关注内心的感受。正念呼吸会帮助你连接到更深的智慧。";
      }

      aiData = { title, summary, interpretation, suggestion, keyword, color, gradient, imagePrompt, originalText: text };
    }

    const result: AIResult = { 
      title: aiData.title, 
      summary: aiData.summary, 
      interpretation: aiData.interpretation, 
      suggestion: aiData.suggestion,
      color: aiData.color, 
      gradient: aiData.gradient, 
      shadow: `shadow-[0_0_40px_${aiData.color}80]`, 
      keyword: aiData.keyword,
      imagePrompt: aiData.imagePrompt,
      date,
      time,
      dreamType: type,
      id,
      originalText: text
    };

    setAiResult(result);
    //#region debug-point
    reportTraeDebug({ ev: 'analyze_done_set_result', ms: Math.round(performance.now() - analyzeStart) });
    //#endregion debug-point
    
    const position = generateNonOverlappingPosition(dreamHistory);
    const historyDream: HistoryDream = {
      ...result,
      x: position.x,
      y: position.y,
    };
    
    setResultSource('record');
    setDreamHistory(prev => [...prev, historyDream]);
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      {/* Background Music */}
      <audio ref={audioRef} loop src="/music.mp3" />
      {/* Sound Toggle */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        onClick={() => {
          if (audioRef.current) {
            if (soundEnabled) {
              audioRef.current.pause();
            } else {
              audioRef.current.play().catch(() => {});
            }
            setSoundEnabled(!soundEnabled);
          }
        }}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-all duration-300 shadow-lg"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </motion.button>
      {/* Particle Field Background */}
      <ParticleField />

      <AnimatePresence mode="wait">
        {step === 'prologue' && (
          <motion.div
            key="prologue"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="relative z-10 flex flex-col h-[100dvh] px-4 py-12 md:py-20 text-center overflow-y-auto custom-scrollbar"
          >
            <div className="flex-grow" />
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-10 relative"
              >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-3xl animate-pulse" />
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-400/30 to-purple-400/30 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
              
              <div className="relative z-10">
                <h1 className="text-6xl md:text-8xl font-light tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-400 font-sans mb-4">
                  梦境星河
                </h1>
                <div className="flex items-center justify-center gap-2 text-indigo-300/60">
                  <Sparkle className="w-4 h-4" />
                  <span className="text-sm tracking-[0.4em] uppercase">Dream Galaxy</span>
                  <Sparkle className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-16 text-lg md:text-xl text-slate-400/80 font-light tracking-wider max-w-md"
            >
              记录一段梦境，点亮一颗星辰
            </motion.p>
            
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep('record')}
              className="group relative px-10 py-5 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/8 border border-white/15 hover:border-white/25 rounded-full backdrop-blur-xl transition-all duration-500 overflow-hidden flex items-center gap-4 shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:shadow-[0_0_60px_rgba(99,102,241,0.25)] mb-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <Sparkle className="w-7 h-7 text-indigo-300 group-hover:animate-pulse shrink-0" />
              <span className="relative z-10 text-left tracking-[0.3em] font-light text-slate-200">开始凝结</span>
            </motion.button>

            {dreamHistory.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('galaxy')}
                className="group relative px-10 py-5 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/8 border border-white/15 hover:border-white/25 rounded-full backdrop-blur-xl transition-all duration-500 overflow-hidden flex items-center gap-4 shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:shadow-[0_0_60px_rgba(99,102,241,0.25)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Sparkle className="w-7 h-7 text-indigo-300 group-hover:animate-pulse shrink-0" />
                <span className="relative z-10 text-left font-light tracking-wide text-slate-200">查看星河 ({dreamHistory.length})</span>
              </motion.button>
            )}
            </div>
            <div className="flex-grow" />
          </motion.div>
        )}

        {step === 'record' && (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 flex flex-col h-[100dvh] px-4 py-12 md:py-20 overflow-y-auto custom-scrollbar"
          >
            <div className="flex-grow" />
            <div className="w-full max-w-xl mx-auto flex-shrink-0 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <button
                onClick={() => setStep('prologue')}
                disabled={isSubmitting}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-light tracking-wide">返回</span>
              </button>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-light mb-3 text-slate-100 font-sans">
                  你在梦中看到了什么？
                </h2>
                <p className="text-slate-400/80 font-light text-sm">
                  让思绪流淌，让文字凝结成星光
                </p>
              </div>
              
              <div className="relative mb-6">
                <textarea
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="在那片深邃的梦境中，我看到了..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-5 pr-16 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300/40 transition-all duration-300 resize-none font-light leading-relaxed"
                />
                <span className="absolute bottom-4 right-4 text-xs text-slate-500/70 font-light">
                  {dreamText.length} 字
                </span>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-purple-200" />
                  </div>
                  <p className="text-lg text-slate-200 tracking-[0.2em] font-light">梦境基调</p>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/30 to-orange-500/30 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                    <Sparkle className="w-4 h-4 text-pink-200" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {DREAM_TYPES.map((type, index) => {
                  const iconColors = {
                    sweet: { bg: 'bg-amber-500/30', border: 'border-amber-400/50', icon: 'text-amber-200' },
                    nightmare: { bg: 'bg-purple-500/30', border: 'border-purple-400/50', icon: 'text-purple-200' },
                    fantasy: { bg: 'bg-cyan-500/30', border: 'border-cyan-400/50', icon: 'text-cyan-200' },
                    memory: { bg: 'bg-pink-500/30', border: 'border-pink-400/50', icon: 'text-pink-200' },
                  };
                  const colors = iconColors[type.id];
                  return (
                    <motion.button
                      key={type.id}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDreamType(type.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-3 py-5 px-3 rounded-2xl transition-all duration-500 relative group",
                        dreamType === type.id
                          ? cn("bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl ring-2 ring-white/20")
                          : "bg-white/5 backdrop-blur-md border border-transparent hover:bg-white/8"
                      )}
                    >
                      {dreamType === type.id && (
                        <div
                          className="absolute inset-0 rounded-2xl opacity-30 blur-md"
                          style={{ background: `linear-gradient(135deg, ${type.gradient.replace('from-', '').replace(' to-', ', ')})`.split(',')[0] === 'amber' ? '#f59e0b' : type.gradient.includes('amber') ? '#f59e0b' : type.gradient.includes('purple') ? '#a855f7' : type.gradient.includes('cyan') ? '#22d3ee' : '#f472b6' }}
                        />
                      )}
                      <div className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-xl relative",
                        dreamType === type.id
                          ? cn("bg-gradient-to-br shadow-lg ring-4 ring-white/20 ", type.gradient)
                          : "bg-white/10 border border-white/10 " + colors.bg
                      )}>
                        <div className={cn(
                          "transition-all duration-500",
                          dreamType === type.id ? "text-white scale-110" : cn(colors.icon, "group-hover:scale-110")
                        )}>
                          {type.icon}
                        </div>
                      </div>

                      <span className={cn(
                        "text-xs font-medium transition-all duration-500 tracking-wide",
                        dreamType === type.id ? "text-white font-semibold" : "text-slate-400 group-hover:text-slate-200"
                      )}>
                        {type.label}
                      </span>

                      {dreamType === type.id && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        />
                      )}
                    </motion.button>
                  );
                })}
                </div>
              </div>

              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={!dreamText.trim() || isSubmitting}
                  className="w-full px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="tracking-wider font-medium">凝聚星辰</span>
                </motion.button>
              </div>
            </div>
            <div className="flex-grow" />
          </motion.div>
        )}

        {step === 'ritual' && (
          <motion.div
            key="ritual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center justify-center h-[100dvh] py-12 overflow-y-auto custom-scrollbar"
          >
            <div className="relative w-40 h-40 flex items-center justify-center mb-12">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0 rounded-full border border-indigo-500/40 border-t-indigo-300" />
                <div className="absolute inset-4 rounded-full border border-purple-500/30 border-b-purple-300 animate-[spin_3s_reverse_infinite]" />
                <div className="absolute inset-8 rounded-full border border-cyan-500/20 border-l-cyan-300 animate-[spin_2s_infinite]" />
              </motion.div>
              
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-8 h-8 rounded-full bg-white shadow-[0_0_40px_rgba(255,255,255,1)]"
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={ritualPhraseIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.6 }}
                className="text-2xl font-light text-indigo-200 tracking-[0.3em]"
              >
                {RITUAL_PHRASES[ritualPhraseIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {step === 'result' && aiResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 flex flex-col h-[100dvh] px-4 py-12 md:py-20 overflow-y-auto custom-scrollbar"
          >
            <div className="flex-grow" />
            <div className="w-full max-w-xl mx-auto flex-shrink-0 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-indigo-500/30 rounded-[2.5rem] blur-xl opacity-50" />
              
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col w-full max-h-[88vh]" style={{ backdropFilter: 'blur(20px)' }}>
                {/* 可滚动的内容区 */}
                <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-shrink min-h-0">
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => resultSource === 'galaxy' ? setStep('galaxy') : setStep('record')}
                      className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span className="font-light tracking-wide">{resultSource === 'galaxy' ? '返回星河' : '返回'}</span>
                    </button>

                    {resultSource === 'galaxy' && (
                      <button
                        onClick={() => {
                          if (aiResult) {
                            setDreamHistory(prev => prev.filter(d => d.id !== aiResult.id));
                            setAiResult(null);
                            setStep('galaxy');
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-white/5 hover:bg-red-500/20 transition-all duration-300 text-slate-400 hover:text-red-400 rounded-lg border border-white/10 hover:border-red-500/30"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <div className="mb-10">
                    <div className="inline-block px-4 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 mb-5">
                      <span className="text-xs tracking-[0.3em] text-cyan-200 uppercase">{aiResult.keyword}之星</span>
                    </div>
                    
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-3xl md:text-4xl font-sans text-white flex-1 min-w-0 break-words" style={{ textShadow: '0 0 30px rgba(147, 197, 253, 0.5)' }}>
                        {aiResult.title}
                      </h2>
                      
                      <div className="flex flex-col items-end gap-1 text-slate-300/80 shrink-0 mt-1">
                        <p className="text-base font-light tracking-wide">{aiResult.time}</p>
                        <p className="text-xs text-slate-400">{aiResult.date}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-10">
                    <div className="relative border border-cyan-400/20 bg-cyan-500/5 rounded-3xl p-6 md:p-8 overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0" />
                      <p className="text-cyan-50/90 font-light leading-relaxed text-lg md:text-xl relative z-10">
                        "{aiResult.summary}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <span className="text-indigo-300 text-sm">✧</span>
                      </div>
                      <span className="text-base font-medium text-slate-200 tracking-wider">星河解读</span>
                    </div>
                    <p className="text-slate-300/90 leading-relaxed font-light pl-11 text-base md:text-lg">
                      {aiResult.interpretation}
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                        <span className="text-amber-300 text-sm">💡</span>
                      </div>
                      <span className="text-base font-medium text-slate-200 tracking-wider">温柔指引</span>
                    </div>
                    <div className="pl-11">
                      <p className="text-slate-200/90 leading-relaxed font-light text-base md:text-lg">
                        {aiResult.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
                  
                {/* 固定的底部操作栏 */}
                <div className="p-6 md:p-8 border-t border-white/10 bg-slate-900/60 backdrop-blur-xl flex-shrink-0 relative z-20">
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        if (aiResult) {
                          setDreamText(aiResult.originalText);
                          setDreamType(aiResult.dreamType);
                        }
                        setStep('record');
                      }}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 transition-all duration-300 text-slate-300 font-light tracking-wide flex items-center justify-center gap-2 rounded-2xl border border-white/10 hover:border-white/20 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center gap-2">
                        <span className="group-hover:animate-bounce text-lg">🖋️</span>
                        续写梦境
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        if (aiResult) {
                          setLatestDreamId(aiResult.id);
                          setGalaxyOffset({ x: 0, y: 0 });
                          setGalaxyScale(1);
                        }
                        setStep('galaxy');
                      }}
                      className="flex-1 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 hover:from-indigo-400 hover:via-purple-400 hover:to-indigo-400 rounded-2xl transition-all duration-300 text-white font-medium tracking-wide flex items-center justify-center gap-2 relative overflow-hidden group animate-slow-pulse shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center gap-2">
                        <span className="group-hover:animate-bounce text-lg">✨</span>
                        封存入星系
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-grow" />
          </motion.div>
        )}

        {step === 'galaxy' && (
          <motion.div
            key="galaxy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center h-[100dvh] w-full overflow-hidden"
          >
            <div 
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - galaxyOffset.x, y: e.clientY - galaxyOffset.y });
              }}
              onMouseMove={(e) => {
                if (isDragging) {
                  setGalaxyOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onWheel={(e) => {
                e.preventDefault();
                const scaleChange = e.deltaY > 0 ? -SCALE_CHANGE : SCALE_CHANGE;
                setGalaxyScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + scaleChange)));
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  (e.target as any)._initialPinchDist = dist;
                  (e.target as any)._initialScale = galaxyScale;
                } else {
                  setIsDragging(true);
                  setDragStart({ x: e.touches[0].clientX - galaxyOffset.x, y: e.touches[0].clientY - galaxyOffset.y });
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2) {
                  const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  const initialDist = (e.target as any)._initialPinchDist || dist;
                  const initialScale = (e.target as any)._initialScale || 1;
                  const newScale = initialScale * (dist / initialDist);
                  setGalaxyScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale)));
                } else if (isDragging && e.touches.length === 1) {
                  setGalaxyOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
                }
              }}
              onTouchEnd={() => setIsDragging(false)}
            >
              <div className="absolute w-[2000px] h-[2000px] bg-indigo-900/20 rounded-full blur-[200px] mix-blend-screen animate-pulse -translate-x-1/4 -translate-y-1/4" />
              <div className="absolute w-[1600px] h-[1600px] bg-purple-900/15 rounded-full blur-[150px] mix-blend-screen translate-x-1/4 translate-y-1/4" style={{ animationDelay: '0.5s' }} />
              
              <div 
                className="absolute"
                style={{
                  width: '300vw',
                  height: '300vh',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${galaxyOffset.x}px), calc(-50% + ${galaxyOffset.y}px)) scale(${galaxyScale})`,
                  transformOrigin: 'center center'
                }}
              >
                {dreamHistory.map((dream, index) => {
                  const typeInfo = DREAM_TYPES.find(t => t.id === dream.dreamType);
                  const isLatest = dream.id === latestDreamId;
                  return (
                    <motion.div
                      key={dream.id}
                      initial={{
                        opacity: 0,
                        scale: 0,
                        left: '50%',
                        top: '50%'
                      }}
                      animate={{
                        opacity: 1,
                        scale: isLatest ? [1, 1.1, 1] : 1,
                        left: `${dream.x}%`,
                        top: `${dream.y}%`
                      }}
                      transition={{
                        delay: index * 0.1,
                        duration: isLatest ? 1.5 : 0.5,
                        left: { type: 'spring', stiffness: 0.5, damping: 20 },
                        top: { type: 'spring', stiffness: 0.5, damping: 20 },
                        ...(isLatest && {
                          scale: {
                            repeat: Infinity,
                            repeatType: "reverse" as const,
                            duration: 2
                          }
                        })
                      }}
                      style={{
                        position: 'absolute',
                        zIndex: isLatest ? 50 : 10
                      }}
                    >
                      <motion.button
                        whileHover={{ scale: 1.3, y: -5 }}
                        whileTap={{ scale: 1.1 }}
                        onClick={() => {
                          setResultSource('galaxy');
                          setAiResult(dream);
                          setStep('result');
                        }}
                        className="relative group"
                      >
                        <div 
                          className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-30 transition-opacity"
                          style={{ backgroundColor: dream.color, filter: 'blur(15px)' }} 
                        />
                        
                        {isLatest && (
                          <div 
                            className="absolute inset-0 rounded-full animate-ping"
                            style={{ 
                              backgroundColor: dream.color,
                              opacity: 0.3
                            }}
                          />
                        )}
                        
                        {isLatest && (
                          <div 
                            className="absolute -inset-3 rounded-full animate-pulse"
                            style={{ 
                              background: `radial-gradient(circle, ${dream.color}40 0%, transparent 70%)`,
                              boxShadow: `0 0 20px ${dream.color}, 0 0 40px ${dream.color}30`
                            }}
                          />
                        )}
                        
                        <div 
                          className={cn(
                            "rounded-full relative flex items-center justify-center transition-all duration-300",
                            isLatest ? "w-20 h-20 md:w-24 md:h-24" : "w-14 h-14 md:w-16 md:h-16"
                          )}
                          style={{ 
                            backgroundColor: dream.color,
                            boxShadow: isLatest 
                              ? `0 0 50px ${dream.color}, 0 0 100px ${dream.color}60`
                              : `0 0 30px ${dream.color}, 0 0 60px ${dream.color}40`
                          }}
                        >
                          <div className="absolute inset-1 rounded-full bg-white/20 backdrop-blur-sm" />
                          <div 
                            className={cn(
                              "relative z-10 flex items-center justify-center text-white",
                              isLatest ? "w-8 h-8 md:w-10 md:h-10" : "w-6 h-6 md:w-8 md:h-8"
                            )}
                          >
                            {typeInfo?.icon}
                          </div>
                          
                          {isLatest && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                              新
                            </div>
                          )}
                        </div>
                        
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                          <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5">
                            <p className="text-xs text-slate-200 font-light">{dream.title}</p>
                            <p className="text-[10px] text-slate-400">{dream.date}</p>
                          </div>
                        </div>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="absolute top-6 left-6 z-20">
              <motion.button
                whileHover={{ x: -3 }}
                onClick={() => {
                  setStep('prologue');
                  setDreamText('');
                }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-light tracking-wide">返回首页</span>
              </motion.button>
            </div>
            
            <div className="absolute top-6 right-6 z-20 text-right">
              <h2 className="text-2xl md:text-3xl font-sans text-white mb-1">我的星河</h2>
              <p className="text-slate-400 text-sm">{dreamHistory.length} 颗星辰</p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
              className="absolute bottom-8 text-center z-20"
            >
              <p className="text-slate-500 font-light text-sm tracking-[0.2em] animate-pulse pointer-events-none">
                点击星辰，重温梦境
              </p>
            </motion.div>
            
            <div className="absolute bottom-8 right-6 z-20 flex flex-col gap-4">
              <motion.button
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 20 }}
                whileHover={{ scale: 1.2, y: -4, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setGalaxyScale(prev => Math.max(MIN_SCALE, prev - SCALE_CHANGE))}
                className="group relative w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-700 overflow-hidden"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(99,102,241,0.4),0_0_60px_rgba(168,85,247,0.3)]" />
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-indigo-400/0 via-indigo-400/50 to-indigo-400/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 animate-spin-slow" />
                <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/80 animate-ping" style={{ animationDelay: '0s' }} />
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-200/70 animate-ping" style={{ animationDelay: '0.5s' }} />
                <Minus className="w-7 h-7 relative z-10 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
                whileHover={{ scale: 1.2, y: -4, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setGalaxyScale(prev => Math.min(MAX_SCALE, prev + SCALE_CHANGE))}
                className="group relative w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-700 overflow-hidden"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-orange-500/30 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(168,85,247,0.4),0_0_60px_rgba(244,114,182,0.3)]" />
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-400/0 via-purple-400/50 to-purple-400/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 animate-spin-slow" />
                <div className="absolute top-2 right-1 w-2 h-2 rounded-full bg-white/80 animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="absolute bottom-1 left-2 w-1.5 h-1.5 rounded-full bg-purple-200/70 animate-ping" style={{ animationDelay: '0.8s' }} />
                <Plus className="w-7 h-7 relative z-10 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 1.0, type: 'spring', stiffness: 260, damping: 20 }}
                whileHover={{ scale: 1.2, y: -4, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setGalaxyScale(1);
                  setGalaxyOffset({ x: 0, y: 0 });
                }}
                className="group relative w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-700 overflow-hidden"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 via-blue-500/30 to-indigo-500/30 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(34,211,238,0.4),0_0_60px_rgba(59,130,246,0.3)]" />
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 animate-spin-slow" />
                <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-white/80 animate-ping" style={{ animationDelay: '0.2s' }} />
                <div className="absolute bottom-2 left-1 w-1.5 h-1.5 rounded-full bg-cyan-200/70 animate-ping" style={{ animationDelay: '0.7s' }} />
                <RotateCcw className="w-7 h-7 relative z-10 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
