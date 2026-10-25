export default function Confidentialitate() {
  return (
    <article className="doc">
      <h1>Privacy policy</h1>
      <p className="updated">Last updated: 25 October 2026</p>
      <div className="callout">
        This English translation is provided for convenience. The Romanian version is the legally
        binding one.
      </div>
      <p>
        This policy explains what personal data is processed when you visit this website and when
        you use the DocVex application, for what purpose, on what legal basis and what rights you
        have, under Regulation (EU) 2016/679 (the “GDPR”) and Law no. 190/2018 on measures
        implementing the GDPR.
      </p>
      <h2 id="operator">1. The controller</h2>
      <p>
        The data controller is <strong>[DE COMPLETAT: denumirea operatorului]</strong>, with its
        registered office at <strong>[DE COMPLETAT: adresa]</strong>, tax identification number
        (CUI) <strong>[DE COMPLETAT]</strong>, registered with the Trade Register under no.{' '}
        <strong>[DE COMPLETAT]</strong>.
      </p>
      <p>
        For any question or request concerning your data, you can write to us at{' '}
        <a href="mailto:[DE COMPLETAT: e-mail]">[DE COMPLETAT: e-mail de contact]</a>.
      </p>
      <p>
        We have not designated a data protection officer (DPO), as our activity does not meet the
        conditions of Article 37 GDPR; all data-related requests should be sent to the address
        above. Full identification details are available on the{' '}
        <a href="informatii-legale.html#identificare">Legal information</a> page.
      </p>
      <h2 id="site">2. Visiting this website</h2>
      <p>
        This website is static: it has no advertising, social media plugins or fonts loaded from
        third parties, and we count visits with a cookieless statistics service (see below). We do
        not set cookies; in your browser we keep only the language you choose and, if you sign in on
        the Sign in page, your account session (see the <a href="cookies.html">Cookie policy</a>).
      </p>
      <h3 id="statistici">Visit statistics</h3>
      <p>
        To know how the site is used (how many visitors it has, which pages they read, where they
        come from and what is downloaded) we use Plausible Analytics, from Plausible Insights OÜ
        (Estonia), with data hosted in the European Union; Plausible processes the data on our
        behalf (Article 28 GDPR). It uses no cookies and saves nothing on your device. It receives
        the page address, the referring site, the browser, the operating system, the device type and
        the IP address, from which it derives the country, region and city; the IP address is not
        kept, and unique visitors are counted with a code that changes daily and does not allow you
        to be identified. We also record the actions listed in the{' '}
        <a href="cookies.html#statistici">Cookie policy</a>, without data about you. We see only
        aggregate statistics. The legal basis is our legitimate interest in understanding and
        improving the site (Article 6(1)(f) GDPR).
      </p>

      <h3 id="cont">Your account and payment on the site</h3>
      <p>
        On the <a href="autentificare.html">Sign in</a> page you can create your DocVex account or
        sign in. Your name, email, password (kept only in hashed form) and chosen plan or, if you
        choose “Continue with Google”, the name, email and photo from your Google account are sent
        directly to Supabase, the provider of DocVex accounts, and make up the same account you use
        in the app (see section 3). The legal basis is entering into and performing the contract
        (Article 6(1)(b) GDPR). On the <a href="cont.html">My account</a> page you can see and
        change this data. If you download the app while signed in, the account keeps the version you
        downloaded, so that we can show you when a new one is out. Only the Sign in and My account
        pages and, while you are signed in, the Download page connect to Supabase. Your profile
        photo, if you have one from Google, loads directly from Google’s servers.
      </p>
      <p>
        Paid plans are paid on the checkout page hosted by Stripe Payments Europe, Ltd. (Ireland).
        You enter your card details directly with Stripe; we neither see nor keep them. Stripe sends
        us the payment confirmation, amount, plan and email, so that we can activate the plan on
        your account and meet our accounting and tax obligations (Article 6(1)(b) and (c) GDPR). We
        also keep a log of the events Stripe sends us (for example a subscription created, changed
        or cancelled, a payment succeeded or failed), with the customer and subscription
        identifiers, plan, status, amounts and periods, linked to your account, as the record of
        subscriptions; we keep it for as long as you have an account and then as long as accounting
        and tax obligations require. Stripe also processes data as an independent controller, under
        its{' '}
        <a href="https://stripe.com/privacy" rel="noopener">
          privacy policy
        </a>
        .
      </p>
      <h3 id="demografie">Gender and year of birth (optional)</h3>
      <p>
        When you create your account, on the <a href="cont.html">My account</a> page or in the app
        you may, if you wish, give your gender (female, male, other) and your year of birth. They
        are not required: the default is “Prefer not to say”, and your account and the app work the
        same without them. We use them only for aggregate statistics about who uses DocVex (for
        example how many users are in each age group and gender, and how many of them have a paid
        plan), seen only by DocVex’s administrators; we don’t use them for advertising, don’t sell
        them and make no decisions about you based on them. We ask for the year, not the full date
        of birth, to process as little data as possible. The legal basis is your consent (Art.
        6(1)(a) GDPR), which you withdraw at any time by choosing “Prefer not to say” in your
        account: the values are then deleted. They are kept in your Supabase account, with the date
        you gave them.
      </p>
      <h3 id="asistent">The “Ask about DocVex” assistant</h3>
      <p>
        On the home page you can ask an AI assistant questions about the app. Your question (and,
        for context, the earlier ones in the same conversation) is sent through Supabase to
        Anthropic, which generates the answer with its Claude model; we do not keep the questions or
        answers. For the limit of 5 questions a day we keep only a code derived irreversibly from
        your IP address and the date, with the number of questions, and delete it after a day. The
        legal basis is our legitimate interest in offering the assistant and preventing abuse
        (Article 6(1)(f) GDPR). Do not include personal or confidential data in your questions.
      </p>
      <h3 id="github">Hosting on GitHub Pages</h3>
      <p>
        The website and the installation files are hosted by GitHub, Inc. (GitHub Pages and GitHub
        Releases). In order to deliver and protect the pages, GitHub processes the visitor’s IP
        address and technical request data (browser, date and time), which it may temporarily retain
        in its logs. GitHub is a US company certified under the EU-U.S. Data Privacy Framework;
        details are available in the{' '}
        <a
          href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
          rel="noopener"
        >
          GitHub Privacy Statement
        </a>
        . The legal basis is our legitimate interest in making the website and the application
        available securely (Article 6(1)(f) GDPR).
      </p>
      <h2 id="aplicatie">3. Using the DocVex application</h2>
      <div className="callout">
        Your documents and projects remain on your computer. DocVex does not upload them to a server
        of its own. They leave your computer only when you use a feature that requires an external
        service, as described below.
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>Data</th>
              <th>Purpose and legal basis</th>
              <th>Recipient</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DocVex account</td>
              <td>E-mail, name, profile photo, authentication data</td>
              <td>Signing in to the application; performance of a contract (Article 6(1)(b))</td>
              <td>Supabase (authentication and database provider)</td>
            </tr>
            <tr>
              <td>AI legal research and “AI pass”</td>
              <td>Your questions, the text of documents or the attachments you choose to send</td>
              <td>
                Generating the answer or recognising references to legislation and CAEN codes; only
                at your request, performance of a contract (Article 6(1)(b))
              </td>
              <td>
                Anthropic (Claude models), via Google Cloud Vertex AI in the European Union or
                directly via the Anthropic API
              </td>
            </tr>
            <tr>
              <td>Searches in public sources</td>
              <td>Search terms</td>
              <td>Finding the requested legal acts, court cases, companies and lawyers</td>
              <td>
                legislatie.just.ro, EUR-Lex, portal.just.ro, ANAF, UNBR (each as an independent
                controller)
              </td>
            </tr>
            <tr>
              <td>Updates</td>
              <td>IP address, application version</td>
              <td>
                Checking for and downloading new versions; legitimate interest (Article 6(1)(f))
              </td>
              <td>GitHub, Inc.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        If the documents you send to an AI feature contain data about other people (for example,
        your clients), you decide what you send and you remain the controller for that data; DocVex
        transmits it to the AI provider solely in order to answer you. We recommend that you do not
        send special categories of data (Article 9 GDPR) or data relating to criminal convictions
        (Article 10 GDPR) unless you have a legal basis for doing so.
      </p>
      <p>
        Supabase and the AI providers (Anthropic, Google Cloud) process data on our behalf, as
        processors, on the basis of data processing agreements concluded in accordance with Article
        28 GDPR. We do not sell your data and we do not use it for advertising. The AI features are
        also described in the <a href="informatii-legale.html#ai">AI transparency</a> section.
      </p>
      <h2 id="transferuri">4. Transfers outside the EEA</h2>
      <p>
        Some providers (GitHub, Anthropic, Supabase, Stripe) are US companies or part of US groups.
        Transfers take place on the basis of the adequacy decision for the EU-U.S. Data Privacy
        Framework, where the provider is certified, or of the standard contractual clauses adopted
        by the European Commission (Articles 45 and 46 GDPR).
      </p>
      <h2 id="pastrare">5. How long we keep data</h2>
      <ul>
        <li>
          Account data: for as long as you have an account; we then delete it at your request or
          when the account is closed.
        </li>
        <li>
          Gender and year of birth: until you remove them from your account (by choosing “Prefer not
          to say”) or the account is closed.
        </li>
        <li>
          Text sent to AI features: we do not store it on a server of our own; the AI provider
          retains it only for as long as its terms provide.
        </li>
        <li>Hosting logs: for as long as GitHub retains them, in accordance with its policy.</li>
      </ul>
      <h2 id="drepturi">6. Your rights</h2>
      <p>Under Articles 15–22 GDPR, you have the right:</p>
      <ul>
        <li>of access to your data;</li>
        <li>to rectification of inaccurate data;</li>
        <li>to erasure of your data (the “right to be forgotten”);</li>
        <li>to restriction of processing;</li>
        <li>to data portability;</li>
        <li>to object to processing based on legitimate interest;</li>
        <li>not to be subject to a decision based solely on automated processing.</li>
      </ul>
      <p>
        To exercise your rights, write to us at the address given in section 1. Requests are free of
        charge; we may ask you for additional information only to confirm your identity. We respond
        within one month of receiving the request, a period that may be extended by a further two
        months for complex requests, in which case we will inform you (Article 12(3) GDPR).
      </p>
      <p>
        You also have the right to lodge a complaint with the{' '}
        <strong>
          Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal
        </strong>{' '}
        (the National Supervisory Authority for Personal Data Processing, ANSPDCP), B-dul G-ral.
        Gheorghe Magheru nr. 28–30, Sector 1, București,{' '}
        <a href="https://www.dataprotection.ro/" rel="noopener">
          www.dataprotection.ro
        </a>
        .
      </p>
      <h2 id="alte">7. Other mandatory information</h2>
      <ul>
        <li>
          <strong>Are you required to provide your data?</strong> Account data is necessary for you
          to sign in; without it you cannot use the features that require an account. The rest of
          the application and this website work without you providing any personal data (Article
          13(2)(e) GDPR).
        </li>
        <li>
          <strong>Automated decisions.</strong> We do not make decisions based solely on automated
          processing, including profiling, that produce legal effects concerning you (Article 22
          GDPR). AI answers are generated only at your request and you assess them yourself.
        </li>
        <li>
          <strong>Consent.</strong> We do not currently process data on the basis of consent. If we
          do so in the future, you will be able to withdraw it at any time, as easily as you gave
          it, without affecting prior processing (Article 7(3) GDPR).
        </li>
        <li>
          <strong>Minors.</strong> DocVex is aimed at professionals and is not intended for persons
          under the age of 16 (Article 8 GDPR).
        </li>
      </ul>
      <h2 id="securitate">8. Security</h2>
      <p>
        Communication with external services is encrypted (HTTPS). The access keys for the AI
        services are not exposed in the application interface.
      </p>
      <p>
        In the event of a personal data breach, we notify ANSPDCP within 72 hours at the latest, and
        if there is a high risk to your rights, we inform you without delay (Articles 33 and 34
        GDPR). Vulnerabilities can be reported as described on the{' '}
        <a href="informatii-legale.html#securitate">Legal information</a> page.
      </p>
      <h2 id="modificari">9. Changes</h2>
      <p>
        We may update this policy when the application or the legislation changes. The date of the
        last update is shown at the top of the page.
      </p>
    </article>
  );
}
