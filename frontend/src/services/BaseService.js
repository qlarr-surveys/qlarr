import { onError } from "~/state/edit/editState";
import { processApiError } from "~/utils/errorsProcessor";

class BaseService {
  constructor(dispatch) {
    this.dispatch = dispatch;
  }

  async handleRequest(apiCall, { silent = false } = {}) {
    try {
      return await apiCall();
    } catch (error) {
      throw await processApiError({
        error: error,
        globalErrorHandler: silent
          ? () => {}
          : (processedError) => {
              this.dispatch(onError(processedError));
            },
      });
    }
  }
}

export default BaseService;
