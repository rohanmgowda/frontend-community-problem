(async () => {
  const user = await initShell({ role: "citizen", active: "complaints" }); if (!user) return;
  const s = qs("#fSearch"), c = qs("#fCat"), st = qs("#fStatus");
  c.innerHTML = '<option value="">All categories</option>' + CATEGORIES.map(x => `<option>${x}</option>`).join("");
  st.innerHTML = '<option value="">All statuses</option>' + STATUSES.map(x => `<option>${x}</option>`).join("");
  async function load() {
    const p = new URLSearchParams({ search: s.value, category: c.value, status: st.value });
    try {
      const { complaints } = await api("/complaints?" + p);
      qs("#grid").innerHTML = complaints.length ? complaints.map(x => `<div class="col-md-6 col-xl-4"><div class="card-x c-card">
        <div class="thumb" style="${x.photo ? `background-image:url('${imgUrl(x.photo)}')` : ""}">${x.photo ? "" : '<i class="bi bi-image"></i>'}</div>
        <div class="body"><div class="d-flex justify-content-between mb-1"><span class="muted small">#${x.id}</span>${statusBadge(x.status)}</div>
        <h6 class="fw-bold mb-1">${esc(x.title)}</h6><div class="small muted"><i class="bi bi-tag"></i> ${esc(x.category)}</div>
        <div class="small muted"><i class="bi bi-geo-alt"></i> ${esc(x.location)}</div><div class="small muted mb-3"><i class="bi bi-calendar3"></i> ${fmtDate(x.created_at)}</div>
        <a class="btn btn-sm btn-outline-navy w-100" href="tracking.html?id=${x.id}">Track complaint</a></div></div></div>`).join("")
        : `<div class="col-12"><div class="card-x text-center muted py-5">No complaints found. <a href="report.html">Report a problem</a></div></div>`;
    } catch (e) { fail(e); }
  }
  const d = debounce(load, 350);
  s.oninput = d; c.onchange = st.onchange = load;
  qs("#fClear").onclick = () => { s.value = c.value = st.value = ""; load(); };
  load();
})();
