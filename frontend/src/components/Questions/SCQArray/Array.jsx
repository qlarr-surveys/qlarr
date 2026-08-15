import React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useTheme } from "@emotion/react";
import { shallowEqual, useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { Checkbox, Radio } from "@mui/material";
import { valueChange } from "~/state/runState";
import Validation from "~/components/run/Validation";
import { useColumnMinWidth } from "~/utils/design/utils";
import Content from "~/components/run/Content";
import styles from "./Array.module.css";

function Array(props) {
  const theme = useTheme();
  let columns = props.component.answers.filter(
    (answer) => answer.type == "column"
  );
  let rows = props.component.answers.filter((answer) => answer.type == "row");
  const { header, rowLabel } = useColumnMinWidth(null, props.component);

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
      <Table className={styles.table}>
        <TableHead>
          <TableRow>
            <TableCell
              key="content"
              className={styles.rowLabelHeader}
              style={{ '--qlarr-cell-width': rowLabel + 'px' }}
            ></TableCell>
            {visibleColumns.map((option) => {
              return (
                <TableCell
                  className={styles.columnHeader}
                  style={{ '--qlarr-cell-width': header + 'px' }}
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
                <ArrayRow
                  type={props.component.type}
                  key={answer.qualifiedCode}
                  answer={answer}
                  choices={visibleColumns}
                />
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ArrayRow(props) {
  const theme = useTheme();
  const state = useSelector((state) => {
    return {
      show_errors: state.runState.values.Survey.show_errors,
      validity: state.runState.values[props.answer.qualifiedCode]?.validity,
      value: state.runState.values[props.answer.qualifiedCode]?.value,
      relevance: state.runState.values[props.answer.qualifiedCode]?.relevance,
    };
  }, shallowEqual);
  const dispatch = useDispatch();

  const handleChange = (event) => {
    if (props.type === "scq_array") {
      dispatch(
        valueChange({
          componentCode: event.target.name,
          value: event.target.value,
        })
      );
    } else if (props.type === "mcq_array") {
      let currentValue = state.value || [];
      let value = [...currentValue];
      if (event.target.checked) {
        value.push(event.target.value);
      } else {
        value = value.filter((el) => el !== event.target.value);
      }
      dispatch(
        valueChange({
          componentCode: event.target.name,
          value: value,
        })
      );
    }
  };

  const invalid =
    (state.show_errors || state.isDirty) && state.validity === false;

  return typeof state.relevance === "undefined" || state.relevance ? (
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
              component="td"
              scope="row"
              className={`${styles.choiceCell} ${invalid ? styles.noBorder : ''}`}
            >
              {props.type === "scq_array" ? (
                <Radio
                  name={props.answer.qualifiedCode}
                  onChange={handleChange}
                  checked={state.value === option.code}
                  value={option.code}
                />
              ) : (
                <Checkbox
                  name={props.answer.qualifiedCode}
                  onChange={handleChange}
                  checked={(state.value || []).indexOf(option.code) > -1}
                  value={option.code}
                />
              )}
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

export default Array;
