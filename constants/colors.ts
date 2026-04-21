const GOLD = "#D4AF37";
const GOLD_LIGHT = "#E8CC6A";
const GOLD_DARK = "#A8892B";
const BLACK = "#0B0B0C";
const CARD = "#111113";
const CARD_ELEVATED = "#18181A";
const BORDER = "#232327";
const MUTED = "#6B6B75";
const TEXT = "#FFFFFF";
const TEXT_SECONDARY = "#A1A1AA";
const NAVY = "#0F2044";
const NAVY_LIGHT = "#1B3460";

// Light mode
const LIGHT_BG = "#F5F5F7";
const LIGHT_CARD = "#FFFFFF";
const LIGHT_CARD_ELEVATED = "#FAFAFA";
const LIGHT_BORDER = "#E5E5EA";
const LIGHT_MUTED = "#8E8E93";
const LIGHT_TEXT = "#1C1C1E";
const LIGHT_TEXT_SECONDARY = "#48484A";

export default {
  gold: GOLD,
  goldLight: GOLD_LIGHT,
  goldDark: GOLD_DARK,
  black: BLACK,
  card: CARD,
  cardElevated: CARD_ELEVATED,
  border: BORDER,
  muted: MUTED,
  text: TEXT,
  textSecondary: TEXT_SECONDARY,
  navy: NAVY,
  navyLight: NAVY_LIGHT,
  // Light mode colors
  lightBg: LIGHT_BG,
  lightCard: LIGHT_CARD,
  lightCardElevated: LIGHT_CARD_ELEVATED,
  lightBorder: LIGHT_BORDER,
  lightMuted: LIGHT_MUTED,
  lightText: LIGHT_TEXT,
  lightTextSecondary: LIGHT_TEXT_SECONDARY,
  // Theme objects
  dark: {
    bg: BLACK,
    card: CARD,
    cardElevated: CARD_ELEVATED,
    border: BORDER,
    muted: MUTED,
    text: TEXT,
    textSecondary: TEXT_SECONDARY,
    tabBar: BLACK,
    tint: GOLD,
    tabIconDefault: MUTED,
    tabIconSelected: GOLD,
  },
  light: {
    bg: LIGHT_BG,
    card: LIGHT_CARD,
    cardElevated: LIGHT_CARD_ELEVATED,
    border: LIGHT_BORDER,
    muted: LIGHT_MUTED,
    text: LIGHT_TEXT,
    textSecondary: LIGHT_TEXT_SECONDARY,
    tabBar: LIGHT_CARD,
    tint: GOLD_DARK,
    tabIconDefault: LIGHT_MUTED,
    tabIconSelected: GOLD_DARK,
  },
};
