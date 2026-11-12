## What this changes

<!-- One or two sentences. What it does, and why. -->

Closes #

## How it was checked

<!-- Delete what does not apply. -->

- [ ] `docker compose --profile test run --rm test`
- [ ] `cd frontend && npm run check && npm run lint && npm test`
- [ ] Clicked through it in dev mode
- [ ] Checked it in both light and dark mode

## The two easy things to forget

- [ ] **`japanese`**: this change is user-facing strings only, *or* it should
      be cherry-picked to `japanese` as well.
- [ ] **Data model**: this does not change the shape of a stored item, *or*
      existing data still reads correctly and the change is noted in the
      description above.

## Screenshots

<!-- For anything that changes the UI. Light and dark if the difference matters. -->
