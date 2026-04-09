import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, theme } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (mode) {
      case "reagan":
        systemPrompt = `You are Reagan the Magnificent, a mystical all-knowing oracle. Generate 3 academic-sounding but slightly nonsensical trivia questions with 3 multiple choice answers each. Return valid JSON only: { "questions": [ { "q": "question text", "a": ["answer1", "answer2", "answer3"] } ] }`;
        userPrompt = "Summon the trials of knowledge!";
        break;
      case "riddle":
        systemPrompt = `Generate 1 clever riddle appropriate for 4th graders. Return valid JSON only: { "riddle": "the riddle text", "answer": "the answer" }`;
        userPrompt = "Give me a riddle!";
        break;
      case "blessing":
        systemPrompt = `You are Reagan the Magnificent, a mystical oracle. Give a dramatic, funny, one-sentence mystical blessing or prophecy for a student who just won a prize. Keep it school-appropriate and under 30 words. Return just the blessing text, no quotes.`;
        userPrompt = "Bestow your blessing upon this worthy soul!";
        break;
      case "theme":
        systemPrompt = `Generate 8 prize types for a classroom reward board with the given theme. Return valid JSON only: { "prizes": [ { "name": "prize name", "count": number, "emoji": "single emoji", "rare": boolean } ] }. Counts must sum to exactly 100. Make 2-3 prizes rare.`;
        userPrompt = `Theme: ${theme || "Space Adventure"}`;
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
