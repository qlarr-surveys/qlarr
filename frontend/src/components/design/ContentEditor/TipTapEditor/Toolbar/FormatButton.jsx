import React from "react";

const FormatButton = ({
  onClick,
  isActive,
  title,
  children,
  disabled = false,
  ...rest
}) => {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`tiptap-toolbar-button ${isActive ? "is-active" : ""}`}
      title={title}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default React.memo(FormatButton);

