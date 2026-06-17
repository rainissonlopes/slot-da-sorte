const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Helper function to read and parse environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local file not found at the root of the project!");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      env[key] = val;
    }
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not configured in .env.local!");
    process.exit(1);
  }

  console.log("Initializing Supabase client...");
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("Fetching external game signals from old API...");
  const apiRes = await fetch("https://reidoslotsinais.bet/api/cards", {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!apiRes.ok) {
    throw new Error(`Failed to fetch cards: ${apiRes.statusText}`);
  }

  const data = await apiRes.json();
  const cards = data.cards || [];
  console.log(`Retrieved ${cards.length} games from the external API.`);

  console.log("Fetching existing signals from Supabase database to prevent duplicates...");
  const { data: existingSinais, error: selectError } = await supabase
    .from("sinais")
    .select("nome_jogo");

  if (selectError) {
    throw selectError;
  }

  const existingNames = new Set(
    (existingSinais || []).map((s) => s.nome_jogo.toLowerCase().trim())
  );

  const toInsert = [];
  for (const card of cards) {
    const name = card.nomeJogo ? card.nomeJogo.trim() : "";
    if (!name) continue;

    if (existingNames.has(name.toLowerCase())) {
      console.log(`Skipping duplicate signal: "${name}"`);
      continue;
    }

    toInsert.push({
      nome_jogo: name,
      categoria_jogo: card.categoriaJogo || "PG",
      imagem_url: String(card.id),
      cor_background: card.colorBgGame || "#1c1c1e",
      bets: card.bets || []
    });
  }

  if (toInsert.length === 0) {
    console.log("No new signals to import.");
    return;
  }

  console.log(`Inserting ${toInsert.length} new signals into Supabase...`);
  const { error: insertError } = await supabase
    .from("sinais")
    .insert(toInsert);

  if (insertError) {
    throw insertError;
  }

  console.log("Migration completed successfully!");
}

run().catch((err) => {
  console.error("Fatal error during migration:", err);
  process.exit(1);
});
