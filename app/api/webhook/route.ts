import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

function extractFormId(payload: any) {
  if (!payload || typeof payload !== 'object') return null;
  const formValue = payload._xform_id_string || payload.form || payload._form_id || payload.form_id;
  return typeof formValue === 'string' ? formValue : null;
}

function extractReceivedAt(payload: any) {
  if (!payload || typeof payload !== 'object') return new Date().toISOString();
  return payload._submission_time || payload.submission_time || payload.received_at || new Date().toISOString();
}

async function resolveFormShort(xform_id_string: string | null): Promise<string | null> {
  if (!xform_id_string) return null;
  const { data, error } = await supabaseAdmin
    .from("form_mapping")
    .select("form_short")
    .eq("xform_id_string", xform_id_string)
    .single();
  if (error || !data) {
    console.warn("[webhook] UID inconnu dans form_mapping →", xform_id_string);
    return null;
  }
  return data.form_short;
}

export async function POST(request: Request) {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload must be a JSON object." }, { status: 400 });
  }

  const xform_id = payload._xform_id_string ?? null;
  const form_id = extractFormId(payload);
  const received_at = extractReceivedAt(payload);

  // 1. Enregistre la soumission
  const { data, error } = await supabaseAdmin
    .from("submissions")
    .insert([{ form_id, data: payload, received_at }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. device_fp est directement dans le payload KoboToolbox
  const deviceFp: string | undefined = payload?.device_fp;

  if (deviceFp && typeof deviceFp === "string" && deviceFp.trim()) {
    // Résout f1/f2 via form_mapping (basé sur _xform_id_string)
    const formShort = await resolveFormShort(xform_id);

    if (formShort) {
      const { error: dsError } = await supabaseAdmin
        .from("device_statuses")
        .upsert(
          { fp: deviceFp.trim(), form_id: formShort, submitted_at: received_at },
          { onConflict: "fp,form_id" }
        );
      if (dsError) {
        console.error("[webhook] Erreur upsert device_statuses:", dsError.message);
      } else {
        console.log(`[webhook] device_statuses mis à jour — fp: ${deviceFp} form: ${formShort}`);
      }
    } else {
      console.warn("[webhook] form_short introuvable pour xform_id:", xform_id);
    }
  } else {
    console.warn("[webhook] device_fp absent du payload");
  }

  return NextResponse.json({ status: "ok", data }, { status: 201 });
}
