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

## Testing

Run tests with:

```bash
npm run test
```

The project includes unit tests and end-to-end tests that verify game functionality from initial boot through dialogue interactions.

## Yarn Spinner Support

The project includes a small utility for parsing `.yarn` dialogue files from
[Yarn Spinner](https://yarnspinner.dev/). Use `parseYarn()` from
`src/yarn-utils.ts` to read the contents of a `.yarn` file into an array of
nodes.

## how dialogue works 

* DialogueManager: the in-code representation of a .gob file
  * stores dialog-related assets: dialgue nodes and speaker info.
  * NOT CURRENTLY USED: takes callback handlers in the ctor for various game actions like loading a puzzle.
  * has a 'getAnimationForSpeaker' helper
  * start() : inits the dialog
  * advance() : a Generator that you iterate over to move through the dialog. it has these internal states which progress linearly:
    * 'line': where it is returning lines of dialog
    * 'choice': where it returns a set of options for the player and expects a choice param back
    * 'command': NOT USED which it returns to the caller
    * 'next'/'return': if there's a next node, it jumps to that and goes back to 'line' state. 

