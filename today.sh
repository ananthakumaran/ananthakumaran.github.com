#! /bin/bash
target=$(sed -r -e "s/[0-9]{4}-[0-9]{2}-[0-9]{2}/`date +%F`/" <<<$1)
mv $1 $target
