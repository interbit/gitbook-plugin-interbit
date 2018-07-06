# gitbook-plugin-interbit

This repo contains a GitBook plugin that provides assets required to
build the Interbit documentation:

- artwork for illustrations
- dictionaries for spell-checking the documentation source
- a group scripts that perform various CI checks of the documentation


## Usage

In your book's `book.json` file:

```jaon
  "plugins": [
    "interbit@https://github.com/interbit/gitbook-plugin-interbit.git"
  ],
  ...
```

## Assets


The `artwork` folder contains the source files for various illustrations
within the Interbit documentation. Most often, these are Adobe
Illustrator CC files, but other formats could be included over time.

The `dictionaries` folder contains `hunspell` used to check the spelling
of the Interbit documentation. The `en_US-large` is the large version of
the standard US dictionary. The `interbit` dictionary contains
blockchain- and Interbit-specific terminology. Whenever you use
multiple `hunspell` dictionaries, specify the `interbit` dictionary
first.

The `scripts` folder contains `doc_checks.js`, which runs all of the
scripts in the `scripts/checks` folder. Currently, these are:

- `line_length.js` - scans the documentation source and flags any lines
  longer than the default 80 columns (exceptions are made for lines
  containing URLs or image paths).

- `repeated_words.js` - scans the documentation source and flags any
  lines where a word is repeated several times in a row.

- `spelling.js` - scans the documentation source and identifies
  misspelled words (based on the dictionaries).


## Copyright

This repo and its contents are copyright 2018 by Interbit, and the
Creative Common Attribution-NonCommercial-NoDerivatives 4.0
([CC BY-NC-ND
4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)).


## Authors

The Interbit team.
