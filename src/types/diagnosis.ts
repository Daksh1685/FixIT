export type DiagnosisConfidence = 'medium' | 'high';

export type DeviceDiagnosis = {
  brand: string;
  causes: string[];
  confidence: DiagnosisConfidence;
  device: string;
  fix_steps: string[];
  highlight: DiagnosisHighlight;
  issue: string;
  model: string;
  safety_note: string;
};

/** Normalized top-left rectangle within the original uncropped image. */
export type DiagnosisHighlight = {
  height: number;
  label: string;
  width: number;
  x: number;
  y: number;
};

export type FollowUpMessage = {
  content: string;
  /** Client-only label used for concise quick-action bubbles. Never sent to the API. */
  displayContent?: string;
  role: 'user' | 'assistant';
};

export type AdditionalImageRequest = {
  confidence: 'low';
  missing_information: string;
  suggested_photo: string;
};

export type ImageAnalysisResult = DeviceDiagnosis | AdditionalImageRequest;

export type DiagnosisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { diagnosis: DeviceDiagnosis; status: 'success' }
  | { request: AdditionalImageRequest; status: 'needs_photo' }
  | { message: string; status: 'error' };
