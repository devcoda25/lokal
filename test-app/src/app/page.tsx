import Link from 'next/link';
import { t } from 'react';

export default function HomePage() {
  return <main>
      <h1>{t("page_welcome_to_my_app")}</h1>
      <p>{t("page_this_is_a_test_page_for_the_wrap_command")}</p>
      <button>{t("page_click_me")}</button>
      <Link href="/about" passHref>
        <a target="_blank" rel="noopener noreferrer">{t("page_about_us")}</a>
      </Link>
      <img src="/image.png" alt="Hero Image" />
      <div className="container">{t("page_content_here")}</div>
    </main>;
}