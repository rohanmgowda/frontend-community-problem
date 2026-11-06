(async () => {
  const user = await initShell({ role: "citizen", active: "profile" }); if (!user) return;
  const pf = qs("#pForm"), pw = qs("#pwForm");
  async function load() {
    try {
      const { user: u } = await api("/profile");
      qs("#pEmail").value = u.email; pf.full_name.value = u.full_name; pf.phone.value = u.phone || ""; pf.location.value = u.location || "";
      const { complaints } = await api("/complaints");
      qs("#pHist").innerHTML = complaints.length ? complaints.map(c => `<tr><td><a href="tracking.html?id=${c.id}">#${c.id}</a></td><td>${esc(c.title)}</td><td>${esc(c.category)}</td><td>${fmtDate(c.created_at)}</td><td>${statusBadge(c.status)}</td></tr>`).join("")
        : '<tr><td colspan="5" class="muted text-center">No complaints yet.</td></tr>';
    } catch (e) { fail(e); }
  }
  pf.onsubmit = async e => { e.preventDefault(); try { await api("/profile", { method: "PUT", body: Object.fromEntries(new FormData(pf)) }); ok("Profile updated."); } catch (err) { fail(err); } };
  pw.onsubmit = async e => { e.preventDefault(); try { await api("/profile/change-password", { method: "POST", body: Object.fromEntries(new FormData(pw)) }); ok("Password changed."); pw.reset(); } catch (err) { fail(err); } };
  qs("#pLogout").onclick = logout;
  load();
})();
