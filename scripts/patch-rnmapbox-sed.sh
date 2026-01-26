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
# Comment lines until we reach the next case/else label or closing brace
perl -i -pe '
BEGIN { $commenting = 0; }
if (/\/\/ "(?:fillPatternCrossFade|lineElevationReference|lineCrossSlope|linePatternCrossFade|circleElevationReference|fillExtrusionPatternCrossFade|fillExtrusionHeightAlignment|fillExtrusionBaseAlignment|backgroundPitchAlignment)"/) {
    $commenting = 1;  # Start commenting following lines
    next;
}
if ($commenting) {
    # Stop commenting if we hit next case/else or closing brace at appropriate indent
    if (/^\s*"[^"]+"\s*->/ || /^\s*else\s*->/ || /^\s*\}/) {
        $commenting = 0;
    } elsif (/\S/ && !/^\s*\/\//) {
        # Comment non-empty lines that aren'\''t already commented
        s/^(\s*)(\S.*)$/$1\/\/ $2/;
    }
}
' "$FILE"

echo "Patched $FILE"
