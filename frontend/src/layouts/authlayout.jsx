import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Unstable_Grid2";
import Container from "@mui/material/Container";

import { useResponsive } from "../hooks/use-responsive";

import Image from "../components/image/image";
import { Box } from "@mui/material";
import styles from "./authlayout.module.css";
// ----------------------------------------------------------------------

export default function AuthIllustrationLayout({ children }) {
  const mdUp = useResponsive("up", "md");

  return (
    <Box className={styles.authContainer}>
      <Container
        sx={{
          pb: 10,
          minHeight: 1,
          pt: { xs: 12, md: 21 },
        }}
      >
        <Grid
          container
          columnSpacing={{ md: 5 }}
          justifyContent="space-between"
        >
          {mdUp && (
            <Grid xs={12} md={7}>
              <img
                style={{ width: "100%" }}
                alt="login"
                src="/illustration_login.jpg"
              />
            </Grid>
          )}
          <Grid xs={12} md={5} lg={4}>
            <Stack
              spacing={4}
              sx={{
                p: 4,
                borderRadius: 2,
                textAlign: { xs: "center", md: "left" },
                boxShadow: (theme) => "22",
              }}
            >
              {children}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

// AuthIllustrationLayout.propTypes = {
//   children: PropTypes.node,
// };
