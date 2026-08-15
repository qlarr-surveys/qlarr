import React, { useState, useEffect, useCallback } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { PersonAdd } from "@mui/icons-material";
import {
  Button,
  IconButton,
  Box,
  Typography,
  Popover,
  MenuItem,
  Divider,
  TableSortLabel,
} from "@mui/material";
import styles from "./UsersTable.module.css";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useDispatch } from "react-redux";
import { setLoading } from "~/state/edit/editState";
import Iconify from "~/components/iconify";
import HelpOutline from "@mui/icons-material/HelpOutline";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import AddEditUser from "~/pages/manage/AddEditUser";
import { useService } from "~/hooks/use-service";
import TokenService from "~/services/TokenService";

export const UsersTable = () => {
  const userService = useService("user");

  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [users, setUsers] = useState([]);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(null);
  const [orderDirection, setOrderDirection] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const [modalUserId, setModalUserId] = useState(null);
  const [popoverUserId, setPopoverUserId] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const userId = TokenService.getUser().id;

  const getUsers = () => {
    dispatch(setLoading(true));
    userService
      .getAllUsers()
      .then((res) => {
        if (res) {
          setUsers(res);
        }
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const [userToDelete, setUserToDelete] = useState(null);
  const onCloseModal = () => {
    setUserToDelete(null);
  };
  const deleteUser = () => {
    setDeleteLoading(true);
    userService
      .deleteUser({ userId: userToDelete.id })
      .then(() => {
        onCloseModal();
        getUsers();
        setDeleteLoading(false);
      })
      .catch((e) => {
        setDeleteLoading(false);
      });
  };

  useEffect(() => {
    getUsers();
  }, []);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && orderDirection === "asc";
    setOrderDirection(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortFunction = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  const getComparator = (order, orderBy) => {
    return order === "desc"
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (orderBy === "name") {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      if (nameB < nameA) {
        return -1;
      }
      if (nameB > nameA) {
        return 1;
      }
      return 0;
    } else {
      if (b[orderBy] < a[orderBy]) {
        return -1;
      }
      if (b[orderBy] > a[orderBy]) {
        return 1;
      }
      return 0;
    }
  };

  const sortedUsers = sortFunction(
    users,
    getComparator(orderDirection, orderBy)
  );
  const [userModal, setUserModal] = useState(false);
  const handleOpenModal = (userId = null) => {
    setModalUserId(userId);
    setUserModal(true);
  };
  const handleEditUser = (userId) => {
    handleOpenModal(userId);
    setOpen(null);
  };
  const handleCloseModal = (prop) => {
    setUserModal(false);
    if (!prop) {
      getUsers();
    }
  };

  const handleOpen = useCallback((event, userId) => {
    setOpen(event.currentTarget);
    setPopoverUserId(userId);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(null);
    setPopoverUserId(null);
  }, []);
  return (
    <>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="h5" sx={{ mb: 3 }}>
          {t("users_manage.users")}
        </Typography>
        <Button className={styles.addUser} onClick={() => handleOpenModal()}>
          <PersonAdd />
          {t("users_manage.add_user")}
        </Button>
      </Box>

      <TableContainer
        sx={{
          overflow: "unset",
          [`& .${tableCellClasses.head}`]: {
            color: "text.primary",
          },
          [`& .${tableCellClasses.root}`]: {
            bgcolor: "background.default",
            borderBottomColor: (theme) => theme.palette.divider,
          },
        }}
      >
        <Table sx={{ minWidth: 650 }} aria-label={t("aria.users_table")}>
          <TableHead>
            <TableRow>
              <TableCell align="left">
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? orderDirection : "asc"}
                  onClick={() => handleRequestSort("name")}
                >
                  {t("users_manage.name")}
                </TableSortLabel>
              </TableCell>
              <TableCell align="left">
                <TableSortLabel
                  active={orderBy === "email"}
                  direction={orderBy === "email" ? orderDirection : "asc"}
                  onClick={() => handleRequestSort("email")}
                >
                  {t("users_manage.email")}
                </TableSortLabel>
              </TableCell>
              <TableCell align="left">
                <TableSortLabel
                  active={orderBy === "roles"}
                  direction={orderBy === "roles" ? orderDirection : "asc"}
                  onClick={() => handleRequestSort("roles")}
                >
                  {t("users_manage.roles")}
                </TableSortLabel>
              </TableCell>
              <TableCell align="left">
                <TableSortLabel
                  active={orderBy === "status"}
                  direction={orderBy === "status" ? orderDirection : "asc"}
                  onClick={() => handleRequestSort("status")}
                >
                  {t("users_manage.status")}
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.map((user) => {
              const disabled = !user.isConfirmed || user.id === userId;
              return (
                <React.Fragment key={user.id}>
                  <TableRow key={user.id}>
                    <TableCell align="left">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell align="left">{user.email}</TableCell>
                    <TableCell align="left">
                      {user.roles.map((role) => t(`label.${role}`)).join(", ")}
                    </TableCell>
                    <TableCell align="left">
                      {user.isConfirmed
                        ? t("users_manage.active")
                        : t("users_manage.invitation_sent")}
                    </TableCell>
                    <TableCell align="right" padding="none">
                      {!disabled && (
                        <IconButton
                          onClick={(event) => handleOpen(event, user.id)}
                        >
                          <Iconify icon="carbon:overflow-menu-vertical" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                  <Popover
                    open={Boolean(open) && popoverUserId === user.id}
                    anchorEl={open}
                    onClose={handleClose}
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    slotProps={{
                      paper: {
                        sx: { width: 160 },
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        handleEditUser(user.id);
                      }}
                    >
                      <Iconify icon="carbon:edit" sx={{ mr: 1 }} />{" "}
                      {t("users_manage.title_edit")}
                    </MenuItem>

                    <Divider sx={{ borderStyle: "dashed", mt: 0.5 }} />

                    <MenuItem
                      onClick={() => {
                        setOpen(null);
                        setUserToDelete(user);
                      }}
                      sx={{ color: "error.dark" }}
                    >
                      <Iconify icon="carbon:trash-can" sx={{ mr: 1 }} />{" "}
                      {t("users_manage.title_delete")}
                    </MenuItem>
                  </Popover>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <CustomTooltip
        showIcon={false}
        body={t("users_manage.roles_info")}
        placement="top-start"
      >
        <Box
          display="inline-flex"
          alignItems="center"
          gap={0.5}
          sx={{
            mt: 2,
            cursor: "default",
            color: "text.secondary",
            "&:hover": { color: "primary.main" },
          }}
        >
          <HelpOutline sx={{ fontSize: 18 }} />
          <Typography variant="body2">
            {t("users_manage.learn_about_roles")}
          </Typography>
        </Box>
      </CustomTooltip>

      {Boolean(userToDelete) && (
        <ConfirmActionModal
          open={Boolean(userToDelete)}
          title={t("action_btn.delete")}
          onClose={onCloseModal}
          onConfirm={deleteUser}
          description={t("users_manage.delete_title", {
            name: userToDelete.firstName + " " + userToDelete.lastName,
          })}
          cancelLabel={t("action_btn.cancel")}
          confirmLabel={t("action_btn.delete")}
          isLoading={deleteLoading}
        />
      )}

      {userModal && (
        <AddEditUser
          userId={modalUserId}
          open={userModal}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};
