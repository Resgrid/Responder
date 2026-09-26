import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, BadgeText } from '@/components/ui/badge';
import { getActivityLinkKind } from '@/lib/activity-link-kind';

interface ActivityLinkMarkerProps {
  /** The activity item's `DestinationSource` (server `StatusDestinationSources`). */
  source?: number | null;
  className?: string;
}

/**
 * Flags a call activity status the sender did not explicitly attach to this call: "auto-linked"
 * when the server linked it (previous status, the one open dispatch, or the unit a person rode),
 * "inferred" when a unit/person dispatched here set it with no destination. Renders nothing otherwise.
 */
export const ActivityLinkMarker: React.FC<ActivityLinkMarkerProps> = React.memo(({ source, className }) => {
  const { t } = useTranslation();
  const kind = getActivityLinkKind(source);

  if (!kind) {
    return null;
  }

  const isInferred = kind === 'inferred';
  const label = isInferred ? t('call_detail.activity_link.inferred') : t('call_detail.activity_link.auto');
  const hint = isInferred ? t('call_detail.activity_link.inferred_hint') : t('call_detail.activity_link.auto_hint');

  return (
    <Badge
      action={isInferred ? 'warning' : 'info'}
      variant="outline"
      size="sm"
      className={className}
      testID={`activity-link-marker-${kind}`}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <BadgeText className="normal-case">{label}</BadgeText>
    </Badge>
  );
});

ActivityLinkMarker.displayName = 'ActivityLinkMarker';
