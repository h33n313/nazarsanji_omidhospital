
const PIN_STORAGE_KEY = 'omid_admin_pin';
const MASTER_PIN = '427726';
const DEFAULT_PIN = '0000';

export const verifyPin = (inputPin: string): { success: boolean; isMaster: boolean } => {
  if (inputPin === MASTER_PIN) {
    return { success: true, isMaster: true };
  }
  
  const currentPin = localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
  return { success: inputPin === currentPin, isMaster: false };
};

export const changeAdminPin = (newPin: string): void => {
  localStorage.setItem(PIN_STORAGE_KEY, newPin);
};

export const getStoredPin = (): string => {
  return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
};
