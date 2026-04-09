import { supabase } from '@/integrations/supabase/client';

export async function callPrizeBoardAI(mode: 'reagan' | 'riddle' | 'blessing' | 'theme', theme?: string) {
  const { data, error } = await supabase.functions.invoke('prize-board-ai', {
    body: { mode, theme },
  });

  if (error) {
    console.error('AI function error:', error);
    return null;
  }

  const result = data?.result;
  if (!result) return null;

  // For modes that return JSON, try to parse
  if (mode === 'blessing') return result;

  try {
    // Strip markdown code fences if present
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse AI response:', result);
    return null;
  }
}
