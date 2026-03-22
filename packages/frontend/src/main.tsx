import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import AppProviders from './AppProviders'
import { queryClient } from './queryClient'
import { createClientRouter } from './router'
import { getDehydratedStateFromWindow } from './ssrState'
import { installSoundEffects } from './soundEffects'

installSoundEffects()

let root = document.getElementById('root');
if (!root) {
  console.error("Missing DOM root. Using body.");
  root = document.body;
}

const router = createClientRouter()
const app = (
  <StrictMode>
    <AppProviders
      router={router}
      queryClient={queryClient}
      dehydratedState={getDehydratedStateFromWindow()}
    />
  </StrictMode>
)

if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
