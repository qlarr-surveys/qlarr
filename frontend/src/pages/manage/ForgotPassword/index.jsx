import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LoadingButton from "@mui/lab/LoadingButton";

import RouterLink from "~/components/router/router-link";
import Iconify from "~/components/iconify";
import Image from "~/components/image/image";
import FormProvider, { RHFTextField } from "../../../components/hook-form";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { setLoading } from "~/state/edit/editState";
import { routes } from "~/routes";
import SuccessMessage from "~/components/common/SuccessMessage/SuccessMessage";
import { useService } from "~/hooks/use-service";
// ----------------------------------------------------------------------

export default function ForgotPasswordView() {
  const authService = useService("auth");

  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [isSuccess, setSuccess] = useState(false);
  const dispatch = useDispatch();
  const ForgotPasswordSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .required(t("email_required"))
          .matches(
            /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i,
            t("error.invalid_email")
          ),
      }),
    [t]
  );

  const defaultValues = {
    email: "",
  };

  const methods = useForm({
    resolver: yupResolver(ForgotPasswordSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      dispatch(setLoading(true));
      await authService.forgotPassword(data.email);
      setSuccess(true);
    } catch (e) {
    } finally {
      dispatch(setLoading(false));
    }
  });

  return (
    <>
      {isSuccess ? (
        <SuccessMessage t={t} message="forgot_password.success" />
      ) : (
        <Stack sx={{ textAlign: "center" }}>
          <Image
            alt={t("alt.reset_password")}
            src="/ic_lock_password.svg"
            sx={{ mb: 5, width: 96, height: 96, mx: "auto" }}
          />

          <Typography variant="h3" paragraph>
            {t("forgot_password.title")}
          </Typography>

          <Typography variant="body2" color="textSecondary" mb={5}>
            {t("forgot_password.helper_text")}
          </Typography>

          <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
            <RHFTextField
              name="email"
              hiddenLabel
              placeholder={t("label.email")}
            />

            <LoadingButton
              fullWidth
              size="large"
              color="primary"
              type="submit"
              variant="contained"
              loading={isSubmitting}
              sx={{ mt: 2.5 }}
            >
              {t("forgot_password.send")}
            </LoadingButton>
          </FormProvider>

          <Link
            component={RouterLink}
            href={routes.login}
            color="inherit"
            variant="subtitle2"
            sx={{
              mt: 3,
              mx: "auto",
              alignItems: "center",
              display: "inline-flex",
            }}
          >
            <Iconify icon="carbon:chevron-left" width={16} sx={{ mr: 1 }} />
            {t("forgot_password.return_to_signin")}
          </Link>
        </Stack>
      )}
    </>
  );
}
