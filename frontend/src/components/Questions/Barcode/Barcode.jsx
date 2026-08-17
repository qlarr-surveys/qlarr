import { Box } from "@mui/system";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { valueChange } from "~/state/runState";
import styles from "./Barcode.module.css";
import { TextField, Button } from "@mui/material";
import { useTheme } from "@emotion/react";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

function Barcode(props) {
  const theme = useTheme();
  const component = props.component;
  const state = useSelector((state) => {
    return state.runState.values[component.qualifiedCode];
  });


  const preview = useSelector((state) => {
    return state.runState.preview;
  });

  const mode = useSelector((state) => {
    return state.runState.values.Survey.mode;
  });
  const dispatch = useDispatch();

  const onImageClick = () => {
    const code = component.qualifiedCode;
    if (preview && mode == "offline") {
      dispatch(
        valueChange({
          componentCode: code,
          value: "This is a Dummy Barcode",
        })
      );
    } else if (window["Android"]) {
      window["Android"].scanBarcode(code);
      window["onBarcodeScanned" + code] = (value) => {
        dispatch(
          valueChange({
            componentCode: code,
            value,
          })
        );
      };
    } else {
      console.debug("no android device!!");
    }
  };

  return (
    <Box className={styles.container}>
      <Button
        onClick={onImageClick}
        variant="contained"
        color="primary"
      >
        <QrCodeScannerIcon className={styles.largeIcon} />
      </Button>
      <br />
      {component.showHint && <span>{component.content?.hint}</span>}
      <TextField
        variant="standard"
        required={
          props.component.validation?.validation_required?.isActive
            ? true
            : false
        }
        value={state.value}
        size="small"
      />
    </Box>
  );
}

export default Barcode;
