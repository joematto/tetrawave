#!/bin/bash
# Package the built site + sources for the user's folder (cp, not tar, from the outputs mount: it reports false hard links)
set -e
D=/tmp/claude-0/-home-claude/4e332f19-7fff-5dc8-91d8-0263face8284/scratchpad/dep; O=/mnt/user-data/outputs/tetrawave-site; S=/home/claude/tw
rm -rf $D && mkdir -p $D/src $D/js $D/css
cp $S/*.py $S/*.json $S/*.js $S/*.html $S/*.css $S/*.sh $S/images_on_disk.txt $D/src/
cp $O/*.html $O/IMAGE-INDEX.csv $D/ && cp $O/js/*.js $D/js/ && cp $O/css/*.css $D/css/
# pictures added with the Edit tool (written by import_edits.py), then cleared
if [ -d $S/newimages/images ]; then cp -r $S/newimages/images $D/ && rm -rf $S/newimages; fi
NAME=tw-deploy-$(date +%s).tgz
(cd $D && tar czf /mnt/user-data/outputs/$NAME --hard-dereference .)
echo $NAME $(stat -c %s /mnt/user-data/outputs/$NAME)
