/**
 * Field name paths, antd-style. A field can be addressed by a string, a number,
 * or an array of segments — arrays produce nested values:
 *
 *   name={['name', 'first']}  ->  values.name.first
 *   name={[0, 'price']}       ->  values[0].price   (inside a Form.List)
 */
export type NamePath = string | number | Array<string | number>;

/** Normalise any NamePath into an array of segments. */
export function toPathArray(name: NamePath): Array<string | number> {
  return Array.isArray(name) ? name : [name];
}

/** Join segments into the dot-path string react-hook-form expects (`a.0.b`). */
export function joinPath(parts: Array<string | number>): string {
  return parts.join('.');
}
