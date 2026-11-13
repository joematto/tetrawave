"""Build the TetraWave prototype site from content.json (extracted from the live Wix pages)."""
import json, os, re, html

V = json.load(open('content.json'))
PLAN = json.load(open('plan.json'))
SIZES = {os.path.splitext(p)[0]: (p, w, h) for p, w, h in json.load(open('sizes.json'))}
OUT = '/mnt/user-data/outputs/tetrawave-site'

def canon(i):
    m = re.match(r'([0-9a-z]{6}_[0-9a-f]{32})(~mv2)?(?:_d_[\d_]+_s_[\d_]+)?(\.[a-z]+)$', i or '')
    return (m.group(1) + (m.group(2) or '') + m.group(3)) if m else i

IMG = {}
for p in PLAN:
    web = SIZES[os.path.splitext(p['path'])[0]]
    IMG[p['id']] = web

# ---- Book outline -------------------------------------------------------
# (key, title, file or None, wix slug for pages not yet moved)
OUTLINE = [
    ('Front', [('HOME', 'Home', 'index.html'), ('ABOUT', 'About Me', 'about-me.html'), ('CONTACT', 'Contact', 'contact.html')]),
    ('Part I · The Awakening', [('PRE', 'An Art Portfolio for Architecture Schools', 'pre-kundalini-artwork.html'), ('P1', 'Kundalini Crisis', 'part-1-kundalini-crisis.html'),
        ('POST', 'Post-Kundalini Drawings/Sketches', 'post-kundalini-artwork.html'), ('COIL', 'StarCoil-1st Download Transmission', 'starcoil-1st-download-message.html'),
        ('SKETCH', '2D Exploratory & Inception Sketches', '2d-exploratory-inception-sketches.html')]),
    ('Part II · The Geometry', [('P2', 'Geometry Unified across Dimensions', 'part-2-the-geometry.html'),
        ('TETRA', 'Tetrahedron Fascination', 'tetrahedron-fascination.html'),
        ('MODEL', '3D Exploration Models', '3d-exploration-models.html'),
        ('BUILD', 'Tetrawave Build Sequence', 'tetrawave-build-sequence.html'),
        ('TILT', '“TOT” Tilt Angle & Cylindrical Analysis', 'tilt-angle-analysis.html'),
        ('GOLD', 'PHI is an Artifact', 'the-golden-section-is-an-artifact.html'),
        ('GRID', '11:11', '11-11-grid.html'),
        ('CAD', '3D Exploration CAD Models', '3d-exploration-cad-models.html'),
        ('HELIX', 'Tetra-Helix 2D Drawing Methods', 'tetra-helix-2d-drawing-methods.html')]),
    ('Part III · One Form, Many Shapes', [('P3', 'One Form, Many Shadows', 'part-3-one-form-many-shadows.html'), ('SLICE', 'Slicing the Form', 'slicing-the-form.html'),
        ('CADUC', 'Caduceus – Ida, Pingala, Sushumna', 'caduceus.html'), ('DNA', 'DNA', 'dna.html'), ('SHEN', 'Egyptian Shen', 'egyptian-shen.html'), ('CROP', 'Crop Circles', 'crop-circles.html'),
        ('GIZA', 'Pyramid of Giza', 'pyramid-of-giza.html'), ('DOME', 'Dome of the Rock', 'dome-of-the-rock.html'), ('STONE', 'Stonehenge & Thornborough', 'stonehenge-thornborough.html'),
        ('DC', 'Washington DC', 'washington-dc.html')]),
    ('Part IV · The Implications', [('P4', 'The Implications', 'part-4-the-implications.html'), ('VESICA', 'Christ Conscious – Vesica Piscis', 'christ-conscious-vesica-piscis.html'),
        ('TORUS', 'Toroids – Planet & Human', 'toroids-planet-human.html')]),
]
FILES = {k: f for _, pages in OUTLINE for k, t, f in pages if f}
TITLES = {k: t for _, pages in OUTLINE for k, t, f in pages}
WIXSLUG = {'2d-japan-zen-tetrahedron': 'P2', 'encounters-with-tetrahedrons-in-my': 'TETRA', '3d-exploration-models': 'MODEL',
           '11-11-grid': 'GRID', 'tetrahedral-waveform': 'BUILD', 'copy-of-3d-exploration-models': 'CAD',
           'constructing-a-tethelix-using-c-se': 'HELIX', '': 'HOME', 'home-intro-stargate-models': 'HOME',
           'the-awakening': 'P1', 'pre-kundaliniin-artwork': 'PRE', 'post-kundaliniin-artwork': 'POST', 'copy-of-star-coil': 'COIL',
           '2d-exploratory-inception-sketches': 'SKETCH', 'oculus-dei': 'P3', 'symbolic-metaphysical-correlations': 'SLICE',
           'caduceus-ida-pigala-sushumna': 'CADUC', 'copy-of-christ-conscious-vesica-pis': 'SHEN', 'copy-of-dome-of-the-rock': 'CROP',
           'pyramid-of-giza': 'GIZA', 'copy-of-egyptian-shen': 'DOME', 'stonehenge': 'STONE', 'copy-of-crop-circles': 'DC',
           'copy-of-part-ii-one-form-many-shadows': 'P4', 'vesica-pisces-mandorla': 'VESICA', 'toroids-planet-human-cole': 'TORUS',
           'about-me': 'ABOUT', 'contact-page': 'CONTACT'}
SEQ = [k for part, pages in OUTLINE[1:] for k, t, f in pages]

def link(u):
    if u.startswith('~'):
        slug = u[1:].strip('/')
        if slug in WIXSLUG:
            return FILES[WIXSLUG[slug]]
        return 'https://joematto14.wixsite.com/website-2/' + slug
    return u

E = html.escape

# ---- Layout: recursive XY-cut over the Wix positions --------------------
def items_of(page):
    out = []
    for r in page['rows']:
        for c in r['cells']:
            x, w, h, t = c[0], c[1], c[2], c[3]
            out.append({'x': x, 'y': r['top'], 'w': w, 'h': h, 'c': c})
    return out

def overlap_groups(items, a, b):
    items = sorted(items, key=lambda i: i[a])
    groups, end = [], None
    tol = 6 if a == 'y' else 48
    for it in items:
        if groups and it[a] < end - tol:
            groups[-1].append(it); end = max(end, it[a] + it[b])
        else:
            groups.append([it]); end = it[a] + it[b]
    return groups

def cut(items, depth=0):
    if len(items) == 1:
        return ('leaf', items[0])
    bands = overlap_groups(items, 'y', 'h')
    if len(bands) > 1:
        return ('v', [cut(b, depth + 1) for b in bands])
    cols = overlap_groups(items, 'x', 'w')
    if len(cols) > 1:
        return ('h', [cut(c, depth + 1) for c in cols], cols)
    return ('v', [('leaf', i) for i in sorted(items, key=lambda i: (i['y'], i['x']))])

PAGE_W = 980

def anim_attr(a):
    return ' data-anim="fade"' if a == 'fadeIn' else (' data-anim="spin"' if a == 'spinIn' else '')

def fs_style(fs):
    if not fs:
        return ''
    lo = max(14, round(fs * 0.62))
    return f'font-size:clamp({lo}px,{fs / 9.8:.2f}vw,{fs}px)'

def render_text(c):
    anim = c[4]
    parts = []
    for tag, fs, al, bold, text, links, col in c[5]:
        body = E(text).replace('\n', '<br>')
        for lt, lu in links or []:
            if lt and E(lt) in body:
                href = link(lu)
                ext = '' if not href.startswith('http') else ' target="_blank" rel="noopener"'
                body = body.replace(E(lt), f'<a href="{E(href)}"{ext}>{E(lt)}</a>', 1)
        # Lettering standard: paragraph headings (Wix size 26px+ or a heading tag) and paragraphs.
        # Sizes, weights and colours come from the standard in site.css; only alignment is kept from Wix.
        style = ' style="text-align:' + {'c': 'center', 'r': 'right'}[al] + '"' if al else ''
        if tag or fs >= 26:
            parts.append(f'<h3 class="ph"{style}>{body}</h3>')
        elif fs and fs <= 15:   # captions and credits -> Small paragraph
            parts.append(f'<p class="small"{style}>{body}</p>')
        else:
            parts.append(f'<p{style}>{body}</p>')
    return f'<div class="txt"{anim_attr(anim)}>' + '\n'.join(parts) + '</div>'

def render_img(c, key_of_page):
    anim, src, href, title = c[4], c[5], c[6], (c[7] if len(c) > 7 else '')
    if not src:
        return ''
    path, w, h = IMG[canon(src)]
    owner = path.split('/')[1]
    name = os.path.basename(path)
    alt = re.sub(r'^[A-Z0-9]+-\d+_', '', os.path.splitext(name)[0]).replace('-', ' ')
    if alt == 'image':
        alt = (TITLES.get(key_of_page, '') + ' illustration')
    tag = (f'<img src="{path}" width="{w}" height="{h}" loading="lazy" decoding="async" alt="{E(alt)}">')
    inner = f'<a href="{E(link(href))}">{tag}</a>' if href else tag
    note = '' if owner == key_of_page else f' data-shared="from {owner}"'
    return f'<figure class="img"{anim_attr(anim)} data-file="{path}"{note}>{inner}</figure>'

def render_btn(c):
    anim, text, href = c[4], c[5], c[6]
    return f'<p class="btnline"{anim_attr(anim)}><a class="btn" href="{E(link(href or "~"))}">{E(text)}</a></p>'

def leaf(it, key):
    c = it['c']; t = c[3]
    if t == 'T': html_ = render_text(c)
    elif t == 'I': html_ = render_img(c, key)
    elif t == 'B': html_ = render_btn(c)
    else: return ''
    if not html_: return ''
    w = it['w']
    return f'<div class="blk" style="--w:{w}px">{html_}</div>'

def render(node, key, span=PAGE_W):
    kind = node[0]
    if kind == 'leaf':
        return leaf(node[1], key)
    if kind == 'v':
        return '\n'.join(render(n, key, span) for n in node[1])
    # columns side by side
    cols = node[2]
    total = sum(max(i['x'] + i['w'] for i in col) - min(i['x'] for i in col) for col in cols)
    out = []
    for n, col in zip(node[1], cols):
        cw = max(i['x'] + i['w'] for i in col) - min(i['x'] for i in col)
        out.append(f'<div class="col" style="flex:{cw} 1 0">{render(n, key, cw)}</div>')
    return '<div class="cols">' + '\n'.join(out) + '</div>'

# ---- Page shell ---------------------------------------------------------
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">'

def toc(current):
    out = ['<nav class="toc" id="toc" hidden><div class="toc-inner">',
           '<a class="toc-close" href="index.html">Home</a>',
           '<p class="toc-title">Contents</p>',
           DEV_LINKS.replace('class="tl-dev"', 'class="tl-dev toc-dev"')]
    for part, pages in OUTLINE:
        out.append(f'<div class="toc-part"><p class="toc-part-name">{E(part)}</p><ul>')
        m = re.match(r'Part ([IVX]+)', part)          # Sections within a Part are numbered 1, 2, 3 ...
        for n, (k, t, f) in enumerate(pages, 1):
            cur = ' aria-current="page"' if k == current else ''
            idx = f'<span class="idx" title="Part {m.group(1)}, Section {n}">{n}</span>' if m else ''
            if f:
                out.append(f'<li><a href="{f}"{cur}><span class="k">{k}</span>{idx}{E(t)}</a></li>')
            else:
                out.append(f'<li class="todo"><span class="k">{k}</span>{idx}{E(t)}<em>not moved yet</em></li>')
        out.append('</ul></div>')
    out.append('</div></nav>')
    return '\n'.join(out)

# Temporary working links in the header (set DEV_LINKS = '' to remove them from every page)
DEV_LINKS = ('<span class="tl-dev"><button type="button" class="tb-btn" aria-expanded="false" title="ToolBox (Ctrl+Option+T turns it on and off)">ToolBox ▾</button><span class="tb-menu"><a href="#edit" data-edit-toggle title="Edit: drag pictures and text boxes, resize pictures by their handles, then Save">Edit</a><a href="#upload" data-upload-toggle title="Upload: a tray to drop pictures and PDFs onto, then drag them onto the page">Upload</a><a href="#guide" data-guide-toggle title="Vertical alignment guide">Guide</a><a href="#symmetry" data-sym-toggle title="Symmetry guides: a centre line and two lines equally either side">Symmetry</a><a href="#margins" data-margins-toggle title="Margins: fixed lines on the page, centre at 490 (the page centre) and dotted margins 400 either side (span 800)">Margins</a><a href="#grid" data-grid-toggle title="Sorting grid: every picture on the site, by page and picture number">Grid</a><a href="#type" data-typepal-toggle title="Fonts: floating palette of every lettering style">Fonts</a><a href="#ruler" data-ruler-toggle>Ruler</a>'
             '<a href="#" data-tools-off class="tb-off" title="Hide the ToolBox in this browser (Ctrl+Option+T brings it back)">Turn ToolBox off</a></span></span>')
# Before the page draws: show the ToolBox only if it was turned on in this browser (see js/toolbox.js)
TOOLS_FLAG = "<script>try{if(localStorage.getItem('tw-tools')==='on')document.documentElement.classList.add('tools-on')}catch(e){}</script>"

def address(key):
    """Part / Section label for a page, e.g. 'Part II · Section 5'."""
    for part, pages in OUTLINE:
        m = re.match(r'Part ([IVX]+)', part)
        for n, (k, t, f) in enumerate(pages, 1):
            if k == key:
                return f'Part {m.group(1)} · Section {n}' if m else 'Front'
    return ''

# Pages whose pictures carry a small index number (top left) so they can be called out for adjustments:
# counted from the top of the page down, left to right where pictures sit side by side.
IMAGE_NUMBERS = 'ALL'   # (or a set of page keys, e.g. {'TETRA'}; '' to turn them off everywhere)

def shell(key, title, body, home=False, bgvideo='video/background.mp4', bgposter='video/background-poster.jpg'):
    head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<style>body{{background:#05060b}}{'#tw-cover{position:fixed;inset:0;z-index:2147483400;background:#05060b}body.home .bg,body.home .veil{opacity:0}html.tw-intro body.home .bg,html.tw-intro body.home .veil{opacity:1;transition:opacity 900ms ease}' if home else ''}</style>
<!-- Page key: {key}  ·  this page's images live in images/{key}/  -->
<title>{E(title)} · TetraWave</title>
{FONTS}
<link rel="stylesheet" href="css/site.css">
{TOOLS_FLAG}
</head>
<body class="{'home' if home else 'inner'}" data-key="{key}" data-edits-saved="{EDITS_SAVED}"{' data-image-numbers' if IMAGE_NUMBERS == 'ALL' or key in IMAGE_NUMBERS else ''}>
{'<div id="tw-cover" aria-hidden="true"></div><noscript><style>#tw-cover{display:none}</style></noscript>' if home else ''}
<video class="bg" autoplay muted loop playsinline poster="{bgposter}" aria-hidden="true"><source src="{bgvideo}" type="video/mp4"></video>
<div class="veil" aria-hidden="true"></div>
'''
    topline = f'''<div class="topline">
  <a class="tl-link" href="about-me.html"{' aria-current="page"' if key=='ABOUT' else ''}>About Me</a>
  <div class="sound">
    <button class="sound-btn" type="button" aria-pressed="false" aria-label="Play sound: White Winds"><svg viewBox="0 0 20 20" aria-hidden="true"><path class="i-play" d="M6 4l10 6-10 6z"/><path class="i-pause" d="M5 4h4v12H5zM11 4h4v12h-4z"/></svg></button>
    <span class="sound-label">Sound</span>
    <audio id="sound" preload="none" loop><source src="audio/white-winds.mp3" type="audio/mpeg"><source src="https://music.wixstatic.com/mp3/9c79f0_10475247e07343a38bf0dcd2472a76ec.mp3" type="audio/mpeg"></audio>
  </div>
  <a class="tl-link" href="contact.html"{' aria-current="page"' if key=='CONTACT' else ''}>Contact</a>
  {DEV_LINKS}
  {'<button class="toc-open" type="button">Contents</button>' if home else '<div class="toc-box"><button class="toc-open" type="button">Contents</button>' + (f'<p class="addr">{address(key)}</p>' if address(key) else '') + '</div>'}
  {'' if home else '<a class="brand" href="index.html"><span>TetraWave</span><small>&amp; The StarGate Poems · 1987–1990</small></a>'}
</div>'''
    if home:
        header = '<header class="bar bar-home">' + topline + '</header>'
    else:
        header = '<header class="bar bar-inner">' + topline + '</header>'
    nav = ''
    if key in SEQ:
        i = SEQ.index(key)
        prev = SEQ[i - 1] if i else None
        nxt = SEQ[i + 1] if i + 1 < len(SEQ) else None
        nav = '<nav class="pager">' + \
            (f'<a class="prev" href="{FILES[prev]}"><small>Previous</small>{E(TITLES[prev])}</a>' if prev else '<span></span>') + \
            (f'<a class="next" href="{FILES[nxt]}"><small>Next</small>{E(TITLES[nxt])}</a>' if nxt else '<span></span>') + '</nav>'
        # the same two links, small, just under the header line: Previous under the TetraWave name, Next under the Part/Section address
        topnav = '<nav class="pager-top" aria-label="Previous and next">' + \
            (f'<a class="prev" href="{FILES[prev]}" title="Previous: {E(TITLES[prev])}"><span class="arw">‹</span>{E(TITLES[prev])}</a>' if prev else '') + \
            (f'<a class="next" href="{FILES[nxt]}" title="Next: {E(TITLES[nxt])}">{E(TITLES[nxt])}<span class="arw">›</span></a>' if nxt else '') + '</nav>'
        header += topnav
    foot = '' if home else f'<footer class="foot"><p>Joseph Matto Architect AIA · TetraWave</p><p class="hint">Tip: add <code>#files</code> to this page’s address to see every image’s file name.</p></footer>'
    return head + header + toc(key) + f'\n<main class="page">\n{body}\n</main>\n{nav}\n{foot}\n<script src="js/toolbox.js" defer></script>\n<script src="js/site.js" defer></script>\n<script src="js/ruler.js" defer></script>\n<script src="js/typepal.js" defer></script>\n<script src="js/guide.js" defer></script>\n<script src="js/symmetry.js" defer></script>\n<script src="js/margins.js" defer></script>\n<script src="js/sortgrid.js" defer></script>\n<script src="js/edit.js" defer></script>\n</body>\n</html>\n'

# ---- Pages --------------------------------------------------------------
os.makedirs(OUT, exist_ok=True)
import canvas as CV
LAYOUT = json.load(open('layout.json'))
# positions and sizes saved with the in-page Edit tool (page key -> element id -> x, y, w, h[, fit])
EDITS = json.load(open('edits.json')) if os.path.exists('edits.json') else {}
EDITS = EDITS.get('pages', EDITS)
# when the last saved edits file (now built in) was made: the Edit tool then forgets edits up to that time
EDITS_SAVED = json.load(open('edits_meta.json')).get('saved', '') if os.path.exists('edits_meta.json') else ''
# P2 picture 2 flipped left-right (Nov 2026) so the square is on the left; its labels were kept readable
CV.MIRRORED.add('images/P2/P2-02_circle-square-triangle-to-rt.png')
# Picture moves between pages: (from page, file name part) -> to page. The picture keeps its size and crop;
# on its new page it is centred under the title, below anything already there.
# A text block is matched by the words it starts with; 'top' puts it first on the new page (above what is there).
MOVES = [('MODEL', 'MODEL-06_tetrahelix-1st-triangle-orientation-studies', 'TILT', 'end'),
         ('MODEL', 'Rotation Angle for 1st Bottom Face', 'TILT', 'top')]
# Groups move together, keeping their arrangement: (from page, [file name parts], to page)
GROUP_MOVES = [('MODEL', ['MODEL-10_tetrawave-centroid', 'MODEL-09_image', 'GRID-13_tetrawave-core'], 'DNA')]
_media0 = json.load(open('media_index.json'))
# Pictures taken off a page for now (they show in the Sorting Grid's Unassigned column): (page, file name part)
UNASSIGN = [('PRE', 'PRE-01_prekundalini-artwork'), ('POST', 'PRE-01_prekundalini-artwork'),
            # P2-S3 pictures 9-11 taken off the page (8 Nov); each is still used on other pages
            ('MODEL', 'MODEL-08_tetrahelixgeometry-1'), ('MODEL', 'MODEL-11_image'), ('MODEL', 'GRID-05_tetrawave-cad-model-light-trace-lines-core')]
for pg_key, part in UNASSIGN:
    pg_items = LAYOUT[pg_key]['items']
    gone = [it for it in pg_items if it['t'] == 'I' and part in _media0.get(CV.canon(it['src']), [''])[0]]
    for it in gone:
        pg_items.remove(it)
        for o in pg_items:                       # close the gap it leaves
            if o['b'][1] > it['b'][1]: o['b'][1] -= it['b'][3]
for frm, parts, to in GROUP_MOVES:
    src_page = LAYOUT[frm]
    grp = [it for it in src_page['items'] if it['t'] == 'I' and any(p in _media0.get(CV.canon(it['src']), [''])[0] for p in parts)]
    if not grp: continue
    dest = LAYOUT.setdefault(to, {'items': []})
    top = min(it['b'][1] for it in grp)
    start = max([d['b'][1] + d['b'][3] for d in dest['items']] + [-40]) + 40
    for it in grp:
        src_page['items'].remove(it)
        moved = json.loads(json.dumps(it)); moved['b'][1] = it['b'][1] - top + start
        dest['items'].append(moved)
for frm, part, to, where in MOVES:
    src_page = LAYOUT[frm]
    pick = [it for it in src_page['items']
            if (it['t'] == 'I' and part in _media0.get(CV.canon(it['src']), [''])[0])
            or (it['t'] == 'T' and it.get('paras') and it['paras'][0][3].startswith(part))]
    for it in pick:
        src_page['items'].remove(it)
        dest = LAYOUT.setdefault(to, {'items': []})
        moved = json.loads(json.dumps(it))
        if where == 'top':
            for d in dest['items']:
                d['b'][1] += it['b'][3] + 30
            moved['b'] = [it['b'][0], 0, it['b'][2], it['b'][3]]
        else:
            bottom = max([d['b'][1] + d['b'][3] for d in dest['items']] + [-40]) + 40
            moved['b'] = [round((980 - it['b'][2]) / 2), bottom, it['b'][2], it['b'][3]]
        dest['items'].append(moved)
MEDIA = json.load(open('media_index.json'))          # canonical Wix id -> [web path, original width, original height]
DOCS = {d['href']: d['path'] for d in json.load(open('dlplan.json'))['docs']}
PAGE_BG = {'GIZA': ('video/giza-background.mp4', 'video/giza-background-poster.jpg')}

def tetra_text(it, inner, a):
    # The opening fades in one after another, each 2 s after the one before is fully in place:
    # "Tetrahedral Geometry / Discovery Time-line" -> "1966 On Growth & Form" -> "1967 World's Fair Expo-'67"
    first = it['paras'][0][3] if it['paras'] else ''
    if first.startswith('Tetrahedral Geometry'):
        return ('<h2 class="big two-line"><span>Tetrahedral Geometry</span><span class="sub">Discovery Time-line</span></h2>',
                ' data-anim="fade" data-seq="1"')
    if re.match(r'1966\s*-\s*On Growth', first):
        inner = re.sub(r'<h3 class="ph"[^>]*>1966\s*-\s*On Growth &amp; Form</h3>',
                       '<h3 class="big year-title"><span class="yr">1966</span><span>On Growth &amp; Form</span></h3>', inner, count=1)
        a = ' data-anim="fade" data-seq="2"'
    if first.strip() == '1967':
        inner = re.sub(r'<h3 class="ph"[^>]*>1967</h3>',
                       '<h3 class="big year-title"><span class="yr">1967</span><span>World&#x27;s Fair Expo-&#x27;67</span></h3>', inner, count=1)
        a = ' data-anim="fade" data-seq="3"'
    return inner.replace('<h3 class="ph"', '<h3 class="ss"'), a

def model_text(it, inner, a):
    if it['paras'] and it['paras'][0][3].startswith('MODELS'):
        return inner, ''   # "MODELS !!" is there as the page opens (was a fade after a delay)
    return inner, a

def p2_text(it, inner, a):
    if it.get('paper'):
        return open('paper_p2.html').read(), a
    if it.get('excerpt'):
        return open('excerpt_p2.html').read(), a
    return inner.replace('Ancient Scroll of 2D Symbols that when superimposed provide all the information for a Tetrahedron in 3D Space/Time',
                         'Ancient Scroll of 2D Symbols which when superimposed so that they have a common center provide all the information to construct a Tetrahedron in 3D Space.'), a

def p1_text(it, inner, a):
    # left column title in the Sub-section lettering
    inner = inner.replace('<p style="text-align:center">In 1985...<br>\xa0<br>A FULL-ON KUNDALINI AWAKENING!</p>',
                          '<h3 class="ss" style="text-align:center">In 1985...<br>\xa0<br>A FULL-ON KUNDALINI AWAKENING!</h3>')
    inner = inner.replace('<p style="text-align:justify">&quot;The Kundalini Crisis&quot;</p>\n', '')   # now under the PDF icon
    inner = inner.replace('<p style="text-align:justify">Medical Whitepaper 1985</p>\n', '')
    return inner, a

def p1_adjust(page):
    # Centre the middle column (photo, caption, PDF, text) exactly under the page title (x = 490);
    # the side columns shift slightly to keep even gaps.
    for it in page['items']:
        x, y, w, h = it['b']
        if it['t'] == 'D':                               # whitepaper PDF icon: half size, just under the page title, centred
            it['b'] = [490 - 14, -15, 28, 30]
            it['a'] = 'fadeIn'                           # fades in last (see HOOKS)
        elif 340 <= x < 480:                             # middle column: centre it on 490, under the icon + caption
            it['b'][0], it['b'][1] = round(490 - w / 2), y + 45
        elif x < 340:                                    # left column: trim 12px so its gap to the photo is 20px,
            it['b'][2] = w - 12                          # the same as the gap from the photo to the right column
            it['b'][1] = y + 25                          # (+25: kept where it was when the title had a 2nd line)
        else:                                            # right column: 10px left; the photos (and the text
            it['b'][0] = x - 10                          # below them) raised to sit 12px under the opening text
            it['b'][1] = (y - 32 if y >= 200 else y) + 25
    # the whitepaper's caption, moved from the text under the photo to just under the icon (13.4px)
    # "A Kundalini Crisis" above the icon, "Medical White Paper" below it
    page['items'].append({'t': 'T', 'b': [342, -40, 296, 25], 'a': 'fadeIn', 'cap': 'whitepaper-title',
                          'paras': [['', 11, 'c', '"A Kundalini Crisis"', []]]})
    page['items'].append({'t': 'T', 'b': [342, 16, 296, 20], 'a': 'fadeIn', 'cap': 'whitepaper',
                          'paras': [['', 11, 'c', 'Medical White Paper', []]]})
    return page

def coil_adjust(page):
    # "Motion" moves up to sit one blank line below the end of the poem, centred on the gap between the two
    # columns of verse (x = 188.5); the signature "Jrm - 1986" moves up with it, keeping its distance.
    lift = 1030 - 699
    for it in page['items']:
        if it['t'] == 'D':                  # PDF caption: "1st CONTACT" over "Narrative"
            it['text'] = '1st CONTACT - Narrative'
        x, y, w, h = it['b']
        if it['t'] == 'T' and it['paras'] and it['paras'][0][3].strip() == 'Motion':
            it['b'][0], it['b'][1], it['b'][2] = 108, y - lift, 161
        elif it['t'] == 'T' and it['paras'] and it['paras'][0][3].startswith('Jrm'):
            # initials at half size (21px -> 10.5px), and half as far below "Motion" (gap 122px -> 61px)
            it['b'][0], it['b'][1] = round(188.5 - w / 2), 722 + (y - lift - 722) // 2
            it['paras'][0][1] = 10.5
    # The whole poem (title, both columns, "Motion", initials) shares one centre line at x = 188.5;
    # move it so that line sits under the centre of "StarCoil" in the page title (x = 202.1).
    dx = 202.1 - 188.5 + 180            # (+180px: 2 inches toward the galaxy's core, then back 1/8 inch)
    for it in page['items']:
        first = it['paras'][0][3].strip() if it['t'] == 'T' and it.get('paras') else ''
        if it['b'][:2] == [-26, 113]: it['poem'] = 'L'
        if it['b'][:2] == [203, 114]: it['poem'] = 'R'
        if it.get('poem') or first.startswith(('Star', 'Motion', 'Jrm')):
            it['b'][0] = round(it['b'][0] + dx, 1)
            it['a'] = None                  # the poem is revealed line by line instead (coil_text + js/site.js)
        # the two columns 15px closer together (gap 29px -> 14px), each moving half way, so the centre line stays put
        if it.get('poem') == 'L': it['b'][0] = round(it['b'][0] + 7.5, 1)
        if it.get('poem') == 'R': it['b'][0] = round(it['b'][0] - 7.5, 1)
    return page

def tetra_adjust(page):
    # wording corrections
    for it in page['items']:
        for p in it.get('paras') or []:
            if p[3].startswith('"On Growth and Form", the seminal text'):
                p[3] = ('"On Growth and Form", the seminal text on biological morphology written by the mathematician '
                        '& biologist, D\'arcy Thompson. This was my first look at polyhedral forms and in particular, '
                        'tetrahedral morphology.')
    # the opening paragraph ("For over 50+ Years ...") moves up to sit just under "Discovery Time-line"
    for it in page['items']:
        if it['t'] == 'T' and it['paras'] and it['paras'][0][3].startswith('For over 50+'):
            it['b'][1] = 110
        # "1966 - On Growth & Form" and the paragraph after it move up together (98px) so "1966" sits about
        # 12px below the line dividing the upper and lower drawings in picture 1 (that line is at y = 270)
        if it['t'] == 'T' and it['b'][1] in (375, 613) and it['b'][0] == 514:
            it['b'][1] -= 98
        if it['t'] == 'T' and it['paras'] and it['paras'][0][3].startswith('Tetrahedral Geometry'):
            it['b'][0] = 513          # heading moved right half a letter (10px), in line with the paragraphs at 514
    # everything under the page title raised 1/4 inch
    for it in page['items']:
        it['b'][1] -= 24
    # picture 17 (Bucky's tetrahelix page) removed; its text "1986 - Synergetics ..." moves up between
    # pictures 2 & 3 and pictures 4 & 5, and everything from 4 & 5 down moves down to make room
    pic17 = [it for it in page['items'] if it['t'] == 'I' and 'TETRA-17' in MEDIA.get(CV.canon(it['src']), [''])[0]]
    syn = [it for it in page['items'] if it['t'] == 'T' and it.get('paras') and it['paras'][0][3].startswith('1986')]
    for it in pic17:
        page['items'].remove(it)
    if syn:
        s = syn[0]; at = 1456; room = s['b'][3] + 40
        for it in page['items']:
            if it is not s and it['b'][1] >= at:
                it['b'][1] += room
        s['b'][1] = at
    return page

def p2_adjust(page):
    # the "A Connection Between Dimensions" paper is set as real text (editable in paper_p2.html) in place of its picture
    for it in page['items']:
        if it['t'] == 'I' and 'P2-03' in MEDIA.get(CV.canon(it['src']), [''])[0]:
            it.update({'t': 'T', 'paper': True, 'paras': [['', 12, '', 'paper', []]]})
            # the text sat inside the picture with margins of about 55px each side and 47px at the top
            x, y, w, h = it['b']
            it['b'] = [x + 55, y + 3, w - 109, h - 3]    # raised so the title's capitals line up with the top of the scroll picture
    # the "Ancient Scroll of 2D Symbols ..." sub-heading is removed; everything below moves up to where it began
    for it in page['items']:
        if it['t'] == 'T' and it['paras'] and it['paras'][0][3].startswith("Japan's 1st Zen Temple"):
            it['paras'][0][3] = "A Bridge across Dimensions"   # (was "Japan's 1st Zen Temple")
            it['a'] = 'fadeIn'                 # fades in after the page title, which is already showing
            it['b'][0] -= 4                    # nudged 4px left
        else:
            it['b'][1] -= 70
            if it['t'] == 'T' and it['paras'] and it['paras'][0][3].strip() == "Japan's First Zen Temple":
                it['b'][2] = 440               # caption under the scroll on one line (as wide as the picture)
    # everything from "A Bridge across Dimensions" down raised 38px (half the old gap under the page title)
    for it in page['items']:
        it['b'][1] -= 38
    # a copy of the paper's closing passage ("It is intriguing ..." to the end, with its source line) as its own
    # text block under the circle / triangle / square diagram, the width of the scroll picture (text in excerpt_p2.html)
    dia = next(it for it in page['items'] if it['t'] == 'I' and 'P2-02' in MEDIA.get(CV.canon(it['src']), [''])[0])
    x, y, w, h = dia['b']
    page['items'].append({'t': 'T', 'b': [19, y + h + 22, 440, 600], 'excerpt': True, 'paras': [['', 12, '', 'excerpt', []]]})
    return page

def model_adjust(page):
    # "MODELS !!" centred exactly on the page (its Wix box sat 24.5px right of centre) and raised 20px;
    # everything below it raised 86px
    for it in page['items']:
        if it['t'] == 'T' and it['paras'] and it['paras'][0][3].startswith('MODELS'):
            it['b'][0] = round(490 - it['b'][2] / 2, 1)
            it['b'][1] -= 20
        else:
            it['b'][1] -= 86
    return page

def sketch_adjust(page):
    # the page title and the sub-heading under it are both there as the page opens (no fade, no delay)
    for it in page['items']:
        if it['t'] == 'T' and it['paras'] and it['paras'][0][3].startswith('Inception/Ideation'):
            it['a'] = None
            it['paras'][0][3] = 'Ideation & Intuitive Sketches'
            it['b'][1] -= 24                   # raised 1/4 inch
    return page

def helix_adjust(page):
    # the page title is there as the page opens; the sub-heading under it ("A Methodology combining ...") fades in
    for it in page['items']:
        if it['t'] == 'T' and it['paras'] and it['paras'][0][3].startswith('A Methodology combining'):
            it['a'] = 'fadeIn'
    return page

def tilt_adjust(page):
    # sub-heading at half size, tucked under the page title; the paragraph and photo below close up under it
    sub = [it for it in page['items'] if it['t'] == 'T' and it.get('paras') and it['paras'][0][3].startswith('Rotation Angle')]
    if sub:
        s = sub[0]; s['paras'][0][0] = 'H3'; s['paras'][0][1] = 16
        old_h = s['b'][3]; s['b'][1] = -24; s['b'][3] = 52
        lift = (old_h - s['b'][3]) + 24 + 10
        for it in page['items']:
            if it is not s: it['b'][1] -= lift
    return page

ADJUST = {'TILT': tilt_adjust, 'HELIX': helix_adjust, 'SKETCH': sketch_adjust, 'P1': p1_adjust, 'COIL': coil_adjust, 'TETRA': tetra_adjust, 'P2': p2_adjust, 'MODEL': model_adjust}

def helix_text(it, inner, a):
    # third line of the sub-heading 25% smaller
    return inner.replace('<br>(using only Straightedge and Compass)<br>',
                         '<br><span style="font-size:.75em">(using only Straightedge and Compass)</span><br>', 1), a

def coil_text(it, inner, a):
    # mark the poem's parts so js/site.js can reveal it line by line, top to bottom
    first = it['paras'][0][3].strip() if it.get('paras') else ''
    part = 'L' if it.get('poem') == 'L' else 'R' if it.get('poem') == 'R' else \
           'title' if first.startswith('Star') else 'motion' if first.startswith('Motion') else 'sig' if first.startswith('Jrm') else ''
    return inner, (f' data-poem="{part}"' if part else a)

NO_FADE = {'TETRA', 'P2'}
# items that are there as the page opens and then fade out: 'fade' or 'stay,fade' in milliseconds
# Pages made here (not on the Wix site): they start as an empty page, ready for pictures and text added with the Edit tool
NEW_PAGES = {'GOLD'}

# Extra space (px) between a page's lowest item and the Previous / Next blocks, on top of the usual 40px
LATE_PICTURES = {'SKETCH': '7000,2000'}   # page: 'start ms, fade ms' after the page opens
# a picture shown in two stages: (page, picture, overlay with its first part, overlay 'start,fade' ms, rest of the picture 'start,fade' ms)
STAGED = [('SKETCH', 'images/SKETCH/SKETCH-13_knapkin-energy-sketch-only.jpg', 'images/SKETCH/SKETCH-13b_knapkin-words.png', '0,0', '3000,2000,0.5')]   # the napkin: "Sound", "Light" and "Frequency" there at once, at full strength; the rest fades in to 50%
CANVAS_PAD = {'MODEL': 100, 'POST': 1000}
FADE_OUT = {'COIL': {'NT:mw8fl61pbibu': '1500,7200'}}   # the line 'Words from No-where !!??': stays 1.5 s, fades 7.2 s
# Sub-heading standard (set 5 Nov 2026 from Part II, Section 1): the top of a sub-heading's capitals sits 37px (3/8 inch)
# below the baseline of the page title. Each value is how far that page's content moves up (negative = down) to meet it.
SUBHEAD_SHIFT = {'SKETCH': -4, 'MODEL': 19, 'P3': 34, 'PRE': 58, 'POST': 58, 'HELIX': 36, 'TETRA': 25, 'BUILD': 36, 'TILT': -7, 'TORUS': 46}   # pages with no fade-ins at all

HOOKS = {
    'HELIX': {'text': helix_text},
    'P1': {'text': p1_text,
           # centre column fades in three times as slowly as usual (1.55 s -> 4.65 s)
           # the centre photo fades in slowly (0.25 s delay, 2.3 s); the PDF icon and its captions fade in last,
           # half a second after the photo has finished (from 3.075 s, taking 0.775 s)
           'style': lambda it: ';--fs-small:13.4px;--d:3075ms;--dur:775ms' if it.get('cap') == 'whitepaper'
                               else ';--fs-small:16.75px;--d:3075ms;--dur:775ms' if it.get('cap') == 'whitepaper-title'   # 25% larger
                               else ';--d:3075ms;--dur:775ms' if it['t'] == 'D'
                               else ';--d:250ms;--dur:2325ms' if 330 <= it['b'][0] < 480 else ''},
    # StarCoil: the right-hand column is dimmed so the poem on the left reads as primary
    'COIL': {'text': coil_text, 'style': lambda it: ';--d:3000ms;--dur:1500ms' if it['t'] == 'D'   # PDF button: waits 3 s, then fades in over 1.5 s (only its icon is dimmed, in site.css)
             else ';filter:opacity(.55);--align-star:1' if it['t'] == 'I' and it['b'][0] == 813   # Egyptian adept (see js/site.js)
             else ';filter:opacity(.55)' if it['b'][0] >= 480
             else ';--text:#ffffff;--axis:202.1' if it.get('poem') == 'L'   # poem, left column: bright white
             else ';--text:#d2d2d2;--axis:202.1' if it.get('poem') == 'R'   # poem, right column: light grey (50% brighter than #8c8c8c)
             else ';--axis:202.1' if it['b'][0] < 300                       # poem title, "Motion", initials
             else ''},
    'TETRA': {'text': tetra_text},
    'MODEL': {'text': model_text, 'style': lambda it: ';margin-top:-0.25in' if it.get('paras') and it['paras'][0][3].startswith('MODELS') else ''},
    'P2': {'text': p2_text},
}

for part, pages in OUTLINE[1:]:
    for key, title, fname in pages:
        heading = '3D Exploration' if key == 'MODEL' else title
        fade = ''   # page titles are there as the page opens, on every page (no fade)
        body = f'<h1 class="page-title"{fade}><span class="k">{key}</span>{E(heading)}</h1>\n'
        if key == 'HELIX':   # page heading reads "Drawing a 2D Tetra-Helix" (Contents keeps the section's full name)
            body = re.sub(r'(<span class="k">HELIX</span>)[^<]*</h1>', r'\1Drawing a 2D Tetra-Helix</h1>', body, count=1)
        if key == 'SKETCH':  # page heading reads just "Inception" (Contents keeps the section's full name)
            body = re.sub(r'(<span class="k">SKETCH</span>)[^<]*</h1>', r'\1Inception</h1>', body, count=1)
        if key == 'P2':     # title nudged 3px right; 1 pt smaller (29 pt), its line kept the same height so nothing below moves
            body = body.replace('<h1 class="page-title">', '<h1 class="page-title" style="position:relative;left:3px;font-size:clamp(26px,4.4vw,38.67px);line-height:calc(1.15 * clamp(26px,4.4vw,40px))">', 1)
        if key == 'PRE':    # page heading on two lines: "An Art Portfolio", then "For Architecture Schools" at half the size (Contents keeps the full name)
            body = re.sub(r'(<span class="k">PRE</span>)[^<]*</h1>', r'\1An Art Portfolio<span class="h1-sub">For Architecture Schools</span></h1>', body, count=1)
        if key == 'PRE':    # 28 pt (37.33px) so the long title fits inside the page margins; its line kept the same height so nothing below moves
            body = body.replace('<h1 class="page-title">', '<h1 class="page-title" style="font-size:clamp(24.3px,4.1vw,37.33px);line-height:calc(1.15 * clamp(26px,4.4vw,40px))">', 1)
        if key == 'GOLD':   # the Phi symbol under the title
            body = body.replace('PHI is an Artifact</h1>', 'PHI is an Artifact<span class="phi-sym" aria-label="Phi">&#934;</span></h1>', 1)
        if key == 'COIL':   # page heading reads "First Download Transmission" (Contents keeps the section's full name)
            body = re.sub(r'(<span class="k">COIL</span>)[^<]*</h1>', r'\1First &ldquo;Download&rdquo; Transmission!?<span class="subtitle">A Message within a Message?</span></h1>', body, count=1)
            body = body.replace('<h1 class="page-title">', '<h1 class="page-title" style="position:relative">', 1)   # the subtitle hangs below it
        if key == 'P1':   # "Crisis" fades in with the whitepaper PDF icon, after the centre photo
            # the page heading is "Kundalini" with "Energy" under it at 18 pt (the Contents menu still says "Kundalini Crisis")
            body = body.replace('Kundalini Crisis</h1>', '<span class="t0" data-anim="fade" style="--d:1000ms">Spontaneous!!</span>Kundalini<span class="t2" style="font-size:30px">Energy</span></h1>')   # 10 pt line above, 18 pt sub-heading
        page = LAYOUT.get(key)
        if key in ADJUST and page:
            page = ADJUST[key](json.loads(json.dumps(page)))
        if key in SUBHEAD_SHIFT and page:   # standard: sub-heading capitals 37px (3/8") below the page title's baseline
            page = json.loads(json.dumps(page))
            for it in page['items']:
                it['b'][1] -= SUBHEAD_SHIFT[key]
        if (page and any(it['t'] in 'TI' for it in page['items'])) or key in NEW_PAGES:
            body += CV.render(key, page or {'items': []}, MEDIA, link, DOCS, HOOKS.get(key), EDITS.get(key))
            if key in CANVAS_PAD:   # more room above the Previous / Next blocks (js/site.js reads data-pad)
                body = re.sub(r'<div class="canvas" style="height:(\d+)px">', lambda m: f'<div class="canvas" data-pad="{CANVAS_PAD[key]}" style="height:{int(m.group(1)) + 40 + CANVAS_PAD[key]}px">', body, count=1)
            for eid, ms in FADE_OUT.get(key, {}).items():   # shown as the page opens, then fades away (js/site.js)
                body = body.replace(f'data-eid="{eid}"', f'data-eid="{eid}" data-fadeout="{ms}"', 1)
            for pg, pic, over, first, rest in STAGED:
                if pg != key: continue
                body = re.sub(rf'(<figure class="el el-I"[^>]*data-file="{re.escape(pic)}")(>)(<img [^>]*>)',
                              lambda m: f'{m.group(1)} data-stage="{rest}"{m.group(2)}{m.group(3)}<img class="stage-1" src="{over}" alt="" data-stage-1="{first}" decoding="async" style="left:0;top:0;width:100%;height:100%;object-fit:cover">', body, count=1)
            if key in LATE_PICTURES:   # every picture but the first (top-left) fades in later, all together (js/site.js reads data-late)
                figs = [(float(m.group(2)), float(m.group(3)), m.group(1)) for m in re.finditer(r'<figure class="el el-I" data-eid="([^"]*)"[^>]*data-y="([-\d.]+)"[^>]*style="left:([-\d.]+)px', body)]
                for _, _, eid in sorted(figs)[1:]:
                    body = body.replace(f'data-eid="{eid}"', f'data-eid="{eid}" data-late="{LATE_PICTURES[key]}"', 1)
            if key in NO_FADE:   # everything on this page is there as it opens: no fades or delays
                body = re.sub(r' data-(?:anim|seq)="[^"]*"', '', body)
        else:
            body += '<p class="empty-note">This section has no content yet. On the Wix site it is an empty page.</p>'
        bv, bp = PAGE_BG.get(key, ('video/background.mp4', 'video/background-poster.jpg'))
        open(os.path.join(OUT, fname), 'w').write(shell(key, title, body, bgvideo=bv, bgposter=bp))

# Home: hand-composed to match the Wix homepage (two title lines, credit, spinning graphic)
hp, hw, hh = IMG[canon('9c79f0_2e6f0d49e6d44dbdadb504a7e448352e~mv2.png')]
# The Spinor picture (replaced 4 Nov 2026; the earlier one is kept in images/HOME as HOME-01_...)
# 10 Nov 2026: new Spinor picture from Joe (HOME-04; full-size original in originals/HOME). HOME-02 and the re-centred HOME-03 are kept.
hp, hw, hh = 'images/HOME/HOME-04_spinor-tetrahelix-phi.jpg', 1400, 1394
home = f'''<section class="hero">
  <div class="hero-text" id="heroText">
  <p class="hero-small" data-anim="fade" style="--d:250ms"><span class="hs-big"><b class="cap">T</b>etra<b class="cap">W</b>ave</span><span>&amp;</span><span>The StarGate Poems</span></p>
  <h1 class="hero-title"><span data-anim="fade" style="--d:2100ms;--dur:1500ms">Discoveries</span><span class="ht-2" data-anim="fade" style="--d:3950ms;--dur:2550ms">In Tetrahedral Geometry</span></h1>
  <p class="hero-credit" data-anim="fade" style="--d:7100ms">Joseph Matto Architect AIA</p>
  </div>
  <!-- The "Spinor" -->
  <a class="hero-mark" id="mark" href="part-2-the-geometry.html" aria-label="Enter: Part II, The Geometry" data-anim="spin" data-file="{hp}">
    <img src="{hp}" width="{hw}" height="{hh}" alt="TetraWave symbol: a tetrahelix framework inside a circle and triangle">
  </a>
  <a class="hero-enter" href="pre-kundalini-artwork.html" data-anim="fade" style="--d:1600ms">Enter</a>
</section>'''
open(os.path.join(OUT, 'index.html'), 'w').write(shell('HOME', 'Discoveries in Tetrahedral Geometry', home, home=True))

cv = 'docs/ABOUT-01_cv-resume-2019-revised.pdf'
about = f'''<h1 class="sr-only">About Me</h1>
<section class="links-page about-links" data-anim="fade">
  <div class="about-top">
    <a href="{cv}" target="_blank" rel="noopener" data-anim="fade" style="--d:2000ms">Curriculum Vitae</a>
    <a href="http://joemattoarchitect.com/" target="_blank" rel="noopener" data-anim="fade" style="--d:3500ms">JoeMattoArchitects.com</a>
    <a href="https://www.houzz.com/pro/joemattoarchitects/__public" target="_blank" rel="noopener" data-anim="fade" style="--d:5000ms">Selected Architectural Portfolio at Houzz.com</a>
  </div>
  <p class="email-far"><a href="mailto:JoeMatto14@gmail.com" data-galaxy-center>JoeMatto14@gmail.com</a></p>
</section>'''
open(os.path.join(OUT, 'about-me.html'), 'w').write(shell('ABOUT', 'About Me', about))
contact = '''<h1 class="page-title"><span class="k">CONTACT</span>Contact</h1>
<section class="links-page" data-anim="fade">
  <p>Write to Joseph Matto at</p>
  <a href="mailto:JoeMatto14@gmail.com">JoeMatto14@gmail.com</a>
</section>'''
open(os.path.join(OUT, 'contact.html'), 'w').write(shell('CONTACT', 'Contact', contact))

# Font catalogue: every lettering style, set in "The Tetrahedral Lexicon"
W = 'The Tetrahedral Lexicon'
def spec(name, meta, sample_html):
    return f'<div class="spec"><p class="spec-meta"><b>{name}</b> · {meta}</p>{sample_html}</div>'
cat = f'''<h1 class="page-title">Font Catalogue</h1>
<section class="catalogue">
<h2 class="cat-group">Sections</h2>
{spec('Section heading', '30 pt · Cinzel · Medium · Gold', f'<p class="page-title spec-sample">{W}</p>')}
{spec('Sub-section', '18 pt · Cinzel · Regular · Pale gold', f'<div class="txt"><h3 class="ss">{W}</h3></div>')}
<h2 class="cat-group">Paragraphs</h2>
{spec('Paragraph heading', '24 pt · Cinzel · Regular · Pale gold', f'<div class="txt"><h3 class="ph">{W}</h3></div>')}
{spec('Paragraph', '12 pt · Source Sans 3 · Regular · Light grey', f'<div class="txt"><p>{W}</p></div>')}
{spec('Small paragraph', '10 pt · Source Sans 3 · Regular · Light grey', f'<div class="txt"><p class="small">{W}</p></div>')}
<h2 class="cat-group">Header &amp; menu</h2>
{spec('Site name (top left)', '18 pt · Cinzel · Semibold · Gold', f'<div class="brand spec-brand"><span>{W}</span></div>')}
{spec('Site subtitle (top left)', '9 pt · Cinzel · Regular · Pale gold', f'<div class="brand spec-brand"><small>{W}</small></div>')}
{spec('About Me / Contact', '10.5 pt · Cinzel · Regular · White', f'<span class="tl-link">{W}</span>')}
{spec('Contents button', 'about 10 pt · Cinzel · Semibold · Gold, capitals', f'<span class="toc-open spec-inline">{W}</span>')}
{spec('Part / Section address', 'about 7 pt · Cinzel · Semibold · Pale gold, capitals, narrowed', f'<p class="addr spec-addr">{W}</p>')}
{spec('Sound label', '9 pt · Source Sans 3 · Light · Warm grey', f'<span class="sound-label">{W}</span>')}
<h2 class="cat-group">Splash page</h2>
{spec('TetraWave line', 'about 25 pt · Cinzel · Regular · Pale gold, capitals', f'<p class="hero-small"><span class="hs-big">{W}</span></p>')}
{spec('&amp; line', 'about 15 pt · Cinzel · Regular · Pale gold, capitals', f'<p class="hero-small"><span>{W}</span><span class="tp-x"></span></p>')}
{spec('The StarGate Poems line', '18 pt · Cinzel · Regular · Pale gold, capitals', f'<p class="hero-small"><span>{W}</span></p>')}
{spec('Discoveries', 'up to 48 pt · Cinzel · Regular · Gold', f'<p class="hero-title"><span>{W}</span></p>')}
{spec('In Tetrahedral Geometry', 'up to 36 pt · Cinzel · Regular · Gold', f'<p class="hero-title"><span class="ht-2">{W}</span></p>')}
{spec('Name line', 'about 11 pt · Cinzel · Bold · White, spaced', f'<p class="hero-credit">{W}</p>')}
</section>'''
open(os.path.join(OUT, 'font-catalogue.html'), 'w').write(shell('FONTS', 'Font Catalogue', cat))

# Type palette: the same lettering samples in a floating, movable panel (js/typepal.js), shown with the
# header's "Type Palette" link. Samples start right at the panel's left edge; rows are packed tightly.
rows = re.findall(r'<div class="spec"><p class="spec-meta"><b>(.*?)</b> · (.*?)</p>(.*?)</div>\n', cat)
groups = re.findall(r'<h2 class="cat-group">(.*?)</h2>', cat)
pal = []
for part in re.split(r'(<h2 class="cat-group">.*?</h2>)', cat):
    m = re.match(r'<h2 class="cat-group">(.*?)</h2>', part)
    if m:
        pal.append('<p class="tp-group">' + m.group(1) + '</p>')
        continue
    for name, meta, sample in re.findall(r'<div class="spec"><p class="spec-meta"><b>(.*?)</b> · (.*?)</p>(.*?)</div>(?=\n)', part):
        pal.append(f'<div class="tp-row"><div class="tp-s">{sample}</div><p class="tp-name">{name} · {meta}</p></div>')
# Sorting grid (js/sortgrid.js): every picture on every page, numbered exactly as the pages number them
# (top to bottom; left to right where tops are within 40px; a sideways strip counts its pictures in order).
def page_pictures(fname):
    h = open(os.path.join(OUT, fname)).read()
    units = []
    for m in re.finditer(r'<(figure|div) class="el el-([IYG])"(?: data-eid="[^"]*")?(?: data-group="[^"]*")? data-y="(-?[\d.]+)"[^>]*?style="left:(-?[\d.]+)px[^>]*>(.*?)</(?:figure|div)>(?=\n)', h):
        kind, y, x, inner = m.group(2), float(m.group(3)), float(m.group(4)), m.group(5)
        srcs = re.findall(r'<img src="([^"]+)"', inner)
        units.append((y, x, srcs if kind in 'YG' else srcs[:1]))
    units.sort(key=lambda u: u[0])
    rows, out = [], []
    for u in units:
        if rows and u[0] - rows[-1][0][0] <= 40: rows[-1].append(u)
        else: rows.append([u])
    for row in rows:
        for u in sorted(row, key=lambda u: u[1]):
            out.extend(u[2])
    return out
DIMS = {v[0]: (v[1], v[2]) for v in MEDIA.values()}
for _k, _p in EDITS.items():          # pictures added with the Edit tool
    for _e in _p.values():
        if _e.get('new') and _e.get('path'): DIMS[_e['path']] = (_e.get('pw', 0), _e.get('ph', 0))
GRID_ALWAYS = {'PRE'}   # pages shown as a column in the Sorting Grid even while they have no pictures
grid = []
for part, pages in OUTLINE[1:]:
    for n, (k, t, f) in enumerate(pages, 1):
        pics = page_pictures(f) if f and os.path.exists(os.path.join(OUT, f)) else []
        if not pics and k not in GRID_ALWAYS: continue
        roman = re.match(r'Part ([IVX]+)', part).group(1)
        grid.append({'key': k, 'addr': f'Part {roman} · Sec {n}', 'short': f'{roman}·{n}', 'title': t, 'file': f,
                     'images': [{'src': s, 'file': s.split('/')[-1], 'w': DIMS.get(s, (0, 0))[0], 'h': DIMS.get(s, (0, 0))[1]} for s in pics]})
# Last column: pictures in the site's images folder that no page uses yet, and anything dropped into
# images/PENDING (list refreshed from the computer into images_on_disk.txt before each build).
used_srcs = {i['src'] for p in grid for i in p['images']}
on_disk = [l.strip() for l in open('images_on_disk.txt')] if os.path.exists('images_on_disk.txt') else []
extra = [s for s in on_disk if s and s not in used_srcs and not s.startswith(('images/ICONS/', 'images/HOME/'))]
extra.sort(key=lambda s: (not s.startswith('images/PENDING/'), s))
grid.append({'key': 'UNASSIGNED', 'addr': 'Unassigned', 'short': 'Un.', 'title': 'Extra / pending pictures', 'file': '',
             'images': [{'src': s, 'file': s.split('/')[-1], 'w': DIMS.get(s, (0, 0))[0], 'h': DIMS.get(s, (0, 0))[1],
                         'folder': s.split('/')[1]} for s in extra]})
open(os.path.join(OUT, 'js', 'sortgrid.js'), 'w').write(open('sortgrid.tmpl.js').read().replace('__DATA__', json.dumps(grid)))
open(os.path.join(OUT, 'js', 'typepal.js'), 'w').write(open('typepal.tmpl.js').read().replace('__ROWS__', json.dumps(''.join(pal))))

# Image index (the "where is this image?" list)
used = {}
for k, p in LAYOUT.items():
    for it in p['items']:
        if it['t'] == 'I':
            c = CV.canon(it['src'])
            if c in MEDIA: used.setdefault(MEDIA[c][0], []).append(k)
hp_ = MEDIA.get('9c79f0_2e6f0d49e6d44dbdadb504a7e448352e~mv2.png')
if hp_: used.setdefault(hp_[0], []).append('HOME')
rows = ['file,page key,page,used on,original width,original height,original wix file']
for c, (path, ow, oh) in sorted(MEDIA.items(), key=lambda kv: kv[1][0]):
    k = path.split('/')[1]
    on = ' '.join(dict.fromkeys(used.get(path, [])))
    rows.append(f'{path},{k},"{TITLES.get(k, k)}",{on},{ow},{oh},{c}')
for _k, _p in sorted(EDITS.items()):
    if _k.startswith('_'): continue   # the Upload tray's pictures are listed as pending (images/PENDING)
    for _e in _p.values():
        if _e.get('new') and _e.get('path') and not _e.get('hide'):
            rows.append(f"{_e['path']},{_k},\"{TITLES.get(_k, _k)}\",{_k},{_e.get('pw', '')},{_e.get('ph', '')},added in the Edit tool: {_e.get('name', '')}")
open(os.path.join(OUT, 'IMAGE-INDEX.csv'), 'w').write('\n'.join(rows) + '\n')
import shutil
for f in ('toolbox.js', 'site.js', 'ruler.js', 'guide.js', 'symmetry.js', 'margins.js', 'edit.js'):
    shutil.copy(f, os.path.join(OUT, 'js', f))
shutil.copy('site.css', os.path.join(OUT, 'css', 'site.css'))
print('built', sorted(os.listdir(OUT)))
