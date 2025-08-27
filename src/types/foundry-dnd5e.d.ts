declare namespace DnD5e {
  interface Actor5e {
    id: string;
    hasPlayerOwner: boolean;
    flags: { [key: string]: any };
    identifiedItems: any;
    img: string;
    labels: any;
    name: string;
    overrides: any;
    ownership: {
      default: number;
      [key: string]: any;
    };
    prototypeToken: PrototypeToken;
    sort: number;
    sourcedItems: any;
    statuses: Set<any>;
    system: CharacterData;
    type: string;
  }

  interface CharacterData {
    abilities: {
      str: Ability;
      dex: Ability;
      con: Ability;
      int: Ability;
      wis: Ability;
      cha: Ability;
    };
    attributes: {
      ac: {
        armor: number;
        base: number;
        bonus: number;
        calc: any;
        cover: number;
        dex: number;
        flat: any;
        formula: any;
        label: any;
        min: number;
        shield: number;
        value: number;
      };
      attunement: {
        max: number;
        value: number;
      };
      concentration: {
        ability: any;
        bonuses: { save: any };
        limit: number;
        roll: Roll;
        save: number;
      };
      death: {
        bonuses: { save: any };
        failure: number;
        roll: Roll;
        success: number;
      };
      encumbrance: {
        bonuses: {
          encumbered: any;
          heavilyEncumbered: any;
          maximum: any;
          overall: any;
        };
        encumbered: boolean;
        max: number;
        mod: number;
        multipliers: {
          encumbered: any;
          heavilyEncumbered: any;
          maximum: any;
          overall: any;
        };
        pct: number;
        stops: {
          encumbered: number;
          heavilyEncumbered: number;
        };
        thresholds: {
          encumbered: number;
          heavilyEncumbered: number;
          maximum: number;
        };
        value: number;
      };
      exhaustion: number;
      hd: HitDice;
      hp: {
        bonuses: {
          level: any;
          overall: any;
        };
        damage: number;
        effectiveMax: number;
        max: number;
        pct: number;
        temp: any;
        tempmax: number;
        value: number;
      };
      init: {
        ability: any;
        bonus: any;
        mod: number;
        prof: Proficiency;
        roll: Roll;
        score: number;
        total: number;
      };
      inspiration: boolean;
      loyalty: { value: any };
      movement: {
        burrow: number;
        climb: number;
        fly: number;
        hover: boolean;
        ignoredDifficultTerrain: Set<any>;
        special: any;
        swim: number;
        units: any;
        walk: number;
      };
      prof: number;
      senses: {
        blindsight: number;
        darkvision: number;
        special: any;
        tremorsense: number;
        truesight: number;
        units: any;
      };
      spell: {
        abilityLabel: any;
        attack: number;
        dc: number;
        mod: number;
      };
      spellcasting: any;
    };
    bastion: {
      name: string;
      description: string;
    };
    bonuses: {
      abilities: { check: any; save: any; skill: any };
      msak: AttackBonuses;
      mwak: AttackBonuses;
      rsak: AttackBonuses;
      rwak: AttackBonuses;
      spell: { dc: any };
    };
    currency: {
      cp: number;
      sp: number;
      gp: number;
      ep: number;
      pp: number;
    };
    details: {
      age: string;
      alignment: string;
      appearance: string;
      biography: { value: any; public: any };
      bond: string;
      eyes: string;
      faith: string;
      flaw: string;
      gender: string;
      hair: string;
      height: string;
      ideal: string;
      level: number;
      originalClass: any;
      skin: string;
      trait: string;
      type: {
        custom: any;
        subtype: any;
        value: any;
      };
      weight: string;
      xp: {
        min: number;
        max: number;
        pct: number;
        value: number;
      };
    };
    favorites: any[];
    resources: {
      primary: Resource;
      secondary: Resource;
      tertiary: Resource;
    };
    scale: any;
    skills: {
      acr: Skill;
      ani: Skill;
      arc: Skill;
      ath: Skill;
      dec: Skill;
      his: Skill;
      ins: Skill;
      inv: Skill;
      itm: Skill;
      med: Skill;
      nat: Skill;
      per: Skill;
      prc: Skill;
      prf: Skill;
      rel: Skill;
      slt: Skill;
      ste: Skill;
      sur: Skill;
    };
    spells: {
      pact: BaseSpell;
      spell1: Spell;
      spell2: Spell;
      spell3: Spell;
      spell4: Spell;
      spell5: Spell;
      spell6: Spell;
      spell7: Spell;
      spell8: Spell;
      spell9: Spell;
    };
    tools: any;
    traits: {
      armorProf: BaseTrait;
      ci: BaseTrait;
      di: BaseTrait & { bypasses: Set<any> };
      dm: { amount: any; bypasses: Set<any> };
      dr: BaseTrait & { bypasses: Set<any> };
      dv: BaseTrait & { bypasses: Set<any> };
      languages: {
        communication: any;
        custom: string;
        labels: {
          languages: Array<any>;
          ranged: Array<any>;
        };
        value: Set<any>;
      };
      size: string;
      weaponProf: BaseTrait & {
        mastery: { value: Set<any>; bonus: Set<any> };
      };
    };
  }

  interface Ability {
    attack: number;
    bonuses: {
      check: string;
      save: string;
    };
    check: {
      roll: Roll & {
        modeCounts: {
          advantages: {
            count: number;
            suppressed: boolean;
          };
          disadvantages: {
            count: number;
            suppressed: boolean;
          };
        };
        override: any;
      };
      checkBonus: number;
      checkProf: Proficiency;
      dc: number;
      max: number;
      min: number;
      proficiency: number;
      save: {
        roll: Roll;
        value: number;
      };
      saveBonus: number;
      saveProf: Proficiency;
      value: number;
    };
  }

  interface Proficiency {
    deterministic: boolean;
    multiplier: number;
    rounding: any;
  }

  interface Roll {
    min: any;
    max: any;
    mode: number;
  }

  interface HitDice {
    actor: any;
    classes: Set<any>;
    sizes: Set<any>;
  }

  interface AttackBonuses {
    attack: any;
    damage: any;
  }

  interface Resource {
    label: string;
    lr: boolean;
    max: number;
    sr: boolean;
    value: number;
  }

  type AbilitySm = "str" | "dex" | "con" | "int" | "wis" | "cha";

  interface Skill {
    ability: AbilitySm;
    bonus: number;
    bonuses: { check: any; passive: any };
    effectValue: number;
    mod: number;
    passive: number;
    prof: Proficiency;
    roll: Roll & {
      modeCounts: {
        advantages: { count: number; suppressed: boolean };
        disadvantages: { count: number; suppressed: boolean };
        override: any;
      };
    };
    total: number;
    value: number;
  }

  interface BaseSpell {
    label: string;
    override: any;
    type: any;
    value: number;
  }

  interface Spell extends BaseSpell {
    level: number;
    max: number;
  }

  interface BaseTrait {
    custom: any;
    value: Set<any>;
  }

  interface PrototypeToken {
    actorLink: boolean;
    alpha: number;
    appendNumber: boolean;
    bar1: { attribute: any };
    bar2: { attribute: any };
    detectionModes: any[];
    displayBars: number;
    displayName: number;
    disposition: number;
    flags: any;
    height: number;
    light: LightData;
    lockRotation: boolean;
    movementAction: any;
    name: string;
    occludable: { radius: number };
    prependAdjective: boolean;
    randomImg: boolean;
    ring: {
      color: { ring: any; background: any };
      effects: number;
      enabled: boolean;
      subject: { scale: number; texture: any };
    };
    rotation: number;
    sight: {
      angle: number;
      attenuation: number;
      brightness: number;
      color: any;
      contrast: number;
      enabled: boolean;
      range: number;
      saturation: number;
      visionMode: any;
    };
    texture: {
      alphaThreshold: number;
      anchorX: number;
      anchorY: number;
      fit: any;
      offsetX: number;
      offsetY: number;
      rotation: number;
      scaleX: number;
      scaleY: number;
      src: string;
      tint: any;
    };
    turnMarker: {
      animation: any;
      disposition: boolean;
      mode: number;
      src: any;
    };
    width: number;
  }

  interface LightData {
    alpha: number;
    angle: number;
    animation: {
      intensity: number;
      reverse: boolean;
      speed: number;
      type: any;
    };
    attenuation: number;
    bright: number;
    color: any;
    coloration: number;
    contrast: number;
    darkness: { min: number; max: number };
    dim: number;
    luminosity: number;
    negative: boolean;
    priority: number;
    saturation: number;
    shadows: number;
  }
}
