#!/usr/bin/env perl

use strict;
use warnings;

use JSON::XS;
use Data::Dumper;

# Runs the "Simple Platform" example's configuration and execution
# steps, so that it doesn't have to be done manually.

my $gh_client = shift @ARGV;
my $gh_secret = shift @ARGV;

die "Both a GitHub client ID, and a Client Secret must be provided!\n"
  unless defined $gh_client and defined $gh_secret;

my $start_time = time();

# Helper functions ---------------------------------------------------

sub run {
  my $cmd = shift;

  print "$cmd\n";
  my $res = `$cmd`;
  warn Dumper($res) if $res;
}

sub readfile {
  my $filename = shift;

  print "Reading '$filename'...\n";
  open my $in, '<', $filename or die "Can't read file '$filename': $!\n";
  my $content = do { local $/; <$in> };
  close $in;
  return $content;
}

sub writefile {
  my $filename = shift;
  my $content = shift;

  print "Writing '$filename'...\n";
  open my $out, '>', $filename or die "Can't write to '$filename': $!\n";
  print $out $content;
  close $out;
}


# Main steps ---------------------------------------------------------

# start fresh
run 'rm -rf interbit';

# clone interbit repo
run 'git clone https://github.com/interbit/interbit.git';

# install interbit-cli
run 'npm i -g interbit-cli';

# create secrets
chdir 'interbit';
mkdir 'secrets';
chdir 'secrets';
run 'interbit keys --filename platform-deploy-keys.json';
run 'interbit keys --filename web-auth-endpoint-keys.json';

# read JSON keys
my $pd_keys = decode_json readfile('platform-deploy-keys.json');
my $pd_public = $pd_keys->{publicKey};
$pd_public =~ s/\n//g;
my $pd_private = $pd_keys->{privateKey};
$pd_private =~ s/\n//g;

my $wa_keys = decode_json readfile('web-auth-endpoint-keys.json');
my $wa_public = $wa_keys->{publicKey};
$wa_public =~ s/\n//g;
my $wa_private = $wa_keys->{privateKey};
$wa_private =~ s/\n//g;

# write environment bash scripts
writefile('platform-deploy.sh', <<"EOC");
#!/bin/bash
# Secrets for Accounts app GitHub OAuth chain
export GITHUB_CLIENT_ID="$gh_client"
export GITHUB_CLIENT_SECRET="$gh_secret"
export GITHUB_REDIRECT_URL="http://localhost:8888/oauth/github"
export OAUTH_CALLBACK_URL="http://localhost:3025/account/oauth/gitHub"
# Key pair for the platform node
export PUBLIC_KEY="$pd_public"
export PRIVATE_KEY="$pd_private"
# Peer list override
export PORT=5025
export CONNECT_TO_PEERS="localhost:8888"
EOC


writefile('web-auth-endpoint.sh', <<"EOC");
#!/bin/bash
# Secrets for Accounts app GitHub OAuth chain
export GITHUB_CLIENT_ID="$gh_client"
export GITHUB_CLIENT_SECRET="$gh_secret"
# Key pair for the web auth node
export PUBLIC_KEY="$wa_public"
export PRIVATE_KEY="$wa_private"
# Peer list override
export PORT=8888
export CONNECT_TO_PEERS="localhost:5025"
EOC

# revise configuration for app-account
chdir '..';
my $aa_content = readfile('packages/app-account/interbit.config.js');
$aa_content =~ s/  'xk0EWxXLXg.*'/  '$pd_public'/;
$aa_content =~ s/  'xk0EWxXMKA.*'/  '$wa_public'/;
writefile('packages/app-account/interbit.config.js', $aa_content);

# revise configuration for interbit-template
my $ta_content = readfile('packages/interbit-template/interbit.config.js');
$ta_content =~ s/  'xk0EWxXLXg.*'/  '$pd_public'/;
writefile('packages/interbit-template/interbit.config.js', $ta_content);

# remove the platform-deploy manifest file
my $res = unlink 'packages/platform-deploy/platform/interbit.manifest.json';
warn $res if $res ne "1";

# complete platform-deploy setup
run 'npm i';
# run 'source secrets/platform-deploy.sh && cd packages/platform-deploy && npm run build:dev';

my $end_time = time();
my $duration = $end_time - $start_time;
print "Setup complete, in $duration seconds.\n";
