#!/usr/bin/env perl
use strict;
use warnings;

my $file = 'node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt';

# Read file
open(my $fh, '<', $file) or die "Cannot open $file: $!";
my @lines = <$fh>;
close($fh);

# Backup
open(my $bak, '>', "$file.backup") or die "Cannot create backup: $!";
print $bak @lines;
close($bak);

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
my $brace_count = 0;
my @output;

foreach my $line (@lines) {
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
        
        # Check if function is complete - when we have at least one opening brace and braces are balanced
        if ($brace_count == 0 && $close > 0) {
            $in_function = 0;
        }
    } else {
        push @output, $line;
    }
}

# Write output
open(my $out, '>', $file) or die "Cannot write to $file: $!";
print $out @output;
close($out);

print "Successfully patched $file\n";
print "Backup saved to $file.backup\n";
