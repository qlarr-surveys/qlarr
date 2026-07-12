import React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import { useTheme } from "@emotion/react";
import { shallowEqual, useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { valueChange } from "~/state/runState";
import Validation from "~/components/run/Validation";
import DynamicSvg from "~/components/DynamicSvg";
import { buildResourceUrl } from "~/networking/common";
import { TableHead } from "@mui/material";
import { useColumnMinWidth } from "~/utils/design/utils";
import Content from "~/components/run/Content";
import styles from "./SCQIconArray.module.css";

function SCQIconArray(props) {
  const theme = useTheme();
  const width = useColumnMinWidth();

  let columns = props.component.answers.filter(
    (answer) => answer.type == "column"
  );
  let rows = props.component.answers.filter((answer) => answer.type == "row");

  // Columns can be hidden by relevance (e.g. column prioritisation), the same
  // way rows are. Drop any column whose relevance is explicitly false.
  const columnRelevance = useSelector(
    (state) =>
      columns.map(
        (option) => state.runState.values[option.qualifiedCode]?.relevance
      ),
    shallowEqual
  );
  const visibleColumns = columns.filter(
    (_, index) =>
      typeof columnRelevance[index] === "undefined" || columnRelevance[index]
  );

  return (
    <TableContainer className={styles.tableContainer}>
      <Table className={styles.table} style={{ '--qlarr-table-min-width': `${visibleColumns.length * width}px` }}>
        <TableHead>
          <TableRow>
            <TableCell
              key="content"
              className={styles.emptyHeader}
              style={{ '--qlarr-cell-width': width }}
            ></TableCell>
            {visibleColumns.map((option) => {
              return (
                <TableCell
                  className={styles.columnHeader}
                  style={{ '--qlarr-cell-width': width }}
                  key={option.qualifiedCode}
                >
                  <Content
                    elementCode={option.qualifiedCode}
                    name="label"
                    content={option.content?.label}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((answer) => {
            return (
              <React.Fragment key={answer.qualifiedCode}>
                <SCQArrayRow
                  key={answer.qualifiedCode}
                  answer={answer}
                  choices={visibleColumns}
                  width={width}
                />
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SCQArrayRow(props) {
  const theme = useTheme();

  const isDirty = useSelector(
    (state) => state.templateState[props.answer.qualifiedCode]?.isDirty
  );
  const show_errors = useSelector(
    (state) => state.runState.values.Survey.show_errors
  );
  const state = useSelector(
    (state) => state.runState.values[props.answer.qualifiedCode]
  );
  const validity = React.useMemo(() => state?.validity, [state]);
  const value = React.useMemo(() => state?.value, [state]);
  const relevance = React.useMemo(() => state?.relevance, [state]);

  const dispatch = useDispatch();

  const handleChange = (value) => {
    dispatch(
      valueChange({
        componentCode: props.answer.qualifiedCode,
        value: value,
      })
    );
  };

  const invalid = (show_errors || isDirty) && validity === false;

  return typeof relevance === "undefined" || relevance ? (
    <React.Fragment>
      <TableRow key={props.answer.code} data-code={props.answer.code}>
        <TableCell
          className={`${styles.rowLabelCell} ${invalid ? styles.noBorder : ''}`}
        >
          <Content
            elementCode={props.answer.qualifiedCode}
            name="label"
            content={props.answer.content?.label}
          />
        </TableCell>
        {props.choices.map((option) => {
          return (
            <TableCell
              key={option.code}
              component="th"
              scope="row"
              className={`${styles.choiceCell} ${invalid ? styles.noBorder : ''}`}
              style={{ '--qlarr-cell-width': props.width }}
            >
              <DynamicSvg
                onIconClick={() => handleChange(option.code)}
                imageHeight={"64px"}
                isSelected={value == option.code}
                theme={theme}
                svgUrl={
                  option?.resources?.icon
                    ? buildResourceUrl(option?.resources?.icon)
                    : undefined
                }
              />
            </TableCell>
          );
        })}
      </TableRow>
      {invalid ? (
        <TableRow>
          <TableCell
            className={styles.validationCell}
            colSpan={props.choices ? props.choices.length + 1 : 1}
          >
            <Validation component={props.answer} />
          </TableCell>
        </TableRow>
      ) : (
        ""
      )}
    </React.Fragment>
  ) : (
    ""
  );
}

export default SCQIconArray;
