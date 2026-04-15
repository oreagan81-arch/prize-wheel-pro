import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subject, grade, difficulty, excludeIds } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("questions")
      .select("id, question, options, subject, difficulty, category");

    if (subject) query = query.eq("subject", subject);
    if (grade) query = query.eq("grade", grade);
    if (difficulty) query = query.eq("difficulty", difficulty);
    if (excludeIds && excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    // Get a random question by fetching all matching and picking one
    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ exhausted: true, message: "No more questions available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick random question
    const question = data[Math.floor(Math.random() * data.length)];

    // Shuffle the options (Fisher-Yates) — NEVER include correctAnswer
    const shuffledOptions = shuffle(question.options as string[]);

    return new Response(
      JSON.stringify({
        id: question.id,
        question: question.question,
        options: shuffledOptions,
        subject: question.subject,
        difficulty: question.difficulty,
        category: question.category,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
