(async () => {
  const user = await initShell({ role: "citizen", active: "notifications" }); if (!user) return;
  async function load() {
    try {
      const { notifications } = await api("/notifications");
      qs("#list").innerHTML = notifications.length ? notifications.map(n => `<a href="${n.complaint_id ? "tracking.html?id=" + n.complaint_id : "#"}" class="notif ${n.is_read ? "" : "unread"} text-reset">
        <div class="avatar" style="background:var(--navy)"><i class="bi bi-bell"></i></div><div><div class="fw-semibold">${esc(n.message)}</div><div class="small muted">${fmtDateTime(n.created_at)}</div></div></a>`).join("")
        : '<div class="card-x text-center muted py-5">No notifications yet.</div>';
    } catch (e) { fail(e); }
  }
  qs("#markRead").onclick = async () => { try { await api("/notifications/read", { method: "POST" }); ok("All marked as read."); const b = qs("#unread"); if (b) b.classList.add("d-none"); load(); } catch (e) { fail(e); } };
  load();
})();
