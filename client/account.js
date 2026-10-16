import './styles.css';
import { mountAccount } from './account-controller.js';
try {
  const { service, ready } = await import('./auth-service.js');
  await ready;
  mountAccount(document, service);
} catch {
  document.getElementById('status').textContent = 'Sign-in could not load. Check your connection and browser storage settings, then reload this page.';
}
