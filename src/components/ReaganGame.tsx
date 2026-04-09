import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoardStore } from '@/store/boardStore';
import { SFX } from '@/lib/sfx';
import { callPrizeBoardAI } from '@/lib/ai';
import confetti from 'canvas-confetti';
import { X, Sparkles, Dice1, Gift, HelpCircle, Loader2, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type GameMode = 'idle' | 'trivia' | 'riddle' | 'gamble';
type GamePhase = 'intro' | 'loading' | 'playing' | 'result';

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

const TIMER_DURATION = 15; // seconds — fairly intense for 4th graders

interface AIQuestion {
  q: string;
  a: string[];
}

export const ReaganGame = () => {
  const { aiGameOpen, setAiGameOpen, addSpins } = useBoardStore();
  const [mode, setMode] = useState<GameMode>('idle');
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [message, setMessage] = useState('');
  const [spinsWon, setSpinsWon] = useState(0);

  // Trivia
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);

  // Riddle
  const [riddle, setRiddle] = useState<{ riddle: string; answer: string } | null>(null);
  const [riddleRevealed, setRiddleRevealed] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerActive, setTimerActive] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Distractions
  const [distraction, setDistraction] = useState('');
  const [distractionVisible, setDistractionVisible] = useState(false);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Countdown timer effect
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
          SFX.error();
          return 0;
        }
        // Tick sound in last 5 seconds
        if (prev <= 6) {
          SFX.lottoTick(prev <= 3 ? 'E5' : 'C5');
        }
        // Random distractions
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

  const startRandomMode = useCallback(async () => {
    await SFX.mystical();
    setPhase('loading');
    setDistractionVisible(false);

    const roll = Math.random();
    if (roll < 0.4) {
      const data = await callPrizeBoardAI('reagan');
      if (data?.questions) {
        setQuestions(data.questions);
        setQIdx(0);
        setMode('trivia');
        setPhase('playing');
        startTimer();
      } else {
        setQuestions([
          { q: "What is the scientific name for the process of a caterpillar becoming a butterfly?", a: ["Metamorphosis", "Photosynthesis", "Mitosis"] },
          { q: "How many sides does a dodecahedron have?", a: ["12", "10", "20"] },
          { q: "What color is a giraffe's tongue?", a: ["Purple/Black", "Pink", "Red"] },
        ]);
        setQIdx(0);
        setMode('trivia');
        setPhase('playing');
        startTimer();
      }
    } else if (roll < 0.7) {
      const data = await callPrizeBoardAI('riddle');
      if (data?.riddle) {
        setRiddle(data);
        setRiddleRevealed(false);
        setMode('riddle');
        setPhase('playing');
        startTimer();
      } else {
        setRiddle({ riddle: "I have cities, but no houses. I have mountains, but no trees. What am I?", answer: "A map" });
        setRiddleRevealed(false);
        setMode('riddle');
        setPhase('playing');
        startTimer();
      }
    } else {
      setMode('gamble');
      setPhase('playing');
    }
  }, [startTimer]);

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
      setMessage(`Reagan has weighed your soul... +${earned} spins!`);
      setPhase('result');
      if (earned >= 5) {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#8b5cf6', '#fbbf24', '#10b981'] });
      }
      await SFX.prizeReveal();
    }
  }, [qIdx, questions, addSpins, startTimer, stopTimer]);

  const handleRiddleCorrect = useCallback(async () => {
    stopTimer();
    const earned = 3 + Math.floor(Math.random() * 3);
    setSpinsWon(earned);
    addSpins(earned);
    setMessage(`Correct! The answer was: ${riddle?.answer}. +${earned} spins!`);
    setPhase('result');
    await SFX.prizeReveal();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
  }, [riddle, addSpins, stopTimer]);

  const handleRiddleWrong = useCallback(async () => {
    stopTimer();
    setSpinsWon(1);
    addSpins(1);
    setMessage(`The answer was: ${riddle?.answer}. +1 consolation spin.`);
    setPhase('result');
    await SFX.error();
  }, [riddle, addSpins, stopTimer]);

  const handleTakeGuaranteed = useCallback(async () => {
    setSpinsWon(2);
    addSpins(2);
    setMessage('Safe choice! +2 guaranteed spins!');
    setPhase('result');
    await SFX.confirm();
  }, [addSpins]);

  const handleOpenVoidBox = useCallback(async () => {
    await SFX.mystical();
    const roll = Math.random();
    let earned: number;
    if (roll < 0.4) {
      earned = 0;
      setMessage('The Void Box was empty... 0 spins.');
      await SFX.error();
    } else if (roll < 0.95) {
      earned = 1 + Math.floor(Math.random() * 3);
      setMessage(`The Void Box contained... +${earned} spins!`);
      await SFX.confirm();
    } else {
      earned = 7;
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
    setDistractionVisible(false);
    setTimerExpired(false);
  };

  if (!aiGameOpen) return null;

  const TimerBar = () => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-neon-amber'}`} />
          <span className={`font-display text-sm tracking-wider ${timeLeft <= 5 ? 'text-destructive' : 'text-neon-amber'}`}>
            {timeLeft}s
          </span>
        </div>
        {timeLeft <= 5 && (
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-xs font-display text-destructive"
          >
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
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'radial-gradient(circle at center, rgba(88, 28, 135, 0.95) 0%, rgba(15, 23, 42, 1) 100%)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg mx-4 text-center relative"
        >
          {/* Floating crystal ball */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-6"
          >
            <div className="text-7xl mb-3 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">🔮</div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-widest text-neon-purple">
              REAGAN THE MAGNIFICENT
            </h2>
          </motion.div>

          {/* Distraction overlay */}
          <AnimatePresence>
            {distractionVisible && phase === 'playing' && (mode === 'trivia' || mode === 'riddle') && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`absolute top-0 left-0 right-0 italic text-sm font-display z-20 ${
                  timerExpired ? 'text-destructive font-bold text-lg' : 'text-neon-amber/80'
                }`}
              >
                "{distraction}"
              </motion.div>
            )}
          </AnimatePresence>

          {/* Intro */}
          {phase === 'intro' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <p className="text-muted-foreground italic">Piercing the veil of reality...</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={startRandomMode}
                  className="bg-neon-purple/20 border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/30 font-display text-lg px-8 py-4"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  ✨ Get Blessing
                </Button>
                <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  Return
                </Button>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Loader2 className="w-8 h-8 text-neon-purple mx-auto animate-spin" />
              <p className="text-muted-foreground italic">Consulting the infinite void...</p>
            </motion.div>
          )}

          {/* Trivia */}
          {phase === 'playing' && mode === 'trivia' && questions.length > 0 && (
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

          {/* Riddle */}
          {phase === 'playing' && mode === 'riddle' && riddle && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <TimerBar />
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-neon-amber" />
                <span className="text-xs text-muted-foreground font-display">RIDDLE CHALLENGE</span>
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
              <div className="text-6xl mb-2 font-display">{spinsWon}</div>
              <h3 className="font-display text-xl text-foreground">SPINS GRANTED</h3>
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
