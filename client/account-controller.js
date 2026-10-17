export function errorMessage(error) {
  if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') return 'Sign-in cancelled. You can try again.';
  if (error?.code === 'auth/popup-blocked') return 'Allow popups for this site, then try again.';
  if (error?.code === 'auth/unauthorized-domain') return 'Sign-in is not configured for this domain. Please contact the society team.';
  if (error?.code === 'auth/too-many-requests') return 'Too many attempts. Please wait before trying again.';
  if (error?.code === 'auth/network-request-failed') return 'Check your internet connection and try again.';
  if (error?.code === 'auth/weak-password' || error?.code === 'auth/password-does-not-meet-requirements') return 'Use a password of at least 15 characters, with upper and lower case letters and numbers.';
  if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password') return 'Incorrect email or password. Double-check your details or reset your password.';
  if (error?.code === 'auth/user-not-found') return 'No account found with this email. Create an account first.';
  if (error?.code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (error?.code === 'auth/email-already-in-use') return 'An account with this email already exists. Sign in instead.';
  if (error?.code === 'auth/operation-not-allowed') return 'Email/password sign-in is not enabled for this project. Contact the society team.';
  if (error?.code === 'auth/missing-password') return 'Please enter your password.';
  if (error?.code === 'auth/invalid-login-credentials') return 'Incorrect email or password. Double-check your details or reset your password.';
  // Show the actual Firebase error code so the admin/user can report it.
  if (error?.code) return `Error: ${error.code}. Check your details or try password reset.`;
  return 'Unable to complete the request. Check your details or try password reset.';
}
export function mountAccount(doc, service) {
  const el = id => doc.getElementById(id);
  let mode = 'login', busy = false;
  function render(user) {
    el('guest').hidden = !!user;
    el('member').hidden = !user;
    el('password').value = '';
    if (user) {
      el('identity').textContent = user.email || 'Google account';
      el('verified').textContent = user.emailVerified ? 'Email verified.' : 'Please verify your email.';
      el('verify').hidden = el('refresh').hidden = user.emailVerified;
    }
  }
  function setMode(next) {
    mode = next;
    el('title').textContent = { login: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' }[mode];
    el('submit').textContent = { login: 'Sign in', signup: 'Create account', reset: 'Send reset email' }[mode];
    el('toggle').textContent = mode === 'login' ? 'Create an account' : 'Back to sign in';
    el('password-row').hidden = mode === 'reset';
    el('password').required = mode !== 'reset';
    el('password').minLength = mode === 'signup' ? 15 : 0;
    el('password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    el('policy').hidden = mode !== 'signup';
    el('password').value = '';
    el('status').textContent = '';
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    doc.querySelectorAll('button').forEach(b => b.disabled = true);
    el('status').textContent = 'Please wait…';
    try { const message = await action(); el('status').textContent = message || ''; }
    catch (error) { el('status').textContent = errorMessage(error); }
    finally { busy = false; el('password').value = ''; doc.querySelectorAll('button').forEach(b => b.disabled = false); }
  }
  el('toggle').onclick = () => setMode(mode === 'login' ? 'signup' : 'login');
  el('reset').onclick = () => setMode('reset');
  el('form').onsubmit = event => {
    event.preventDefault();
    if (!el('form').reportValidity()) return;
    const email = el('email').value.trim(), password = el('password').value;
    return run(async () => {
      if (mode === 'reset') { await service.reset(email); return 'If this email can receive a password reset, a link will arrive shortly. Check your spam folder too.'; }
      if (mode === 'signup') { const sent = await service.signup(email, password); return sent ? 'Account created. Check your inbox to verify your email.' : 'Account created, but the verification email could not be sent. Use Send verification email to retry.'; }
      await service.login(email, password); return 'Signed in.';
    });
  };
  el('google').onclick = () => run(async () => { await service.google(); return 'Signed in.'; });
  el('verify').onclick = () => run(async () => { await service.verify(); return 'Verification email sent. Check your inbox and spam folder.'; });
  el('refresh').onclick = () => run(async () => { const user = await service.refresh(); render(user); return user.emailVerified ? 'Email verified.' : 'Email is not verified yet. Open the link in your email first.'; });
  el('logout').onclick = () => run(async () => { await service.logout(); return 'Signed out.'; });
  el('status').textContent = '';
  return service.observe(render);
}
