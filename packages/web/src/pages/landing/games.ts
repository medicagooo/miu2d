// Stable slugs shared by the landing, navigation and footer; preview never starts a game.
export const GAMES = [
  {
    slug: "sword1",
    key: "sword1",
    name: "新剑侠情缘",
    logo: "/screenshot/logo-new-swords.png",
    screenshot: "/screenshot/titles/sword1.png",
    position: "50% 40%",
    accent: "#e9bc78",
    subtitle: "01 / SWORD HEROES",
  },
  {
    slug: "demo",
    key: "yuying",
    name: "月影传说",
    logo: "/screenshot/logo-yuying.webp",
    screenshot: "/screenshot/titles/demo.jpg",
    position: "50% 45%",
    accent: "#a9d6cf",
    subtitle: "02 / MOON SHADOW",
  },
  {
    slug: "sword2",
    key: "sword2",
    name: "剑侠情缘2",
    logo: "/screenshot/logo-sword2.png",
    screenshot: "/screenshot/titles/sword2.bmp",
    position: "50% 45%",
    accent: "#c2b4e9",
    subtitle: "03 / SWORD HEROES II",
  },
] as const;
