import TokenService from "./TokenService";
import authenticatedApi from "./authenticatedApi";
import publicApi from "./publicApi";
import BaseService from "./BaseService";

class AuthService extends BaseService {
  async login(email, password) {
    const response = await this.handleRequest(() =>
      publicApi.post("/user/login", { email, password })
    );

    if (response.data) {
      TokenService.setSession(response.data);
    }
    return response;
  }

  async forgotPassword(email) {
    return this.handleRequest(() =>
      publicApi.post("/user/forgot_password", { email })
    );
  }

  async resetPassword(confirmNewUser, refreshToken, newPassword) {
    const response = await this.handleRequest(() =>
      publicApi.post(
        confirmNewUser ? "/user/confirm_new_user" : "/user/reset_password",
        confirmNewUser
          ? { token: refreshToken, newPassword }
          : { refreshToken, newPassword }
      )
    );
    if (response.data) {
      TokenService.setSession(response.data);
    }
    return response.data;
  }

  async logout() {
    try {
      const response = await this.handleRequest(() =>
        authenticatedApi.post("/logout")
      );
      if (response.status === 200) {
        TokenService.removeSession();
      }
      return response.status === 200;
    } catch (error) {
      TokenService.removeSession();
      throw error;
    }
  }
}

export default AuthService;
