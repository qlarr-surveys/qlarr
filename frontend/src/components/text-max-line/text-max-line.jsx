import PropTypes from "prop-types";
import { forwardRef } from "react";

import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

import useTypography from "./use-typography";
import { Tooltip } from "@mui/material";
import CustomTooltip from "../common/Tooltip/Tooltip";

// ----------------------------------------------------------------------

const TextMaxLine = forwardRef(
  (
    {
      asLink,
      variant = "body1",
      line = 2,
      persistent = false,
      children,
      sx,
      ...other
    },
    ref
  ) => {
    const { lineHeight } = useTypography(variant);

    const styles = {
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: line,
      WebkitBoxOrient: "vertical",
      ...(persistent && {
        height: lineHeight * line,
      }),
      ...sx,
    };

    const textElement = asLink ? (
      <Link
        color="inherit"
        ref={ref}
        variant={variant}
        sx={{ ...styles }}
        {...other}
      >
        {children}
      </Link>
    ) : (
      <Typography ref={ref} variant={variant} sx={{ ...styles }} {...other}>
        {children}
      </Typography>
    );

    return (
      <CustomTooltip showIcon={false} title={children}>
        {textElement}
      </CustomTooltip>
    );
  }
);

TextMaxLine.propTypes = {
  asLink: PropTypes.bool,
  children: PropTypes.node,
  line: PropTypes.number,
  persistent: PropTypes.bool,
  sx: PropTypes.object,
  variant: PropTypes.oneOf([
    "body1",
    "body2",
    "button",
    "caption",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "inherit",
    "overline",
    "subtitle1",
    "subtitle2",
  ]),
};

export default TextMaxLine;
