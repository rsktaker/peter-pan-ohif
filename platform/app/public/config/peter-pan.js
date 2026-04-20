// peter-pan patient mode. When OHIF is loaded via the iframe with
// ?patientMode=1 (the patient portal hits this), we strip the clinical
// chrome — toolbars, measurement/segmentation panels, 3D/MPR buttons —
// leaving a plain viewport with scroll/pan/zoom. We do this by injecting
// a stylesheet at page load rather than forking app-config, so both
// staff and patient views share one OHIF deployment.
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
  extensions: [],
  modes: [],
  // OHIF's study list is not exposed — the peter-pan app handles worklist/nav.
  showStudyList: false,
  // Force CPU rendering to avoid Cornerstone3D's WebGLContextPool which
  // instantiates a vtkOffscreenMultiRenderWindow eagerly and crashes on
  // `new Proxy(null, ...)` when WebGL2 context allocation fails (seen in
  // production iframe contexts: "CornerstoneRender: GPU not detected, using
  // CPU rendering" still fires while VTK tries WebGL2 anyway).
  useCPURendering: true,
  maxNumberOfWebWorkers: 3,
  showWarningMessageForCrossOrigin: false,
  // Suppress the "OHIF Fell Back to CPU Rendering" modal — we force CPU mode
  // deliberately via useCPURendering, so the warning is noise.
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
