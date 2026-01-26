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
my $brace_count = 0;
my @output;

foreach my $line (@lines) {
    # Check if this line calls one of the deprecated functions (not a fun definition)
    my $is_call = 0;
    foreach my $func (@functions) {
        if ($line =~ /^\s+$func\(/ && $line !~ /fun\s+$func/) {
            # This is a function call, comment it and any associated logger line
            push @output, $line;
            $line =~ s/^(\s*)(.+)$/$1\/\/ $2/;
            $output[-1] = $line;
            $is_call = 1;
            last;
        }
        # Also comment Logger lines that reference these functions
        if ($line =~ /Logger.*".*$func/) {
            push @output, $line;
            $line =~ s/^(\s*)(.+)$/$1\/\/ $2/;
            $output[-1] = $line;
            $is_call = 1;
            last;
        }
    }
    
    next if $is_call;  # We already pushed this line
    
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
        push @output, $line;
    }
}

# Write output
open(my $out, '>', $file) or die "Cannot write to $file: $!";
print $out @output;
close($out);

print "Successfully patched $file\n";
