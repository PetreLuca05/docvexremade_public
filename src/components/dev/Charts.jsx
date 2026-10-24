import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// The dashboard's charts (Recharts), loaded only by dev.html. Colours follow
// the site's tokens on the dashboard's dark ground.
export const COLORS = {
  gold: '#e6cf9a',
  sand: '#dcc9a3',
  cognac: '#c08a5c',
  cream: 'rgba(245, 242, 234, 0.85)',
  muted: 'rgba(245, 242, 234, 0.45)',
  line: 'rgba(245, 242, 234, 0.1)',
  blue: '#7fb0ea',
  green: '#6cc58f',
  red: '#e5675d',
  amber: '#e8a948',
  violet: '#b9a3e8',
};
export const SERIES = [
  COLORS.gold,
  COLORS.blue,
  COLORS.green,
  COLORS.cognac,
  COLORS.violet,
  COLORS.amber,
  COLORS.red,
  COLORS.sand,
];

const ANIMATE =
  typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const axis = { stroke: COLORS.muted, fontSize: 11, tickLine: false, axisLine: false };

function ChartTooltip({ active, payload, label, format = (v) => v, labelFormat = (l) => l }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dev-tip">
      <b>{labelFormat(label)}</b>
      {payload.map((p) => (
        <span key={p.dataKey}>
          <i style={{ background: p.color }} />
          {p.name}: {format(p.value)}
        </span>
      ))}
    </div>
  );
}

// Visitors (or page views) over time, with the previous period as a faint
// dashed line on the same days.
export function TrafficChart({ data, previous, metric, labels, tickFormat }) {
  const rows = data.map((d, i) => ({
    t: d.t,
    now: d[metric],
    before: previous?.[i]?.[metric] ?? null,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={rows} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="dev-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.45} />
            <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.line} vertical={false} />
        <XAxis dataKey="t" {...axis} tickFormatter={tickFormat} minTickGap={24} />
        <YAxis {...axis} allowDecimals={false} width={48} />
        <Tooltip content={<ChartTooltip labelFormat={tickFormat} />} />
        {previous && (
          <Line
            type="monotone"
            dataKey="before"
            name={labels.previous}
            stroke={COLORS.muted}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={ANIMATE}
          />
        )}
        <Area
          type="monotone"
          dataKey="now"
          name={labels.current}
          stroke={COLORS.gold}
          strokeWidth={2}
          fill="url(#dev-gold)"
          isAnimationActive={ANIMATE}
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, format }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="88%"
          paddingAngle={2}
          stroke="none"
          isAnimationActive={ANIMATE}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={SERIES[i % SERIES.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip format={format} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Stacked bars: `keys` is [{ key, name, color }].
export function StackedBars({ data, xKey, keys, tickFormat, height = 240, format }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.line} vertical={false} />
        <XAxis dataKey={xKey} {...axis} tickFormatter={tickFormat} minTickGap={16} />
        <YAxis {...axis} allowDecimals={false} width={48} />
        <Tooltip
          cursor={{ fill: 'rgba(245, 242, 234, 0.04)' }}
          content={<ChartTooltip labelFormat={tickFormat} format={format} />}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: COLORS.cream, paddingTop: 8 }}
        />
        {keys.map((k, i) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            name={k.name}
            stackId="a"
            fill={k.color}
            radius={i === keys.length - 1 ? [3, 3, 0, 0] : 0}
            isAnimationActive={ANIMATE}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Stacked areas (MRR by plan): `keys` is [{ key, name, color }].
export function StackedAreas({ data, xKey, keys, tickFormat, format }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.line} vertical={false} />
        <XAxis dataKey={xKey} {...axis} tickFormatter={tickFormat} minTickGap={24} />
        <YAxis {...axis} width={64} tickFormatter={format} />
        <Tooltip content={<ChartTooltip labelFormat={tickFormat} format={format} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: COLORS.cream, paddingTop: 8 }}
        />
        {keys.map((k) => (
          <Area
            key={k.key}
            type="stepAfter"
            dataKey={k.key}
            name={k.name}
            stackId="a"
            stroke={k.color}
            fill={k.color}
            fillOpacity={0.25}
            isAnimationActive={ANIMATE}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
