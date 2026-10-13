(() => {
  const API = "https://lupin-data-api.lujinsg.workers.dev/api/lupin-airlines";
  const KEY = "lupin-airline-session-v1";
  const $ = id => document.getElementById(id);
  const backdrop = $("airline-backdrop"), form = $("airline-form"), openBtn = $("airline-open");
  let token = localStorage.getItem(KEY) || "", username = "";
  const setError = message => { $("airline-error").textContent = message || ""; };
  function render() {
    openBtn.textContent = token ? "✈ Airline connected" : "✈ Connect airline";
    $("airline-title").textContent = token ? "Lupin Airlines is connected." : "Connect your airline account.";
    $("airline-submit").textContent = token ? "Reconnect account" : "Connect account";
    $("airline-disconnect").hidden = !token;
    $("airline-username").value = username;
    $("airline-password").value = "";
  }
  async function request(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: {"Content-Type":"application/json", ...(options.headers||{})} });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not connect to Lupin Airlines.");
    return data;
  }
  async function validate() {
    if (!token) return false;
    try { const me = await request("/me", {headers:{Authorization:"Bearer "+token}}); username = me.username || ""; render(); return true; }
    catch { token = ""; localStorage.removeItem(KEY); render(); return false; }
  }
  openBtn.addEventListener("click", async () => { setError(""); backdrop.hidden = false; await validate(); render(); if (!token) $("airline-username").focus(); });
  $("airline-close").addEventListener("click", () => { backdrop.hidden = true; setError(""); });
  backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.hidden = true; });
  form.addEventListener("submit", async e => {
    e.preventDefault(); setError("");
    const button = $("airline-submit"); button.disabled = true; button.textContent = "Connecting…";
    try {
      const data = await request("/login", {method:"POST",body:JSON.stringify({username:$("airline-username").value.trim(),password:$("airline-password").value})});
      token = data.token; username = data.username || ""; localStorage.setItem(KEY, token); $("airline-password").value = ""; render(); backdrop.hidden = true;
      window.dispatchEvent(new CustomEvent("lupin-airline-connected", {detail:{username}}));
      window.dispatchEvent(new CustomEvent("lupin-toast", {detail:{message:"Lupin Airlines connected."}}));
    } catch (error) { setError(error.message || "Could not connect."); }
    finally { button.disabled = false; render(); }
  });
  $("airline-disconnect").addEventListener("click", () => { token = ""; username = ""; localStorage.removeItem(KEY); render(); setError("Airline account disconnected."); window.dispatchEvent(new CustomEvent("lupin-airline-connected", {detail:{username:""}})); });
  validate();
  window.LupinAirline = {get token(){return token;}, get username(){return username;}, connect:()=>openBtn.click(), disconnect:()=>{token="";username="";localStorage.removeItem(KEY);render();}};
})();