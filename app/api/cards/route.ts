export async function GET() {

  try {

    const response = await fetch(
      "https://reidoslotsinais.bet/api/cards",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        },

        cache: "no-store"
      }
    );

    const data = await response.json();

    return Response.json(data);

  } catch (error) {

    return Response.json(
      {
        error: "Erro ao buscar cards"
      },
      {
        status: 500
      }
    );

  }
}