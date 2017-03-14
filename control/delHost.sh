#!/bin/bash

sed -i -e /$1/d ansibleFiles/hosts
echo "`date` terminated $1" >> host.log

