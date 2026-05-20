import { metaData } from '@cornerstonejs/core';

// CT/MR consoles (GE, Toshiba, Siemens) frequently save the dose-report
// screen as a Secondary Capture inside an otherwise-CT study, but tag it
// with bogus VOI/rescale values: WindowWidth=1, WindowCenter=-2,
// RescaleIntercept=-1024, PixelRepresentation=1. Honoring those values
// clips the image to pure white in the viewport.
//
// This provider intercepts voiLutModule and modalityLutModule lookups for
// Secondary Capture SOP classes when the stored window is suspiciously
// narrow (WW < 10) on a 16-bit image (BitsAllocated >= 16). Both gates
// must be true to override — legit narrow-window 8-bit SC overlays are
// untouched. Returns empty VOI so Cornerstone3D falls back to image
// min/max auto-windowing, and an identity rescale so any downstream
// measurement tool reads raw pixel values instead of false-HU.

const SECONDARY_CAPTURE_SOP_CLASSES = new Set<string>([
  '1.2.840.10008.5.1.4.1.1.7', // Secondary Capture Image Storage
  '1.2.840.10008.5.1.4.1.1.7.1', // Multi-frame Single Bit SC
  '1.2.840.10008.5.1.4.1.1.7.2', // Multi-frame Grayscale Byte SC
  '1.2.840.10008.5.1.4.1.1.7.3', // Multi-frame Grayscale Word SC
  '1.2.840.10008.5.1.4.1.1.7.4', // Multi-frame True Color SC
]);

function toNumber(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    return value.length > 0 ? toNumber(value[0]) : undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function matchesBogusVoiPattern(imageId: string): boolean {
  const instance: any = metaData.get('instance', imageId);
  if (!instance) {
    return false;
  }
  if (!SECONDARY_CAPTURE_SOP_CLASSES.has(instance.SOPClassUID)) {
    return false;
  }
  const bits = toNumber(instance.BitsAllocated);
  if (bits === undefined || bits < 16) {
    return false;
  }
  const ww = toNumber(instance.WindowWidth);
  if (ww === undefined || ww >= 10) {
    return false;
  }
  return true;
}

const SecondaryCaptureVOIFixProvider = {
  get: (type: string, query: string | string[]) => {
    if (Array.isArray(query)) {
      return;
    }
    if (type !== 'voiLutModule' && type !== 'modalityLutModule') {
      return;
    }
    if (!matchesBogusVoiPattern(query)) {
      return;
    }
    if (type === 'voiLutModule') {
      // Empty object: provider has answered, no stored VOI → Cornerstone3D
      // computes window from pixel min/max at render time.
      return {};
    }
    // modalityLutModule: identity transform so raw pixel values are used.
    // Stripping the bogus -1024 intercept also stops downstream tools from
    // reading the screen capture as Hounsfield units.
    return { rescaleIntercept: 0, rescaleSlope: 1 };
  },
};

// Priority above the default DICOMweb provider (1000) and the overlay
// provider (10_000). Same band as the overlay provider since they handle
// disjoint types.
metaData.addProvider(SecondaryCaptureVOIFixProvider.get, 10_000);

export default SecondaryCaptureVOIFixProvider;
