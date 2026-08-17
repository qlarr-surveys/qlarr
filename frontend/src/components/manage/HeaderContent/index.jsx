import { Box, css, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { STATUS } from "../Survey/status";
import { RHFSelect } from "~/components/hook-form";

export const HeaderContent = ({
  sort,
  filter,
  onFilterSelected,
  onSortSelected,
}) => {
  const sort_options = [
    { value: "responses_desc", label: "survey_sort_options.responses_desc" },
    {
      value: "last_modified_desc",
      label: "survey_sort_options.last_modified_desc",
    },
  ];

  const filter_options = [
    { value: "all", label: `status.all` },
    { value: STATUS.ACTIVE, label: `status.${STATUS.ACTIVE}` },
    { value: STATUS.SCHEDULED, label: `status.${STATUS.SCHEDULED}` },
    { value: STATUS.DRAFT, label: `status.${STATUS.DRAFT}` },
    { value: STATUS.EXPIRED, label: `status.${STATUS.EXPIRED}` },
    { value: STATUS.CLOSED, label: `status.${STATUS.CLOSED}` },
  ];
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <Box
      rowGap={2.5}
      columnGap={2}
      display="grid"
      gridTemplateColumns={{ xs: "repeat(1, 1fr)", md: "repeat(2, 1fr)" }}
    >
      <Typography
        variant="h3"
        flex="1"
        textTransform="uppercase"
      >
        {t("my_surveys")}
      </Typography>

      <Stack
        width="100%"
        spacing={2.5}
        direction={{ xs: "column", md: "row" }}
        alignItems="center"
      >
        <RHFSelect
          onChange={onSortSelected}
          native
          value={sort}
          backgroundColor="white"
          name="Status"
          label={t("label.sort_by")}
        >
          {sort_options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </RHFSelect>
        <RHFSelect
          onChange={onFilterSelected}
          native
          value={filter}
          backgroundColor="white"
          name="Status"
          label={t("edit_survey.status")}
        >
          {filter_options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </RHFSelect>
      </Stack>
    </Box>
  );
};
