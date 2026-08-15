#!/usr/bin/env sh

cat <<EOF > /usr/share/caddy/config.js
window.APP_CONFIG = {
  FRONT_END_HOST: "${VITE_FRONT_END_HOST}",
  PROTOCOL: "${VITE_PROTOCOL}",
  BE_URL: "${VITE_BE_URL}",
};
EOF

exec "$@"
