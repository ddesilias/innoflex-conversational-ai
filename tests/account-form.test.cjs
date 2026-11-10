const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function render(mode) {
  const api = {}, login = () => {}, signup = () => {}
  let selected
  const mocks = {
    react: { ...React, useEffect() {}, useActionState: action => { selected = action; return [undefined, undefined] } },
    'react-dom': { useFormStatus: () => ({ pending: false }) },
    '@/app/login/actions': { authenticate: login },
    '@/app/signup/actions': { signup },
    'next/link': { __esModule: true, default: props => React.createElement('a', props, props.children) },
    'next/navigation': { useRouter: () => ({}) },
    sonner: { toast: {} }, './ui/icons': { IconSpinner: () => null },
    '@/lib/utils': { getMessageFromCode: () => '' },
    './account-form.module.css': { __esModule: true, default: {} }
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/account-form.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, { exports: api, require: name => name in mocks ? mocks[name] : require(name) })
  const html = renderToStaticMarkup(React.createElement(api.default, { mode, returnTo: '/messages' }))
  return { html, selected, login, signup }
}
test('shared signup form keeps registration policy, action and return destination', () => {
  const { html, selected, signup } = render('signup')
  assert.equal(selected, signup)
  assert.match(html, /autoComplete="new-password"/)
  assert.match(html, /minLength="12"/)
  assert.ok(html.includes('href="/login?next=/messages"'))
  assert.ok(html.includes('Créer mon espace'))
  assert.ok(!html.includes('Mot de passe oublié ?'))
})
test('shared login form preserves existing-account policy and recovery path', () => {
  const { html, selected, login } = render('login')
  assert.equal(selected, login)
  assert.match(html, /autoComplete="current-password"/)
  assert.match(html, /minLength="6"/)
  assert.ok(html.includes('href="/signup?next=/messages"'))
  assert.ok(html.includes('href="/forgot-password"'))
})
