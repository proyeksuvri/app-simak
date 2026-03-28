// Design tokens dari Stitch — digunakan sebagai bridge untuk Recharts
// (Recharts tidak bisa membaca Tailwind CSS classes)

export const colors = {
  primary:                   '#004f45',
  'primary-container':       '#00695c',
  'primary-fixed':           '#a0f2e1',
  'primary-fixed-dim':       '#84d5c5',
  'on-primary':              '#ffffff',
  'on-primary-fixed':        '#00201b',
  'on-primary-fixed-variant':'#005046',

  secondary:                 '#515f74',
  'secondary-container':     '#d5e3fc',

  tertiary:                  '#3b4559',
  'tertiary-container':      '#525d71',

  surface:                   '#f7f9fb',
  'surface-container-lowest':'#ffffff',
  'surface-container-low':   '#f2f4f6',
  'surface-container':       '#eceef0',
  'surface-container-high':  '#e6e8ea',

  'on-surface':              '#191c1e',
  'on-surface-variant':      '#3e4946',
  background:                '#f7f9fb',

  error:                     '#ba1a1a',
  'error-container':         '#ffdad6',

  outline:                   '#6e7976',
  'outline-variant':         '#bec9c5',

  'inverse-surface':         '#2d3133',
  'inverse-on-surface':      '#eff1f3',
  'inverse-primary':         '#84d5c5',
} as const

export type ColorKey = keyof typeof colors
