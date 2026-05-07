import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { appConfig } from "./config.js";

const looksConfigured =
  typeof appConfig.supabaseUrl === "string" &&
  typeof appConfig.supabaseAnonKey === "string" &&
  !appConfig.supabaseUrl.includes("TU_PROYECTO") &&
  !appConfig.supabaseAnonKey.includes("TU_SUPABASE");

export const isSupabaseConfigured = looksConfigured;

export const registrationDeadline = new Date(appConfig.registrationDeadlineIso);
export const redemptionDeadline = new Date(appConfig.redemptionDeadlineIso);

export const supabase = looksConfigured
  ? createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function getBasePath() {
  const path = window.location.pathname;

  if (path.endsWith(".html")) {
    return path.slice(0, path.lastIndexOf("/") + 1);
  }

  if (path.endsWith("/")) {
    return path;
  }

  return `${path}/`;
}

export function buildAppUrl(pageName = "index.html", params = new URLSearchParams()) {
  const url = new URL(window.location.origin);
  url.pathname = `${getBasePath()}${pageName}`;
  url.search = params.toString();
  return url.toString();
}

export function getSecretCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code") || params.get("promo") || params.get("secret");
  return normalizeCode(code || "");
}

export function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeDui(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 9);

  if (digits.length <= 8) {
    return digits;
  }

  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
}

export function normalizeWhatsApp(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function getWhatsAppDigits(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

export function isValidWhatsApp(value) {
  const digits = getWhatsAppDigits(value);
  const localDigits = digits.startsWith("503") && digits.length === 11 ? digits.slice(3) : digits;
  return /^(?:5|6|7)\d{7}$/.test(localDigits);
}

export function formatWhatsAppDisplay(value, { includeCountryCode = false } = {}) {
  const digits = getWhatsAppDigits(value);
  const localDigits = digits.startsWith("503") && digits.length === 11 ? digits.slice(3) : digits;

  if (!/^(?:5|6|7)\d{7}$/.test(localDigits)) {
    return String(value || "");
  }

  const formatted = `${localDigits.slice(0, 4)}-${localDigits.slice(4)}`;
  return includeCountryCode ? `+503 ${formatted}` : formatted;
}

export function isValidDui(value) {
  return /^\d{8}-\d$/.test(String(value || "").trim());
}

export function isRegistrationClosed(now = new Date()) {
  return now.getTime() > registrationDeadline.getTime();
}

export function isRedemptionClosed(now = new Date()) {
  return now.getTime() > redemptionDeadline.getTime();
}

export function formatDateOnly(value) {
  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "long",
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function setStatus(target, message = "", kind = "") {
  if (!target) {
    return;
  }

  target.textContent = message;

  if (!message || !kind) {
    delete target.dataset.kind;
    return;
  }

  target.dataset.kind = kind;
}

export function disableForm(form, disabled) {
  if (!form) {
    return;
  }

  form.querySelectorAll("input, button, textarea, select").forEach((control) => {
    if (control.dataset.locked === "always") {
      return;
    }

    control.disabled = disabled;
  });
}

export function humanizeSupabaseError(error) {
  const source = `${error?.message || ""} ${error?.details || ""}`.toUpperCase();

  if (source.includes("AUTH_REQUIRED")) {
    return "Primero debes autenticar tu cuenta.";
  }

  if (source.includes("REGISTRATION_CLOSED")) {
    return "El periodo de registro cerro el 16 de mayo de 2026.";
  }

  if (source.includes("REDEMPTION_CLOSED")) {
    return "El periodo para canjear el descuento cerro el 31 de mayo de 2026.";
  }

  if (source.includes("INVALID_CODE")) {
    return "La clave unica no existe o no esta activa.";
  }

  if (source.includes("CODE_ALREADY_USED")) {
    return "La clave ya fue usada anteriormente.";
  }

  if (source.includes("USER_ALREADY_REGISTERED")) {
    return "Este correo ya tiene un registro activo.";
  }

  if (source.includes("DUI_ALREADY_REGISTERED")) {
    return "Este DUI ya fue registrado en la promocion.";
  }

  if (source.includes("INVALID_DUI")) {
    return "El DUI no cumple con el formato esperado.";
  }

  if (source.includes("INVALID_WHATSAPP")) {
    return "El numero de WhatsApp debe tener formato 1234-5678 y empezar con 5, 6 o 7.";
  }

  if (source.includes("INVALID_EMAIL")) {
    return "El correo electronico no es valido.";
  }

  if (source.includes("NAME_REQUIRED")) {
    return "Nombre y apellido son obligatorios.";
  }

  if (source.includes("CLAIM_ALREADY_REDEEMED")) {
    return "Este beneficio ya fue marcado como canjeado.";
  }

  if (source.includes("CLAIM_NOT_FOUND")) {
    return "No encontramos el registro que intentas canjear.";
  }

  if (source.includes("ADMIN_REQUIRED")) {
    return "Tu correo no tiene permisos de administrador.";
  }

  if (source.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "Correo o contrasena incorrectos.";
  }

  if (source.includes("EMAIL_NOT_CONFIRMED")) {
    return "Debes confirmar tu correo antes de iniciar sesion.";
  }

  if (source.includes("USER ALREADY REGISTERED")) {
    return "Ese correo ya existe. Usa iniciar sesion.";
  }

  if (source.includes("PASSWORD SHOULD BE AT LEAST 6 CHARACTERS")) {
    return "La contrasena debe tener al menos 6 caracteres.";
  }

  if (source.includes("PROVIDER IS NOT ENABLED")) {
    return "Debes habilitar este proveedor dentro de Supabase Auth.";
  }

  return error?.message || "Ocurrio un error inesperado al comunicar con Supabase.";
}
