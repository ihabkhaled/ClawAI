#!/bin/sh
set -e
echo "Starting dev server (tsgo --watch + tsc-alias --watch + nodemon)..."
exec npm run dev
