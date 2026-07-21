export type ScanSource = 'camera' | 'library';

export type ScanImage = {
  fileName?: string;
  height?: number;
  mimeType?: string;
  source: ScanSource;
  uri: string;
  width?: number;
};
