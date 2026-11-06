"""Merge a tetrawave-edits.json saved by the in-page Edit tool into edits.json.

    python3 import_edits.py <downloaded tetrawave-edits.json>

Positions, sizes, text and removals are copied per page and item. Pictures dropped onto a page arrive as
data (an image, or a PDF whose first page becomes the picture). Each is saved as the page's next picture
file, images/<KEY>/<KEY>-NN_<name>.jpg|png, in newimages/ (to be copied to the site folder) and listed in
images_on_disk.txt; edits.json keeps its path instead of the data.
"""
import base64, io, json, os, re, sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
EDITS = os.path.join(HERE, 'edits.json')
DISK = os.path.join(HERE, 'images_on_disk.txt')
NEW = os.path.join(HERE, 'newimages')


def slug(name):
    s = re.sub(r'\.[A-Za-z0-9]+$', '', name or 'picture').lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:48] or 'picture'


def next_number(key, taken):
    nums = [int(m.group(1)) for p in taken for m in [re.match(rf'images/{key}/{key}-(\d+)_', p)] if m]
    return max(nums, default=0) + 1


def decode(data_url):
    return base64.b64decode(data_url.split(',', 1)[1])


def main(src):
    incoming = json.load(open(src))
    incoming = incoming.get('pages', incoming)
    edits = json.load(open(EDITS)) if os.path.exists(EDITS) else {}
    edits = edits.get('pages', edits)
    disk = [l.strip() for l in open(DISK)] if os.path.exists(DISK) else []
    added = []
    for key, items in incoming.items():
        page = edits.setdefault(key, {})
        for eid, e in items.items():
            e = dict(e)
            if e.get('new') and (e.get('data') or e.get('pdf')):
                old = page.get(eid, {})
                if old.get('path'):                      # already imported earlier: keep its file
                    e['path'], e['pw'], e['ph'] = old['path'], old.get('pw'), old.get('ph')
                elif not e.get('hide'):
                    if e.get('pdf'):                     # a PDF: its first page, rendered sharply
                        import fitz
                        doc = fitz.open(stream=decode(e['pdf']), filetype='pdf')
                        pix = doc[0].get_pixmap(dpi=200)
                        im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
                        ext, raw = 'jpg', None
                    else:
                        raw = decode(e['data'])
                        im = Image.open(io.BytesIO(raw))
                        ext = 'png' if im.format == 'PNG' else 'jpg'
                    n = next_number(key, disk)
                    path = f'images/{key}/{key}-{n:02d}_{slug(e.get("name"))}.{ext}'
                    out = os.path.join(NEW, path)
                    os.makedirs(os.path.dirname(out), exist_ok=True)
                    if raw is not None and im.format in ('JPEG', 'PNG'):
                        open(out, 'wb').write(raw)       # keep the original file exactly
                    else:
                        im.convert('RGB').save(out, quality=92)
                    e['path'], e['pw'], e['ph'] = path, im.width, im.height
                    disk.append(path)
                    added.append(path)
                e.pop('data', None); e.pop('pdf', None)
            old = page.get(eid, {})
            keep = {k: old[k] for k in ('new', 'path', 'pw', 'ph', 'name') if k in old and k not in e}
            page[eid] = {**keep, **e}
        if not page:
            edits.pop(key)
    json.dump(edits, open(EDITS, 'w'), indent=1)
    open(DISK, 'w').write('\n'.join(disk) + '\n')
    print('pages:', ', '.join(f'{k} ({len(v)})' for k, v in edits.items()))
    for p in added:
        print('new picture:', p)


if __name__ == '__main__':
    main(sys.argv[1])
