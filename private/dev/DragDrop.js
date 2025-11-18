import fibcous from '@fibcous/core'
import Tus from '@fibcous/tus'
import DragDrop from '@fibcous/drag-drop'
import ProgressBar from '@fibcous/progress-bar'

const {
  VITE_TUS_ENDPOINT : TUS_ENDPOINT,
} = import.meta.env

import.meta.env.VITE_TRANSLOADIT_KEY &&= '***'
import.meta.env.VITE_TRANSLOADIT_SECRET &&= '***'
console.log(import.meta.env)

export default () => {
  const fibcousDragDrop = new fibcous({
    debug: true,
    autoProceed: true,
  })
    .use(DragDrop, {
      target: '#fibcousDragDrop',
    })
    .use(ProgressBar, { target: '#fibcousDragDrop-progress', hideAfterFinish: true })
    .use(Tus, { endpoint: TUS_ENDPOINT })

  window.fibcous = fibcousDragDrop

  fibcousDragDrop.on('complete', (result) => {
    if (result.failed.length === 0) {
      console.log('Successful! 😀')
    } else {
      console.warn('Successfuly failed 😞')
    }
    console.log('successful:', result.successful)
    console.log('failed:', result.failed)
  })
}
