#!/bin/sh
# Minnets två prov (MES-373), som dev/kolla.sh kör: RLS med två konton och bakåtfyllningen
# (prov-rls.mjs), och ett parti på localhost som fyller minnet (prov-parti.mjs). Båda kör
# migrationen i en Postgres i minnet (PGlite). PGlite installeras första gången, i
# dev/minnet/node_modules (utanför git, ~3 MB, kräver nät den gången).
# Skriver bara sammanfattningen; faller ett prov skrivs hela dess utskrift.
set -e
cd "$(dirname "$0")"
[ -d node_modules/@electric-sql/pglite ] || npm install --no-audit --no-fund --silent >&2
for p in prov-rls.mjs prov-parti.mjs; do
  ut=$(node "$p" 2>&1) || { echo "$ut"; exit 1; }
  echo "$ut" | tail -1
done
