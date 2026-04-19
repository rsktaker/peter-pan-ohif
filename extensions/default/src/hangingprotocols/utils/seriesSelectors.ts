import { Types } from '@ohif/core';

type MatchingRule = Types.HangingProtocol.MatchingRule;

export const seriesWithImages: MatchingRule[] = [
  {
    attribute: 'numImageFrames',
    constraint: {
      greaterThan: { value: 0 },
    },
    weight: 1,
    // peter-pan: required was true, but when WADO-RS metadata doesn't populate
    // numImageFrames on a series (seen with certain Orthanc responses through
    // our /api/dicomweb proxy), every display set fails the required check and
    // the hanging protocol binds an empty viewport. The downstream renderer
    // then tries to init a VTK 3D context on nothing and crashes with
    // "Cannot create proxy with a non-object as target or handler". Flipping
    // to required:false keeps this as a ranking preference so series still
    // match and a stack viewport actually renders.
    required: false,
  },
  // This display set will select the specified items by preference
  // It has no affect if nothing is specified in the URL.
  {
    attribute: 'isDisplaySetFromUrl',
    weight: 20,
    constraint: {
      equals: true,
    },
  },
];
