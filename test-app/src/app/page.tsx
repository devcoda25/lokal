'use client';

import Link from 'next/link';
import {
  useTranslate,
  useLocale,
  useFormatters,
  useIsLoading,
  useHydrated,
  useSafeTranslations,
  T
} from '@lokal/react';

export default function HomePage() {
  // Use individual hooks for better tree-shaking
  const t = useTranslate();
  const { locale, setLocale, locales } = useLocale();
  const { formatDate, formatNumber } = useFormatters();
  const isLoading = useIsLoading();
  const isHydrated = useHydrated();
  const { t: safeT, isHydrated: isSafeHydrated } = useSafeTranslations();

  // Example data for demonstrations
  const items = 5;
  const price = 199.99;
  const today = new Date();
  const userCount = 1234;

  // Handle locale change
  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
  };

  if (isLoading) {
    return <div>Loading translations...</div>;
  }

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{t("page_welcome_to_my_app")}</h1>

      {/* Basic translation */}
      <p>{t("page_this_is_a_test_page_for_the_wrap_command")}</p>

      {/* T Component for JSX translations */}
      <p>
        <T>page_using_t_component</T>
      </p>

      {/* Pluralization */}
      <section style={{ marginTop: '20px' }}>
        <h2>Pluralization</h2>
        <p>{t.plural("items", { count: 1 })}</p>
        <p>{t.plural("items", { count: 5 })}</p>
        <p>Using hook: {t.plural("items", { count: items })}</p>
      </section>

      {/* Gender support */}
      <section style={{ marginTop: '20px' }}>
        <h2>Gender Support</h2>
        <p>{t.gender("user_action", { gender: 'male' })}</p>
        <p>{t.gender("user_action", { gender: 'female' })}</p>
        <p>{t.gender("user_action", { gender: 'other' })}</p>
      </section>

      {/* Date/Number formatting */}
      <section style={{ marginTop: '20px' }}>
        <h2>Date & Number Formatting</h2>
        <p>Formatted Date: {formatDate(today, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>Formatted Price: {formatNumber(price, { style: 'currency', currency: 'USD' })}</p>
        <p>Formatted Number: {formatNumber(userCount, { useGrouping: true })}</p>
        <p>Percentage: {formatNumber(0.75, { style: 'percent' })}</p>
      </section>

      {/* Locale switching */}
      <section style={{ marginTop: '20px' }}>
        <h2>Locale Switching</h2>
        <p>Current Locale: <strong>{locale}</strong></p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          {locales.map((loc: string) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              style={{
                padding: '8px 16px',
                background: locale === loc ? '#0070f3' : '#f5f5f5',
                color: locale === loc ? 'white' : 'black',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loc.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* SSR Hydration status */}
      <section style={{ marginTop: '20px' }}>
        <h2>SSR Status</h2>
        <p>Hydrated: {isHydrated ? '✅ Yes' : '⏳ No'}</p>
        <p>Safe Translations Hydrated: {isSafeHydrated ? '✅ Yes' : '⏳ No'}</p>
      </section>

      {/* Button with translation */}
      <button style={{ marginTop: '20px', padding: '10px 20px' }}>
        {t("page_click_me")}
      </button>

      {/* Link with translation */}
      <div style={{ marginTop: '20px' }}>
        <Link href="/about" passHref>
          <a target="_blank" rel="noopener noreferrer">{t("page_about_us")}</a>
        </Link>
      </div>

      {/* Image with alt text */}
      <div style={{ marginTop: '20px' }}>
        <img src="/image.png" alt="Hero Image" style={{ maxWidth: '100%' }} />
      </div>

      {/* Container with translation */}
      <div className="container" style={{ marginTop: '20px' }}>
        {t("page_content_here")}
      </div>
    </main>
  );
}
