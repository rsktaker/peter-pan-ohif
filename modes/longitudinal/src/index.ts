import i18n from 'i18next';
import { ToolbarService } from '@ohif/core';
import { id } from './id';
import { initToolGroups, toolbarButtons as basicToolbarButtons, cornerstone,
  ohif,
  dicomsr,
  dicomvideo,
  basicLayout,
  basicRoute,
  extensionDependencies as basicDependencies,
  mode as basicMode,
  modeInstance as basicModeInstance,
  toolbarSections as basicToolbarSections,
 } from '@ohif/mode-basic';

const { TOOLBAR_SECTIONS } = ToolbarService;

export const tracked = {
  measurements: '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements',
  thumbnailList: '@ohif/extension-measurement-tracking.panelModule.seriesList',
  viewport: '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
};

export const extensionDependencies = {
  // Can derive the versions at least process.env.from npm_package_version
  ...basicDependencies,
  '@ohif/extension-measurement-tracking': '^3.0.0',
};

// One-click switches to the 'mpr' and 'primary3D' hanging protocols
// (registered by @ohif/extension-cornerstone, both with isPreset:true).
// Crosshairs and TrackballRotate already sit in the primary toolbar but
// only light up once the viewport is already in MPR / 3D mode — these
// buttons make the mode switch discoverable instead of buried inside
// Layout > Advanced Presets, which is the path the basic mode ships.
const peterPanToolbarButtons = [
  ...basicToolbarButtons,
  {
    id: 'MprPreset',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'layout-advanced-mpr',
      label: 'MPR',
      tooltip: 'Switch to MPR (3-plane reformat). Requires a reconstructable volume — disabled for single-slice modalities (CR/DX/MG).',
      commands: { commandName: 'setHangingProtocol', commandOptions: { protocolId: 'mpr' } },
      evaluate: 'evaluate.action',
    },
  },
  {
    id: 'Volume3DPreset',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'layout-advanced-3d-primary',
      label: '3D',
      tooltip: 'Switch to 3D Volume Rendering. Requires a reconstructable volume — disabled for single-slice modalities (CR/DX/MG).',
      commands: { commandName: 'setHangingProtocol', commandOptions: { protocolId: 'primary3D' } },
      evaluate: 'evaluate.action',
    },
  },
];

// Insert MPR + 3D next to Layout so the related Crosshairs and
// TrackballRotate buttons sit alongside in the same visual cluster.
const peterPanToolbarSections = {
  ...basicToolbarSections,
  [TOOLBAR_SECTIONS.primary]: [
    'MeasurementTools',
    'Zoom',
    'Pan',
    'WindowLevel',
    'Capture',
    'Layout',
    'MprPreset',
    'Volume3DPreset',
    'TrackballRotate',
    'Crosshairs',
    'MoreTools',
  ],
};

export const longitudinalInstance = {
  ...basicLayout,
  id: ohif.layout,
  props: {
    ...basicLayout.props,
    leftPanels: [tracked.thumbnailList],
    rightPanels: [cornerstone.segmentation, tracked.measurements],
    viewports: [
      {
        namespace: tracked.viewport,
        // Re-use the display sets from basic
        displaySetsToDisplay: basicLayout.props.viewports[0].displaySetsToDisplay,
      },
      ...basicLayout.props.viewports,
      ],
    }
  };


export const longitudinalRoute =
    {
      ...basicRoute,
      path: 'longitudinal',
        /*init: ({ servicesManager, extensionManager }) => {
          //defaultViewerRouteInit
        },*/
      layoutInstance: longitudinalInstance,
    };

export const modeInstance = {
    ...basicModeInstance,
    // TODO: We're using this as a route segment
    // We should not be.
    id,
    routeName: 'viewer',
    displayName: i18n.t('Modes:Basic Viewer'),
    routes: [
      longitudinalRoute
    ],
    extensions: extensionDependencies,
    toolbarButtons: peterPanToolbarButtons,
    toolbarSections: peterPanToolbarSections,
  };

const mode = {
  ...basicMode,
  id,
  modeInstance,
  extensionDependencies,
};

export default mode;
export { initToolGroups };
export const toolbarButtons = peterPanToolbarButtons;
