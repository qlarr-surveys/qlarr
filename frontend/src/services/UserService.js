import BaseService from "./BaseService";
import authenticatedApi from "./authenticatedApi";

class UserService extends BaseService {
  async getCountByRole() {
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/user/count_by_role`)
    );
    return response.data;
  }

  async getAllUsers() {
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/user/all`)
    );
    return response.data;
  }

  async getUser({ userId }) {
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/user/${userId}`)
    );
    return response.data;
  }

  async deleteUser({ userId }) {
    const response = await this.handleRequest(() =>
      authenticatedApi.delete(`/user/${userId}`)
    );
    return response.data;
  }

  async createUser(data) {
    const response = await this.handleRequest(() =>
      authenticatedApi.post(`/user/create`, data)
    );
    return response.data;
  }

  async updateUser({ userId, data }) {
    const response = await this.handleRequest(() =>
      authenticatedApi.put(`/user/${userId}`, data)
    );
    return response.data;
  }

  async updateUserProfile(data) {
    const response = await this.handleRequest(() =>
      authenticatedApi.put(`/user/profile`, data)
    );
    return response.data;
  }

  async confirmEmail(data) {
    const response = await this.handleRequest(() =>
      authenticatedApi.post(`/user/confirm_new_email`, data)
    );
    return response.data;
  }
}

export default UserService;
