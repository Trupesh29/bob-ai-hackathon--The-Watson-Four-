import '@testing-library/jest-dom'
import { vi } from 'vitest'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function() {
    this.removeAttribute('open')
  }
})
