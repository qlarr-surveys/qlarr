import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { buildIcon, loadIcon, replaceIDs } from "@iconify/react";
import axios from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import IconService from "~/services/IconService";
import styles from "./IconSelector.module.css";

function IconSelector({ currentIcon, onIconSelected }) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const defaultIcons = [
    "mdi:alphabet-a",
    "mdi:alphabet-b",
    "mdi:alphabet-c",
    "mdi:numeric-1-circle",
    "mdi:numeric-2-circle",
    "mdi:numeric-3-circle",
    "mdi:thumb-up",
    "mdi:thumb-down",
    "mdi:star",
    "mdi:heart",
    "mdi:check-circle",
    "mdi:alert-circle",
    "mdi:smiley",
    "mdi:smiley-outline",
    "ph:smiley",
    "ph:smiley-bold",
    "ph:smiley-duotone",
    "ph:smiley-fill",
    "ph:smiley-light",
    "ph:smiley-thin",
    "mdi:smiley-cry",
    "mdi:smiley-cry-outline",
    "mdi:smiley-sad",
    "mdi:smiley-sad-outline",
    "ph:smiley-meh",
    "ph:smiley-meh-bold",
    "ph:smiley-meh-duotone",
    "ph:smiley-meh-fill",
    "ph:smiley-meh-light",
    "ph:smiley-meh-thin",
    "ph:smiley-sad",
    "ph:smiley-sad-bold",
    "ph:smiley-sad-duotone",
    "ph:smiley-sad-fill",
    "ph:smiley-sad-light",
    "ph:smiley-sad-thin",
    "mdi:smiley-cool",
    "mdi:smiley-cool-outline",
    "mdi:smiley-dead",
    "mdi:smiley-dead-outline",
    "mdi:smiley-kiss",
    "mdi:smiley-kiss-outline",
    "mdi:smiley-poop",
    "mdi:smiley-wink",
    "mdi:smiley-wink-outline",
    "ph:lego-smiley",
    "ph:lego-smiley-bold",
    "ph:lego-smiley-duotone",
    "ph:lego-smiley-fill",
    "ph:lego-smiley-light",
    "ph:lego-smiley-thin",
    "ph:scan-smiley",
    "ph:scan-smiley-bold",
    "ph:scan-smiley-duotone",
    "ph:scan-smiley-fill",
    "ph:scan-smiley-light",
    "ph:scan-smiley-thin",
    "ph:smiley-wink",
    "ph:smiley-wink-bold",
    "ph:smiley-wink-duotone",
    "ph:smiley-wink-fill",
    "ph:smiley-wink-light",
    "ph:smiley-wink-thin",
  ];

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    // Search once typing pauses. Every result list loads icons from each set
    // in it, so searching on each keystroke multiplies requests to Iconify.
    const source = axios.CancelToken.source();
    const timer = setTimeout(() => {
      IconService.search(searchTerm, source)
        .then((result) => {
          setSearchResults(result);
        })
        .catch((e) => {
          console.error(e);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      source.cancel("Operation canceled by the user.");
    };
  }, [searchTerm]);

  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const iconsToDisplay = searchTerm ? searchResults : defaultIcons;

  return (
    <Dialog
      fullScreen={true}
      sx={{ margin: "200px" }}
      open={true}
      onClose={() => onIconSelected(false)}
      aria-labelledby="alert-dialog-title-logic-builder"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title-logic-builder">
        {t("select_icon")}
      </DialogTitle>
      <DialogContent>
        <div>
          <input
            type="text"
            autoFocus
            placeholder={t("search_icons")}
            value={searchTerm}
            onChange={handleInputChange}
          />

          <div className="search-results">
            {iconsToDisplay.map((icon) => (
              <SVGDisplay onClick={onIconSelected} key={icon} icon={icon} />
            ))}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onIconSelected(false)}>{t("cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default IconSelector;

function SVGDisplay({ icon, onClick }) {
  const [svgSource, setSvgSource] = useState("");
  useEffect(() => {
    let active = true;
    // loadIcon batches every tile into one request per icon set. Fetching each
    // icon's .svg separately trips Iconify's rate limit (HTTP 429) and leaves
    // blank tiles.
    loadIcon(icon)
      .then((data) => {
        if (active) {
          setSvgSource(toSvg(data));
        }
      })
      .catch((e) => console.error(e));
    return () => {
      active = false;
    };
  }, [icon]);
  return (
    <div
      onClick={() => {
        onClick(svgSource);
      }}
      className={styles.resultImage}
      dangerouslySetInnerHTML={{ __html: svgSource }}
    />
  );
}

function toSvg(iconData) {
  const { attributes, body } = buildIcon(iconData);
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${replaceIDs(body)}</svg>`;
}
