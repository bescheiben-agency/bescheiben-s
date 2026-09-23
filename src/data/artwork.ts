import type { ImageMetadata } from 'astro';

import diagnosticDesktop from '../assets/artwork/diagnostic-desktop.png';
import diagnosticMobile from '../assets/artwork/diagnostic-mobile.png';
import homeDesktop from '../assets/artwork/home-desktop.png';
import homeMobile from '../assets/artwork/home-mobile.png';
import institutionalDesktop from '../assets/artwork/institutional-desktop.png';
import institutionalMobile from '../assets/artwork/institutional-mobile.png';

export type ArtworkKey = 'home' | 'institutional' | 'diagnostic';

export interface ArtworkSourcePair {
  readonly desktop: ImageMetadata;
  readonly mobile: ImageMetadata;
}

export const artwork = {
  home: {
    desktop: homeDesktop,
    mobile: homeMobile,
  },
  institutional: {
    desktop: institutionalDesktop,
    mobile: institutionalMobile,
  },
  diagnostic: {
    desktop: diagnosticDesktop,
    mobile: diagnosticMobile,
  },
} as const satisfies Record<ArtworkKey, ArtworkSourcePair>;
