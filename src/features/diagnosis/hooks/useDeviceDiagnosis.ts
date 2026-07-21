import { useCallback, useEffect, useState } from 'react';

import { isRequestCancelled, toApiError } from '../../../services/api/client';
import { isAdditionalImageRequest, requestDiagnosis } from '../../../services/api/diagnosis.service';
import { DiagnosisState } from '../../../types/diagnosis';
import { ScanImage } from '../../../types/scan';

export function useDeviceDiagnosis(image: ScanImage | null) {
  const [attempt, setAttempt] = useState(0);
  const [diagnosisState, setDiagnosisState] = useState<DiagnosisState>({ status: 'idle' });

  useEffect(() => {
    if (!image) {
      setDiagnosisState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setDiagnosisState({ status: 'loading' });

    void requestDiagnosis(image, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setDiagnosisState(
            isAdditionalImageRequest(result)
              ? { request: result, status: 'needs_photo' }
              : { diagnosis: result, status: 'success' },
          );
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isRequestCancelled(error)) {
          setDiagnosisState({ message: toApiError(error).message, status: 'error' });
        }
      });

    return () => controller.abort();
  }, [attempt, image]);

  const retry = useCallback(() => {
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  return { diagnosisState, retry };
}
