/* Login and registration screen. */
if (Auth.token) location.href = '/app.html';

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const nameField = document.getElementById('nameField');
const formTitle = document.getElementById('formTitle');
const formLead = document.getElementById('formLead');
const submitBtn = document.getElementById('submitBtn');
const notice = document.getElementById('notice');
const form = document.getElementById('authForm');
const passwordInput = document.getElementById('password');
const authSwitch = document.getElementById('authSwitch');
const registerLink = document.getElementById('registerLink');

let mode = 'login';

function setMode(next) {
  mode = next;
  const isLogin = mode === 'login';

  tabLogin.setAttribute('aria-selected', String(isLogin));
  tabRegister.setAttribute('aria-selected', String(!isLogin));
  nameField.hidden = isLogin;
  formTitle.textContent = isLogin ? 'Welcome back' : 'Create your account';
  formLead.textContent = isLogin
    ? 'Enter your details to open your task board.'
    : 'Set up an account and start adding tasks straight away.';
  submitBtn.textContent = isLogin ? 'Sign in' : 'Create account';
  passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
  authSwitch.firstChild.textContent = isLogin ? "Don't have an account? " : 'Already have an account? ';
  registerLink.textContent = isLogin ? 'Sign up' : 'Sign in';
  notice.className = 'notice';
}

function showError(message) {
  notice.textContent = message;
  notice.className = 'notice error';
}

tabLogin.addEventListener('click', () => setMode('login'));
tabRegister.addEventListener('click', () => setMode('register'));
registerLink.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  notice.className = 'notice';
  submitBtn.disabled = true;

  const payload = {
    email: document.getElementById('email').value,
    password: passwordInput.value
  };
  if (mode === 'register') payload.name = document.getElementById('name').value;

  try {
    const data = await api(`/auth/${mode}`, { method: 'POST', body: payload });
    Auth.save(data.token, data.user);
    location.href = '/app.html';
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
  }
});
