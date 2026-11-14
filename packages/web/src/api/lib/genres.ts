export const GENRES = [
  { id: "edm", label: "EDM" },
  { id: "techno", label: "Techno" },
  { id: "dnb", label: "DnB" },
  { id: "melodic", label: "Melodic" },
  { id: "mextech", label: "Mextech" },
  { id: "house", label: "House" },
  { id: "night-bass", label: "Night Bass" },
  { id: "bass-boosted", label: "Bass Boosted" },
  { id: "breakbeats", label: "Breakbeats" },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];
export const GENRE_IDS = GENRES.map((g) => g.id) as [GenreId, ...GenreId[]];

export const APPROVAL_RULES = { ai: 3, original: 2 } as const;
