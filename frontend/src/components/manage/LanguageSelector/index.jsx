import { useTranslation } from "react-i18next";
import { Select, MenuItem } from "@mui/material";
import { setDocumentLang } from "~/utils/common";
import { setDayjsLocale } from "~/utils/format-time";
import { KeyboardArrowDown } from "@mui/icons-material";

export const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const handleChange = (event) => {
    localStorage.setItem("lang", event.target.value);
    i18n.changeLanguage(event.target.value);
    setDocumentLang(event.target.value);
    setDayjsLocale(event.target.value);
  };

  return (
    <Select
      onChange={handleChange}
      value={i18n.language}
      IconComponent={KeyboardArrowDown}
      sx={{
        ".MuiOutlinedInput-input": {
          padding: "5.5px 15px",
          position: "relative",
          color: "#181735",
          fontSize: ".875rem",
          fontWeight: "600",
          "&::after": {
            content: '""',
            height: "30px",
            borderRight: "2px solid #ececfd",
            margin: "0px 15px",
          },
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderRadius: "10px",
          border: "1px solid #ececfd",
        },
        "& .MuiSvgIcon-root": {
          color: "#181735",
          right: "15px",
        },
      }}
    >
      <MenuItem value="en" title="English">
        EN
      </MenuItem>
      <MenuItem value="de" title="Deutsch">
        DE
      </MenuItem>
      <MenuItem value="ar" title="العربية">
        AR
      </MenuItem>
      <MenuItem value="es" title="Español">
        ES
      </MenuItem>
      <MenuItem value="pt" title="Português">
        PT
      </MenuItem>
      <MenuItem value="fr" title="Français">
        FR
      </MenuItem>
      <MenuItem value="nl" title="Nederlands">
        NL
      </MenuItem>
    </Select>
  );
};
