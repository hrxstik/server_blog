function isQuillContentEmpty(htmlContent: string): boolean {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const text = doc.body.textContent || '';
  return text.trim().length === 0;
}
