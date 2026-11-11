// BountyRail explainer. One function per scene in script.md.
// Layouts are placed from s.safe so the same file would still work in a tall frame.

export default {
  problem(s) {
    const { left, top, w, h } = s.safe;
    const u = Math.min(w, h) / 100;
    s.camera([]);

    s.title('A bounty is a promise', { y: top + h * 0.12, size: u * 9, at: -1 });

    const y = top + h * 0.54;
    const xs = s.row(3, { width: w * 0.7 });
    s.box('Issue: $150', {
      id: 'issue',
      x: xs[0],
      y,
      size: u * 5.2,
      icon: 'file-text',
      color: 'orange',
      at: '#issue',
    });
    s.box('Work merged', {
      id: 'merge',
      x: xs[1],
      y,
      size: u * 5.2,
      icon: 'git-merge',
      color: 'blue',
      at: '#merge',
    });
    s.box('Still unpaid', {
      id: 'unpaid',
      x: xs[2],
      y,
      size: u * 5.2,
      icon: 'clock',
      color: 'red',
      at: '#wait',
    });
    s.arrow('issue', 'merge', { at: '#merge' });
    s.arrow('merge', 'unpaid', { at: '#wait' });
    s.note('The payment was only a promise', {
      x: s.cx,
      y: y + h * 0.2,
      size: u * 4.2,
      color: 'muted',
      at: 'arrive',
    });
  },

  flip(s) {
    const { left, top, w, h } = s.safe;
    const u = Math.min(w, h) / 100;
    const y = s.cy + h * 0.05;

    s.title('Money first', { y: top + h * 0.15, size: u * 9, at: 0 });

    const amount = s.number(150, {
      prefix: '$',
      x: left + w * 0.28,
      y,
      size: u * 17,
      color: 'green',
      at: '#lock',
    });
    s.note('held by PayPal', {
      x: amount.x,
      y: amount.bottom + u * 4,
      size: u * 4.4,
      color: 'muted',
      at: '#held',
    });
    s.icon('lock', {
      x: left + w * 0.73,
      y,
      size: u * 13,
      bg: 'circle',
      color: 'green',
      label: 'Held, not captured',
      labelSize: u * 4.4,
      at: '#held',
    });
  },

  post(s) {
    const { left, top, w, h } = s.safe;
    const u = Math.min(w, h) / 100;
    const y = s.cy + h * 0.02;

    s.title('Funded before work', { y: top + h * 0.13, size: u * 8.6, at: 0 });

    const card = s.box('Acceptance criteria', {
      id: 'crit',
      x: left + w * 0.26,
      y: y - u * 5,
      size: u * 5.2,
      icon: 'list-checks',
      color: 'blue',
      at: '#approve',
    });
    s.list(['Retries 3 times', 'Tests cover 5xx'], {
      x: card.left,
      y: card.bottom + u * 2.2,
      size: u * 3.9,
      bullet: 'check',
      card: false,
      gap: u * 1.3,
      at: '#approve',
      stagger: 0.2,
    });

    const paypal = s.box('PayPal authorization', {
      id: 'paypal',
      x: left + w * 0.76,
      y,
      size: u * 5.2,
      icon: 'lock',
      color: 'green',
      at: '#approve',
    });
    s.arrow('crit', 'paypal', { bend: -0.1, at: '#captured' });
    s.note('Held, not captured', {
      x: paypal.x,
      y: paypal.bottom + u * 4,
      size: u * 4,
      color: 'muted',
      at: '#captured',
    });
  },

  review(s) {
    const { left, top, w, h } = s.safe;
    const u = Math.min(w, h) / 100;
    const y = s.cy + h * 0.06;

    s.title('Every criterion gets checked', { y: top + h * 0.1, size: u * 8, at: 0 });

    s.code(
      [
        {
          code: 'def request(self, path):\n    for i in range(3):\n        return send(path)',
          at: '#checks',
        },
      ],
      {
        x: left + w * 0.24,
        y,
        w: w * 0.36,
        size: u * 3.5,
        lang: 'py',
        title: 'client.py',
        at: '#checks',
      },
    );

    const judge = s.box('AI judge', {
      id: 'judge',
      x: left + w * 0.58,
      y,
      size: u * 5.6,
      icon: 'scan-search',
      color: 'blue',
      at: '#checks',
    });
    s.arrow([left + w * 0.43, y], 'judge', { at: '#checks' });

    s.number(92, {
      suffix: '/100',
      x: left + w * 0.82,
      y: y - h * 0.14,
      size: u * 7.5,
      color: 'green',
      at: '#score',
    });
    s.list(['Retries 3 times', 'Tests cover 5xx'], {
      x: left + w * 0.71,
      y: y + u * 2,
      size: u * 3.6,
      bullet: 'check',
      card: false,
      gap: u * 1.2,
      at: '#score',
      stagger: 0.2,
    });
  },

  human(s) {
    const { left, top, w, h } = s.safe;
    const u = Math.min(w, h) / 100;
    const y = s.cy + h * 0.02;

    s.title('The judge cannot pay', { y: top + h * 0.12, size: u * 8.6, at: 0 });

    s.box('AI judge', {
      id: 'ai',
      x: left + w * 0.23,
      y,
      size: u * 5.8,
      icon: 'scan-search',
      color: 'gray',
      at: 0,
    });
    s.box('Maintainer', {
      id: 'maint',
      x: left + w * 0.55,
      y,
      size: u * 5.8,
      icon: 'user-check',
      color: 'blue',
      at: '#key',
    });
    s.arrow('ai', 'maint', { label: 'evidence', labelSize: u * 3.8, at: '#key' });

    s.icon('key', {
      x: left + w * 0.72,
      y,
      size: u * 8,
      bg: 'circle',
      color: 'green',
      label: 'Second key',
      labelSize: u * 4,
      at: '#second',
    });
  },

  pay(s) {
    const { left, top, w, h } = s.safe;
    const u = Math.min(w, h) / 100;
    const y = s.cy + h * 0.02;

    s.title('PayPal releases', { y: top + h * 0.12, size: u * 8.6, at: 0 });

    const xs = s.row(3, { width: w * 0.8 });
    s.box('Authorization', {
      id: 'auth',
      x: xs[0],
      y,
      size: u * 5,
      icon: 'lock',
      color: 'blue',
      at: 0,
    });
    s.box('Capture', {
      id: 'cap',
      x: xs[1],
      y,
      size: u * 5,
      icon: 'banknote',
      color: 'green',
      at: '#ids',
    });
    s.box('Payout', {
      id: 'pay',
      x: xs[2],
      y,
      size: u * 5,
      icon: 'send',
      color: 'green',
      at: '#ids',
    });
    s.arrow('auth', 'cap', { at: '#ids' });
    s.arrow('cap', 'pay', { at: '#ids' });
    s.note('Order, capture and payout keep their IDs', {
      x: s.cx,
      y: y + h * 0.22,
      size: u * 4,
      color: 'muted',
      at: '#ids',
    });
  },

  close(s) {
    const { w, h, top } = s.safe;
    const u = Math.min(w, h) / 100;
    const y = s.cy + h * 0.08;

    s.title('Funded before work, paid when verified', {
      y: top + h * 0.16,
      size: u * 8.2,
      maxWidth: w * 0.8,
      at: 'money',
    });

    const xs = s.row(3, { width: w * 0.7 });
    s.box('Locked', {
      id: 'locked',
      x: xs[0],
      y,
      size: u * 5.4,
      icon: 'lock',
      color: 'blue',
      at: 'money',
    });
    s.box('Verified', {
      id: 'verified',
      x: xs[1],
      y,
      size: u * 5.4,
      icon: 'check-circle',
      color: 'teal',
      at: 'moves',
    });
    s.box('Paid', {
      id: 'paid',
      x: xs[2],
      y,
      size: u * 5.4,
      icon: 'banknote',
      color: 'green',
      at: 'verified',
    });
    s.arrow('locked', 'verified', { at: 'moves' });
    s.arrow('verified', 'paid', { at: 'verified' });
  },
};
