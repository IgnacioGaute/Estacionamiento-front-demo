export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
let pending: InstallPrompt | null = null;
export const getInstallPrompt = () => pending;
export function setInstallPrompt(value: InstallPrompt | null) {
  pending = value;
  window.dispatchEvent(new Event('parking-install-ready'));
}
