import { NextResponse } from "next/server";

const KOBO_TOKEN = process.env.NEXT_PUBLIC_KOBO_TOKEN || "1c4aa6d6d1fb7c014b90716924f7b6962621a103";
const KOBO_API_URL = "https://kf.kobotoolbox.org/api/v2";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const formId = searchParams.get("formId");

  if (!formId) {
    return NextResponse.json({ error: "formId requis" }, { status: 400 });
  }

  try {
    const response = await fetch(`${KOBO_API_URL}/assets/${formId}/data/`, {
      headers: {
        "Authorization": `Token ${KOBO_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erreur KoboToolbox: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
