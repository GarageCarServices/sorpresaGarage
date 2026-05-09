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

const SOCIAL_ICON_DATA_URIS = {
  facebook:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEHUlEQVR4nO2aTYxURRDHe43zqmYSUOFsVsjqzlS/WQgfshISEjwoQb1xMmrEuDNVb4nhhuHACQ0QiQSFwIl48aQXE2PEL+IHEiPEi4ZEQgyED13wIBCQjzU9sxs22Z1xXr/u9+aR90/qNB/V9Xv1uqu7S6lChQoVKlTIq8LxoBoyNEnwgBb8kgRPk8AVEvy3bXCFGH9vfca4nwQa9WYwrPIskspSzbCHBM5pwUkbI4azWuAdPV5aonKiAc3B81rgmG3QXWD8oKPgOeND9aOoUX6SGH5yHfhsg+NhVF6h+kWjW1RZM+7TjHf8Bz9ljHeIce/gKwozDb7eDIZJ8JfUAp8FAk7WGsHjmQRfk/IqzTCRWfDTc0N7NVmTbvDNYD0xXs86+HsQ8BoJPJtK8NVmeZQYr2Yd9CwIjNe9Z0LdvPMMf2cdbGeDy97mhNEtqux/woPzUzXEp8TwsRY8ohmOaoETrc96WmnghJfVQQu+5yd14SIJbu3lyWmBwz39p+C7zosc7WGdJ4YPTGb1Oo4YAG5Xo8oyV/EP+KjwbJ5SrwCmXoVjTspm3artHac+w4/Lx1TJLwCcNMt1cgDifmOjI3jGciyxAJDA98m3tOL66eOpXlNzyRvq4To/9Mi0EcOHcf2FXBqxBqAZ9nh499/v5nP5mKpoxkOuii0S2G0NgBIcZnSxl7pCFzzo1h/8YX2Mpd0HP9mtXB3arOabut69TxiKD4Ch6QNAPSrVO/mkZvCCF+gMY7EBUPsA0/lgaoKDaUP/v3lnTpHgVz4GoxkfndujUsT4piefX6i40oJn0gagGbd5yoDTFgDg8v0CQAv8ZQEAb943ABhvpAqAGD+ZWcHNNLVdPdDJp9nHd/qdMbOHsBzTzdgAKMHJDwl8pDzIpLJdBsBEqpMgeQBAr81fkOokSAmWQR8ANOPqBK/k5/Edin1N7iUDGF5NkAEH4jsUeL2vAAjstB1PKLApvsNGQAlS7rM6w+K5bO129WD3/f/cvzP/aTse216DAbOVtHXaR3XAGeuzQW2aE3IOgBh2KVtVo8qy3AOQylJrAEaa4du8AiDGr1VSketDihQBhBxsSAzAiBi+yx0AhqPKaf+P4O28ADBjdd5HRAK78wJAC7yl/DRDwcm+B8Dw89BmBcqHaoKDxPBn3wJgmBgZh0Vegp+5K0t0a+MLAOM/YYRPqTRUE3ja+gLDAwDzQELGtakEPy3N5ZUkcClzAAwXMuscrbd2aTGbJ5wCgOPDDXhMZSnaqAKz4SDGW2kBaPlieNumycKbQi6NtDu6/AIggW+63S9mrlp7gjTniXcdArhrrreoCetUXlSNgidMmpLgr7YAiPE3YtiRWUO0K5nihARfNB0n1Wjewk7fIy5vbB3CML7c7Ra5UKFChQoVUk70H5xk/g1SeipnAAAAAElFTkSuQmCC",
  instagram:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEKklEQVR4nO1azW4URxBuINoqK/zdCeRiYk+1yR58ThCxyRs4JFcO9lYZ4wMPYIiFZMgTABIxKOYBEkLCJUBuCYQLFiThGK78yYABC4Fq1qCdWXbxTPfu9Ib5pJJWq5nu/r6u6qnqbmNKlChRokSJEnlRnTZbSfAby3DOCvxBAneIccUKvvRp2qa2rX3EfU3i18PjZospCpHgx8RwlgSf+yabwZ5ZgXkaxx1dI757xnxADEet4HKBxNO2TAyzY2NmQ0fJD+w3m4jxpwAIvz1MBC9qSHaEfHXabLWMi0WTfKcxLnoXYWzMbLCMPxdOLoMnaKh6E4DqMV84sUwiMMx6W+0t49OiCeWwZS9fBxI4E6CLn69O9G3bNdX3kRW80PpZmHdf+ES/tcWTbjQl/nqMlnF7m2efOSVLpBleAIQdBHipGWNuAazAQtFkW9iF2P2VPOMv7Z+FBQcPgD99DpwE/7YCc5HAyNCByuCnh8yHavo7YhglgWP1ZzyKxbiYXwCG/7wQZ7hKNfhirf2qQCRwzZMADx0EQKeqTgslqsGkMWZdju7XkcAB58qS8UVuAawTebhnGfYYR6jnxG05jKXrApCWyC3IW4YvifGUxjoxPlq1W5bx5NAk7G0tQv6yu/sC1GK3T2BXrTJgBX5/t8vClcHJyidNIjBM9YQAxHA1HfNDjLuJ4X6W8IkEP08MZsastwx/hS9ALbna68xnIZ8QYaKys7Et/VQGLQAx3kq3QYyX8rquhkPTmBj/CVYAKzDX+L4uarnJr5rmBElB4XiwAkQMo8nB4ilXAazgCVdRuybAYGr19pHWpsOq/jUJVAASszHxPuOSswcwLiVFNRuDFWBgv9nUAQESuXz/lNn8foWA4M2eCYGoC4ugptLBCkACx3wkLu0SKxL4LlgBLOPtdBsk+Ft+94fLPZYIYVPioutCvnIW7pJAv4/EqqsCkMC1dDGkhU02EeBuVMPPmoohgevBC2DrFeFUui0tbNZSF2jIpGc+HgtXpvOOpwABcCUdCm+EEBjRlV0/b3GewLgU/9b/WuwbxhumDltjXRfA1r3gfisRsqBOPns57UUAct0UZVwZkspBjd/MnccbIJXpQjdFydO2uO7kpJOkdqiv9vkWvKZJEHwQzMGIFfxX63klqIchWtjExQ1XonizVJMcxtvBHIzYcI/GsnjfD/+7w1GbwSLBr3ILMDxutoR4PL722cenWj4bF1iB+cKJ5LfTxhXVib5tJPg4ADKZjBif6PG58QFimC2aUGZjOGy8Ycas13s5PTP7ghe93xqt9spFScEbHbtEPaBXZQV/DHbmGX/t2FXZ5K1R+DZeZMIh/sQKHOn4ZelGrF5Q+r7QPKF+gfN0462xrqNf9+kZ98VpM+Oia+nafqbjtm9oeqt9Oic5JUqUKFGihHmv8Qo3CAuad7e4twAAAABJRU5ErkJggg==",
  tiktok:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAADMklEQVR4nO2av2/TQBTHjx/2Pec/KAwsCJJ7KRUUUEWFmBmAKRsSYkn9Xgqi/BBjETuoUQusLAX+haoUtcDAiFRYWVAlRigsiKZF5wapSp0Q29c4ju8rPWXJPd/7+N7z+fmEsLKysrKysrLqUsM1Z1gR1JHgkyL4hQxbaVowBz0Xhpmi75TFXunoDSEVwVMkaKQddFsYDBvIMKcqwjUfPMObtAOMYEtGISiGZ30QVDQjmDWW89jHy75TOpTYweR3n6CedjDxV4F8nBgAMnzu5aRDbwLD95j+Vk0AWE8dAMHHmP7WTQDY6gMAsdNwIADgpDOCDJu5BaCFLJ/nGsDYlPCQ5IfcAtA6ck1A8z2k632JGCQA/1SsuceQ5EMkuaJIfkOG37kCECYLgAcYgCJ5XQixL7cAMHi5kcsl370opsX+XALApimCL7oxUya4WibnxMiEdzh4RPYtAIKGvnuKvalhKowWq4WhSkUcCHyTfBAVgAmgPQOgGBZKfuFkW9+DCkAxbCiC+//1PYgAFMEfJPdSV74HEUCZ3Ztd+x40AIphoZ2fkg/nFctXSHKt2b7uesLZAEDQCCt4F6bFwShd5cwCUCyXTbTUMwsAa96tsGVvYsKZAFCueadbxwY5nxcAxWphaNdYkmu5AaBCvsV1alSE+mDYaPWht825WQGK5NdWH8dr3qHs1gCSL6NNWM7v8jHhnc0EAEVwu3Vs0ffGIvXzJ2E85Pr3MgEASa6EjVcMT5J8zkaS7zICABrFWuFUm51gZwgEs/p/rWN1WsX9ItR7ABzYYls/kzCOJF/oQqefDtu/ch4JzrUbY+JUSq8BbIXtCGNdl+Bu0uBTAaB0M8R3Lye5ZondK53eGPsaAEboCIVJkawGTRUDwZsCsB734ork+045HlLwlkwFHhjBj344IrOJLN8qhjtI3hm9s9Pb5mCHR96ZINe3H3WJqv2eHZFRDDN7MLEemXyUGEDRd8qmClIvLahDE64SJoQMc5kDQFAXpqQqwkWC12kHFcEWR6vCMQZgB4TZfk6H5uO3bjz4ndLHT/UJTF1hkeBn2kE357CqC56xnLeysrKysrISedBfA+DYefs+VAkAAAAASUVORK5CYII=",
  whatsapp:
    "data:image/png;base64,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",
  waze:
    "data:image/png;base64,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",
} as const;

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/garagecarservices",
    icon: SOCIAL_ICON_DATA_URIS.facebook,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/garagecarservices.sv?igsh=MWFlMjdjeHM0c3hldA==",
    icon: SOCIAL_ICON_DATA_URIS.instagram,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@garagecarservices",
    icon: SOCIAL_ICON_DATA_URIS.tiktok,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/50377850367",
    icon: SOCIAL_ICON_DATA_URIS.whatsapp,
  },
  {
    label: "Waze",
    href: "https://waze.com/ul/hd42tgrjk8",
    icon: SOCIAL_ICON_DATA_URIS.waze,
  },
] as const;

function formatWhatsApp(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = digits.startsWith("503") && digits.length === 11 ? digits.slice(3) : digits;

  if (!/^[567]\d{7}$/.test(localDigits)) {
    return value;
  }

  return `+503 ${localDigits.slice(0, 4)}-${localDigits.slice(4)}`;
}

function socialLinksMarkup() {
  return SOCIAL_LINKS.map(
    ({ label, href, icon }) => `
      <a
        href="${href}"
        target="_blank"
        rel="noopener noreferrer"
        style="display:inline-block;margin:0 8px 8px 0;padding:10px 14px;border-radius:999px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);color:#f5fbf7;text-decoration:none;font-size:14px;font-weight:700;"
      >
        <img
          src="${icon}"
          alt=""
          width="18"
          height="18"
          style="display:inline-block;vertical-align:middle;margin-right:8px;width:18px;height:18px;border:0;"
        />
        <span style="display:inline-block;vertical-align:middle;">${label}</span>
      </a>
    `,
  ).join("");
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
          <h2 style="margin:24px 0 12px;font-size:18px;">Mantente en contacto</h2>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#d6e5db;">
            Si necesitas ayuda, tambien puedes escribirnos o encontrarnos por estos canales:
          </p>
          <div style="margin:0 0 4px;">
            ${socialLinksMarkup()}
          </div>
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
