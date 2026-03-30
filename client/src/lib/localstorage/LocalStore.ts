/**
 * Local storage service
 * 
 * @since app-skaffold--JP
 */
export const LS_KEYS = {
  THEME_MODE: 'cl-reporter-theme-mode',
} as const;

export class LocalStore {
  static getItem(key: typeof LS_KEYS[keyof typeof LS_KEYS]): string | null {
    return localStorage.getItem(key);
  }

  static setItem(key: typeof LS_KEYS[keyof typeof LS_KEYS], value: string): void {
    localStorage.setItem(key, value);
  }

  static removeItem(key: typeof LS_KEYS[keyof typeof LS_KEYS]): void {
    localStorage.removeItem(key);
  }
}
