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
/shop-ship-with-grandbelle/ /shop-ship-with-grandbelle /
G10LIST

# G10b the retired staff dashboard must stay 404: no redirect may be added for it.
g10b=""
for p in /gb-dashboard/ /receiving/ /print-label/; do
  code=$(curl -s -m 30 -o /dev/null -w '%{http_code}' "$BASE$p")
  [ "$code" = 404 ] || g10b="$g10b $p=$code"
done
if [ -z "$g10b" ]; then pass G10b-staff-dashboard-404; else fail "G10b-staff-dashboard-not-404 on:$g10b"; fi

exit $failed
