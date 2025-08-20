export const currencySettingsDef = {
  "currency.enabled": {
    name: "CS.Currency.Settings.Enabled.Label",
    hint: "CS.Currency.Settings.Enabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    section: "currency",
  },
  /**
   * NOTE: pour l’instant en JSON brut (on fera une UI dédiée plus tard).
   * Exemple:
   * [
   *   {"id":"scales","name":"Écailles","order":10,"abbr":"Ʃ","referenceValue":100}
   * ]
   */
  "currency.definitions": {
    name: "CS.Currency.Settings.Definitions.Label",
    hint: "CS.Currency.Settings.Definitions.Hint",
    scope: "world",
    config: false,
    type: String,
    default: "[]",
    section: "currency",
  },
  "currency.permissions.playerEditSelf": {
    name: "CS.Currency.Settings.PlayerEdit.Label",
    hint: "CS.Currency.Settings.PlayerEdit.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    section: "currency",
  },
  // Réservé pour v1.1 (aucun effet pour l’instant, on garde la clé pour stabilité)
  "currency.syncToSystem": {
    name: "CS.Currency.Settings.Sync.Label",
    hint: "CS.Currency.Settings.Sync.Hint",
    scope: "world",
    config: false,
    type: String,
    default: "none",
    choices: {
      none: "CS.Currency.Settings.Sync.Options.none",
      referenceToGP: "CS.Currency.Settings.Sync.Options.referenceToGP",
    },
    section: "currency",
  },
  // Les actions Snapshot sont gérées via un bouton dans le menu de feature (pas en setting simple).
} as const;

export type CurrencySettingsDef = typeof currencySettingsDef;
