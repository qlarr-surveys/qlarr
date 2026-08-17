import React, { Suspense } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";

import { MANAGE_SURVEY_LANDING_PAGES, routes } from "./routes";
import { lazy } from "react";
import { runStore } from "./store";
import { Provider } from "react-redux";

import TokenService from "./services/TokenService";
import { getparam } from "./networking/run";

import LoadingIndicator from "./components/common/LoadingIndicator";
import { ROLES } from "./constants/roles";
import { HEADER_OPTIONS } from "./pages/ManagePageWrapper/headerOptions";
import { Unauthorized } from "./pages/Page404";

const AuthIllustrationLayout = lazy(() => import("./layouts/authlayout"));
const ManagePageWrapper = lazy(() => import("./pages/ManagePageWrapper"));
const PreviewSurvey = lazy(() => import("./pages/PreviewSurvey"));
const ManageSurvey = lazy(() => import("./pages/ManageSurvey"));
const Page404 = lazy(() => import("./pages/Page404"));
const ForgotPasswordView = lazy(() => import("./pages/manage/ForgotPassword"));
const ResetPasswordView = lazy(() => import("./pages/manage/ResetPassword"));
const Dashboard = lazy(() => import("./pages/manage/Dashboard"));
const LoginView = lazy(() => import("./pages/manage/Login"));
const ManageUsers = lazy(() => import("./pages/manage/ManageUsers"));
const ProfileView = lazy(() => import("./pages/manage/Profile"));
const RunSurvey = lazy(() => import("./pages/RunSurvey"));

function Web() {
  return (
    <Routes>
      <Route
        path={routes.runSurvey}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <Provider store={runStore}>
              <RunSurveyWrapper />
            </Provider>
          </Suspense>
        }
      />
      <Route
        path={routes.resumeSurvey}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <Provider store={runStore}>
              <RunSurveyWrapper resume={true} />
            </Provider>
          </Suspense>
        }
      />
      <Route
        path={routes.iframePreviewSurvey}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <Provider store={runStore}>
              <PreviewSurveyWrapper />
            </Provider>
          </Suspense>
        }
      />
      <Route
        path={routes.iframePreviewSurvey}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <Provider store={runStore}>
              <PreviewSurveyWrapper resume={true} />
            </Provider>
          </Suspense>
        }
      />
      <Route
        path={routes.resumeIframePreviewSurvey}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <Provider store={runStore}>
              <PreviewSurveyWrapper resume={true} />
            </Provider>
          </Suspense>
        }
      />
      <Route
        path={routes.designSurvey}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ForceRole roles={[ROLES.SUPER_ADMIN, ROLES.SURVEY_ADMIN]}>
                <ManagePageWrapper headerOptions={HEADER_OPTIONS.SURVEY} resolveSurveyId={true}>
                  <ManageSurvey
                    landingPage={MANAGE_SURVEY_LANDING_PAGES.DESIGN}
                  />
                </ManagePageWrapper>
              </ForceRole>
            </PrivateComponent>
          </Suspense>
        }
      />
      <Route
        path={routes.preview}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ManagePageWrapper headerOptions={HEADER_OPTIONS.NONE} resolveSurveyId={true}>
                <PreviewSurveyResolveResponse />
              </ManagePageWrapper>
            </PrivateComponent>
          </Suspense>
        }
      />
      <Route
        path={routes.resumePreview}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ManagePageWrapper headerOptions={HEADER_OPTIONS.NONE} resolveSurveyId={true}>
                <PreviewSurveyResolveResponse />
              </ManagePageWrapper>
            </PrivateComponent>
          </Suspense>
        }
      />
      <Route
        path={routes.editSurvey}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ForceRole
                roles={[ROLES.SUPER_ADMIN, ROLES.ANALYST, ROLES.SURVEY_ADMIN]}
              >
                <ManagePageWrapper headerOptions={HEADER_OPTIONS.SURVEY} resolveSurveyId={true}>
                  <ManageSurvey
                    landingPage={MANAGE_SURVEY_LANDING_PAGES.SETTINGS}
                  />
                </ManagePageWrapper>
              </ForceRole>
            </PrivateComponent>
          </Suspense>
        }
      />

      <Route
        path={routes.responses}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ForceRole
                roles={[ROLES.SUPER_ADMIN, ROLES.ANALYST, ROLES.SURVEY_ADMIN]}
              >
                <ManagePageWrapper
                  headerOptions={HEADER_OPTIONS.SURVEY_NO_PREVIEW}
                   resolveSurveyId={true}
                >
                  <ManageSurvey
                    landingPage={MANAGE_SURVEY_LANDING_PAGES.RESPONSES}
                  />
                </ManagePageWrapper>
              </ForceRole>
            </PrivateComponent>
          </Suspense>
        }
      />
      <Route
        path={routes.manageUsers}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ForceRole roles={[ROLES.SUPER_ADMIN]}>
                <ManagePageWrapper headerOptions={HEADER_OPTIONS.GENERAL}>
                  <ManageUsers />
                </ManagePageWrapper>
              </ForceRole>
            </PrivateComponent>
          </Suspense>
        }
      />
      <Route
        path={routes.profile}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ManagePageWrapper headerOptions={HEADER_OPTIONS.GENERAL}>
                <ProfileView />
              </ManagePageWrapper>
            </PrivateComponent>
          </Suspense>
        }
      />
      <Route
        path={routes.unauthorized}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <Unauthorized />
          </Suspense>
        }
      />
      <Route
        path={routes.page404}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <Page404 />
          </Suspense>
        }
      />
      <Route
        path={routes.dashboard}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <PrivateComponent>
              <ManagePageWrapper headerOptions={HEADER_OPTIONS.GENERAL}>
                <Dashboard />
              </ManagePageWrapper>
            </PrivateComponent>
          </Suspense>
        }
      />

      <Route
        path={routes.login}
        element={
          <PublicOnlyRoute>
            <Suspense fallback={<LoadingIndicator />}>
              <ManagePageWrapper headerOptions={HEADER_OPTIONS.AUTH}>
                <AuthIllustrationLayout>
                  <LoginView />
                </AuthIllustrationLayout>
              </ManagePageWrapper>
            </Suspense>
          </PublicOnlyRoute>
        }
      />
      <Route
        path={routes.forgotPassword}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <ManagePageWrapper headerOptions={HEADER_OPTIONS.AUTH}>
              <AuthIllustrationLayout>
                <ForgotPasswordView />
              </AuthIllustrationLayout>
            </ManagePageWrapper>
          </Suspense>
        }
      />
      <Route
        path={routes.resetPassword}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <ManagePageWrapper headerOptions={HEADER_OPTIONS.AUTH}>
              <ResetPasswordView />
            </ManagePageWrapper>
          </Suspense>
        }
      />
      <Route
        path={routes.confirmNewUser}
        element={
          <Suspense fallback={<LoadingIndicator />}>
            <ManagePageWrapper headerOptions={HEADER_OPTIONS.AUTH}>
              <ResetPasswordView confirmNewUser={true} />
            </ManagePageWrapper>
          </Suspense>
        }
      />
    </Routes>
  );
}

const PreviewSurveyResolveResponse = () => {
  const params = useParams();
  sessionStorage.setItem("surveyId", params.surveyId);
  const responseId = getparam(useParams(), "responseId");
  return <PreviewSurvey responseId={responseId} />;
};

const PrivateComponent = ({ children }) => {
  const location = useLocation();
  return TokenService.isAuthenticated() ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};

const ForceRole = ({ roles, children }) => {
  const user = TokenService.getUser();
  let hasCorrectRole = false;
  user.roles.forEach((el) => {
    if (roles.indexOf(el) > -1) {
      hasCorrectRole = true;
    }
  });

  if (!hasCorrectRole) {
    return <Unauthorized />;
  } else {
    return children;
  }
};

const PublicOnlyRoute = ({ children }) => {
  return TokenService.isAuthenticated() ? (
    <Navigate to="/" replace />
  ) : (
    children
  );
};

const RunSurveyWrapper = ({ resume = false }) => {
  const surveyId = getparam(useParams(), "surveyId");
  const responseId = getparam(useParams(), "responseId");
  sessionStorage.setItem("surveyId", surveyId);
  return <RunSurvey responseId={responseId} resume={resume} />;
};

const PreviewSurveyWrapper = ({ resume = false }) => {
  const surveyId = getparam(useParams(), "surveyId");
  sessionStorage.setItem("surveyId", surveyId);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode") || "online";
  const responseId = getparam(useParams(), "responseId");
  const navigationMode = searchParams.get("navigation_mode");
  return (
    <RunSurvey
      preview={true}
      responseId={responseId}
      resume={resume}
      mode={mode}
      navigationMode={navigationMode}
    />
  );
};

export default Web;
