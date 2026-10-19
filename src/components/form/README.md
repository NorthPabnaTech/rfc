# Form

Antd-flavoured, reusable form components built on **react-hook-form** + the local UI kit.
Validation is uncontrolled and fast (RHF), the API reads like antd's `Form`.

## Quick start

```tsx
import { Form, FormInput, FormPassword, FormCheckbox } from '@/components/form';

type Values = { email: string; password: string; remember: boolean };

export function LoginForm() {
  const form = Form.useForm<Values>();

  return (
    <Form<Values> form={form} initialValues={{ remember: true }} onFinish={(v) => console.log(v)}>
      <FormInput name="email" label="Email" required placeholder="you@biz.com" />
      <FormPassword name="password" label="Password" required />
      <FormCheckbox name="remember" label="Remember me" />
      <button type="submit">Sign in</button>
    </Form>
  );
}
```

`<Form>` creates its own instance if you don't pass `form`, so for simple cases you can skip `useForm`.

## `<Form>` props

| prop             | purpose                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `form`           | instance from `useForm()` — omit to auto-create                                                                       |
| `initialValues`  | defaults for the auto-created instance (ignored if `form` is passed — set `useForm({ defaultValues })` there instead) |
| `schema`         | zod schema for the auto-created instance (ignored if `form` is passed)                                                |
| `onFinish`       | `(values) => …` called with typed values on valid submit                                                              |
| `onFinishFailed` | `(errors) => …` called when validation blocks submit                                                                  |
| `disabled`       | disable every field in the form                                                                                       |

To watch values, use `Form.useWatch({ control: form.control, name })` or `form.watch(...)`.

## The form instance (`useForm`)

It's a full react-hook-form instance plus antd-style helpers:

```ts
const form = useForm<Values>();

form.setFieldsValue({ email: 'a@b.com' }); // set many (parent → form)
form.setFieldValue('email', 'a@b.com'); // set one
form.getFieldsValue(); // read all
form.getFieldValue('email'); // read one
form.resetFields(); // back to initial/defaults
form.validateFields(); // -> Promise<boolean>

// native RHF is all still here:
form.watch('email');
form.handleSubmit(onFinish)(); // submit programmatically
```

Watch reactively in a component with `Form.useWatch({ control: form.control, name: 'email' })`.

## Fields

Ready-made fields = `<FormItem>` pre-wired to a control. One tag each:

- `FormInput` — text input; supports `prefix` / `suffix` (icon, text, any node)
- `FormPassword` — input with a built-in show/hide toggle on the right
- `FormNumber` — number input (stores a `number`, not a string)
- `FormTextarea`
- `FormSelect` — combobox; pass `items={[{ label, value }]}`
- `FormDatePicker` — calendar popover; value is a formatted string (default `YYYY-MM-DD`)
- `FormDateRangePicker` — value is `{ from?: string; to?: string }` (same format)
- `FormTimePicker` — system-styled 12h popover; value is a formatted string (default `HH:mm`)
- `FormCheckbox`, `FormSwitch` — boolean, inline label

All share: `name`, `label`, `required`, `hint`, `className` + the control's own props.
(`required` only renders the asterisk — validation comes from your zod schema.)

### Prefix / suffix (input group)

```tsx
<FormInput name="amount" label="Amount" prefix="$" suffix="USD" />
<FormInput name="site" label="Website" prefix={<Icon name="search" />} />
```

Built on the shadcn input-group (`ui/input-group.tsx`); the reusable control is
`ui/input-field.tsx` (`InputField`), which the date/time pickers visually match.

### Date & time

The pickers store a **formatted string** (dayjs), antd-style. `format` controls the
stored/submitted value; `labelFormat` controls only the displayed text.

```tsx
{/* submits "2026-06-09", but the trigger shows "09 Jun, 2026" */}
<FormDatePicker name="dob" label="Date of birth" labelFormat="DD MMM, YYYY" />

{/* submit each end in a custom format */}
<FormDatePicker name="dob" label="Date of birth" format="DD/MM/YYYY" />

<FormDateRangePicker name="stay" label="Stay" numberOfMonths={2} />

{/* submits "13:30", trigger shows "01:30 PM" */}
<FormTimePicker name="opensAt" label="Opens at" labelFormat="hh:mm A" />
```

| prop              | purpose                                          | default (date / time)  |
| ----------------- | ------------------------------------------------ | ---------------------- |
| `format`          | dayjs format for the **value** and default label | `YYYY-MM-DD` / `HH:mm` |
| `labelFormat`     | dayjs format for the **displayed label** only    | falls back to `format` |
| `minuteStep`      | time only — minute granularity                   | `1`                    |
| `disabledDate`    | date/range — `(current: Dayjs) => boolean`       | —                      |
| `disabledHours`   | time — `() => number[]` (24h numbers)            | —                      |
| `disabledMinutes` | time — `(selectedHour: number) => number[]`      | —                      |

Disabling is antd-style and pairs with the existing helpers in `lib/utils`
(`disablePastDates`, `disableBeforeDate`, `disablePastTimes`):

```tsx
<FormDatePicker name="dob" disabledDate={disablePastDates} />
<FormDateRangePicker name="stay" disabledDate={(d) => disableBeforeDate(d, dayjs())} />
<FormTimePicker name="opensAt" disabledHours={() => [0, 1, 2, 3, 4, 5, 22, 23]} />
```

`startMonth` / `endMonth` (bounds + year dropdown) and `captionLayout` are also
configurable on the date pickers.

## Nested fields

`name` accepts a path array, which nests the value:

```tsx
<FormInput name={['name', 'first']} label="First" />
<FormInput name={['name', 'last']} label="Last" />
// → values: { name: { first, last } }
```

## `Form.List` (dynamic lists)

antd-style dynamic rows, backed by react-hook-form's `useFieldArray`. The render
function receives the rows and `{ add, remove, move }`; address each item relative
to the list with `[field.name, '<field>']`:

```tsx
<Form.List name="contacts">
  {(fields, { add, remove }) => (
    <>
      {fields.map((field) => (
        <div key={field.key} className="flex gap-2">
          <FormInput name={[field.name, 'label']} label="Relation" />
          <FormInput name={[field.name, 'value']} label="Phone" />
          <Button type="button" onClick={() => remove(field.name)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" onClick={() => add({ label: '', value: '' })}>
        Add
      </Button>
    </>
  )}
</Form.List>
// → values: { contacts: [{ label, value }, …] }
```

`field.key` is a stable React key; `field.name` is the row index. Lists nest —
a `Form.List` inside another prefixes its children automatically.

## `<FormItem>` for anything custom

`FormItem` auto-wires `value` / `onChange` / `onBlur` into a single child control:

```tsx
<FormItem name="email" label="Email" required>
  <Input placeholder="any control that takes value + onChange" />
</FormItem>
```

For non-standard controls, map the value/change shape:

```tsx
<FormItem
  name="when"
  label="Date"
  valuePropName="value"
  trigger="onValueChange"
  getValueFromEvent={(v) => v}
>
  <MyDatePicker />
</FormItem>
```

Or take full control with a render function:

```tsx
<FormItem name="qty">
  {(field, state) => (
    <Stepper value={field.value} onChange={field.onChange} invalid={!!state.error} />
  )}
</FormItem>
```

## Validation (zod)

Validation is schema-driven — there's no per-field `rules` prop. Pass a `schema`
to `useForm` (or `<Form schema={…}>` for the auto-created instance); it's wired up
as the resolver, so messages flow to the matching fields automatically. The
`required` prop only renders the asterisk on the label.

```tsx
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  age: z.coerce.number().min(18, 'Must be 18+'),
});
type Values = z.infer<typeof schema>;

const form = Form.useForm<Values>({ schema });
// or: <Form<Values> schema={schema} onFinish={…}>
```

You can still pass your own `resolver` to `useForm` — it takes precedence over `schema`.

## Accessibility

Each field links its control to its message: the control gets `aria-invalid` and
`aria-describedby`, and the error text renders with `role="alert"` so screen
readers announce it. Validation errors also move focus to the first invalid field
(RHF's `shouldFocusError`), since the control's `ref` is wired through.
