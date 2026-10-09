import { useState } from "react";
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
import UploadError, {
  MAX_UPLOAD_SIZE_KB,
  effectiveMaxSizeKb,
  uploadErrorFrom,
} from "~/components/Questions/shared/UploadError";

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
  const [uploadError, setUploadError] = useState();

  const onImageClick = () => {
    const code = component.qualifiedCode;
    // Limit to validation value or 10MB (10240 KB), whichever is smaller
    const maxFileSize = effectiveMaxSizeKb(component, MAX_UPLOAD_SIZE_KB);
    if (preview && mode == "offline") {
      setUploadError(undefined);
      getFileFromPath("/dummy_image.png")
        .then((file) => uploadFile(runService, code, preview, file))
        .then((response) => {
          dispatch(
            valueChange({
              componentCode: props.component.qualifiedCode,
              value: response,
            })
          );
        })
        .catch((err) => {
          setUploadError(uploadErrorFrom(err, maxFileSize));
          console.error(err);
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
      <UploadError error={uploadError} />
      <br />
      {component.showHint && <span>{component.content?.hint}</span>}
    </Box>




  );
}

export default PhotoCapture;
