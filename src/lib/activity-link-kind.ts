/**
 * How the server decided which call a status entry in a call's activity belongs to
 * (server `StatusDestinationSources`, sent as `DestinationSource` on each activity item).
 */
export enum StatusDestinationSources {
  /** The sender chose the call. */
  Explicit = 1,
  /** Sent without a call; linked from the sender's previous status. */
  CarryForward = 2,
  /** Sent without a call; linked from the sender's one open dispatch. */
  Dispatch = 3,
  /** Sent without a call; linked from the unit the person was riding. */
  Unit = 4,
  /** A unit/person dispatched to this call set this status with no destination while working it. */
  Inferred = 5,
}

/** `auto`: the server linked the status to the call; `inferred`: the server inferred it from the dispatch. */
export type ActivityLinkKind = 'auto' | 'inferred';

/**
 * The marker to show next to a call activity entry, or null when there is nothing to flag:
 * an explicit choice, an older row without the field, a non-status entry, or an unknown value.
 */
export const getActivityLinkKind = (source?: number | null): ActivityLinkKind | null => {
  switch (source) {
    case StatusDestinationSources.CarryForward:
    case StatusDestinationSources.Dispatch:
    case StatusDestinationSources.Unit:
      return 'auto';
    case StatusDestinationSources.Inferred:
      return 'inferred';
    default:
      return null;
  }
};
