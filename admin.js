import {
  buildAppUrl,
  formatDateTime,
  humanizeSupabaseError,
  isSupabaseConfigured,
  setStatus,
  supabase,
} from "./supabase-client.js";

const state = {
  claims: [],
  filteredClaims: [],
  sessionUser: null,
  isAdmin: false,
};

const elements = {
  authPill: document.querySelector("#admin-auth-pill"),
  googleButton: document.querySelector("#admin-google-auth-button"),
  loginForm: document.querySelector("#admin-login-form"),
  emailInput: document.querySelector("#admin-email-input"),
  passwordInput: document.querySelector("#admin-password-input"),
  emailStatus: document.querySelector("#admin-email-status"),
  loginPanel: document.querySelector("#admin-login"),
  dashboard: document.querySelector("#admin-dashboard"),
  adminUserLabel: document.querySelector("#admin-user-label"),
  searchInput: document.querySelector("#search-input"),
  tableBody: document.querySelector("#claims-table-body"),
  claimsStatus: document.querySelector("#admin-claims-status"),
  stats: document.querySelector("#admin-stats"),
  recordsCount: document.querySelector("#records-count"),
  refreshButton: document.querySelector("#refresh-claims-button"),
  signOutButton: document.querySelector("#admin-sign-out-button"),
  standaloneSignOutButton: document.querySelector("#admin-standalone-sign-out-button"),
};

function updateAuthUi() {
  const authenticated = Boolean(state.sessionUser);
  elements.authPill.textContent = authenticated ? "Cuenta verificada" : "Pendiente";
  elements.authPill.className = authenticated ? "panel-pill panel-pill-success" : "panel-pill";

  elements.dashboard.hidden = !authenticated || !state.isAdmin;
  elements.loginPanel.hidden = authenticated && state.isAdmin;
  elements.standaloneSignOutButton.hidden = !authenticated || state.isAdmin;
}

function renderStats() {
  const total = state.claims.length;
  const redeemed = state.claims.filter((item) => item.redeemed_at).length;
  const pending = total - redeemed;

  elements.stats.innerHTML = `
    <article>
      <span>Total registrados</span>
      <strong>${total}</strong>
    </article>
    <article>
      <span>Pendientes de canje</span>
      <strong>${pending}</strong>
    </article>
    <article>
      <span>Canjeados</span>
      <strong>${redeemed}</strong>
    </article>
  `;
}

function renderRows() {
  elements.recordsCount.textContent = `${state.filteredClaims.length} registros`;

  if (!state.filteredClaims.length) {
    elements.tableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">No hay resultados para el filtro actual.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = state.filteredClaims
    .map(
      (claim) => `
        <tr>
          <td class="participant-cell">
            <strong>${claim.first_name} ${claim.last_name}</strong>
            <span>DUI: ${claim.dui}</span>
          </td>
          <td class="contact-cell">
            <strong>${claim.email}</strong>
            <span>${claim.redeemed_by_email ? `Canjeado por ${claim.redeemed_by_email}` : "Sin canje"}</span>
          </td>
          <td>
            <strong>${claim.claimed_code}</strong>
          </td>
          <td>
            <strong>${formatDateTime(claim.created_at)}</strong>
          </td>
          <td>
            <strong>${claim.redeemed_at ? "Canjeado" : "Pendiente"}</strong>
            <small>${claim.redeemed_at ? formatDateTime(claim.redeemed_at) : "Listo para validar"}</small>
          </td>
          <td>
            <div class="table-actions">
              ${
                claim.redeemed_at
                  ? `<button class="button button-ghost" type="button" disabled>Ya canjeado</button>`
                  : `<button class="button button-primary redeem-button" type="button" data-claim-id="${claim.id}">Marcar canjeado</button>`
              }
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  elements.tableBody.querySelectorAll(".redeem-button").forEach((button) => {
    button.addEventListener("click", async () => {
      await markClaimAsRedeemed(button.dataset.claimId);
    });
  });
}

function applySearchFilter() {
  const term = elements.searchInput.value.trim().toLowerCase();

  state.filteredClaims = state.claims.filter((claim) => {
    if (!term) {
      return true;
    }

    const haystack = [
      claim.first_name,
      claim.last_name,
      claim.email,
      claim.dui,
      claim.claimed_code,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  renderRows();
}

async function fetchClaims() {
  if (!supabase || !state.isAdmin) {
    return;
  }

  setStatus(elements.claimsStatus, "Cargando registros...", "info");

  const { data, error } = await supabase
    .from("promotion_claims")
    .select("id, first_name, last_name, email, dui, claimed_code, created_at, redeemed_at, redeemed_by_email")
    .order("created_at", { ascending: false });

  if (error) {
    setStatus(elements.claimsStatus, humanizeSupabaseError(error), "error");
    return;
  }

  state.claims = data || [];
  applySearchFilter();
  renderStats();
  setStatus(elements.claimsStatus, "Registros sincronizados.", "success");
}

async function checkAdminAccess() {
  if (!supabase || !state.sessionUser) {
    state.isAdmin = false;
    updateAuthUi();
    return;
  }

  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    setStatus(elements.emailStatus, humanizeSupabaseError(error), "error");
    return;
  }

  state.isAdmin = Boolean(data);
  updateAuthUi();

  if (!state.isAdmin) {
    setStatus(
      elements.emailStatus,
      "Este correo no esta autorizado en la tabla admin_users.",
      "warning",
    );
    return;
  }

  elements.adminUserLabel.textContent = `Administrador: ${state.sessionUser.email}`;
  setStatus(elements.emailStatus, "Acceso administrador aprobado.", "success");
  await fetchClaims();
}

async function syncSession(session) {
  state.sessionUser = session?.user || null;

  if (!state.sessionUser) {
    state.isAdmin = false;
    updateAuthUi();
    return;
  }

  setStatus(elements.emailStatus, "Cuenta validada. Verificando permisos...", "info");
  await checkAdminAccess();
}

async function signInWithGoogle() {
  if (!isSupabaseConfigured || !supabase) {
    setStatus(
      elements.emailStatus,
      "Configura primero Supabase en config.js para activar el panel real.",
      "warning",
    );
    return;
  }

  setStatus(elements.emailStatus, "Redirigiendo a Google...", "info");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAppUrl("admin.html"),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    setStatus(elements.emailStatus, humanizeSupabaseError(error), "error");
  }
}

async function signInWithPassword(event) {
  event.preventDefault();

  if (!isSupabaseConfigured || !supabase) {
    setStatus(
      elements.emailStatus,
      "Configura primero Supabase en config.js para activar el panel real.",
      "warning",
    );
    return;
  }

  const email = elements.emailInput.value.trim().toLowerCase();
  const password = elements.passwordInput.value;

  setStatus(elements.emailStatus, "Iniciando sesion...", "info");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setStatus(elements.emailStatus, humanizeSupabaseError(error), "error");
    return;
  }

  setStatus(elements.emailStatus, "Sesion iniciada.", "success");
}

async function markClaimAsRedeemed(claimId) {
  if (!supabase) {
    return;
  }

  setStatus(elements.claimsStatus, "Registrando canje...", "info");

  const { error } = await supabase.rpc("redeem_promotion", {
    p_claim_id: claimId,
  });

  if (error) {
    setStatus(elements.claimsStatus, humanizeSupabaseError(error), "error");
    return;
  }

  setStatus(elements.claimsStatus, "Premio marcado como canjeado.", "success");
  await fetchClaims();
}

async function signOut() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
  state.sessionUser = null;
  state.isAdmin = false;
  state.claims = [];
  state.filteredClaims = [];
  elements.tableBody.innerHTML = "";
  elements.stats.innerHTML = "";
  elements.loginForm.reset();
  updateAuthUi();
  setStatus(elements.emailStatus, "Sesion cerrada.", "info");
}

function bindEvents() {
  elements.googleButton.addEventListener("click", signInWithGoogle);
  elements.loginForm.addEventListener("submit", signInWithPassword);
  elements.searchInput.addEventListener("input", applySearchFilter);
  elements.refreshButton.addEventListener("click", fetchClaims);
  elements.signOutButton.addEventListener("click", signOut);
  elements.standaloneSignOutButton.addEventListener("click", signOut);
}

async function init() {
  bindEvents();
  updateAuthUi();

  if (!isSupabaseConfigured || !supabase) {
    setStatus(
      elements.emailStatus,
      "Vista previa cargada. Completa config.js para habilitar el backend real.",
      "warning",
    );
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    setStatus(elements.emailStatus, humanizeSupabaseError(error), "error");
  }

  await syncSession(data.session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await syncSession(session);
  });
}

init();
