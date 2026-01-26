#!/bin/bash

FILE="node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt"

# Create backup
cp "$FILE" "$FILE.bak2"

# Use awk to comment out specific functions
awk '
BEGIN { 
  commenting = 0
  brace_count = 0
}

# Check if this line starts one of our target functions
/fun setFillPatternCrossFade\(/ || 
/fun setLineElevationReference\(/ || 
/fun setLineCrossSlope\(/ ||
/fun setLinePatternCrossFade\(/ ||
/fun setCircleElevationReference\(/ ||
/fun setFillExtrusionPatternCrossFade\(/ ||
/fun setFillExtrusionHeightAlignment\(/ ||
/fun setFillExtrusionBaseAlignment\(/ ||
/fun setBackgroundPitchAlignment\(/ {
  commenting = 1
  brace_count = 0
  # Print line with comment and count braces
  match($0, /{/)
  if (RSTART > 0) brace_count++
  print gensub(/^(\s*)(.*)$/, "\\1// \\2", "g")
  next
}

# If we are commenting
commenting == 1 {
  # Count opening and closing braces
  gsub(/\{/, "{", $0); open_braces = gsub(/{/, "&")
  gsub(/\}/, "}", $0); close_braces = gsub(/}/, "&")
  
  brace_count += open_braces - close_braces
  
  # Comment the line
  print gensub(/^(\s*)(.*)$/, "\\1// \\2", "g")
  
  # If braces are balanced, stop commenting
  if (brace_count <= 0) {
    commenting = 0
  }
  next
}

# Print all other lines as-is
{ print }
' "$FILE.bak2" > "$FILE"

echo "Patching complete!"
