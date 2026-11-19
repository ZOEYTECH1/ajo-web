import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';
import ha from './locales/ha.json';
import yo from './locales/yo.json';
import ig from './locales/ig.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ha', label: 'Hausa' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'ig', label: 'Igbo' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

const resources = { en: { translation: en }, fr: { translation: fr }, es: { translation: es },
  de: { translation: de }, ha: { translation: ha }, yo: { translation: yo }, ig: { translation: ig } };

// Same "synchronous read from localStorage" shape as ThemeContext.tsx --
// no flash-of-wrong-language, since (unlike the mobile app's SecureStore)
// localStorage reads are synchronous.
function detectBrowserLanguage(): LanguageCode {
  const nav = navigator.languages?.[0] ?? navigator.language ?? 'en';
  const short = nav.split('-')[0];
  return (supportedCodes.includes(short) ? short : 'en') as LanguageCode;
}

const stored = localStorage.getItem('ajo-language') as LanguageCode | null;

i18n.use(initReactI18next).init({
  resources,
  lng: stored ?? detectBrowserLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(code: LanguageCode) {
  localStorage.setItem('ajo-language', code);
  i18n.changeLanguage(code);
}

export default i18n;
