import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoardStore } from '@/store/boardStore';
import { SFX } from '@/lib/sfx';
import { callPrizeBoardAI, getCurriculumQuestion, validateAnswer, type CurriculumQuestion } from '@/lib/ai';
import confetti from 'canvas-confetti';
import { X, Sparkles, Dice1, Gift, HelpCircle, Loader2, Timer, Zap, GraduationCap, Brain, Infinity as InfinityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

import reaganDefault from '@/assets/reagan-magnificent.png';
import reaganShocked from '@/assets/reagan-shocked.png';
import reaganThinking from '@/assets/reagan-thinking.png';
import reaganSpiteful from '@/assets/reagan-spiteful.png';
import reaganReluctant from '@/assets/reagan-reluctant.png';

type GameMode = 'idle' | 'scholarly_sprint' | 'voids_paradox' | 'mind_bender' | 'gamble';
type GamePhase = 'intro' | 'mode_select' | 'loading' | 'playing' | 'result';
type ReaganMood = 'default' | 'thinking' | 'shocked' | 'spiteful' | 'reluctant';

const REAGAN_DISTRACTIONS = [
  "Did you know octopi have 3 hearts?",
  "The moon is slowly drifting away...",
  "Your shoelace might be untied...",
  "Was that a spider on your desk?",
  "Quick! Look behind you!",
  "I sense doubt in your aura...",
  "The stars are aligning against you...",
  "Your answer trembles before fate...",
  "Reagan sees ALL...",
  "Time is merely an illusion...",
];

const SPITEFUL_QUOTES = [
  "Ha! Those spins are MINE! ALL MINE!",
  "Reagan keeps his treasures! Mwahaha!",
  "Better luck next century, mortal!",
  "The Magnificent ONE prevails again!",
  "Your tears fuel my crystal ball!",
  "Reagan dances on your defeat!",
];

const RELUCTANT_QUOTES = [
  "Fine... take them... I didn't want them anyway...",
  "*sigh* ...here are your precious spins...",
  "You got LUCKY. Don't let it happen again.",
  "Reagan RELUCTANTLY parts with his treasures...",
  "This hurts me more than you know...",
  "I'll get them back. Mark my words.",
];

const TIMER_DURATION = 15;

const MOOD_IMAGES: Record<ReaganMood, string> = {
  default: reaganDefault,
  thinking: reaganThinking,
  shocked: reaganShocked,
  spiteful: reaganSpiteful,
  reluctant: reaganReluctant,
};

const MODE_CONFIG = {
  scholarly_sprint: {
    label: 'Scholarly Sprint',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'text-neon-emerald',
    borderColor: 'border-neon-emerald/50',
    bgColor: 'bg-neon-emerald/20',
    description: 'Curriculum trivia from Saxon Math, Shurley English & Core Knowledge',
  },
  voids_paradox: {
    label: "Void's Paradox",
    icon: <InfinityIcon className="w-5 h-5" />,
    color: 'text-neon-purple',
    borderColor: 'border-neon-purple/50',
    bgColor: 'bg-neon-purple/20',
    description: 'Impossible-sounding nonsense questions — all answers are equally absurd!',
  },
  mind_bender: {
    label: 'The Mind-Bender',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-neon-amber',
    borderColor: 'border-neon-amber/50',
    bgColor: 'bg-neon-amber/20',
    description: 'Logic riddles & lateral thinking puzzles',
  },
};

interface AIQuestion {
  q: string;
  a: string[];
}

/* ─── Crystal Ball Loading Component ─── */
const CrystalBallLoader = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center space-y-4"
  >
    <div className="relative">
      <div className="absolute inset-0 rounded-full crystal-ball-glow" style={{ width: 120, height: 120 }} />
      <div
        className="relative w-[120px] h-[120px] rounded-full crystal-ball-glow overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 35% 35%, hsl(var(--neon-cyan) / 0.4), hsl(var(--neon-purple) / 0.6), hsl(var(--neon-purple) / 0.2))',
        }}
      >
        <div
          className="absolute inset-2 rounded-full crystal-swirl opacity-40"
          style={{
            background: 'conic-gradient(from 0deg, transparent, hsl(var(--neon-cyan) / 0.5), transparent, hsl(var(--neon-purple) / 0.5), transparent)',
          }}
        />
        <div
          className="absolute top-3 left-5 w-6 h-4 rounded-full opacity-60"
          style={{ background: 'radial-gradient(ellipse, white 0%, transparent 70%)' }}
        />
      </div>
      <div className="mx-auto w-16 h-3 rounded-b-full mt-[-2px]" style={{ background: 'linear-gradient(to bottom, hsl(var(--neon-purple) / 0.5), hsl(var(--neon-purple) / 0.2))' }} />
    </div>
    <motion.p
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="text-muted-foreground italic font-display text-sm tracking-wider"
    >
      The crystal ball swirls with visions...
    </motion.p>
  </motion.div>
);

/* ─── Lightning Strike Overlay ─── */
const LightningOverlay = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0, 0.7, 0] }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{ background: 'hsl(var(--neon-purple) / 0.3)' }}
        />
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 1, 0.8, 0], scaleY: [0, 1, 1, 0] }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="fixed z-[61] pointer-events-none"
            style={{
              top: 0,
              left: `${25 + i * 25}%`,
              width: 3,
              height: '60%',
              background: `linear-gradient(to bottom, hsl(var(--neon-amber)), hsl(var(--neon-purple)), transparent)`,
              filter: 'blur(1px)',
              transformOrigin: 'top',
            }}
          />
        ))}
      </>
    )}
  </AnimatePresence>
);

/* ─── Reagan Avatar Component ─── */
const ReaganAvatar = ({ mood, size = 'md' }: { mood: ReaganMood; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };
  const isSpiteful = mood === 'spiteful';
  
  return (
    <motion.div
      className={`relative ${isSpiteful ? 'spiteful-dance' : 'reagan-float'}`}
      animate={mood === 'shocked' ? { x: [0, -3, 3, -2, 2, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      <motion.img
        key={mood}
        src={MOOD_IMAGES[mood]}
        alt="Reagan the Magnificent"
        className={`${sizeClasses[size]} object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        width={512}
        height={512}
      />
      <div
        className={`absolute inset-0 rounded-full blur-xl opacity-30 -z-10 ${
          mood === 'spiteful' ? 'bg-neon-amber' :
          mood === 'shocked' ? 'bg-destructive' :
          mood === 'reluctant' ? 'bg-blue-400' :
          'bg-neon-purple'
        }`}
      />
    </motion.div>
  );
};

/* ─── Main Component ─── */
export const ReaganGame = () => {
  const { aiGameOpen, setAiGameOpen, addSpins, curriculumTopic } = useBoardStore();
  const [mode, setMode] = useState<GameMode>('idle');
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [message, setMessage] = useState('');
  const [spinsWon, setSpinsWon] = useState(0);
  const [mood, setMood] = useState<ReaganMood>('default');
  const [lightningActive, setLightningActive] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [reaganQuote, setReaganQuote] = useState('');

  // Trivia (Scholarly Sprint & Void's Paradox)
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [curriculumQuestions, setCurriculumQuestions] = useState<CurriculumQuestion[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [usingCurriculum, setUsingCurriculum] = useState(false);
  const [qIdx, setQIdx] = useState(0);

  // Riddle (Mind-Bender)
  const [riddle, setRiddle] = useState<{ riddle: string; answer: string } | null>(null);
  const [riddleRevealed, setRiddleRevealed] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerActive, setTimerActive] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  // Distractions
  const [distraction, setDistraction] = useState('');
  const [distractionVisible, setDistractionVisible] = useState(false);

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          setTimerExpired(true);
          setDistraction('⚡ TIME\'S UP! ⚡');
          setDistractionVisible(true);
          setMood('spiteful');
          triggerLightning();
          SFX.error();
          return 0;
        }
        if (prev <= 6) SFX.lottoTick(prev <= 3 ? 'E5' : 'C5');
        if (prev > 4 && Math.random() > 0.75) {
          setDistraction(REAGAN_DISTRACTIONS[Math.floor(Math.random() * REAGAN_DISTRACTIONS.length)]);
          setDistractionVisible(true);
          setTimeout(() => setDistractionVisible(false), 2000);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const triggerLightning = useCallback(async () => {
    setLightningActive(true);
    setScreenShake(true);
    await SFX.lightning();
    setTimeout(() => setLightningActive(false), 800);
    setTimeout(() => setScreenShake(false), 500);
  }, []);

  const startTimer = useCallback(() => {
    setTimeLeft(TIMER_DURATION);
    setTimerExpired(false);
    setTimerActive(true);
    setDistractionVisible(false);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
    setDistractionVisible(false);
  }, []);

  const timerPercent = (timeLeft / TIMER_DURATION) * 100;
  const timerColor = timeLeft <= 3 ? 'bg-destructive' : timeLeft <= 7 ? 'bg-neon-amber' : 'bg-neon-emerald';

  const startMode = useCallback(async (chosenMode: 'scholarly_sprint' | 'voids_paradox' | 'mind_bender') => {
    setMode(chosenMode);
    setMood('thinking');
    await SFX.mystical();
    await SFX.crystalHum();
    setPhase('loading');
    setDistractionVisible(false);

    if (chosenMode === 'scholarly_sprint') {
      // Try curriculum questions first (3 questions per round)
      const cQuestions: CurriculumQuestion[] = [];
      for (let i = 0; i < 3; i++) {
        const q = await getCurriculumQuestion(undefined, undefined, [...usedQuestionIds, ...cQuestions.map(cq => cq.id)]);
        if (q) cQuestions.push(q);
        else break;
      }

      if (cQuestions.length >= 3) {
        // Use curriculum questions
        setCurriculumQuestions(cQuestions);
        setUsedQuestionIds(prev => [...prev, ...cQuestions.map(q => q.id)]);
        setUsingCurriculum(true);
        setQIdx(0);
        setPhase('playing');
        setMood('default');
        startTimer();
      } else {
        // Fallback to AI
        setUsingCurriculum(false);
        const data = await callPrizeBoardAI('scholarly_sprint', undefined, curriculumTopic || undefined);
        if (data?.questions) {
          setQuestions(data.questions);
          setQIdx(0);
          setPhase('playing');
          setMood('default');
          startTimer();
        } else {
          const fallback = [
            { q: "What is the scientific name for the process of a caterpillar becoming a butterfly?", a: ["Metamorphosis", "Photosynthesis", "Mitosis"] },
            { q: "In Shurley English, what part of speech modifies a verb?", a: ["Adverb", "Adjective", "Pronoun"] },
            { q: "How many sides does a hexagon have?", a: ["6", "8", "5"] },
          ];
          setQuestions(fallback);
          setQIdx(0);
          setPhase('playing');
          setMood('default');
          startTimer();
        }
      }
    } else if (chosenMode === 'voids_paradox') {
      setUsingCurriculum(false);
      const data = await callPrizeBoardAI('voids_paradox', undefined, curriculumTopic || undefined);
      if (data?.questions) {
        setQuestions(data.questions);
        setQIdx(0);
        setPhase('playing');
        setMood('default');
        startTimer();
      } else {
        const fallback = [
          { q: "If a shadow weighs 3 ounces, how many shadows can fit in a gallon?", a: ["42 shadow-gallons", "None, shadows are metric", "Only on Tuesdays"] },
          { q: "What is the square root of a whisper?", a: ["Silent geometry", "0.003 decibels", "A smaller whisper"] },
          { q: "If history runs backwards, who discovered America last?", a: ["The fish", "Christopher Reverse", "No one yet"] },
        ];
        setQuestions(fallback);
        setQIdx(0);
        setPhase('playing');
        setMood('default');
        startTimer();
      }
    } else {
      // Mind-Bender
      setUsingCurriculum(false);
      const data = await callPrizeBoardAI('mind_bender');
      if (data?.riddle) {
        setRiddle(data);
        setRiddleRevealed(false);
        setPhase('playing');
        setMood('default');
        startTimer();
      } else {
        setRiddle({ riddle: "I have cities, but no houses. I have mountains, but no trees. What am I?", answer: "A map" });
        setRiddleRevealed(false);
        setPhase('playing');
        setMood('default');
        startTimer();
      }
    }
  }, [curriculumTopic, startTimer, usedQuestionIds]);

  const handleTriviaAnswer = useCallback(async () => {
    stopTimer();
    await SFX.click();

    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
      startTimer();
    } else {
      const weights = [1,1, 2,2,2,2,2, 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3, 4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4, 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5, 6,6,6,6,6,6,6,6, 7,7,7,7,7, 8,8, 9,9, 10];
      const earned = weights[Math.floor(Math.random() * weights.length)];
      setSpinsWon(earned);
      addSpins(earned);
      setMood('reluctant');
      setReaganQuote(RELUCTANT_QUOTES[Math.floor(Math.random() * RELUCTANT_QUOTES.length)]);
      setMessage(`+${earned} spins wrested from Reagan's grasp!`);
      setPhase('result');
      await SFX.reluctantGive();
      if (earned >= 5) {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#8b5cf6', '#fbbf24', '#10b981'] });
      }
    }
  }, [qIdx, questions, addSpins, startTimer, stopTimer]);

  const handleRiddleCorrect = useCallback(async () => {
    stopTimer();
    const earned = 3 + Math.floor(Math.random() * 3);
    setSpinsWon(earned);
    addSpins(earned);
    setMood('reluctant');
    setReaganQuote(RELUCTANT_QUOTES[Math.floor(Math.random() * RELUCTANT_QUOTES.length)]);
    setMessage(`Correct! The answer was: ${riddle?.answer}. +${earned} spins!`);
    setPhase('result');
    await SFX.reluctantGive();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
  }, [riddle, addSpins, stopTimer]);

  const handleRiddleWrong = useCallback(async () => {
    stopTimer();
    setMood('spiteful');
    setReaganQuote(SPITEFUL_QUOTES[Math.floor(Math.random() * SPITEFUL_QUOTES.length)]);
    await triggerLightning();
    await SFX.spitefulLaugh();
    
    setSpinsWon(1);
    addSpins(1);
    setMessage(`The answer was: ${riddle?.answer}. Reagan dances! +1 pity spin.`);
    setPhase('result');
  }, [riddle, addSpins, stopTimer, triggerLightning]);

  const handleTakeGuaranteed = useCallback(async () => {
    setSpinsWon(2);
    addSpins(2);
    setMood('reluctant');
    setReaganQuote("Playing it safe? How... boring. Fine, take your measly 2.");
    setMessage('Safe choice! +2 guaranteed spins!');
    setPhase('result');
    await SFX.reluctantGive();
  }, [addSpins]);

  const handleOpenVoidBox = useCallback(async () => {
    setMood('thinking');
    await SFX.mystical();
    const roll = Math.random();
    let earned: number;
    if (roll < 0.4) {
      earned = 0;
      setMood('spiteful');
      setReaganQuote(SPITEFUL_QUOTES[Math.floor(Math.random() * SPITEFUL_QUOTES.length)]);
      setMessage('The Void Box was empty... 0 spins.');
      await SFX.spitefulLaugh();
    } else if (roll < 0.95) {
      earned = 1 + Math.floor(Math.random() * 3);
      setMood('reluctant');
      setReaganQuote(RELUCTANT_QUOTES[Math.floor(Math.random() * RELUCTANT_QUOTES.length)]);
      setMessage(`The Void Box contained... +${earned} spins!`);
      await SFX.reluctantGive();
    } else {
      earned = 7;
      setMood('shocked');
      setReaganQuote("IMPOSSIBLE! NOT MY LEGENDARY STASH! NOOOOO!");
      setMessage('✨ LEGENDARY! The Void Box overflows! +7 spins! ✨');
      await SFX.prizeReveal();
      confetti({ particleCount: 300, spread: 120, origin: { y: 0.4 }, colors: ['#fbbf24', '#f59e0b'] });
    }
    setSpinsWon(earned);
    addSpins(earned);
    setPhase('result');
  }, [addSpins]);

  const handleClose = () => {
    stopTimer();
    setAiGameOpen(false);
    setMode('idle');
    setPhase('intro');
    setSpinsWon(0);
    setMessage('');
    setMood('default');
    setDistractionVisible(false);
    setTimerExpired(false);
    setReaganQuote('');
    setLightningActive(false);
    setScreenShake(false);
  };

  if (!aiGameOpen) return null;

  const currentModeConfig = mode !== 'idle' && mode !== 'gamble' ? MODE_CONFIG[mode] : null;

  const TimerBar = () => (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-neon-amber'}`} />
          <span className={`font-display text-sm tracking-wider ${timeLeft <= 5 ? 'text-destructive' : 'text-neon-amber'}`}>
            {timeLeft}s
          </span>
        </div>
        {timeLeft <= 5 && (
          <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="text-xs font-display text-destructive">
            HURRY!
          </motion.span>
        )}
      </div>
      <div className="w-full h-2 bg-card/80 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className={`h-full rounded-full ${timerColor} transition-colors duration-300`}
          initial={{ width: '100%' }}
          animate={{ width: `${timerPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center ${screenShake ? 'screen-shake' : ''}`}
        style={{ background: 'radial-gradient(circle at center, rgba(88, 28, 135, 0.95) 0%, rgba(15, 23, 42, 1) 100%)' }}
      >
        <LightningOverlay active={lightningActive} />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg mx-4 text-center relative"
        >
          {/* Reagan Avatar + Title */}
          <div className="mb-6 flex flex-col items-center">
            <ReaganAvatar mood={mood} size={phase === 'result' ? 'lg' : 'md'} />
            <h2 className="font-display text-xl sm:text-2xl tracking-widest text-neon-purple mt-3">
              REAGAN THE MAGNIFICENT
            </h2>
            {currentModeConfig && phase === 'playing' && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-2 mt-2 ${currentModeConfig.color}`}>
                {currentModeConfig.icon}
                <span className="font-display text-xs uppercase tracking-widest">{currentModeConfig.label}</span>
              </motion.div>
            )}
            {phase === 'intro' && (
              <p className="text-muted-foreground/60 text-xs italic mt-1">"{REAGAN_DISTRACTIONS[Math.floor(Math.random() * 3)]}"</p>
            )}
          </div>

          {/* Distraction overlay */}
          <AnimatePresence>
            {distractionVisible && phase === 'playing' && (mode === 'scholarly_sprint' || mode === 'voids_paradox' || mode === 'mind_bender') && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`absolute top-0 left-0 right-0 italic text-sm font-display z-20 ${timerExpired ? 'text-destructive font-bold text-lg' : 'text-neon-amber/80'}`}
              >
                "{distraction}"
              </motion.div>
            )}
          </AnimatePresence>

          {/* Intro — Mode Select */}
          {phase === 'intro' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-muted-foreground italic text-sm">Choose your trial, mortal...</p>
              <div className="grid grid-cols-1 gap-3">
                {(Object.entries(MODE_CONFIG) as [keyof typeof MODE_CONFIG, typeof MODE_CONFIG[keyof typeof MODE_CONFIG]][]).map(([key, cfg]) => (
                  <Button
                    key={key}
                    onClick={() => startMode(key)}
                    className={`${cfg.bgColor} border ${cfg.borderColor} ${cfg.color} hover:opacity-80 font-display py-5 text-left justify-start gap-3`}
                  >
                    {cfg.icon}
                    <div className="text-left">
                      <div className="text-sm font-bold">{cfg.label}</div>
                      <div className="text-[10px] opacity-70 font-sans">{cfg.description}</div>
                    </div>
                  </Button>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => { setMode('gamble'); setPhase('playing'); setMood('default'); }}
                    className="flex-1 bg-neon-amber/20 border border-neon-amber/50 text-neon-amber hover:bg-neon-amber/30 font-display"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Cosmic Gamble
                  </Button>
                  <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                    Return
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading — Crystal Ball */}
          {phase === 'loading' && <CrystalBallLoader />}

          {/* Trivia — Scholarly Sprint & Void's Paradox */}
          {phase === 'playing' && (mode === 'scholarly_sprint' || mode === 'voids_paradox') && questions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <TimerBar />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-display">TRIAL {qIdx + 1}/{questions.length}</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: questions.length }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i <= qIdx ? 'bg-neon-purple' : 'bg-white/20'}`} />
                  ))}
                </div>
              </div>
              <p className="text-foreground font-semibold text-lg">{questions[qIdx].q}</p>
              <div className="grid grid-cols-1 gap-2">
                {questions[qIdx].a.map((opt, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    onClick={handleTriviaAnswer}
                    disabled={timerExpired}
                    className="glass-panel border-white/10 text-foreground hover:border-neon-purple/50 hover:bg-neon-purple/10 text-left justify-start py-3 disabled:opacity-40"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
              {timerExpired && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={handleTriviaAnswer} className="w-full bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 mt-2">
                    <Zap className="w-4 h-4 mr-1" /> Continue (Penalty!)
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Riddle — Mind-Bender */}
          {phase === 'playing' && mode === 'mind_bender' && riddle && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <TimerBar />
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-neon-amber" />
                <span className="text-xs text-muted-foreground font-display">MIND-BENDER CHALLENGE</span>
              </div>
              <p className="text-foreground font-semibold text-lg italic">"{riddle.riddle}"</p>
              {!riddleRevealed ? (
                <Button onClick={() => { setRiddleRevealed(true); stopTimer(); }} className="bg-neon-amber/20 border border-neon-amber/50 text-neon-amber hover:bg-neon-amber/30">
                  Reveal Answer
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-neon-cyan font-display text-xl">{riddle.answer}</p>
                  <p className="text-xs text-muted-foreground">Did the student get it right?</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleRiddleCorrect} className="bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald hover:bg-neon-emerald/30">
                      ✓ Correct (3-5 spins)
                    </Button>
                    <Button onClick={handleRiddleWrong} className="bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30">
                      ✗ Wrong (1 spin)
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Cosmic Gamble */}
          {phase === 'playing' && mode === 'gamble' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Dice1 className="w-5 h-5 text-neon-amber" />
                <span className="text-xs text-muted-foreground font-display">THE COSMIC GAMBLE</span>
              </div>
              <p className="text-foreground text-sm">Choose wisely...</p>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <Button onClick={handleTakeGuaranteed} className="bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald hover:bg-neon-emerald/30 py-4 text-lg">
                  🛡️ Take 2 Guaranteed Spins
                </Button>
                <Button onClick={handleOpenVoidBox} className="bg-neon-purple/20 border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/30 py-4 text-lg">
                  <Gift className="w-5 h-5 mr-2" />
                  Open the Void Box
                </Button>
                <p className="text-[10px] text-muted-foreground">40% empty · 55% modest · 5% LEGENDARY 7!</p>
              </div>
            </motion.div>
          )}

          {/* Result */}
          {phase === 'result' && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              {reaganQuote && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm italic font-display px-4 py-2 rounded-lg ${
                    mood === 'spiteful' ? 'bg-neon-amber/10 text-neon-amber border border-neon-amber/30' :
                    mood === 'shocked' ? 'bg-destructive/10 text-destructive border border-destructive/30' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  "{reaganQuote}"
                </motion.div>
              )}

              <div className="text-6xl mb-2 font-display">{spinsWon}</div>
              <h3 className="font-display text-xl text-foreground">
                {mood === 'spiteful' ? 'REAGAN KEEPS HIS TREASURE!' : 'SPINS RELUCTANTLY GRANTED'}
              </h3>
              <p className="text-muted-foreground text-sm">{message}</p>
              <Button onClick={handleClose} className="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 mt-4 w-full py-4 font-display">
                Return
              </Button>
            </motion.div>
          )}

          {/* Abandon button */}
          {phase !== 'intro' && phase !== 'result' && (
            <Button
              variant="ghost"
              onClick={handleClose}
              className="mt-4 text-muted-foreground/50 hover:text-foreground text-xs"
            >
              Abandon the Vision
            </Button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
