// Common Dutch stopwords to filter out
const stopwords = new Set([
  'de', 'het', 'een', 'en', 'van', 'in', 'op', 'te', 'met', 'voor', 'is', 'dat', 
  'die', 'om', 'je', 'we', 'ze', 'hij', 'zij', 'ik', 'of', 'naar', 'bij', 'er', 
  'door', 'als', 'om', 'tot', 'over', 'aan', 'om', 'tegen', 'u', 'jou', 'jullie',
  'mijn', 'jouw', 'zijn', 'haar', 'onze', 'hun', 'deze', 'die', 'dit', 'dat',
  'meer', 'minder', 'veel', 'weinig'
]);

// Categories/Themes mapping
const THEMES = [
  {
    name: "Duurzaamheid & Milieu",
    keywords: ["duurzaam", "milieu", "groen", "klimaat", "natuur", "afval", "recycl", "aarde", "energie", "solar", "wind", "co2", "plastic", "boom", "bomen"],
    nuance: "Ze dragen allebei bij aan een groenere en duurzamere leefomgeving."
  },
  {
    name: "Onderwijs & Studie",
    keywords: ["stud", "school", "leren", "les", "han", "hbo", "universiteit", "docent", "student", "cursus", "onderwijs", "klas", "examen", "toets", "college"],
    nuance: "Ze beschrijven allebei processen rondom leren, lessen of docenten."
  },
  {
    name: "Mobiliteit & Vervoer",
    keywords: ["auto", "bus", "trein", "fiets", "reizen", "vervoer", "mobiliteit", "verkeer", "weg", "station", "rit", "mobus", "lopen", "tram", "metro"],
    nuance: "Ze gaan allebei over reizen, transport of beweging over de weg."
  },
  {
    name: "Gezondheid & Welzijn",
    keywords: ["gezond", "sport", "bewegen", "voeding", "eten", "slaap", "rust", "mentaal", "fit", "arts", "zorg", "welzijn", "stress", "gelukkig", "ziek"],
    nuance: "Ze richten zich allebei op vitaliteit, gezonde keuzes of mentaal welzijn."
  },
  {
    name: "Werk & Organisatie",
    keywords: ["werk", "baan", "collega", "kantoor", "vergader", "team", "project", "organis", "bedrijf", "management", "leider", "kantoor", "meeting"],
    nuance: "Ze hebben beide te maken met kantoortaken, samenwerken of projectbeheer."
  },
  {
    name: "Technologie & Digitaal",
    keywords: ["app", "web", "software", "tech", "computer", "online", "digitaal", "code", "systeem", "data", "internet", "ai", "telefoon", "mobiel"],
    nuance: "Ze gaan allebei over software, apps of digitale innovaties."
  },
  {
    name: "Financiën & Budget",
    keywords: ["geld", "finan", "budget", "kosten", "prijs", "goedkoop", "duur", "kopen", "winst", "sparen", "subsidie", "lening", "belasting"],
    nuance: "Ze beschrijven kosten, besparingen of financiële afwegingen."
  },
  {
    name: "Vrije Tijd & Hobby",
    keywords: ["hobby", "leuk", "spelen", "game", "vakantie", "film", "muziek", "boek", "kunst", "uitgaan", "feest", "ontspan", "gamen"],
    nuance: "Ze gaan allebei over recreatie, ontspanning of plezierige activiteiten."
  },
  {
    name: "Communicatie & Ideeën",
    keywords: ["praat", "communic", "discussie", "idee", "concept", "brainstorm", "overleg", "present", "feedback", "praten", "luisteren"],
    nuance: "Ze gaan beide over praten, overleggen of het delen van ideeën."
  }
];

// Helper function to tokenize and clean text
const cleanAndTokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "") // strip punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word));
};

// Find matching themes for each text
const findThemes = (words) => {
  const matched = new Set();
  for (const word of words) {
    for (const theme of THEMES) {
      for (const keyword of theme.keywords) {
        if (word.includes(keyword)) {
          matched.add(theme.name);
        }
      }
    }
  }
  return matched;
};

// Sync check for theme matches between two texts
export function checkThemeMatch(text1, text2) {
  const words1 = cleanAndTokenize(text1);
  const words2 = cleanAndTokenize(text2);
  
  const themes1 = findThemes(words1);
  const themes2 = findThemes(words2);
  
  for (const theme of themes1) {
    if (themes2.has(theme)) {
      return true;
    }
  }
  return false;
}

// Generate Dutch connection explanations
export function getThemeExplanation(text1, text2) {
  const isBediening = (t) => {
    if (!t) return false;
    const l = t.toLowerCase();
    return l.includes("sleep") || l.includes("wissen") || l.includes("dubbelklik") || l.includes("bewerken");
  };
  
  if (isBediening(text1) && isBediening(text2)) {
    return "Beide ideeën gaan over directe tokenbediening.";
  }
  
  const words1 = cleanAndTokenize(text1);
  const words2 = cleanAndTokenize(text2);
  const themes1 = findThemes(words1);
  const themes2 = findThemes(words2);
  
  for (const theme of THEMES) {
    if (themes1.has(theme.name) && themes2.has(theme.name)) {
      return `Beide ideeën gaan over ${theme.name.toLowerCase()}.`;
    }
  }
  
  return "Beide ideeën liggen dicht bij elkaar op het bord.";
}

export async function generateGroupName(text1, text2) {
  const words1 = cleanAndTokenize(text1);
  const words2 = cleanAndTokenize(text2);

  const themes1 = findThemes(words1);
  const themes2 = findThemes(words2);

  // Find shared theme
  for (const theme of themes1) {
    if (themes2.has(theme)) {
      return theme;
    }
  }

  // If no shared theme, check if one of the texts matches a theme
  if (themes1.size > 0 && themes2.size > 0) {
    // Return a combination of two themes
    const t1 = Array.from(themes1)[0];
    const t2 = Array.from(themes2)[0];
    if (t1 !== t2) {
      // Shorten the combination if too long, e.g. "Sport & Werk" rather than full names
      const shortName = (name) => name.split(" ")[0];
      return `${shortName(t1)} & ${shortName(t2)}`;
    }
  }

  // Fallback to combining the most important word from each text
  const getSignificantNoun = (words) => {
    // Pick the longest word that isn't a stopword as a heuristic for a noun/important word
    if (words.length === 0) return null;
    return words.reduce((longest, current) => current.length > longest.length ? current : longest, words[0]);
  };

  const noun1 = getSignificantNoun(words1);
  const noun2 = getSignificantNoun(words2);

  if (noun1 && noun2) {
    const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1);
    return `${cap(noun1)} & ${cap(noun2)}`;
  } else if (noun1) {
    const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1);
    return `Cluster: ${cap(noun1)}`;
  } else if (noun2) {
    const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1);
    return `Cluster: ${cap(noun2)}`;
  }

  return "Nieuw cluster";
}
