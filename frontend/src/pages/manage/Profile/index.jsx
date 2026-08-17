import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import LoadingButton from "@mui/lab/LoadingButton";
import InputAdornment from "@mui/material/InputAdornment";
import FormProvider, { RHFTextField } from "../../../components/hook-form";
import Container from "@mui/material/Container";
import { useSelector } from "react-redux";
import styles from "./Profile.module.css";

import Iconify from "~/components/iconify";
import { useBoolean } from "~/hooks/use-boolean";
import { useEffect, useState } from "react";
import TokenService from "~/services/TokenService";
import { useNavigate } from "react-router-dom";
import { routes } from "~/routes";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useDispatch } from "react-redux";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { setLoading } from "~/state/edit/editState";
import VerifyView from "~/components/auth/verify";
import { Alert, Snackbar } from "@mui/material";
import { useService } from "~/hooks/use-service";
import SuccessSnackbar from "~/components/manage/SuccessSnackbar";

const OPERATION = {
  NONE: "",
  CHANGE_EMAIL: "CHANGE_EMAIL",
  CHANGE_PASSWORD: "CHANGE_PASSWORD",
};

export default function ProfileView() {
  const authService = useService("auth");
  const userService = useService("user");

  const navigate = useNavigate();
  const isLoading = useSelector((state) => {
    return state.editState.loading;
  });
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const passwordShow = useBoolean();
  const userId = TokenService.getUser().id;
  const [user, setUser] = useState({});
  const [verifyEmailOpen, setVerifyEmailOpen] = useState(false);
  const [disableNameFields, setDisableNameFields] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [updated, setUpdated] = useState(false);

  const [operation, setOperation] = useState(OPERATION.NONE);


  const dispatch = useDispatch();

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  Yup.addMethod(Yup.string, "noWhitespace", function (errorMessage) {
    return this.test("no-whitespace", errorMessage, function (value) {
      const { path, createError } = this;
      return value?.trim()
        ? true
        : createError({ path, message: errorMessage });
    });
  });

  const getValidationSchema = (operation) => {
    let schemaFields = {
      firstName: Yup.string()
        .required(t("firstname_required"))
        .noWhitespace(t("error.invalid_first_name"))
        .max(50, t("error.first_name_too_long"))
        .matches(/^[A-Za-z]+$/, t("error.invalid_first_name")),
      lastName: Yup.string()
        .required(t("lastname_required"))
        .noWhitespace(t("error.invalid_last_name"))
        .max(50, t("error.last_name_too_long"))
        .matches(/^[A-Za-z]+$/, t("error.invalid_last_name")),
    };

    if (operation === OPERATION.CHANGE_EMAIL) {
      schemaFields = {
        ...schemaFields,
        currentPassword: Yup.string().required(t("password_required")),
        email: Yup.string()
          .required(t("email_required"))
          .matches(
            /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i,
            t("error.invalid_email")
          ),
      };
    }

    if (operation === OPERATION.CHANGE_PASSWORD) {
      schemaFields = {
        ...schemaFields,
        currentPassword: Yup.string()
        .required(t("password_required"))
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
          t("error.invalid_password")
        ),
        newPassword: Yup.string()
          .required(t("password_required")),
        confirmNewPassword: Yup.string()
          .required(t("password_required"))
          .oneOf(
            [Yup.ref("newPassword"), null],
            t("error.password_should_match")
          ),
      };
    }

    return Yup.object().shape(schemaFields);
  };
  const criticalChange =
    operation === OPERATION.CHANGE_EMAIL ||
    operation === OPERATION.CHANGE_PASSWORD;

  let defaultValues = {
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  };

  const logout = () => {
    authService
      .logout()
      .then(() => {
        navigate(routes.login);
      })
      .catch((e) => {
        navigate(routes.login);
      });
  };

  const methods = useForm({
    resolver: yupResolver(getValidationSchema(operation)),
    defaultValues,
  });
  const { watch, setError, reset, handleSubmit } = methods;

  const watchedEmail = watch("email");

  useEffect(() => {
    if (watchedEmail !== user.email) {
      reset({
        ...methods.getValues(),
        firstName: user.firstName,
        lastName: user.lastName,
      });
      setDisableNameFields(true);
    } else {
      setDisableNameFields(false);
    }
  }, [watchedEmail, user.email, reset, methods]);


  useEffect(() => {
    userService.getUser({ userId: userId }).then((response) => {
      const userData = {
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
      };
      setUser(response);

      reset(userData);
    });
  }, [reset, userId]);

  useEffect(() => {
    const schema = getValidationSchema(operation);
    methods.reset({ ...methods.getValues() }, { errors: true, schema });
  }, [operation, methods]);
  const onSubmit = handleSubmit(async (data) => {
    const { firstName, lastName, email, newPassword, currentPassword } = data;

    const model = {};

    if (user.firstName !== firstName) {
      model.firstName = firstName;
    }

    if (user.lastName !== lastName) {
      model.lastName = lastName;
    }

    if (user.email !== email) {
      model.email = email;
    }

    if (currentPassword !== "") {
      model.password = currentPassword;
    }

    if (newPassword !== "") {
      model.newPassword = newPassword;
    }
    dispatch(setLoading(true));
    userService
      .updateUserProfile(model)
      .then(() => {
        if (model.email && model.email !== user.email) {
          setVerifyEmailOpen(true);
        } else if (criticalChange) {
          logout();
        } else {
          setUpdated(true);
        }

      })
      .catch((processedError) => {
        if (processedError.name == PROCESSED_ERRORS.DUPLICATE_EMAIL.name) {
          setError("email", {
            type: "manual",
            message: t(`processed_errors.${processedError.name}`),
          });
        } else if (
          processedError.name == PROCESSED_ERRORS.WRONG_CREDENTIALS.name
        ) {
          setError("currentPassword", {
            type: "manual",
            message: t(`error.incorrect_password`),
          });
        }
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  });

  const handleCloseModal = (isSuccess) => {
    setVerifyEmailOpen(false);
    if (isSuccess) {
      setSnackbarOpen(true);
      setTimeout(() => {
        logout();
      }, 300);
    }
    setOperation(OPERATION.NONE);
    userService.getUser({ userId: userId }).then((response) => {
      const userData = {
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
      };
      setUser(response);
      reset(userData);
    });
  };
  return (
    <Box className={styles.mainContainer}>
    <Container className={styles.content}>
      {updated && (
        <SuccessSnackbar
          success="updated"
          left="56"
        />
      )}


      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          {t("profile.section_personal")}
        </Typography>

        <Box
          rowGap={2.5}
          columnGap={2}
          display="grid"
          gridTemplateColumns={{ xs: "repeat(1, 1fr)", md: "repeat(2, 1fr)" }}
        >
          <RHFTextField
            disabled={disableNameFields}
            name="firstName"
            label={t("label.first_name")}
          />

          <RHFTextField
            disabled={disableNameFields}
            name="lastName"
            label={t("label.last_name")}
          />

          <RHFTextField
            disabled={operation != OPERATION.CHANGE_EMAIL}
            name="email"
            label={t("label.email")}
          />
        </Box>
        <Stack spacing={3} sx={{ my: 5 }}>
          <>
            {operation == OPERATION.CHANGE_PASSWORD && (
              <div>
                <Typography variant="h5">
                  {t("profile.change_password")}
                </Typography>
                <Typography variant="body2" sx={{ color: "error.main", mb: 1 }}>
                  {t("profile.hint")}
                </Typography>
              </div>
            )}

            {operation == OPERATION.CHANGE_EMAIL && (
              <Typography variant="body2" sx={{ color: "error.main" }}>
                {t("profile.hint")}
              </Typography>
            )}

            <Stack spacing={2.5}>
              {criticalChange && (
                <RHFTextField
                  name="currentPassword"
                  label={t("label.password")}
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
              )}
              {operation == OPERATION.CHANGE_PASSWORD && (
                <>
                  <RHFTextField
                    name="newPassword"
                    label={t("label.new_password")}
                    type={passwordShow.value ? "text" : "password"}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={passwordShow.onToggle}
                            edge="end"
                          >
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
                    name="confirmNewPassword"
                    label={t("label.confirm_new_password")}
                    type={passwordShow.value ? "text" : "password"}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={passwordShow.onToggle}
                            edge="end"
                          >
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
                </>
              )}
            </Stack>
          </>
        </Stack>
        <Stack spacing={1} direction="row">
          {operation == OPERATION.NONE && (
            <LoadingButton
              color="inherit"
              size="large"
              variant="contained"
              onClick={() => setOperation(OPERATION.CHANGE_EMAIL)}
            >
              {t("profile.change_email")}
            </LoadingButton>
          )}
          {operation == OPERATION.NONE && (
            <LoadingButton
              color="inherit"
              size="large"
              variant="contained"
              onClick={() => setOperation(OPERATION.CHANGE_PASSWORD)}
            >
              {t("profile.change_password")}
            </LoadingButton>
          )}
          {criticalChange && (
            <LoadingButton
              color="inherit"
              size="large"
              variant="contained"
              onClick={() => setOperation(OPERATION.NONE)}
            >
              {t("profile.cancel")}
            </LoadingButton>
          )}
          <LoadingButton
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isLoading}
          >
            {t("profile.save")}
          </LoadingButton>
        </Stack>
      </FormProvider>
      <VerifyView
        t={t}
        open={verifyEmailOpen}
        email={user?.email}
        resend={onSubmit}
        onClose={handleCloseModal}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {t("email.email_changed")}
        </Alert>
      </Snackbar>
    </Container>
    </Box>
  );
}
