import React from "react";
import Lottie from "lottie-react";
import styles from "./LoadingIndicator.module.css";
import { useSelector } from "react-redux";
import animationData from "../../../../public/loadingLottie.json";

export default function LoadingIndicator() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingWrapper}>
        <Lottie animationData={animationData} loop autoPlay />
      </div>
    </div>
  );
}

export function StatefulLoadingIndicator() {
  const isLoading = useSelector((state) => {
    return state.editState.loading;
  });
  return isLoading ? <LoadingIndicator /> : <></>;
}
