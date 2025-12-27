// /lib/device-id.ts
/**
 * 设备ID管理工具
 */

const DEVICE_ID_KEY = 'love_ludo_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // 生成新的设备ID
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

export function setDeviceId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
}

export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}