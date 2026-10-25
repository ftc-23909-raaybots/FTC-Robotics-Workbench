export interface AppTheme {
  id: string;
  name: string;
  description: string;
  colors: [string, string, string, string];
}

export const APP_THEMES: AppTheme[] = [
  {
    id: "kinetic",
    name: "Kinetic",
    description: "Poster-scale type, near-black surfaces, and direct orange accents.",
    colors: ["#101010", "#ffffff", "#ff6b00", "#5c5c5c"],
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Monospaced black-and-green instrument readout with fine rules.",
    colors: ["#000000", "#66ff66", "#255325", "#ffffff"],
  },
  {
    id: "playful-geometric",
    name: "Playful Geometric",
    description: "Warm paper, outlined panels, and violet, pink, amber, and mint.",
    colors: ["#fffdf5", "#253044", "#6434df", "#9bf1cd"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Ivory, measured serif headings, and restrained gold details.",
    colors: ["#f7f4ec", "#29271f", "#8b713a", "#d4ccbd"],
  },
  {
    id: "industrial",
    name: "Industrial",
    description: "Cool-grey chassis, recessed dark fields, and orange indicators.",
    colors: ["#cbd0d2", "#181e22", "#f15b22", "#20272b"],
  },
  {
    id: "retro",
    name: "Retro",
    description: "Classic grey window frames, vivid teal, yellow, and purple.",
    colors: ["#d4d4d4", "#000000", "#6600ff", "#008080"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Black and electric green, with sparing cyan and magenta signals.",
    colors: ["#020303", "#f8fffa", "#38ff8e", "#65f8ff"],
  },
  {
    id: "newsprint",
    name: "Newsprint",
    description: "Warm paper, editorial serif typography, and restrained red rules.",
    colors: ["#f3efe5", "#191916", "#a3231d", "#9b978e"],
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "Alabaster and charcoal, Garamond headings, and fine gold.",
    colors: ["#f3eee4", "#262321", "#b69355", "#e4dbcc"],
  },
  {
    id: "modern-dark",
    name: "Modern Dark",
    description: "Quiet graphite surfaces, crisp white type, and a mint signal.",
    colors: ["#050505", "#f2f2f2", "#3fd6c6", "#222222"],
  },
  {
    id: "software",
    name: "Software",
    description: "Open light surfaces, readable cards, and electric-blue actions.",
    colors: ["#fcfcfd", "#16191f", "#074ce0", "#f3f4f6"],
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Flat black and white, serif hierarchy, and quiet rules.",
    colors: ["#ffffff", "#000000", "#4d4d4d", "#cfcfcf"],
  },
  {
    id: "botanical",
    name: "Botanical",
    description: "Cream paper, forest-green type, and softly bounded surfaces.",
    colors: ["#f5efdf", "#1e382c", "#895440", "#e0e5d3"],
  },
];

export const DEFAULT_THEME_ID = "playful-geometric";

export function readThemeId(storage: Storage): string {
  const saved = storage.getItem("field-telemetry-theme");
  return saved && APP_THEMES.some((theme) => theme.id === saved)
    ? saved
    : DEFAULT_THEME_ID;
}
