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

- `broken_links.js` - executes HTMLProofer on the generated HTML,
  checking internal and external links, plus image references and alt
  attributes.

  Bundler needs to be installed: `sudo gem install bundler`.

  You need to have HTMLProofer installed: `bundle install`.

- `images.js` - scans the documentation tree for image files, and then
  scans the doc source, flagging any missing image files, images with
  sizes declared that don't match the image file, and any extra image
  files that are not used in the doc source.

- `includes.js` - scans the documentation tree for includable files, and
  then scans the doc source, flagging any missing include files, and any
  extra include files that are not used in the doc source.

- `line_length.js` - scans the documentation source and flags any lines
  longer than the default 80 columns (exceptions are made for lines
  containing URLs or image paths).

- `markdown.js` - scans the generated HTML looking for untransformed
  Markdown markup, which is usually a sign of a poor conversion to
  Asciidoc markup.

- `missed_files.js` - scans the generated HTML tree looking for Markdown
  or Asciidoc source files, which is usually a sign that these topics
  were not added to `SUMMARY.md`.

- `repeated_words.js` - scans the documentation source and flags any
  lines where a word is repeated several times in a row.

- `spelling.js` - scans the documentation source and identifies
  misspelled words (based on the dictionaries).


## Dictionary updates

If you author new content that introduces terminology that does not
exist in the dictionary, the `spelling.js` check flags these terms as
misspelled. To update the dictionarty with the new term(s), follow these
steps:

1.  **Start editing the Interbit dictionary**

    The first line is a count of the entries, one per line, in the
    dictionary, not including the count line.

1.  **Add the new term(s)**

    These should appear after the first line.

1.  **(Optional) Sort the entries**

1.  **Save the changes**

1.  **Update the repository with the changes**

    ```sh
    git add dictionaries/interbit.dic
    git commit -m "Added new term(s)"
    git push origin
    ```


## Copyright

This repo and its contents are copyright 2018 by Interbit, and the
Creative Common Attribution-NonCommercial-NoDerivatives 4.0
([CC BY-NC-ND
4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)).


## Authors

The Interbit team.
