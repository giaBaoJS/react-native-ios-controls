import { Platform } from 'react-native';

/** 4pt base, 8pt rhythm for anything structural. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

const mono = Platform.select({
  ios: 'Menlo',
  default: 'monospace',
});

/** One ramp, used everywhere. Sizes pair with a fixed line height. */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '650' },
  heading: { fontSize: 15, lineHeight: 20, fontWeight: '650' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '550' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  mono: { fontSize: 12, lineHeight: 16, fontFamily: mono },
} as const;

export type Palette = {
  scrim: string;
  canvas: string;
  surface: string;
  surfaceRaised: string;
  hairline: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  positive: string;
  glyphPlate: string;
  glyphPlateOn: string;
};

const dark: Palette = {
  scrim: '#000000',
  canvas: '#0A0A0F',
  surface: '#141420',
  surfaceRaised: '#1C1C2A',
  hairline: '#26263A',
  border: '#2E2E44',
  text: '#F4F4F8',
  textSecondary: '#9C9CB4',
  textTertiary: '#6A6A82',
  accent: '#7C5CFF',
  accentSoft: 'rgba(124, 92, 255, 0.16)',
  onAccent: '#FFFFFF',
  positive: '#22D3A7',
  glyphPlate: '#2A2A3E',
  glyphPlateOn: '#FFFFFF',
};

const light: Palette = {
  scrim: '#0A0A0F',
  canvas: '#F4F4F7',
  surface: '#FFFFFF',
  surfaceRaised: '#F7F7FB',
  hairline: '#E8E8EF',
  border: '#DFDFE8',
  text: '#0E0E16',
  textSecondary: '#5C5C70',
  textTertiary: '#8C8CA0',
  accent: '#6A45FF',
  accentSoft: 'rgba(106, 69, 255, 0.12)',
  onAccent: '#FFFFFF',
  positive: '#0FA37F',
  glyphPlate: '#E9E9F2',
  glyphPlateOn: '#FFFFFF',
};

export const palettes = { dark, light };

/** The tint swatches offered in the editor, mirrored into control state. */
export const TINTS = [
  { name: 'Iris', value: '#7C5CFF' },
  { name: 'Mint', value: '#22D3A7' },
  { name: 'Amber', value: '#F5A524' },
  { name: 'Rose', value: '#FF5C8A' },
  { name: 'Sky', value: '#38BDF8' },
] as const;
