export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  adsenseClient?: string;
  analyticsToken?: string;
  author: string;
}

export const site: SiteConfig = {
  name: 'BrewRatio',
  tagline: 'Precision Coffee Ratio Calculator & Pour Timer',
  description: 'Free, privacy-friendly specialty coffee brewing calculator and pulse pour timer for V60, French Press, AeroPress, Chemex, Phin, and Cold Brew.',
  url: 'https://brewratio.pages.dev',
  adsenseClient: 'ca-pub-2321353976447632',
  author: 'June Nine Studio',
};
