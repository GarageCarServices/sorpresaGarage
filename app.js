import { appConfig } from "./config.js";
import {
  disableForm,
  formatDateOnly,
  formatDateTime,
  getSecretCodeFromUrl,
  humanizeSupabaseError,
  isRegistrationClosed,
  isSupabaseConfigured,
  isValidDui,
  normalizeDui,
  registrationDeadline,
  redemptionDeadline,
  setStatus,
  supabase,
} from "./supabase-client.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const state = {
  detectedCode: getSecretCodeFromUrl(),
  validatedCode: "",
  claim: null,
};

const elements = {
  introOverlay: document.querySelector("#intro-overlay"),
  dismissIntroButton: document.querySelector("#dismiss-intro-button"),
  registrationDeadlinePill: document.querySelector("#registration-deadline-pill"),
  redemptionDeadlinePill: document.querySelector("#redemption-deadline-pill"),
  closedBanner: document.querySelector("#registration-closed-banner"),
  closedCopy: document.querySelector("#registration-closed-copy"),
  codePill: document.querySelector("#code-pill"),
  codeStatus: document.querySelector("#code-status"),
  detectedCodeWrap: document.querySelector("#detected-code"),
  detectedCodeValue: document.querySelector("#detected-code-value"),
  detailsPanel: document.querySelector("#details-panel"),
  detailsPill: document.querySelector("#details-pill"),
  detailsCodeChip: document.querySelector("#details-code-chip"),
  detailsCodeValue: document.querySelector("#details-code-value"),
  claimForm: document.querySelector("#claim-form"),
  firstName: document.querySelector("#first-name"),
  lastName: document.querySelector("#last-name"),
  dui: document.querySelector("#dui"),
  email: document.querySelector("#email"),
  termsCheckbox: document.querySelector("#terms-checkbox"),
  claimSubmit: document.querySelector("#claim-submit"),
  claimStatus: document.querySelector("#claim-status"),
  registeredPanel: document.querySelector("#registered-panel"),
  claimSummary: document.querySelector("#claim-summary"),
  termsShell: document.querySelector("#terms-shell"),
  termsPersonalData: document.querySelector("#terms-personal-data"),
  printTermsButton: document.querySelector("#print-terms-button"),
  emailNotificationStatus: document.querySelector("#email-notification-status"),
  restartFlowButton: document.querySelector("#restart-flow-button"),
};

function updateDeadlineUi() {
  elements.registrationDeadlinePill.textContent =
    `Registro hasta ${formatDateOnly(registrationDeadline)}`;
  elements.redemptionDeadlinePill.textContent =
    `Canje valido hasta ${formatDateOnly(redemptionDeadline)}`;

  if (!isRegistrationClosed()) {
    elements.closedBanner.hidden = true;
    return;
  }

  elements.closedBanner.hidden = false;
  elements.closedCopy.textContent =
    "El periodo de registro cerro el 16 de mayo de 2026. Ya no se permiten nuevos reclamos.";
}

function paintCodeState(kind, label) {
  elements.codePill.textContent = label;

  if (kind === "success") {
    elements.codePill.className = "panel-pill panel-pill-success";
    return;
  }

  if (kind === "warning") {
    elements.codePill.className = "panel-pill";
    return;
  }

  elements.codePill.className = "panel-pill panel-pill-muted";
}

function paintDetailsState(kind, label) {
  elements.detailsPill.textContent = label;

  if (kind === "success") {
    elements.detailsPill.className = "panel-pill panel-pill-success";
    return;
  }

  elements.detailsPill.className = "panel-pill panel-pill-muted";
}

function revealDetailsPanel(visible) {
  elements.detailsPanel.hidden = !visible;
  elements.claimForm.hidden = !visible;
  elements.detailsCodeChip.hidden = !visible;
}

function fillDetectedCode() {
  if (!state.detectedCode) {
    elements.detectedCodeWrap.hidden = true;
    return;
  }

  elements.detectedCodeValue.textContent = state.detectedCode;
  elements.detectedCodeWrap.hidden = false;
}

function renderClaimSummary(claim) {
  const rows = [
    ["Participante", `${claim.first_name} ${claim.last_name}`],
    ["Correo", claim.email],
    ["DUI", claim.dui],
    ["Codigo aplicado", claim.claimed_code],
    ["Registrado", formatDateTime(claim.created_at)],
    ["Canje valido hasta", formatDateOnly(redemptionDeadline)],
  ];

  elements.claimSummary.innerHTML = rows
    .map(
      ([label, value]) => `
        <div>
          <dt>${label}</dt>
          <dd>${value}</dd>
        </div>
      `,
    )
    .join("");

  elements.termsPersonalData.innerHTML = rows
    .slice(0, 5)
    .map(
      ([label, value]) => `
        <div>
          <p>${label}</p>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join("");
}

function showClaimSuccess(claim) {
  state.claim = claim;
  elements.registeredPanel.hidden = false;
  elements.termsShell.hidden = false;
  revealDetailsPanel(false);
  renderClaimSummary(claim);
  paintCodeState("success", "QR registrado");
}

function resetClaimView() {
  state.claim = null;
  state.validatedCode = "";
  elements.registeredPanel.hidden = true;
  elements.termsShell.hidden = true;
  revealDetailsPanel(false);
  elements.claimForm.reset();
  setStatus(elements.claimStatus, "", "");
  setStatus(elements.emailNotificationStatus, "", "");
  paintCodeState("warning", "Pendiente");
  paintDetailsState("info", "Esperando validacion");
  elements.claimSubmit.disabled = true;
  fillDetectedCode();
}

function updateSubmitState() {
  const closed = isRegistrationClosed();
  const ready =
    Boolean(state.validatedCode) &&
    !closed &&
    elements.firstName.value.trim().length > 0 &&
    elements.lastName.value.trim().length > 0 &&
    isValidDui(normalizeDui(elements.dui.value)) &&
    emailPattern.test(elements.email.value.trim()) &&
    elements.termsCheckbox.checked;

  elements.claimSubmit.disabled = !ready;
}

async function notifyClaimByEmail(claimId) {
  if (!supabase || !appConfig.notificationFunctionName) {
    return;
  }

  const { error } = await supabase.functions.invoke(appConfig.notificationFunctionName, {
    body: { claimId },
  });

  if (error) {
    setStatus(
      elements.emailNotificationStatus,
      "Registro guardado. Falta dejar operativa la funcion de correo en Supabase para el envio automatico.",
      "warning",
    );
    return;
  }

  setStatus(
    elements.emailNotificationStatus,
    "Tambien te enviamos un correo con la confirmacion, terminos y forma de canje.",
    "success",
  );
}

function handleValidationResponse(result, code) {
  const closed = isRegistrationClosed();

  if (!result?.available) {
    state.validatedCode = "";
    revealDetailsPanel(false);
    paintDetailsState("info", "Esperando validacion");
    paintCodeState("warning", result?.reason === "already_used" ? "QR usado" : "No disponible");
    setStatus(
      elements.codeStatus,
      result?.message || "No fue posible validar este QR.",
      result?.reason === "already_used" ? "error" : "warning",
    );
    return;
  }

  state.validatedCode = code;
  elements.detailsCodeValue.textContent = code;
  paintCodeState("success", "QR valido");

  if (closed) {
    paintDetailsState("info", "Registro cerrado");
    setStatus(
      elements.codeStatus,
      "El QR existe, pero el periodo de registro ya cerro.",
      "warning",
    );
    return;
  }

  revealDetailsPanel(true);
  paintDetailsState("success", "Listo para datos");
  setStatus(elements.codeStatus, result.message || "QR valido. Ya puedes continuar.", "success");
  elements.firstName.focus();
}

async function validateCode(event) {
  event?.preventDefault?.();

  if (!isSupabaseConfigured || !supabase) {
    setStatus(
      elements.codeStatus,
      "Configura primero Supabase en config.js para activar la validacion real del QR.",
      "warning",
    );
    return;
  }

  const code = state.detectedCode;

  if (!code) {
    resetClaimView();
    paintCodeState("warning", "Sin QR");
    setStatus(
      elements.codeStatus,
      "Este acceso solo funciona desde un QR valido. Escanea el codigo nuevamente.",
      "warning",
    );
    return;
  }

  if (state.validatedCode && state.validatedCode !== code) {
    resetClaimView();
  }

  setStatus(elements.codeStatus, "Validando QR en la base...", "info");
  paintCodeState("warning", "Validando");

  const { data, error } = await supabase.rpc("validate_promo_code", {
    p_code: code,
  });

  if (error) {
    revealDetailsPanel(false);
    paintCodeState("warning", "Error");
    setStatus(elements.codeStatus, humanizeSupabaseError(error), "error");
    return;
  }

  handleValidationResponse(data, code);
  updateSubmitState();
}

async function submitClaim(event) {
  event.preventDefault();

  if (!supabase || !state.validatedCode) {
    setStatus(elements.claimStatus, "Primero debes abrir el enlace desde un QR valido.", "warning");
    return;
  }

  if (isRegistrationClosed()) {
    setStatus(elements.claimStatus, "El registro ya no esta disponible.", "warning");
    return;
  }

  const firstName = elements.firstName.value.trim();
  const lastName = elements.lastName.value.trim();
  const email = elements.email.value.trim().toLowerCase();
  const dui = normalizeDui(elements.dui.value);

  if (!emailPattern.test(email)) {
    setStatus(elements.claimStatus, "Ingresa un correo electronico valido.", "warning");
    return;
  }

  if (!isValidDui(dui)) {
    setStatus(elements.claimStatus, "El DUI debe tener formato 12345678-9.", "warning");
    return;
  }

  if (!elements.termsCheckbox.checked) {
    setStatus(elements.claimStatus, "Debes aceptar los terminos y condiciones.", "warning");
    return;
  }

  elements.claimSubmit.disabled = true;
  setStatus(elements.claimStatus, "Guardando tu registro...", "info");

  const { data, error } = await supabase.rpc("claim_promotion", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_dui: dui,
    p_email: email,
    p_code: state.validatedCode,
  });

  if (error) {
    elements.claimSubmit.disabled = false;

    if (`${error.message || ""}`.toUpperCase().includes("CODE_ALREADY_USED")) {
      state.validatedCode = "";
      revealDetailsPanel(false);
      paintCodeState("warning", "QR usado");
      paintDetailsState("info", "Esperando validacion");
      setStatus(elements.codeStatus, "Este QR ya fue registrado anteriormente.", "error");
    }

    setStatus(elements.claimStatus, humanizeSupabaseError(error), "error");
    return;
  }

  showClaimSuccess(data);
  setStatus(elements.claimStatus, "Registro completado con exito.", "success");
  await notifyClaimByEmail(data.id);
  window.location.hash = "registered-panel";
}

function dismissIntro() {
  elements.introOverlay.classList.add("intro-overlay-hidden");
}

function bindEvents() {
  elements.dismissIntroButton.addEventListener("click", dismissIntro);
  elements.claimForm.addEventListener("submit", submitClaim);
  elements.dui.addEventListener("input", () => {
    elements.dui.value = normalizeDui(elements.dui.value);
    updateSubmitState();
  });
  [elements.firstName, elements.lastName, elements.email, elements.termsCheckbox].forEach((node) => {
    node.addEventListener("input", updateSubmitState);
    node.addEventListener("change", updateSubmitState);
  });
  elements.printTermsButton.addEventListener("click", () => window.print());
  elements.restartFlowButton.addEventListener("click", () => {
    resetClaimView();
    window.location.hash = "claim-shell";
    validateCode();
  });
}

async function init() {
  fillDetectedCode();
  updateDeadlineUi();
  bindEvents();
  resetClaimView();

  if (isRegistrationClosed()) {
    disableForm(elements.claimForm, true);
  }

  if (state.detectedCode) {
    window.setTimeout(() => {
      validateCode();
    }, 450);
  }

  if (!isSupabaseConfigured || !supabase) {
    setStatus(
      elements.codeStatus,
      "Vista previa cargada. Completa config.js para activar la validacion y el guardado reales.",
      "warning",
    );
  }
}

init();
