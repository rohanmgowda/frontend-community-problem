(async () => {
  const admin = await initShell({ role: "admin", active: "dashboard" }); if (!admin) return;
  const TITLES = { dashboard: "Admin Dashboard", complaints: "Manage Complaints", ml: "Machine Learning Module" };
  const SECTIONS = Object.keys(TITLES), charts = {}, modal = new bootstrap.Modal(qs("#cModal"));
  const PAL = ["#0b2a4a", "#16a36b", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];
  let depts = [];
  try { depts = (await api("/departments")).departments; } catch (e) { fail(e); }
  qs("#aCat").innerHTML = '<option value="">All categories</option>' + CATEGORIES.map(x => `<option>${x}</option>`).join("");
  qs("#aStatus").innerHTML = '<option value="">All statuses</option>' + STATUSES.map(x => `<option>${x}</option>`).join("");
  qs("#aDept").innerHTML = '<option value="">All departments</option>' + depts.map(d => `<option>${esc(d.name)}</option>`).join("");

  function chart(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(qs("#" + id), cfg); }
  const statCard = (n, l, ico, cls) => `<div class="col-6 col-lg-4 col-xl-2"><div class="card-x stat"><div class="ico ${cls}"><i class="bi ${ico}"></i></div><div><h3>${n}</h3><small>${l}</small></div></div></div>`;

  async function loadDash() {
    try {
      const a = await api("/admin/analytics");
      qs("#aStats").innerHTML = statCard(a.total, "Total complaints", "bi-folder2-open", "ic-navy") + statCard(a.new, "New", "bi-envelope-open", "ic-blue") +
        statCard(a.pending, "Pending", "bi-hourglass-split", "ic-amber") + statCard(a.in_progress, "In progress", "bi-tools", "ic-purple") +
        statCard(a.resolved, "Resolved", "bi-check2-circle", "ic-green") + statCard(a.rejected, "Rejected", "bi-x-octagon", "ic-red");
      const cats = Object.keys(a.by_category), sts = Object.keys(a.by_status);
      chart("chCat", { type: "bar", data: { labels: cats, datasets: [{ data: cats.map(k => a.by_category[k]), backgroundColor: PAL, borderRadius: 8 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
      chart("chStatus", { type: "doughnut", data: { labels: sts, datasets: [{ data: sts.map(k => a.by_status[k]), backgroundColor: ["#6366f1", "#f59e0b", "#3b82f6", "#f97316", "#16a36b", "#ef4444"] }] }, options: { plugins: { legend: { position: "bottom" } }, cutout: "62%" } });
      chart("chMonth", { type: "line", data: { labels: a.monthly.map(m => m.month), datasets: [{ label: "Complaints", data: a.monthly.map(m => m.count), borderColor: "#16a36b", backgroundColor: "rgba(22,163,107,.15)", fill: true, tension: .35 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
      chart("chArea", { type: "bar", data: { labels: a.by_area.map(x => x.area), datasets: [{ data: a.by_area.map(x => x.count), backgroundColor: "#0b2a4a", borderRadius: 8 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
    } catch (e) { fail(e); }
  }

  async function loadList() {
    const p = new URLSearchParams({ search: qs("#aSearch").value, category: qs("#aCat").value, status: qs("#aStatus").value, department: qs("#aDept").value, location: qs("#aLoc").value });
    try {
      const { complaints } = await api("/admin/complaints?" + p);
      qs("#aRows").innerHTML = complaints.length ? complaints.map(c => `<tr><td>#${c.id}</td><td class="fw-semibold">${esc(c.title)} ${c.verified ? '<i class="bi bi-patch-check-fill text-success" title="Verified"></i>' : ""}</td>
        <td>${esc(c.citizen)}</td><td>${esc(c.category)}</td><td>${esc(c.location)}</td><td>${prioBadge(c.priority)}</td><td>${esc(c.department || "-")}</td><td>${statusBadge(c.status)}</td><td>${fmtDate(c.created_at)}</td>
        <td><button class="btn btn-sm btn-navy" data-id="${c.id}">Manage</button></td></tr>`).join("")
        : '<tr><td colspan="10" class="text-center muted py-4">No complaints match.</td></tr>';
      qsa("#aRows button").forEach(b => b.onclick = () => openComplaint(b.dataset.id));
    } catch (e) { fail(e); }
  }
  const dl = debounce(loadList, 350);
  ["#aSearch", "#aLoc"].forEach(s => qs(s).oninput = dl);
  ["#aCat", "#aStatus", "#aDept"].forEach(s => qs(s).onchange = loadList);
  qs("#aClear").onclick = () => { ["#aSearch", "#aLoc", "#aCat", "#aStatus", "#aDept"].forEach(s => qs(s).value = ""); loadList(); };

  async function openComplaint(id) {
    try {
      const [{ complaint: c }, { duplicates }] = await Promise.all([api(`/admin/complaints/${id}`), api(`/admin/complaints/${id}/duplicates`)]);
      qs("#mTitle").textContent = `#${c.id} · ${c.title}`;
      const cit = c.images.filter(i => !i.is_resolution), res = c.images.filter(i => i.is_resolution);
      qs("#mBody").innerHTML = `<div class="row g-4"><div class="col-lg-6">
        <div class="mb-2">${statusBadge(c.status)} ${prioBadge(c.priority)} ${c.verified ? '<span class="badge-status s-resolved"><i class="bi bi-patch-check"></i> Verified</span>' : '<span class="badge-status s-submitted">Unverified</span>'}</div>
        <p>${esc(c.description)}</p>
        <div class="small muted mb-3">Category: <b>${esc(c.category)}</b>${c.predicted_category ? ` (ML predicted: ${esc(c.predicted_category)}${c.prediction_confidence != null ? ", " + Math.round(c.prediction_confidence * 100) + "%" : ""})` : ""}<br>
          Location: ${esc(c.location)}${c.ward ? " · " + esc(c.ward) : ""}<br>Incident: ${fmtLocal(c.incident_datetime)} · Submitted: ${fmtDateTime(c.created_at)}<br>
          Citizen: ${esc(c.citizen.name)} · ${esc(c.citizen.email)} · ${esc(c.citizen.phone || "")}<br>Department: <b>${esc(c.department || "not assigned")}</b></div>
        <div class="row g-2 mb-3">${cit.map(i => `<div class="col-6"><div class="small muted">Reported photo</div><img class="photo" src="${imgUrl(i.filename)}"></div>`).join("")}
          ${res.map(i => `<div class="col-6"><div class="small text-success">Resolution photo</div><img class="photo" src="${imgUrl(i.filename)}"></div>`).join("")}</div>
        <h6 class="fw-bold"><i class="bi bi-files"></i> Possible duplicates</h6>
        ${duplicates.length ? duplicates.map(d => `<div class="small">#${d.id} · ${esc(d.title || "")} · ${esc(d.location || "")} · <b>${Math.round(d.similarity * 100)}%</b> similar</div>`).join("") : '<div class="small muted">No similar complaints found.</div>'}
        <h6 class="fw-bold mt-3">History</h6><ul class="tl">${c.history.slice().reverse().map(h => `<li><div class="fw-semibold">${esc(h.status)}</div><div class="small">${esc(h.remark || "")}</div><div class="small muted">${fmtDateTime(h.created_at)}</div></li>`).join("")}</ul>
      </div><div class="col-lg-6"><div class="card-x" style="background:#f8fafc;box-shadow:none">
        ${c.verified ? "" : '<button class="btn btn-green w-100 mb-3" id="mVerify"><i class="bi bi-patch-check me-1"></i>Verify complaint</button>'}
        <label class="form-label fw-semibold">Change status</label><select class="form-select mb-2" id="mStatus">${STATUSES.map(s => `<option ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}</select>
        <textarea class="form-control mb-2" id="mRemark" rows="2" placeholder="Administrative remark (required for Rejected; remark or photo required for Resolved)"></textarea>
        <div class="d-flex gap-2 mb-3"><button class="btn btn-navy flex-fill" id="mUpdate">Update status</button><button class="btn btn-outline-navy" id="mNote">Add remark only</button></div>
        <label class="form-label fw-semibold">Assign to department</label>
        <div class="input-group mb-3"><select class="form-select" id="mDept">${depts.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select><button class="btn btn-navy" id="mAssign">Assign</button></div>
        <label class="form-label fw-semibold">Priority</label>
        <div class="input-group mb-3"><select class="form-select" id="mPrio">${["Low", "Medium", "High"].map(p => `<option ${p === c.priority ? "selected" : ""}>${p}</option>`).join("")}</select><button class="btn btn-outline-navy" id="mPrioSave">Save</button></div>
        <label class="form-label fw-semibold">Upload resolution photograph</label>
        <div class="input-group"><input type="file" class="form-control" id="mPhoto" accept="image/png,image/jpeg,image/webp"><button class="btn btn-green" id="mUpload">Upload</button></div>
      </div></div></div>`;
      const act = async (fn, msg) => { try { await fn(); ok(msg); await openComplaint(id); loadList(); } catch (e) { fail(e); } };
      const v = qs("#mVerify"); if (v) v.onclick = () => act(() => api(`/admin/complaints/${id}/verify`, { method: "POST" }), "Complaint verified.");
      qs("#mUpdate").onclick = () => act(() => api(`/admin/complaints/${id}/status`, { method: "PUT", body: { status: qs("#mStatus").value, remark: qs("#mRemark").value } }), "Status updated.");
      qs("#mNote").onclick = () => act(() => api(`/admin/complaints/${id}/remarks`, { method: "POST", body: { remark: qs("#mRemark").value } }), "Remark added.");
      qs("#mAssign").onclick = () => act(() => api(`/admin/complaints/${id}/assign`, { method: "POST", body: { department_id: +qs("#mDept").value } }), "Department assigned.");
      qs("#mPrioSave").onclick = () => act(() => api(`/admin/complaints/${id}/priority`, { method: "PUT", body: { priority: qs("#mPrio").value } }), "Priority saved.");
      qs("#mUpload").onclick = () => { const f = qs("#mPhoto").files[0]; if (!f) return toast("Choose a photo first.", "err"); const fd = new FormData(); fd.append("photo", f); act(() => api(`/admin/complaints/${id}/resolution-photo`, { method: "POST", form: fd }), "Resolution photo uploaded."); };
      modal.show();
    } catch (e) { fail(e); }
  }

  async function loadML() {
    const box = qs("#mlBody");
    try {
      const o = await api("/admin/ml/overview"), m = o.model, pct = v => (v * 100).toFixed(1) + "%";
      let html = "";
      if (!o.trained || !m) {
        html += `<div class="alert alert-warning"><b>No trained model found.</b> Automatic classification is off until you train one on your own dataset:
          <pre class="mb-0 mt-2">cd backend
python ml/train_model.py --csv ml/data/complaints.csv</pre>Duplicate detection and priority suggestions below work without a trained model.</div>`;
      } else {
        const mx = Math.max(1, ...m.confusion_matrix.flat());
        html += `<div class="row g-3 mb-3">${statCard(pct(m.accuracy), "Accuracy", "bi-bullseye", "ic-green")}${statCard(pct(m.precision_macro), "Precision (macro)", "bi-crosshair", "ic-blue")}${statCard(pct(m.recall_macro), "Recall (macro)", "bi-arrow-repeat", "ic-purple")}${statCard(pct(m.f1_macro), "Macro F1", "bi-graph-up", "ic-navy")}
          <div class="col-12 col-xl-4"><div class="card-x h-100"><div class="small muted">Model</div><div class="fw-bold">${esc(m.algorithm)} + TF-IDF</div><div class="small muted">Dataset: ${esc(m.dataset)} · ${m.n_train} train / ${m.n_test} test rows</div></div></div></div>
          <div class="card-x mb-3"><h6 class="fw-bold">Confusion matrix <span class="muted small">(rows actual, columns predicted)</span></h6><div class="table-responsive"><table class="cm table table-bordered mb-0"><thead><tr><th></th>${m.labels.map(l => `<th>${esc(l)}</th>`).join("")}</tr></thead>
          <tbody>${m.confusion_matrix.map((r, i) => `<tr><th>${esc(m.labels[i])}</th>${r.map(v => `<td style="background:rgba(22,163,107,${v / mx * .7})">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
      }
      html += `<div class="row g-3 mb-3"><div class="col-lg-7"><div class="card-x"><h6 class="fw-bold">Category distribution <span class="muted small">${o.agreement_pct != null ? `· citizens kept the ML suggestion in ${o.agreement_pct}% of ${o.classified_count} classified complaints` : ""}</span></h6><canvas id="chDist" height="200"></canvas></div></div>
        <div class="col-lg-5"><div class="card-x h-100"><h6 class="fw-bold">Try the classifier</h6><textarea id="mlText" class="form-control mb-2" rows="4" placeholder="Paste a complaint description…"></textarea><button class="btn btn-navy" id="mlGo">Classify</button><div id="mlOut" class="mt-3"></div></div></div></div>
        <div class="card-x mb-3"><h6 class="fw-bold"><i class="bi bi-files"></i> Potential duplicate complaints <span class="muted small">(TF-IDF cosine similarity)</span></h6>
        <div class="table-responsive"><table class="table mb-0"><thead><tr><th>Complaint A</th><th>Complaint B</th><th>Similarity</th><th>Same location</th></tr></thead><tbody>
        ${o.duplicate_pairs.length ? o.duplicate_pairs.map(p => `<tr><td>#${p.a.id} · ${esc(p.a.title)}<div class="small muted">${esc(p.a.location)}</div></td><td>#${p.b.id} · ${esc(p.b.title)}<div class="small muted">${esc(p.b.location)}</div></td><td><b>${Math.round(p.similarity * 100)}%</b></td><td>${p.same_location ? "Yes" : "No"}</td></tr>`).join("") : '<tr><td colspan="4" class="muted text-center">No likely duplicates.</td></tr>'}</tbody></table></div></div>
        <div class="card-x"><h6 class="fw-bold">Classification &amp; priority per complaint</h6><div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>ID</th><th>Title</th><th>Predicted</th><th>Confidence</th><th>Final category</th><th>Current priority</th><th>Suggested</th><th>Similar</th></tr></thead><tbody>
        ${o.complaints.length ? o.complaints.map(c => `<tr><td>#${c.id}</td><td>${esc(c.title)}</td><td>${esc(c.predicted_category || "-")}</td><td>${c.confidence != null ? Math.round(c.confidence * 100) + "%" : "-"}</td><td>${esc(c.category)}${c.predicted_category && c.predicted_category !== c.category ? ' <span class="badge-status s-under-review">corrected</span>' : ""}</td><td>${prioBadge(c.priority)}</td><td title="${esc(c.reasons.join("; "))}">${prioBadge(c.suggested_priority)} <i class="bi bi-info-circle muted"></i></td><td>${c.duplicates}</td></tr>`).join("") : '<tr><td colspan="8" class="muted text-center">No complaints yet.</td></tr>'}</tbody></table></div></div>`;
      box.innerHTML = html;
      const cats = o.categories;
      chart("chDist", { type: "bar", data: { labels: cats, datasets: [{ label: "Final category", data: cats.map(c => o.final_distribution[c] || 0), backgroundColor: "#0b2a4a", borderRadius: 6 }, { label: "ML predicted", data: cats.map(c => o.predicted_distribution[c] || 0), backgroundColor: "#16a36b", borderRadius: 6 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
      qs("#mlGo").onclick = async () => {
        const out = qs("#mlOut");
        try { const r = await api("/ml/predict", { method: "POST", body: { description: qs("#mlText").value } });
          out.innerHTML = `<div class="pred-box"><div class="fw-bold">${esc(r.category)} · ${Math.round(r.confidence * 100)}%</div><div class="conf-bar my-2"><div style="width:${r.confidence * 100}%"></div></div>${r.alternatives.map(a => `<div class="small muted">${esc(a.category)} · ${Math.round(a.confidence * 100)}%</div>`).join("")}</div>`;
        } catch (e) { out.innerHTML = `<div class="text-danger small">${esc(e.message)}</div>`; }
      };
    } catch (e) { box.innerHTML = ""; fail(e); }
  }

  function show() {
    const h = (location.hash || "#dashboard").slice(1), k = SECTIONS.includes(h) ? h : "dashboard";
    SECTIONS.forEach(s => qs("#sec-" + s).classList.toggle("d-none", s !== k));
    qsa("#sidebar .nav-i[data-k]").forEach(a => a.classList.toggle("active", a.dataset.k === k));
    qs("#pageTitle").textContent = TITLES[k]; qs("#sidebar").classList.remove("open");
    ({ dashboard: loadDash, complaints: loadList, ml: loadML })[k]();
  }
  window.addEventListener("hashchange", show); show();
})();
