import { useMemo } from "react";
import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import LoadingButton from "@mui/lab/LoadingButton";
import InputAdornment from "@mui/material/InputAdornment";
import { useBoolean } from "../../../hooks/use-boolean";
import FormProvider, { RHFTextField } from "../../../components/hook-form";
import Iconify from "~/components/iconify";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setLoading } from "~/state/edit/editState";
import RouterLink from "~/components/router/router-link";
import { useTranslation } from "react-i18next";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { useService } from "~/hooks/use-service";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

// ----------------------------------------------------------------------

export default function LoginView() {
  const authService = useService("auth");

  const { t } = useTranslation(NAMESPACES.MANAGE);

  const passwordShow = useBoolean();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const LoginSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .required(t("email_required"))
          .matches(
            /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i,
            t("error.invalid_email")
          ),
        password: Yup.string().required(t("password_required")),
      }),
    [t]
  );

  const defaultValues = {
    email: "",
    password: "",
  };

  const methods = useForm({
    resolver: yupResolver(LoginSchema),
    defaultValues,
  });

  const {
    setError,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleError = (processedError) => {
    if (processedError.name == PROCESSED_ERRORS.WRONG_CREDENTIALS.name) {
      setError("email", {
        type: "manual",
        message: t(`processed_errors.${processedError.name}`),
      });
      setError("password", {
        type: "manual",
        message: t(`processed_errors.${processedError.name}`),
      });
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    dispatch(setLoading(true));
    try {
      await authService.login(data.email, data.password);
      const { from } = location.state || { from: { pathname: "/" } };
      navigate(from);
    } catch (e) {
      handleError(e);
    } finally {
      dispatch(setLoading(false));
    }
  });


  const renderHead = (
    <div>
      <Typography variant="h3" paragraph>
        {t("login.login")}
      </Typography>
    </div>
  );


  const renderForm = (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2.5} alignItems="flex-end">
        <RHFTextField name="email" label={t("label.email")} />

        <RHFTextField
          name="password"
          label={t("label.password")}
          type={passwordShow.value ? "text" : "password"}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={passwordShow.onToggle} edge="end">
                  <Iconify
                    icon={
                      passwordShow.value ? "carbon:view" : "carbon:view-off"
                    }
                  />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Link
          component={RouterLink}
          href="/forgot-password"
          variant="body2"
          underline="always"
          color="text.secondary"
        >
          {t("login.forgot_password")}
        </Link>

        <LoadingButton
          fullWidth
          color="primary"
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting}
        >
          {t("login.login")}
        </LoadingButton>
      </Stack>
    </FormProvider>
  );

  return (
    <>
      {renderHead}

      {renderForm}
    </>
  );
}
