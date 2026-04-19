/** A default viewport options */
export const viewportOptions = {
  // peter-pan: pin to 'stack' so a viewport with no matched display set never
  // routes into Cornerstone3D's volume renderer, which then drags VTK in and
  // crashes on `new Proxy(canvas.getContext('webgl2'), ...)` when the canvas
  // hasn't mounted / has no pixel data (get3DContext crash seen in prod).
  viewportType: 'stack',
  toolGroupId: 'default',
  allowUnmatchedView: true,
  syncGroups: [
    {
      type: 'hydrateseg',
      id: 'sameFORId',
      source: true,
      target: true,
      options: {
        matchingRules: ['sameFOR'],
      },
    },
  ],
};

export const hydrateSegDefault = viewportOptions;
