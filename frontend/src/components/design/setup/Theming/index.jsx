import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import styles from "./Theming.module.css";
import ThemingItem from "./ThemingItem";
import ImageIcon from "@mui/icons-material/Image";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { changeAttribute, changeResources } from "~/state/design/designState";
import { defaultSurveyTheme } from "~/constants/theme";
import { Close, KeyboardArrowDown } from "@mui/icons-material";
import { useService } from "~/hooks/use-service";
import { ChromePicker } from "react-color";
import { useBoolean } from "~/hooks/use-boolean";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useRef } from "react";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";

const listFont = [
  "Merriweather",
  "Roboto",
  "Open Sans",
  "Lato",
  "Poppins",
  "Raleway",
  "Rubik",
  "Times New Roman",
  "Arial",
  "Courier New",
  "Georgia",
];

function Theming({ t }) {
  const designService = useService("design");

  const dispatch = useDispatch();

  const theme = useSelector((state) => {
    return state.designState.Survey.theme;
  });

  function handleChange(key, val) {
    if (key === "font") {
      const updatedTextStyles = { ...theme.textStyles };
      updatedTextStyles.group = { ...updatedTextStyles.group, font: val };
      updatedTextStyles.question = { ...updatedTextStyles.question, font: val };
      updatedTextStyles.text = { ...updatedTextStyles.text, font: val };

      dispatch(
        changeAttribute({
          code: "Survey",
          key: "theme",
          value: { ...theme, textStyles: updatedTextStyles },
        })
      );
    } else if (key === "textColor") {
      const updatedTextStyles = { ...theme.textStyles };
      updatedTextStyles.group = { ...updatedTextStyles.group, color: val };
      updatedTextStyles.question = {
        ...updatedTextStyles.question,
        color: val,
      };
      updatedTextStyles.text = { ...updatedTextStyles.text, color: val };

      dispatch(
        changeAttribute({
          code: "Survey",
          key: "theme",
          value: { ...theme, textStyles: updatedTextStyles, textColor: val },
        })
      );
    } else if (key === "bgColor") {
      // Check if the value is in rgba format
      const rgbaMatch = val.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d?\.?\d+)?\)/
      );

      if (rgbaMatch) {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        let a = rgbaMatch[4];

        if (!a || a === "0" || a === "0.0") {
          a = "1";
        }

        const newVal = `rgba(${r}, ${g}, ${b}, ${a})`;

        dispatch(
          changeAttribute({
            code: "Survey",
            key: "theme",
            value: { ...theme, bgColor: newVal },
          })
        );
      } else {
        dispatch(
          changeAttribute({
            code: "Survey",
            key: "theme",
            value: { ...theme, bgColor: val },
          })
        );
      }
    } else {
      dispatch(
        changeAttribute({
          code: "Survey",
          key: "theme",
          value: { ...theme, [key]: val },
        })
      );
    }
  }

  function handleBackgroundUpload(e) {
    e.preventDefault();
    let file = e.target.files[0];
    designService
      .uploadResource(file)
      .then((response) => {
        dispatch(
          changeResources({
            code: "Survey",
            key: "backgroundImage",
            value: response.name,
          })
        );
        dispatch(
          changeAttribute({
            code: "Survey",
            key: "theme",
            value: { ...theme, bgColor: "rgba(0, 0, 0, 0)" },
          })
        );
      })
      .catch((err) => {
        console.error(err);
      });
  }
  const handleBackgroundReset = () => {
    dispatch(
      changeResources({
        code: "Survey",
        key: "backgroundImage",
        value: null,
      })
    );
  };

  const showResetConfirm = useBoolean();

  const handleResetTheme = () => {
    dispatch(
      changeAttribute({
        code: "Survey",
        key: "theme",
        value: defaultSurveyTheme,
      })
    );
    dispatch(
      changeResources({
        code: "Survey",
        key: "backgroundImage",
        value: null,
      })
    );
    showResetConfirm.onFalse();
  };

  const showPrimaryPicker = useBoolean();
  const showBgPicker = useBoolean();
  const showPaperPicker = useBoolean();
  const showTextPicker = useBoolean();

  const closeAllPickers = () => {
    showPrimaryPicker.onFalse();
    showBgPicker.onFalse();
    showPaperPicker.onFalse();
    showTextPicker.onFalse();
  };

  const primaryPickerRef = useRef();
  const bgPickerRef = useRef();
  const paperPickerRef = useRef();
  const textPickerRef = useRef();

  function useClickOutside(ref, callback) {
    useEffect(() => {
      function handleClickOutside(event) {
        if (ref.current && !ref.current.contains(event.target)) {
          callback();
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [ref, callback]);
  }

  useClickOutside(primaryPickerRef, closeAllPickers);
  useClickOutside(bgPickerRef, closeAllPickers);
  useClickOutside(paperPickerRef, closeAllPickers);
  useClickOutside(textPickerRef, closeAllPickers);

  const togglePicker = (picker) => {
    if (picker.value) {
      picker.onFalse();
    } else {
      closeAllPickers(picker);
      picker.onToggle();
    }
  };

  const backgroundImage = useSelector(
    (state) => state.designState["Survey"]?.resources?.backgroundImage
  );
  return (
    <div className={styles.theming}>
      <Box className={styles.resetThemeContainer}>
        <Button
          variant="outlined"
          size="small"
          onClick={showResetConfirm.onTrue}
          className={styles.resetThemeButton}
        >
          {t("reset_theme")}
        </Button>
      </Box>
      <span className={styles.fontText}> {t("font")}</span>
      <Select
        key="fontFamily"
        sx={{
          "& .MuiSvgIcon-root": {
            color: "#16205b",
          },
        }}
        IconComponent={KeyboardArrowDown}
        size="small"
        className={styles.selectDropdown}
        value={theme.textStyles.group.font}
        onChange={(e) => handleChange("font", e.target.value)}
      >
        {listFont &&
          listFont.length > 0 &&
          listFont.map((el, index) => (
            <MenuItem
              key={`fontFamily-${index}`}
              sx={{ fontFamily: el }}
              value={el}
            >
              {el}
            </MenuItem>
          ))}
      </Select>
      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("group_title")}
        </Typography>

        <ThemingItem
          key="group"
          value={theme.textStyles.group}
          default={defaultSurveyTheme.textStyles.group}
          onChange={(val) => {
            handleChange("textStyles", {
              ...theme.textStyles,
              ["group"]: val,
            });
          }}
        />
      </Stack>
      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("question_title")}
        </Typography>
        <ThemingItem
          key="question"
          value={theme.textStyles.question}
          default={defaultSurveyTheme.textStyles.question}
          onChange={(val) =>
            handleChange("textStyles", {
              ...theme.textStyles,
              ["question"]: val,
            })
          }
        />
      </Stack>
      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("theme_text")}
        </Typography>
        <ThemingItem
          key="text"
          value={theme.textStyles.text}
          default={defaultSurveyTheme.textStyles.text}
          onChange={(val) =>
            handleChange("textStyles", {
              ...theme.textStyles,
              ["text"]: val,
            })
          }
        />
      </Stack>

      <hr />
      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
        position="relative"
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("highlight_color")}
        </Typography>
        <Button
          onClick={() => togglePicker(showPrimaryPicker)}
          style={{ backgroundColor: theme.primaryColor }}
          className={styles.colorBox}
        ></Button>
        {showPrimaryPicker.value && (
          <Box ref={primaryPickerRef} className={styles.colorPickerContainer}>
            <IconButton
              onClick={() => togglePicker(showPrimaryPicker)}
              style={{
                marginLeft: "auto",
                color: "#333",
              }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <ChromePicker
              color={theme.primaryColor}
              onChange={(color) => {
                handleChange(
                  "primaryColor",
                  `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`
                );
              }}
            />
          </Box>
        )}
      </Stack>

      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
        position="relative"
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("background_color")}
        </Typography>
        <Button
          onClick={() => togglePicker(showBgPicker)}
          style={{ backgroundColor: theme.bgColor }}
          className={styles.colorBox}
        ></Button>
        {showBgPicker.value && (
          <Box ref={bgPickerRef} className={styles.colorPickerContainer}>
            <IconButton
              onClick={() => togglePicker(showBgPicker)}
              style={{
                marginLeft: "auto",
                color: "#333",
              }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <ChromePicker
              color={theme.bgColor}
              onChange={(color) => {
                handleChange(
                  "bgColor",
                  `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`
                );
              }}
            />
          </Box>
        )}
      </Stack>
      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
        position="relative"
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("foreground_color")}
        </Typography>
        <Button
          onClick={() => togglePicker(showPaperPicker)}
          style={{ backgroundColor: theme.paperColor }}
          className={styles.colorBox}
        ></Button>
        {showPaperPicker.value && (
          <Box ref={paperPickerRef} className={styles.colorPickerContainer}>
            <IconButton
              onClick={() => togglePicker(showPaperPicker)}
              style={{
                marginLeft: "auto",
                color: "#333",
              }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <ChromePicker
              color={theme.paperColor}
              onChange={(color) => {
                handleChange(
                  "paperColor",
                  `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`
                );
              }}
            />
          </Box>
        )}
      </Stack>
      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
        position="relative"
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("text_color")}
        </Typography>
        <Button
          onClick={() => togglePicker(showTextPicker)}
          style={{ backgroundColor: theme.textStyles.group.color }}
          className={styles.colorBox}
        ></Button>
        {showTextPicker.value && (
          <Box ref={textPickerRef} className={styles.colorPickerContainer}>
            <IconButton
              onClick={() => togglePicker(showTextPicker)}
              style={{
                marginLeft: "auto",
                color: "#333",
              }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <ChromePicker
              color={theme.textStyles.group.color}
              onChange={(color) => {
                handleChange(
                  "textColor",
                  `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`
                );
              }}
            />
          </Box>
        )}
      </Stack>
      <Stack
        display="flex"
        justifyContent="space-between"
        width="100%"
        flexDirection="row"
        gap={1}
      >
        <Typography variant="subtitle2" alignSelf="center">
          {t("upload_background")}
        </Typography>
        <Button component="label" className={styles.chooseImage}>
          <ImageIcon />
          <input
            hidden
            accept="image/*"
            type="file"
            onChange={handleBackgroundUpload}
          />
        </Button>
        {backgroundImage && (
          <IconButton
            className={styles.resetButton}
            onClick={handleBackgroundReset}
          >
            <Close />
          </IconButton>
        )}
      </Stack>
      <ConfirmActionModal
        open={showResetConfirm.value}
        title={t("reset_theme_title")}
        description={t("reset_theme_description")}
        cancelLabel={t("cancel")}
        confirmLabel={t("reset_action")}
        confirmColor="warning"
        onClose={showResetConfirm.onFalse}
        onConfirm={handleResetTheme}
      />
    </div>
  );
}

export default Theming;
