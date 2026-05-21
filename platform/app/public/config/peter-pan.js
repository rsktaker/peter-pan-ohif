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

// Tenant-prefixed DICOMweb root. The iframe URL includes ?tenant=<slug>
// when the host page can supply it; that lets us hit /<tenant>/api/dicomweb
// directly and skip the /api/[...path] catchall, whose tenant inference
// can't see past the /pro-viewer Referer prefix and 401s on iframe fetches.
// Falls back to /api/dicomweb when no tenant param is present so portal and
// any other caller without tenant context keeps working via the catchall.
const dicomwebRoot = (function () {
  try {
    var tenant = new URLSearchParams(window.location.search).get('tenant');
    if (tenant && /^[a-z0-9][a-z0-9-]{0,31}$/.test(tenant)) {
      return '/' + tenant + '/api/dicomweb';
    }
  } catch (_) {
    /* fall through */
  }
  return '/api/dicomweb';
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
  // 3 was a holdover from OHIF's "safe on old Windows boxes" default.
  // Radiologists run modern hardware; 8 keeps the decode pool wider than
  // the 6-connection HTTP/2 fetch fan-out so workers never idle on data.
  maxNumberOfWebWorkers: 8,
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: false,
  showLoadingIndicator: true,
  // Off: too aggressive for real-world CT/MR. A study with one missing
  // slice (modality glitch, network dropout during transfer) is otherwise
  // perfectly reconstructable but with this flag on, MPR and Volume3D
  // refuse to mount and the user sees "no 3D available" with no clue why.
  // Cornerstone3D still computes geometry from the available slices;
  // the displayed volume is approximate over the gap but clinically
  // usable for orientation. If a series turns out to be truly chaotic
  // (non-uniform spacing throughout, not a one-slice gap), MPR shows
  // visible warping and the user falls back to stack scroll.
  strictZSpacingForVolumeViewport: false,
  // imageLoadPoolManager budgets. Without these, OHIF falls back to
  // {prefetch:5, thumbnail:5} which leaves the wire idle once the visible
  // viewport's first batch lands. Bumping prefetch to 25 keeps the
  // background queue saturated so frames are decoded before the user
  // scrolls to them.
  maxNumRequests: {
    interaction: 100,
    thumbnail: 75,
    prefetch: 25,
    compute: 10,
  },
  // Built-in study prefetcher. Once a viewport mounts, queue frames for
  // up to 2 neighboring displaySets in proximity order. With JPEG-LS
  // transcoding (188KB/frame, validated on prod) a 117-instance CT
  // series stages in the background instead of stalling on scroll.
  studyPrefetcher: {
    enabled: true,
    displaySetsCount: 2,
    maxNumPrefetchRequests: 10,
    order: 'closest',
  },
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
        wadoUriRoot: dicomwebRoot,
        qidoRoot: dicomwebRoot,
        wadoRoot: dicomwebRoot,
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        // Off: with the studyPrefetcher enabled, we want the full instance
        // list and metadata up-front so background fetches can start
        // immediately instead of waiting for the user to expand a series.
        // True kept frames on-demand and surfaced as "lazy-loads on scroll".
        enableStudyLazyLoad: false,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        singlepart: 'bulkdata,video,pdf',
        omitQuotationForMultipartRequest: true,
        // Request JPEG-LS Lossless. Orthanc's GDCM plugin transcodes on
        // the fly; validated 525KB raw → 188KB JPEG-LS (~64% smaller,
        // 35% faster per frame) at the proxy. Lossless so safe for
        // diagnostic reads. Orthanc rejects JPEG baseline (lossy) with
        // 500 — intentional clinical-safety guard. HTJ2K isn't built
        // into this Orthanc version (returns 400) — revisit if/when
        // upgrading the gateway image.
        requestTransferSyntaxUID: '1.2.840.10008.1.2.4.80',
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
