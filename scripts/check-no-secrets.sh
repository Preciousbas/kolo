#!/usr/bin/env bash
# Fail if a tracked or untracked source file looks like a secret.
# Patterns are assembled so this file does not contain the literals it searches for.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
priv="$(printf '%s%s' 'sui' 'privkey1')"
pem="$(printf '%s%s' '-----' 'BEGIN')"
hex='[A-Fa-f0-9]{64}'
assign="(_PRIVATE_KEY|_API_KEY)[[:space:]]*[:=][[:space:]]*['\"]?${hex}"
# Catch 12- or 24-word mnemonics assigned to *_MNEMONIC (word pattern without embedding a seed).
word='[a-z]{3,10}'
mnemonic_assign="MNEMONIC[[:space:]]*[:=][[:space:]]*['\"]?(${word}[[:space:]]+){11}${word}(['\"]|$)|MNEMONIC[[:space:]]*[:=][[:space:]]*['\"]?(${word}[[:space:]]+){23}${word}(['\"]|$)"

while IFS= read -r f; do
  [ -z "$f" ] && continue
  base="$(basename "$f")"
  if [ "$base" != ".env.example" ]; then
    echo "tracked env file: $f"
    fail=1
  fi
done < <(git ls-files | grep -E '(^|/)\.env($|\.)' || true)

files=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  files+=("$f")
done < <({ git ls-files; git ls-files --others --exclude-standard; } | sort -u)

if [ "${#files[@]}" -gt 0 ]; then
  if grep -I -l -E "${priv}|${pem}|${assign}|${mnemonic_assign}" "${files[@]}" >/tmp/kolo-secret-files 2>/dev/null; then
    echo "secret pattern found in:"
    cat /tmp/kolo-secret-files
    fail=1
  fi
  rm -f /tmp/kolo-secret-files
fi

if [ "$fail" -ne 0 ]; then
  echo "secrets found"
  exit 1
fi
echo "no secrets found"
