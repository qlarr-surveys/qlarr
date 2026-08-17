import PropTypes from "prop-types";

import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import { Box } from "@mui/material";

export default function CompactLayout({ children }) {
  return (
    <>
      <Box
        style={{
          position: "fixed",
          zIndex: 2000,
          width: "100%",
          height: "100%",
          background: "#fff",
          overflow:'auto'
        }}
      >
        <Container
          component="main"
        >
          <Stack
            sx={{
              // py: 12,
              m: "auto",
              maxWidth: 400,
              minHeight: "100vh",
              textAlign: "center",
              justifyContent: "center",
            }}
          >
            {children}
          </Stack>
        </Container>
      </Box>
    </>
  );
}

CompactLayout.propTypes = {
  children: PropTypes.node,
};
