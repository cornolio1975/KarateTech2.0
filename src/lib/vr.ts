export type VrRecordingSettings = {
  cameraDeviceId: string;
  resolution: '640x480' | '1280x720' | '1920x1080';
  frameRate: number;
};

export const DEFAULT_VR_SETTINGS: VrRecordingSettings = {
  cameraDeviceId: '',
  resolution: '1280x720',
  frameRate: 30,
};

export const sanitizeFileSystemName = (value: string) =>
  (value || 'General')
    .replace(/[\\/:*?"<>|!]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' ')
    .trim() || 'General';

export const getMatchCode = (roundNo?: number | string, boutNo?: number | string) => {
  const round = roundNo ?? 0;
  const bout = boutNo ?? 0;
  return `R${Number(round)}B${Number(bout)}`;
};

export const buildVrPath = (categoryName: string, matchCode: string) => {
  const safeCategory = sanitizeFileSystemName(categoryName);
  return `VR/${safeCategory}/${matchCode}`;
};

export const getResolutionDimensions = (resolution: VrRecordingSettings['resolution']) => {
  const [width, height] = resolution.split('x').map(Number);
  return { width, height };
};

export const resolveCameraSelection = (
  preferredDeviceId: string | undefined,
  cameras: Array<{ deviceId: string; label: string }>
) => {
  if (!cameras.length) return null;
  if (!preferredDeviceId) return cameras[0];

  const exactMatch = cameras.find(camera => camera.deviceId === preferredDeviceId);
  if (exactMatch) return exactMatch;

  return cameras[0];
};

export const buildVideoConstraints = ({
  deviceId,
  resolution,
  frameRate,
}: {
  deviceId?: string;
  resolution: VrRecordingSettings['resolution'];
  frameRate: number;
}) => {
  const { width, height } = getResolutionDimensions(resolution);
  const constraints: MediaTrackConstraints = {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: frameRate },
  };

  if (deviceId) {
    constraints.deviceId = { ideal: deviceId };
  }

  return constraints;
};
