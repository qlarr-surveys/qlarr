import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

const PreviewEndActions = () => {
  const { t } = useTranslation(NAMESPACES.RUN);
  const responseId = useSelector(
    (state) => state.runState.data?.responseId
  );

  const sendAction = (action) => {
    window.parent.postMessage(
      { type: "PREVIEW_END_ACTION", action, responseId },
      window.location.origin
    );
  };

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: "auto",
        mt: 3,
        mb: 4,
        px: 3,
        py: 3,
        textAlign: "center",
        borderTop: "1px dashed",
        borderColor: "divider",
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: "text.secondary", letterSpacing: 1 }}
      >
        {t("preview_end_actions.heading")}
      </Typography>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        mt={1.5}
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
      >
        <Button
          variant="contained"
          size="medium"
          onClick={() => sendAction("check")}
          sx={{ textTransform: "capitalize" }}
        >
          {t("preview_end_actions.check_response")}
        </Button>
        <Button
          variant="outlined"
          size="medium"
          onClick={() => sendAction("reset")}
          sx={{ textTransform: "capitalize" }}
        >
          {t("preview_end_actions.reset")}
        </Button>
        <Button
          variant="text"
          size="medium"
          color="error"
          onClick={() => sendAction("close")}
          sx={{ textTransform: "capitalize" }}
        >
          {t("preview_end_actions.close_window")}
        </Button>
      </Stack>
    </Box>
  );
};

export default PreviewEndActions;
