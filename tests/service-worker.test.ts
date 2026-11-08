import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('service worker não intercepta dados privados ou navegação', () => {
  const handlers: Record<string, (event: unknown) => void> = {}
  const self = {
    location: { origin: 'https://app.example' },
    addEventListener(name: string, handler: (event: unknown) => void) { handlers[name] = handler },
  }
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, URL })
  for (const [url, method, authenticated] of [
    ['https://project.supabase.co/rest/v1/teacher_journeys', 'GET', true],
    ['https://project.supabase.co/auth/v1/token', 'POST', false],
    ['https://app.example/api/teacher', 'GET', true],
    ['https://app.example/professor', 'GET', false],
    ['https://app.example/_next/static/chunk.js', 'GET', true],
  ] as const) {
    let intercepted = false
    handlers.fetch({
      request: { url, method, headers: { has: () => authenticated } },
      respondWith() { intercepted = true },
    })
    assert.equal(intercepted, false, url)
  }
  let version = ''
  handlers.message({ data: 'teacher-cache-check', ports: [{ postMessage: (value: string) => { version = value } }] })
  assert.equal(version, 'teacher-cache-safe-v1')
})
