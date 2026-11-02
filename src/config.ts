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
  tagline: 'Specialty Coffee Ratio Calculator & Pulse Pour Timer',
  description: 'Precision coffee brewing ratio calculator and pulse pour timer for V60, French Press, AeroPress, Chemex, Drip Machine, and Cold Brew. Built to SCA Golden Cup standards with dual metric/imperial units.',
  url: 'https://brewratio.pages.dev',
  adsenseClient: 'ca-pub-2321353976447632',
  author: 'June Nine Studio',
};
