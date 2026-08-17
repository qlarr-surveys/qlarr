import React, { useState } from "react";

import { useSelector } from "react-redux";
import { Button } from "@mui/material";
import PhotoIcon from "@mui/icons-material/Photo";
import { buildResourceUrl } from "~/networking/common";
import { useDispatch } from "react-redux";
import { changeResources } from "~/state/design/designState";
import styles from "./ImageDisplayDesign.module.css";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";

function ImageDisplayDesign({ code, t, onMainLang }) {
  const designService = useService("design");
  const dispatch = useDispatch();
  const [isUploading, setUploading] = useState(false);

  const state = useSelector((state) => {
    return state.designState[code];
  });

  const handleUpload = (e) => {
    e.preventDefault();
    setUploading(true);
    let file = e.target.files[0];
    designService
      .uploadResource(file)
      .then((response) => {
        setUploading(false);
        dispatch(
          changeResources({ code, key: "imageUrl", value: response.name })
        );
      })
      .catch((err) => {
        console.error(err);
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
