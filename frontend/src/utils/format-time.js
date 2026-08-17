import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/pt';
import 'dayjs/locale/fr';
import 'dayjs/locale/nl';

export function setDayjsLocale(lang) {
  dayjs.locale(lang || 'en');
}

export function fDate(date, newFormat) {
  const fm = newFormat || "DD MMM YYYY";

  return date ? dayjs(date).format(fm) : "";
}