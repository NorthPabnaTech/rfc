'use client';

import { useRouter } from 'next/navigation';

import { saveSettingsAction } from '@/actions/admin';
import type { SettingsDTO } from '@/types';
import { Form, FormCurrency, FormInput, FormSwitch, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { FormSection } from '@components/shared';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { MIN_RESELLER_WITHDRAWAL } from '@lib/constants';
import { type SettingsInput, settingsSchema } from '@lib/validators/settings';

export function SettingsForm({ settings }: { settings: SettingsDTO }) {
  const router = useRouter();
  const form = Form.useForm<SettingsInput>({
    schema: settingsSchema,
    defaultValues: {
      ...settings,
      supportEmail: settings.supportEmail ?? '',
      announcement: settings.announcement ?? '',
      whatsappDefaultMessage: settings.whatsappDefaultMessage ?? '',
      social: {
        facebook: settings.social.facebook ?? '',
        instagram: settings.social.instagram ?? '',
        tiktok: settings.social.tiktok ?? '',
        whatsapp: settings.social.whatsapp ?? '',
        youtube: settings.social.youtube ?? '',
      },
    },
  });
  const { isSubmitting, isDirty } = form.formState;

  return (
    <Form
      form={form}
      className="max-w-4xl gap-6"
      onFinish={async (values) => {
        const res = await saveSettingsAction(values);
        if (handleActionResult(res, form)) {
          form.reset(values);
          router.refresh();
        }
      }}
    >
      <Panel>
        <FormSection title="Store" icon="store">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormInput name="storeName" label="Store name" required />
            <FormInput name="tagline" label="Tagline" required />
            <FormInput name="supportPhone" label="Support phone" required />
            <FormInput name="supportEmail" label="Support email" type="email" />
            <FormInput name="address" label="Business address" required className="sm:col-span-2" />
            <FormInput
              name="announcement"
              label="Announcement bar"
              placeholder="e.g. Free delivery on orders over ৳3,000!"
              hint="Shown at the very top of the store. Leave blank for the default."
              className="sm:col-span-2"
            />
          </div>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection title="Delivery fees" icon="shipping">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <FormCurrency name="shippingFeeInsideDhaka" label="Inside Dhaka" required />
            <FormCurrency name="shippingFeeOutsideDhaka" label="Outside Dhaka" required />
            <FormCurrency
              name="freeShippingThreshold"
              label="Free delivery from"
              hint="0 = never free"
            />
          </div>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection title="Social links" icon="link">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormInput
              name="social.facebook"
              label="Facebook page URL"
              placeholder="https://facebook.com/…"
            />
            <FormInput
              name="social.instagram"
              label="Instagram URL"
              placeholder="https://instagram.com/…"
            />
            <FormInput
              name="social.tiktok"
              label="TikTok URL"
              placeholder="https://tiktok.com/@…"
            />
            <FormInput
              name="social.youtube"
              label="YouTube URL"
              placeholder="https://youtube.com/…"
            />
            <FormInput name="social.whatsapp" label="WhatsApp number" placeholder="01XXXXXXXXX" />
          </div>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection title="Website WhatsApp & Live Chat" icon="whatsapp">
          <div className="space-y-4">
            <FormSwitch name="whatsappEnabled" label="Enable website WhatsApp chat" />
            <FormSwitch
              name="whatsappProductEnabled"
              label="Enable product-specific WhatsApp messaging"
            />
            <FormTextarea
              name="whatsappDefaultMessage"
              label="Default general contact message"
              placeholder="Hello, I visited your website and would like to know more about your products and services."
              rows={3}
            />
          </div>
        </FormSection>
      </Panel>

      <Panel>
        <FormSection
          title="Reseller withdrawal fees"
          icon="money"
          description={`Charged on reseller withdrawals; the tier with the highest “from” amount that fits applies. Every fee must be less than the minimum withdrawal (৳${MIN_RESELLER_WITHDRAWAL}). No tiers = no fee.`}
        >
          <Form.List name="resellerWithdrawalFeeTiers">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map((f) => (
                  <div
                    key={f.key}
                    className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <FormCurrency name={[f.name, 'minAmount']} label="From amount" required />
                    <FormCurrency name={[f.name, 'fee']} label="Fee" required />
                    <div className="flex flex-col gap-1.5">
                      <span aria-hidden className="type-label invisible hidden sm:block">
                        Remove
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove fee tier"
                        onClick={() => remove(f.name)}
                      >
                        <Icon name="trash" size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                {fields.length < 10 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => add({ minAmount: MIN_RESELLER_WITHDRAWAL, fee: 0 })}
                  >
                    <Icon name="plus" size={14} /> Add fee tier
                  </Button>
                )}
              </div>
            )}
          </Form.List>
        </FormSection>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </Form>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-panel hairline rounded-xl2 p-5">{children}</div>;
}
