import { Box } from "@mui/system";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { previewUrlByFilename, uploadFile } from "~/networking/run";
import { valueChange } from "~/state/runState";
import styles from "./PhotoCapture.module.css";
import { getFileFromPath } from '~/networking/common';
import { useService } from "~/hooks/use-service";
import { Button } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

function PhotoCapture(props) {
  const runService = useService("run");
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
    const validationMaxSize = (component.validation?.validation_max_file_size?.isActive &&
      component.validation?.validation_max_file_size?.max_size) || -1;
  
  // Limit to validation value or 10MB (10240 KB), whichever is smaller
  const IMAGE_MAX_SIZE_KB = 10240; // 10MB
  const maxFileSize = validationMaxSize > 0 
    ? Math.min(validationMaxSize, IMAGE_MAX_SIZE_KB)
    : IMAGE_MAX_SIZE_KB;
    if (preview && mode == "offline") {
      getFileFromPath("/dummy_image.png").then((response) => {
        uploadFile(runService, code, preview, response)
          .then((response) => {
            dispatch(
              valueChange({
                componentCode: props.component.qualifiedCode,
                value: response,
              })
            );
          })
          .catch((err) => {
            console.error(err);
          });
      });
    } else if (window["Android"]) {
      window["Android"].capturePhoto(code, maxFileSize);
      window["onPhotoCaptured" + code] = (value) => {
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
    <Box className={`${styles.container} ${styles.photoContainer}`}>
      {!state.value || !state.value.stored_filename ? (
        <Button
          onClick={onImageClick}
          variant="contained"
          color="primary"
        >
          <PhotoCameraIcon className={styles.largeIcon} />
        </Button>
      ) : (
        <img
          onClick={onImageClick}
          src={previewUrlByFilename(state.value.stored_filename)}
          className={styles.capturedImage}
        />
      )}
      <br />
      {component.showHint && <span>{component.content?.hint}</span>}
    </Box>




  );
}

export default PhotoCapture;
