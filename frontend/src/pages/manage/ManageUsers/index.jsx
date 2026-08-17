import React from "react";
import { Box } from "@mui/material";
import styles from "./ManageUsers.module.css";
import { UsersTable } from "~/components/users/UsersTable";

function ManageUsers() {
  return (
    <Box className={styles.mainContainer}>
      <UsersTable />
    </Box>
  );
}

export default ManageUsers;
