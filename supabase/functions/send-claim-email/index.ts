import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const CLAIM_EMAIL_FROM = Deno.env.get("CLAIM_EMAIL_FROM") ?? "";
const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = Deno.env.get("GOOGLE_APPS_SCRIPT_WEBHOOK_URL") ?? "";
const GOOGLE_APPS_SCRIPT_SHARED_SECRET =
  Deno.env.get("GOOGLE_APPS_SCRIPT_SHARED_SECRET") ?? "";

function formatWhatsApp(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = digits.startsWith("503") && digits.length === 11 ? digits.slice(3) : digits;

  if (!/^[567]\d{7}$/.test(localDigits)) {
    return value;
  }

  return `+503 ${localDigits.slice(0, 4)}-${localDigits.slice(4)}`;
}

function htmlTemplate(claim: Record<string, string>) {
  return `
    <div style="background:#07110d;padding:32px;font-family:Arial,sans-serif;color:#f5fbf7;">
      <div style="max-width:640px;margin:0 auto;background:#0d1b14;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#00db72,#12b660);color:#041109;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Garage Car Services</p>
          <h1 style="margin:0;font-size:32px;line-height:1.05;">Tu registro fue confirmado</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin-top:0;font-size:16px;line-height:1.7;">
            Hola ${claim.first_name}, tu promocion de <strong>10% de descuento en mano de obra</strong> ya quedo registrada.
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;">
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">Correo</p>
              <strong>${claim.email}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">DUI</p>
              <strong>${claim.dui}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">WhatsApp</p>
              <strong>${formatWhatsApp(claim.whatsapp_phone)}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">Codigo</p>
              <strong>${claim.claimed_code}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">Vigencia</p>
              <strong>Hasta el 31 de mayo de 2026</strong>
            </div>
          </div>
          <h2 style="margin:24px 0 12px;font-size:18px;">Indicaciones para canjear</h2>
          <ul style="padding-left:18px;line-height:1.8;color:#d6e5db;">
            <li>Presenta tu DUI y el correo registrado al momento de tu visita.</li>
            <li>El beneficio aplica una sola vez por participante y por codigo.</li>
            <li>El descuento vence el 31 de mayo de 2026.</li>
          </ul>
          <h2 style="margin:24px 0 12px;font-size:18px;">Terminos y condiciones</h2>
          <ul style="padding-left:18px;line-height:1.8;color:#d6e5db;">
            <li>No aplica para servicios de cambio de aceite.</li>
            <li>No aplica para servicios de limpieza de frenos.</li>
            <li>No aplica para servicios de limpieza de inyectores y descarbonizacion de sistemas GDI, EFI y TSI.</li>
            <li>Fecha limite para registrarse: 16 de mayo de 2026.</li>
            <li>Fecha limite del descuento: 31 de mayo de 2026.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

function emailSubject() {
  return "Garage Car Services - Tu registro fue confirmado";
}

async function sendWithResend(claim: Record<string, string>) {
  if (!RESEND_API_KEY || !CLAIM_EMAIL_FROM) {
    throw new Error("RESEND_NOT_CONFIGURED");
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CLAIM_EMAIL_FROM,
      to: [claim.email],
      subject: emailSubject(),
      html: htmlTemplate(claim),
    }),
  });

  if (!resendResponse.ok) {
    throw new Error(await resendResponse.text());
  }
}

async function sendWithGoogleAppsScript(claim: Record<string, string>) {
  if (!GOOGLE_APPS_SCRIPT_WEBHOOK_URL || !GOOGLE_APPS_SCRIPT_SHARED_SECRET) {
    throw new Error("GMAIL_WEBHOOK_NOT_CONFIGURED");
  }

  const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret: GOOGLE_APPS_SCRIPT_SHARED_SECRET,
      to: claim.email,
      subject: emailSubject(),
      html: htmlTemplate(claim),
      claim,
    }),
  });

  const rawText = await response.text();
  let payload: Record<string, unknown> | null = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(rawText || "GMAIL_WEBHOOK_FAILED");
  }

  if (payload && payload.ok === false) {
    throw new Error(String(payload.error || "GMAIL_WEBHOOK_FAILED"));
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (
    !GOOGLE_APPS_SCRIPT_WEBHOOK_URL &&
    (!RESEND_API_KEY || !CLAIM_EMAIL_FROM)
  ) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { claimId } = await request.json();

  if (!claimId) {
    return new Response(JSON.stringify({ error: "Missing claimId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: claim, error: claimError } = await adminClient
    .from("promotion_claims")
    .select("id, first_name, last_name, email, dui, whatsapp_phone, claimed_code, notification_sent_at")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError || !claim) {
    return new Response(JSON.stringify({ error: "Claim not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (claim.notification_sent_at) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (GOOGLE_APPS_SCRIPT_WEBHOOK_URL) {
      await sendWithGoogleAppsScript(claim);
    } else {
      await sendWithResend(claim);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await adminClient
    .from("promotion_claims")
    .update({ notification_sent_at: new Date().toISOString() })
    .eq("id", claimId);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
