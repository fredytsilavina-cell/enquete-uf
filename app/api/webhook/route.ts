import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

function extractFormId(payload: any) {
  if (!payload || typeof payload !== 'object') return null;
  const formValue = payload.form || payload._form_id || payload._xform_id_string || payload.form_id;
  return typeof formValue === 'string' ? formValue : null;
}

function extractReceivedAt(payload: any) {
  if (!payload || typeof payload !== 'object') return new Date().toISOString();
  return payload._submission_time || payload.submission_time || payload.received_at || new Date().toISOString();
}

export async function POST(request: Request) {
  let payload;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload must be a JSON object." }, { status: 400 });
  }

  const form_id = extractFormId(payload);
  const received_at = extractReceivedAt(payload);

  // ── 1. Enregistre la soumission KoboToolbox ──
  const { data, error } = await supabaseAdmin.from("submissions").insert([
    { form_id, data: payload, received_at },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── 2. Synchronise device_statuses depuis le device_fp du payload ──
  // Si l'étudiant a soumis via KoboToolbox avec son empreinte dans l'URL,
  // on marque l'appareil comme "soumis" en base pour bloquer toute double saisie.
  const deviceFp: string | undefined =
    payload?.device_fp ||
    payload?.["device_fp"] ||
    payload?.data?.device_fp;

  if (deviceFp && typeof deviceFp === "string" && deviceFp.trim()) {
    // Détermine form_id court (f1 / f2) depuis le champ "form" du payload
    const formShort =
      typeof payload?.form === "string" && payload.form.includes("genre") ? "f1"
      : typeof payload?.form === "string" && (payload.form.includes("vie") || payload.form.includes("etudiant")) ? "f2"
      : form_id?.toLowerCase().includes("genre") ? "f1"
      : form_id?.toLowerCase().includes("vie") || form_id?.toLowerCase().includes("etudiant") ? "f2"
      : null;

    if (formShort) {
      const { error: dsError } = await supabaseAdmin
        .from("device_statuses")
        .upsert(
          { fp: deviceFp.trim(), form_id: formShort, submitted_at: received_at },
          { onConflict: "fp,form_id" }
        );
      if (dsError) {
        console.error("[webhook] Erreur upsert device_statuses:", dsError.message);
      }
    }
  }

  return NextResponse.json({ status: "ok", data }, { status: 201 });
}
