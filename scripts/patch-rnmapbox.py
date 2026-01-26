#!/usr/bin/env python3
import re

file_path = "node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt"

# Read the file
with open(file_path, 'r') as f:
    content = f.read()

# Store original content for backup
original_content = content

# List of deprecated functions to comment out
deprecated_functions = [
    'setFillPatternCrossFade',
    'setLineElevationReference',
    'setLineCrossSlope',
    'setLinePatternCrossFade',
    'setCircleElevationReference',
    'setFillExtrusionPatternCrossFade',
    'setFillExtrusionHeightAlignment',
    'setFillExtrusionBaseAlignment',
    'setBackgroundPitchAlignment'
]

# For each function, find and comment out
for func_name in deprecated_functions:
    # Pattern to match function definition and its body
    pattern = rf'(\s+)(fun {func_name}\([^{{]+\{{(?:[^{{}}]*\{{[^{{}}]*\}})*[^{{}}]*\}})'
    
    def replace_func(match):
        indent = match.group(1)
        func_body = match.group(2)
        # Comment out each line
        commented = '\n'.join([indent + '// ' + line.lstrip() if line.strip() else line 
                               for line in func_body.split('\n')])
        return commented
    
    content = re.sub(pattern, replace_func, content, flags=re.MULTILINE | re.DOTALL)

# Save backup of original content
with open(file_path + '.bak', 'w') as f:
    f.write(original_content)

# Write patched content
with open(file_path, 'w') as f:
    f.write(content)

print(f"Successfully patched {file_path}")
print("Backup saved as {}.bak".format(file_path))
