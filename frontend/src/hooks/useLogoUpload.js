import { useState } from "react";
import { useDispatch } from "react-redux";
import { changeResources } from "~/state/design/designState";
import { useService } from "~/hooks/use-service";

export function useLogoUpload() {
  const dispatch = useDispatch();
  const designService = useService("design");
  const [isUploading, setIsUploading] = useState(false);

  const uploadLogo = (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    setIsUploading(true);
    designService
      .uploadResource(file)
      .then((response) => {
        dispatch(
          changeResources({
            code: "Survey",
            key: "logoImage",
            value: response.name,
          })
        );
      })
      .catch((err) => {
        console.error(err);
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
