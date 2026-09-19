// Runs after the HTML is loaded but before React hydration (see
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client).
// Some browser extensions (e.g. Bitdefender) inject a `bis_skin_checked`
// attribute onto every element before React hydrates, which React then
// reports as a hydration mismatch. Strip it before hydration reads the DOM,
// and keep stripping it if the extension re-adds it afterwards.

const ATTR = "bis_skin_checked";

for (const el of document.querySelectorAll(`[${ATTR}]`)) {
  el.removeAttribute(ATTR);
}

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "attributes" && mutation.attributeName === ATTR) {
      (mutation.target as Element).removeAttribute(ATTR);
    }
  }
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: [ATTR],
  subtree: true,
});
