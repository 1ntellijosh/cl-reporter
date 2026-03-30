/**
 * Material UI theme configuration
 * 
 * @since app-skaffold--JP
 */
import { Oswald, Roboto } from 'next/font/google';
import { createTheme, type Theme } from '@mui/material/styles';

const oswald = Oswald({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const shared = {
  cssVariables: true,
  typography: {
    // Default font for the theme (used by CssBaseline and any variant that doesn't override)
    fontFamily: roboto.style.fontFamily,

    // Headings — <Typography variant="h1"> … variant="h6">
    h1: {},
    h2: {},
    h3: {},
    h4: {},
    h5: {},
    h6: {},

    // Body text — <Typography variant="body1"> (default), variant="body2">
    body1: { fontFamily: roboto.style.fontFamily },
    body2: { fontFamily: oswald.style.fontFamily },

    // Smaller / secondary text
    subtitle1: {}, // e.g. list primary line
    subtitle2: {}, // e.g. list secondary line
    caption: {},  // small helper text
    overline: {}, // labels, all-caps small

    // Buttons and inputs use this for their text
    button: {},
  },
  components: {
    MuiAlert: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { severity: 'info' as const },
              style: {
                backgroundColor: '#60a5fa',
              },
            },
          ],
        },
      },
    },
  },
};

export const lightTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    common: {
      white: '#a6a6a6'
    },
    // TODO: override light palette
    primary: { main: '#1976d2' },
    background: { default: '#f9f9f9', paper: '#fff' },
  },
});

export const darkTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    // TODO: override dark palette
    // primary: { main: '#90caf9' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
});

export type ThemeMode = 'light' | 'dark';

export function getTheme(mode: ThemeMode): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export default lightTheme;