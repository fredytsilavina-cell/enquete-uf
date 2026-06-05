import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.from("config").select("id, value");
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mapper les données pour le frontend
    const urls = {
      url1: data?.find(r => r.id === "url1")?.value ?? "",
      url2: data?.find(r => r.id === "url2")?.value ?? "",
    };

    return NextResponse.json(urls);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
