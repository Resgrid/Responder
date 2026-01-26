#!/bin/bash

FILE="node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt"

# Check if file exists
if [ ! -f "$FILE" ]; then
  echo "Error: File does not exist: $FILE" >&2
  exit 1
fi

# Detect and require GNU awk
if command -v gawk >/dev/null 2>&1; then
  AWK_CMD="gawk"
elif command -v awk >/dev/null 2>&1 && awk --version 2>&1 | grep -q "GNU Awk"; then
  AWK_CMD="awk"
else
  echo "Error: GNU awk (gawk) is required but not found." >&2
  echo "Please install gawk (e.g., 'brew install gawk' on macOS or 'apt-get install gawk' on Linux)." >&2
  exit 1
fi

# Create backup
cp "$FILE" "$FILE.bak2"

# Create a temporary file for safe processing
TMPFILE=$(mktemp) || { echo "Error: Failed to create temporary file" >&2; exit 1; }

# Use GNU awk to comment out specific functions
"$AWK_CMD" '
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
' "$FILE.bak2" > "$TMPFILE"

# Check if awk processing was successful
if [ $? -eq 0 ]; then
  # Atomically replace the original file
  mv "$TMPFILE" "$FILE"
  echo "Patching complete!"
else
  echo "Error: AWK processing failed" >&2
  rm -f "$TMPFILE"
  exit 1
fi
