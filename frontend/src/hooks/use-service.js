import { useDispatch } from "react-redux";
import AuthService from "~/services/AuthService";
import DesignService from "~/services/DesignService";
import RunService from "~/services/RunService";
import SurveyService from "~/services/SurveyService";
import UserService from "~/services/UserService";

export function useService(serviceType) {
  const dispatch = useDispatch();

  switch (serviceType) {
    case "auth":
      return new AuthService(dispatch);
    case "design":
      return new DesignService(dispatch);
    case "run":
      return new RunService(dispatch);
    case "survey":
      return new SurveyService(dispatch);
    case "user":
      return new UserService(dispatch);
    default:
      throw new Error("Unknown service type: " + serviceType);
  }
}
