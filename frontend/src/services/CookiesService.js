import Cookies from "js-cookie";

class CookiesService {
  setObject(value, key) {
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
    Cookies.remove(key, {
      secure: true,
      sameSite: "Strict",
    });
  }
}

const expiry = () => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 90);
  return expirationDate;
};

export default new CookiesService();
