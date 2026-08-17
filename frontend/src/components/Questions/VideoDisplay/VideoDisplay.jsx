import { buildResourceUrl } from "~/networking/common";
import ReactPlayer from "react-player";
import styles from "./VideoDisplay.module.css";

function VideoDisplay(props) {
  const videUrl = props.component.resources?.videoUrl
    ? buildResourceUrl(props.component.resources.videoUrl)
    : "";
  return (
    props.component.resources?.videoUrl && (
      <div
        className={styles.videoWrapper}
        style={{ '--qlarr-video-padding': props.component.audio_only ? '10%' : '56%' }}
      >
        <ReactPlayer
          url={videUrl}
          loop={props.component.loop || false}
          light={true}
          controls={true}
          config={{
            forceAudio: props.component.audio_only || false,
          }}
          className={styles.videoPlayer}
          volume={1}
          width="100%"
          height="100%"
        />
      </div>
    )
  );
}

export default VideoDisplay;
