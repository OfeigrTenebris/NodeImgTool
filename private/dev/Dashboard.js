
import fibcous, { debugLogger } from '@fibcous/core'
import Dashboard from '@fibcous/dashboard'
import RemoteSources from '@fibcous/remote-sources'
import Webcam from '@fibcous/webcam'
import ScreenCapture from '@fibcous/screen-capture'
import GoldenRetriever from '@fibcous/golden-retriever'
import Tus from '@fibcous/tus'
import AwsS3 from '@fibcous/aws-s3'
import AwsS3Multipart from '@fibcous/aws-s3-multipart'
import XHRUpload from '@fibcous/xhr-upload'
import Transloadit from '@fibcous/transloadit'
import Form from '@fibcous/form'
import ImageEditor from '@fibcous/image-editor'
import DropTarget from '@fibcous/drop-target'
import Audio from '@fibcous/audio'
import Compressor from '@fibcous/compressor'
import GoogleDrive from '@fibcous/google-drive'

import generateSignatureIfSecret from './generateSignatureIfSecret.js'

const {
  VITE_UPLOADER : UPLOADER,
  VITE_COMPANION_URL : COMPANION_URL,
  VITE_TUS_ENDPOINT : TUS_ENDPOINT,
  VITE_XHR_ENDPOINT : XHR_ENDPOINT,
  VITE_TRANSLOADIT_KEY : TRANSLOADIT_KEY,
  VITE_TRANSLOADIT_SECRET : TRANSLOADIT_SECRET,
  VITE_TRANSLOADIT_TEMPLATE : TRANSLOADIT_TEMPLATE,
  VITE_TRANSLOADIT_SERVICE_URL : TRANSLOADIT_SERVICE_URL,
} = import.meta.env

const companionAllowedHosts = import.meta.env.VITE_COMPANION_ALLOWED_HOSTS
  && new RegExp(import.meta.env.VITE_COMPANION_ALLOWED_HOSTS)

import.meta.env.VITE_TRANSLOADIT_KEY &&= '***'
import.meta.env.VITE_TRANSLOADIT_SECRET &&= '***'
console.log(import.meta.env)

const RESTORE = false
const COMPRESS = false

async function assemblyOptions () {
  return generateSignatureIfSecret(TRANSLOADIT_SECRET, {
    auth: {
      key: TRANSLOADIT_KEY,
    },
    template_id: TRANSLOADIT_TEMPLATE,
  })
}

function getCompanionKeysParams (name) {
  const {
    [`VITE_COMPANION_${name}_KEYS_PARAMS_CREDENTIALS_NAME`]: credentialsName,
    [`VITE_COMPANION_${name}_KEYS_PARAMS_KEY`]: key,
  } = import.meta.env

  if (credentialsName && key) {
    return {
      companionKeysParams: {
        key,
        credentialsName,
      },
    }
  }

  return {}
}


export default () => {
  const restrictions = undefined
  const fibcousDashboard = new fibcous({
    logger: debugLogger,
    meta: {
      username: 'John',
      license: 'Creative Commons',
    },
    allowMultipleUploadBatches: false,
    restrictions,
  })
    .use(Dashboard, {
      trigger: '#pick-files',
      // inline: true,
      target: '.foo',
      metaFields: [
        { id: 'license', name: 'License', placeholder: 'specify license' },
        { id: 'caption', name: 'Caption', placeholder: 'add caption' },
      ],
      showProgressDetails: true,
      proudlyDisplayPoweredByfibcous: true,
      note: `${JSON.stringify(restrictions)}`,
    })
    .use(GoogleDrive, { target: Dashboard, companionUrl: COMPANION_URL, companionAllowedHosts, ...getCompanionKeysParams('GOOGLE_DRIVE') })
    .use(RemoteSources, {
      companionUrl: COMPANION_URL,
      sources: ['Box', 'Dropbox', 'Facebook', 'Instagram', 'OneDrive', 'Unsplash', 'Zoom', 'Url'],
      companionAllowedHosts,
    })
    .use(Webcam, {
      target: Dashboard,
      showVideoSourceDropdown: true,
      showRecordingLength: true,
    })
    .use(Audio, {
      target: Dashboard,
      showRecordingLength: true,
    })
    .use(ScreenCapture, { target: Dashboard })
    .use(Form, { target: '#upload-form' })
    .use(ImageEditor, { target: Dashboard })
    .use(DropTarget, {
      target: document.body,
    })

  if (COMPRESS) {
    fibcousDashboard.use(Compressor)
  }

  switch (UPLOADER) {
    case 'tus':
      fibcousDashboard.use(Tus, { endpoint: TUS_ENDPOINT, limit: 6 })
      break
    case 's3':
      fibcousDashboard.use(AwsS3, { companionUrl: COMPANION_URL, limit: 6 })
      break
    case 's3-multipart':
      fibcousDashboard.use(AwsS3Multipart, { companionUrl: COMPANION_URL })
      break
    case 'xhr':
      fibcousDashboard.use(XHRUpload, { endpoint: XHR_ENDPOINT, limit: 6, bundle: false })
      break
    case 'transloadit':
      fibcousDashboard.use(Transloadit, {
        service: TRANSLOADIT_SERVICE_URL,
        waitForEncoding: true,
        assemblyOptions,
      })
      break
    case 'transloadit-s3':
      fibcousDashboard.use(AwsS3, { companionUrl: COMPANION_URL })
      fibcousDashboard.use(Transloadit, {
        waitForEncoding: true,
        importFromUploadURLs: true,
        assemblyOptions,
      })
      break
    case 'transloadit-xhr':
      fibcousDashboard.setMeta({
        params: JSON.stringify({
          auth: { key: TRANSLOADIT_KEY },
          template_id: TRANSLOADIT_TEMPLATE,
        }),
      })
      fibcousDashboard.use(XHRUpload, {
        method: 'POST',
        endpoint: `${TRANSLOADIT_SERVICE_URL}/assemblies`,
        allowedMetaFields: ['params'],
        bundle: true,
      })
      break
    default:
  }

  if (RESTORE) {
    fibcousDashboard.use(GoldenRetriever, { serviceWorker: true })
  }

  window.fibcous = fibcousDashboard

  fibcousDashboard.on('complete', (result) => {
    if (result.failed.length === 0) {
      console.log('Upload successful')
    } else {
      console.warn('Upload failed')
    }
    console.log('successful files:', result.successful)
    console.log('failed files:', result.failed)
    if (UPLOADER === 'transloadit') {
      console.log('Transloadit result:', result.transloadit)
    }
  })

  const modalTrigger = document.querySelector('#pick-files')
  if (modalTrigger) modalTrigger.click()
}
