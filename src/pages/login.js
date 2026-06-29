import { supabase } from '../supabase.js'
import { t } from '../utils/i18n.js'

const EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`
const EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M6.6 6.6A18.5 18.5 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 4.4-1.1"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`

export function renderLogin(onSuccess) {
  document.querySelector('#app').innerHTML = `
    <div class="auth-screen" id="authScreen">
      <div class="auth-stars" id="authStars"></div>
      <div class="auth-topname">HCSP-OM</div>

      <div class="auth-card" id="authCard" data-mode="choose">
        <p class="auth-eyebrow">${t('login.eyebrow')}</p>

        <div class="auth-choices" id="authChoices">
          <h2>${t('login.getStarted')}</h2>
          <p>${t('login.getStartedSub')}</p>
          <button class="auth-btn auth-btn-primary" id="openLoginBtn">${t('login.login')}</button>
        </div>

        <div class="auth-panel" id="authPanel">
          <div class="auth-panel-inner">
            <button class="auth-back" id="authBack" type="button"><span>&larr;</span> ${t('common.back')}</button>
            <h2 class="auth-form-title">${t('login.welcome')}</h2>
            <p class="auth-form-sub">${t('login.welcomeSub')}</p>

            <form id="authForm" class="auth-form" novalidate>
              <label class="auth-field">
                <span>${t('login.email')}</span>
                <input id="email" type="email" autocomplete="email" placeholder="you@company.com" required/>
              </label>

              <div class="auth-field">
                <div class="auth-field-row">
                  <span>${t('login.password')}</span>
                  <button type="button" class="auth-forgot" id="forgotBtn">${t('login.forgot')}</button>
                </div>
                <div class="auth-input-wrap">
                  <input id="password" type="password" autocomplete="current-password" required/>
                  <button type="button" class="auth-eye" id="eyeBtn" aria-label="Show password">${EYE}</button>
                </div>
              </div>

              <p id="authMsg" class="auth-msg"></p>

              <button type="submit" id="authSubmit" class="auth-btn auth-btn-primary auth-submit">${t('login.login')}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `

  buildStars()

  const screen = document.querySelector('#authScreen')
  const card = document.querySelector('#authCard')
  const panel = document.querySelector('#authPanel')
  const openBtn = document.querySelector('#openLoginBtn')
  const back = document.querySelector('#authBack')
  const form = document.querySelector('#authForm')
  const submitBtn = document.querySelector('#authSubmit')
  const msg = document.querySelector('#authMsg')
  const emailInput = document.querySelector('#email')
  const passwordInput = document.querySelector('#password')
  const eyeBtn = document.querySelector('#eyeBtn')
  const forgotBtn = document.querySelector('#forgotBtn')

  function clearMsg() { msg.textContent = ''; msg.className = 'auth-msg' }
  function showMsg(text, type = 'error') {
    msg.textContent = text
    msg.className = 'auth-msg auth-msg-' + type
    if (card.getAttribute('data-mode') === 'form') panel.style.maxHeight = panel.scrollHeight + 'px'
  }

  openBtn.addEventListener('click', () => {
    clearMsg()
    card.setAttribute('data-mode', 'form')
    panel.style.maxHeight = panel.scrollHeight + 'px'
    setTimeout(() => emailInput.focus(), 320)
  })

  back.addEventListener('click', () => {
    card.setAttribute('data-mode', 'choose')
    panel.style.maxHeight = '0px'
    clearMsg()
    form.reset()
  })

  eyeBtn.addEventListener('click', () => {
    const show = passwordInput.type === 'password'
    passwordInput.type = show ? 'text' : 'password'
    eyeBtn.innerHTML = show ? EYE_OFF : EYE
    eyeBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password')
    passwordInput.focus()
  })

  forgotBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    if (!email) { showMsg(t('login.resetNeedEmail')); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) showMsg(error.message)
    else showMsg(t('login.resetSent'), 'success')
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = emailInput.value.trim()
    const password = passwordInput.value
    if (!email || !password) { showMsg(t('login.errCreds')); return }

    clearMsg()
    submitBtn.disabled = true
    submitBtn.innerHTML = `<span class="spinner"></span> ${t('login.loggingIn')}`

    const overlay = showLoadingOverlay()

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Success → blur-fade the login screen out, then hand off to the app shell
      screen.classList.add('leaving')
      setTimeout(async () => {
        if (typeof onSuccess === 'function') await onSuccess()
        overlay.remove()
      }, 480)
    } catch (err) {
      overlay.remove()
      showMsg(err.message || t('login.errFailed'))
      submitBtn.disabled = false
      submitBtn.textContent = t('login.login')
    }
  })
}

function showLoadingOverlay() {
  const el = document.createElement('div')
  el.className = 'auth-loading'
  el.innerHTML = `<div class="spinner spinner-lg"></div><p>${t('login.authenticating')}</p>`
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  return el
}

function buildStars() {
  const wrap = document.querySelector('#authStars')
  if (!wrap) return
  const rand = (a, b) => a + Math.random() * (b - a)

  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div')
    s.className = 'star'
    const size = rand(1, 2.4)
    s.style.width = s.style.height = size + 'px'
    s.style.left = rand(0, 100) + '%'
    s.style.top = rand(0, 100) + '%'
    s.style.setProperty('--tw', rand(2, 5).toFixed(2) + 's')
    s.style.animationDelay = rand(0, 4).toFixed(2) + 's'
    wrap.appendChild(s)
  }

  for (let i = 0; i < 7; i++) {
    const s = document.createElement('div')
    s.className = 'shooting'
    s.style.left = rand(-5, 70) + '%'
    s.style.top = rand(-5, 55) + '%'
    s.style.setProperty('--dur', rand(2.6, 5).toFixed(2) + 's')
    s.style.setProperty('--delay', rand(0, 8).toFixed(2) + 's')
    wrap.appendChild(s)
  }
}
