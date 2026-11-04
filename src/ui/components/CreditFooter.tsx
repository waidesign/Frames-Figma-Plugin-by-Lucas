// Copyright (c) 2026 Lucas. See LICENSE.
import { AUTHOR_NAME, AUTHOR_URL, FACEBOOK_URL, LINKEDIN_URL } from "../../shared/credit";

export function CreditFooter() {
  return (
    <footer class="credit-footer" aria-label="Plugin credits">
      <span>Created by {AUTHOR_NAME}</span>
      <span class="credit-sep" aria-hidden="true">
        ·
      </span>
      <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
        Website
      </a>
      <span class="credit-sep" aria-hidden="true">
        ·
      </span>
      <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
      <span class="credit-sep" aria-hidden="true">
        ·
      </span>
      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
    </footer>
  );
}

