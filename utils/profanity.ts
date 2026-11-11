// Filtro de groserías compartido entre cliente y servidor (SPEC 17).
// Lista espejo del array de la migración guard_comments_profanity:
// mantener ambos archivos en sincronía. La DB es la autoridad (trigger), esto
// es solo pre-check de UX en el formulario del comentario.

export const profanityWords: string[] = [
  // Español
  "carajo",
  "cabron", "cabrón", "cabrona", "cabrones",
  "coño", "coños",
  "culiao", "culiado", "culiada", "culiados", "culiadas",
  "estupido", "estúpido", "estupida", "estúpida",
  "estupidos", "estúpidos", "estupidas", "estúpidas",
  "forro", "forra", "forros", "forras",
  "huevon", "huevón", "huevona", "huevones",
  "idiota", "idiotas",
  "imbecil", "imbécil", "imbeciles", "imbéciles",
  "joder", "jodido", "jodida", "jodidos", "jodidas",
  "malparido", "malparida", "malparidos", "malparidas",
  "maricon", "maricón", "maricona", "maricones",
  "mierda", "mierdas",
  "pelotudo", "pelotuda", "pelotudos", "pelotudas",
  "pendejo", "pendeja", "pendejos", "pendejas",
  "pija", "pijas",
  "puta", "putas", "putita", "putito", "puto", "putos",
  "verga", "vergas",
  "weon", "weón", "weona", "weones",
  // English
  "asshole", "assholes",
  "bastard", "bastards",
  "bitch", "bitches",
  "cock", "cocks",
  "cunt", "cunts",
  "dick", "dicks",
  "fag", "fags", "faggot", "faggots",
  "bullshit",
  "fuck", "fucks", "fucked", "fucker", "fuckers", "fucking",
  "motherfucker", "motherfuckers", "motherfucking",
  "nigga", "niggas", "nigger", "niggers",
  "prick", "pricks",
  "pussy", "pussies",
  "shit", "shits", "shitty",
  "slut", "sluts",
  "twat", "twats",
  "wanker", "wankers",
  "whore", "whores",
];

export const PROFANITY_ERROR =
  "Tu comentario contiene palabras no permitidas. Revisalo.";

const wordSet = new Set(profanityWords);

// Coincide por palabra completa (token solo letras), igual que los límites de
// palabra del trigger: "computo" no matchea "puto".
export function containsProfanity(text: string): boolean {
  const tokens = text.toLowerCase().split(/[^\p{L}]+/u);
  return tokens.some((token) => wordSet.has(token));
}
