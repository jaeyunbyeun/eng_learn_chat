const BASE = process.env.REACT_APP_API_URL ?? "http://localhost:8080";

function authHeaders() {
  const email = localStorage.getItem("email") ?? "";
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (email) h["X-Email"] = email;
  return h;
}

export async function listVocab(q?: string) {
  const url = new URL("/vocab" + (q ? `?q=${encodeURIComponent(q)}` : ""), BASE);
  const res = await fetch(url, { method: "GET", headers: authHeaders(), credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
