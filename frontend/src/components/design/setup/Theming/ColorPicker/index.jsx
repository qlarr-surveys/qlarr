import styles from "./ColorPicker.module.css";
import { SwatchesPicker } from "react-color";
import { useState, useRef, useEffect } from "react";

function ColorPicker(props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const swatchRef = useRef(null);
  const [pickerPosition, setPickerPosition] = useState({});

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
    positionPicker();
  };

  const positionPicker = () => {
    if (swatchRef.current) {
      const swatchRect = swatchRef.current.getBoundingClientRect();
      const pickerHeight = 200;
      const spaceBelow = window.innerHeight - swatchRect.bottom;
      const spaceAbove = swatchRect.top;

      let newPosition = { top: swatchRect.bottom + window.scrollY - "97" };

      if (spaceBelow >= pickerHeight) {
        newPosition = { top: swatchRect.bottom + window.scrollY - "137" };
      } else if (spaceAbove >= pickerHeight) {
        newPosition = {
          top: swatchRect.top - pickerHeight + window.scrollY - "97",
        };
      }

      setPickerPosition(newPosition);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (showColorPicker) {
        positionPicker();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showColorPicker]);

  return (
    <>
      <div
        ref={swatchRef}
        style={{
          backgroundColor: props.color || props.default,
        }}
        className={styles.swatch}
        onClick={toggleColorPicker}
      >
        <div className={styles.color} />
      </div>
      {showColorPicker ? (
        <div
          style={{ position: "absolute", zIndex: "99", ...pickerPosition }}
          className={styles.pickerContainer}
        >
          <div
            className={styles.cover}
            onClick={() => setShowColorPicker(false)}
          />
          <SwatchesPicker
            onChange={(e) => {
              props.handleChange(e.hex);
              setShowColorPicker(false);
            }}
          />
        </div>
      ) : null}
    </>
  );
}

export default ColorPicker;
