export const useCustomSwitchStyles = () => {
  return {
    width: 53,
    height: 26,
    padding: 0,
    "& .MuiSwitch-switchBase": {
      padding: "0px",
      top: "2px",
      transform: "translateX(3px)",
      "&.Mui-checked": {
        top: "2px",
        transform: "translateX(29px)",
        color: "#fff",
        "& + .MuiSwitch-track": {
          backgroundColor: "#eff1fd",
          opacity: 1,
        },
        "& .MuiSwitch-thumb": {
          width: 21,
          height: 21,
          boxShadow: "none",
          backgroundColor: "#04bdf3",
        },
      },
    },
    "& .MuiSwitch-thumb": {
      width: 21,
      height: 21,
      boxShadow: "none",
    },
    "& .MuiSwitch-track": {
      borderRadius: 13,
      backgroundColor: "#eff1fd",
      opacity: 1,
      "&:before, &:after": {
        content: '""',
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        width: 24,
        height: 24,
      },
    },
  };
};
