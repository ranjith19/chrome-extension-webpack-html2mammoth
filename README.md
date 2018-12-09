
# HTML to Mammoth

1. Check if your Node.js version is >= 6.
2. Clone the repository.
3. Install [yarn](https://yarnpkg.com/lang/en/docs/install/).
4. Run `yarn`.
5. Change the package's name and description on `package.json`.
6. Change the name of your extension on `src/manifest.json`.
7. Run `npm run start`
8. Load your extension on Chrome following:
    1. Access `chrome://extensions/`
    2. Check `Developer mode`
    3. Click on `Load unpacked extension`
    4. Select the `build` folder.
8. Have fun.

## Structure
All your extension's development code must be placed in `src` folder, including the extension manifest.

The boilerplate is already prepared to have a popup, a options page and a background page. You can easily customize this.

Each page has its own [assets package defined](https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate/blob/master/webpack.config.js#L16-L20). So, to code on popup you must start your code on `src/js/popup.js`, for example.

You must use the [ES6 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) to a better code organization. The boilerplate is already prepared to that and [here you have a little example](https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate/blob/master/src/js/popup.js#L2-L4).

## Webpack auto-reload and HRM
To make your workflow much more efficient this boilerplate uses the [webpack server](https://webpack.github.io/docs/webpack-dev-server.html) to development (started with `npm run server`) with auto reload feature that reloads the browser automatically every time that you save some file o your editor.

You can run the dev mode on other port if you want. Just specify the env var `port` like this:

```
$ PORT=6002 npm run start
```

## useful aliases

```
h2m='cd <path to this folder>'
h2m_run='h2m; npm run start'
```

## Packing
After the development of your extension run the command

```
$ NODE_ENV=production npm run build
```
Now, the content of `build` folder will be the extension ready to be submitted to the Chrome Web Store. Just take a look at the [official guide](https://developer.chrome.com/webstore/publish) to more infos about publishing.

## Secrets
If you are developing an extension that talks with some API you probably are using different keys for testing and production. Is a good practice you not commit your secret keys and expose to anyone that have access to the repository.

To this task this boilerplate import the file `./secrets.<THE-NODE_ENV>.js` on your modules through the module named as `secrets`, so you can do things like this:

_./secrets.development.js_

```js
export default { key: "123" };
```

_./src/popup.js_

```js
import secrets from "secrets";
ApiCall({ key: secrets.key });
```
:point_right: The files with name `secrets.*.js` already are ignored on the repository.

# TODO

1. Better Design
2. Refresh option
3. spec
4. framework


# Road Map

### High Level Goals

1. Democratise the html parsing/scraping using Mammoth.
2. Build a community of contributors.
3. Make JavaScript a language of data scientists.

###  Spec

We need to define a flexible spec to specify custom html parsers.

Specifiers that could be allowed

1. Domain
2. Sub domain
3. url path
4. other url parts like query string etc.
5. jquery selector
6. xpath

This will allow us to add custom html parsers anywhere on the web.

We can then open it up to the community to contribute.


### Long term:

1. User should be able to define their own custom script to parse the html. Like StyleBot (http://stylebot.me/) for data parsing. This  might not be possible because this means script injection. I do not know, just documenting thoughts without research
2. User should be able to save their script.
3. User should be able to download a script from someone else.


### Other Technology Considerations

Questions:

1. Decide if we need to go with react or just jquery etc are sufficient
2. Design, add tests.
3. Typescript or vanilla JS?
4. Define coding standards and follow them?
5. CI/CD?



## Contributing

1. **Create PR a instead of creating an issue.**
2. On your PR make sure that you are following the current codebase style.
3. Your PR must be single purpose. Resolve just one problem on your PR.
4. Make sure to commit in the same style that we are committing until now on the project.
5. Help with documentation is also appreciated.

# Acknowledgemets

1. used this boilerplate template: https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate
