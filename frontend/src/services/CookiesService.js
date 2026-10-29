import { FRONT_END_DOMAIN } from "~/constants/networking";
import Cookies from "js-cookie";

class CookiesService {
  setObject(value, key) {
    removeLegacy(key);
    Cookies.set(key, JSON.stringify(value), {
      secure: true,
      sameSite: "Strict",
      expires: expiry(),
    });
  }

  getObject(key) {
    const value = Cookies.get(key);
    return value && JSON.parse(value);
  }

  removeByKey(key) {
    removeLegacy(key);
    Cookies.remove(key, {
      secure: true,
      sameSite: "Strict",
    });
  }
}

// Cookies used to be set with `domain: FRONT_END_DOMAIN`. A host-only cookie of
// the same name can't overwrite or remove that one, and js-cookie reads
// whichever the browser lists first, so a stale legacy cookie would shadow the
// current one. Drop it whenever we write or remove.
const removeLegacy = (key) => {
  Cookies.remove(key, { domain: FRONT_END_DOMAIN });
};

const expiry = () => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 90);
  return expirationDate;
};

export default new CookiesService();
