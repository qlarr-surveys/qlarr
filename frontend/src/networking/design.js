import DesignService from "~/services/DesignService";

const importedService = new DesignService();

export async function GetData(designService, setState, setError) {
  try {
    const response = await designService.getSurveyDesign();
    setState(response);
    return response;
  } catch (err) {
    setError(err);
  }
}

export async function SetData(state, setState, setError, version, subVersion) {
  try {
    const params = new URLSearchParams([
      ["version", version],
      ["sub_version", subVersion],
    ]);
    const response = await importedService.setSurveyDesign(state, params);
    setState(response);
  } catch (err) {
    setError(err);
  }
}
