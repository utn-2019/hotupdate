#!/usr/bin/env bash

param='[{"name":"hall","version":"1.0.0","include":true},{"name":"mj","version":"1.0.1","include":false},{"name":"pdk","version":"1.0.1","include":false}]'

DestPath=./remote-assets-sub
rm -rf  $DestPath

node pack_generator.js -v 1.0.10 -u http://192.168.2.17:8000/update/remote-assets/ -s build/jsb-link/ -d assets/ -p $param

ObjPath=./build/jsb-link
DestPath=./remote-assets
rm -rf  $DestPath

rm -f remote-assets.zip
mkdir -p "${DestPath}/res"
mkdir -p "${DestPath}/src"
cp -r "${ObjPath}/res" "${DestPath}"
cp -r "${ObjPath}/src" "${DestPath}"

cp "${ObjPath}"/*.manifest "${DestPath}"
