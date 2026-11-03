import axios from "axios";
import TokenService from "./TokenService";
import { BACKEND_BASE_URL } from '~/constants/networking';
const REFRESH_URL = "/user/refresh_token";

// The in-flight refresh, shared by every request that fails with 401 at the
// same time: refresh tokens rotate, so parallel refreshes would race.
let refreshing = null;

const refreshSession = () => {
  if (!refreshing) {
    refreshing = instance
      .post(REFRESH_URL, {
        accessToken: TokenService.getAuthToken(),
        refreshToken: TokenService.getRefreshToken(),
      })
      // A grace-window refresh carries no refresh token: keep the one in the
      // cookie, which another tab may have rotated in the meantime.
      .then((rs) =>
        TokenService.setSession({
          ...rs.data,
          refreshToken: rs.data.refreshToken ?? TokenService.getRefreshToken(),
        })
      )
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

const instance = axios.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = TokenService.getAuthToken();
    if (config.url !== REFRESH_URL && token) {
      config.headers["Authorization"] = "Bearer " + token;
    } else {
      delete config.headers["Authorization"];
    }

    config.baseURL = BACKEND_BASE_URL;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (res) => {
    return res;
  },
  async (err) => {
    const originalConfig = err.config;

    // Handle 403 Forbidden - Redirect to Unauthorized page
    if (err.response && err.response.status === 403) {
      window.location.href = "/unauthorized";
      return Promise.reject(err);
    }

    // Access Token was expired
    if (
      originalConfig.url !== REFRESH_URL &&
      err.response &&
      err.response.status === 401 &&
      !originalConfig._retry
    ) {
      originalConfig._retry = true;
      try {
        // A token change since this request was sent means a refresh already
        // happened (here or in another tab): retry with the new token rather
        // than rotating the refresh token again.
        const sentToken = originalConfig.headers["Authorization"]?.replace("Bearer ", "");
        if (sentToken === TokenService.getAuthToken()) {
          await refreshSession();
        }

        return instance(originalConfig);
      } catch (_error) {
        TokenService.removeSession();
        window.location.href = "/login";
        return Promise.reject(_error);
      }
    }

    return Promise.reject(err);
  }
);

export default instance;
