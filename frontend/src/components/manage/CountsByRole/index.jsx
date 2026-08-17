import { Box, Button, Card } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useNavigate } from "react-router-dom";
import { routes } from "~/routes";
import styles from "./CountsByRole.module.css";

export const CountsByRole = ({ countByRole }) => {
  const navigate = useNavigate();
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <Card className={styles.byRoleWrap}>
      <Box>
        <Box component="b">
          <Box component="span">
            {countByRole?.superAdmin} {t("super_admins")} ,
          </Box>
          <Box component="span">
            {countByRole?.surveyAdmin} {t("admins")},
          </Box>
          <Box component="span">
            {countByRole?.surveyor} {t("surveyors")},
          </Box>
        </Box>
        <Box component="span"> {t("registered")}</Box>
      </Box>
      <Button
        onClick={() => {
          navigate(routes.manageUsers);
        }}
      >
        {t("manage_users")}
      </Button>
    </Card>
  );
};
