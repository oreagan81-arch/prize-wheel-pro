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
