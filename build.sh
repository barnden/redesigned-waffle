#!/bin/bash

mkdir -p ./dist/assets/

# Compile styles
npx sass ./src/styles/base.scss > ./dist/assets/style.css

cp -R ./src/js/ ./dist/assets/

cp ./src/index.html ./dist/
