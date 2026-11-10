// Kolo Tailwind theme. CDN usage: load after cdn.tailwindcss.com.
window.KOLO_THEME={
 "extend": {
  "colors": {
   "background": "hsl(var(--background) / <alpha-value>)",
   "foreground": "hsl(var(--foreground) / <alpha-value>)",
   "card": {
    "DEFAULT": "hsl(var(--card) / <alpha-value>)",
    "foreground": "hsl(var(--card-foreground) / <alpha-value>)"
   },
   "popover": {
    "DEFAULT": "hsl(var(--popover) / <alpha-value>)",
    "foreground": "hsl(var(--popover-foreground) / <alpha-value>)"
   },
   "primary": {
    "DEFAULT": "hsl(var(--primary) / <alpha-value>)",
    "foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
    "soft": "hsl(var(--primary-soft) / <alpha-value>)"
   },
   "secondary": {
    "DEFAULT": "hsl(var(--secondary) / <alpha-value>)",
    "foreground": "hsl(var(--secondary-foreground) / <alpha-value>)"
   },
   "muted": {
    "DEFAULT": "hsl(var(--muted) / <alpha-value>)",
    "foreground": "hsl(var(--muted-foreground) / <alpha-value>)"
   },
   "accent": {
    "DEFAULT": "hsl(var(--accent) / <alpha-value>)",
    "foreground": "hsl(var(--accent-foreground) / <alpha-value>)",
    "soft": "hsl(var(--accent-soft) / <alpha-value>)"
   },
   "success": {
    "DEFAULT": "hsl(var(--success) / <alpha-value>)",
    "soft": "hsl(var(--success-soft) / <alpha-value>)"
   },
   "warning": {
    "DEFAULT": "hsl(var(--warning) / <alpha-value>)",
    "soft": "hsl(var(--warning-soft) / <alpha-value>)"
   },
   "destructive": {
    "DEFAULT": "hsl(var(--destructive) / <alpha-value>)",
    "foreground": "hsl(var(--destructive-foreground) / <alpha-value>)"
   },
   "danger": {
    "soft": "hsl(var(--danger-soft) / <alpha-value>)"
   },
   "turn": "hsl(var(--turn) / <alpha-value>)",
   "border": "hsl(var(--border) / <alpha-value>)",
   "input": "hsl(var(--input) / <alpha-value>)",
   "ring": "hsl(var(--ring) / <alpha-value>)"
  },
  "borderRadius": {
   "lg": "var(--radius)",
   "md": "calc(var(--radius) - 4px)",
   "sm": "calc(var(--radius) - 8px)",
   "xl": "calc(var(--radius) + 4px)"
  },
  "fontFamily": {
   "sans": [
    "var(--font-sans)"
   ]
  },
  "fontSize": {
   "display": [
    "32px",
    {
     "lineHeight": "38px",
     "fontWeight": "800",
     "letterSpacing": "-0.02em"
    }
   ],
   "h1": [
    "24px",
    {
     "lineHeight": "30px",
     "fontWeight": "800",
     "letterSpacing": "-0.015em"
    }
   ],
   "h2": [
    "20px",
    {
     "lineHeight": "26px",
     "fontWeight": "700",
     "letterSpacing": "-0.01em"
    }
   ],
   "h3": [
    "17px",
    {
     "lineHeight": "24px",
     "fontWeight": "700"
    }
   ],
   "body": [
    "15px",
    {
     "lineHeight": "22px",
     "fontWeight": "500"
    }
   ],
   "small": [
    "13px",
    {
     "lineHeight": "18px",
     "fontWeight": "500"
    }
   ],
   "micro": [
    "12px",
    {
     "lineHeight": "16px",
     "fontWeight": "700",
     "letterSpacing": "0.04em"
    }
   ]
  },
  "boxShadow": {
   "card": "0 1px 2px rgba(42,31,23,.06), 0 2px 8px rgba(42,31,23,.05)",
   "sheet": "0 -8px 32px rgba(42,31,23,.18)"
  }
 }
};
if(window.tailwind) tailwind.config={theme:window.KOLO_THEME};
