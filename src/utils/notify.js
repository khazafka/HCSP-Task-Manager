// Themed notifications: square corners, slide in from bottom-right,
// a draining bar at the bottom, and older toasts pushed upward as new ones arrive.

function ensureStack() {
  let stack = document.querySelector('#notif-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'notif-stack';
    stack.className = 'notif-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

const TITLES = { success: 'Success', error: 'Something went wrong', warning: 'Heads up', info: 'Notification' };

export function notify(message, type = 'success', opts = {}) {
  const stack = ensureStack();
  const life = opts.life ?? 4500;
  const title = opts.title ?? TITLES[type] ?? 'Notification';

  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.style.setProperty('--life', life + 'ms');
  el.innerHTML = `
    <div class="notif-head">
      <span class="notif-title">${title}</span>
      <button class="notif-close" aria-label="Dismiss">&times;</button>
    </div>
    <div class="notif-body">${message}</div>
    <div class="notif-bar"><i></i></div>
  `;

  // Newest appears at the bottom; the stack is bottom-anchored so it grows upward.
  stack.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 420);
  };

  el.querySelector('.notif-close').addEventListener('click', dismiss);
  el.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    const bar = el.querySelector('.notif-bar i');
    if (bar) bar.style.animationPlayState = 'paused';
  });
  el.addEventListener('mouseleave', () => {
    const bar = el.querySelector('.notif-bar i');
    if (bar) bar.style.animationPlayState = 'running';
    timer = setTimeout(dismiss, 1500);
  });

  timer = setTimeout(dismiss, life);
  return el;
}
