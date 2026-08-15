import React, { useEffect, useMemo } from "react";
import * as Yup from "yup";
import { Box, Card, Typography, Dialog, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import styles from "./AddEditUser.module.css";
import LoadingButton from "@mui/lab/LoadingButton";
import { ROLES } from "~/constants/roles";
import { setLoading } from "~/state/edit/editState";
import { useDispatch } from "react-redux";
import FormProvider, {
  RHFMultiSelect,
  RHFTextField,
} from "~/components/hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, useWatch } from "react-hook-form";
import { useService } from "~/hooks/use-service";

function AddEditUser({ userId, open, onClose }) {
  const userService = useService("user");

  const { t } = useTranslation(NAMESPACES.MANAGE);
  const dispatch = useDispatch();
  Yup.addMethod(Yup.string, "noWhitespace", function (errorMessage) {
    return this.test("no-whitespace", errorMessage, function (value) {
      const { path, createError } = this;
      return value?.trim()
        ? true
        : createError({ path, message: errorMessage });
    });
  });
  const AddUserSchema = useMemo(
    () =>
      Yup.object().shape({
        firstName: Yup.string()
          .required(t("firstname_required"))
          .noWhitespace(t("error.invalid_first_name"))
          .max(50, t("error.first_name_too_long")),
        lastName: Yup.string()
          .required(t("lastname_required"))
          .noWhitespace(t("error.invalid_last_name"))
          .max(50, t("error.last_name_too_long")),
        email: Yup.string()
          .required(t("email_required"))
          .matches(
            /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i,
            t("error.invalid_email")
          ),
        roles: Yup.array()
          .required(t("error.roles_required"))
          .min(1, t("error.at_least_one_role")),
      }),
    [t]
  );

  const defaultValues = {
    firstName: "",
    lastName: "",
    email: "",
    roles: [],
  };

  const methods = useForm({
    resolver: yupResolver(AddUserSchema),
    defaultValues,
  });

  const selectedRoles = useWatch({ control: methods.control, name: "roles" });

  const {
    setError,
    reset,
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    watch,
  } = methods;

  useEffect(() => {
    if (userId) {
      dispatch(setLoading(true));
      userService.getUser({ userId }).then((response) => {
        dispatch(setLoading(false));
        reset(response);
      });
    }
  }, [reset, userId]);
  const onSubmit = handleSubmit(async (data) => {
    dispatch(setLoading(true));

    const { firstName, lastName, email, roles } = data;
    try {
      if (userId) {
        await userService.updateUser({
          userId,
          data: { email, firstName, lastName, roles },
        });
      } else {
        await userService.createUser({ email, firstName, lastName, roles });
      }
      onClose();
    } catch (processedError) {
      if (processedError.name == PROCESSED_ERRORS.DUPLICATE_EMAIL.name) {
        setError("email", {
          type: "manual",
          message: t(`processed_errors.${processedError.name}`),
        });
      }
    } finally {
      dispatch(setLoading(false));
    }
  });

  const OPTIONS = [
    { value: ROLES.SUPER_ADMIN, label: t("label.super_admin") },
    { value: ROLES.SURVEY_ADMIN, label: t("label.survey_admin") },
    { value: ROLES.ANALYST, label: t("label.analyst") },
    { value: ROLES.SURVEYOR, label: t("label.surveyor") },
  ];

  const isDisabled = (role, selectedRoles) => {
    const superAdminSelected = selectedRoles.includes(ROLES.SUPER_ADMIN);
    const surveyAdminSelected = selectedRoles.includes(ROLES.SURVEY_ADMIN);

    if (superAdminSelected || surveyAdminSelected) {
      return (
        (superAdminSelected && role !== ROLES.SUPER_ADMIN) ||
        (surveyAdminSelected && role !== ROLES.SURVEY_ADMIN)
      );
    }
    return false;
  };
  useEffect(() => {
    const superAdminSelected = selectedRoles.includes(ROLES.SUPER_ADMIN);
    const surveyAdminSelected = selectedRoles.includes(ROLES.SURVEY_ADMIN);
    if (superAdminSelected || surveyAdminSelected) {
      const updatedRoles = selectedRoles.filter(
        (role) => role === ROLES.SUPER_ADMIN || role === ROLES.SURVEY_ADMIN
      );
      setValue("roles", updatedRoles);
    }
  }, [selectedRoles, setValue]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Card sx={{ overflow: "visible" }} className={styles.createUserCard}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          {userId ? t("edit_user.title") : t("add_user.title")}
        </Typography>
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            <RHFTextField name="firstName" label={t("label.first_name")} />

            <RHFTextField name="lastName" label={t("label.last_name")} />

            <RHFTextField name="email" label={t("label.email")} />

            <RHFMultiSelect
              chip
              checkbox
              name="roles"
              label={t("add_user.roles")}
              options={OPTIONS}
              isOptionDisabled={isDisabled}
            />
          </Stack>
          <Box
            sx={{
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
              mt: "40px",
            }}
          >
            <LoadingButton
              onClick={() => onClose(true)}
              color="inherit"
              size="large"
              variant="contained"
            >
              {t("add_user.cancel")}
            </LoadingButton>
            <LoadingButton
              color="inherit"
              size="large"
              type="submit"
              variant="contained"
              loading={isSubmitting}
            >
              {t("add_user.save")}
            </LoadingButton>
          </Box>
        </FormProvider>
      </Card>
    </Dialog>
  );
}

export default AddEditUser;
