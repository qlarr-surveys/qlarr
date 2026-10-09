import { useState } from "react";
import { Box } from "@mui/system";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { previewUrlByFilename, uploadFile } from "~/networking/run";
import { valueChange } from "~/state/runState";
import styles from "./VideoCapture.module.css";
import ReactPlayer from "react-player";
import { getFileFromPath } from "~/networking/common";
import { useService } from "~/hooks/use-service";
import { Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import UploadError, {
  MAX_VIDEO_UPLOAD_SIZE_KB,
  effectiveMaxSizeKb,
  uploadErrorFrom,
} from "~/components/Questions/shared/UploadError";

function VideoCapture(props) {
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
    // Limit to validation value or 30MB (30720 KB), whichever is smaller
    const maxFileSize = effectiveMaxSizeKb(component, MAX_VIDEO_UPLOAD_SIZE_KB);

    if (preview && mode == "offline") {
      setUploadError(undefined);
      getFileFromPath("/dummy_video.mp4")
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
      window["Android"].captureVideo(code, maxFileSize);
      window["onVideoCaptured" + code] = (value) => {
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
      {!state.value || !state.value.stored_filename ? (
        <Button
          onClick={onImageClick}
          variant="contained"
          color="primary"
        >
          <VideocamIcon className={styles.largeIcon} />
        </Button>
      ) : (
        <div className={styles.videoWrapper}>
          <ReactPlayer
            url={previewUrlByFilename(state.value.stored_filename)}
            loop={false}
            light={true}
            controls={true}
            config={{
              forceAudio: false,
            }}
            className={styles.videoPlayer}
            volume={1}
            width="100%"
            height="100%"
          />
        </div>
      )}
      <UploadError error={uploadError} />
      <br />
      {component.showHint && <span>{component.content?.hint}</span>}
    </Box>
  );
}

export default VideoCapture;
