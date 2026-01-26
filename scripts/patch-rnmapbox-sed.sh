#!/bin/bash

FILE="node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt"

# Restore from original if it exists
if [ -f "$FILE.original" ]; then
    cp "$FILE.original" "$FILE"
fi

# Use sed to replace specific case statements with empty/pass statements
sed -i.bak2 '
  # Comment out case lines with the deprecated properties
  s/^\(\s*\)"fillPatternCrossFade" ->/\1\/\/ "fillPatternCrossFade" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"lineElevationReference" ->/\1\/\/ "lineElevationReference" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"lineCrossSlope" ->/\1\/\/ "lineCrossSlope" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"linePatternCrossFade" ->/\1\/\/ "linePatternCrossFade" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"circleElevationReference" ->/\1\/\/ "circleElevationReference" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"fillExtrusionPatternCrossFade" ->/\1\/\/ "fillExtrusionPatternCrossFade" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"fillExtrusionHeightAlignment" ->/\1\/\/ "fillExtrusionHeightAlignment" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"fillExtrusionBaseAlignment" ->/\1\/\/ "fillExtrusionBaseAlignment" -> \/\/ Deprecated in Mapbox SDK 11.8+/
  s/^\(\s*\)"backgroundPitchAlignment" ->/\1\/\/ "backgroundPitchAlignment" -> \/\/ Deprecated in Mapbox SDK 11.8+/
' "$FILE"

# Now comment out the function calls that follow these cases
# This is a bit tricky since we need context, so let's use a simple perl one-liner
perl -i -pe '
BEGIN { $comment_next = 0; }
if (/\/\/ "(?:fillPatternCrossFade|lineElevationReference|lineCrossSlope|linePatternCrossFade|circleElevationReference|fillExtrusionPatternCrossFade|fillExtrusionHeightAlignment|fillExtrusionBaseAlignment|backgroundPitchAlignment)"/) {
    $comment_next = 10;  # Comment next 10 lines
}
if ($comment_next > 0 && /\S/) {
    s/^(\s*)(\S.*)$/$1\/\/ $2/ unless /^(\s*)\/\//;
    $comment_next--;
}
' "$FILE"

echo "Patched $FILE"
