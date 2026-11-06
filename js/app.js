/* Shared helpers: API client, auth guard, sidebar shell, formatting */
const STATUSES = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"];
const FLOW = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved"];
const CATEGORIES = ["Road Damage", "Garbage", "Streetlight", "Water Leakage", "Drainage", "Public Infrastructure", "Other"];
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

class ApiError extends Error {
  constructor(msg, status, fields) { super(msg); this.status = status; this.fields = fields || {}; }
}

async function api(path, { method = "GET", body, form } = {}) {
  const opts = { method, credentials: "same-origin", headers: {} };
  if (form) opts.body = form;
  else if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch("/api" + path, opts); }
  catch (e) { throw new ApiError("Cannot reach the server. Is the Flask backend running (python main.py)?", 0); }
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON */ }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) { location.href = "login.html"; }
    throw new ApiError(data.error || "Request failed.", res.status, data.fields);
  }
  return data;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const utc = iso => new Date(/Z|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");
const fmtDate = iso => iso ? utc(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmtDateTime = iso => iso ? utc(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
const fmtLocal = iso => iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
const slug = s => String(s).toLowerCase().replace(/\s+/g, "-");
const statusBadge = s => `<span class="badge-status s-${slug(s)}">${esc(s)}</span>`;
const prioBadge = p => p ? `<span class="badge-status p-${slug(p)}">${esc(p)}</span>` : "-";
const imgUrl = f => "/api/uploads/" + encodeURIComponent(f);
const progressPct = s => s === "Rejected" ? 100 : Math.round(((FLOW.indexOf(s) + 1) / FLOW.length) * 100);
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function toast(msg, type = "") {
  let w = qs(".toast-wrap");
  if (!w) { w = document.createElement("div"); w.className = "toast-wrap"; document.body.appendChild(w); }
  const t = document.createElement("div");
  t.className = "toast-msg " + type; t.textContent = msg; w.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}
const ok = m => toast(m, "ok"), fail = e => toast(e.message || String(e), "err");

function showFieldErrors(form, fields) {
  qsa(".invalid-msg", form).forEach(e => e.remove());
  Object.entries(fields || {}).forEach(([name, msg]) => {
    const el = form.elements[name];
    if (el) { const d = document.createElement("div"); d.className = "invalid-msg"; d.textContent = msg; el.insertAdjacentElement("afterend", d); }
  });
}

async function logout() { try { await api("/auth/logout", { method: "POST" }); } catch (e) {} location.href = "login.html"; }

const CITIZEN_NAV = [
  ["dashboard.html", "bi-speedometer2", "Dashboard", "dashboard"],
  ["report.html", "bi-megaphone", "Report a Problem", "report"],
  ["complaints.html", "bi-card-checklist", "My Complaints", "complaints"],
  ["tracking.html", "bi-geo-alt", "Track Complaints", "tracking"],
  ["notifications.html", "bi-bell", "Notifications", "notifications"],
  ["profile.html", "bi-person-circle", "Profile", "profile"]];
const ADMIN_NAV = [
  ["admin.html#dashboard", "bi-speedometer2", "Dashboard", "dashboard"],
  ["admin.html#complaints", "bi-inboxes", "Manage Complaints", "complaints"],
  ["admin.html#ml", "bi-cpu", "ML Module", "ml"]];

/* Verifies login + role, builds sidebar/topbar. Returns user or null (redirects). */
async function initShell({ role = "citizen", active = "" }) {
  let user;
  try { user = (await api("/auth/me")).user; } catch (e) { fail(e); return null; }
  if (!user) { location.href = role === "admin" ? "login.html?admin=1" : "login.html"; return null; }
  if (user.role !== role) { location.href = user.role === "admin" ? "admin.html" : "dashboard.html"; return null; }
  const nav = role === "admin" ? ADMIN_NAV : CITIZEN_NAV;
  qs("#sidebar").innerHTML = `
    <a class="brand" href="index.html"><img src="images/logo.svg" alt=""><span>Community Problem<br>Platform</span></a>
    ${nav.map(([h, i, l, k]) => `<a class="nav-i ${k === active ? "active" : ""}" href="${h}" data-k="${k}"><i class="bi ${i}"></i>${l}${k === "notifications" ? '<span class="badge-n d-none" id="unread"></span>' : ""}</a>`).join("")}
    <div class="spacer"></div>
    <a class="nav-i" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right"></i>Logout</a>`;
  qs("#logoutBtn").onclick = e => { e.preventDefault(); logout(); };
  const chip = qs("#userChip");
  if (chip) chip.innerHTML = `<span>${esc(user.full_name)}</span><div class="avatar">${esc(user.full_name[0].toUpperCase())}</div>`;
  const mb = qs("#menuBtn");
  if (mb) mb.onclick = () => qs("#sidebar").classList.toggle("open");
  document.addEventListener("click", e => { const s = qs("#sidebar"); if (s.classList.contains("open") && !s.contains(e.target) && e.target !== mb && !mb.contains(e.target)) s.classList.remove("open"); });
  if (role === "citizen") api("/notifications").then(r => { const b = qs("#unread"); if (r.unread) { b.textContent = r.unread; b.classList.remove("d-none"); } }).catch(() => {});
  return user;
}
