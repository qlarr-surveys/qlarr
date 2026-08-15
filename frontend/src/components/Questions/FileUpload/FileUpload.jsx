import React, { useState } from "react";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { previewUrlByFilename, uploadFile } from "~/networking/run";
import styles from "./FileUpload.module.css";
import { useDispatch, useSelector } from "react-redux";
import ValidationItem from "~/components/run/ValidationItem";
import { valueChange } from "~/state/runState";
import { setDirty } from "~/state/templateState";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import { fileTypesToMimesArray } from "~/state/design/addInstructions";

function FileUpload(props) {
  const runService = useService("run");

  const { t } = useTranslation(NAMESPACES.RUN);

  let accepted = fileTypesToMimesArray(
    props.component.validation?.validation_file_types?.fileTypes
  );

  const validationMaxSize =
    (props.component.validation?.validation_max_file_size?.isActive &&
      props.component.validation?.validation_max_file_size?.max_size) ||
    -1;

  // Limit to validation value or 10MB (10240 KB), whichever is smaller
  const MAX_FILE_SIZE = 10240; // 10MB
  const maxFileSize = validationMaxSize > 0
    ? Math.min(validationMaxSize, MAX_FILE_SIZE)
    : MAX_FILE_SIZE;

  const state = useSelector((state) => {
    let questionState = state.runState.values[props.component.qualifiedCode];
    return questionState?.value;
  });

  const preview = useSelector((state) => {
    return state.runState.preview;
  });

  const dispatch = useDispatch();

  const [selectedFile, setSelectedFile] = useState();
  const [isUploading, setUploading] = useState(false);

  const previewAndroid = () => {
    window["Android"].previewFileUpload(state.stored_filename, state.filename);
  };

  const invalidSelectedFile =
    !isUploading &&
    selectedFile &&
    accepted.length > 0 &&
    !accepted.includes(selectedFile.type);

  const invalidSize =
    !isUploading &&
    selectedFile &&
    maxFileSize > 0 &&
    selectedFile.size / 1024 > maxFileSize;

  const changeHandler = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    dispatch(setDirty(props.component.qualifiedCode));
    setSelectedFile(file);

    const invalidType = accepted.length > 0 && !accepted.includes(file.type);
    const tooBig = maxFileSize > 0 && file.size / 1024 > maxFileSize;

    if (!invalidType && !tooBig) {
      uploadSelectedFile(file);
    }
  };

  const uploadSelectedFile = (file) => {
    if (!file) return;
    setUploading(true);
    uploadFile(runService, props.component.qualifiedCode, preview, file)
      .then((response) => {
        setUploading(false);
        setSelectedFile(undefined);
        dispatch(
          valueChange({
            componentCode: props.component.qualifiedCode,
            value: response,
          })
        );
      })
      .catch((err) => {
        setUploading(false);
        console.error(err);
      });
  };

  const resetSelectedFile = () => {
    setSelectedFile(undefined);
  };

  const onButtonClick = (event) => {
    if (window["Android"]) {
      event.preventDefault();
      const code = props.component.qualifiedCode;
      window["Android"].selectFile(
        code,
        accepted?.join(",") || "",
        maxFileSize || -1
      );
      window["onFileSelected" + code] = (name, size, type) => {
        const fileLike = { name, size, type };
        dispatch(setDirty(code));
        setSelectedFile(fileLike);

        const invalidType = accepted.length > 0 && !accepted.includes(type);
        const tooBig = maxFileSize > 0 && size / 1024 > maxFileSize;

        if (!invalidType && !tooBig) {
          uploadSelectedFile(fileLike);
        }
      };
    }
  };

  return (
    <div>
      <label htmlFor={`upload-file-${props.component.qualifiedCode}`}>
        <input
          className={styles.hiddenInput}
          id={`upload-file-${props.component.qualifiedCode}`}
          type="file"
          accept={accepted ? accepted.join(",") : undefined}
          onChange={changeHandler}
        />
        <Button
          disabled={isUploading}
          onClick={onButtonClick}
          variant="contained"
          component="span"
        >
          {t("choose_file")}
        </Button>
      </label>
      {!selectedFile ? (
        ""
      ) : (
        <React.Fragment>
          <span>
            &nbsp;{selectedFile.name} - {Math.round(selectedFile.size / 1024)}K
          </span>

          <Button
            disabled={isUploading}
            variant="text"
            onClick={resetSelectedFile}
          >
            {t("cancel")}
          </Button>
        </React.Fragment>
      )}

      {invalidSize && (
        <React.Fragment>
          <br />
          <ValidationItem
            name="validation_max_file_size"
            validation={{ ...props.component.validation?.validation_max_file_size, max_size: maxFileSize }}
          />
        </React.Fragment>
      )}

      {invalidSelectedFile && (
        <React.Fragment>
          <br />
          <ValidationItem
            name="validation_file_types"
            validation={props.component.validation?.validation_file_types}
          />
        </React.Fragment>
      )}

      {isUploading ? (
        <div className={styles.uploadingCenter}>
          <LoadingDots />
          <br />
          <span>{t("uploading")}</span>
        </div>
      ) : !state || !state.stored_filename ? (
        ""
      ) : (
        <React.Fragment>
          <br />
          <br />
          {window["Android"] ? (
            <Link target="_blank" onClick={previewAndroid}>
              {state.filename} - {Math.round(state.size / 1024)}K
            </Link>
          ) : (
            <Link
              target="_blank"
              href={previewUrlByFilename(state.stored_filename)}
            >
              {state.filename} - {Math.round(state.size / 1024)}K
            </Link>
          )}

          <Button
            variant="text"
            size="small"
            onClick={() =>
              dispatch(
                valueChange({
                  componentCode: props.component.qualifiedCode,
                  value: {},
                })
              )
            }
          >
            {t("remove_file", "Remove")}
          </Button>
        </React.Fragment>
      )}
    </div>
  );
}

export default FileUpload;
