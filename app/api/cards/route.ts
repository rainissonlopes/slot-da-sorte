// Deprecated: Sinais are now fetched directly from Supabase.
export async function GET() {
  return Response.json({ cards: [] });
}