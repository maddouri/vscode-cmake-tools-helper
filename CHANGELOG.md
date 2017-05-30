# Change Log

## 0.0.5

* Create the .vscode directory if it doesn't exist (should fix some issues on Linux)
* Remove obsolete dependency to the `hooks` package (I've used `proxy-observe` instead and forgot to remove `hooks`)
* Update dependencies:
    ```
    "mocha": "^3.4.2"
    ```
* Unify line endings (LF) in the source files
* Use 5 tags in package.json

## 0.0.4

* Update `devDependencies`
    ```
    "@types/node": "^7.0.22"
    "@types/mocha": "^3.4.2"
    ```

## 0.0.3

* Add `proxy-observe` as a runtime dependency

## 0.0.2

* Fix null/undefined ref usage

## 0.0.1

* Initial release
