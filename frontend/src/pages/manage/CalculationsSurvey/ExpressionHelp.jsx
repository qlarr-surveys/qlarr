import React from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

// The rules below follow the expression validator (@qlarr/survey-engine-script)
// and the calculation engine. Every example has been checked against both.

const REFERENCES = [
  { code: "Q1.value", key: "ref_value" },
  { code: "Q1A1.value", key: "ref_row" },
  { code: "Q1Aother.value", key: "ref_other" },
  { code: "Q1.value_meta", key: "ref_value_meta" },
  { code: "Survey.mode", key: "ref_mode" },
  { code: "Survey.disqualified", key: "ref_disqualified" },
];

const TYPES = [
  { key: "type_text", example: '"hello"' },
  { key: "type_number", example: "42" },
  { key: "type_nps", example: "9" },
  { key: "type_scq", example: '"A1"' },
  { key: "type_mcq", example: '["A1", "A3"]' },
  { key: "type_scq_array", example: '"Ac2"' },
  { key: "type_mcq_array", example: '["Ac1", "Ac3"]' },
  { key: "type_ranking", example: "2" },
  { key: "type_date", example: '"2001-05-03 00:00:00"' },
  { key: "type_time", example: '"1970-01-01 14:30:00"' },
  { key: "type_file", example: '{"filename": "cv.pdf", "size": 1024, "type": "application/pdf", …}' },
];

const RULES = [
  { key: "rule_single", example: 'Q1.value >= 9 ? "high" : Q1.value >= 5 ? "mid" : "low"' },
  { key: "rule_no_statements" },
  { key: "rule_concat", example: 'Q1.value + " years"' },
  { key: "rule_global", example: "Number.parseInt(Q1.value)" },
  { key: "rule_brackets", example: 'QlarrScripts.safeAccess(Q1.value_meta, "en")' },
  { key: "rule_object", example: '({"min": Q1.value, "max": Q2.value})' },
  { key: "rule_callbacks", example: '(Q1.value || []).filter((a) => a !== "A1").length' },
  { key: "rule_limits" },
];

const FUNCTIONS = [
  { key: "fn_math", code: "Math.round(x), Math.floor, Math.ceil, Math.abs, Math.min, Math.max, Math.pow, Math.sqrt, Math.log, Math.PI, …" },
  { key: "fn_number", code: "Number.parseInt(x), Number.parseFloat(x), Number.isFinite(x), Number.isInteger(x), Number.isNaN(x), x.toFixed(2), x.toPrecision(3)" },
  { key: "fn_date", code: "new Date(...), Date.now(), Date.parse(x), d.getFullYear(), d.getMonth(), d.getDate(), d.getDay(), d.getTime(), …" },
  { key: "fn_object", code: "Object.keys(o), Object.entries(o)" },
  { key: "fn_text", code: "s.length, s.includes, s.startsWith, s.endsWith, s.indexOf, s.slice, s.substring, s.toLowerCase, s.toUpperCase, s.trim, s.replace, s.replaceAll, s.split, s.match, s.padStart, /^a/.test(s), new RegExp(...)" },
  { key: "fn_lists", code: "l.length, l.includes, l.indexOf, l.at, l.filter, l.map, l.reduce, l.some, l.find, l.findIndex, l.slice, l.toSorted, l.toReversed, l.toString" },
  { key: "fn_qlarr", code: 'QlarrScripts.isVoid(x), QlarrScripts.isNotVoid(x), QlarrScripts.wordCount(text), QlarrScripts.hasDuplicates(list), QlarrScripts.safeAccess(obj, "key"), QlarrScripts.listStrings(list, "en"), QlarrScripts.stripTags(html), QlarrScripts.isValidSqlDateTime(x), QlarrScripts.sqlDateTimeToDate(x), QlarrScripts.formatSqlDate(x, "DD/MM/YYYY")' },
];

const PITFALLS = ["pit_unanswered", "pit_dates", "pit_lists", "pit_join"];

const EXAMPLES = [
  { key: "ex_age_group", code: 'QlarrScripts.isVoid(Qage.value) ? undefined : Qage.value < 18 ? "minor" : "adult"' },
  { key: "ex_nps_group", code: 'QlarrScripts.isVoid(Qnps.value) ? undefined : Qnps.value >= 9 ? "promoter" : Qnps.value >= 7 ? "passive" : "detractor"' },
  { key: "ex_bmi", code: "Math.round(Qweight.value / Math.pow(Qheight.value / 100, 2) * 10) / 10" },
  { key: "ex_total", code: "(Qa.value || 0) + (Qb.value || 0)" },
  { key: "ex_selected_count", code: "(Qfruits.value || []).length" },
  { key: "ex_picked", code: '(Qfruits.value || []).includes("A2")' },
  { key: "ex_choices", code: 'QlarrScripts.listStrings(Qfruits.value || [], "en")' },
  { key: "ex_birth_year", code: "QlarrScripts.isValidSqlDateTime(Qdob.value) ? QlarrScripts.sqlDateTimeToDate(Qdob.value).getFullYear() : undefined" },
  { key: "ex_words", code: "QlarrScripts.wordCount(Qcomment.value)" },
  { key: "ex_offline", code: 'Survey.mode === "offline"' },
  { key: "ex_range", code: '({"min": Math.min(Qa.value, Qb.value), "max": Math.max(Qa.value, Qb.value)})' },
];

function Code({ children, block }) {
  return (
    <Box
      component={block ? "pre" : "code"}
      sx={{
        fontFamily: "monospace",
        fontSize: 13,
        backgroundColor: "grey.100",
        borderRadius: 0.5,
        px: 0.75,
        py: block ? 0.75 : 0.25,
        m: 0,
        whiteSpace: block ? "pre-wrap" : "normal",
        wordBreak: "break-word",
        display: block ? "block" : "inline",
      }}
    >
      {children}
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={1.25}>{children}</Stack>
    </Box>
  );
}

/** A side panel explaining how to write a calculation expression. */
function ExpressionHelp({ open, onClose }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const h = (key, options) => t(`calculations.help.${key}`, options);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", md: 640 } } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>
          {h("title")}
        </Typography>
        <IconButton onClick={onClose} aria-label={h("close")}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Stack spacing={3} sx={{ p: 3, overflowY: "auto" }}>
        <Stack spacing={1}>
          <Typography variant="body2">{h("intro")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {h("test_hint")}
          </Typography>
        </Stack>

        <Section title={h("references_title")}>
          {REFERENCES.map(({ code, key }) => (
            <Box key={key}>
              <Code>{code}</Code>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {h(key)}
              </Typography>
            </Box>
          ))}
          <Typography variant="body2" color="text.secondary">
            {h("ref_unanswered")}
          </Typography>
        </Section>

        <Section title={h("types_title")}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{h("type_col_question")}</TableCell>
                <TableCell>{h("type_col_value")}</TableCell>
                <TableCell>{h("type_col_example")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {TYPES.map(({ key, example }) => (
                <TableRow key={key}>
                  <TableCell sx={{ verticalAlign: "top" }}>{h(`${key}_question`)}</TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>{h(`${key}_value`)}</TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <Code>{example}</Code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title={h("results_title")}>
          {["res_value", "res_empty", "res_error"].map((key) => (
            <Typography key={key} variant="body2">
              {h(key)}
            </Typography>
          ))}
        </Section>

        <Section title={h("rules_title")}>
          {RULES.map(({ key, example }) => (
            <Box key={key}>
              <Typography variant="body2">{h(key)}</Typography>
              {example && (
                <Box sx={{ mt: 0.5 }}>
                  <Code block>{example}</Code>
                </Box>
              )}
            </Box>
          ))}
        </Section>

        <Section title={h("functions_title")}>
          {FUNCTIONS.map(({ key, code }) => (
            <Box key={key}>
              <Typography variant="body2" fontWeight={600}>
                {h(key)}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Code block>{code}</Code>
              </Box>
            </Box>
          ))}
        </Section>

        <Section title={h("pitfalls_title")}>
          {PITFALLS.map((key) => (
            <Typography key={key} variant="body2">
              {h(key)}
            </Typography>
          ))}
        </Section>

        <Divider />

        <Section title={h("examples_title")}>
          <Typography variant="body2" color="text.secondary">
            {h("examples_note")}
          </Typography>
          {EXAMPLES.map(({ key, code }) => (
            <Box key={key}>
              <Typography variant="body2" fontWeight={600}>
                {h(key)}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Code block>{code}</Code>
              </Box>
            </Box>
          ))}
        </Section>
      </Stack>
    </Drawer>
  );
}

export default React.memo(ExpressionHelp);
