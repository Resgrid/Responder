#!/bin/bash

# Patch the RNMBXStyleFactory.kt file to remove deprecated Mapbox properties
# that are not available in Mapbox SDK 11.8+

FILE="node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt"

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE not found"
  exit 1
fi

echo "Patching $FILE..."

# Create a backup
cp "$FILE" "$FILE.bak"

# Comment out the deprecated functions
sed -i.tmp '
  /fun setFillPatternCrossFade/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setLineElevationReference/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setLineCrossSlope/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setLinePatternCrossFade/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setCircleElevationReference/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setFillExtrusionPatternCrossFade/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setFillExtrusionHeightAlignment/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setFillExtrusionBaseAlignment/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
  /fun setBackgroundPitchAlignment/,/^[[:space:]]*}[[:space:]]*$/s/^/\/\/ /
' "$FILE"

# Remove temporary file
rm -f "$FILE.tmp"

echo "Patching complete. Backup saved as $FILE.bak"
