import { MenuItem } from "@mui/material";
import { changeAttribute } from "~/state/design/designState";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import styles from "./SelectValue.module.css";
import { useTranslation } from "react-i18next";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { RHFSelect } from "~/components/hook-form";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function SelectValue({ label, rule, defaultValue, code, values, labels }) {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const value = useSelector((state) => {
    return state.designState[code]?.[rule] || defaultValue;
  });

  const onChange = (value) => {
    dispatch(changeAttribute({ code, key: rule, value }));
  };

  return (
    <div className={styles.selectValue} style={{ gap: "8px%" }}>
      <CustomTooltip body={tTooltips(label)} />
      <RHFSelect
        key={code + rule}
        name={`${code}.${rule}`}
        value={value}
        label={t(label)}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      >
        {values.map((element, index) => {
          return (
            <MenuItem key={element} value={element}>
              {labels ? labels[index] : element}
            </MenuItem>
          );
        })}
      </RHFSelect>
    </div>
  );
}

export default SelectValue;
