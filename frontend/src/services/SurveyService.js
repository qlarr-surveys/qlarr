import authenticatedApi from "./authenticatedApi";
import BaseService from "./BaseService";

class SurveyService extends BaseService {
  async getAllSurveys(page, perpage, status, sortBy) {
    const response = await this.handleRequest(() =>
      authenticatedApi.get(
        `/survey/all?page=${page}&per_page=${perpage}&status=${status}&sort_by=${sortBy}`
      )
    );
    return response.data;
  }

  async getSurvey() {
    const surveyId = sessionStorage.getItem("surveyId");
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/survey/${surveyId}`)
    );
    return response.data;
  }

  async createSurvey(data) {
    const response = await this.handleRequest(() =>
      authenticatedApi.post(`/survey/create`, data)
    );
    return response.data;
  }

  async putSurvey(data, surveyId) {
    const response = await this.handleRequest(() =>
      authenticatedApi.put(`/survey/${surveyId}`, data)
    );
    return response.data;
  }

  async closeSurvey(surveyId) {
    const response = await this.handleRequest(() =>
      authenticatedApi.put(`/survey/${surveyId}/close`)
    );
    return response.data;
  }

  async cloneSurvey(surveyId) {
    const response = await this.handleRequest(() =>
      authenticatedApi.post(`/survey/${surveyId}/clone`, {})
    );
    return response.data;
  }

  async deleteSurvey(surveyId) {
    const response = await this.handleRequest(() =>
      authenticatedApi.delete(`/survey/${surveyId}`)
    );
    return response.data;
  }

  async allResponse(surveyId, page, per_page, complete, surveyor, confirmFilesExport) {

    const url =
      `/survey/${surveyId}/response/summary` +
      `?page=${page}&per_page=${per_page}` +
      `${complete ? `&status=${complete}` : ""}` +
      `${surveyor ? `&surveyor=${surveyor}` : ""}` +
      `${confirmFilesExport ? `&confirm_files_export=true` : ""}`;

    const response = await this.handleRequest(() => authenticatedApi.get(url));
    return response.data;
  }

  async getResponseById(responseId) {
    const response = await this.handleRequest(
      () => authenticatedApi.get(`/response/${responseId}`),
      { silent: true }
    );
    return response.data;
  }

  async getResponseWithEvents(responseId) {
    const response = await this.handleRequest(
      () => authenticatedApi.get(`/response_with_event/${responseId}`),
      { silent: true }
    );
    return response.data;
  }

  async exportResponses(
    surveyId,
    { format = "csv", from, to, dbValues = true, complete, timezone }
  ) {
    const base = `/survey/${surveyId}/response/export/${format}/${from}/${to}`;
    const shouldAddComplete = complete === true || complete === false;
    const tz = encodeURIComponent(timezone);

    const url =
      `${base}?db_values=${dbValues}&timezone=${tz}` +
      `${shouldAddComplete ? `&complete=${complete}` : ""}`;

    const response = await this.handleRequest(() =>
      authenticatedApi.get(url, { responseType: "blob" })
    );
    return response.data;
  }

  async downloadResponseFiles(surveyId, from, to, complete) {
    const base = `/survey/${surveyId}/response/files/download/${from}/${to}`;
    const query =
      complete === true
        ? "?complete=true"
        : complete === false
        ? "?complete=false"
        : "";
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`${base}${query}`, { responseType: "blob" })
    );
    return response.data;
  }

  async deleteResponse(surveyId, responseId) {
    const response = await this.handleRequest(() =>
      authenticatedApi.delete(`/survey/${surveyId}/response/${responseId}`)
    );
    return response;
  }

  async importSurvey(file, onProgress) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.handleRequest(() =>
      authenticatedApi.post(`/survey/import`, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          if (onProgress) {
            onProgress(Math.round(progress));
          }
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      })
    );

    return response.data;
  }

  async exportSurvey(surveyId) {
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/survey/${surveyId}/export`, {
        responseType: "blob",
      })
    );
    const contentDisposition = response.headers.get("Content-Disposition");
    const filename = contentDisposition
      ? contentDisposition.match(/filename="(.+)"/)?.[1] || `${surveyId}.zip`
      : `${surveyId}.zip`;

    // Convert the response to a Blob
    const blob = await response.data;

    // Trigger the file download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async getAnalytics(surveyId, maxResponses = 5000) {
    const response = await this.handleRequest(() =>
      authenticatedApi.get(`/survey/${surveyId}/response/analytics?max_responses=${maxResponses}`)
    );
    return response.data;
  }
}

export default SurveyService;
