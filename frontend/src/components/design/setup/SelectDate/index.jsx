import { TextField, Typography } from "@mui/material";
import { changeAttribute } from "~/state/design/designState";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import styles from "./SelectDate.module.css";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function SelectDate({ label, rule, code, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);

  const value = useSelector((state) => {
    return state.designState[code][rule] || "";
  });

  return (
    <div className={styles.selectDate}>
      <div className={styles.label}>
        <CustomTooltip body={tTooltips(label)} />
        <Typography fontWeight={700}>{t(label)}</Typography>
      </div>
      <TextField
        className={styles.selectDateField}
        variant="standard"
        size="small"
        value={value}
        type="date"
        onChange={(event) => {
          dispatch(
            changeAttribute({ code, key: rule, value: event.target.value })
          );
        }}
      />
    </div>
  );
}

export default SelectDate;
