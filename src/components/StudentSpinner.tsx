import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface StudentSpinnerProps {
  students: string[];
  onSelect: (student: string) => void;
  isSpinning: boolean;
}

/**
 * Press-Your-Luck style spinner. Standalone component — not yet wired into the app.
 * Cycles through `students` quickly then decelerates over ~3.5s before locking in
 * a random pick. Flashes on landing and fires `onSelect` with the winner.
 */
export const StudentSpinner = ({ students, onSelect, isSpinning }: StudentSpinnerProps) => {
  const [display, setDisplay] = useState<string>(students[0] ?? "—");
  const [winner, setWinner] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  const studentsRef = useRef(students);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    if (!isSpinning || students.length === 0) return;

    setWinner(null);
    setCelebrating(false);

    const startTime = performance.now();
    const duration = 3500; // ms
    const startInterval = 50; // ms between name swaps at start
    const endInterval = 380; // ms between swaps at the end (slow reveal)

    const finalIndex = Math.floor(Math.random() * studentsRef.current.length);
    let lastSwap = 0;
    let idx = Math.floor(Math.random() * studentsRef.current.length);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic for deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      const interval = startInterval + (endInterval - startInterval) * eased;

      if (now - lastSwap >= interval) {
        idx = (idx + 1) % studentsRef.current.length;
        setDisplay(studentsRef.current[idx]);
        lastSwap = now;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const pick = studentsRef.current[finalIndex];
        setDisplay(pick);
        setWinner(pick);
        setCelebrating(true);
        onSelectRef.current(pick);
        timeoutRef.current = window.setTimeout(() => setCelebrating(false), 1800);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, students.length]);

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
        Student Selector
      </div>

      <div
        className={cn(
          "relative w-full max-w-xl rounded-2xl border-4 border-neon-amber/40 bg-void px-8 py-10",
          "shadow-[inset_0_0_40px_rgba(0,0,0,0.9),0_0_30px_hsl(var(--neon-amber)/0.2)]",
          "transition-colors duration-150 will-change-transform",
          celebrating && "animate-pulse border-neon-emerald bg-neon-emerald/10",
        )}
      >
        {/* scanline overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)",
          }}
          aria-hidden
        />

        <div
          className={cn(
            "text-center font-display font-bold tabular-nums",
            "text-5xl md:text-7xl tracking-wider",
            "drop-shadow-[0_0_18px_hsl(var(--neon-amber)/0.7)]",
            celebrating ? "text-neon-emerald" : "text-neon-amber",
          )}
          style={{ textShadow: "0 0 12px currentColor" }}
        >
          {display || "—"}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full bg-neon-amber/30",
                isSpinning && "animate-pulse",
                celebrating && "bg-neon-emerald",
              )}
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="h-5 font-sans text-sm text-muted-foreground">
        {winner ? (
          <span>
            Winner: <span className="font-semibold text-neon-emerald">{winner}</span>
          </span>
        ) : isSpinning ? (
          <span className="animate-pulse">Spinning…</span>
        ) : (
          <span>Ready</span>
        )}
      </div>
    </div>
  );
};

export default StudentSpinner;
