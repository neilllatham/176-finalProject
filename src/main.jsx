import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// #region agent log
const __rootEl = document.getElementById('root')
fetch('http://127.0.0.1:7428/ingest/4dc69b6e-6484-486d-bf3f-6ac3ac44fd9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28975b'},body:JSON.stringify({sessionId:'28975b',location:'main.jsx:pre-render',message:'boot',data:{hasRoot:!!__rootEl},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
window.addEventListener('error', (e) => {
  fetch('http://127.0.0.1:7428/ingest/4dc69b6e-6484-486d-bf3f-6ac3ac44fd9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28975b'},body:JSON.stringify({sessionId:'28975b',location:'main.jsx:window.error',message:String(e.message),data:{filename:e.filename,lineno:e.lineno},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
});
window.addEventListener('unhandledrejection', (e) => {
  fetch('http://127.0.0.1:7428/ingest/4dc69b6e-6484-486d-bf3f-6ac3ac44fd9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28975b'},body:JSON.stringify({sessionId:'28975b',location:'main.jsx:unhandledrejection',message:String(e.reason),timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
});
// #endregion

createRoot(__rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// #region agent log
fetch('http://127.0.0.1:7428/ingest/4dc69b6e-6484-486d-bf3f-6ac3ac44fd9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'28975b'},body:JSON.stringify({sessionId:'28975b',location:'main.jsx:post-render',message:'createRoot.render invoked',timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
// #endregion
