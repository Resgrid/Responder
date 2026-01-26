#!/usr/bin/env perl
use strict;
use warnings;

my $file = 'node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt';

# Read file
open(my $fh, '<', $file) or die "Cannot open $file: $!";
my @lines = <$fh>;
close($fh);

# Backup (restore from original if exists)
if (-f "$file.original") {
    open(my $orig, '<', "$file.original") or die "Cannot open original: $!";
    @lines = <$orig>;
    close($orig);
}

my @functions = qw(
    setFillPatternCrossFade
    setLineElevationReference
    setLineCrossSlope
    setLinePatternCrossFade
    setCircleElevationReference
    setFillExtrusionPatternCrossFade
    setFillExtrusionHeightAlignment
    setFillExtrusionBaseAlignment
    setBackgroundPitchAlignment
);

my $in_function = 0;
my $in_case = 0;
my $brace_count = 0;
my @output;

for (my $i = 0; $i < @lines; $i++) {
    my $line = $lines[$i];
    
    # Check if we're in a case statement for one of the deprecated functions
    foreach my $func (@functions) {
        # Convert function names to property names (e.g., setFillPatternCrossFade -> fillPatternCrossFade)
        my $propName = $func;
        $propName =~ s/^set(.)/lc($1)/e;  # Remove 'set' and lowercase first letter
        
        if ($line =~ /"$propName"\s*->/ && !$in_case) {
            $in_case = 1;
            # Comment this line and peek ahead to find where the case ends
            push @output, $line;
            $output[-1] =~ s/^(\s*)(.+)$/$1\/\/ $2/;
            
            # Look ahead to find what comes next and comment it too
            my $j = $i + 1;
            while ($j < @lines && $lines[$j] !~ /^\s*"/ && $lines[$j] !~ /^\s*else\s*->/ && $lines[$j] !~ /^\s*\}/) {
                push @output, $lines[$j];
                $output[-1] =~ s/^(\s*)(.+)$/$1\/\/ $2/ if $lines[$j] =~ /\S/;
                $i = $j;
                $j++;
                # If we hit a closing brace that's part of the case, stop
                if ($lines[$j] =~ /^\s*}\s*$/) {
                    last;
                }
            }
            $in_case = 0;
            next;
        }
    }
    
    # Check if we're starting a function we want to comment
    if (!$in_function) {
        foreach my $func (@functions) {
            if ($line =~ /fun\s+$func\s*\(/) {
                $in_function = 1;
                $brace_count = 0;
                last;
            }
        }
    }
    
    if ($in_function) {
        # Count braces
        my $open = () = $line =~ /{/g;
        my $close = () = $line =~ /}/g;
        $brace_count += $open - $close;
        
        # Comment the line
        if ($line =~ /^(\s*)(.+)$/) {
            push @output, "$1// $2\n";
        } else {
            push @output, $line;
        }
        
        # Check if function is complete
        if ($brace_count == 0 && $close > 0) {
            $in_function = 0;
        }
    } else {
        push @output, $line unless $in_case;
    }
}

# Write output
open(my $out, '>', $file) or die "Cannot write to $file: $!";
print $out @output;
close($out);

print "Successfully patched $file\n";
