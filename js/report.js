(async () => {
  const user = await initShell({ role: "citizen", active: "report" }); if (!user) return;
  const f = qs("#reportForm"), cat = f.elements.category, box = qs("#predBox");
  cat.innerHTML = '<option value="">Select category</option>' + CATEGORIES.map(c => `<option>${c}</option>`).join("");
  f.elements.location.value = user.location || "";
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  f.elements.incident_datetime.value = now.toISOString().slice(0, 16);
  let userPicked = false, pred = null;

  function renderPred() {
    if (!pred) return;
    const pct = Math.round(pred.confidence * 100), changed = cat.value && cat.value !== pred.category;
    box.className = "col-12 pred-box";
    box.innerHTML = `<div class="d-flex justify-content-between"><div><div class="muted small">Predicted category</div>
      <div class="fs-5 fw-bold" style="color:var(--navy)"><i class="bi bi-stars text-success"></i> ${esc(pred.category)}</div></div>
      <div class="text-end"><div class="muted small">Confidence</div><div class="fs-5 fw-bold">${pct}%</div></div></div>
      <div class="conf-bar my-2"><div style="width:${pct}%"></div></div>
      <div class="small ${changed ? "text-warning-emphasis" : "muted"}">${changed ? `You changed the category to <b>${esc(cat.value)}</b> &mdash; your choice will be saved.`
      : pct < 50 ? "Low confidence &mdash; please check the category below." : "Not right? Choose a different category below to correct it."}</div>`;
  }
  async function classify() {
    const description = f.elements.description.value.trim(), title = f.elements.title.value.trim();
    if (description.length < 20) { box.className = "col-12 d-none"; return; }
    box.className = "col-12 pred-box";
    box.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analysing description…';
    try {
      pred = await api("/ml/predict", { method: "POST", body: { title, description } });
      f.elements.predicted_category.value = pred.category; f.elements.prediction_confidence.value = pred.confidence;
      if (!userPicked) cat.value = pred.category;
      renderPred();
    } catch (e) {
      pred = null; f.elements.predicted_category.value = ""; f.elements.prediction_confidence.value = "";
      box.innerHTML = e.status === 503 ? '<i class="bi bi-info-circle me-1"></i>Automatic classification is not available yet. Please choose a category.' : esc(e.message);
    }
  }
  const run = debounce(classify, 700);
  f.elements.description.addEventListener("input", run); f.elements.title.addEventListener("input", run);
  cat.addEventListener("change", () => { userPicked = true; renderPred(); });

  f.elements.photo.addEventListener("change", () => {
    const file = f.elements.photo.files[0], img = qs("#preview");
    if (file) { img.src = URL.createObjectURL(file); img.classList.remove("d-none"); } else img.classList.add("d-none");
  });
  qs("#geoBtn").onclick = () => {
    if (!navigator.geolocation) return toast("Geolocation is not supported by this browser.", "err");
    navigator.geolocation.getCurrentPosition(p => {
      const loc = f.elements.location, g = `(GPS ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)})`;
      loc.value = (loc.value.replace(/\s*\(GPS[^)]*\)/, "") + " " + g).trim(); ok("GPS position added.");
    }, () => toast("Could not get your location.", "err"));
  };
  f.onsubmit = async e => {
    e.preventDefault(); const b = qs("#submitBtn"); b.disabled = true; showFieldErrors(f, {});
    try {
      const r = await api("/complaints", { method: "POST", form: new FormData(f) });
      ok("Complaint submitted!"); setTimeout(() => location.href = "tracking.html?id=" + r.complaint.id, 900);
    } catch (err) { showFieldErrors(f, err.fields); fail(err); b.disabled = false; }
  };
})();
