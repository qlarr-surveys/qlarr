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
  async getQuotaStatus(surveyId = null) {
    const id = surveyId || sessionStorage.getItem("surveyId");
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/survey/${id}/quotas`)
    );
    return response.data;
  }

  async exportTranslations() {
    const surveyId = sessionStorage.getItem("surveyId");
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/survey/${surveyId}/translations/export`, {
        responseType: "blob",
      })
    );
    return response.data;
  }

  async importTranslations(file, overrideMainLang) {
    const surveyId = sessionStorage.getItem("surveyId");
    const formData = new FormData();
    formData.append("file", file);
    const response = await this.handleRequest(() =>
      authenticatedApi.post(
        `/survey/${surveyId}/translations/import`,
        formData,
        {
          params: { override_main_lang: overrideMainLang },
          headers: { "Content-Type": "multipart/form-data" },
        }
      )
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

  async uploadHierarchicalResource(file, componentId, levelCount, surveyId = null) {
    if (!surveyId) {
      surveyId = sessionStorage.getItem("surveyId");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await authenticatedApi.post(
      `/hierarchical-autocomplete/${surveyId}/${componentId}`,
      formData,
      {
        params: { levels: levelCount },
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }

  async getHierarchicalCsv(componentId, langs, labels, surveyId = null) {
    if (!surveyId) {
      surveyId = sessionStorage.getItem("surveyId");
    }
    const response = await authenticatedApi.get(
      `/hierarchical-autocomplete/${surveyId}/${componentId}`,
      {
        params: {
          langs: Array.isArray(langs) ? langs.join(",") : langs,
          labels: JSON.stringify(labels || []),
        },
        responseType: "blob",
      }
    );
    return response.data;
  }
}

export default DesignService;
