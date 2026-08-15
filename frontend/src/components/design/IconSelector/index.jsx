import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import IconService from "~/services/IconService";
import styles from "./IconSelector.module.css";

function IconSelector({ currentIcon, onIconSelected }) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const [searchTerm, setSearchTerm] = useState("");
  const [cancelToken, setCancelToken] = useState(null);
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
    "jam:smiley",
    "guidance:smiley",
    "ph:smiley",
    "ph:smiley-bold",
    "ph:smiley-duotone",
    "ph:smiley-fill",
    "ph:smiley-light",
    "ph:smiley-thin",
    "octicon:smiley-16",
    "octicon:smiley-24",
    "f7:smiley",
    "f7:smiley-fill",
    "pajamas:smiley",
    "codicon:smiley",
    "dashicons:smiley",
    "fontisto:smiley",
    "el:smiley",
    "jam:smiley-f",
    "vaadin:smiley-o",
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
    "gis:map-smiley",
    "el:smiley-alt",
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
    "garden:smiley-fill-12",
    "garden:smiley-fill-16",
    "streamline:smiley-cool",
    "streamline:smiley-cool-solid",
    "streamline:smiley-cute",
    "streamline:smiley-cute-solid",
    "streamline:smiley-kiss",
    "streamline:smiley-kiss-solid",
    "streamline:smiley-mask",
    "streamline:smiley-mask-solid",
  ];

  useEffect(() => {
    if (cancelToken) {
      cancelToken.cancel("Operation canceled by the user.");
    }
    if (searchTerm) {
      // Define your API endpoint for icon search
      const source = axios.CancelToken.source();
      setCancelToken(source);
      IconService.search(searchTerm, source)
        .then((result) => {
          setSearchResults(result);
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      setSearchResults([]); // Clear the results if the search term is empty
    }
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
            placeholder={t("search_icons")}
            value={searchTerm}
            onChange={handleInputChange}
          />

          <div className="search-results">
            {iconsToDisplay.map((icon, index) => {
              const parts = icon.split(":");
              return (
                <SVGDisplay
                  onClick={onIconSelected}
                  key={index}
                  source={`https://api.iconify.design/${parts[0]}/${parts[1]}.svg`}
                />
              );
            })}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {}} autoFocus>
          {t("select")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default IconSelector;

function SVGDisplay({ source, onClick }) {
  const [svgSource, setSvgSource] = useState("");
  useEffect(() => {
    // Fetch the SVG source after the component mounts
    axios.get(source).then((response) => {
      if (isSVGValid(response.data)) {
        setSvgSource(response.data);
      }
    });
  }, [source]);
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

function isSVGValid(svgContent) {
  if (typeof svgContent !== "string") {
    return false;
  }

  // Check if the string starts with "<svg" and ends with "</svg>"
  return /^<svg[\s\S]*<\/svg>$/.test(svgContent);
}
