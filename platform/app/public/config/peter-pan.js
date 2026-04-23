// peter-pan OHIF config — shared by staff (Pro) and patient portal.
//
// patientMode (set via ?patientMode=1 on the iframe URL) strips the clinical
// chrome and suppresses every modal dialog so the patient sees only pixels.
// Staff mode keeps the full viewer, minus the measurement "Track new study?"
// prompt, which fires on every study load and is the popup radiologists
// complained about.
(function applyPatientMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('patientMode') !== '1') return;
    const style = document.createElement('style');
    style.setAttribute('data-peter-pan', 'patient-mode');
    style.textContent = [
      // Hide the clinical toolbar (top bar with tools / presets / etc.).
      'header[data-cy="navigation"], div[data-cy="navigation-bar"] { display:none !important; }',
      // Hide left study browser (they only have one study here anyway).
      'div[data-cy="study-browser-sidebar"], div[data-cy="sidepanel-left"], aside[data-cy*="left"] { display:none !important; }',
      // Hide right panel (measurements / segmentation lists).
      'div[data-cy="sidepanel-right"], aside[data-cy*="right"] { display:none !important; }',
      // Collapse any leftover resize handles.
      'div[class*="ResizePanel"] { display:none !important; }',
      // Viewport takes full width.
      'div[data-cy="viewer-grid"], div[data-cy="viewport-container"] { left:0 !important; right:0 !important; width:100% !important; }',
      // Kill every OHIF modal/dialog in patient mode. Patients should never
      // see "Track measurements?" / "Discard?" / hydration prompts / labelling
      // dialogs — they're not measuring anything.
      '.ViewportDialog, [data-cy="viewport-notification"], [role="dialog"], [role="alertdialog"], .modal, .ReactModal__Overlay, .ReactModalPortal { display:none !important; }',
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  } catch (_) {
    /* never break OHIF boot just because CSS injection failed */
  }
})();

/** @type {AppTypes.Config} */
window.config = {
  // Match the rewrite prefix on the peter-pan app so OHIF's SPA routes resolve
  // correctly when loaded via /pro-viewer/* in an iframe.
  routerBasename: '/pro-viewer',
  // Extensions parsed by the viewer. Order doesn't matter but the list must
  // cover every modality we ship: SEG (DICOM segmentation), RT (structure
  // sets), PMAP (parametric maps), SR (structured reports), PDF/video, plus
  // cornerstone + default for base rendering.
  extensions: [
    '@ohif/extension-default',
    '@ohif/extension-cornerstone',
    '@ohif/extension-measurement-tracking',
    '@ohif/extension-cornerstone-dicom-sr',
    '@ohif/extension-cornerstone-dicom-seg',
    '@ohif/extension-cornerstone-dicom-rt',
    '@ohif/extension-cornerstone-dicom-pmap',
    '@ohif/extension-cornerstone-dynamic-volume',
    '@ohif/extension-tmtv',
    '@ohif/extension-dicom-pdf',
    '@ohif/extension-dicom-video',
  ],
  // Modes: longitudinal = default viewer (handles CT/MR/CR/DX/MG/US with the
  // full toolbar); segmentation = SEG/RTSTRUCT overlay mode, auto-activates
  // when the study contains SEG or RTSTRUCT series; tmtv = PET/CT fusion.
  modes: [
    '@ohif/mode-longitudinal',
    '@ohif/mode-segmentation',
    '@ohif/mode-tmtv',
  ],
  // Don't fire the "Track measurements for this study?" dialog on every study
  // open — that's the popup the radiologists keep dismissing. Measurements
  // still work; they just save silently without the prompt.
  measurementTrackingMode: 'none',
  // OHIF's study list is not exposed — the peter-pan app handles worklist/nav.
  showStudyList: false,
  // GPU rendering required for MPR, volume/3D, and PET/CT fusion. If we see
  // the old `new Proxy(null, ...)` crash from WebGLContextPool come back
  // (was flagged in prior iframe contexts), fall back to CPU on that one
  // study by appending &cpu=1 to the URL and forking this flag on it.
  useCPURendering: false,
  maxNumberOfWebWorkers: 3,
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: false,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  defaultDataSourceName: 'dicomweb',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'peter-pan DICOMweb',
        name: 'peter-pan',
        // Relative URL — at runtime, the iframe's origin is the peter-pan app
        // (via /pro-viewer/* rewrite), so /api/dicomweb hits our DICOMweb proxy
        // with the user's session cookie attached.
        wadoUriRoot: '/api/dicomweb',
        qidoRoot: '/api/dicomweb',
        wadoRoot: '/api/dicomweb',
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        singlepart: 'bulkdata,video,pdf',
        omitQuotationForMultipartRequest: true,
        // Enable bulkDataURI so SEG/RTSTRUCT can pull their binary blobs
        // (segmentation pixel data, structure set contour data) via the same
        // DICOMweb proxy. Without this, SEG/RTSTRUCT load as metadata-only
        // and the overlays never render.
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
        },
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: { friendlyName: 'dicom json', name: 'json' },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: { friendlyName: 'dicom local' },
    },
  ],
};
