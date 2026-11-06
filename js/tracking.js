(async () => {
  const user = await initShell({ role: "citizen", active: "tracking" }); if (!user) return;
  const pick = qs("#pick"), body = qs("#trackBody"), icons = ["bi-send", "bi-search", "bi-people", "bi-tools", "bi-check2-circle"];
  let list = [];
  try { list = (await api("/complaints")).complaints; } catch (e) { return fail(e); }
  if (!list.length) { pick.closest(".card-x").remove(); body.innerHTML = '<div class="card-x text-center muted py-5">Nothing to track yet. <a href="report.html">Report a problem</a></div>'; return; }
  pick.innerHTML = list.map(c => `<option value="${c.id}">#${c.id} &ndash; ${esc(c.title)} (${esc(c.status)})</option>`).join("");
  const want = new URLSearchParams(location.search).get("id");
  if (want && list.some(c => String(c.id) === want)) pick.value = want;

  async function load() {
    const id = pick.value; body.innerHTML = '<div class="muted">Loading…</div>';
    try {
      const [t, d] = await Promise.all([api(`/complaints/${id}/tracking`), api(`/complaints/${id}`)]); const c = d.complaint;
      const photos = c.images.filter(i => !i.is_resolution), res = t.resolution_photos;
      body.innerHTML = `
      <div class="card-x mb-4"><div class="d-flex flex-wrap justify-content-between gap-2"><div><h5 class="fw-bold mb-1">#${c.id} &middot; ${esc(c.title)}</h5>
        <div class="muted small">${esc(c.category)} &middot; ${esc(c.location)}${c.ward ? " &middot; " + esc(c.ward) : ""} &middot; Submitted ${fmtDateTime(c.created_at)}</div></div>
        <div>${statusBadge(c.status)} ${c.verified ? '<span class="badge-status s-resolved"><i class="bi bi-patch-check"></i> Verified</span>' : '<span class="badge-status s-submitted">Not yet verified</span>'}</div></div>
        ${t.rejected ? '<div class="alert alert-danger mt-3 mb-0"><i class="bi bi-x-octagon me-1"></i>This complaint was rejected. See the remarks below.</div>' : ""}
        <div class="stepper">${t.steps.map((s, i) => `<div class="step ${s.reached ? "reached" : ""} ${s.status === t.status ? "current" : ""}"><div class="dot"><i class="bi ${icons[i]}"></i></div>${esc(s.status)}</div>`).join("")}</div></div>
      <div class="row g-4"><div class="col-lg-7">
        <div class="card-x mb-4"><h6 class="fw-bold">Description</h6><p class="mb-0">${esc(c.description)}</p></div>
        <div class="card-x mb-4"><h6 class="fw-bold"><i class="bi bi-chat-square-text me-1"></i>Administrator remarks</h6>
          ${t.admin_remarks ? `<p class="mb-0">${esc(t.admin_remarks)}</p>` : '<p class="muted mb-0">No remarks yet.</p>'}
          ${c.department ? `<div class="mt-2 small muted">Assigned department: <b>${esc(c.department)}</b></div>` : ""}</div>
        <div class="card-x"><h6 class="fw-bold">Photographs</h6><div class="row g-3">
          ${photos.map(p => `<div class="col-sm-6"><div class="small muted mb-1">Reported</div><img class="photo" src="${imgUrl(p.filename)}" alt=""></div>`).join("")}
          ${res.map(p => `<div class="col-sm-6"><div class="small text-success fw-semibold mb-1">Resolution photo</div><img class="photo" src="${imgUrl(p)}" alt=""></div>`).join("")}
          ${!photos.length && !res.length ? '<div class="col-12 muted">No photographs.</div>' : ""}</div></div></div>
      <div class="col-lg-5"><div class="card-x"><h6 class="fw-bold mb-3">Activity</h6><ul class="tl">
        ${t.history.slice().reverse().map(h => `<li><div class="fw-semibold">${esc(h.status)}</div><div class="small">${esc(h.remark || "")}</div><div class="small muted">${fmtDateTime(h.created_at)}</div></li>`).join("")}</ul></div></div></div>`;
    } catch (e) { body.innerHTML = ""; fail(e); }
  }
  pick.onchange = () => { history.replaceState(null, "", "?id=" + pick.value); load(); };
  load();
})();
