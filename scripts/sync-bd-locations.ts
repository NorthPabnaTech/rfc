/**
 * Pulls Bangladesh divisions → districts → upazilas from bdapis.com and saves
 * them to src/lib/data/bd-locations.json, which the address dropdowns use.
 * The store never calls bdapis at runtime — re-run this only to refresh:
 *
 *   npm run sync:locations
 *
 * Dhaka city's own thanas (Badda, Mirpur…) aren't in bdapis; they're added
 * on top in src/lib/locations.ts.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://bdapis.com/api/v1.2';

type DivisionRow = { division: string; divisionbn: string };
type DistrictRow = { district: string; districtbn: string; upazilla: string[] };

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const body = (await res.json()) as { data: T };
  return body.data;
}

const byName = (a: string, b: string) => a.localeCompare(b, 'en');

async function main() {
  const divisions = await get<DivisionRow[]>(`${API}/divisions`);
  const out = [];
  for (const d of divisions) {
    const districts = await get<DistrictRow[]>(
      `${API}/division/${encodeURIComponent(d.division.toLowerCase())}`,
    );
    out.push({
      name: d.division.trim(),
      nameBn: d.divisionbn.trim(),
      districts: districts
        .map((x) => ({
          name: x.district.trim(),
          nameBn: x.districtbn.trim(),
          areas: [...new Set(x.upazilla.map((u) => u.trim()).filter(Boolean))].sort(byName),
        }))
        .sort((a, b) => byName(a.name, b.name)),
    });
  }
  out.sort((a, b) => byName(a.name, b.name));

  const districtCount = out.reduce((n, d) => n + d.districts.length, 0);
  const areaCount = out.reduce(
    (n, d) => n + d.districts.reduce((m, x) => m + x.areas.length, 0),
    0,
  );
  if (out.length !== 8 || districtCount !== 64) {
    throw new Error(`Unexpected data: ${out.length} divisions, ${districtCount} districts`);
  }

  const file = path.join(process.cwd(), 'src/lib/data/bd-locations.json');
  await writeFile(file, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ ${out.length} divisions, ${districtCount} districts, ${areaCount} upazilas`);
  console.log(`  → ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => {
  console.error('✗', e);
  process.exit(1);
});
