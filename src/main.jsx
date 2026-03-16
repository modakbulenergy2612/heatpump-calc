import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// window.storage polyfill (localStorage 기반)
// 원본 코드가 window.storage.get/set 을 사용하므로 웹 환경용 폴백 제공
if (!window.storage) {
  window.storage = {
    get: (key) => {
      const value = localStorage.getItem(key)
      return Promise.resolve(value ? { value } : null)
    },
    set: (key, val) => {
      localStorage.setItem(key, val)
      return Promise.resolve()
    },
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
