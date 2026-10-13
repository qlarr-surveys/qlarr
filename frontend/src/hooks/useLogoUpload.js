import { useState } from "react";
import { useDispatch } from "react-redux";
import { changeResources } from "~/state/design/designState";
import { useResourceUpload } from "~/hooks/useResourceUpload";

export function useLogoUpload() {
  const dispatch = useDispatch();
  const uploadResource = useResourceUpload();
  const [isUploading, setIsUploading] = useState(false);

  const uploadLogo = (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    setIsUploading(true);
    uploadResource(file)
      .then((response) => {
        if (response) {
          dispatch(
            changeResources({
              code: "Survey",
              key: "logoImage",
              value: response.name,
            })
          );
        }
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    uploadLogo(file);
    e.target.value = "";
  };

  return { isUploading, uploadLogo, handleFileInput };
}
