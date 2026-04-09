import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoardStore } from '@/store/boardStore';
import { SFX } from '@/lib/sfx';
import confetti from 'canvas-confetti';
import { X, Sparkles, HelpCircle, Dice1, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GameMode = 'idle' | 'trivia' | 'riddle' | 'gamble';
type GamePhase = 'intro' | 'playing' | 'result';

interface TriviaQ {
  question: string;
  options: string[];
  answer: number;
}

// Client-side fallback questions (no API needed)
const triviaBank: TriviaQ[] = [
  { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi Body"], answer: 1 },
  { question: "How many continents are there?", options: ["5", "6", "7", "8"], answer: 2 },
  { question: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], answer: 2 },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3 },
  { question: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], answer: 2 },
  { question: "Who painted the Mona Lisa?", options: ["Picasso", "Van Gogh", "Da Vinci", "Monet"], answer: 2 },
  { question: "What is 12 × 12?", options: ["124", "144", "132", "156"], answer: 1 },
  { question: "Which animal is the tallest in the world?", options: ["Elephant", "Giraffe", "Horse", "Camel"], answer: 1 },
];

const riddleBank = [
  { riddle: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", answer: "A map" },
  { riddle: "The more you take, the more you leave behind. What am I?", answer: "Footsteps" },
  { riddle: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "An echo" },
  { riddle: "What has keys but can't open locks?", answer: "A piano" },
  { riddle: "I have hands but can't clap. What am I?", answer: "A clock" },
];

export const ReaganGame = () => {
  const { aiGameOpen, setAiGameOpen, addSpins } = useBoardStore();
  const [mode, setMode] = useState<GameMode>('idle');
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [message, setMessage] = useState('');
  const [spinsWon, setSpinsWon] = useState(0);
  
  // Trivia state
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQ[]>([]);
  const [triviaIdx, setTriviaIdx] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  
  // Riddle state
  const [currentRiddle, setCurrentRiddle] = useState<{ riddle: string; answer: string } | null>(null);
  const [riddleRevealed, setRiddleRevealed] = useState(false);
  
  // Gamble state
  const [gambleResult, setGambleResult] = useState<number | null>(null);

  const startRandomMode = useCallback(async () => {
    await SFX.mystical();
    const roll = Math.random();
    if (roll < 0.33) {
      // Trivia
      const shuffled = [...triviaBank].sort(() => Math.random() - 0.5).slice(0, 3);
      setTriviaQuestions(shuffled);
      setTriviaIdx(0);
      setTriviaScore(0);
      setMode('trivia');
      setPhase('playing');
    } else if (roll < 0.66) {
      // Riddle
      const r = riddleBank[Math.floor(Math.random() * riddleBank.length)];
      setCurrentRiddle(r);
      setRiddleRevealed(false);
      setMode('riddle');
      setPhase('playing');
    } else {
      // Cosmic Gamble
      setGambleResult(null);
      setMode('gamble');
      setPhase('playing');
    }
  }, []);

  const handleTriviaAnswer = useCallback(async (idx: number) => {
    const q = triviaQuestions[triviaIdx];
    const correct = idx === q.answer;
    const newScore = correct ? triviaScore + 1 : triviaScore;
    
    if (correct) await SFX.confirm();
    else await SFX.error();

    if (triviaIdx < triviaQuestions.length - 1) {
      setTriviaScore(newScore);
      setTriviaIdx(triviaIdx + 1);
    } else {
      // End trivia
      const earned = newScore + 1; // 1-4 spins based on score
      setSpinsWon(earned);
      addSpins(earned);
      setMessage(`You got ${newScore}/${triviaQuestions.length} correct! +${earned} spins!`);
      setPhase('result');
      if (earned >= 3) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    }
  }, [triviaQuestions, triviaIdx, triviaScore, addSpins]);

  const handleRiddleCorrect = useCallback(async () => {
    const earned = 3 + Math.floor(Math.random() * 3); // 3-5
    setSpinsWon(earned);
    addSpins(earned);
    setMessage(`Correct! The answer was: ${currentRiddle?.answer}. +${earned} spins!`);
    setPhase('result');
    await SFX.prizeReveal();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
  }, [currentRiddle, addSpins]);

  const handleRiddleWrong = useCallback(async () => {
    setSpinsWon(1);
    addSpins(1);
    setMessage(`The answer was: ${currentRiddle?.answer}. +1 consolation spin.`);
    setPhase('result');
    await SFX.error();
  }, [currentRiddle, addSpins]);

  const handleTakeGuaranteed = useCallback(async () => {
    setSpinsWon(2);
    addSpins(2);
    setGambleResult(2);
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
      earned = 1 + Math.floor(Math.random() * 3); // 1-3
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
    setGambleResult(earned);
    setPhase('result');
  }, [addSpins]);

  const handleClose = () => {
    setAiGameOpen(false);
    setMode('idle');
    setPhase('intro');
    setSpinsWon(0);
    setMessage('');
  };

  if (!aiGameOpen) return null;

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
          className="w-full max-w-lg mx-4 text-center"
        >
          {/* Title */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-8"
          >
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-widest text-neon-purple drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              REAGAN THE MAGNIFICENT
            </h2>
          </motion.div>

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

          {/* Trivia mode */}
          {phase === 'playing' && mode === 'trivia' && triviaQuestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-display">TRIVIA {triviaIdx + 1}/{triviaQuestions.length}</span>
                <span className="text-xs text-neon-emerald font-display">{triviaScore} correct</span>
              </div>
              <p className="text-foreground font-semibold text-lg">{triviaQuestions[triviaIdx].question}</p>
              <div className="grid grid-cols-1 gap-2">
                {triviaQuestions[triviaIdx].options.map((opt, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    onClick={() => handleTriviaAnswer(i)}
                    className="glass-panel border-white/10 text-foreground hover:border-neon-purple/50 hover:bg-neon-purple/10 text-left justify-start py-3"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Riddle mode */}
          {phase === 'playing' && mode === 'riddle' && currentRiddle && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-neon-amber" />
                <span className="text-xs text-muted-foreground font-display">RIDDLE CHALLENGE</span>
              </div>
              <p className="text-foreground font-semibold text-lg italic">"{currentRiddle.riddle}"</p>
              {!riddleRevealed ? (
                <div className="flex gap-3 justify-center pt-2">
                  <Button onClick={() => setRiddleRevealed(true)} className="bg-neon-amber/20 border border-neon-amber/50 text-neon-amber hover:bg-neon-amber/30">
                    Reveal Answer
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-neon-cyan font-display">{currentRiddle.answer}</p>
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

          {/* Cosmic Gamble mode */}
          {phase === 'playing' && mode === 'gamble' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Dice1 className="w-5 h-5 text-neon-amber" />
                <span className="text-xs text-muted-foreground font-display">THE COSMIC GAMBLE</span>
              </div>
              <p className="text-foreground text-sm">Choose wisely...</p>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <Button
                  onClick={handleTakeGuaranteed}
                  className="bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald hover:bg-neon-emerald/30 py-4 text-lg"
                >
                  🛡️ Take 2 Guaranteed Spins
                </Button>
                <Button
                  onClick={handleOpenVoidBox}
                  className="bg-neon-purple/20 border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/30 py-4 text-lg relative overflow-hidden"
                >
                  <Gift className="w-5 h-5 mr-2" />
                  Open the Void Box (40% empty, 5% legendary 7!)
                </Button>
              </div>
            </motion.div>
          )}

          {/* Result */}
          {phase === 'result' && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel-strong p-6 rounded-2xl space-y-4">
              <div className="text-5xl mb-2">{spinsWon >= 5 ? '🌟' : spinsWon > 0 ? '✨' : '💨'}</div>
              <h3 className="font-display text-xl text-foreground">✨ Magnificent Blessing ✨</h3>
              <p className="text-foreground">{message}</p>
              <p className="font-display text-3xl text-neon-amber">+{spinsWon} Spins</p>
              <Button onClick={handleClose} className="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 mt-4">
                Return to Board
              </Button>
            </motion.div>
          )}

          {/* Close button */}
          {phase !== 'intro' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
