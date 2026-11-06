(async () => {
  const user = await initShell({ role: "citizen", active: "dashboard" }); if (!user) return;
  qs("#welcome").textContent = `Welcome back, ${user.full_name.split(" ")[0]}!`;
  try {
    const s = await api("/dashboard/summary");
    const card = (n, l, ico, cls) => `<div class="col-6 col-xl"><div class="card-x stat"><div class="ico ${cls}"><i class="bi ${ico}"></i></div><div><h3>${n}</h3><small>${l}</small></div></div></div>`;
    qs("#stats").innerHTML = card(s.total, "Total submitted", "bi-folder2-open", "ic-navy") + card(s.pending, "Pending", "bi-hourglass-split", "ic-amber") +
      card(s.under_review, "Under review", "bi-search", "ic-blue") + card(s.in_progress, "In progress", "bi-tools", "ic-purple") + card(s.resolved, "Resolved", "bi-check2-circle", "ic-green");
    qs("#recent").innerHTML = s.recent.length ? s.recent.map(c => `<tr><td>#${c.id}</td><td class="fw-semibold">${esc(c.title)}</td><td>${esc(c.category)}</td><td>${statusBadge(c.status)}</td>
      <td><div class="mini-bar"><div style="width:${progressPct(c.status)}%"></div></div></td><td><a class="btn btn-sm btn-outline-navy" href="tracking.html?id=${c.id}">Track</a></td></tr>`).join("")
      : `<tr><td colspan="6" class="text-center muted py-4">You have not reported anything yet. <a href="report.html">Report your first problem</a>.</td></tr>`;
  } catch (e) { fail(e); }
})();
