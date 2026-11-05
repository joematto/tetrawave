TETRAWAVE WEBSITE  (prototype: Home + Part II, The Geometry)
=============================================================

OPEN IT
  Double-click index.html. It opens in your web browser straight from this folder,
  with no internet or Wix needed (fonts load from Google if you're online).

WHERE THINGS ARE
  index.html                         Home (spinning symbol, video background)
  part-2-the-geometry.html           P2
  tetrahedron-fascination.html       TETRA
  3d-exploration-models.html         MODEL
  11-11-grid.html                    GRID
  tetrawave-build-sequence.html      BUILD
  3d-exploration-cad-models.html     CAD
  tetra-helix-2d-drawing-methods.html HELIX

  images/KEY/      The web-sized pictures each page shows, one folder per page key.
                   File names start with the key and number, e.g. images/GRID/GRID-03_...jpg
  originals/KEY/   The full-size originals from Wix, same names. Edit these, then save a
                   web copy (about 1800 px wide) over the matching file in images/KEY/.
  about-me.html, contact.html   linked from the top line on every page
  audio/           white-winds.mp3, the track the top-line Sound button plays
  docs/            ABOUT-01_cv-resume-2019-revised.pdf (Curriculum Vitae on About Me)
  video/           background.mp4 (your own Wix background video) and its still frame.
  css/site.css     Colours, fonts, spacing, and the Fade In / Spin In effects.
  js/site.js       Runs the effects, the Contents menu and the "#files" labels.
  IMAGE-INDEX.csv  Every image: its file, its page, the pages that use it, and its old Wix ID.
                   Opens in Excel or Numbers.

FIND AN IMAGE FROM THE PAGE
  Add  #files  to the end of a page's address in the browser
  (e.g.  .../11-11-grid.html#files ) and every picture shows its file path.

MEASURE ON SCREEN
  Add  #ruler  to the end of any page's address (e.g. .../index.html#ruler).
  Drag the ruler anywhere; arrow keys nudge it 1 px (Shift+arrow: 10 px).
  Rotate turns it vertical. The top edge is in inches (to 1/16"), the bottom edge in pixels.
  Calibrate once: hold a real ruler to the screen and press - / + until the inch marks match
  (Shift-click for big steps). Your setting is remembered in that browser.

SWAP A PICTURE
  Save the new picture into the page's images/KEY/ folder with the same file name as the
  old one. The page picks it up automatically. (Or open the .html file in a text editor
  and change the  src="images/..."  path.)

IMAGES USED ON MORE THAN ONE PAGE
  They live in the folder of the first page that uses them (for example, the CAD page shows
  images from images/GRID/ and images/MODEL/). IMAGE-INDEX.csv lists every page that uses each.

FOR RAPHAEL / HOSTING
  Plain static HTML, CSS and JS with no build step. Upload the whole folder (images, css,
  js, video and the .html files; originals/ is optional) to any web server.
