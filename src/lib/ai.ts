import { supabase } from '@/integrations/supabase/client';

export type AIMode = 'scholarly_sprint' | 'voids_paradox' | 'mind_bender' | 'reagan' | 'riddle' | 'blessing' | 'mystery_box' | 'theme' | 'whammy_taunt';

export async function callPrizeBoardAI(mode: AIMode, theme?: string, topic?: string) {
  const { data, error } = await supabase.functions.invoke('prize-board-ai', {
    body: { mode, theme, topic },
  });

  if (error) {
    console.error('AI function error:', error);
    return null;
  }

  const result = data?.result;
  if (!result) return null;

  // For modes that return plain text
  if (mode === 'blessing' || mode === 'mystery_box' || mode === 'whammy_taunt') return result;

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse AI response:', result);
    return null;
  }
}

// --- Curriculum Question API (server-side validated) ---

export interface CurriculumQuestion {
  id: string;
  question: string;
  options: string[];
  subject: string;
  difficulty: string;
  category: string | null;
}

export async function getCurriculumQuestion(
  subject?: string,
  grade?: number,
  excludeIds?: string[]
): Promise<CurriculumQuestion | null> {
  const { data, error } = await supabase.functions.invoke('get-question', {
    body: { subject, grade, excludeIds },
  });

  if (error) {
    console.error('get-question error:', error);
    return null;
  }

  if (data?.exhausted) return null; // No more questions

  return data as CurriculumQuestion;
}

export async function validateAnswer(
  questionId: string,
  answer: string
): Promise<{ correct: boolean; correctAnswer: string } | null> {
  const { data, error } = await supabase.functions.invoke('validate-answer', {
    body: { questionId, answer },
  });

  if (error) {
    console.error('validate-answer error:', error);
    return null;
  }

  return data as { correct: boolean; correctAnswer: string };
}
