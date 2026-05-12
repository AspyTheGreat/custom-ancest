function getAttr(attribs, name) {
  return attribs.find(a => a.name === name);
}

function current(attribs, name) {
  return getAttr(attribs, name)?.current || "";
}

function max(attribs, name) {
  return getAttr(attribs, name)?.max || "";
}

function parseCharacter(data) {

  const attribs = data.character.attribs;

  return {

    name: data.character.name,

    image: characterImages[data.character.name] || data.character.avatar,

    class:
      current(attribs, "class_display") ||
      current(attribs, "class"),

    level:
      current(attribs, "level"),

    hp: {
      current: current(attribs, "hp"),
      max: max(attribs, "hp")
    },

    skills: [
  "Acrobatics",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Investigation",
  "Perception",
  "Persuasion",
  "Stealth"
].filter(skill => {

  const attr =
    getAttr(
      attribs,
      skill.toLowerCase() + "_prof"
    );

  return attr?.current == "1";
}),

    stats: {

      strength: {
       score: current(attribs, "strength"),
       mod: current(attribs, "strength_mod"),
       save: current(attribs, "strength_save_bonus")
      },

      dexterity: {
        score: current(attribs, "dexterity"),
        mod: current(attribs, "dexterity_mod"),
        save: current(attribs, "dexterity_save_bonus")
      },

      constitution: {
        score: current(attribs, "constitution"),
        mod: current(attribs, "constitution_mod"),
        save: current(attribs, "constitution_save_bonus")
      },

      intelligence: {
        score: current(attribs, "intelligence"),
        mod: current(attribs, "intelligence_mod"),
        save: current(attribs, "intelligence_save_bonus")
      },

      wisdom: {
        score: current(attribs, "wisdom"),
        mod: current(attribs, "wisdom_mod"),
        save: current(attribs, "wisdom_save_bonus")
      },

      charisma: {
        score: current(attribs, "charisma"),
        mod: current(attribs, "charisma_mod"),
        save: current(attribs, "charisma_save_bonus")
      }
    }
    
  };
  
  
}
