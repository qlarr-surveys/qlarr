import { Box } from "@mui/material";
import { memo } from "react";
import styles from "./ErrorDisplay.module.css";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { mapComponentError, mapInstructionError, getHighlighted } from "~/utils/design/errorDisplay.jsx";
import useErrorDisplay from "./useErrorDisplay";

function ErrorDisplay(props) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const { errors, designErrors, instructions, hasErrors, onErrClick, currentLang } =
    useErrorDisplay(props.code);

  return hasErrors ? (
    <Box className={styles.errorDisplay}>
      {errors &&
        errors.map((el) => {
          const { label, message } = mapComponentError(props.code, el, t);
          return (
            <div key={el} className={styles.errorItem}>
              <CloseIcon style={{ verticalAlign: "middle" }} />
              <span className={styles.errorCode}>{label}</span>
              {message && <span className={styles.errorMessage}>{message}</span>}
            </div>
          );
        })}
      {designErrors &&
        designErrors.map((el) => (
          <div key={el.code} className={styles.errorItem}>
            <CloseIcon style={{ verticalAlign: "middle" }} />
            <span className={styles.errorCode}>{el.code}</span>
            {el.message && <span className={styles.errorMessage}>{el.message}</span>}
          </div>
        ))}
      {instructions &&
        instructions.map((el) => {
          const { label, message } = mapInstructionError(el, t, currentLang);
          return (
            <div
              className={`${styles.errorItem}${getHighlighted(el.code) ? ` ${styles.clickable}` : ""}`}
              onClick={() => onErrClick(el)}
              key={el.code}
            >
              <ErrorOutlineIcon style={{ verticalAlign: "middle" }} />
              <span className={styles.errorCode}>{label}</span>
              {message && <span className={styles.errorMessage}>{message}</span>}
            </div>
          );
        })}
    </Box>
  ) : null;
}

export default memo(ErrorDisplay);
