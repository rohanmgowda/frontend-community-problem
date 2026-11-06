(async () => {
  let admin = new URLSearchParams(location.search).has("admin");
  const f = qs("#loginForm");
  function mode(a) {
    admin = a;
    qs("#tabCit").className = "btn " + (a ? "btn-outline-navy" : "btn-navy");
    qs("#tabAdm").className = "btn " + (a ? "btn-navy" : "btn-outline-navy");
    qs("#title").textContent = a ? "Administrator login" : "Welcome back";
    qs("#reg").classList.toggle("d-none", a);
  }
  qs("#tabCit").onclick = () => mode(false); qs("#tabAdm").onclick = () => mode(true); mode(admin);
  try { const u = (await api("/auth/me")).user; if (u) location.href = u.role === "admin" ? "admin.html" : "dashboard.html"; } catch (e) {}
  f.onsubmit = async e => {
    e.preventDefault(); const b = qs("#btn"); b.disabled = true;
    try {
      const r = await api(admin ? "/auth/admin-login" : "/auth/login", { method: "POST", body: { email: f.email.value, password: f.password.value } });
      location.href = r.user.role === "admin" ? "admin.html" : "dashboard.html";
    } catch (err) { fail(err); b.disabled = false; }
  };
})();
