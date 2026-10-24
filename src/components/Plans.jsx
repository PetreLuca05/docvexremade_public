import { useLang } from '../i18n.jsx';
import ContinueButton from './ContinueButton.jsx';

// The plans, as the pricing page and the account page both show them.
export const PLAN_IDS = ['start', 'pro', 'cabinet'];
export const FEATURED = 'pro';

const T = {
  ro: {
    perMonth: '/ lună',
    featured: 'Recomandat',
    choose: (name) => `Alege ${name}`,
    plans: {
      start: {
        name: 'Start',
        price: '0 lei',
        text: 'Pentru a încerca DocVex.',
        features: [
          'Proiecte și previzualizare de fișiere',
          'Legislație și coduri CAEN',
          '[DE COMPLETAT: limita de cercetare AI]',
        ],
      },
      pro: {
        name: 'Solo',
        price: '199 lei',
        text: 'Pentru avocatul sau juristul care lucrează zilnic cu dosare.',
        features: [
          'Tot ce include Start',
          'Cercetare juridică cu AI',
          'Scanare de documente în PDF',
          '[DE COMPLETAT: alte funcții]',
        ],
      },
      cabinet: {
        name: 'Cabinet',
        price: '499 lei',
        text: 'Pentru cabinete și echipe juridice.',
        features: [
          'Tot ce include Solo',
          '[DE COMPLETAT: numărul de utilizatori]',
          '[DE COMPLETAT: asistență]',
        ],
      },
    },
    current: 'Planul tău',
    keep: 'Planul actual',
    selected: 'Selectat',
  },
  en: {
    perMonth: '/ month',
    featured: 'Recommended',
    choose: (name) => `Choose ${name}`,
    plans: {
      start: {
        name: 'Start',
        price: '0 lei',
        text: 'To try DocVex.',
        features: [
          'Projects and file previews',
          'Legislation and CAEN codes',
          '[TO FILL IN: AI research limit]',
        ],
      },
      pro: {
        name: 'Solo',
        price: '199 lei',
        text: 'For the lawyer or legal professional who works with case files every day.',
        features: [
          'Everything in Start',
          'AI-assisted legal research',
          'Document scanning to PDF',
          '[TO FILL IN: other features]',
        ],
      },
      cabinet: {
        name: 'Firm',
        price: '499 lei',
        text: 'For law firms and legal teams.',
        features: ['Everything in Solo', '[TO FILL IN: number of users]', '[TO FILL IN: support]'],
      },
    },
    current: 'Your plan',
    keep: 'Current plan',
    selected: 'Selected',
  },
};

export function usePlanText() {
  const { lang } = useLang();
  return T[lang];
}

// `href` (a URL, or a function of the plan id) makes each card's button a
// link (the pricing page: to the sign-up page with the plan picked);
// Without `href` the buttons pick a plan in place (the account page), showing
// `current` (the account's plan) and `selected` (the one picked, not saved).
export default function Plans({ onChoose, href, current, selected }) {
  const t = usePlanText();
  return (
    <ul className="plans">
      {PLAN_IDS.map((id) => {
        const p = t.plans[id];
        const isCurrent = id === current;
        const isSelected = selected !== undefined && id === selected;
        const strong = selected === undefined ? id === FEATURED : isSelected;
        const className = ['plan', id === FEATURED && 'is-featured', isSelected && 'is-selected']
          .filter(Boolean)
          .join(' ');
        const label = isCurrent ? t.keep : isSelected ? t.selected : t.choose(p.name);
        const badge = isCurrent ? t.current : id === FEATURED ? t.featured : null;
        return (
          <li key={id} className={className}>
            {badge && <span className="badge">{badge}</span>}
            <h2>{p.name}</h2>
            <p className="plan-price">
              <b>{p.price}</b> {t.perMonth}
            </p>
            <p className="plan-text">{p.text}</p>
            <ul className="plan-features">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {href ? (
              <ContinueButton
                href={typeof href === 'function' ? href(id) : href}
                outline={!strong}
                onClick={() => onChoose?.(id)}
              >
                {label}
              </ContinueButton>
            ) : (
              <ContinueButton
                type="button"
                outline={!strong}
                pressed={isSelected}
                onClick={() => onChoose(id)}
              >
                {label}
              </ContinueButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// One plan in full (name, price, what it is for and every feature), to read
// rather than pick: beside the sign-up form, following the plan ticked in it
// (`compact`: under the Plan step of the sign-up's progress).
export function PlanDetails({ id, compact = false }) {
  const t = usePlanText();
  const p = t.plans[id];
  return (
    <div
      className={['plan', 'plan-details', compact && 'is-compact', id === FEATURED && 'is-featured']
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
    >
      {id === FEATURED && <span className="badge">{t.featured}</span>}
      <h2>{p.name}</h2>
      <p className="plan-price">
        <b>{p.price}</b> {t.perMonth}
      </p>
      <p className="plan-text">{p.text}</p>
      <ul className="plan-features">
        {p.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
