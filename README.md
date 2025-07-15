# Tropolis

This is a simple prototype demonstrating the Overlord sprite.

## Development

Install dependencies and start the dev server. Node.js 20 or newer is
required by Vite 7, so make sure your environment is up to date:

```bash
npm install
npm run dev
```

The server will automatically open the game in your browser and reload on changes.

## Yarn Spinner Support

The project includes a small utility for parsing `.yarn` dialogue files from
[Yarn Spinner](https://yarnspinner.dev/). Use `parseYarn()` from
`src/yarn-utils.ts` to read the contents of a `.yarn` file into an array of
nodes.
