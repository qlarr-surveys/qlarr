import { buildResourceUrl } from "~/networking/common";
import styles from "./ImageDisplay.module.css";

function ImageDisplay(props) {
  const imageUrl = props.component.resources?.imageUrl
    ? buildResourceUrl(props.component.resources.imageUrl)
    : "";
  return (
    props.component.resources?.imageUrl && (
      <div className={styles.container}>
        <img
          className={styles.image}
          style={{
            '--qlarr-image-width': props.component.imageWidth?.endsWith('%')
              ? props.component.imageWidth
              : undefined,
          }}
          src={imageUrl}
        />
      </div>
    )
  );
}

export default ImageDisplay;
