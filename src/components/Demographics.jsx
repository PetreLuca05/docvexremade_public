import { useLang } from '../i18n.jsx';
import { birthYears, GENDERS } from '../demographics.js';

const T = {
  ro: {
    legend: 'Despre tine (opțional)',
    gender: 'Gen',
    genders: { female: 'Feminin', male: 'Masculin', other: 'Altul' },
    birthYear: 'Anul nașterii',
    none: 'Prefer să nu spun',
    note: (
      <>
        Opțional. Le folosim doar în statistici agregate (câți utilizatori pe gen și grupă de
        vârstă), niciodată pentru reclame. Le poți șterge oricând din cont.{' '}
        <a href="/confidentialitate.html#demografie">Detalii</a>
      </>
    ),
  },
  en: {
    legend: 'About you (optional)',
    gender: 'Gender',
    genders: { female: 'Female', male: 'Male', other: 'Other' },
    birthYear: 'Year of birth',
    none: 'Prefer not to say',
    note: (
      <>
        Optional. Used only in aggregate statistics (how many users by gender and age group), never
        for advertising. You can remove them from your account at any time.{' '}
        <a href="/confidentialitate.html#demografie">Details</a>
      </>
    ),
  },
};

// Gender and year of birth, both optional ("Prefer not to say" by default).
// `value` is { gender, birth_year } ('' when not given); `onChange` gets the
// new pair. Used by the sign-up's review step and the account page.
export default function Demographics({ value, onChange, idPrefix = 'demo' }) {
  const { lang } = useLang();
  const t = T[lang];
  const set = (key, v) => onChange({ ...value, [key]: v });
  return (
    <fieldset className="demographics">
      <legend>{t.legend}</legend>
      <div className="demographics-fields">
        <label className="field" htmlFor={`${idPrefix}-gender`}>
          <span>{t.gender}</span>
          <select
            id={`${idPrefix}-gender`}
            value={value.gender}
            onChange={(e) => set('gender', e.target.value)}
          >
            <option value="">{t.none}</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t.genders[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-birth-year`}>
          <span>{t.birthYear}</span>
          <select
            id={`${idPrefix}-birth-year`}
            value={value.birth_year}
            onChange={(e) => set('birth_year', e.target.value)}
          >
            <option value="">{t.none}</option>
            {birthYears().map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="note">{t.note}</p>
    </fieldset>
  );
}
