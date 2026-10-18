import axios from "axios";
import { ALLOWED_ICON_PREFIXES } from "~/constants/iconSets";

class IconService {
  search(searchTerm, cancelToken) {
    return new Promise((resolve, reject) => {
      axios
        .get("https://api.iconify.design/search", {
          params: {
            query: searchTerm,
            limit: 250,
            prefixes: ALLOWED_ICON_PREFIXES.join(","),
          },
          cancelToken: cancelToken.token,
        })
        .then((data) => {
          resolve(data.data.icons);
        })
        .catch((err) => {
          if (axios.isCancel(err)) {
            console.debug("Request canceled:", err.message);
          } else {
            reject(err);
          }
        });
    });
  }
}

export default new IconService();
