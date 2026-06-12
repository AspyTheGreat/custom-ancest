function getAttr(attribs, name) {
  return attribs.find(a => a.name === name);
}

function current(attribs, name) {

  const attr = getAttr(attribs, name);

  if (!attr) return "0";

  return attr.current ?? "0";
}

function max(attribs, name) {
  return getAttr(attribs, name)?.max || "";
}

function parseCharacter(data) {

  const character = data.character || {};
  const attribs = character.attribs || data.attributes;
  const charName = data.name || character.name;

  return {

    name: charName,

    image: characterImages[charName] || character.avatar || data.avatar,

    class:
      current(attribs, "class_display") ||
      current(attribs, "class"),

    level:
      current(attribs, "level"),

    hp: {
      current: current(attribs, "hp"),
      max: max(attribs, "hp")
    },

    items: extractItems(attribs),

    skills: [

  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival"

].map(skill => {

  const formatted =
    skill
      .toLowerCase()
      .replace(/ /g, "_");

  const typeAttr =
    getAttr(
      attribs,
      formatted + "_type"
    );

  if (typeAttr) {
    const typeVal = typeAttr.current ?? "0";
    if (typeVal === "1") return { name: skill, proficiency: "proficient" };
    if (typeVal === "2") return { name: skill, proficiency: "expertise" };
    return null;
  }

  const profAttr =
    getAttr(
      attribs,
      formatted + "_prof"
    );

  if (profAttr && profAttr.current && profAttr.current !== "0") {
    return { name: skill, proficiency: "proficient" };
  }

  return null;
}).filter(Boolean),

    stats: {

      strength: {
       score: current(attribs, "strength") || current(attribs, "strength_base"),
       mod: current(attribs, "strength_mod"),
       save: current(attribs, "strength_save_bonus")
      },

      dexterity: {
        score: current(attribs, "dexterity") || current(attribs, "dexterity_base"),
        mod: current(attribs, "dexterity_mod"),
        save: current(attribs, "dexterity_save_bonus")
      },

      constitution: {
        score: current(attribs, "constitution") || current(attribs, "constitution_base"),
        mod: current(attribs, "constitution_mod"),
        save: current(attribs, "constitution_save_bonus")
      },

      intelligence: {
        score: current(attribs, "intelligence") || current(attribs, "intelligence_base"),
        mod: current(attribs, "intelligence_mod"),
        save: current(attribs, "intelligence_save_bonus")
      },

      wisdom: {
        score: current(attribs, "wisdom") || current(attribs, "wisdom_base"),
        mod: current(attribs, "wisdom_mod"),
        save: current(attribs, "wisdom_save_bonus")
      },

      charisma: {
        score: current(attribs, "charisma") || current(attribs, "charisma_base"),
        mod: current(attribs, "charisma_mod"),
        save: current(attribs, "charisma_save_bonus")
      }
    }
    
  };
  
  
}

function extractItems(attribs) {
  if (!attribs || !attribs.length) return [];
  const seen = new Set();
  const items = [];
  for (const attr of attribs) {
    if (!attr || !attr.name) continue;
    if (attr.name.includes("_itemname") && attr.name.startsWith("repeating_inventory_")) {
      const name = (attr.current || "").trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        items.push({ name, lookupName: cleanItemName(name), suffixRarity: extractSuffixRarity(name) });
      }
    }
  }
  return items;
}

function cleanItemName(raw) {
  return raw.replace(/\s*\((R|U|VR|L|A|C)\)\s*/g, "").replace(/[-]+\s*$/, "").trim();
}

function extractSuffixRarity(raw) {
  const map = { "(r)": "rare", "(u)": "uncommon", "(vr)": "very rare", "(l)": "legendary", "(a)": null };
  const matches = raw.match(/\(([^)]+)\)/g);
  if (!matches) return null;
  for (const m of matches) {
    const r = map[m.toLowerCase()];
    if (r) return r;
  }
  return null;
}
