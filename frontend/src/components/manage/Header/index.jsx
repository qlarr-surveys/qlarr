import React, { useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  LogoutOutlined,
  Person,
} from "@mui/icons-material";
import GroupsIcon from "@mui/icons-material/Groups";
import TokenService from "~/services/TokenService";
import styles from "./Header.module.css";
import { LanguageSelector } from "../LanguageSelector";
import { MANAGE_SURVEY_LANDING_PAGES, routes } from "~/routes";
import { useDispatch } from "react-redux";
import { onEditErrorSeen, setLoading } from "~/state/edit/editState";
import { isSuperAdmin } from "~/constants/roles";
import { isSessionRtl } from "~/utils/common";
import { useService } from "~/hooks/use-service";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { SurveyHeader } from "../SurveyHeader";

export const Header = ({ headerOptions }) => {
  const authService = useService("auth");
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const nav = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const isRtl = isSessionRtl();

  const logout = () => {
    setAnchorEl(null);
    dispatch(setLoading(true));
    authService
      .logout()
      .then(() => {
        nav(routes.login);
      })
      .catch((e) => {
        nav(routes.login);
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const dropdownRef = useRef(null);

  if (headerOptions.showSurveyHeader) {
    return <SurveyHeader showPreview={headerOptions.showPreview} />;
  }
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Handle click outside to close dropdown
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
  //       handleClose();
  //     }
  //   };

  //   if (open) {
  //     document.addEventListener('mousedown', handleClickOutside);
  //     return () => {
  //       document.removeEventListener('mousedown', handleClickOutside);
  //     };
  //   }
  // }, [open]);

  return (
    <Box className={styles.header}>
      <Box
        onClick={() => {
          dispatch(onEditErrorSeen());
          nav("/");
        }}
        gap="12px"
        className={isRtl ? styles.imageContainerRtl : styles.imageContainer}
      >
        <img src="/qlarr.png" style={{ height: "40px" }} />
      </Box>

      <Box className={isRtl ? styles.userInfoRtl : styles.userInfo}>
        <LanguageSelector />
        {headerOptions.showUserMenu !== false && TokenService.isAuthenticated() && (
          <>
            <Box
              ref={dropdownRef}
              sx={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid #ececfd",
                borderRadius: "10px",
                cursor: "pointer",
                padding: ".125rem 1rem",
                backgroundColor: open ? "#e3f2fd" : "#fff",
              }}
              onClick={handleClick}
            >
              <Person sx={{ color: "#16205b", width: 32, height: 32 }} />
              {open ? (
                <KeyboardArrowUp
                  sx={{
                    transition: "transform 0.3s ease",
                    color: "#181735",
                    width: 24,
                    height: 24,
                  }}
                />
              ) : (
                <KeyboardArrowDown
                  sx={{
                    transition: "transform 0.3s ease",
                    color: "#181735",
                    width: 24,
                    height: 24,
                  }}
                />
              )}
              
              {/* Custom dropdown positioned absolutely */}
              {open && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: "200px",
                    mt: 1.5,
                    backgroundColor: "#ffffff",
                    borderRadius: "5px",
                    boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
                    border: "1px solid #e0e0e0",
                    zIndex: 1400,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleClose();
                      setTimeout(() => {
                        nav(routes.profile);
                      }, 0);
                    }}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    <span>{t("profile.title")}</span>
                    <Person sx={{ color: "#16205b", width: 25, height: 25 }} />
                  </Box>
                  <Box
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (isSuperAdmin()) {
                        handleClose();
                        nav(routes.manageUsers);
                      }
                    }}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      cursor: isSuperAdmin() ? "pointer" : "not-allowed",
                      opacity: isSuperAdmin() ? 1 : 0.5,
                      "&:hover": {
                        backgroundColor: isSuperAdmin() ? "#f5f5f5" : "transparent",
                      },
                    }}
                  >
                    <span>{t("profile.manage_users")}</span>
                    <GroupsIcon sx={{ color: "#16205b", width: 25, height: 25 }} />
                  </Box>
                  <Box
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleClose();
                      logout();
                    }}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    <span>{t("profile.logout")}</span>
                    <LogoutOutlined sx={{ color: "#16205b", width: 25, height: 25 }} />
                  </Box>
                </Box>
              )}
            </Box>


          </>
        )}
      </Box>
    </Box>
  );
};

const showTitle = (location) => {
  try {
    return (
      Object.values(MANAGE_SURVEY_LANDING_PAGES).indexOf(
        location.pathname.split("/")[1]
      ) > -1
    );
  } catch (e) {
    console.error(e);
    return false;
  }
};
