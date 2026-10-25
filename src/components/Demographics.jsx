import { useLang } from '../i18n.jsx';
import { birthYears, daysIn, demographicsError, GENDERS } from '../demographics.js';

const T = {
  ro: {
    gender: 'Gen',
    genders: { female: 'Feminin', male: 'Masculin', other: 'Altul' },
    birthDate: 'Data nașterii',
    day: 'Ziua',
    month: 'Luna',
    year: 'Anul',
    months: [
      'ianuarie',
      'februarie',
      'martie',
      'aprilie',
      'mai',
      'iunie',
      'iulie',
      'august',
      'septembrie',
      'octombrie',
      'noiembrie',
      'decembrie',
    ],
    none: 'Prefer să nu spun',
    errors: {
      partial: 'Alege ziua, luna și anul, sau lasă-le pe toate necompletate.',
      invalid: 'Luna aleasă nu are această zi.',
      age: 'Trebuie să ai cel puțin 16 ani.',
    },
    note: (
      <>
        Amândouă sunt opționale. Le folosim doar în statistici agregate (câți utilizatori pe gen și
        grupă de vârstă), niciodată pentru reclame. Le poți șterge oricând din cont.{' '}
        <a href="/confidentialitate.html#demografie">Detalii</a>
      </>
    ),
  },
  en: {
    gender: 'Gender',
    genders: { female: 'Female', male: 'Male', other: 'Other' },
    birthDate: 'Date of birth',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    none: 'Prefer not to say',
    errors: {
      partial: 'Choose the day, month and year, or leave all three empty.',
      invalid: 'That month has no such day.',
      age: 'You must be at least 16.',
    },
    note: (
      <>
        Both are optional. Used only in aggregate statistics (how many users by gender and age
        group), never for advertising. You can remove them from your account at any time.{' '}
        <a href="/confidentialitate.html#demografie">Details</a>
      </>
    ),
  },
};

// Gender and date of birth, both optional ("Prefer not to say" by default).
// `value` holds { gender, birth_day, birth_month, birth_year } ('' when not
// given); `onChange` gets the new value. `showErrors` turns on the date's
// error (a partial or impossible date). `firstRef` goes on the first field.
// Used by the sign-up's "About you" step and the account page.
export default function Demographics({ value, onChange, idPrefix = 'demo', showErrors, firstRef }) {
  const { lang } = useLang();
  const t = T[lang];
  const set = (key, v) => onChange({ ...value, [key]: v });
  const error = showErrors ? demographicsError(value) : null;
  const days = daysIn(value.birth_year, value.birth_month);
  const errorId = `${idPrefix}-birth-error`;
  return (
    <div className="demographics">
      <label className="field" htmlFor={`${idPrefix}-gender`}>
        <span>{t.gender}</span>
        <select
          id={`${idPrefix}-gender`}
          ref={firstRef}
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
      <fieldset className={`field demographics-date${error ? ' has-error' : ''}`}>
        <legend>{t.birthDate}</legend>
        <div className="demographics-date-parts">
          <select
            aria-label={t.day}
            value={value.birth_day}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => set('birth_day', e.target.value)}
          >
            <option value="">{t.day}</option>
            {Array.from({ length: Math.max(days, Number(value.birth_day) || 0) }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {i + 1}
              </option>
            ))}
          </select>
          <select
            aria-label={t.month}
            value={value.birth_month}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => set('birth_month', e.target.value)}
          >
            <option value="">{t.month}</option>
            {t.months.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label={t.year}
            value={value.birth_year}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => set('birth_year', e.target.value)}
          >
            <option value="">{t.year}</option>
            {birthYears().map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <small id={errorId} className="field-error" role="alert">
            {t.errors[error]}
          </small>
        )}
      </fieldset>
      <p className="note">{t.note}</p>
    </div>
  );
}
