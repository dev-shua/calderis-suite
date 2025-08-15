export function moveEnabledRowToTop(root: HTMLElement, fullKey: string) {
  const input = root.querySelector<HTMLInputElement>(`input[name="${fullKey}"]`);
  if (!input) return;

  const row = input.closest<HTMLElement>(".form-group");
  const container = row?.parentElement;
  if (!row || !container) return;

  container.prepend(row);
}
