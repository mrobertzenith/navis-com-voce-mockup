import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sem isso, cada teste de componente deixa o DOM do teste anterior montado —
// consultas por texto/role passam a encontrar elementos duplicados entre testes.
afterEach(() => {
  cleanup()
})

// jsdom não implementa essas APIs, usadas pelo Radix UI (Select, Dialog) para
// posicionar popovers e capturar ponteiro — sem isso, testes de componente que
// abrem um <Select> ou um Dialog quebram com erros que nada têm a ver com o
// comportamento sendo testado.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
