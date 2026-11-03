import { Typography } from "@mui/material";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { STATUS } from "../Survey/status";
import styles from "./HeaderContent.module.css";

/**
 * One filter: a label above a native select, with the chevron drawn over it.
 *
 * Native rather than a MUI Select because the redesign draws a plain 34px box
 * and the options are a short flat list -- a popover adds nothing here, and
 * the native control is what mobile users already know.
 */
const FilterSelect = ({ label, value, onChange, options, minWidth, t }) => (
  <label className={styles.field}>
    {label}
    <select
      className={styles.select}
      style={{ minWidth }}
      value={value}
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {t(option.label)}
        </option>
      ))}
    </select>
    <ChevronDown
      aria-hidden="true"
      size={12}
      strokeWidth={1.6}
      className={styles.chevron}
    />
  </label>
);

export const HeaderContent = ({
  sort,
  filter,
  onFilterSelected,
  onSortSelected,
  heading,
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
    <div className={styles.listHeader}>
      {heading ?? (
        <Typography variant="h3" flex="1" textTransform="uppercase">
          {t("my_surveys")}
        </Typography>
      )}

      <div className={styles.filters}>
        <FilterSelect
          label={t("label.sort_by")}
          value={sort}
          onChange={onSortSelected}
          options={sort_options}
          minWidth={220}
          t={t}
        />
        <FilterSelect
          label={t("edit_survey.status")}
          value={filter}
          onChange={onFilterSelected}
          options={filter_options}
          minWidth={150}
          t={t}
        />
      </div>
    </div>
  );
};
