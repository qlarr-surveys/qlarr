import React, { useState } from "react";

import { useSelector } from "react-redux";
import ReactPlayer from "react-player";
import { Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import { buildResourceUrl } from "~/networking/common";
import { useDispatch } from "react-redux";
import { changeResources } from "~/state/design/designState";
import styles from "./VideoDisplay.module.css";
import LoadingDots from "~/components/common/LoadingDots";
import { useResourceUpload } from "~/hooks/useResourceUpload";

function VideoDisplayDesign({ code, t, onMainLang }) {
  const uploadResource = useResourceUpload();
  const dispatch = useDispatch();
  const [isUploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const state = useSelector((state) => {
    return state.designState[code];
  });

  const handleVideoUpload = (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    // Clear the input so picking the same file again (e.g. a retry) still
    // fires onChange.
    e.target.value = "";
    if (!file) return;
    setProgress(0);
    setUploading(true);
    uploadResource(file, { onProgress: setProgress })
      .then((response) => {
        if (response) {
          dispatch(changeResources({ code, key: "videoUrl", value: response.name }));
        }
      })
      .finally(() => {
        setUploading(false);
      });
  };

  return (
    <>
      {!isUploading && state.resources?.videoUrl && (
        <div
          className={styles.videoWrapper}
          style={{ '--qlarr-video-padding': state.audio_only ? '10%' : '56%' }}
        >
          <ReactPlayer
            url={buildResourceUrl(state.resources.videoUrl)}
            loop={state.loop || false}
            light={true}
            controls={true}
            config={{
              forceAudio: state.audio_only || false,
            }}
            className={styles.videoPlayer}
            volume={1}
            width="100%"
            height="100%"
          />
        </div>
      )}

      {isUploading ? (
        <div className={styles.buttonContainer}>
          <LoadingDots />
          <br />
          <span>
            {t("uploading_video")} {progress}%
          </span>
        </div>
      ) : onMainLang ? (
        <div className={styles.buttonContainer}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<VideocamIcon />}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {state.resources?.videoUrl ? t("replace_video") : t("upload_video")}
            <input
              hidden
              id={code}
              accept="video/*"
              type="file"
              onChange={handleVideoUpload}
            />
          </Button>
        </div>
      ) : (
        <></>
      )}
    </>
  );
}

export default VideoDisplayDesign;
