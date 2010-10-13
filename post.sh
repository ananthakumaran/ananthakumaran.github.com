file=./_posts/$2/`date +%F`-$1.markdown
if [ ! -d ./_posts/$2 ]
then
    mkdir ./_posts/$2;
fi
cat > $file  << EOF
---
layout: post
title:
header:
meta_keywords:
meta_descripton:
---
EOF

emacsclient ./_posts/$2/`date +%F`-$1.markdown -n
