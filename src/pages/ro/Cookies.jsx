export default function Cookies() {
  return (
    <article className="doc">
      <h1>Politica de cookie-uri</h1>
      <p className="updated">Ultima actualizare: 24 octombrie 2026</p>
      <div className="callout">
        <strong>Acest site nu folosește cookie-uri</strong>, pixeli de urmărire sau amprentarea
        browserului. În browserul tău poate salva doar limba pe care o alegi (română sau engleză),
        dacă o schimbi, și sesiunea contului, dacă te autentifici pe pagina Autentificare. Amândouă sunt
        cerute de tine, deci strict necesare, și nu îți cerem consimțământul printr-un banner.
      </div>
      <h2>Ce sunt cookie-urile</h2>
      <p>
        Cookie-urile sunt fișiere mici pe care un site le salvează în browserul tău. Potrivit art.
        4 alin. (5) din Legea nr. 506/2004 privind prelucrarea datelor cu caracter personal și
        protecția vieții private în sectorul comunicațiilor electronice, stocarea de informații pe
        echipamentul utilizatorului sau accesul la acestea este permisă doar cu acordul său, cu
        excepția celor strict necesare pentru furnizarea serviciului cerut.
      </p>
      <h2>Ce folosim</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Categorie</th>
              <th>Folosim?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cookie-uri strict necesare</td>
              <td>Nu</td>
            </tr>
            <tr>
              <td>Cookie-uri de preferințe</td>
              <td>Nu</td>
            </tr>
            <tr>
              <td>Stocare locală (local storage) pentru limba aleasă</td>
              <td>Da, strict necesară</td>
            </tr>
            <tr>
              <td>Stocare locală (local storage) pentru sesiunea contului</td>
              <td>Da, strict necesară, doar dacă te autentifici</td>
            </tr>
            <tr>
              <td>Cookie-uri de analiză (statistici)</td>
              <td>Nu</td>
            </tr>
            <tr>
              <td>Cookie-uri de marketing sau ale terților</td>
              <td>Nu</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Paginile nu încarcă scripturi, fonturi sau alte resurse de la terți. Doar paginile Autentificare
        și Contul meu (și Descărcare, cât ești autentificat) se conectează la Supabase, furnizorul
        conturilor DocVex. Fotografia de profil de la Google, dacă ai una, se încarcă de la Google. Tema (luminoasă sau
        întunecată) urmează setarea sistemului tău și nu este salvată.
      </p>
      <h2 id="limba">Limba aleasă</h2>
      <p>
        Când alegi o limbă din meniul site-ului, browserul tău păstrează valoarea{' '}
        <code>docvex-lang</code> („ro” sau „en”) în local storage, ca paginile să se deschidă în
        aceeași limbă și la vizita următoare. Valoarea rămâne doar pe dispozitivul tău: nu ne este
        trimisă și nu te identifică. Nu are dată de expirare; o poți șterge oricând din setările
        browserului (datele site-ului docvex.ro), iar site-ul revine la limba română.
      </p>
      <h2 id="sesiune">Sesiunea contului</h2>
      <p>
        Când te autentifici pe pagina <a href="autentificare.html">Autentificare</a>, browserul tău păstrează
        în local storage sesiunea contului (o valoare <code>sb-…-auth-token</code>), ca să rămâi
        autentificat până ieși din cont. Ea este folosită doar pentru a-ți arăta contul și planul
        și se șterge când apeși „Ieși din cont”. Plata se face pe pagina Stripe, care are propria{' '}
        <a href="https://stripe.com/cookies-policy/legal" rel="noopener">
          politică de cookie-uri
        </a>
        .
      </p>
      <h2>Linkuri către alte site-uri</h2>
      <p>
        Fișierul de instalare se descarcă direct de pe serverele GitHub, unde sunt publicate
        versiunile aplicației. GitHub are propria{' '}
        <a
          href="https://docs.github.com/site-policy/privacy-policies/github-cookies"
          rel="noopener"
        >
          politică de cookie-uri
        </a>
        , care se aplică cererii de descărcare.
      </p>
      <h2>Dacă se schimbă ceva</h2>
      <p>
        Dacă vom adăuga vreodată cookie-uri care nu sunt strict necesare, îți vom cere mai întâi
        acordul, cu posibilitatea de a le refuza la fel de ușor cum le accepți, și vom actualiza
        această pagină.
      </p>
      <p>
        Întrebări: vezi datele de contact din{' '}
        <a href="confidentialitate.html#operator">Politica de confidențialitate</a>.
      </p>
    </article>
  );
}
