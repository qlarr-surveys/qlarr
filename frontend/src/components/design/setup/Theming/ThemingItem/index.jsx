import { KeyboardArrowDown } from "@mui/icons-material";
import { MenuItem, Select } from "@mui/material";
import styles from "./ThemingItem.module.css";

function ThemingItem(props) {
  const listFontSize = Array.from({ length: 12 }, (_, index) => index * 2 + 10);

  function handleChange(key, value) {
    props.onChange({ ...props.value, [key]: value });
  }

  return (
    <div className={styles.themingItem}>
      <div className={styles.themingItemBody}>
        <Select
          key="fontSize"
          size="small"
          value={props.value.size || props.default.size}
          onChange={(e) => handleChange("size", e.target.value)}
          IconComponent={KeyboardArrowDown}
          className={styles.selectDropdown}
          sx={{
            "& .MuiSvgIcon-root": {
              color: "#16205b",
            },
          }}
        >
          {listFontSize &&
            listFontSize.length > 0 &&
            listFontSize.map((el, index) => (
              <MenuItem key={`fontSize-${index}`} value={el}>
                {el}
              </MenuItem>
            ))}
        </Select>
      </div>
    </div>
  );
}

export default ThemingItem;
