export default function Cookies() {
  return (
    <article className="doc">
      <h1>Cookie policy</h1>
      <p className="updated">Last updated: 24 October 2026</p>
      <div className="callout">
        This English translation is provided for convenience. The Romanian version is the legally
        binding one.
      </div>
      <div className="callout">
        <strong>This site does not use cookies</strong>, tracking pixels or browser fingerprinting.
        In your browser it may save only the language you choose (Romanian or English), if you change
        it, and your account session, if you sign in on the Sign in page. You request both, so they
        are strictly necessary and we do not ask for your consent through a banner.
      </div>
      <h2>What cookies are</h2>
      <p>
        Cookies are small files that a website saves in your browser. Under Article 4(5) of Law no.
        506/2004 on the processing of personal data and the protection of privacy in the electronic
        communications sector, storing information on a user’s device, or accessing it, is permitted
        only with the user’s consent, except where it is strictly necessary to provide the service
        requested.
      </p>
      <h2>What we use</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Do we use it?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Strictly necessary cookies</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Preference cookies</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Local storage for the chosen language</td>
              <td>Yes, strictly necessary</td>
            </tr>
            <tr>
              <td>Local storage for the account session</td>
              <td>Yes, strictly necessary, only if you sign in</td>
            </tr>
            <tr>
              <td>Analytics (statistics) cookies</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Marketing or third-party cookies</td>
              <td>No</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The pages do not load scripts, fonts or other resources from third parties. Only the Sign in
        and My account pages (and Download, while you are signed in) connect to Supabase, the
        provider of DocVex accounts. A profile photo from Google, if you have one, loads from Google. The theme (light
        or dark) follows your system setting and is not saved.
      </p>
      <h2 id="limba">Chosen language</h2>
      <p>
        When you choose a language from the site menu, your browser keeps the value{' '}
        <code>docvex-lang</code> (“ro” or “en”) in local storage, so that the pages open in the same
        language on your next visit as well. The value stays only on your device: it is not sent to
        us and does not identify you. It has no expiry date; you can delete it at any time from your
        browser settings (the site data for docvex.ro), and the site then reverts to Romanian.
      </p>
      <h2 id="sesiune">Account session</h2>
      <p>
        When you sign in on the <a href="autentificare.html">Sign in</a> page, your browser keeps your
        account session in local storage (a <code>sb-…-auth-token</code> value), so that you stay
        signed in until you sign out. It is used only to show you your account and plan, and it is
        deleted when you press “Sign out”. Payment takes place on Stripe’s page, which has its own{' '}
        <a href="https://stripe.com/cookies-policy/legal" rel="noopener">
          cookie policy
        </a>
        .
      </p>
      <h2>Links to other sites</h2>
      <p>
        The installer is downloaded directly from GitHub’s servers, where the app’s releases are
        published. GitHub has its own{' '}
        <a
          href="https://docs.github.com/site-policy/privacy-policies/github-cookies"
          rel="noopener"
        >
          cookie policy
        </a>
        , which applies to the download request.
      </p>
      <h2>If anything changes</h2>
      <p>
        If we ever add cookies that are not strictly necessary, we will first ask for your consent,
        with the option to refuse them as easily as you accept them, and we will update this page.
      </p>
      <p>
        Questions: see the contact details in our{' '}
        <a href="confidentialitate.html#operator">Privacy Policy</a>.
      </p>
    </article>
  );
}
