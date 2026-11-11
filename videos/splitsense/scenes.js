// SplitSense explainer. One function per scene in script.md.
// The amount, the split and the ledger all use the same 4,000 USD example.

export default {
  problem(s) {
    const { left, top, w, h } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('One payment, four owners', { y: top + h * 0.12, size: u * 8.6, at: -1 });

    s.number(4000, {
      prefix: '$',
      x: left + w * 0.3,
      y: s.cy,
      size: u * 15,
      color: 'green',
      at: 'four',
    });

    const shares = [
      { label: 'Editor 30%', color: 'blue', at: 'editor' },
      { label: 'Artist 15%', color: 'purple', at: 'artist' },
      { label: 'Tax 25%', color: 'orange', at: 'tax' },
    ];
    shares.forEach((share, i) => {
      s.box(share.label, {
        x: left + w * 0.72,
        y: s.cy + (i - 1) * u * 10.5,
        size: u * 4.6,
        color: share.color,
        at: share.at,
      });
    });

    s.icon('file-spreadsheet', {
      x: left + w * 0.3,
      y: s.cy + h * 0.24,
      size: u * 5,
      color: 'muted',
      label: 'Split by hand, at night',
      labelSize: u * 4,
      at: '#spreadsheet',
    });
  },

  rules(s) {
    const { left, w, h } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('Rules, written once', { y: s.safe.top + h * 0.12, size: u * 8.6, at: 0 });

    const card = s.box('Split rules', {
      id: 'rules',
      x: left + w * 0.3,
      y: s.cy - u * 5,
      size: u * 5.2,
      icon: 'percent',
      color: 'blue',
      at: 0,
    });
    s.list(['Editor 30%', 'Artist 15%', 'Tax 25%'], {
      x: card.left,
      y: card.bottom + u * 2.2,
      size: u * 3.9,
      bullet: 'dash',
      card: false,
      gap: u * 1.2,
      at: '#rules',
      stagger: 0.2,
    });

    s.box('Every payment', {
      x: left + w * 0.75,
      y: s.cy,
      size: u * 5,
      icon: 'repeat',
      color: 'green',
      at: '#rules',
    });
  },

  pay(s) {
    const { left, w, h } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('The payment splits itself', { y: s.safe.top + h * 0.1, size: u * 8.6, at: 0 });

    s.box('PayPal $4,000', {
      id: 'source',
      x: left + w * 0.2,
      y: s.cy,
      size: u * 5,
      icon: 'wallet',
      color: 'blue',
      at: 0,
    });

    const targets = [
      { id: 'editor', label: 'Editor $1,200', color: 'blue', at: 'editor' },
      { id: 'artist', label: 'Artist $600', color: 'purple', at: 'artist' },
      { id: 'tax', label: 'Tax $1,000', color: 'orange', at: 'tax' },
    ];
    targets.forEach((target, i) => {
      s.box(target.label, {
        id: target.id,
        x: left + w * 0.78,
        y: s.cy + (i - 1) * h * 0.22,
        size: u * 4.8,
        icon: 'arrow-right',
        color: target.color,
        at: target.at,
      });
      s.arrow('source', target.id, { at: target.at });
    });
  },

  ledger(s) {
    const { left, w, h } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('The books match', { y: s.safe.top + h * 0.1, size: u * 8.6, at: 0 });

    const card = s.box('Ledger', {
      id: 'ledger',
      x: left + w * 0.3,
      y: s.cy - u * 9,
      size: u * 5,
      icon: 'table',
      color: 'blue',
      at: 0,
    });
    s.list(
      [
        'In: $4,000',
        'Editor: $1,200',
        'Artist: $600',
        'Tax: $1,000',
        'Left: $1,200',
      ],
      {
        x: card.left,
        y: card.bottom + u * 2,
        size: u * 3.7,
        bullet: 'dash',
        card: false,
        gap: u * 0.9,
        at: '#reconcile',
        stagger: 0.15,
      },
    );

    s.icon('check-circle', {
      x: left + w * 0.75,
      y: s.cy,
      size: u * 8,
      bg: 'circle',
      color: 'green',
      label: 'Reconciled',
      labelSize: u * 4.2,
      at: '#reconcile',
    });
  },

  control(s) {
    const { left, w, h } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('You see it first', { y: s.safe.top + h * 0.12, size: u * 8.6, at: 0 });

    s.box('Review the split', {
      id: 'review',
      x: left + w * 0.25,
      y: s.cy,
      size: u * 5,
      icon: 'eye',
      color: 'blue',
      at: 0,
    });
    s.box('Confirm', {
      id: 'confirm',
      x: left + w * 0.72,
      y: s.cy,
      size: u * 5,
      icon: 'check',
      color: 'green',
      at: '#approve',
    });
    s.arrow('review', 'confirm', { at: '#approve' });

    s.note('One confirmation sends every payout', {
      x: left + w * 0.72,
      y: s.cy + h * 0.2,
      size: u * 4,
      color: 'muted',
      at: '#approve',
    });
  },

  close(s) {
    const { w, h, top } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('One payment, everyone paid', {
      y: top + h * 0.14,
      size: u * 8.6,
      maxWidth: w * 0.8,
      at: 0.3,
    });

    const xs = s.row(3, { width: w * 0.7 });
    const y = s.cy + h * 0.08;
    s.box('Editor paid', {
      x: xs[0],
      y,
      size: u * 5,
      icon: 'user-check',
      color: 'blue',
      at: 'arrives',
    });
    s.box('Artist paid', {
      x: xs[1],
      y,
      size: u * 5,
      icon: 'image',
      color: 'purple',
      at: 'paid',
    });
    s.box('Tax set aside', {
      x: xs[2],
      y,
      size: u * 5,
      icon: 'landmark',
      color: 'orange',
      at: 'minute',
    });
    s.note('One payment in, every share out', {
      x: s.cx,
      y: y + h * 0.2,
      size: u * 4.2,
      color: 'muted',
      at: 'match',
    });
  },
};
