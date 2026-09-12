// Lives outside session.ts so scraper code can use it without pulling in the
// browser/storage module that tests mock out.
export function isLoginPage(document: Document): boolean {
  return Boolean(
    document.querySelector('form[action*="login"]') ||
    document.querySelector('input[type="password"]'),
  );
}
