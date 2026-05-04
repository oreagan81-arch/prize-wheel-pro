import { useMemo, useState } from "react";
import { useBoardStore } from "@/store/boardStore";
import { StudentSpinner } from "./StudentSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SFX } from "@/lib/sfx";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Teacher panel: paste a roster, hit "Spin for Next Student!", then tap
 * an empty tile to place the chosen student. Uses store.pendingStudent
 * so any tile click consumes it.
 */
export const SpinnerPanel = () => {
  const roster = useBoardStore((s) => s.roster);
  const pendingStudent = useBoardStore((s) => s.pendingStudent);
  const setPendingStudent = useBoardStore((s) => s.setPendingStudent);

  // Local entry: comma- or newline-separated. Defaults to saved roster.
  const [input, setInput] = useState<string>(roster.join(", "));
  const [isSpinning, setIsSpinning] = useState(false);

  const students = useMemo(
    () =>
      input
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [input],
  );

  const handleSpin = () => {
    if (students.length < 2) {
      toast.error("Add at least 2 students to spin");
      return;
    }
    if (isSpinning) return;
    setPendingStudent(null);
    setIsSpinning(true);
    SFX.click();
  };

  const handleSelect = (winner: string) => {
    setIsSpinning(false);
    setPendingStudent(winner);
    toast.success(`🎯 ${winner} won the spin — tap a tile to place them`);
  };

  const handleCancel = () => {
    setPendingStudent(null);
    toast("Placement cancelled");
  };

  return (
    <section className="glass-panel-strong rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-neon-amber" />
        <h2 className="font-display text-sm tracking-[0.3em] uppercase text-neon-amber">
          Random Student Picker
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-display uppercase tracking-widest text-muted-foreground">
            Students (comma separated)
          </label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="John, Sarah, Mike, Emma"
            rows={2}
            className="bg-void/60 border-white/10 text-foreground font-sans resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            {students.length} student{students.length === 1 ? "" : "s"} loaded
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleSpin}
          disabled={isSpinning || students.length < 2}
          className="h-14 px-8 text-base font-display tracking-wider bg-gradient-to-r from-neon-amber via-neon-amber to-neon-emerald text-void hover:opacity-90 disabled:opacity-40 shadow-lg shadow-neon-amber/30"
        >
          🎰 Spin for Next Student!
        </Button>
      </div>

      <StudentSpinner
        students={students}
        onSelect={handleSelect}
        isSpinning={isSpinning}
      />

      {pendingStudent && (
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-neon-amber/60 bg-neon-amber/10 px-4 py-3 animate-pulse">
          <p className="font-display text-sm sm:text-base text-neon-amber">
            👉 Select a tile on the board to place{" "}
            <span className="font-bold tracking-wider">{pendingStudent}</span>
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </section>
  );
};

export default SpinnerPanel;
