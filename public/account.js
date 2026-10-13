(() => {
  const API = "https://lupin-ai.lujinsg.workers.dev/api/auth/";
  const TOKEN_KEY = "lupin-ai-session-v1";
  const $ = id => document.getElementById(id);
  const backdrop = $("account-backdrop"), form = $("account-form"), openBtn = $("account-open");
  const sharedSession = () => { try { return JSON.parse(localStorage.getItem("lupinCloudAccount") || "null"); } catch { return null; } };
  let registering = false, user = null, token = sharedSession()?.token || localStorage.getItem(TOKEN_KEY) || "";
  if (token) localStorage.setItem(TOKEN_KEY, token);
  async function request(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", ...(token ? {Authorization:"Bearer "+token} : {}), ...(options.headers||{}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ? data.error + (data.stage ? " (stage: " + data.stage + ")" : "") : "Account request failed.");
    return data;
  }
  function showError(message) { $("account-error").textContent = message || ""; }
  function renderUser() {
    openBtn.textContent = user ? user.username : "Sign in";
    openBtn.setAttribute("aria-label", user ? "Account options for " + user.username : "Sign in to Lupin AI");
    const status = $("account-status");
    status.hidden = !user;
    status.textContent = user ? "Signed in" : "";
    if (user) { $("account-title").textContent = "You're signed in."; $("account-subtitle").textContent = sharedSession()?.token === token ? "Your Lupin AI account is ready. Lupin Cloud sign-in is shared across supported apps." : "This older session is AI-only. Sign out and sign in again to enable shared Lupin Cloud sign-in."; $("account-submit").hidden = true; $("account-switch").textContent = "Sign out"; $("account-switch").dataset.signout = "true"; }
    else { $("account-title").textContent = registering ? "Create your account." : "Welcome back."; $("account-subtitle").textContent = registering ? "Choose a username and a unique password." : "Sign in to your Lupin AI account, or create one to get started."; $("account-submit").hidden = false; $("account-submit").textContent = registering ? "Create account" : "Sign in"; $("account-switch").textContent = registering ? "Already have an account? Sign in" : "New here? Create an account"; delete $("account-switch").dataset.signout; }
    $("account-password").autocomplete = registering ? "new-password" : "current-password";
    $("account-hint").textContent = registering ? "Use at least 10 characters. Usernames use letters, numbers, and underscores." : "Enter your account password.";
  }
  function show() { showError(""); backdrop.hidden = false; renderUser(); if (!user) $("account-username").focus(); }
  function hide() { backdrop.hidden = true; showError(""); }
  openBtn.addEventListener("click", show);
  $("account-close").addEventListener("click", hide);
  backdrop.addEventListener("click", e => { if (e.target === backdrop) hide(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !backdrop.hidden) hide(); });
  $("account-switch").addEventListener("click", async () => {
    if (user) {
      try { await request("logout", {method:"POST", body:"{}"}); } catch {}
      token = ""; user = null; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem("lupinCloudAccount"); window.dispatchEvent(new CustomEvent("lupin-auth-change", {detail:null})); renderUser(); window.dispatchEvent(new CustomEvent("lupin-account-changed", {detail:{user:null,token:""}})); showError("You have signed out."); return;
    }
    registering = !registering; showError(""); renderUser();
  });
  form.addEventListener("submit", async e => {
    e.preventDefault(); showError("");
    const username = $("account-username").value.trim(), password = $("account-password").value;
    const submit = $("account-submit"); submit.disabled = true; submit.textContent = registering ? "Creating…" : "Signing in…";
    try {
      const data = await request(registering ? "register" : "login", {method:"POST", body:JSON.stringify({username,password})});
      token = data.token; user = data.user; localStorage.setItem(TOKEN_KEY, token); localStorage.setItem("lupinCloudAccount", JSON.stringify({token,user,expiresAt:data.expiresAt})); window.dispatchEvent(new CustomEvent("lupin-auth-change", {detail:{token,user,expiresAt:data.expiresAt}})); $("account-password").value = ""; renderUser();
      hide(); window.dispatchEvent(new CustomEvent("lupin-account-changed", {detail:{user,token}}));
    } catch (err) { showError(err.message || "Could not sign in."); }
    finally { submit.disabled = false; renderUser(); }
  });
  async function restore() {
    if (!token) { renderUser(); return; }
    const storedShared = sharedSession();
    const isSharedToken = !!storedShared?.token && storedShared.token === token;
    try {
      const data = await request("me"); user = data.user;
      // Never publish an app-only legacy token as a shared Lupin Cloud session.
      if (isSharedToken) {
        const session = { ...storedShared, user };
        localStorage.setItem("lupinCloudAccount", JSON.stringify(session));
        window.dispatchEvent(new CustomEvent("lupin-auth-change", {detail:session}));
      }
      renderUser();
      window.dispatchEvent(new CustomEvent("lupin-account-changed", {detail:{user,token}}));
    } catch {
      token = ""; user = null; localStorage.removeItem(TOKEN_KEY);
      if (isSharedToken) {
        localStorage.removeItem("lupinCloudAccount");
        window.dispatchEvent(new CustomEvent("lupin-auth-change", {detail:null}));
      }
      renderUser();
    }
  }
  window.LupinAccount = { get user(){return user;}, get token(){return token;}, open:show, refresh:restore };
  restore();
})();