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

// Override the basic-mode Crosshairs and TrackballRotate buttons so a
// click switches to the correct hanging protocol first AND then activates
// the tool. The upstream definitions gate on the active viewport already
// being MPR / 3D and render as disabled otherwise — which surfaced to
// users as "3D is broken" because there's no obvious path to get into
// the right layout. Now: one click does both.
//
// Also add explicit MPR and Volume3D buttons next to Layout for the
// users who want the layout switch alone without activating a specific
// tool.
const overrideBasicButton = (id: string, replacement: any) =>
  basicToolbarButtons.map((b: any) => (b.id === id ? replacement : b));

const withCrosshairsAndTrackballOverridden = overrideBasicButton('Crosshairs', {
  id: 'Crosshairs',
  uiType: 'ohif.toolButton',
  props: {
    type: 'tool',
    icon: 'tool-crosshair',
    label: 'Crosshairs',
    tooltip: 'Switch to MPR and activate crosshairs',
    // Command array: layout switch first, then tool activation. After
    // setHangingProtocol fires, the active viewport is MPR and the 'mpr'
    // toolGroup is the right target. evaluate.action keeps it always
    // enabled instead of waiting for the user to already be in MPR.
    commands: [
      { commandName: 'setHangingProtocol', commandOptions: { protocolId: 'mpr' } },
      { commandName: 'setToolActiveToolbar', commandOptions: { toolGroupIds: ['mpr'] } },
    ],
    evaluate: 'evaluate.action',
  },
}).map((b: any) =>
  b.id === 'TrackballRotate'
    ? {
        id: 'TrackballRotate',
        uiType: 'ohif.toolButton',
        props: {
          type: 'tool',
          icon: 'tool-3d-rotate',
          label: '3D Rotate',
          tooltip: 'Switch to 3D Volume Rendering and activate rotate',
          commands: [
            { commandName: 'setHangingProtocol', commandOptions: { protocolId: 'primary3D' } },
            { commandName: 'setToolActiveToolbar' },
          ],
          evaluate: 'evaluate.action',
        },
      }
    : b,
);

const peterPanToolbarButtons = [
  ...withCrosshairsAndTrackballOverridden,
  {
    id: 'MprPreset',
    uiType: 'ohif.toolButton',
    props: {
      icon: 'layout-advanced-mpr',
      label: 'MPR',
      tooltip: 'Switch to MPR (3-plane reformat).',
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
      tooltip: 'Switch to 3D Volume Rendering.',
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
