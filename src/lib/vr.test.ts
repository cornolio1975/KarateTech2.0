import { describe, expect, it } from 'vitest';
import { buildVrPath, sanitizeFileSystemName, getMatchCode, buildVideoConstraints, resolveCameraSelection } from './vr';

describe('VR helpers', () => {
  it('sanitizes category names for directory creation', () => {
    expect(sanitizeFileSystemName('Senior Male Kumite -75kg / Finals!')).toBe('Senior Male Kumite -75kg Finals');
  });

  it('builds the expected VR folder structure', () => {
    expect(buildVrPath('Senior Male Kumite -75kg', 'R2B4')).toBe('VR/Senior Male Kumite -75kg/R2B4');
  });

  it('builds a match code from round and bout', () => {
    expect(getMatchCode(2, 4)).toBe('R2B4');
  });

  it('falls back to an available webcam when the saved device is stale', () => {
    const cameras = [
      { deviceId: 'cam-2', label: 'Integrated Camera' },
      { deviceId: 'cam-1', label: 'USB Webcam' },
    ];

    const selectedCamera = resolveCameraSelection('cam-9', cameras);

    expect(selectedCamera).toEqual(cameras[0]);
    expect(buildVideoConstraints({ deviceId: selectedCamera?.deviceId, resolution: '1280x720', frameRate: 30 })).toEqual({
      deviceId: { ideal: 'cam-2' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    });
  });
});
