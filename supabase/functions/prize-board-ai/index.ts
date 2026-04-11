import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CURRICULUM_INTEL = `
Context: 4th-5th Grade Classroom.
Programs:
- Reading Mastery Transformations (4th/5th grade reading comprehension & fluency)
- Saxon Math (Incremental Development, Mixed Review — place value, fractions, measurement, geometry basics)
- Shurley English Level 4 (Sentence parsing, Question/Answer Flow, Jingles, Parts of Speech, Sentence Patterns)
- Core Knowledge History & Science (Grade 4 sequences: Medieval Europe, Energy & Matter, Human Body Systems, Exploration & Settlement)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, theme, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (mode) {
      case "scholarly_sprint":
        systemPrompt = `You are Reagan the Magnificent, a mystical all-knowing oracle who guards his spins jealously. Based on this curriculum context: ${CURRICULUM_INTEL}
Generate 3 trivia questions ${topic ? `specifically about "${topic}"` : 'spanning Saxon Math, Shurley English, or Core Knowledge'}. Level: 4th/5th Grade. Each question has 3 multiple choice answers. Return valid JSON only: { "questions": [ { "q": "question text", "a": ["answer1", "answer2", "answer3"] } ] }`;
        userPrompt = "Summon the Scholarly Sprint!";
        break;

      case "voids_paradox":
        systemPrompt = `You are Reagan the Magnificent. Generate 3 serious-sounding but completely NONSENSICAL academic 'trap' questions. They should sound like real academic questions but be conceptually impossible or absurd. Each has 3 plausible-looking answers (all equally nonsensical). Return valid JSON only: { "questions": [ { "q": "question text", "a": ["answer1", "answer2", "answer3"] } ] }`;
        userPrompt = "Open the Void's Paradox!";
        break;

      case "mind_bender":
        systemPrompt = `Generate 1 clever logic riddle or lateral thinking puzzle appropriate for smart 4th/5th graders. It should be tricky but solvable. Return valid JSON only: { "riddle": "the riddle text", "answer": "the answer" }`;
        userPrompt = "Summon the Mind-Bender!";
        break;

      // Legacy modes for backward compat
      case "reagan":
        systemPrompt = `You are Reagan the Magnificent, a mystical all-knowing oracle. Based on: ${CURRICULUM_INTEL}. Generate 3 trivia questions ${topic ? `about "${topic}"` : 'spanning Saxon Math, Shurley English, or Core Knowledge'}. 4th/5th Grade level. Return valid JSON only: { "questions": [ { "q": "question text", "a": ["answer1", "answer2", "answer3"] } ] }`;
        userPrompt = "Summon the trials of knowledge!";
        break;
      case "riddle":
        systemPrompt = `Generate 1 clever riddle appropriate for 4th graders. Return valid JSON only: { "riddle": "the riddle text", "answer": "the answer" }`;
        userPrompt = "Give me a riddle!";
        break;

      case "blessing":
        systemPrompt = `You are Reagan the Magnificent, a mystical oracle who HATES giving away prizes. Give a dramatic, funny, one-sentence mystical blessing or spiteful prophecy for a student who just won a prize. Keep it school-appropriate and under 30 words. Return just the blessing text, no quotes.`;
        userPrompt = "Bestow your blessing upon this worthy soul!";
        break;

      case "mystery_box":
        systemPrompt = `You are Reagan the Magnificent. Generate ONE unique, creative, fun classroom reward for a 4th/5th grader. It should be imaginative and exciting but realistic for a school setting. Examples: "DJ the Class Playlist for 10 Minutes", "Choose the Read-Aloud Book", "Wear Sunglasses All Day Pass". Return just the reward text, no quotes, under 10 words.`;
        userPrompt = "Open the Mystery Box!";
        break;

      case "theme":
        systemPrompt = `Generate 8 prize types for a classroom reward board with the given theme. Return valid JSON only: { "prizes": [ { "name": "prize name", "count": number, "emoji": "single emoji", "rare": boolean } ] }. Counts must sum to exactly 100. Make 2-3 prizes rare.`;
        userPrompt = `Theme: ${theme || "Space Adventure"}`;
        break;

      case "whammy_taunt":
        systemPrompt = `You are Reagan the Magnificent. A student just triggered a Whammy Trap and you GET TO KEEP their prize! Give a short (under 20 words), gleefully spiteful, school-appropriate taunt. Be dramatic and villainous. Return just the text.`;
        userPrompt = "Reagan eats the prize!";
        break;

      default:
        return new Response(JSON.stringify({ error: "Invalid mode" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prize-board-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
