# Calderis Suite - Currency (v1)

## Contexte & objectifs

- Remplacer l'affichage et la gestion des monnaies sur les fiches d'acteur (5e v13)
- **Ne pas casser** `system.currency` du système de base
- Activer/Désactiver la feature sans perte (toggle safe)
- Préparer l'intégration des **prix d'items** sans conversion automatique

## Scope v1

- **Settings (world)** pour définir des devises custom (ordre, id, nom, abbr, icône, couleur, valeur de référence, visible)
- **Stockage des montants** par acteur dans des **flags** (ledger parallèle)
- **UI** : affichage/édition sur la fiche d'acteur (remplace visuellement la section monnaie native)
- **API minimale** pour lecture/écriture des montants, et total "de référence"
- **Aucune** conversion inter-devises et **pas** de remapping forcé vers la monnaie de base D&D

## Hors scope v1 (idées en vrac)

- Prix d'items détaillés
- Banques, trésor de groupe, transactions multi-acteurs avancées
- Conversion automatique, taux de change, arrondis
- Export/Import avancé de ledger

---

## Décisions de conception

### Stockage des montants - "Ledger" en flags

- Chemin: `actor.flags["calderis-suite"].currency` = `{ [currencyId]: number }`
- `system.currency` n'est **jamais** écrasé; on masque seulement son **rendu**
- **Snapshot** one-shot à l'activation (lecture seule) dans `actor.flags["calderis-suite"].currencySnapshotV1.base`

**Raisons** : stabilité, rollback trivial, pas de dépendance forte au schéma d&d5e; meilleure liberté pour plusieurs devises non hiérarchiques

### Synchronisation avec le système (options ultérieurs)

- Par défaut: **aucune** synchro
- Plus tard: option d'écrire un **total de référence** dans `gp` pour compat visuelle (lecture seule)

---

## Données

### Definitions (world setting)

Champs par devise:

- `id` (slug stable), `name`, `abbr?`, `order:number`, `icon?`, `color?`, `referenceValue?:number`, `visible?:boolean (def:true)`

Notes:

- `referenceValue` sert uniquement au **total estimatif** (affichage/tri). Aucune règle “10→1”.

### Ledger (par acteur)

- Record `{ [currencyId]: integer >= 0 }`
- Garde-fous: clamp à `[0, Number.MAX_SAFE_INTEGER]`. Négatifs interdits (dette potentielle en v1.1).

### Snapshot

- Copie simple de `system.currency` → `currencySnapshotV1.base` à l’activation.
- Utilisée uniquement pour **restaurer manuellement** si souhaité.

---

## Settings (world)

Clés (i18n à prévoir) :

- `calderis.currency.enabled: boolean` (def:false)
- `calderis.currency.definitions: CurrencyDefinition[]` (def:[])
- `calderis.currency.permissions.playerEditSelf: boolean` (def:false)
- `calderis.currency.syncToSystem: "none" | "referenceToGP"` (def:"none")
- `calderis.currency.migration.restoreSnapshot` (action bouton)

### i18n (exemples de clés)

- `CALDERIS.Currency.Settings.Enabled.Label`, `.Hint`
- `CALDERIS.Currency.Settings.Definitions.Label`, `.Hint`
- `CALDERIS.Currency.Settings.PlayerEdit.Label`, `.Hint`
- `CALDERIS.Currency.Settings.Sync.Label`, `.Options.none`, `.Options.referenceToGP`, `.Hint`
- `CALDERIS.Currency.Migration.Restore.Button`, `.Confirm`

---

## Activation / Désactivation

### À l’activation (ON)

1. Pour chaque acteur: si pas déjà présent, créer `currencySnapshotV1.base` à partir de `system.currency`.
2. Laisser le ledger existant (sinon init vide). **Ne pas** convertir.
3. Activer le **rendu custom** sur les sheets ciblées.

### À la désactivation (OFF)

1. Désactiver le rendu custom (re-affiche la monnaie native).
2. Conserver le ledger et le snapshot.
3. Offrir un **bouton “Restaurer depuis snapshot”** (action explicite, non automatique).

---

## UI (v1, Handlebars, v13)

### Emplacement

- Remplacer la section **Monnaie** de la feuille d’acteur dnd5e (PC/NPC/loot si pertinent), **au même endroit**, via hook de rendu.

### Interactions

- Liste ordonnée des devises visibles.
- Pour chaque ligne: label, abbr/icône, input numérique, boutons ± (step configurable), info-bulle (description via `name`/`abbr`).
- Option: **Total de référence** en pied si `referenceValue` existe pour ≥1 devise.

### Accessibilité

- Labels associés aux inputs, navigation clavier, aria-live pour confirmation de modification.

### Permissions

- Par défaut seuls **GM** peuvent éditer (toggle world pour autoriser le propriétaire de l’acteur).

---

## API publique (contrats)

- `CalderisCurrency.getDefinitions(): CurrencyDefinition[]`
- `CalderisCurrency.getLedger(actor): Ledger`
- `CalderisCurrency.set(actor, id, qty): Promise<void>`
- `CalderisCurrency.add(actor, id, delta): Promise<void>`
- `CalderisCurrency.totalReference(actor): number | null`

### Hooks (événements)

- `CalderisCurrencyUpdate` → `{ actor, changes: Partial<Ledger> }`
- `CalderisCurrencyDefinitionsChanged` → `{ definitions }`

---

## Intégrations futures (lot 2 – prix d’items, aperçu)

- Flag d’item: `flags.calderis-suite.price = { currencyId, amount }` (facultatif).
- Rendu de prix custom: affiche le prix calderis **si présent**, sinon état “non défini”.
- Action “Payer” → décrémente le ledger (pas de conversion auto).
- **Pas** de réécriture du champ `price` natif dnd5e.

---

## Acceptation v1

- Activer la feature: **aucune** donnée native supprimée ; ledger opérationnel ; UI remplace la monnaie native.
- Désactiver: retour à l’affichage natif ; montants custom conservés en flags ; possibilité de restaurer la monnaie native depuis snapshot (action explicite).
- API minimale opérationnelle ; i18n présent ; perfs OK (aucun blocage ressenti sur des mondes moyens).

## Risques & mitigations

- **Divergence** entre ledger et monnaie native → attendu par design ; communiquer clairement dans les tooltips.
- **Modules tiers** lisant `system.currency` → documenter l’option de sync “referenceToGP” (v1.1).
- **Renommage d’ID** devise → garder les valeurs “orphelines” invisibles + prévoir un outil simple de remap (v1.1).
