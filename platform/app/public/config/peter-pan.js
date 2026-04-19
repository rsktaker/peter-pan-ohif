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
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
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
