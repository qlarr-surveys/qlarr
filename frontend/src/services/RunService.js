import publicApi from "./publicApi";
import authenticatedApi from "./authenticatedApi";
import BaseService from "./BaseService";
import { localDateToServerDateTime } from '~/utils/DateUtils';

class RunService extends BaseService {
  async start(lang, preview = false, mode = "online", navigationMode) {
    const surveyId = sessionStorage.getItem("surveyId");
    if (preview) {
      const response = await this.handleRequest(() =>
        authenticatedApi.post(
          `/survey/${surveyId}/preview/start?mode=${mode}`,
          { lang, navigationMode, clientUTCTime:localDateToServerDateTime(new Date()) }
        )
      );
      return response.data;
    } else {
      const response = await this.handleRequest(() =>
        publicApi.post(`/survey/${surveyId}/run/start`, {
          lang,
          navigationMode,
          clientUTCTime:localDateToServerDateTime(new Date())
        })
      );
      return response.data;
    }
  }

  async navigate(payload, preview = false, mode = "online") {
    console.log(payload)
    const surveyId = sessionStorage.getItem("surveyId");
    if (preview) {
      const response = await authenticatedApi.post(
        `/survey/${surveyId}/preview/navigate?mode=${mode}`,
        {...payload,  clientUTCTime:localDateToServerDateTime(new Date())}
      );
      return response.data;
    } else {
      const response_1 = await publicApi.post(
        `/survey/${surveyId}/run/navigate`,
        {...payload,  clientUTCTime:localDateToServerDateTime(new Date())}
      );
      return response_1.data;
    }
  }
  async runtimeJs(preview) {
    const surveyId = sessionStorage.getItem("surveyId");
    if (preview) {
      const response = await this.handleRequest(() =>
        authenticatedApi.get(`/survey/${surveyId}/preview/runtime.js`)
      );
      return response.data;
    } else {
      const response = await this.handleRequest(() =>
        publicApi.get(`/survey/${surveyId}/run/runtime.js`)
      );
      return response.data;
    }
  }

  async uploadResponseFile(key, preview, file) {
    const surveyId = sessionStorage.getItem("surveyId");
    const responseId = sessionStorage.getItem("responseId");
    const formData = new FormData();
    formData.append("file", file);
    const api = preview ? authenticatedApi : publicApi;
    const url = preview
      ? `/survey/${surveyId}/response/preview/attach/${responseId}/${key}`
      : `/survey/${surveyId}/response/attach/${responseId}/${key}`;
    const response = await api.post(url, formData, {
      headers: {
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async searchAutoComplete(uuid, query) {
    const surveyId = sessionStorage.getItem("surveyId");
    const response = await this.handleRequest(() =>
      publicApi.get(`/survey/${surveyId}/autocomplete/${uuid}?q=${query}`)
    );
    return response.data;
  }

  async uploadResponseBlob(key, preview, blob, fileName) {
    const surveyId = sessionStorage.getItem("surveyId");
    const responseId = sessionStorage.getItem("responseId");
    const formData = new FormData();
    formData.append("file", blob, fileName);
    const api = preview ? authenticatedApi : publicApi;
    const url = preview
      ? `/survey/${surveyId}/response/preview/attach/${responseId}/${key}`
      : `/survey/${surveyId}/response/attach/${responseId}/${key}`;
    const response = await api.post(url, formData, {
      headers: {
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
}

export default RunService;
