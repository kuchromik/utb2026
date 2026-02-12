# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Typ-Dokumentation

Die zentralen Anwendungs-Typen liegen in [src/lib/types.d.ts](src/lib/types.d.ts).

### Datenmodelle

- `Customer`: Kunde mit Firmenname und optionalen Adressfeldern
- `JobFormData`: Eingabedaten für Erstellen/Bearbeiten eines Auftrags
- `Job`: Vollständiger Auftrag inklusive Firestore-IDs/Statusfeldern
- `ReadyType`: erlaubte Status-Toggles (`paper`, `plates`, `print`, `invoice`, `payed`)

### Handler-Typen

- `JobSubmitHandler`, `JobSaveHandler`: Erstellen/Speichern von Aufträgen
- `JobEditHandler`: Bearbeiten/Kopieren eines Auftrags
- `JobToggleReadyHandler`: Umschalten von Check-Statusfeldern
- `JobIdHandler`: Aktionen mit Job-ID (z. B. Archivieren/Löschen)
- `SignInHandler`, `SignOutHandler`: Login/Logout-Callbacks
- `CustomerCompleteHandler`: Abschluss-Callback für neues Kundenformular
- `ModalConfirmHandler`, `VoidHandler`: generische Modal- und UI-Callbacks

### Verwendung in Komponenten

In Svelte-Komponenten werden die Typen per JSDoc importiert, z. B.:

```js
/** @typedef {import('$lib/types').Job} Job */
/** @typedef {import('$lib/types').JobSaveHandler} JobSaveHandler */
```

Dadurch bleiben `checkJs` und `svelte-check` streng, ohne alle Komponenten auf TypeScript-Dateien umstellen zu müssen.
