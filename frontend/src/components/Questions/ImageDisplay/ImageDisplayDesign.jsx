import React, { useState } from "react";

import { useSelector } from "react-redux";
import { Button } from "@mui/material";
import PhotoIcon from "@mui/icons-material/Photo";
import { buildResourceUrl } from "~/networking/common";
import { useDispatch } from "react-redux";
import { changeResources } from "~/state/design/designState";
import styles from "./ImageDisplayDesign.module.css";
import LoadingDots from "~/components/common/LoadingDots";
import { useResourceUpload } from "~/hooks/useResourceUpload";

function ImageDisplayDesign({ code, t, onMainLang }) {
  const uploadResource = useResourceUpload();
  const dispatch = useDispatch();
  const [isUploading, setUploading] = useState(false);

  const state = useSelector((state) => {
    return state.designState[code];
  });

  const handleUpload = (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    // Clear the input so picking the same file again (e.g. a retry) still
    // fires onChange.
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    uploadResource(file)
      .then((response) => {
        if (response) {
          dispatch(
            changeResources({ code, key: "imageUrl", value: response.name })
          );
        }
      })
      .finally(() => {
        setUploading(false);
      });
  };

  return (
    <div className={styles.imageContainer}>
      {!isUploading && state.resources?.imageUrl && (
        <img
          className={styles.image}
          style={{
            '--qlarr-image-width': state.imageWidth?.endsWith('%')
              ? state.imageWidth
              : undefined,
          }}
          src={buildResourceUrl(state.resources.imageUrl)}
        />
      )}

      {isUploading ? (
        <div className={styles.buttonContainer}>
          <LoadingDots />
          <br />
          <span>{t("uploading_image")}</span>
        </div>
      ) : onMainLang ? (
        <div className={styles.buttonContainer}>
          <Button variant="outlined" 
          component="label"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
            <PhotoIcon className="mr-10" />
            {state.resources?.imageUrl ? t("replace_image") : t("upload_image")}
            <input
              hidden
              accept="image/*"
              type="file"
              onChange={handleUpload}
            />
          </Button>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export default React.memo(ImageDisplayDesign);
