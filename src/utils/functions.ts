import { FieldKey } from "@/core/dm-dock/catalog";

export function moveEnabledRowToTop(root: HTMLElement, fullKey: string) {
  const input = root.querySelector<HTMLInputElement>(`input[name="${fullKey}"]`);
  if (!input) return;

  const row = input.closest<HTMLElement>(".form-group");
  const container = row?.parentElement;
  if (!row || !container) return;

  container.prepend(row);
}

export const calculPercentage = (part: number, total: number, noRound?: boolean): number => {
  const result = (part / total) * 100;
  return noRound ? result : Math.floor(result);
};

export const libStatToIcon = (stat: FieldKey) => {
  let result = "";

  switch (stat) {
    case "ac":
      result = "fas fa-shield-alt";
      break;
    case "init":
      result = "fas fa-bolt";
      break;
    case "inv":
      result = "fas fa-search";
      break;
    case "prc":
      result = "fas fa-eye";
      break;
    case "spd":
      result = "fa-solid fa-shoe-prints";
      break;
    default:
  }

  return result;
};
