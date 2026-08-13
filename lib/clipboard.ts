/** Copy text on HTTP (VPS IP) as well as HTTPS/localhost. Clipboard API needs a secure context. */
export async function copyToClipboard(text: string) {
  const value = text ?? "";
  if (typeof window === "undefined") {
    throw new Error("Clipboard is only available in the browser");
  }

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to execCommand (permissions, iframe, etc.)
    }
  }

  const el = document.createElement("textarea");
  el.value = value;
  el.setAttribute("readonly", "");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.width = "1px";
  el.style.height = "1px";
  el.style.padding = "0";
  el.style.border = "none";
  el.style.outline = "none";
  el.style.boxShadow = "none";
  el.style.background = "transparent";
  el.style.opacity = "0";
  document.body.appendChild(el);

  el.focus();
  el.select();
  el.setSelectionRange(0, el.value.length);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(el);
  }
  if (!ok) {
    throw new Error("Copy failed");
  }
}
