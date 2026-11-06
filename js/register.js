const form = qs("#regForm");
form.onsubmit = async e => {
  e.preventDefault(); const b = qs("#btn"); b.disabled = true; showFieldErrors(form, {});
  try {
    await api("/auth/register", { method: "POST", body: Object.fromEntries(new FormData(form)) });
    ok("Account created! Redirecting to login…"); setTimeout(() => location.href = "login.html", 1200);
  } catch (err) { showFieldErrors(form, err.fields); fail(err); b.disabled = false; }
};
