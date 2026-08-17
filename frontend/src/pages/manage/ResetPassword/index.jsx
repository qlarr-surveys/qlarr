import { useMemo } from "react";
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
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { useDispatch } from "react-redux";
import { setLoading } from "~/state/edit/editState";
import { useNavigate } from "react-router-dom";
import { InputAdornment } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useBoolean } from "~/hooks/use-boolean";
import IconButton from "@mui/material/IconButton";
import { useParams, useSearchParams } from "react-router-dom";
import { routes } from "~/routes";
import { useService } from "~/hooks/use-service";

// ----------------------------------------------------------------------

export default function ResetPasswordView({ confirmNewUser = false }) {
  const authService = useService("auth");
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const passwordShow = useBoolean();
  const [searchParams] = useSearchParams();
  const { token } = useParams();

  const refreshToken = searchParams.get("token");

  const ResetPasswordSchema = useMemo(
    () =>
      Yup.object().shape({
        password: Yup.string()
          .required(t("password_required"))
          .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
            t("error.invalid_password")
          ),
        confirmPassword: Yup.string()
          .required(t("password_required"))
          .oneOf([Yup.ref("password")], t("error.password_should_match")),
      }),
    [t]
  );

  const defaultValues = {
    email: "",
  };

  const methods = useForm({
    resolver: yupResolver(ResetPasswordSchema),
    defaultValues,
  });

  const {
    setError,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await authService.resetPassword(
        confirmNewUser,
        confirmNewUser ? token : refreshToken,
        data.password
      );
      navigate("/");
    } catch (processedError) {
      setError("password", {
        type: "manual",
        message: t(`processed_errors.${processedError.name}`),
      });
      setError("confirmPassword", {
        type: "manual",
        message: t(`processed_errors.${processedError.name}`),
      });
    } finally {
      dispatch(setLoading(false));
    }
  });

  return (
    <>
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          px: 2,
          py: 12,
          minHeight: "100vh",
        }}
      >
        <Stack
          spacing={4}
          sx={{
            p: 4,
            width: 1,
            mx: "auto",
            flexShrink: 0,
            maxWidth: 400,
            borderRadius: 2,
            bgcolor: "background.default",
            boxShadow: theme.customShadows.z24,
            textAlign: { xs: "center", md: "left" },
          }}
        >
          <Stack sx={{ textAlign: "center" }}>
            <Image
              alt={t("alt.reset_password")}
              src="/ic_lock_password.svg"
              sx={{ mb: 5, width: 96, height: 96, mx: "auto" }}
            />

            <Typography variant="h3" paragraph>
              {t("reset_password.title")}
            </Typography>

            <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2.5}>
                <RHFTextField
                  name="password"
                  label={t("label.new_password")}
                  type={passwordShow.value ? "text" : "password"}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={passwordShow.onToggle} edge="end">
                          <Iconify
                            icon={
                              passwordShow.value
                                ? "carbon:view"
                                : "carbon:view-off"
                            }
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <RHFTextField
                  name="confirmPassword"
                  label={t("label.confirm_new_password")}
                  type={passwordShow.value ? "text" : "password"}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={passwordShow.onToggle} edge="end">
                          <Iconify
                            icon={
                              passwordShow.value
                                ? "carbon:view"
                                : "carbon:view-off"
                            }
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>

              <LoadingButton
                fullWidth
                size="large"
                color="primary"
                type="submit"
                variant="contained"
                loading={isSubmitting}
                sx={{ mt: 2.5 }}
              >
                {t("reset_password.reset")}
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
        </Stack>
      </Stack>
    </>
  );
}
