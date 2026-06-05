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

  const { data, error } = await supabaseAdmin.from("submissions").insert([
    {
      form_id,
      data: payload,
      received_at,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", data }, { status: 201 });
}
