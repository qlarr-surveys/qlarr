const normalizeUrl = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url : url + '/';
};

export const FRONT_END_HOST = window.APP_CONFIG.FRONT_END_HOST;
export const FRONT_END_DOMAIN = window.APP_CONFIG.FRONT_END_HOST.split(":")[0];
export const PROTOCOL = window.APP_CONFIG.PROTOCOL;

export const BACKEND_BASE_URL = normalizeUrl(window.APP_CONFIG.BE_URL);
