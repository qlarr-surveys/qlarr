import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LoadingButton from "@mui/lab/LoadingButton";

import Image from "../image/image";
import Iconify from "../iconify";
import FormProvider, { RHFCode } from "../hook-form";
import { Box, Button, Modal } from "@mui/material";
import styles from "./verify.module.css";
import { useMemo, useState } from "react";
import { useService } from "~/hooks/use-service";

export default function VerifyView({ t, open, email, resend, onClose }) {
  const userService = useService("user");
  const [loading, setLoading] = useState(false);


  const VerifySchema = useMemo(
    () =>
      Yup.object().shape({
        pin: Yup.string()
          .min(6, `${t("email.code_characters")}`)
          .required(`${t("email.code_required")}`),
      }),
    [t]
  );

  const defaultValues = {
    pin: "",
  };

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(VerifySchema),
    defaultValues,
  });

  const { handleSubmit, setError, reset } = methods;

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    userService
      .confirmEmail(data)
      .then(() =>  {
        setLoading(false);
        onClose(true);
        reset(defaultValues);
      })
      .catch((e) => {
        setLoading(false);
        setError("pin", {
          type: "manual",
          message: t(`processed_errors.${e.name}`),
        });
      });
  });





  return (
    <Modal
      open={open}
      aria-labelledby="email-verification-modal"
      aria-describedby="email-verification-modal-description"
    >
      <Box className={styles.verifyContainer}>
        <Stack sx={{ textAlign: "center" }}>
          <Image
            alt={t("alt.email_inbox")}
            src="/ic_email_inbox.svg"
            sx={{ mb: 5, width: 96, height: 96, mx: "auto" }}
          />

          <Typography variant="h3">{t("email.check")}</Typography>

          <Typography
            variant="body2"
            sx={{ mt: 2, mb: 5, color: "text.secondary" }}
          >
            {t("email.confirmation_code1")} {email}{" "}
            {t("email.confirmation_code2")}
          </Typography>

          <FormProvider methods={methods} onSubmit={onSubmit}>
            <RHFCode name="pin" />

            <LoadingButton
              fullWidth
              size="large"
              color="inherit"
              type="submit"
              variant="contained"
              loading={loading}
              sx={{ mt: 3 }}
            >
              {t("email.verify")}
            </LoadingButton>
          </FormProvider>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            {t("email.dont_have_code")}

            <Link
              variant="subtitle2"
              onClick={() => resend()}
              underline="none"
              sx={{ cursor: "pointer" }}
            >
              {" "}
              {t("email.resend_code")}
            </Link>
          </Typography>

          <Button
            onClick={() => onClose(false)}
            color="inherit"
            sx={{
              mt: 3,
              mx: "auto",
              alignItems: "center",
              display: "inline-flex",
            }}
          >
            <Iconify icon="carbon:chevron-left" width={16} sx={{ mr: 1 }} />
            {t("action_btn.close")}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
