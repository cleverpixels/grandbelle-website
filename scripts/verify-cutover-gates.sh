#!/usr/bin/env bash
# Cutover gates. Usage: scripts/verify-cutover-gates.sh <base-url>
# Exit 0 when no FAIL line. WARN lines are owner decisions and do not fail the run.
set -u
BASE="${1:?usage: $0 <base-url>}"
BASE="${BASE%/}"
T="${TMPDIR:-/tmp}"
failed=0
pass(){ echo "PASS  $1"; }
fail(){ echo "FAIL  $1"; failed=1; }
warn(){ echo "WARN  $1"; }
PAGES="/ /about/ /get-a-quote/ /shipping-a-car/"

# Fails if the pattern appears on any of the given paths.
check_absent(){
  local name="$1" pat="$2"; shift 2
  local hit=""
  for p in "$@"; do
    if curl -sL -m 30 "$BASE$p" | grep -q -E "$pat"; then hit="$hit $p"; fi
  done
  if [ -z "$hit" ]; then pass "$name"; else fail "$name on:$hit"; fi
}

# G1 robots.txt is a real robots file, not the homepage
code=$(curl -s -m 30 -o "$T/gate-robots.txt" -w '%{http_code}' "$BASE/robots.txt")
if [ "$code" = 200 ] && grep -q '^User-agent:' "$T/gate-robots.txt"; then pass G1-robots; else fail "G1-robots status=$code"; fi

# G2 unknown path returns 404, not the homepage
code=$(curl -s -m 30 -o /dev/null -w '%{http_code}' "$BASE/no-such-page-xyz")
if [ "$code" = 404 ]; then pass G2-404; else fail "G2-404 status=$code"; fi

# G3 /track is its own page and must NOT send customers to the staff-only Dockets
# lookup (staff-only since 2026-11-01; customers hit a login there).
home=$(curl -sL -m 30 "$BASE/" | md5sum)
track=$(curl -sL -m 30 "$BASE/track" | md5sum)
if [ "$home" != "$track" ]; then pass G3-track-not-homepage; else fail G3-track-equals-homepage; fi
if curl -sL -m 30 "$BASE/track" | grep -q 'dockets.grandbelleinternational.com'; then
  fail G3-track-links-dockets; else pass G3-track-no-dockets-link; fi

# G4 security headers
hd=$(curl -sI -m 30 "$BASE/")
for h in strict-transport-security content-security-policy x-frame-options x-content-type-options referrer-policy; do
  if echo "$hd" | grep -qi "^$h:"; then pass "G4-$h"; else fail "G4-$h missing"; fi
done

# G5 no unsourced figures or reviews
check_absent G5-unsourced-figures '55K\+|>23\+<' $PAGES
check_absent G5-unsourced-reviews 'Customer review' $PAGES

# G6 quote request path exists (marker attribute set by Task 13)
if curl -sL -m 30 "$BASE/get-a-quote/" | grep -q 'data-quote-request'; then
  pass G6-quote-request-path; else fail G6-quote-request-path-missing; fi

# G7 copy must be true
check_absent G7-no-one-field 'One field' /
check_absent G7b-no-untrue-tracking-promise 'Your tracking number returns the status' /

# G8 no sample-figure notices on the live site
check_absent G8-no-sample-notice 'Sample figure|Sample US|samples in' $PAGES

# G9 placeholder photography (owner decision D5; WARN only)
n=0
for p in $PAGES; do
  c=$(curl -sL -m 30 "$BASE$p" | grep -c 'Photography placeholder')
  n=$((n + c))
done
if [ "$n" = 0 ]; then pass G9-photos; else warn "G9-photos $n placeholder labels (decision D5)"; fi

# G9b the full illustrative phrase must stay in the HTML (owner decision D5).
# These two pages carry the illustrative images; the visible ribbon says
# "Illustrative" only, so the full sentence has to remain in the markup.
for p in / /shipping-a-car/; do
  if curl -sL -m 30 "$BASE$p" | grep -q 'Illustrative, not real photos of GrandBelle'; then
    pass "G9b-illustrative-phrase $p"
  else
    fail "G9b-illustrative-phrase missing on $p"
  fi
done

# G10 old WordPress addresses the owner approved on 2026-11-03 must 301 to the new
# routes (brief 2026-11-03-site-redirects-brief.md). Every address is listed in
# public/_redirects twice: with the trailing slash and bare. Pages matches a rule on
# the literal request path and does not normalise it into the rule first (measured on
# the branch preview 2026-11-03: /about-us 404s, /about-us/ 301s, while the /about
# asset itself still 308s to /about/), so both forms have to be covered here.
g10_check(){
  local p="$1" want="$2" hdr status where
  hdr=$(curl -sI -m 30 "$BASE$p")
  status=$(printf '%s\n' "$hdr" | awk 'NR==1{print $2}')
  where=$(printf '%s\n' "$hdr" | awk 'tolower($1)=="location:"{print $2; exit}' | tr -d '\r')
  if [ "$status" = 301 ] && [ "$where" = "$want" ]; then
    printf ''
  else
    printf ' (%s -> %s/%s, wanted 301 %s)' "$p" "$status" "$where" "$want"
  fi
}
while read -r slash bare want; do
  bad="$(g10_check "$slash" "$want")$(g10_check "$bare" "$want")"
  if [ -z "$bad" ]; then
    pass "G10-redirect $slash (+ bare $bare) -> $want"
  else
    fail "G10-redirect $slash:$bad"
  fi
done <<'G10LIST'
/contact-us/ /contact-us /about/
/contact-us-2/ /contact-us-2 /about/
/track-form/ /track-form /track/
/track-shipment/ /track-shipment /track/
/track-your-package/ /track-your-package /track/
/blogs/ /blogs /
/shop-ship-with-grandbelle/ /shop-ship-with-grandbelle /shop-and-ship/
G10LIST

# G10b the retired staff dashboard must stay 404: no redirect may be added for it.
g10b=""
for p in /gb-dashboard/ /receiving/ /print-label/; do
  code=$(curl -s -m 30 -o /dev/null -w '%{http_code}' "$BASE$p")
  [ "$code" = 404 ] || g10b="$g10b $p=$code"
done
if [ -z "$g10b" ]; then pass G10b-staff-dashboard-404; else fail "G10b-staff-dashboard-not-404 on:$g10b"; fi

# G11 /shop-and-ship/ replaces the live WordPress /shop-ship-with-grandbelle/:
# a real page with the two offers, the Valley Stream address and the single
# WhatsApp line, and none of the things the old page carried that must not
# survive — an enquiry form, the retired +1 (516) 554-2016 line, or the
# "anywhere in the world" claim (the corridor is the United States to Nigeria
# and West Africa). The US support line +1 (516) 256-5666 is live again
# (owner, 2026-11-10), so it must be PRESENT here, not absent as it was while
# the phones were down.
SHOP_PATH=/shop-and-ship/
shop_code=$(curl -s -m 30 -o "$T/gate-shop.html" -w '%{http_code}' "$BASE$SHOP_PATH")
if [ "$shop_code" = 200 ]; then pass G11-shop-and-ship-200; else fail "G11-shop-and-ship status=$shop_code"; fi
if grep -q 'Hook Creek' "$T/gate-shop.html"; then pass G11-shop-address; else fail G11-shop-address-missing; fi
for w in wa.me/13477128862; do
  if grep -q "$w" "$T/gate-shop.html"; then pass "G11-shop-whatsapp $w"; else fail "G11-shop-whatsapp missing $w"; fi
done
if grep -q 'wa.me/15165542016' "$T/gate-shop.html"; then fail G11-shop-retired-whatsapp; else pass G11-shop-no-retired-whatsapp; fi
if grep -q '<form' "$T/gate-shop.html"; then fail G11-shop-has-form; else pass G11-shop-no-form; fi
if grep -q '256-5666' "$T/gate-shop.html"; then pass G11-shop-support-line; else fail G11-shop-support-line-missing; fi
if grep -q '554-2016' "$T/gate-shop.html"; then fail G11-shop-retired-number; else pass G11-shop-no-retired-number; fi
if grep -qi 'anywhere in the world' "$T/gate-shop.html"; then fail G11-shop-anywhere-claim; else pass G11-shop-no-anywhere-claim; fi
# The sitemap integration writes sitemap-index.xml pointing at sitemap-0.xml.
# The <loc> there is absolute (the canonical site URL), so take the file name
# only and re-fetch it from the base URL under test.
smname=$(curl -s -m 30 "$BASE/sitemap-index.xml" | grep -o '<loc>[^<]*</loc>' | head -1 | sed 's/<[^>]*>//g' | sed 's#.*/##')
[ -n "$smname" ] || smname=sitemap-0.xml
smchild="$BASE/$smname"
if curl -s -m 30 "$smchild" | grep -q "<loc>[^<]*$SHOP_PATH</loc>"; then
  pass G11-shop-in-sitemap
else
  fail "G11-shop-not-in-sitemap ($smchild)"
fi

# G12 primary navigation (owner decision 2026-11-03, card t_3f26d3a5): the
# header on / carries exactly five links in this order — Services, Shop & ship,
# Ship a car, Track a shipment, About — with no "Home" text link (the logo goes
# home) and exactly one "Get a quote" button. Positions are byte offsets inside
# the <header> element so a reordering cannot hide behind the rest of the page.
curl -sL -m 30 "$BASE/" -o "$T/gate-home.html"
hdr=$(tr '\n' ' ' < "$T/gate-home.html" | grep -o '<header class="site-header".*</header>' | head -1)
if [ -z "$hdr" ]; then
  fail G12-header-missing
else
  g12ok=1
  last=-1
  for h in '/#services' '/shop-and-ship/' '/shipping-a-car/' '/track/' '/about/'; do
    pos=$(printf '%s' "$hdr" | grep -bo "href=\"$h\"" | head -1 | cut -d: -f1)
    if [ -z "$pos" ]; then
      fail "G12-nav-missing $h"; g12ok=0; break
    elif [ "$pos" -le "$last" ]; then
      fail "G12-nav-out-of-order $h"; g12ok=0; break
    fi
    last=$pos
  done
  [ "$g12ok" = 1 ] && pass G12-nav-five-in-order
  if printf '%s' "$hdr" | grep -q '>Home<'; then
    fail G12-nav-home-link
  else
    pass G12-nav-no-home-link
  fi
  n=$(printf '%s' "$hdr" | grep -o 'class="btn btn--primary header__action"' | wc -l | tr -d ' ')
  if [ "$n" = 1 ]; then pass G12-one-quote-button; else fail "G12-quote-buttons $n (want 1)"; fi
fi

# G13 /what-can-i-ship/ states what may and may not be shipped, sourced only from
# the documented rules (Tawk KB article 13 and the sourcing guide): the five
# categories we handle, both official list URLs, and neither an enquiry form nor
# the retired +1 (516) 554-2016 line. The support line +1 (516) 256-5666 is live
# again (owner, 2026-11-10) and is expected here. /shop-and-ship/ must link to it.
RULES_PATH=/what-can-i-ship/
rules_code=$(curl -s -m 30 -o "$T/gate-rules.html" -w '%{http_code}' "$BASE$RULES_PATH")
if [ "$rules_code" = 200 ]; then pass G13-what-can-i-ship-200; else fail "G13-what-can-i-ship status=$rules_code"; fi
for u in https://customs.gov.ng/rules-guidelines/import-list https://fccpc.gov.ng/resources-library/publications/import-prohibition-list/; do
  if grep -qF "$u" "$T/gate-rules.html"; then pass "G13-official-list $u"; else fail "G13-official-list missing $u"; fi
done
for w in \
  'General cargo and packages' \
  'Bulk cargo and large consignments' \
  'Vehicles, through our auto shipping service' \
  'Consolidated household and personal effects' \
  'Commercial shipments'; do
  if grep -qF "$w" "$T/gate-rules.html"; then pass "G13-handles $w"; else fail "G13-handles missing $w"; fi
done
if grep -q '<form' "$T/gate-rules.html"; then fail G13-has-form; else pass G13-no-form; fi
if grep -q '256-5666' "$T/gate-rules.html"; then pass G13-support-line; else fail G13-support-line-missing; fi
if grep -q '554-2016' "$T/gate-rules.html"; then fail G13-retired-number; else pass G13-no-retired-number; fi
if grep -qF 'href="/what-can-i-ship/"' "$T/gate-shop.html"; then
  pass G13-linked-from-shop-and-ship
else
  fail G13-not-linked-from-shop-and-ship
fi
if curl -s -m 30 "$smchild" | grep -q "<loc>[^<]*$RULES_PATH</loc>"; then
  pass G13-what-can-i-ship-in-sitemap
else
  fail "G13-what-can-i-ship-not-in-sitemap ($smchild)"
fi

# G14 favicon set (owner request 2026-11-03, card t_ba07fbbe). Every page links the
# GrandBelle icons in its <head>; the icons and manifest are served, and the served
# /favicon.ico is not the stock Astro one. The 404 page is reached through a missing
# path because Pages serves dist/404.html there. The stock Astro ico is pinned by
# sha256 (measured on main@ef478bf) and cross-checked against origin/main while that
# ref still carries it, so this gate keeps working after the branch merges.
STOCK_ICO_SHA256=09d2ac08d8cca9b6e1f90221f345a8c4dd0371c64a0dc52b6f96fc589b1e3d67
fav_missing=""
for p in / /about/ /get-a-quote/ /shipping-a-car/ /track/ /shop-and-ship/ /what-can-i-ship/ /no-such-page-favicon; do
  body=$(curl -sL -m 30 "$BASE$p")
  printf '%s' "$body" | grep -q 'rel="icon"' || fav_missing="$fav_missing $p:icon"
  printf '%s' "$body" | grep -q 'rel="apple-touch-icon"' || fav_missing="$fav_missing $p:apple-touch"
  printf '%s' "$body" | grep -q 'rel="manifest"' || fav_missing="$fav_missing $p:manifest"
done
if [ -z "$fav_missing" ]; then pass G14-pages-link-icons; else fail "G14-pages-link-icons on:$fav_missing"; fi

ico_status=$(curl -s -m 30 -o "$T/gate-favicon.ico" -w '%{http_code}' "$BASE/favicon.ico")
ico_type=$(curl -sI -m 30 "$BASE/favicon.ico" | awk 'tolower($1)=="content-type:"{print $2; exit}' | tr -d '\r')
if [ "$ico_status" = 200 ] && printf '%s' "$ico_type" | grep -qi '^image/'; then
  pass "G14-favicon-ico ($ico_type)"
else
  fail "G14-favicon-ico status=$ico_status type=$ico_type"
fi
ico_now=$(sha256sum "$T/gate-favicon.ico" | cut -d' ' -f1)
repo_root=$(cd "$(dirname "$0")/.." && pwd)
ico_main=""
if git -C "$repo_root" rev-parse --verify -q origin/main >/dev/null 2>&1; then
  ico_main=$(git -C "$repo_root" show origin/main:public/favicon.ico 2>/dev/null | sha256sum | cut -d' ' -f1)
fi
if [ -n "$ico_main" ] && [ "$ico_main" != "$ico_now" ] && [ "$ico_main" != "$STOCK_ICO_SHA256" ]; then
  fail "G14-favicon-pin-drift origin/main=$ico_main pinned=$STOCK_ICO_SHA256"
elif [ "$ico_now" != "$STOCK_ICO_SHA256" ]; then
  pass G14-favicon-not-stock-astro
else
  fail "G14-favicon-is-stock-astro sha256=$ico_now"
fi
for f in /favicon-32x32.png /favicon-16x16.png /apple-touch-icon.png /icon-192.png /site.webmanifest; do
  c=$(curl -s -m 30 -o /dev/null -w '%{http_code}' "$BASE$f")
  if [ "$c" = 200 ]; then pass "G14-asset $f"; else fail "G14-asset $f status=$c"; fi
done
c=$(curl -s -m 30 -o /dev/null -w '%{http_code}' "$BASE/favicon.svg")
if [ "$c" = 404 ]; then pass G14-favicon-svg-404; else fail "G14-favicon-svg status=$c"; fi

# G15 exactly one WhatsApp button (owner ruling 2026-11-10, card t_7e7052c1).
# /shop-and-ship/ and /what-can-i-ship/ both map WHATSAPP_LINES, which now holds a
# single entry. The pair of buttons they drew must collapse to exactly one, with no
# empty second button left behind and no second number anywhere on either page.
g15=""
for p in "$SHOP_PATH" "$RULES_PATH"; do
  body=$(curl -sL -m 30 "$BASE$p")
  n=$(printf '%s' "$body" | grep -o 'class="btn btn--primary" href="https://wa.me/13477128862"' | wc -l | tr -d ' ')
  e=$(printf '%s' "$body" | grep -oE 'class="btn btn--secondary" href="https://wa\.me/[0-9]+"' | wc -l | tr -d ' ')
  r=$(printf '%s' "$body" | grep -c '554-2016')
  [ "$n" = 1 ] || g15="$g15 $p:whatsapp-buttons=$n"
  [ "$e" = 0 ] || g15="$g15 $p:empty-second-button=$e"
  [ "$r" = 0 ] || g15="$g15 $p:retired-number=$r"
done
if [ -z "$g15" ]; then pass G15-one-whatsapp-button; else fail "G15-one-whatsapp-button on:$g15"; fi

exit $failed
