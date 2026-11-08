"""Render a page exactly as laid out on Wix: every element at its Wix position, size, crop and layer.

Layout data comes from layout.json (captured from the published Wix pages at the 980px site width).
Text keeps its Wix box and alignment but uses the lettering standard; when text grows taller than its
Wix box, js/site.js pushes everything below it down (as Wix does). Very large empty bands are shortened.
On phones (under 700px wide) the elements stack in reading order instead.
"""
import html, re, hashlib

E = html.escape
SITE_W = 980
GAP_MAX, GAP_TO = 260, 120          # empty bands taller than GAP_MAX px are shortened to GAP_TO px


def canon(src):
    m = re.search(r'media/([0-9a-z]{6}_[0-9a-f]{32}(?:~mv2)?)(?:_d_[\d_]+_s_[\d_]+)?(\.[a-z]+)', src or '')
    return (m.group(1) + m.group(2)) if m else None


def parse_transform(src):
    """Wix image URL -> (crop rect or None, mode 'fill'|'fit', alignment)."""
    crop = None
    m = re.search(r'/v1/crop/x_(\d+),y_(\d+),w_(\d+),h_(\d+)', src or '')
    if m:
        crop = tuple(int(v) for v in m.groups())
    mode = 'fit' if re.search(r'/v1/(?:crop/[^/]+/)?fit/', src or '') else 'fill'
    al = (re.search(r'[,/]al_([a-z]+)', src or '') or [None, 'c'])[1]
    return crop, mode, al


def placement(src, W, H, Ow, Oh):
    """CSS (left, top, width, height in % of the frame) so the original image shows exactly as on Wix."""
    crop, mode, al = parse_transform(src)
    cx, cy, cw, ch = crop if crop else (0, 0, Ow, Oh)
    if W <= 0 or H <= 0 or cw <= 0 or ch <= 0:
        return 0, 0, 100, 100
    s = max(W / cw, H / ch) if mode == 'fill' else min(W / cw, H / ch)
    ax = 0 if 'l' in al else 1 if 'r' in al else .5
    ay = 0 if 't' in al else 1 if 'b' in al else .5
    ox, oy = (W - cw * s) * ax, (H - ch * s) * ay
    left, top = ox - cx * s, oy - cy * s
    return left / W * 100, top / H * 100, Ow * s / W * 100, Oh * s / H * 100


def compress_gaps(items):
    """Shorten very tall empty bands. Returns a function mapping a Wix y to the new y."""
    spans = sorted((max(0, it['b'][1]), it['b'][1] + it['b'][3]) for it in items)
    cuts, end = [], None   # list of (y where gap ends, amount removed so far)
    removed = 0
    for top, bot in spans:
        if end is not None and top - end > GAP_MAX:
            removed += (top - end) - GAP_TO
            cuts.append((top, removed))
        end = bot if end is None else max(end, bot)

    def f(y):
        r = 0
        for at, rem in cuts:
            if y >= at - 1:
                r = rem
        return y - r
    return f


def anim_attr(a):
    if not a:
        return ''
    return ' data-anim="spin"' if 'spin' in a.lower() else ' data-anim="fade"'


def text_html(it, link):
    parts = []
    for tag, fs, al, text, links in it['paras']:
        body = E(text).replace('\n', '<br>')
        for lt, lu in links or []:
            lt = lt.strip()
            if lt and E(lt).replace('\n', '<br>') in body:
                href = link(lu)
                ext = ' target="_blank" rel="noopener"' if href.startswith('http') else ''
                body = body.replace(E(lt).replace('\n', '<br>'), f'<a href="{E(href)}"{ext}>{E(lt).replace(chr(10), "<br>")}</a>', 1)
        style = (' style="text-align:' + {'c': 'center', 'r': 'right', 'j': 'justify'}[al] + '"') if al else ''
        if fs >= 26:
            parts.append(f'<h3 class="ph"{style}>{body}</h3>')
        elif tag:   # a small Wix heading (a caption or label): heading lettering, but its Wix size so it keeps its place
            st = (style[:-1] + ';' if style else ' style="') + f'font-size:{fs}px"'
            parts.append(f'<h3 class="ph ph-wix"{st}>{body}</h3>')
        elif fs and fs <= 15:
            parts.append(f'<p class="small"{style}>{body}</p>')
        else:
            parts.append(f'<p{style}>{body}</p>')
    return '\n'.join(parts)


PDF_ICON = ('<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M2 2h26l10 10v38H2z" fill="#f4efe6" stroke="#8a7a5c" stroke-width="2"/>'
            '<path d="M28 2v10h10" fill="none" stroke="#8a7a5c" stroke-width="2"/>'
            '<text x="20" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#a3322a">PDF</text></svg>')


# pictures whose files have been flipped left-right since the Wix layout was made
MIRRORED = set()


def clean_html(h):
    """Text saved from the Edit tool: keep the markup and inline styles, drop anything that could run."""
    h = re.sub(r'(?is)<(script|style|iframe|object|embed)\b.*?</\1\s*>', '', h)
    h = re.sub(r'(?i)\s+on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', '', h)
    h = re.sub(r'(?i)\s+contenteditable(="[^"]*")?', '', h)
    h = re.sub(r'(?i)(href|src)\s*=\s*"\s*javascript:[^"]*"', r'\1="#"', h)
    return h


def element_id(it, img_info, seen):
    t = it['t']
    if t == 'I':
        c = canon(it['src']); k = img_info[c][0] if c in img_info else c
    elif t == 'G':
        c = canon(it['slides'][0]['src']); k = img_info[c][0] if c in img_info else c
    elif t == 'T':
        k = re.sub(r'[^A-Za-z0-9]+', '', ' '.join(p[3] for p in it.get('paras') or []) or it.get('html') or '')[:28]
    elif t == 'D':
        k = it.get('href', '')
    elif t == 'B':
        k = it.get('text', '')
    else:
        k = hashlib.md5(repr((it.get('svg'), it.get('bg'), it.get('col'), it['b'])).encode()).hexdigest()[:8]
    k = f'{t}:{k}'
    n = seen.get(k, 0); seen[k] = n + 1
    return k if n == 0 else f'{k}#{n}'


def render(key, page, img_info, link, docs, hooks=None, edits=None):
    """img_info: canonical id -> (web path, original width, original height). docs: pdf url -> local path."""
    # Wix slideshow galleries (items marked g): the slides sit side by side, mostly off the page; they become one
    # slideshow, centred, showing one slide at a time with arrows to step through them.
    slides = [it for it in page['items'] if it.get('g') and it['t'] == 'I']
    rest = [it for it in page['items'] if not (it.get('g') and it['t'] == 'I')]
    if slides:
        slides.sort(key=lambda it: it['b'][0])
        w, h = slides[0]['b'][2], slides[0]['b'][3]
        rest.append({'t': 'G', 'b': [round((SITE_W - w) / 2), slides[0]['b'][1], w, h], 'slides': slides, 'a': slides[0].get('a')})
    items = [it for it in rest if it['t'] in 'TIBSLRDYG' and it['b'][2] > 0
             and it['b'][0] < SITE_W and it['b'][0] + it['b'][2] > 0]   # skip items parked off the page
    ymap = compress_gaps(items)
    out = []
    seen = {}
    for z, it in enumerate(items):
        x, y, w, h = it['b']
        y2 = ymap(y)
        # a stable id for the in-page Edit tool, and any position/size saved with it
        eid = element_id(it, img_info, seen)
        ed = (edits or {}).get(eid)
        if ed and ed.get('hide'):   # removed in the Edit tool
            continue
        if ed:
            x, y2, w, h = ed['x'], ed['y'], ed['w'], ed['h']
        extra = (hooks or {}).get('style', lambda it: '')(it)
        if it['t'] in 'SR' and w >= 1400:   # a full-width band on Wix: stretch it across the window
            extra += ';left:calc(490px - 50vw);width:100vw'
        grp = f' data-group="{E(ed["g"])}"' if ed and ed.get('g') else ''   # grouped in the Edit tool
        base = (f'class="el el-{it["t"]}" data-eid="{E(eid)}"{grp} data-y="{y2}" data-h="{h}" '
                f'style="left:{x}px;top:{y2}px;width:{w}px;height:{h}px;z-index:{z + 1};--ar:{w}/{max(h, 1)}{extra}"')
        a = anim_attr(it.get('a'))
        t = it['t']
        if t == 'T':
            inner = text_html(it, link)
            if hooks and 'text' in hooks:
                inner, a = hooks['text'](it, inner, a)
            if ed and ed.get('html') is not None:   # text typed / styled in the Edit tool
                inner = clean_html(ed['html'])
            out.append(((y2, x), f'<div {base.replace("height:" + str(h) + "px;", "")} data-text{a}><div class="txt">{inner}</div></div>'))
        elif t == 'I':
            c = canon(it['src'])
            if c not in img_info:
                continue
            path, Ow, Oh = img_info[c]
            L, T, Wp, Hp = placement(it['src'], w, h, Ow, Oh)
            if path in MIRRORED:   # the picture file was flipped left-right: show the mirror of the same crop
                L = 100 - L - Wp
            if ed and ed.get('fit') == 'cover':   # re-proportioned in the Edit tool: the whole picture, cropped to fill
                k = max(w / Ow, h / Oh)
                Wp, Hp = Ow * k / w * 100, Oh * k / h * 100
                L, T = (100 - Wp) / 2, (100 - Hp) / 2
            alt = re.sub(r'^[A-Z0-9]+-\d+_', '', path.rsplit('/', 1)[-1].rsplit('.', 1)[0]).replace('-', ' ')
            if alt == 'image':
                alt = 'illustration'
            img = (f'<img src="{path}" alt="{E(alt)}" loading="lazy" decoding="async" '
                   f'style="left:{L:.3f}%;top:{T:.3f}%;width:{Wp:.3f}%;height:{Hp:.3f}%">')
            href = link(it.get('link') or '')
            if href:
                ext = ' target="_blank" rel="noopener"' if href.startswith('http') else ''
                img = f'<a href="{E(href)}"{ext}>{img}</a>'
            owner = path.split('/')[1]
            shared = '' if owner == key else f' data-shared="from {owner}"'
            out.append(((y2, x), f'<figure {base} data-file="{path}"{shared}{a}>{img}</figure>'))
        elif t == 'Y':   # one-row gallery: scroll sideways
            imgs = []
            for s in it['srcs']:
                c = canon(s)
                if c in img_info:
                    p, Ow, Oh = img_info[c]
                    imgs.append(f'<img src="{p}" alt="" loading="lazy" style="aspect-ratio:{Ow}/{Oh}" data-file="{p}">')
            out.append(((y2, x), f'<div {base} data-gallery{a}><div class="strip">{"".join(imgs)}</div>'
                                 f'<p class="strip-hint">Scroll sideways for more →</p></div>'))
        elif t == 'G':   # slideshow
            figs = []
            for i, s in enumerate(it['slides']):
                cid = canon(s['src'])
                if cid not in img_info:
                    continue
                path, Ow, Oh = img_info[cid]
                L, T, Wp, Hp = placement(s['src'], s['b'][2], s['b'][3], Ow, Oh)
                figs.append(f'<figure class="slide{" on" if not figs else ""}" data-file="{path}"><img src="{path}" alt="" loading="lazy" decoding="async" '
                            f'style="left:{L:.3f}%;top:{T:.3f}%;width:{Wp:.3f}%;height:{Hp:.3f}%"></figure>')
            n = len(figs)
            out.append(((y2, x), f'<div {base} data-slides{a}>{"".join(figs)}'
                                 f'<button class="sl-prev" type="button" aria-label="Previous picture">‹</button>'
                                 f'<button class="sl-next" type="button" aria-label="Next picture">›</button>'
                                 f'<span class="sl-count">1 / {n}</span></div>'))
        elif t == 'B':
            href = link(it.get('link') or '')
            tag = 'a' if href else 'span'
            attr = f' href="{E(href)}"' if href else ''
            out.append(((y2, x), f'<div {base}{a}><{tag} class="wbtn"{attr}>{E(it["text"])}</{tag}></div>'))
        elif t == 'S':
            svg = it.get('svg', '')
            if not svg:
                continue
            svg = re.sub(r'<svg', '<svg preserveAspectRatio="xMidYMid meet" width="100%" height="100%"', svg, count=1)
            href = link(it.get('link') or '')
            body = f'<a href="{E(href)}">{svg}</a>' if href else svg
            out.append(((y2, x), f'<div {base} aria-hidden="true"{a}>{body}</div>'))
        elif t == 'L':
            col = it.get('col') or 'rgba(245,202,151,.4)'
            if 'rgba' in col and col.replace(' ', '').endswith(',0)'):
                continue   # invisible line
            out.append(((y2, x), f'<div {base} aria-hidden="true"><hr style="border-color:{col}"></div>'))
        elif t == 'R':
            out.append(((y2, x), f'<div {base} aria-hidden="true"><div class="rect" style="background:{it["bg"]};border-radius:{it.get("br", "0")}"></div></div>'))
        elif t == 'D':
            local = docs.get(it['href'])
            if not local:
                continue
            label = E(it.get('text') or '')
            # Wix document button: the PDF icon, with its title underneath when it has one
            body = (f'<a class="doc{" doc-btn" if label else ""}" href="{local}" target="_blank" rel="noopener" title="{label or "Open the PDF"}">'
                    + '<img src="images/ICONS/pdf-icon.png" alt="">'
                    + ((''.join(f'<span class="l{i + 1}">{p}</span>' for i, p in enumerate(label.split(' - ', 1))))
                       if label else '<span class="sr-only">Open the PDF</span>') + '</a>')
            if a and '--d:' not in base:   # Wix fades document buttons in slowly: 2.25 s, starting 1.1 s after they come into view
                base = base[:-1] + ';--d:1100ms;--dur:2250ms"'
            out.append(((y2, x), f'<div {base}{a}>{body}</div>'))
    # pictures added with the Edit tool (dropped onto the page), now saved in the page's image folder
    for n, (eid, ed) in enumerate(sorted((edits or {}).items())):
        if not ed.get('new') or ed.get('hide'):
            continue
        x, y2, w, h = ed['x'], ed['y'], ed['w'], ed['h']
        grp = f' data-group="{E(ed["g"])}"' if ed.get('g') else ''
        if ed['new'] == 'text':   # a text box added by pasting in the Edit tool
            if ed.get('html'):
                out.append(((y2, x), f'<div class="el el-T" data-eid="{E(eid)}"{grp} data-y="{y2}" data-h="{h}" '
                                     f'style="left:{x}px;top:{y2}px;width:{w}px;z-index:{950 + n};--ar:{w}/{max(h, 1)}" data-text>'
                                     f'<div class="txt">{clean_html(ed["html"])}</div></div>'))
            continue
        if not ed.get('path'):
            continue
        alt = re.sub(r'^[A-Z0-9]+-\d+_', '', ed['path'].rsplit('/', 1)[-1].rsplit('.', 1)[0]).replace('-', ' ')
        out.append(((y2, x), f'<figure class="el el-I" data-eid="{E(eid)}"{grp} data-y="{y2}" data-h="{h}" '
                             f'style="left:{x}px;top:{y2}px;width:{w}px;height:{h}px;z-index:{900 + n};--ar:{w}/{max(h, 1)}" data-file="{ed["path"]}">'
                             f'<img src="{ed["path"]}" alt="{E(alt)}" loading="lazy" decoding="async" '
                             f'style="left:0;top:0;width:100%;height:100%;object-fit:cover"></figure>'))
    out.sort(key=lambda p: p[0])   # reading order for phones; z-index keeps Wix layering on screens
    height = max([ymap(it['b'][1]) + it['b'][3] for it in items] + [200])
    return f'<div class="canvas-wrap"><div class="canvas" style="height:{height}px">\n' + '\n'.join(h for _, h in out) + '\n</div></div>'
