import BaseService from "./BaseService";
import authenticatedApi from "./authenticatedApi";
class DesignService extends BaseService {

  async getSurveyDesign() {
    const surveyId = sessionStorage.getItem("surveyId");
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/survey/${surveyId}/design`)
    );
    return response.data;
  }

  async setSurveyDesign(data, params) {
    const surveyId = sessionStorage.getItem("surveyId");
    return authenticatedApi
      .post(`/survey/${surveyId}/design`, data, { params })
      .then((response) => {
        return response.data;
      });
  }

  async publish(params, id) {
    const surveyId = id ? id : sessionStorage.getItem("surveyId");
    const response = await this.handleRequest(() =>
      authenticatedApi.post(
        `/survey/${surveyId}/design/publish`,
        {},
        { params }
      )
    );
    return response.data;
  }

  async changeCode(from, to, surveyId = null) {
    const id = surveyId || sessionStorage.getItem("surveyId");
    const response = await this.handleRequest(() =>
      authenticatedApi.post(`/survey/${id}/change_code`, null, {
        params: { from, to },
      })
    );
    return response.data;
  }
  async uploadResource(file, surveyId = null) {
    if (!surveyId) {
      surveyId = sessionStorage.getItem("surveyId");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await this.handleRequest(() =>
      authenticatedApi.post(`/survey/${surveyId}/resource`, formData, {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      })
    );
    return response.data;
  }

  async uploadAutoCompleteResource(file, componentId, surveyId = null) {
    if (!surveyId) {
      surveyId = sessionStorage.getItem("surveyId");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await authenticatedApi.post(
      `/autocomplete/${surveyId}/${componentId}`,
      formData,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }
  async getAutoCompleteValues(componentId, surveyId = null) {
    if (!surveyId) {
      surveyId = sessionStorage.getItem("surveyId");
    }
    const response = await authenticatedApi.get(
      `/autocomplete/${surveyId}/${componentId}`
    );
    return response.data;
  }
}

export default DesignService;
