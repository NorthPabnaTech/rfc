'use client';

import * as React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { FormListContext } from './context';
import { joinPath, type NamePath, toPathArray } from './path';

/** One row handed to the render function: a stable React key + its index name. */
export type FormListField = { key: string; name: number };

/** Mutators for the list, mirroring antd's `Form.List` operations. */
export type FormListOperations = {
  /** Append a new item (optionally seeded with default values). */
  add: (defaultValue?: unknown) => void;
  /** Remove the item at `index`. */
  remove: (index: number) => void;
  /** Move an item from one index to another. */
  move: (from: number, to: number) => void;
};

export type FormListProps = {
  /** Name of the array field (nested paths + parent lists supported). */
  name: NamePath;
  /** Render the rows. Address each item relative to the list, e.g. `[field.name, 'first']`. */
  children: (fields: FormListField[], operations: FormListOperations) => React.ReactNode;
};

/**
 * Dynamic list of fields, antd-style, backed by react-hook-form's useFieldArray:
 *
 *   <Form.List name="contacts">
 *     {(fields, { add, remove }) => (
 *       <>
 *         {fields.map((field) => (
 *           <div key={field.key}>
 *             <FormInput name={[field.name, 'label']} label="Label" />
 *             <FormInput name={[field.name, 'value']} label="Value" />
 *             <Button onClick={() => remove(field.name)}>Remove</Button>
 *           </div>
 *         ))}
 *         <Button onClick={() => add({ label: '', value: '' })}>Add</Button>
 *       </>
 *     )}
 *   </Form.List>
 */
export function FormList({ name, children }: FormListProps) {
  const form = useFormContext();
  const listPrefix = React.useContext(FormListContext);

  // Absolute path of this list (carries any enclosing list prefix).
  const pathParts = [...listPrefix, ...toPathArray(name)];
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: joinPath(pathParts),
  });

  const listFields: FormListField[] = fields.map((field, index) => ({
    key: field.id,
    name: index,
  }));

  const operations: FormListOperations = {
    add: (defaultValue = {}) => append(defaultValue as never),
    remove,
    move,
  };

  // Provide this list's path so nested fields resolve to `path.<index>.<field>`.
  return (
    <FormListContext.Provider value={pathParts}>
      {children(listFields, operations)}
    </FormListContext.Provider>
  );
}
