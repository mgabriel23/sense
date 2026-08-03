// Guided spotlight tour: dims the page, cuts a highlighted "hole" around one
// control at a time (via a box-shadow-with-huge-spread trick — the target
// itself stays fully bright while everything else darkens), and shows a
// tooltip with a short explanation plus Back/Next/Skip. Steps with no
// `target` (welcome/closing) collapse the "hole" to a zero-size point, so
// the same element just dims the whole page and the tooltip renders as a
// centered card instead.
export class Tour {
  constructor(steps, { onFinish } = {}) {
    this.steps = steps;
    this.onFinish = onFinish;
    this.index = 0;
    this.root = null;
    this._onResize = () => this._position();
    this._onKeydown = (event) => this._handleKeydown(event);
  }

  start() {
    if (this.root || this.steps.length === 0) return;
    this.index = 0;
    this._build();
    window.addEventListener("resize", this._onResize);
    window.addEventListener("keydown", this._onKeydown, true);
    this._render();
  }

  _build() {
    this.root = document.createElement("div");
    this.root.className = "tour-overlay";

    this.spotlight = document.createElement("div");
    this.spotlight.className = "tour-spotlight";

    this.tooltip = document.createElement("div");
    this.tooltip.className = "tour-tooltip";
    this.tooltip.setAttribute("role", "dialog");
    this.tooltip.setAttribute("aria-modal", "true");
    this.tooltip.setAttribute("aria-labelledby", "tour-title");

    this.tooltip.innerHTML = `
      <p class="tour-step-count"></p>
      <h3 class="tour-title" id="tour-title"></h3>
      <p class="tour-body"></p>
      <div class="tour-actions">
        <button type="button" class="tour-skip">Skip tour</button>
        <div class="tour-nav">
          <button type="button" class="btn tour-back">Back</button>
          <button type="button" class="btn btn-primary tour-next">Next</button>
        </div>
      </div>
    `;

    this.root.append(this.spotlight, this.tooltip);
    document.body.appendChild(this.root);

    this.tooltip.querySelector(".tour-skip").addEventListener("click", () => this._finish(true));
    this.tooltip.querySelector(".tour-back").addEventListener("click", () => this._go(-1));
    this.tooltip.querySelector(".tour-next").addEventListener("click", () => this._go(1));
  }

  _go(delta) {
    const next = this.index + delta;
    if (next < 0) return;
    if (next >= this.steps.length) {
      this._finish(false);
      return;
    }
    this.index = next;
    this._render();
  }

  async _render() {
    const step = this.steps[this.index];
    const target = step.target ? document.querySelector(step.target) : null;

    if (target) {
      target.scrollIntoView({ block: "center", inline: "center" });
      // Two frames: one for the scroll to settle, one for layout to catch up.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    this._currentRect = target ? target.getBoundingClientRect() : null;
    this._position();

    this.tooltip.querySelector(".tour-step-count").textContent = `Step ${this.index + 1} of ${this.steps.length}`;
    this.tooltip.querySelector(".tour-title").textContent = step.title;
    this.tooltip.querySelector(".tour-body").textContent = step.body;

    const backBtn = this.tooltip.querySelector(".tour-back");
    const nextBtn = this.tooltip.querySelector(".tour-next");
    backBtn.disabled = this.index === 0;
    nextBtn.textContent = this.index === this.steps.length - 1 ? "Done" : "Next";
    nextBtn.focus();
  }

  // Re-run on resize (and after scrollIntoView above) — kept separate from
  // _render so a window resize doesn't re-fetch step text or re-scroll.
  _position() {
    if (!this.root) return;
    const target = !!this._currentRect;
    const rect = this._currentRect ?? {
      top: window.innerHeight / 2,
      left: window.innerWidth / 2,
      width: 0,
      height: 0,
    };

    const pad = target ? 6 : 0;
    this.spotlight.style.top = `${rect.top - pad}px`;
    this.spotlight.style.left = `${rect.left - pad}px`;
    this.spotlight.style.width = `${rect.width + pad * 2}px`;
    this.spotlight.style.height = `${rect.height + pad * 2}px`;
    this.spotlight.classList.toggle("tour-spotlight-visible", target);

    this.tooltip.classList.toggle("tour-tooltip-centered", !target);
    if (target) {
      this._positionTooltip(rect);
    } else {
      this.tooltip.style.top = "";
      this.tooltip.style.left = "";
    }
  }

  _positionTooltip(rect) {
    const gap = 12;
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.bottom + gap;
    if (top + th > vh - gap) top = rect.top - th - gap;
    if (top < gap) top = Math.max(gap, (vh - th) / 2);

    let left = rect.left;
    left = Math.min(left, vw - tw - gap);
    left = Math.max(left, gap);

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  _handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this._finish(true);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this._go(1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this._go(-1);
      return;
    }
    // Simple focus trap: Tab/Shift+Tab wrap between the tooltip's own
    // buttons instead of escaping into the (visually blocked, but still
    // tab-reachable) page underneath.
    if (event.key === "Tab") {
      const focusable = [...this.tooltip.querySelectorAll("button")].filter((btn) => !btn.disabled);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  _finish(skipped) {
    if (!this.root) return;
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKeydown, true);
    this.root.remove();
    this.root = null;
    this.onFinish?.(skipped);
  }
}
