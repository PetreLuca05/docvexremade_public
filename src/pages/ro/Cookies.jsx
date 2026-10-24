export default function Cookies() {
  return (
    <article className="doc">
      <h1>Politica de cookie-uri</h1>
      <p className="updated">Ultima actualizare: 25 octombrie 2026</p>
      <div className="callout">
        <strong>Acest site nu folosește cookie-uri</strong> și nici pixeli de urmărire. Vizitele le
        numărăm cu Plausible, care nu salvează nimic în browser și nu te identifică (vezi{' '}
        <a href="#statistici">mai jos</a>). În browserul tău site-ul poate salva doar limba pe care
        o alegi (română sau engleză), dacă o schimbi, și sesiunea contului, dacă te autentifici pe
        pagina Autentificare. Amândouă sunt cerute de tine, deci strict necesare, și nu îți cerem
        consimțământul printr-un banner.
      </div>
      <h2>Ce sunt cookie-urile</h2>
      <p>
        Cookie-urile sunt fișiere mici pe care un site le salvează în browserul tău. Potrivit art. 4
        alin. (5) din Legea nr. 506/2004 privind prelucrarea datelor cu caracter personal și
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
              <td>Statistici de vizitare fără cookie-uri (Plausible)</td>
              <td>Da, fără cookie-uri și fără nimic salvat în browser</td>
            </tr>
            <tr>
              <td>Cookie-uri de marketing sau ale terților</td>
              <td>Nu</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        În afară de scriptul de statistici Plausible, paginile nu încarcă scripturi, fonturi sau
        alte resurse de la terți. Doar paginile Autentificare și Contul meu (și Descărcare, cât ești
        autentificat) se conectează la Supabase, furnizorul conturilor DocVex. Fotografia de profil
        de la Google, dacă ai una, se încarcă de la Google. Tema (luminoasă sau întunecată) urmează
        setarea sistemului tău și nu este salvată.
      </p>
      <h2 id="statistici">Statistici de vizitare (Plausible)</h2>
      <p>
        Numărăm vizitele cu Plausible Analytics, un serviciu de statistici fără cookie-uri al
        Plausible Insights OÜ (Estonia), găzduit în Uniunea Europeană. Scriptul Plausible nu
        salvează și nu citește nimic în browserul tău: nici cookie-uri, nici local storage. Pentru
        fiecare pagină vizitată primește adresa paginii, site-ul de pe care ai venit, browserul,
        sistemul de operare, tipul dispozitivului și țara, regiunea și orașul deduse din adresa IP.
        Adresa IP nu este păstrată: ca să numere vizitatorii unici, Plausible folosește un cod
        calculat din adresa IP și browser împreună cu o valoare secretă schimbată zilnic, astfel că
        nu te poate recunoaște de la o zi la alta și nu te poate identifica.
      </p>
      <p>
        Numărăm și câteva acțiuni pe site, fără date despre tine: clicurile pe descărcare (sistemul,
        varianta și versiunea), începerea și finalizarea creării unui cont (cu planul ales),
        autentificarea (prin e-mail sau Google), cererea de resetare a parolei, trimiterea la plată
        și întoarcerea de la plată, întrebările puse asistentului (doar numărul lor, nu textul),
        schimbarea limbii, paginile inexistente (adresa lor) și clicurile pe linkuri către alte
        site-uri. Vedem doar totaluri. Fiindcă nu salvează și nu citește nimic pe dispozitivul tău,
        nu îți cerem consimțământul printr-un banner. Detalii despre prelucrare în{' '}
        <a href="confidentialitate.html#statistici">politica de confidențialitate</a>.
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
        Când te autentifici pe pagina <a href="autentificare.html">Autentificare</a>, browserul tău
        păstrează în local storage sesiunea contului (o valoare <code>sb-…-auth-token</code>), ca să
        rămâi autentificat până ieși din cont. Ea este folosită doar pentru a-ți arăta contul și
        planul și se șterge când apeși „Ieși din cont”. Plata se face pe pagina Stripe, care are
        propria{' '}
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
