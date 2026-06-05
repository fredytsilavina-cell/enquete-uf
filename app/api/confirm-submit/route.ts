import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

/**
 * GET /api/confirm-submit?fp=XXXX&form=f1|f2
 * ─────────────────────────────────────────────────────────────────────────────
 * KoboToolbox (Enketo) redirige ici après que l'étudiant a VRAIMENT soumis
 * son formulaire (via le paramètre return_url ajouté dans l'URL du formulaire).
 *
 * Cette route :
 *  1. Marque l'appareil (fp) comme ayant soumis le formulaire (form) dans
 *     la table device_statuses — synchronisation durable en base de données.
 *  2. Redirige l'étudiant vers la page principale avec ?confirmed=f1|f2
 *     pour que l'UI se mette à jour sans rechargement manuel.
 *
 * Exemple d'URL générée dans SurveyPage :
 *   https://ee.kobotoolbox.org/x/xxx?device_fp=ABC123&form=genre_inclusion
 *     &return_url=https://enquete-uf.vercel.app/api/confirm-submit?fp=ABC123%26form=f1
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fp   = searchParams.get("fp")?.trim();
  const form = searchParams.get("form")?.trim(); // "f1" ou "f2"

  // URL de base de l'application (pour la redirection finale)
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // Validation basique
  if (!fp || !form || !["f1", "f2"].includes(form)) {
    console.warn("[confirm-submit] Paramètres invalides — fp:", fp, "form:", form);
    return NextResponse.redirect(`${appUrl}/`);
  }

  // ── Upsert dans device_statuses ──────────────────────────────────────────
  const { error } = await supabaseAdmin
    .from("device_statuses")
    .upsert(
      { fp, form_id: form, submitted_at: new Date().toISOString() },
      { onConflict: "fp,form_id" }
    );

  if (error) {
    console.error("[confirm-submit] Erreur upsert device_statuses:", error.message);
    // On redirige quand même — le localStorage et la vérif Supabase au prochain
    // chargement prendront le relais.
  } else {
    console.log(`[confirm-submit] Soumission confirmée — fp: ${fp} form: ${form}`);
  }

  // ── Redirection vers la page principale avec indicateur de confirmation ──
  return NextResponse.redirect(
    `${appUrl}/?confirmed=${form}&fp=${encodeURIComponent(fp)}`
  );
}
